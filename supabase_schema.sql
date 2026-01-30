
-- SISTEMA BROTAR 2.0 - DATABASE SCHEMA
-- Autor: Antigravity AI
-- Data: 2026-01-20

-- ==============================================================================
-- 1. CONFIGURAÇÕES INICIAIS
-- ==============================================================================

-- Habilita extensão para UUIDs
create extension if not exists "uuid-ossp";

-- Enum para Especialidades (Garante integridade)
create type specialty_type as enum (
  'PSICOLOGIA',
  'FONOAUDIOLOGIA',
  'PSICOPEDAGOGIA',
  'TERAPIA_OCUPACIONAL',
  'SERVICO_SOCIAL',
  'FISIOTERAPIA',
  'ENFERMAGEM',
  'NUTRICAO'
);

-- Enum para Papéis de Usuário
create type user_role_type as enum (
  'ADMIN',
  'EDUCATION_SECRETARY', -- Sede ou Distrital
  'SPECIALIST',
  'ASSISTANT'
);

-- ==============================================================================
-- 2. TABELAS DE DADOS (FICHA ÂNCORA)
-- ==============================================================================

-- Tabela de Escolas
create table public.schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  inep text,
  district text not null, -- 'Sede', 'Cocal', etc.
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Alunos (FICHA ÂNCORA)
-- Esta tabela contém apenas dados cadastrais universais.
-- NENHUM dado clínico sensível deve ficar aqui.
create table public.students (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  birth_date date not null,
  cpf text unique, -- Importante para unicidade
  sus_card text,
  
  -- Dados Escolares
  school_id uuid references public.schools(id),
  grade text, -- Série/Ano
  shift text, -- Turno
  
  -- Dados de Responsáveis (Armazenados como JSONB por flexibilidade)
  guardians jsonb default '[]'::jsonb,
  
  -- Endereço
  address jsonb default '{}'::jsonb,
  
  -- Metadados
  status text default 'Active', -- Active, Inactive
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 3. TABELAS DE MÓDULOS PROFISSIONAIS (ISOLAMENTO)
-- ==============================================================================

-- Tabela de Atendimentos Clínicos (EVOLUÇÕES)
-- Aqui vive o segredo do isolamento.
create table public.clinical_sessions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) not null,
  professional_id uuid references auth.users(id) not null,
  
  -- A "Parede de Concreto": Especialidade da Sessão
  -- Um Fonoaudiólogo só verá linhas onde specialty = 'FONOAUDIOLOGIA'
  specialty specialty_type not null,
  
  date date not null default CURRENT_DATE,
  
  -- Conteúdo da Sessão (JSONB permite estruturas diferentes para cada área)
  -- Psicologia salva { humor: '...', queixa: '...' }
  -- Fono salva { exercicios: '...', fonemas: '...' }
  content jsonb not null default '{}'::jsonb,
  
  -- Notas Confidenciais (Nível extra de sigilo)
  private_notes text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Documentos Gerados (Laudos, Encaminhamentos)
create table public.student_documents (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) not null,
  professional_id uuid references auth.users(id) not null,
  specialty specialty_type not null,
  
  document_type text not null, -- 'LAUDO', 'ENCAMINHAMENTO'
  file_url text, -- Link para o Storage
  content_text text, -- Se for documento de texto puro
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 4. PERFIS DE USUÁRIO E SEGURANÇA
-- ==============================================================================

-- Tabela Pública de Perfis (Espelho do auth.users)
create table public.profiles (
  id uuid references auth.users(id) primary key,
  full_name text not null,
  role user_role_type not null default 'SPECIALIST',
  specialty specialty_type, -- Null se for Admin ou Secretaria
  
  -- Escopo Geográfico (para Secretarias Distritais)
  district_scope text, -- 'Global' ou nome do distrito
  
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) - O "MÓDULO DE SEGURANÇA"
-- ==============================================================================

-- Habilita RLS em todas as tabelas críticas
alter table public.students enable row level security;
alter table public.clinical_sessions enable row level security;
alter table public.profiles enable row level security;
alter table public.schools enable row level security;

-- --- POLÍTICAS PARA ALUNOS (Ficha Âncora) ---

-- LEITURA: Todos os usuários ativos podem ver alunos
create policy "Alunos visíveis para todos usuários ativos"
  on public.students for select
  using ( exists ( select 1 from public.profiles where id = auth.uid() and is_active = true ) );

-- ESCRITA: Apenas Admin e Secretaria podem criar/editar alunos
create policy "Apenas Admin/Secretaria gerenciam alunos"
  on public.students for all
  using ( 
    exists ( 
      select 1 from public.profiles 
      where id = auth.uid() 
      and role in ('ADMIN', 'EDUCATION_SECRETARY') 
    ) 
  );

-- --- POLÍTICAS PARA SESSÕES CLÍNICAS (Isolamento Total) ---

-- LEITURA: Especialista vê APENAS sua especialidade
create policy "Especialista vê apenas sua área"
  on public.clinical_sessions for select
  using (
    -- O usuário é o dono do registro...
    professional_id = auth.uid()
    OR
    -- OU o registro pertence à mesma especialidade do usuário
    specialty = (select specialty from public.profiles where id = auth.uid())
    OR
    -- OU usuário é ADMIN (Auditoria - opcional, pode ser removido para sigilo absoluto)
    (select role from public.profiles where id = auth.uid()) = 'ADMIN'
  );

-- ESCRITA: Especialista só cria sessões na sua especialidade
create policy "Especialista só cria na sua área"
  on public.clinical_sessions for insert
  with check (
    specialty = (select specialty from public.profiles where id = auth.uid())
    AND
    professional_id = auth.uid()
  );

-- UPDATE: Especialista só edita seus próprios registros (não do colega da mesma área)
create policy "Especialista só edita seus registros"
  on public.clinical_sessions for update
  using ( professional_id = auth.uid() );

-- DELETE: Ninguém deleta sessões (Regra de Auditoria). Apenas Admin via banco direto se necessário.
-- (Nenhuma policy de DELETE criada = Bloqueio total via API)

-- ==============================================================================
-- 6. GATILHOS (TRIGGERS) ÚTEIS
-- ==============================================================================

-- Trigger para criar Profile automaticamente ao criar User (opcional, facilita auth)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'SPECIALIST');
  return new;
end;
$$ language plpgsql security definer;

-- (Comentado pois depende da configuração de Auth do Supabase)
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute procedure public.handle_new_user();

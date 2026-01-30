-- SCRIPT DE CORREÇÃO FINAL V3: ESTRUTURA COMPLETA DE PERFIS
-- Autor: Antigravity AI
-- Data: 2026-01-20

-- ==============================================================================
-- 1. ADICIONAR TODAS AS COLUNAS FALTANTES NA TABELA PROFILES
-- ==============================================================================

DO $$
BEGIN
    -- E-mail
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email text;
    END IF;

    -- Username
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
        ALTER TABLE public.profiles ADD COLUMN username text;
    END IF;

    -- Telefone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone text;
    END IF;

    -- Cargo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'job_title') THEN
        ALTER TABLE public.profiles ADD COLUMN job_title text;
    END IF;

    -- Foto URL
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'photo_url') THEN
        ALTER TABLE public.profiles ADD COLUMN photo_url text;
    END IF;

    -- Endereço (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'address') THEN
        ALTER TABLE public.profiles ADD COLUMN address JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- Escopo (Para compatibilidade com o frontend 'scope')
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'scope') THEN
        ALTER TABLE public.profiles ADD COLUMN scope text DEFAULT 'GLOBAL';
    END IF;
END $$;

-- ==============================================================================
-- 2. REINICIAR POLÍTICAS DE SEGURANÇA (RLS) PARA EVITAR LOOP INFINITO
-- ==============================================================================

-- Removemos TODAS as políticas antigas para garantir limpeza
DROP POLICY IF EXISTS "Admins can see all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Visualizar Perfis" ON public.profiles;
DROP POLICY IF EXISTS "Criar Perfis" ON public.profiles;
DROP POLICY IF EXISTS "Atualizar Perfis" ON public.profiles;
DROP POLICY IF EXISTS "Excluir Perfis" ON public.profiles;
DROP POLICY IF EXISTS "Criar Próprio Perfil" ON public.profiles;
DROP POLICY IF EXISTS "Editar Perfil" ON public.profiles;
DROP POLICY IF EXISTS "Deletar Perfil" ON public.profiles;

-- Habilita RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. SELECT (Visualizar):
-- Regra Simplificada: Usuário vê a si mesmo.
CREATE POLICY "Visualizar Proprio Perfil" ON public.profiles
FOR SELECT USING ( auth.uid() = id );

-- Regra Admin: Admin vê TODOS.
-- ATENÇÃO: Usamos o metadado do token JWT para evitar consultar a tabela 'profiles' e causar recursão.
CREATE POLICY "Admin Visualiza Todos" ON public.profiles
FOR SELECT USING ( 
  current_setting('request.jwt.claim.user_metadata', true)::json->>'role' = 'ADMIN' 
);

-- 2. INSERT (Criar):
-- Admin pode criar qualquer perfil.
CREATE POLICY "Admin Cria Perfis" ON public.profiles
FOR INSERT WITH CHECK (
  current_setting('request.jwt.claim.user_metadata', true)::json->>'role' = 'ADMIN'
);

-- Usuário comum cria seu próprio perfil (Auto-cadastro).
CREATE POLICY "Usuario Cria Proprio Perfil" ON public.profiles
FOR INSERT WITH CHECK (
  auth.uid() = id
);

-- 3. UPDATE (Atualizar):
CREATE POLICY "Admin Atualiza Tudo" ON public.profiles
FOR UPDATE USING (
  current_setting('request.jwt.claim.user_metadata', true)::json->>'role' = 'ADMIN'
);

CREATE POLICY "Usuario Atualiza Proprio" ON public.profiles
FOR UPDATE USING (
  auth.uid() = id
);

-- 4. DELETE (Excluir):
CREATE POLICY "Admin Exclui Perfil" ON public.profiles
FOR DELETE USING (
  current_setting('request.jwt.claim.user_metadata', true)::json->>'role' = 'ADMIN'
);

-- Força atualização do cache de schema
NOTIFY pgrst, 'reload config';

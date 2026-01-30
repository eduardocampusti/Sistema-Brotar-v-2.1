-- SCRIPT DE CORREÇÃO FINAL: PROFILES & ENDEREÇO
-- Autor: Antigravity AI
-- Data: 2026-01-20

-- ==============================================================================
-- 1. ADICIONAR COLUNA DE ENDEREÇO (ADDRESS) NA TABELA PROFILES
-- ==============================================================================

-- Verifica se a coluna já existe para evitar erro
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'address') THEN
        ALTER TABLE public.profiles ADD COLUMN address JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- ==============================================================================
-- 2. CORREÇÃO DEFINITIVA DAS POLÍTICAS DE SEGURANÇA (RLS)
-- ==============================================================================

-- Removemos TODAS as políticas antigas da tabela profiles para garantir limpeza
DROP POLICY IF EXISTS "Admins can see all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Especialista vê apenas sua área" ON public.profiles;
DROP POLICY IF EXISTS "Visualizar Perfis" ON public.profiles;
DROP POLICY IF EXISTS "Criar Próprio Perfil" ON public.profiles;
DROP POLICY IF EXISTS "Editar Perfil" ON public.profiles;
DROP POLICY IF EXISTS "Deletar Perfil" ON public.profiles;

-- --- RECRIAÇÃO DAS POLÍTICAS SEM RECURSÃO ---

-- 1. SELECT (Visualizar):
-- Qualquer usuário autenticado pode ver seu próprio perfil.
-- Admins podem ver TODOS os perfis.
-- OBS: Usamos auth.jwt() -> 'user_metadata' ->> 'role' para checar se é ADMIN,
-- pois consultar a própria tabela 'profiles' para checar permissão CAUSA RECURSÃO INFINITA.
CREATE POLICY "Visualizar Perfis" ON public.profiles
FOR SELECT USING (
  auth.uid() = id 
  OR 
  (select (auth.jwt() -> 'user_metadata' ->> 'role')) = 'ADMIN'
);

-- 2. INSERT (Criar):
-- Admin pode criar qualquer perfil (para o recurso 'Criar Usuário' funcionar).
-- Usuário comum pode criar APENAS seu próprio perfil (durante auto-cadastro).
CREATE POLICY "Criar Perfis" ON public.profiles
FOR INSERT WITH CHECK (
  auth.uid() = id
  OR
  (select (auth.jwt() -> 'user_metadata' ->> 'role')) = 'ADMIN'
);

-- 3. UPDATE (Atualizar):
-- Usuário atualiza seus próprios dados.
-- Admin atualiza qualquer perfil.
CREATE POLICY "Atualizar Perfis" ON public.profiles
FOR UPDATE USING (
  auth.uid() = id 
  OR 
  (select (auth.jwt() -> 'user_metadata' ->> 'role')) = 'ADMIN'
);

-- 4. DELETE (Excluir):
-- Apenas Admin pode excluir perfis.
CREATE POLICY "Excluir Perfis" ON public.profiles
FOR DELETE USING (
  (select (auth.jwt() -> 'user_metadata' ->> 'role')) = 'ADMIN'
);

-- ==============================================================================
-- 3. FORÇAR ATUALIZAÇÃO DO ESQUEMA (CACHE)
-- ==============================================================================
NOTIFY pgrst, 'reload config';

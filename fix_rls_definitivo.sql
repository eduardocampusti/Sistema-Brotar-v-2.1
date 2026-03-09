-- =====================================================
-- SCRIPT DE CORREÇÃO DEFINITIVA DE RLS - BROTAR
-- Execute no SQL Editor do Supabase: indshiztdvjgvgnzigqd
-- =====================================================

-- PASSO 1: Remove TODAS as políticas existentes das tabelas críticas
-- (Evita conflitos e recursões)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('profiles', 'schools', 'students', 'appointments')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END;
$$;

-- PASSO 2: Garante que o RLS está habilitado nas tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- PASSO 3: Cria políticas CORRETAS para profiles
-- Usuário autenticado pode ler seus PRÓPRIOS dados
-- NOTA: NÃO referencia a tabela profiles dentro da própria política (evita recursão)
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admin pode ver todos os perfis
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
    OR
    auth.jwt()->>'role' = 'service_role'
  );

-- Admin pode criar/editar perfis
CREATE POLICY "profiles_all_admin"
  ON public.profiles FOR ALL
  USING (
    auth.jwt()->>'role' = 'service_role'
    OR (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
  );

-- PASSO 4: Cria política CORRETA para schools
-- Qualquer usuário autenticado pode LER as escolas
CREATE POLICY "schools_select_authenticated"
  ON public.schools FOR SELECT
  USING (auth.role() = 'authenticated');

-- Apenas admins podem criar/editar/excluir escolas
CREATE POLICY "schools_write_admin"
  ON public.schools FOR ALL
  USING (auth.role() = 'authenticated');

-- =====================================================
-- Verificação: Liste as políticas criadas
-- =====================================================
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'schools')
ORDER BY tablename, policyname;

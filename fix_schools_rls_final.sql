-- SCRIPT DE CORREÇÃO DE RLS PARA TABELA SCHOOLS (UNIDADES ESCOLARES)
-- Execute este script no SQL Editor do Supabase para garantir que as escolas apareçam no sistema.

-- 1. Garante que o RLS está habilitado
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- 2. Remove políticas antigas (se houver) para evitar conflitos
DROP POLICY IF EXISTS "schools_select_authenticated" ON public.schools;
DROP POLICY IF EXISTS "schools_write_admin" ON public.schools;
DROP POLICY IF EXISTS "policy_read_all_schools" ON public.schools;

-- 3. Cria política de LEITURA para TODOS os usuários autenticados
-- Isso garante que qualquer pessoa logada (Admin, Secretária, Escola, Especialista) veja a lista de escolas
CREATE POLICY "schools_select_authenticated_v2" 
ON public.schools FOR SELECT 
TO authenticated 
USING (true);

-- 4. Cria política de ESCRITA (INSERT/UPDATE/DELETE) apenas para ADMINS
-- Usando metadados do JWT para ser mais performático e evitar recursão
CREATE POLICY "schools_write_admin_v2" 
ON public.schools FOR ALL 
TO authenticated 
USING (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN' 
  OR 
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'ADMIN')
)
WITH CHECK (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
);

-- 5. Garante permissão de uso do schema public (geralmente já existe)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.schools TO authenticated;

-- 6. Verifica se o RLS está funcionando (deve mostrar as políticas atuais)
SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE tablename = 'schools';

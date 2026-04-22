-- SCRIPT PARA LIBERAR ACESSO DE ESCRITA NA TABELA SCHOOLS PARA SECRETARIA E ASSISTENTE
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard/project/indshiztdvjyvgznigqd/sql/new)

-- 1. Remove a política antiga que estava restrita apenas ao ADMIN
DROP POLICY IF EXISTS "schools_write_admin_v2" ON public.schools;

-- 2. Cria a nova política que permite ADMIN, EDUCATION_SECRETARY e ASSISTANT gerenciarem escolas
-- Nota: EDUCATION_SECRETARY e ASSISTANT são os papéis usados para Secretarias e Equipe de Apoio
CREATE POLICY "schools_write_staff_v3" 
ON public.schools FOR ALL 
TO authenticated 
USING (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('ADMIN', 'EDUCATION_SECRETARY', 'ASSISTANT')
  OR 
  auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role IN ('ADMIN', 'EDUCATION_SECRETARY', 'ASSISTANT')
  )
)
WITH CHECK (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('ADMIN', 'EDUCATION_SECRETARY', 'ASSISTANT')
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('ADMIN', 'EDUCATION_SECRETARY', 'ASSISTANT')
  )
);

-- 3. Garante que a leitura continue permitida para todos os usuários autenticados
DROP POLICY IF EXISTS "schools_select_authenticated_v2" ON public.schools;
CREATE POLICY "schools_select_authenticated_v3" 
ON public.schools FOR SELECT 
TO authenticated 
USING (true);

-- 4. Verificação das políticas ativas
SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE tablename = 'schools';

-- SISTEMA BROTAR - DIAGNÓSTICO DE IMPORTAÇÃO DE PROFISSIONAIS DE APOIO
-- Execute no SQL Editor do Supabase Dashboard
-- ==========================================================================

-- 1. Ver todas as colunas da tabela support_professionals
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'support_professionals'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Ver constraints (UNIQUE, NOT NULL, FK)
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'support_professionals'
  AND tc.table_schema = 'public'
ORDER BY tc.constraint_type;

-- 3. Ver políticas RLS ativas
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'support_professionals'
  AND schemaname = 'public';

-- 4. Verificar se a coluna student_id existe (pode ser que não exista!)
-- Se NÃO existir: adicionar com o comando abaixo (descomentar se precisar):
/*
ALTER TABLE public.support_professionals
ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id);
*/

-- 5. Verificar se CPF tem constraint UNIQUE (que permite nossa lógica de upsert)
-- Se NÃO tiver: adicionar com o comando abaixo (descomentar se precisar):
/*
ALTER TABLE public.support_professionals
ADD CONSTRAINT support_professionals_cpf_unique UNIQUE (cpf);
*/

-- 6. Verificar o JWT metadata do seu usuário atual (para debugar bloqueio de RLS)
-- Deve retornar o role 'ADMIN' ou 'EDUCATION_SECRETARY'
SELECT 
    auth.uid() AS user_id,
    auth.jwt() -> 'user_metadata' ->> 'role' AS jwt_role;

-- 7. FIX RÁPIDO: Se o RLS estiver bloqueando, execute para garantir que Admin pode tudo
DO $$
BEGIN
    -- Garante policy permissiva para ADMIN e EDUCATION_SECRETARY
    DROP POLICY IF EXISTS "policy_manage_support_professionals_v7" ON public.support_professionals;
    
    CREATE POLICY "policy_manage_support_professionals_v8" 
    ON public.support_professionals
    FOR ALL TO authenticated
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'EDUCATION_SECRETARY')
      OR
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'EDUCATION_SECRETARY')
    )
    WITH CHECK (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'EDUCATION_SECRETARY')
      OR
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'EDUCATION_SECRETARY')
    );
    
    RAISE NOTICE 'Política de gestão atualizada. Agora aceita role pelo JWT OU pelo banco de dados.';
END $$;

-- 8. Se o step 6 retornar NULL para jwt_role, sincronize o metadata do usuário:
-- (Substitua 'seu-email@exemplo.com' pelo email do admin)
/*
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "ADMIN"}'::jsonb
WHERE email = 'seu-email@exemplo.com';
*/

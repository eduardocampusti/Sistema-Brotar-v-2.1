-- SCRIPT DE ATUALIZAÇÃO: ESQUEMA E RLS DA TABELA SCHOOLS
-- Este script adiciona as colunas necessárias para conectividade e endereço, e libera acesso de escrita.

-- 1. Adicionar colunas ausentes (se não existirem)
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS has_internet BOOLEAN DEFAULT false;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS internet_type TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS internet_providers JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}'::jsonb;

-- 2. Garantir que a coluna is_active existe (usada pelo SupabaseService)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schools' AND column_name='is_active') THEN
        ALTER TABLE public.schools ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 3. Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "schools_write_admin_v2" ON public.schools;
DROP POLICY IF EXISTS "schools_write_staff_v3" ON public.schools;
DROP POLICY IF EXISTS "schools_write_staff_v4" ON public.schools;

-- 4. Criar nova política abrangente de escrita
-- Permite ADMIN, EDUCATION_SECRETARY e ASSISTANT gerenciarem escolas
CREATE POLICY "schools_write_staff_v5" 
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

-- 5. Garantir acesso de leitura para todos os autenticados
DROP POLICY IF EXISTS "schools_select_authenticated_v2" ON public.schools;
DROP POLICY IF EXISTS "schools_select_authenticated_v3" ON public.schools;
DROP POLICY IF EXISTS "schools_select_authenticated_v4" ON public.schools;

CREATE POLICY "schools_select_authenticated_v5" 
ON public.schools FOR SELECT 
TO authenticated 
USING (true);

-- 6. Verificação final
SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE tablename = 'schools';

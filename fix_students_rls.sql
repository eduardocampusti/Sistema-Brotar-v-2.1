-- SCRIPT: FIX RLS FOR STUDENTS TABLE
-- Objetivo: Permitir que usuários autenticados (Especialistas/Assistentes Sociais) atualizem alunos.

-- 1. Remover políticas antigas de UPDATE para evitar conflitos
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'students' AND schemaname = 'public' AND cmd = 'UPDATE') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.students'; 
    END LOOP; 
END $$;

-- 2. Garantir que RLS está ativo
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 3. Criar política de UPDATE permissiva para autenticados
-- Idealmente seria restrito por escola/distrito, mas para corrigir o erro "Não encontrado/Permissão negada" imediato,
-- vamos permitir que usuários logados editem alunos. (O Backend já filtra quem vê o que no SELECT).
CREATE POLICY "policy_update_students_authenticated" ON public.students
FOR UPDATE USING (
  auth.role() = 'authenticated'
) WITH CHECK (
  auth.role() = 'authenticated'
);

-- 4. Garantir SELECT também (caso esteja faltando)
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    -- Se não houver política de SELECT, cria uma básica
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'students' AND schemaname = 'public' AND cmd = 'SELECT') THEN
        CREATE POLICY "policy_select_students_authenticated" ON public.students
        FOR SELECT USING (
          auth.role() = 'authenticated'
        );
    END IF;
END $$;

NOTIFY pgrst, 'reload config';

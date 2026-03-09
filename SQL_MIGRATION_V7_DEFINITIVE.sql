-- SISTEMA BROTAR - MIGRAÇÃO V7 (DEFINITIVA)
-- OBJETIVO: PADRONIZAÇÃO DE NOMES (AUDITORIA) E CORREÇÃO FINAL DE RLS (JWT METADATA)
-- EXECUTAR NO 'SQL EDITOR' DO DASHBOARD SUPABASE

-- ==============================================================================
-- 1. PADRONIZAÇÃO DA TABELA DE AUDITORIA (SEM PERDA DE DADOS)
-- ==============================================================================
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'usuario') THEN
        ALTER TABLE public.audit_logs RENAME COLUMN usuario TO "user";
        ALTER TABLE public.audit_logs RENAME COLUMN perfil TO role;
        ALTER TABLE public.audit_logs RENAME COLUMN acao TO "action";
        ALTER TABLE public.audit_logs RENAME COLUMN modulo TO module;
        ALTER TABLE public.audit_logs RENAME COLUMN registro_afetado TO affected_record;
        ALTER TABLE public.audit_logs RENAME COLUMN data_hora TO "timestamp";
    END IF;
END $$;

-- ==============================================================================
-- 2. LIMPEZA DE POLÍTICAS ANTIGAS (EVITAR CONFLITOS)
-- ==============================================================================
DO $$ 
DECLARE r RECORD; 
BEGIN 
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('students', 'support_professionals', 'schools', 'profiles') AND schemaname = 'public') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename; 
    END LOOP; 
END $$;

-- ==============================================================================
-- 3. ATIVAÇÃO DO RLS
-- ==============================================================================
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 4. POLÍTICAS PARA ALUNOS (students) - BASEADAS EM JWT METADATA
-- ==============================================================================

-- LEITURA: Qualquer usuário autenticado com um cargo válido pode ver a lista de alunos
CREATE POLICY "policy_read_students_v7" ON public.students
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'EDUCATION_SECRETARY', 'SPECIALIST', 'ASSISTANT', 'ESCOLA')
);

-- GESTÃO: Apenas Admin e Secretaria podem Criar/Editar/Excluir alunos
CREATE POLICY "policy_manage_students_v7" ON public.students
FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'EDUCATION_SECRETARY')
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'EDUCATION_SECRETARY')
);

-- REGRAS ESPECÍFICAS PARA ESCOLA (Inserção/Edição vinculada ao INEP)
-- Nota: Admin já possui permissão acima. Aqui tratamos especificamente o papel ESCOLA.
CREATE POLICY "policy_escola_manage_self_students" ON public.students
FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'ESCOLA'
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'ESCOLA'
);

-- ==============================================================================
-- 5. POLÍTICAS PARA PROFISSIONAIS DE APOIO (support_professionals)
-- ==============================================================================

-- LEITURA: Admin, Secretaria e Especialistas podem ver Profissionais de Apoio
CREATE POLICY "policy_read_support_professionals_v7" ON public.support_professionals
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'EDUCATION_SECRETARY', 'SPECIALIST')
);

-- GESTÃO: Apenas Admin e Secretaria podem gerenciar Profissionais de Apoio
CREATE POLICY "policy_manage_support_professionals_v7" ON public.support_professionals
FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'EDUCATION_SECRETARY')
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'EDUCATION_SECRETARY')
);

-- ==============================================================================
-- 6. POLÍTICAS PARA ESCOLAS (schools)
-- ==============================================================================
CREATE POLICY "policy_read_schools_v7" ON public.schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "policy_manage_schools_v7" ON public.schools FOR ALL TO authenticated 
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN');

-- ==============================================================================
-- 7. POLÍTICAS PARA PERFIS (profiles) - ESSENCIAL PARA EVITAR RECURSÃO
-- ==============================================================================
CREATE POLICY "policy_read_profiles_v7" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "policy_manage_profiles_v7" ON public.profiles FOR ALL TO authenticated 
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN');

-- ==============================================================================
-- 8. RECARREGAR CONFIGURAÇÃO DO POSTGREST
-- ==============================================================================
NOTIFY pgrst, 'reload config';

-- ==============================================================================
-- 9. DICA IMPORTANTE: SINCRONIZAÇÃO DE ROLE
-- ==============================================================================
-- Certifique-se de que os usuários existentes tenham o 'role' no user_metadata do Auth.
-- Você pode forçar isso para o seu usuário Admin com este comando (substitua o email):
-- UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role": "ADMIN"}' WHERE email = 'seu-email@exemplo.com';

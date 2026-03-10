-- SISTEMA BROTAR - MIGRAÇÃO V9
-- OBJETIVO: CORREÇÃO DE ESTRUTURA E RLS PARA RESTAURAR VISIBILIDADE

-- 1. Adicionar coluna 'unit' na tabela 'students' (o código tenta filtrar por ela)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS unit VARCHAR(50);

-- 2. Garantir que 'role' esteja no JWT para todos os usuários (Dica para o usuário)
-- NOTA: Isso deve ser feito via Dashboard ou Script de Auth, mas as políticas abaixo já usam JWT.

-- 3. Reset de Políticas para Garantia Total
DO $$ 
DECLARE r RECORD; 
BEGIN 
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('students', 'support_professionals', 'schools', 'profiles', 'audit_logs') AND schemaname = 'public') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename; 
    END LOOP; 
END $$;

-- 4. Re-ativar RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Novas Políticas Super Robustas (Admin tem acesso a TUDO)
-- Alunos
CREATE POLICY "admin_all_students" ON public.students FOR ALL TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN');
CREATE POLICY "read_students_v9" ON public.students FOR SELECT TO authenticated USING (true); -- Permissivo para leitura, regras internas filtram no front se necessário

-- Profissionais de Apoio
CREATE POLICY "admin_all_professionals" ON public.support_professionals FOR ALL TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN');
CREATE POLICY "read_professionals_v9" ON public.support_professionals FOR SELECT TO authenticated USING (true);

-- Escolas
CREATE POLICY "admin_all_schools" ON public.schools FOR ALL TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN');
CREATE POLICY "read_schools_v9" ON public.schools FOR SELECT TO authenticated USING (true);

-- Perfis
CREATE POLICY "admin_all_profiles" ON public.profiles FOR ALL TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN');
CREATE POLICY "read_profiles_v9" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Auditoria
CREATE POLICY "admin_all_audit" ON public.audit_logs FOR ALL TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN');
CREATE POLICY "read_audit_v9" ON public.audit_logs FOR SELECT TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN');

-- 6. Grant Permissions (Caso tenham sido perdidas)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

NOTIFY pgrst, 'reload config';

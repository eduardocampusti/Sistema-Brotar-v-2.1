-- V12 - Limpeza total de RLS para eliminar políticas legadas/circulares
-- Objetivo: evitar timeout (57014) em consultas de students e support_professionals
-- Estratégia:
--   1) Apagar TODAS as policies existentes nessas 2 tabelas
--   2) Recriar apenas o conjunto mínimo e previsível:
--      - Leitura para todos autenticados
--      - Gestão total apenas para ADMIN (via JWT user_metadata.role)

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('students', 'support_professionals')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Garante RLS ativo nas tabelas alvo
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_professionals ENABLE ROW LEVEL SECURITY;

-- =========================
-- students
-- =========================
CREATE POLICY "admin_all_students"
ON public.students
FOR ALL
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN');

CREATE POLICY "read_students_v12"
ON public.students
FOR SELECT
TO authenticated
USING (true);

-- =========================
-- support_professionals
-- =========================
CREATE POLICY "admin_all_professionals"
ON public.support_professionals
FOR ALL
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN');

CREATE POLICY "read_professionals_v12"
ON public.support_professionals
FOR SELECT
TO authenticated
USING (true);

-- Grants explícitos (defensivo)
GRANT ALL ON TABLE public.students TO authenticated;
GRANT ALL ON TABLE public.students TO service_role;
GRANT ALL ON TABLE public.support_professionals TO authenticated;
GRANT ALL ON TABLE public.support_professionals TO service_role;

-- Recarrega cache do PostgREST
NOTIFY pgrst, 'reload config';


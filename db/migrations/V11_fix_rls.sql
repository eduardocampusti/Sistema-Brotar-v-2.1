-- V11 - RLS: leitura alinhada ao V9 para students e support_professionals
-- Não remove políticas desconhecidas (ex.: escola_insert_students, policy_manage_* antigas).
-- Garante par admin + SELECT permissivo (authenticated) como em SQL_MIGRATION_V9_FIX.sql.

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_professionals ENABLE ROW LEVEL SECURITY;

-- students
DROP POLICY IF EXISTS "admin_all_students" ON public.students;
CREATE POLICY "admin_all_students" ON public.students
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN');

DROP POLICY IF EXISTS "read_students_v9" ON public.students;
CREATE POLICY "read_students_v9" ON public.students
  FOR SELECT TO authenticated
  USING (true);

-- support_professionals
DROP POLICY IF EXISTS "admin_all_professionals" ON public.support_professionals;
CREATE POLICY "admin_all_professionals" ON public.support_professionals
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN');

DROP POLICY IF EXISTS "read_professionals_v9" ON public.support_professionals;
CREATE POLICY "read_professionals_v9" ON public.support_professionals
  FOR SELECT TO authenticated
  USING (true);

GRANT ALL ON TABLE public.students TO authenticated;
GRANT ALL ON TABLE public.students TO service_role;
GRANT ALL ON TABLE public.support_professionals TO authenticated;
GRANT ALL ON TABLE public.support_professionals TO service_role;

NOTIFY pgrst, 'reload config';

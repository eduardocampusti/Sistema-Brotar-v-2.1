/*------------------------------------------------------------------------
  V28 - RLS: leitura de audit_logs apenas para ADMIN e EDUCATION_SECRETARY
  Leitura (SELECT) restrita; INSERT permanece para authenticated (registro
  de auditoria pelo app). service_role não é afetado pelo RLS.
------------------------------------------------------------------------*/

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_logs', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_insert_authenticated
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY audit_logs_select_admin_or_education_secretary
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND upper(trim(coalesce(p.role::text, ''))) IN ('ADMIN', 'EDUCATION_SECRETARY')
    )
    OR upper(trim(coalesce(auth.jwt() -> 'user_metadata' ->> 'role', ''))) IN (
      'ADMIN',
      'EDUCATION_SECRETARY'
    )
  );

NOTIFY pgrst, 'reload schema';

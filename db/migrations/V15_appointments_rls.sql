-- V15 - RLS da tabela appointments alinhada ao restante do sistema (V11/V12)
--
-- Problema: INSERT retornava 42501 "new row violates row-level security policy for table appointments".
-- Causas comuns:
--   1) Políticas antigas usavam apenas profiles.role; JWT pode ter role correto com profile desatualizado/ausente.
--   2) Papéis de recepção/secretaria (ASSISTANT, SECRETARIA_*) não tinham política de escrita em appointments.
--   3) Apenas "especialista com mesma especialidade" não cobre quem agenda para outro profissional.
--
-- Estratégia: remover todas as policies de appointments e recriar conjunto explícito:
--   - Gestão (SELECT/INSERT/UPDATE/DELETE) para ADMIN e equipe de agendamento via JWT OU profiles.
--   - Leitura ampla para autenticados (lista/calendário).
--   - Especialista (não recepção): INSERT/UPDATE quando a especialidade da linha coincide com a do perfil.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'appointments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.appointments', r.policyname);
    END LOOP;
END $$;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Papéis que podem gerir agendamentos (recepção, secretarias, admin)
CREATE OR REPLACE FUNCTION public.appointments_is_scheduling_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role') IN (
        'ADMIN',
        'ASSISTANT',
        'SECRETARIA_SEDE',
        'SECRETARIA_COCAL',
        'EDUCATION_SECRETARY'
      ),
      false
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND upper(coalesce(p.role::text, '')) IN (
          'ADMIN',
          'ASSISTANT',
          'SECRETARIA_SEDE',
          'SECRETARIA_COCAL',
          'EDUCATION_SECRETARY'
        )
    );
$$;

REVOKE ALL ON FUNCTION public.appointments_is_scheduling_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.appointments_is_scheduling_staff() TO authenticated;

CREATE POLICY "appointments_staff_all_v15"
ON public.appointments
FOR ALL
TO authenticated
USING (public.appointments_is_scheduling_staff())
WITH CHECK (public.appointments_is_scheduling_staff());

CREATE POLICY "appointments_read_all_v15"
ON public.appointments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "appointments_specialist_insert_v15"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.appointments_is_scheduling_staff()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text = 'SPECIALIST'
      AND p.specialty IS NOT NULL
      AND p.specialty::text = appointments.specialty::text
  )
);

CREATE POLICY "appointments_specialist_update_v15"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  NOT public.appointments_is_scheduling_staff()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text = 'SPECIALIST'
      AND p.specialty IS NOT NULL
      AND p.specialty::text = appointments.specialty::text
  )
)
WITH CHECK (
  NOT public.appointments_is_scheduling_staff()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text = 'SPECIALIST'
      AND p.specialty IS NOT NULL
      AND p.specialty::text = appointments.specialty::text
  )
);

GRANT ALL ON TABLE public.appointments TO authenticated;
GRANT ALL ON TABLE public.appointments TO service_role;

NOTIFY pgrst, 'reload config';

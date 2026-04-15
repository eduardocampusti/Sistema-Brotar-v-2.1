/*------------------------------------------------------------------------
  V27 - Isolamento regional (Cocal / Sede) no RLS
  Execute este arquivo inteiro no SQL Editor (comentarios sao ignorados).
------------------------------------------------------------------------*/
--
-- Problema: `can_select_student` (V19-V20) e `can_insert_student` (V26) tratavam
-- SECRETARIA_COCAL, SECRETARIA_SEDE, ASSISTANT e (implicitamente) qualquer combinacao
-- da mesma forma que visao municipal ampla - sem filtrar `schools.district`.
-- `schools` (SELECT true), `appointments` (SELECT amplo) e `support_professionals`
-- (read USING true) reforçavam o vazamento.
--
-- Regra: perfil regional só enxerga linhas cuja escola (ou `appointments.unit` / vínculo ao aluno)
-- corresponde ao distrito retornado por `regional_district_cap()`.
-- ADMIN / COORDENADOR: sem teto regional.
-- EDUCATION_SECRETARY + escopo GLOBAL (ou vazio): sem teto regional.
-- ASSISTANT + escopo GLOBAL: sem teto regional.
-- SECRETARIA_COCAL / SECRETARIA_SEDE: sempre limitadas ao distrito do papel.

CREATE OR REPLACE FUNCTION public.regional_district_cap()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          upper(coalesce(p.role::text, '')) = 'SECRETARIA_COCAL'
          OR coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'SECRETARIA_COCAL'
        )
    ) THEN 'COCAL'
    WHEN EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          upper(coalesce(p.role::text, '')) = 'SECRETARIA_SEDE'
          OR coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'SECRETARIA_SEDE'
        )
    ) THEN 'SEDE'
    WHEN EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          upper(coalesce(p.role::text, '')) = 'ASSISTANT'
          OR coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'ASSISTANT'
        )
        AND upper(trim(coalesce(p.scope::text, ''))) = 'COCAL'
    ) THEN 'COCAL'
    WHEN EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          upper(coalesce(p.role::text, '')) = 'ASSISTANT'
          OR coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'ASSISTANT'
        )
        AND upper(trim(coalesce(p.scope::text, ''))) = 'SEDE'
    ) THEN 'SEDE'
    WHEN EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND upper(coalesce(p.role::text, '')) = 'EDUCATION_SECRETARY'
        AND upper(trim(coalesce(p.scope::text, ''))) = 'COCAL'
    ) THEN 'COCAL'
    WHEN EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND upper(coalesce(p.role::text, '')) = 'EDUCATION_SECRETARY'
        AND upper(trim(coalesce(p.scope::text, ''))) = 'SEDE'
    ) THEN 'SEDE'
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.regional_district_cap() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regional_district_cap() TO authenticated;
GRANT EXECUTE ON FUNCTION public.regional_district_cap() TO service_role;

-- Linhas com escola alinhada ao distrito do usuário regional, ou sem restrição regional / perfil ESCOLA.
CREATE OR REPLACE FUNCTION public.row_matches_regional_school(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND upper(coalesce(pr.role::text, '')) = 'ESCOLA'
        AND pr.school_id IS NOT NULL
        AND pr.school_id IS NOT DISTINCT FROM p_school_id
    )
    OR (
      NOT EXISTS (
        SELECT 1
        FROM public.profiles pr2
        WHERE pr2.id = auth.uid()
          AND upper(coalesce(pr2.role::text, '')) = 'ESCOLA'
      )
      AND (
        public.regional_district_cap() IS NULL
        OR (
          p_school_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.schools sch
            WHERE sch.id = p_school_id
              AND upper(trim(coalesce(sch.district, ''))) = public.regional_district_cap()
          )
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.row_matches_regional_school(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.row_matches_regional_school(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.row_matches_regional_school(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.can_select_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND COALESCE(pr.is_active, true)
    )
    AND (
      (
        COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('ADMIN', 'COORDENADOR')
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND upper(coalesce(p.role::text, '')) IN ('ADMIN', 'COORDENADOR')
        )
        OR (
          (
            COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'EDUCATION_SECRETARY'
            OR EXISTS (
              SELECT 1
              FROM public.profiles p
              WHERE p.id = auth.uid()
                AND upper(coalesce(p.role::text, '')) = 'EDUCATION_SECRETARY'
            )
          )
          AND public.regional_district_cap() IS NULL
        )
        OR (
          (
            COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'ASSISTANT'
            OR EXISTS (
              SELECT 1
              FROM public.profiles p
              WHERE p.id = auth.uid()
                AND upper(coalesce(p.role::text, '')) = 'ASSISTANT'
            )
          )
          AND public.regional_district_cap() IS NULL
        )
      )
      OR (
        public.regional_district_cap() IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.students s
          INNER JOIN public.schools sch ON sch.id = s.school_id
          WHERE s.id = p_student_id
            AND upper(trim(coalesce(sch.district, ''))) = public.regional_district_cap()
        )
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.students s ON s.id = p_student_id
        WHERE p.id = auth.uid()
          AND upper(coalesce(p.role::text, '')) = 'ESCOLA'
          AND p.school_id IS NOT NULL
          AND s.school_id = p.school_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND upper(coalesce(p.role::text, '')) = 'SPECIALIST'
          AND upper(trim(coalesce(p.specialty::text, ''))) = ANY (public.prontuario_especialidades_restritas())
          AND EXISTS (
            SELECT 1
            FROM public.appointments apt
            WHERE apt.student_id = p_student_id
              AND apt.professional_id = auth.uid()
              AND upper(trim(coalesce(apt.status::text, ''))) = ANY (public.prontuario_status_agendamento_vinculo())
              AND COALESCE(apt.excluido, false) = false
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND upper(coalesce(p.role::text, '')) = 'SPECIALIST'
          AND NOT (
            upper(trim(coalesce(p.specialty::text, ''))) = ANY (public.prontuario_especialidades_restritas())
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.can_select_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_select_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_select_student(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.can_insert_student(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND COALESCE(pr.is_active, true)
    )
    AND (
      (
        COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('ADMIN', 'COORDENADOR')
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND upper(coalesce(p.role::text, '')) IN ('ADMIN', 'COORDENADOR')
        )
        OR (
          (
            COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'EDUCATION_SECRETARY'
            OR EXISTS (
              SELECT 1
              FROM public.profiles p
              WHERE p.id = auth.uid()
                AND upper(coalesce(p.role::text, '')) = 'EDUCATION_SECRETARY'
            )
          )
          AND public.regional_district_cap() IS NULL
        )
        OR (
          (
            COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'ASSISTANT'
            OR EXISTS (
              SELECT 1
              FROM public.profiles p
              WHERE p.id = auth.uid()
                AND upper(coalesce(p.role::text, '')) = 'ASSISTANT'
            )
          )
          AND public.regional_district_cap() IS NULL
        )
      )
      OR (
        public.regional_district_cap() IS NOT NULL
        AND p_school_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.schools sch
          WHERE sch.id = p_school_id
            AND upper(trim(coalesce(sch.district, ''))) = public.regional_district_cap()
        )
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND upper(coalesce(p.role::text, '')) = 'ESCOLA'
          AND p.school_id IS NOT NULL
          AND p.school_id IS NOT DISTINCT FROM p_school_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND upper(coalesce(p.role::text, '')) = 'SPECIALIST'
          AND NOT (
            upper(trim(coalesce(p.specialty::text, ''))) = ANY (public.prontuario_especialidades_restritas())
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.can_insert_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_insert_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_insert_student(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- schools: substituir SELECT aberto
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "schools_select_authenticated_v2" ON public.schools;
DROP POLICY IF EXISTS "read_schools_v9" ON public.schools;
DROP POLICY IF EXISTS "policy_read_schools_v7" ON public.schools;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.schools;

CREATE POLICY "schools_select_v27"
ON public.schools
FOR SELECT
TO authenticated
USING (
  public.appointments_is_admin()
  OR public.row_matches_regional_school(id)
);

-- ---------------------------------------------------------------------------
-- appointments: restringe SELECT para equipe regional
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS appointments_select_active_or_admin_v23 ON public.appointments;

CREATE POLICY appointments_select_active_or_admin_v27
ON public.appointments
FOR SELECT
TO authenticated
USING (
  (NOT COALESCE(excluido, false) OR public.appointments_is_admin())
  AND (
    public.appointments_is_admin()
    OR public.regional_district_cap() IS NULL
    OR upper(trim(coalesce(unit::text, ''))) = public.regional_district_cap()
    OR (
      student_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.students st
        INNER JOIN public.schools sch ON sch.id = st.school_id
        WHERE st.id = student_id
          AND upper(trim(coalesce(sch.district, ''))) = public.regional_district_cap()
      )
    )
  )
);

-- ---------------------------------------------------------------------------
-- support_professionals: remove leitura aberta + exige alinhamento na gestão
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "read_professionals_v12" ON public.support_professionals;
DROP POLICY IF EXISTS "read_professionals_v9" ON public.support_professionals;

CREATE POLICY "read_support_professionals_v27"
ON public.support_professionals
FOR SELECT
TO authenticated
USING (public.row_matches_regional_school(school_id));

DROP POLICY IF EXISTS "manage_professionals_staff_v16" ON public.support_professionals;

CREATE POLICY "manage_professionals_staff_v27"
ON public.support_professionals
FOR ALL
TO authenticated
USING (
  public.support_professionals_can_manage()
  AND public.row_matches_regional_school(school_id)
)
WITH CHECK (
  public.support_professionals_can_manage()
  AND public.row_matches_regional_school(school_id)
);

NOTIFY pgrst, 'reload config';

-- V46 — AUTH-01: profiles é a única fonte de autorização.
--
-- Esta migração não altera nem remove dados. Ela elimina decisões baseadas em
-- metadata editável do Auth, protege atributos autorizativos de profiles e
-- mantém os recortes por escola/distrito, especialidade e profissional.

BEGIN;

-- Pré-condições do schema V45. Falha antes de qualquer alteração se o ambiente
-- não tiver a linha de base esperada.
DO $$
DECLARE
  missing_items text[];
BEGIN
  SELECT array_agg(required.relation_name ORDER BY required.relation_name)
  INTO missing_items
  FROM (
    VALUES
      ('public.profiles'),
      ('public.schools'),
      ('public.students'),
      ('public.appointments'),
      ('public.support_professionals'),
      ('public.profissional_aluno_vinculo'),
      ('public.audit_logs'),
      ('public.nutrition_assessments'),
      ('public.nutrition_anthropometry_history'),
      ('public.nutrition_nae'),
      ('public.nutrition_ean_activities'),
      ('public.nutrition_evolution')
  ) AS required(relation_name)
  WHERE to_regclass(required.relation_name) IS NULL;

  IF coalesce(array_length(missing_items, 1), 0) > 0 THEN
    RAISE EXCEPTION 'V46 requer relações do schema V45 ausentes: %', array_to_string(missing_items, ', ');
  END IF;

  SELECT array_agg(required.table_name || '.' || required.column_name ORDER BY required.table_name, required.column_name)
  INTO missing_items
  FROM (
    VALUES
      ('profiles', 'id'),
      ('profiles', 'role'),
      ('profiles', 'is_active'),
      ('profiles', 'scope'),
      ('profiles', 'school_id'),
      ('profiles', 'specialty'),
      ('schools', 'id'),
      ('schools', 'district'),
      ('students', 'id'),
      ('students', 'school_id'),
      ('appointments', 'id'),
      ('appointments', 'student_id'),
      ('appointments', 'professional_id'),
      ('appointments', 'specialty'),
      ('appointments', 'status'),
      ('appointments', 'unit'),
      ('appointments', 'excluido'),
      ('profissional_aluno_vinculo', 'profissional_id'),
      ('nutrition_assessments', 'professional_id'),
      ('nutrition_anthropometry_history', 'professional_id'),
      ('nutrition_nae', 'professional_id'),
      ('nutrition_ean_activities', 'professional_id'),
      ('nutrition_evolution', 'professional_id')
  ) AS required(table_name, column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns col
    WHERE col.table_schema = 'public'
      AND col.table_name = required.table_name
      AND col.column_name = required.column_name
  );

  IF coalesce(array_length(missing_items, 1), 0) > 0 THEN
    RAISE EXCEPTION 'V46 requer colunas do schema V45 ausentes: %', array_to_string(missing_items, ', ');
  END IF;

  IF to_regprocedure('auth.uid()') IS NULL OR to_regprocedure('auth.role()') IS NULL THEN
    RAISE EXCEPTION 'V46 requer as funções auth.uid() e auth.role().';
  END IF;

  IF to_regprocedure('public.prontuario_status_agendamento_vinculo()') IS NULL THEN
    RAISE EXCEPTION 'V46 requer public.prontuario_status_agendamento_vinculo().';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
  THEN
    RAISE EXCEPTION 'V46 requer os papéis authenticated e service_role.';
  END IF;
END;
$$;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.profile_is_authorizable(p_profile public.profiles)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT
    p_profile.is_active IS TRUE
    AND upper(trim(coalesce(to_jsonb(p_profile) ->> 'status', ''))) NOT IN (
      'INACTIVE', 'INATIVO', 'SUSPENDED', 'SUSPENSO', 'BLOCKED', 'BLOQUEADO'
    )
    AND upper(trim(coalesce(to_jsonb(p_profile) ->> 'account_status', ''))) NOT IN (
      'INACTIVE', 'INATIVO', 'SUSPENDED', 'SUSPENSO', 'BLOCKED', 'BLOQUEADO'
    )
    AND lower(trim(coalesce(to_jsonb(p_profile) ->> 'suspended', 'false'))) NOT IN ('true', '1', 'yes', 'sim')
    AND lower(trim(coalesce(to_jsonb(p_profile) ->> 'is_suspended', 'false'))) NOT IN ('true', '1', 'yes', 'sim');
$$;

REVOKE ALL ON FUNCTION private.profile_is_authorizable(public.profiles) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.current_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT nullif(upper(trim(coalesce(p.role::text, ''))), '')
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND private.profile_is_authorizable(p)
    AND upper(trim(coalesce(p.role::text, ''))) IN (
      'ADMIN', 'SPECIALIST', 'ASSISTANT', 'EDUCATION_SECRETARY',
      'SECRETARIA_EDUCACAO', 'SECRETARIA_SEDE', 'SECRETARIA_COCAL',
      'COORDENADOR', 'ESCOLA'
    );
$$;

CREATE OR REPLACE FUNCTION private.current_profile_scope()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT nullif(upper(trim(coalesce(p.scope::text, ''))), '')
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND private.profile_is_authorizable(p);
$$;

CREATE OR REPLACE FUNCTION private.current_profile_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT p.school_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND private.profile_is_authorizable(p);
$$;

CREATE OR REPLACE FUNCTION private.current_profile_specialty()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT nullif(upper(trim(coalesce(p.specialty::text, ''))), '')
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND private.profile_is_authorizable(p);
$$;

REVOKE ALL ON FUNCTION private.current_profile_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_profile_scope() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_profile_school_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_profile_specialty() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_profile_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_profile_scope() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_profile_school_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_profile_specialty() TO authenticated, service_role;

-- Impede que um usuário autenticado altere os próprios atributos de autorização.
CREATE OR REPLACE FUNCTION private.protect_profile_authorization_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  protected_columns constant text[] := ARRAY[
    'role', 'is_active', 'status', 'account_status', 'suspended', 'is_suspended',
    'scope', 'district_scope', 'district', 'school_id', 'school_inep',
    'tenant_id', 'clinic_id', 'unit_id', 'organization_id', 'regional_id',
    'specialty'
  ];
  changed_column text;
BEGIN
  IF auth.role() = 'authenticated'
     AND private.current_profile_role() IS DISTINCT FROM 'ADMIN'
  THEN
    SELECT key
    INTO changed_column
    FROM jsonb_object_keys(to_jsonb(NEW)) AS keys(key)
    WHERE key = ANY (protected_columns)
      AND to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key
    LIMIT 1;

    IF changed_column IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Authorization fields are server-controlled.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_profile_authorization_columns() FROM PUBLIC;
DROP TRIGGER IF EXISTS protect_profile_authorization_columns_v46 ON public.profiles;
CREATE TRIGGER protect_profile_authorization_columns_v46
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.protect_profile_authorization_columns();

-- Especialistas podem atualizar dados operacionais do próprio agendamento,
-- mas não podem trocar o profissional, aluno, clínica ou tenant da linha.
CREATE OR REPLACE FUNCTION private.protect_appointment_assignment_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.role() = 'authenticated'
     AND private.current_profile_role() = 'SPECIALIST'
     AND (
       NEW.professional_id IS DISTINCT FROM OLD.professional_id
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.specialty IS DISTINCT FROM OLD.specialty
       OR NEW.unit IS DISTINCT FROM OLD.unit
     )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Appointment assignment fields are server-controlled.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_appointment_assignment_columns() FROM PUBLIC;
DROP TRIGGER IF EXISTS protect_appointment_assignment_columns_v46 ON public.appointments;
CREATE TRIGGER protect_appointment_assignment_columns_v46
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION private.protect_appointment_assignment_columns();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_row.policyname);
  END LOOP;
END;
$$;

CREATE POLICY profiles_select_active_v46
ON public.profiles
FOR SELECT
TO authenticated
USING (
  private.current_profile_role() IS NOT NULL
  AND (id = auth.uid() OR is_active IS TRUE)
);

CREATE POLICY profiles_insert_admin_v46
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (private.current_profile_role() = 'ADMIN');

CREATE POLICY profiles_update_admin_or_self_v46
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  private.current_profile_role() = 'ADMIN'
  OR (private.current_profile_role() IS NOT NULL AND id = auth.uid())
)
WITH CHECK (
  private.current_profile_role() = 'ADMIN'
  OR (private.current_profile_role() IS NOT NULL AND id = auth.uid())
);

CREATE POLICY profiles_delete_admin_v46
ON public.profiles
FOR DELETE
TO authenticated
USING (private.current_profile_role() = 'ADMIN');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- Helpers públicos já consumidos por policies existentes.
CREATE OR REPLACE FUNCTION public.appointments_is_scheduling_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT private.current_profile_role() IN (
    'ADMIN', 'ASSISTANT', 'SECRETARIA_SEDE', 'SECRETARIA_COCAL',
    'EDUCATION_SECRETARY', 'SECRETARIA_EDUCACAO'
  );
$$;

CREATE OR REPLACE FUNCTION public.appointments_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT private.current_profile_role() = 'ADMIN';
$$;

CREATE OR REPLACE FUNCTION public.support_professionals_can_manage()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT private.current_profile_role() IN (
    'ADMIN', 'ASSISTANT', 'SECRETARIA_SEDE', 'SECRETARIA_COCAL',
    'EDUCATION_SECRETARY', 'SECRETARIA_EDUCACAO'
  );
$$;

CREATE OR REPLACE FUNCTION public.support_professionals_can_select_inactive_rows()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT private.current_profile_role() IN (
    'ADMIN', 'ASSISTANT', 'SECRETARIA_SEDE', 'SECRETARIA_COCAL',
    'EDUCATION_SECRETARY', 'SECRETARIA_EDUCACAO'
  );
$$;

CREATE OR REPLACE FUNCTION public.support_professionals_escola_can_write_school(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT
    private.current_profile_role() = 'ESCOLA'
    AND private.current_profile_school_id() IS NOT NULL
    AND private.current_profile_school_id() IS NOT DISTINCT FROM p_school_id;
$$;

CREATE OR REPLACE FUNCTION public.regional_district_cap()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN private.current_profile_role() = 'SECRETARIA_COCAL' THEN 'COCAL'
    WHEN private.current_profile_role() = 'SECRETARIA_SEDE' THEN 'SEDE'
    WHEN private.current_profile_role() IN ('ASSISTANT', 'EDUCATION_SECRETARY')
      AND private.current_profile_scope() IN ('COCAL', 'SEDE')
      THEN private.current_profile_scope()
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.appointment_matches_profile_scope(p_unit text, p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT
    private.current_profile_role() IS NOT NULL
    AND (
      private.current_profile_role() IN ('ADMIN', 'COORDENADOR', 'SECRETARIA_EDUCACAO')
      OR (
        private.current_profile_role() IN (
          'ASSISTANT', 'SECRETARIA_SEDE', 'SECRETARIA_COCAL', 'EDUCATION_SECRETARY'
        )
        AND (
          public.regional_district_cap() IS NULL
          OR upper(trim(coalesce(p_unit, ''))) = public.regional_district_cap()
          OR EXISTS (
            SELECT 1
            FROM public.students st
            INNER JOIN public.schools sch ON sch.id = st.school_id
            WHERE st.id = p_student_id
              AND upper(trim(coalesce(sch.district, ''))) = public.regional_district_cap()
          )
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.row_matches_regional_school(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT
    private.current_profile_role() IS NOT NULL
    AND (
      (
        private.current_profile_role() = 'ESCOLA'
        AND private.current_profile_school_id() IS NOT NULL
        AND private.current_profile_school_id() IS NOT DISTINCT FROM p_school_id
      )
      OR (
        private.current_profile_role() <> 'ESCOLA'
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
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_select_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT
    private.current_profile_role() IS NOT NULL
    AND (
      private.current_profile_role() IN ('ADMIN', 'COORDENADOR', 'SECRETARIA_EDUCACAO')
      OR (
        private.current_profile_role() IN ('EDUCATION_SECRETARY', 'ASSISTANT')
        AND public.regional_district_cap() IS NULL
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
      OR (
        private.current_profile_role() = 'ESCOLA'
        AND EXISTS (
          SELECT 1
          FROM public.students s
          WHERE s.id = p_student_id
            AND s.school_id = private.current_profile_school_id()
        )
      )
      OR (
        private.current_profile_role() = 'SPECIALIST'
        AND private.current_profile_specialty() IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.appointments apt
          WHERE apt.student_id = p_student_id
            AND apt.professional_id = auth.uid()
            AND upper(trim(coalesce(apt.specialty::text, ''))) = private.current_profile_specialty()
            AND upper(trim(coalesce(apt.status::text, ''))) = ANY (public.prontuario_status_agendamento_vinculo())
            AND COALESCE(apt.excluido, false) = false
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_insert_student(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT
    private.current_profile_role() IS NOT NULL
    AND (
      private.current_profile_role() IN ('ADMIN', 'COORDENADOR', 'SECRETARIA_EDUCACAO')
      OR (
        private.current_profile_role() IN (
          'SECRETARIA_SEDE', 'SECRETARIA_COCAL', 'EDUCATION_SECRETARY', 'ASSISTANT'
        )
        AND (
          p_school_id IS NULL
          OR public.regional_district_cap() IS NULL
          OR public.row_matches_regional_school(p_school_id)
        )
      )
      OR (
        private.current_profile_role() = 'ESCOLA'
        AND private.current_profile_school_id() IS NOT NULL
        AND private.current_profile_school_id() IS NOT DISTINCT FROM p_school_id
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_update_student_clinical(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT
    private.current_profile_role() IS NOT NULL
    AND (
      private.current_profile_role() IN ('ADMIN', 'COORDENADOR', 'SECRETARIA_EDUCACAO')
      OR (
        private.current_profile_role() IN (
          'SECRETARIA_SEDE', 'SECRETARIA_COCAL', 'EDUCATION_SECRETARY', 'ASSISTANT'
        )
        AND EXISTS (
          SELECT 1
          FROM public.students s
          WHERE s.id = p_student_id
            AND (
              s.school_id IS NULL
              OR public.regional_district_cap() IS NULL
              OR public.row_matches_regional_school(s.school_id)
            )
        )
      )
      OR (
        private.current_profile_role() = 'ESCOLA'
        AND EXISTS (
          SELECT 1
          FROM public.students s
          WHERE s.id = p_student_id
            AND s.school_id = private.current_profile_school_id()
        )
      )
      OR (
        private.current_profile_role() = 'SPECIALIST'
        AND private.current_profile_specialty() IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.appointments apt
          WHERE apt.student_id = p_student_id
            AND apt.professional_id = auth.uid()
            AND upper(trim(coalesce(apt.specialty::text, ''))) = private.current_profile_specialty()
            AND upper(trim(coalesce(apt.status::text, ''))) = ANY (public.prontuario_status_agendamento_vinculo())
            AND COALESCE(apt.excluido, false) = false
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.appointments_is_scheduling_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.appointments_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.support_professionals_can_manage() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.support_professionals_can_select_inactive_rows() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.support_professionals_escola_can_write_school(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.regional_district_cap() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.appointment_matches_profile_scope(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.row_matches_regional_school(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_select_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_insert_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_update_student_clinical(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.appointments_is_scheduling_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.appointments_is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.support_professionals_can_manage() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.support_professionals_can_select_inactive_rows() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.support_professionals_escola_can_write_school(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.regional_district_cap() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.appointment_matches_profile_scope(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.row_matches_regional_school(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_select_student(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_insert_student(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_update_student_clinical(uuid) TO authenticated, service_role;

-- Remove a policy administrativa legada que sobrevivia às substituições de SELECT.
DROP POLICY IF EXISTS admin_all_students ON public.students;
DROP POLICY IF EXISTS admin_all_professionals ON public.support_professionals;

-- Agendamentos: substitui todas as variantes antigas para impedir leitura entre
-- distritos e alteração de linhas pertencentes a outro profissional.
DROP POLICY IF EXISTS appointments_read_all_v15 ON public.appointments;
DROP POLICY IF EXISTS appointments_select_active_or_admin_v23 ON public.appointments;
DROP POLICY IF EXISTS appointments_select_active_or_admin_v27 ON public.appointments;
DROP POLICY IF EXISTS appointments_select_profile_scope_v46 ON public.appointments;
DROP POLICY IF EXISTS appointments_staff_all_v15 ON public.appointments;
DROP POLICY IF EXISTS appointments_staff_insert_v23 ON public.appointments;
DROP POLICY IF EXISTS appointments_staff_update_v23 ON public.appointments;
DROP POLICY IF EXISTS appointments_staff_insert_v46 ON public.appointments;
DROP POLICY IF EXISTS appointments_staff_update_v46 ON public.appointments;
DROP POLICY IF EXISTS appointments_specialist_insert_v15 ON public.appointments;
DROP POLICY IF EXISTS appointments_specialist_update_v15 ON public.appointments;
DROP POLICY IF EXISTS appointments_specialist_insert_v23 ON public.appointments;
DROP POLICY IF EXISTS appointments_specialist_update_v23 ON public.appointments;
DROP POLICY IF EXISTS appointments_specialist_update_v46 ON public.appointments;

CREATE POLICY appointments_select_profile_scope_v46
ON public.appointments
FOR SELECT
TO authenticated
USING (
  private.current_profile_role() = 'ADMIN'
  OR (
    NOT COALESCE(excluido, false)
    AND (
      private.current_profile_role() IN ('COORDENADOR', 'SECRETARIA_EDUCACAO')
      OR (
        public.appointments_is_scheduling_staff()
        AND public.appointment_matches_profile_scope(unit::text, student_id)
      )
      OR (
        private.current_profile_role() = 'SPECIALIST'
        AND professional_id = auth.uid()
        AND private.current_profile_specialty() IS NOT NULL
        AND upper(trim(coalesce(specialty::text, ''))) = private.current_profile_specialty()
      )
      OR (
        private.current_profile_role() = 'ESCOLA'
        AND EXISTS (
          SELECT 1
          FROM public.students st
          WHERE st.id = appointments.student_id
            AND st.school_id = private.current_profile_school_id()
        )
      )
    )
  )
);

CREATE POLICY appointments_staff_insert_v46
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  public.appointments_is_scheduling_staff()
  AND public.appointment_matches_profile_scope(unit::text, student_id)
  AND (public.appointments_is_admin() OR NOT COALESCE(excluido, false))
);

CREATE POLICY appointments_staff_update_v46
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  public.appointments_is_scheduling_staff()
  AND public.appointment_matches_profile_scope(unit::text, student_id)
  AND (NOT COALESCE(excluido, false) OR public.appointments_is_admin())
)
WITH CHECK (
  public.appointments_is_scheduling_staff()
  AND public.appointment_matches_profile_scope(unit::text, student_id)
  AND (public.appointments_is_admin() OR NOT COALESCE(excluido, false))
);

CREATE POLICY appointments_specialist_update_v46
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  private.current_profile_role() = 'SPECIALIST'
  AND professional_id = auth.uid()
  AND private.current_profile_specialty() IS NOT NULL
  AND upper(trim(coalesce(specialty::text, ''))) = private.current_profile_specialty()
  AND NOT COALESCE(excluido, false)
)
WITH CHECK (
  private.current_profile_role() = 'SPECIALIST'
  AND professional_id = auth.uid()
  AND private.current_profile_specialty() IS NOT NULL
  AND upper(trim(coalesce(specialty::text, ''))) = private.current_profile_specialty()
  AND NOT COALESCE(excluido, false)
);

DROP POLICY IF EXISTS read_own_vinculo_v18 ON public.profissional_aluno_vinculo;
CREATE POLICY read_own_vinculo_v46
ON public.profissional_aluno_vinculo
FOR SELECT
TO authenticated
USING (
  private.current_profile_role() IS NOT NULL
  AND (profissional_id = auth.uid() OR private.current_profile_role() = 'ADMIN')
);

DROP POLICY IF EXISTS audit_logs_insert_authenticated ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_select_admin_or_education_secretary ON public.audit_logs;

CREATE POLICY audit_logs_insert_active_profile_v46
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (private.current_profile_role() IS NOT NULL);

CREATE POLICY audit_logs_select_trusted_role_v46
ON public.audit_logs
FOR SELECT
TO authenticated
USING (private.current_profile_role() IN ('ADMIN', 'EDUCATION_SECRETARY'));

-- Policies do módulo de nutrição: dono do registro ou papel confiável em profiles.
DROP POLICY IF EXISTS nutrition_assessments_select ON public.nutrition_assessments;
DROP POLICY IF EXISTS nutrition_assessments_insert ON public.nutrition_assessments;
DROP POLICY IF EXISTS nutrition_assessments_update ON public.nutrition_assessments;
DROP POLICY IF EXISTS nutrition_assessments_delete ON public.nutrition_assessments;
CREATE POLICY nutrition_assessments_select_v46 ON public.nutrition_assessments FOR SELECT TO authenticated
USING (private.current_profile_role() IS NOT NULL AND (professional_id = auth.uid() OR private.current_profile_role() IN ('ADMIN', 'EDUCATION_SECRETARY')));
CREATE POLICY nutrition_assessments_insert_v46 ON public.nutrition_assessments FOR INSERT TO authenticated
WITH CHECK (private.current_profile_role() IS NOT NULL AND professional_id = auth.uid());
CREATE POLICY nutrition_assessments_update_v46 ON public.nutrition_assessments FOR UPDATE TO authenticated
USING (private.current_profile_role() IS NOT NULL AND (professional_id = auth.uid() OR private.current_profile_role() = 'ADMIN'))
WITH CHECK (private.current_profile_role() IS NOT NULL AND (professional_id = auth.uid() OR private.current_profile_role() = 'ADMIN'));
CREATE POLICY nutrition_assessments_delete_v46 ON public.nutrition_assessments FOR DELETE TO authenticated
USING (private.current_profile_role() = 'ADMIN');

DROP POLICY IF EXISTS nutrition_anthropometry_select ON public.nutrition_anthropometry_history;
DROP POLICY IF EXISTS nutrition_anthropometry_insert ON public.nutrition_anthropometry_history;
DROP POLICY IF EXISTS nutrition_anthropometry_update ON public.nutrition_anthropometry_history;
DROP POLICY IF EXISTS nutrition_anthropometry_delete ON public.nutrition_anthropometry_history;
CREATE POLICY nutrition_anthropometry_select_v46 ON public.nutrition_anthropometry_history FOR SELECT TO authenticated
USING (private.current_profile_role() IS NOT NULL AND (professional_id = auth.uid() OR private.current_profile_role() IN ('ADMIN', 'EDUCATION_SECRETARY')));
CREATE POLICY nutrition_anthropometry_insert_v46 ON public.nutrition_anthropometry_history FOR INSERT TO authenticated
WITH CHECK (private.current_profile_role() IS NOT NULL AND professional_id = auth.uid());
CREATE POLICY nutrition_anthropometry_update_v46 ON public.nutrition_anthropometry_history FOR UPDATE TO authenticated
USING (private.current_profile_role() IS NOT NULL AND (professional_id = auth.uid() OR private.current_profile_role() = 'ADMIN'))
WITH CHECK (private.current_profile_role() IS NOT NULL AND (professional_id = auth.uid() OR private.current_profile_role() = 'ADMIN'));
CREATE POLICY nutrition_anthropometry_delete_v46 ON public.nutrition_anthropometry_history FOR DELETE TO authenticated
USING (private.current_profile_role() = 'ADMIN');

DROP POLICY IF EXISTS nutrition_nae_select ON public.nutrition_nae;
DROP POLICY IF EXISTS nutrition_nae_insert ON public.nutrition_nae;
DROP POLICY IF EXISTS nutrition_nae_update ON public.nutrition_nae;
DROP POLICY IF EXISTS nutrition_nae_delete ON public.nutrition_nae;
CREATE POLICY nutrition_nae_select_v46 ON public.nutrition_nae FOR SELECT TO authenticated
USING (private.current_profile_role() IS NOT NULL AND (professional_id = auth.uid() OR private.current_profile_role() IN ('ADMIN', 'EDUCATION_SECRETARY')));
CREATE POLICY nutrition_nae_insert_v46 ON public.nutrition_nae FOR INSERT TO authenticated
WITH CHECK (private.current_profile_role() IS NOT NULL AND professional_id = auth.uid());
CREATE POLICY nutrition_nae_update_v46 ON public.nutrition_nae FOR UPDATE TO authenticated
USING (private.current_profile_role() IS NOT NULL AND (professional_id = auth.uid() OR private.current_profile_role() = 'ADMIN'))
WITH CHECK (private.current_profile_role() IS NOT NULL AND (professional_id = auth.uid() OR private.current_profile_role() = 'ADMIN'));
CREATE POLICY nutrition_nae_delete_v46 ON public.nutrition_nae FOR DELETE TO authenticated
USING (private.current_profile_role() = 'ADMIN');

DROP POLICY IF EXISTS nutrition_ean_select ON public.nutrition_ean_activities;
DROP POLICY IF EXISTS nutrition_ean_insert ON public.nutrition_ean_activities;
DROP POLICY IF EXISTS nutrition_ean_update ON public.nutrition_ean_activities;
DROP POLICY IF EXISTS nutrition_ean_delete ON public.nutrition_ean_activities;
CREATE POLICY nutrition_ean_select_v46 ON public.nutrition_ean_activities FOR SELECT TO authenticated
USING (private.current_profile_role() IS NOT NULL AND (professional_id = auth.uid() OR private.current_profile_role() IN ('ADMIN', 'EDUCATION_SECRETARY')));
CREATE POLICY nutrition_ean_insert_v46 ON public.nutrition_ean_activities FOR INSERT TO authenticated
WITH CHECK (private.current_profile_role() IS NOT NULL AND professional_id = auth.uid());
CREATE POLICY nutrition_ean_update_v46 ON public.nutrition_ean_activities FOR UPDATE TO authenticated
USING (private.current_profile_role() IS NOT NULL AND (professional_id = auth.uid() OR private.current_profile_role() = 'ADMIN'))
WITH CHECK (private.current_profile_role() IS NOT NULL AND (professional_id = auth.uid() OR private.current_profile_role() = 'ADMIN'));
CREATE POLICY nutrition_ean_delete_v46 ON public.nutrition_ean_activities FOR DELETE TO authenticated
USING (private.current_profile_role() = 'ADMIN');

DROP POLICY IF EXISTS nutrition_evolution_select ON public.nutrition_evolution;
DROP POLICY IF EXISTS nutrition_evolution_insert ON public.nutrition_evolution;
DROP POLICY IF EXISTS nutrition_evolution_update ON public.nutrition_evolution;
DROP POLICY IF EXISTS nutrition_evolution_delete ON public.nutrition_evolution;
CREATE POLICY nutrition_evolution_select_v46 ON public.nutrition_evolution FOR SELECT TO authenticated
USING (private.current_profile_role() IS NOT NULL AND (professional_id = auth.uid() OR private.current_profile_role() IN ('ADMIN', 'EDUCATION_SECRETARY')));
CREATE POLICY nutrition_evolution_insert_v46 ON public.nutrition_evolution FOR INSERT TO authenticated
WITH CHECK (private.current_profile_role() IS NOT NULL AND professional_id = auth.uid());
CREATE POLICY nutrition_evolution_update_v46 ON public.nutrition_evolution FOR UPDATE TO authenticated
USING (private.current_profile_role() IS NOT NULL AND (professional_id = auth.uid() OR private.current_profile_role() = 'ADMIN'))
WITH CHECK (private.current_profile_role() IS NOT NULL AND (professional_id = auth.uid() OR private.current_profile_role() = 'ADMIN'));
CREATE POLICY nutrition_evolution_delete_v46 ON public.nutrition_evolution FOR DELETE TO authenticated
USING (private.current_profile_role() = 'ADMIN');

-- Falha de forma segura se alguma policy/função ativa ainda consultar metadata editável.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND (
        coalesce(qual, '') ILIKE '%user_metadata%'
        OR coalesce(with_check, '') ILIKE '%user_metadata%'
      )
  ) THEN
    RAISE EXCEPTION 'V46 recusada: policy ativa ainda depende de metadata editável.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc proc
    INNER JOIN pg_namespace ns ON ns.oid = proc.pronamespace
    WHERE ns.nspname IN ('public', 'private')
      AND proc.prokind IN ('f', 'p')
      AND pg_get_functiondef(proc.oid) ILIKE '%user_metadata%'
  ) THEN
    RAISE EXCEPTION 'V46 recusada: função ativa ainda depende de metadata editável.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = ANY (ARRAY[
        'admin_all_students',
        'admin_all_professionals',
        'read_students_v9',
        'read_students_v12',
        'read_professionals_v9',
        'read_professionals_v12',
        'appointments_read_all_v15',
        'appointments_staff_all_v15',
        'appointments_specialist_insert_v15',
        'appointments_specialist_update_v15',
        'appointments_specialist_insert_v23',
        'appointments_specialist_update_v23',
        'read_own_vinculo_v18',
        'audit_logs_insert_authenticated',
        'audit_logs_select_admin_or_education_secretary',
        'nutrition_assessments_select',
        'nutrition_assessments_insert',
        'nutrition_assessments_update',
        'nutrition_assessments_delete',
        'nutrition_anthropometry_select',
        'nutrition_anthropometry_insert',
        'nutrition_anthropometry_update',
        'nutrition_anthropometry_delete',
        'nutrition_nae_select',
        'nutrition_nae_insert',
        'nutrition_nae_update',
        'nutrition_nae_delete',
        'nutrition_ean_select',
        'nutrition_ean_insert',
        'nutrition_ean_update',
        'nutrition_ean_delete',
        'nutrition_evolution_select',
        'nutrition_evolution_insert',
        'nutrition_evolution_update',
        'nutrition_evolution_delete'
      ])
  ) THEN
    RAISE EXCEPTION 'V46 recusada: policy permissiva antiga ainda está ativa.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'profiles', 'students', 'schools', 'appointments',
        'support_professionals', 'profissional_aluno_vinculo', 'audit_logs',
        'nutrition_assessments', 'nutrition_anthropometry_history',
        'nutrition_nae', 'nutrition_ean_activities', 'nutrition_evolution'
      ])
      AND (
        lower(regexp_replace(coalesce(qual, ''), '[[:space:]()]', '', 'g')) = 'true'
        OR lower(regexp_replace(coalesce(with_check, ''), '[[:space:]()]', '', 'g')) = 'true'
      )
  ) THEN
    RAISE EXCEPTION 'V46 recusada: policy irrestrita (true) ainda está ativa em tabela protegida.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc proc
    INNER JOIN pg_namespace ns ON ns.oid = proc.pronamespace
    INNER JOIN pg_roles owner_role ON owner_role.oid = proc.proowner
    WHERE (ns.nspname, proc.proname) IN (
      ('private', 'current_profile_role'),
      ('private', 'current_profile_scope'),
      ('private', 'current_profile_school_id'),
      ('private', 'current_profile_specialty'),
      ('private', 'protect_profile_authorization_columns'),
      ('private', 'protect_appointment_assignment_columns'),
      ('public', 'appointments_is_scheduling_staff'),
      ('public', 'appointments_is_admin'),
      ('public', 'support_professionals_can_manage'),
      ('public', 'support_professionals_can_select_inactive_rows'),
      ('public', 'support_professionals_escola_can_write_school'),
      ('public', 'regional_district_cap'),
      ('public', 'appointment_matches_profile_scope'),
      ('public', 'row_matches_regional_school'),
      ('public', 'can_select_student'),
      ('public', 'can_insert_student'),
      ('public', 'can_update_student_clinical')
    )
      AND (
        proc.prosecdef IS NOT TRUE
        OR NOT coalesce(proc.proconfig, ARRAY[]::text[]) @> ARRAY['search_path=pg_catalog']
        OR owner_role.rolname IN ('anon', 'authenticated', 'service_role')
      )
  ) THEN
    RAISE EXCEPTION 'V46 recusada: função SECURITY DEFINER gerenciada sem owner/search_path seguro.';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload config';

COMMIT;

-- Rollback seguro (somente local/homologação): restaure o snapshot transacional
-- capturado imediatamente antes da V46. Não restaure policies baseadas em
-- metadata. Se não houver snapshot, prepare uma migração DOWN revisada que
-- remova apenas objetos *_v46 e restaure as definições server-controlled
-- anteriores; valide-a em cópia descartável antes de qualquer uso remoto.

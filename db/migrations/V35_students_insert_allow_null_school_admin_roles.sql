-- V35 — Permite INSERT de aluno sem school_id para perfis administrativos de rede.
--
-- Contexto:
-- - SECRETARIA_SEDE / SECRETARIA_COCAL precisam abrir cadastro inicial incompleto.
-- - O bloqueio atual em can_insert_student exige p_school_id para perfis regionais.
-- - ESCOLA continua obrigada ao vínculo school_id do próprio perfil.

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
      -- Perfis administrativos com permissão de pré-cadastro sem vínculo escolar obrigatório
      COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN (
        'ADMIN',
        'SECRETARIA_SEDE',
        'SECRETARIA_COCAL',
        'SECRETARIA_EDUCACAO',
        'EDUCATION_SECRETARY'
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND upper(coalesce(p.role::text, '')) IN (
            'ADMIN',
            'SECRETARIA_SEDE',
            'SECRETARIA_COCAL',
            'SECRETARIA_EDUCACAO',
            'EDUCATION_SECRETARY'
          )
      )
      OR (
        COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'COORDENADOR'
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND upper(coalesce(p.role::text, '')) = 'COORDENADOR'
        )
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

NOTIFY pgrst, 'reload config';

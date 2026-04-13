-- V20 — Central de Prontuários: visão restrita para todos os perfis clínicos listados em PERFIS_RESTRITOS
-- (espelho de src/config/perfilRestrito.ts — manter listas sincronizadas).
--
-- Regra: SPECIALIST com specialty em prontuario_especialidades_restritas() só enxerga aluno se EXISTS
-- agendamento com professional_id = auth.uid(), student_id = aluno e status em
-- prontuario_status_agendamento_vinculo() (comparação case-insensitive).
-- Demais SPECIALIST: visão ampla. Admin, secretarias, coordenação, assistente, educação municipal: inalterados.

CREATE OR REPLACE FUNCTION public.prontuario_especialidades_restritas()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT ARRAY[
    'PSICOLOGIA',
    'SERVICO_SOCIAL',
    'PSICOPEDAGOGIA',
    'TERAPIA_OCUPACIONAL',
    'FONOAUDIOLOGIA',
    'FISIOTERAPIA',
    'NUTRICAO'
  ]::text[];
$$;

CREATE OR REPLACE FUNCTION public.prontuario_status_agendamento_vinculo()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT ARRAY[
    'CONFIRMADO',
    'EM_ATENDIMENTO',
    'ATENDIDO',
    'ENCERRADO'
  ]::text[];
$$;

REVOKE ALL ON FUNCTION public.prontuario_especialidades_restritas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prontuario_especialidades_restritas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.prontuario_especialidades_restritas() TO service_role;

REVOKE ALL ON FUNCTION public.prontuario_status_agendamento_vinculo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prontuario_status_agendamento_vinculo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.prontuario_status_agendamento_vinculo() TO service_role;

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
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND COALESCE(pr.is_active, true)
    )
    AND (
      COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN (
        'ADMIN', 'EDUCATION_SECRETARY', 'ASSISTANT',
        'SECRETARIA_SEDE', 'SECRETARIA_COCAL', 'COORDENADOR'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND upper(coalesce(p.role::text, '')) IN (
            'ADMIN', 'EDUCATION_SECRETARY', 'ASSISTANT',
            'SECRETARIA_SEDE', 'SECRETARIA_COCAL', 'COORDENADOR'
          )
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        INNER JOIN public.students s ON s.id = p_student_id
        WHERE p.id = auth.uid()
          AND upper(coalesce(p.role::text, '')) = 'ESCOLA'
          AND p.school_id IS NOT NULL
          AND s.school_id = p.school_id
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND upper(coalesce(p.role::text, '')) = 'SPECIALIST'
          AND upper(trim(coalesce(p.specialty::text, ''))) = ANY (public.prontuario_especialidades_restritas())
          AND EXISTS (
            SELECT 1 FROM public.appointments apt
            WHERE apt.student_id = p_student_id
              AND apt.professional_id = auth.uid()
              AND upper(trim(coalesce(apt.status::text, ''))) = ANY (public.prontuario_status_agendamento_vinculo())
          )
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
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

NOTIFY pgrst, 'reload config';

-- V19 — Vínculo profissional↔aluno apenas via agendamentos (sem vínculo manual em profissional_aluno_vinculo)
--
-- Regra: psicopedagogia / terapia ocupacional enxergam alunos somente se EXISTS linha em public.appointments
-- com professional_id = auth.uid(), student_id = aluno, e status ativo ou histórico útil (exclui cancelado/falta).
-- Colunas canônicas do projeto: student_id (aluno → students.id), professional_id (profissional → auth.users.id).
--
-- Também: remove políticas que permitiam ao especialista criar/editar agendamentos sem ser equipe de recepção.

CREATE INDEX IF NOT EXISTS idx_appointments_professional_student_v19
  ON public.appointments (professional_id, student_id);

COMMENT ON COLUMN public.appointments.student_id IS 'ID do aluno (students.id); vínculo com profissional via agendamento.';
COMMENT ON COLUMN public.appointments.professional_id IS 'ID do profissional (auth.users); definido pela secretaria no agendamento.';

-- Função usada na política SELECT de students (substitui uso de profissional_aluno_vinculo para PP/TO).
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
          AND coalesce(p.specialty::text, '') IN ('PSICOPEDAGOGIA', 'TERAPIA_OCUPACIONAL')
          AND EXISTS (
            SELECT 1 FROM public.appointments apt
            WHERE apt.student_id = p_student_id
              AND apt.professional_id = auth.uid()
              AND COALESCE(apt.status::text, '') NOT IN ('CANCELADO', 'FALTOU')
          )
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND upper(coalesce(p.role::text, '')) = 'SPECIALIST'
          AND coalesce(p.specialty::text, '') NOT IN ('PSICOPEDAGOGIA', 'TERAPIA_OCUPACIONAL')
      )
    );
$$;

REVOKE ALL ON FUNCTION public.can_select_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_select_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_select_student(uuid) TO service_role;

-- Especialista não grava mais vínculo manualmente.
DROP POLICY IF EXISTS "insert_own_vinculo_v18" ON public.profissional_aluno_vinculo;
DROP POLICY IF EXISTS "update_own_vinculo_v18" ON public.profissional_aluno_vinculo;

-- Especialista não cria/edita agendamento fora do fluxo da secretaria.
DROP POLICY IF EXISTS "appointments_specialist_insert_v15" ON public.appointments;
DROP POLICY IF EXISTS "appointments_specialist_update_v15" ON public.appointments;

NOTIFY pgrst, 'reload config';

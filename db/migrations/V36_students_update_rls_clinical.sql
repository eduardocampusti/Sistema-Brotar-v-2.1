-- V36 — Correção cirúrgica de RLS de escrita (UPDATE) para profissionais clínicos (SPECIALIST)
--
-- Contexto:
-- - Perfis SPECIALIST restritos (ex.: PSICOPEDAGOGIA) passavam no SELECT (can_select_student)
--   mas falhavam no WITH CHECK da política de UPDATE (update_students_v26_scoped) ao salvar anamnese.
-- - Criamos can_update_student_clinical(id) mapeando as permissões exatas de edição de aluno.
-- - Perfis administrativos (ADMIN, COORDENADOR, SECRETARIA_SEDE, SECRETARIA_COCAL, EDUCATION_SECRETARY, SECRETARIA_EDUCACAO, ASSISTANT) possuem acesso irrestrito.
-- - Perfis ESCOLA podem atualizar alunos da sua própria unidade escolar.
-- - Perfis SPECIALIST não-restritos possuem acesso irrestrito.
-- - Perfis SPECIALIST restritos precisam de agendamento ativo e não excluído para atualizar o aluno.

CREATE OR REPLACE FUNCTION public.can_update_student_clinical(p_student_id uuid)
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
      -- 1. Perfis administrativos com retorno TRUE direto
      COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN (
        'ADMIN',
        'COORDENADOR',
        'SECRETARIA_SEDE',
        'SECRETARIA_COCAL',
        'EDUCATION_SECRETARY',
        'SECRETARIA_EDUCACAO',
        'ASSISTANT'
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND upper(coalesce(p.role::text, '')) IN (
            'ADMIN',
            'COORDENADOR',
            'SECRETARIA_SEDE',
            'SECRETARIA_COCAL',
            'EDUCATION_SECRETARY',
            'SECRETARIA_EDUCACAO',
            'ASSISTANT'
          )
      )
      -- 2. Perfil ESCOLA: permite UPDATE se school_id do aluno = school_id do perfil
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.students s ON s.id = p_student_id
        WHERE p.id = auth.uid()
          AND upper(coalesce(p.role::text, '')) = 'ESCOLA'
          AND p.school_id IS NOT NULL
          AND s.school_id = p.school_id
      )
      -- 3. Perfil SPECIALIST restrito: exige agendamento ativo e não excluído
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
      -- 4. Perfil SPECIALIST não-restrito: permite UPDATE sem restrição
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

-- Permissões da nova função
REVOKE ALL ON FUNCTION public.can_update_student_clinical(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_update_student_clinical(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_update_student_clinical(uuid) TO service_role;

-- Substituir a política FOR UPDATE antiga pela nova
DROP POLICY IF EXISTS "update_students_v26_scoped" ON public.students;

CREATE POLICY "update_students_v36_scoped"
ON public.students
FOR UPDATE
TO authenticated
USING (public.can_update_student_clinical(id))
WITH CHECK (public.can_update_student_clinical(id));

-- Recarregar configurações da API PostgREST
NOTIFY pgrst, 'reload config';

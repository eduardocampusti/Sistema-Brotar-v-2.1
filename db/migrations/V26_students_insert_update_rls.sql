-- V26 — RLS de escrita em `students` para perfis que já podem ler (ESCOLA, secretarias, etc.)
--
-- Contexto: a partir da V18 existe apenas SELECT escopado (`read_students_v18_profile_scope`) +
-- `admin_all_students` (FOR ALL só para ADMIN via JWT). Usuários ESCOLA e demais perfis
-- autenticados conseguiam listar/ver alunos, mas INSERT/UPDATE (ex.: upsert no saveStudent)
-- falhavam com: "new row violates row-level security policy for table students".
--
-- Solução: políticas FOR INSERT e FOR UPDATE espelhando a mesma matriz de acesso de
-- `can_select_student(uuid)`; INSERT usa `can_insert_student(uuid)` porque ainda não há linha.

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
        WHERE p.id = auth.uid()
          AND upper(coalesce(p.role::text, '')) = 'ESCOLA'
          AND p.school_id IS NOT NULL
          AND p.school_id IS NOT DISTINCT FROM p_school_id
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

REVOKE ALL ON FUNCTION public.can_insert_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_insert_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_insert_student(uuid) TO service_role;

DROP POLICY IF EXISTS "insert_students_v26_scoped" ON public.students;
CREATE POLICY "insert_students_v26_scoped"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (public.can_insert_student(school_id));

DROP POLICY IF EXISTS "update_students_v26_scoped" ON public.students;
CREATE POLICY "update_students_v26_scoped"
ON public.students
FOR UPDATE
TO authenticated
USING (public.can_select_student(id))
WITH CHECK (public.can_select_student(id));

NOTIFY pgrst, 'reload config';

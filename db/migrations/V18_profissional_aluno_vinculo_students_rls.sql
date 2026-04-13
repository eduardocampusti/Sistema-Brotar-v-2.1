-- V18 — Vínculo profissional–aluno + RLS em students para psicopedagogia / terapia ocupacional
--
-- Contexto: especialistas em PSICOPEDAGOGIA e TERAPIA_OCUPACIONAL não devem listar toda a rede (LGPD).
-- Tabela física de alunos no projeto: public.students (FK aluno_id aponta para students.id).
--
-- Perfis com SELECT amplo: ADMIN, EDUCATION_SECRETARY (coordenação municipal), ASSISTANT, SECRETARIA_*.
-- ESCOLA: apenas alunos da própria escola (school_id do perfil).
-- SPECIALIST + (PSICOPEDAGOGIA | TERAPIA_OCUPACIONAL): apenas alunos com vínculo ativo em profissional_aluno_vinculo.
-- Demais SPECIALIST: mantém visão ampla (comportamento anterior).

CREATE TABLE IF NOT EXISTS public.profissional_aluno_vinculo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  ativo boolean NOT NULL DEFAULT true,
  CONSTRAINT profissional_aluno_vinculo_unique UNIQUE (profissional_id, aluno_id)
);

CREATE INDEX IF NOT EXISTS idx_profissional_aluno_vinculo_prof
  ON public.profissional_aluno_vinculo (profissional_id)
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_profissional_aluno_vinculo_aluno
  ON public.profissional_aluno_vinculo (aluno_id)
  WHERE ativo = true;

ALTER TABLE public.profissional_aluno_vinculo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_vinculo_v18" ON public.profissional_aluno_vinculo;
CREATE POLICY "read_own_vinculo_v18"
ON public.profissional_aluno_vinculo
FOR SELECT
TO authenticated
USING (
  profissional_id = auth.uid()
  OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'ADMIN'
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND upper(coalesce(p.role::text, '')) = 'ADMIN'
  )
);

DROP POLICY IF EXISTS "insert_own_vinculo_v18" ON public.profissional_aluno_vinculo;
CREATE POLICY "insert_own_vinculo_v18"
ON public.profissional_aluno_vinculo
FOR INSERT
TO authenticated
WITH CHECK (profissional_id = auth.uid());

DROP POLICY IF EXISTS "update_own_vinculo_v18" ON public.profissional_aluno_vinculo;
CREATE POLICY "update_own_vinculo_v18"
ON public.profissional_aluno_vinculo
FOR UPDATE
TO authenticated
USING (profissional_id = auth.uid())
WITH CHECK (profissional_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.profissional_aluno_vinculo TO authenticated;
GRANT ALL ON public.profissional_aluno_vinculo TO service_role;

-- Função usada na política SELECT de students (SECURITY DEFINER para leitura estável de profiles).
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
      -- Papéis amplos (JWT ou perfil)
      COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN (
        'ADMIN', 'EDUCATION_SECRETARY', 'ASSISTANT',
        'SECRETARIA_SEDE', 'SECRETARIA_COCAL'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND upper(coalesce(p.role::text, '')) IN (
            'ADMIN', 'EDUCATION_SECRETARY', 'ASSISTANT',
            'SECRETARIA_SEDE', 'SECRETARIA_COCAL'
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
            SELECT 1 FROM public.profissional_aluno_vinculo v
            WHERE v.profissional_id = auth.uid()
              AND v.aluno_id = p_student_id
              AND COALESCE(v.ativo, true)
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

DROP POLICY IF EXISTS "read_students_v12" ON public.students;
DROP POLICY IF EXISTS "read_students_v9" ON public.students;
DROP POLICY IF EXISTS "read_students_v18_profile_scope" ON public.students;

CREATE POLICY "read_students_v18_profile_scope"
ON public.students
FOR SELECT
TO authenticated
USING (public.can_select_student(id));

NOTIFY pgrst, 'reload config';

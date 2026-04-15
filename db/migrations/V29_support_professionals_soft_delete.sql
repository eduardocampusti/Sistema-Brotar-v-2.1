/*------------------------------------------------------------------------
  V29 - Profissionais de apoio: exclusao logica (status + unlinked_at) e RLS de leitura por status
  Execute este arquivo inteiro no SQL Editor (comentarios sao ignorados).
------------------------------------------------------------------------*/
--
-- Regras:
--   - Coluna status default 'ativo'; valores: 'ativo', 'desativado'.
--   - unlinked_at: data/hora do desvinculamento (soft delete).
--   - SELECT: perfis comuns so enxergam linhas ativas; ADMIN e EDUCATION_SECRETARY enxergam todas
--     (alinhamento regional de V27 via row_matches_regional_school).
--   - INSERT/UPDATE: mesma gestao regional de V27; sem politica DELETE para authenticated.

ALTER TABLE public.support_professionals
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS unlinked_at timestamptz NULL;

ALTER TABLE public.support_professionals
  DROP CONSTRAINT IF EXISTS support_professionals_status_check;

ALTER TABLE public.support_professionals
  ADD CONSTRAINT support_professionals_status_check
  CHECK (status = ANY (ARRAY['ativo'::text, 'desativado'::text]));

COMMENT ON COLUMN public.support_professionals.status IS 'ativo | desativado (exclusão lógica)';
COMMENT ON COLUMN public.support_professionals.unlinked_at IS 'Momento em que o profissional foi desativado/desvinculado';

CREATE OR REPLACE FUNCTION public.support_professionals_can_select_inactive_rows()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('ADMIN', 'EDUCATION_SECRETARY')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND upper(coalesce(p.role::text, '')) IN ('ADMIN', 'EDUCATION_SECRETARY')
    );
$$;

REVOKE ALL ON FUNCTION public.support_professionals_can_select_inactive_rows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.support_professionals_can_select_inactive_rows() TO authenticated;
GRANT EXECUTE ON FUNCTION public.support_professionals_can_select_inactive_rows() TO service_role;

-- Leitura: regional (V27) + apenas ativos para perfis comuns
DROP POLICY IF EXISTS "read_support_professionals_v27" ON public.support_professionals;

CREATE POLICY "read_support_professionals_v29"
ON public.support_professionals
FOR SELECT
TO authenticated
USING (
  public.row_matches_regional_school(school_id)
  AND (
    COALESCE(NULLIF(trim(status), ''), 'ativo') = 'ativo'
    OR public.support_professionals_can_select_inactive_rows()
  )
);

-- Substitui FOR ALL por INSERT/UPDATE (sem política de DELETE → negado para authenticated)
DROP POLICY IF EXISTS "manage_professionals_staff_v27" ON public.support_professionals;

CREATE POLICY "insert_support_professionals_staff_v29"
ON public.support_professionals
FOR INSERT
TO authenticated
WITH CHECK (
  public.support_professionals_can_manage()
  AND public.row_matches_regional_school(school_id)
);

CREATE POLICY "update_support_professionals_staff_v29"
ON public.support_professionals
FOR UPDATE
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

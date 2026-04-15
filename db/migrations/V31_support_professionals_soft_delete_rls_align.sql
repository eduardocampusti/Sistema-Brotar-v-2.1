/*------------------------------------------------------------------------
  V31 - Profissionais de apoio: alinhar leitura de inativos e bloquear
        soft delete via politica ESCOLA (UPDATE).

  - SELECT de linhas desativadas: mesmos perfis de gestao que podem
    desvincular (ADMIN, ASSISTANT, SECRETARIA_SEDE, SECRETARIA_COCAL,
    EDUCATION_SECRETARY) — alinhado ao frontend types.ts.
  - UPDATE pela politica escola (V30): mantem edicao da ficha, mas impede
    status = 'desativado' e impede definir unlinked_at (soft delete so
    via politica staff V29).
------------------------------------------------------------------------*/

CREATE OR REPLACE FUNCTION public.support_professionals_can_select_inactive_rows()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN (
      'ADMIN',
      'ASSISTANT',
      'SECRETARIA_SEDE',
      'SECRETARIA_COCAL',
      'EDUCATION_SECRETARY'
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

REVOKE ALL ON FUNCTION public.support_professionals_can_select_inactive_rows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.support_professionals_can_select_inactive_rows() TO authenticated;
GRANT EXECUTE ON FUNCTION public.support_professionals_can_select_inactive_rows() TO service_role;

DROP POLICY IF EXISTS "update_support_professionals_escola_v30" ON public.support_professionals;

CREATE POLICY "update_support_professionals_escola_v31"
ON public.support_professionals
FOR UPDATE
TO authenticated
USING (
  public.support_professionals_escola_can_write_school(school_id)
  AND public.row_matches_regional_school(school_id)
)
WITH CHECK (
  public.support_professionals_escola_can_write_school(school_id)
  AND public.row_matches_regional_school(school_id)
  AND coalesce(nullif(trim(status), ''), 'ativo') = 'ativo'
  AND unlinked_at IS NULL
);

NOTIFY pgrst, 'reload config';

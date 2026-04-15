/*------------------------------------------------------------------------
  V30 - Profissionais de apoio: perfil ESCOLA pode INSERT/UPDATE na propria escola
  Execute no SQL Editor do Supabase apos V29.

  Contexto: V29 manteve insert/update apenas para support_professionals_can_manage()
  (ADMIN, ASSISTANT, secretarias, EDUCATION_SECRETARY). O app ja permite que ESCOLA
  edite a ficha; o upsert falhava com 403 / "new row violates row-level security policy".
------------------------------------------------------------------------*/

CREATE OR REPLACE FUNCTION public.support_professionals_escola_can_write_school(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND upper(coalesce(p.role::text, '')) = 'ESCOLA'
      AND p.school_id IS NOT NULL
      AND p.school_id IS NOT DISTINCT FROM p_school_id
  );
$$;

REVOKE ALL ON FUNCTION public.support_professionals_escola_can_write_school(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.support_professionals_escola_can_write_school(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.support_professionals_escola_can_write_school(uuid) TO service_role;

-- INSERT: escola so grava linha cuja school_id e a do perfil (e escopo regional V27)
CREATE POLICY "insert_support_professionals_escola_v30"
ON public.support_professionals
FOR INSERT
TO authenticated
WITH CHECK (
  public.support_professionals_escola_can_write_school(school_id)
  AND public.row_matches_regional_school(school_id)
);

-- UPDATE: escola altera apenas profissionais da propria unidade; nao pode "mover" para outra escola
CREATE POLICY "update_support_professionals_escola_v30"
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
);

NOTIFY pgrst, 'reload config';

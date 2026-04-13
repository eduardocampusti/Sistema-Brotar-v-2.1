-- V17: libera troca obrigatória de senha mesmo com RLS restritivo em profiles.
-- O cliente anon não consegue UPDATE + SELECT na linha; esta função roda como definer
-- e só altera a própria linha (id = auth.uid()).

CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET must_change_password = false
  WHERE id = auth.uid();

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END;
$$;

COMMENT ON FUNCTION public.clear_must_change_password() IS
  'Zera must_change_password para o usuário autenticado (id = auth.uid()). Usado após troca de senha obrigatória.';

REVOKE ALL ON FUNCTION public.clear_must_change_password() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;

-- V16 — Profissionais de apoio: escrita para equipe de cadastro/recepção (não só ADMIN)
--
-- Contexto: V12 deixou INSERT/UPDATE/DELETE em support_professionals apenas para JWT role = ADMIN.
-- Perfis ASSISTANT / SECRETARIA_* / EDUCATION_SECRETARY conseguem ler (read_professionals_v12) mas
-- falham no upsert → 42501 / HTTP 403. O app tratava isso como "vinculado a outra unidade" (mensagem incorreta).
--
-- Estratégia (alinhada a V15 appointments):
--   - Função SECURITY DEFINER que aceita role no JWT OU em public.profiles (evita JWT desatualizado).
--   - Política FOR ALL para quem passar na função; mantém read_professionals_v12 (SELECT true) para demais papéis.

DROP POLICY IF EXISTS "admin_all_professionals" ON public.support_professionals;

CREATE OR REPLACE FUNCTION public.support_professionals_can_manage()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role') IN (
        'ADMIN',
        'ASSISTANT',
        'SECRETARIA_SEDE',
        'SECRETARIA_COCAL',
        'EDUCATION_SECRETARY'
      ),
      false
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

REVOKE ALL ON FUNCTION public.support_professionals_can_manage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.support_professionals_can_manage() TO authenticated;

CREATE POLICY "manage_professionals_staff_v16"
ON public.support_professionals
FOR ALL
TO authenticated
USING (public.support_professionals_can_manage())
WITH CHECK (public.support_professionals_can_manage());

-- ---------------------------------------------------------------------------
-- Storage (bucket student-documents, pasta support_professional/)
-- Se o console mostrar 403 ao enviar anexo, aplique também no SQL Editor do Supabase
-- (ajuste nomes se já existirem políticas equivalentes no projeto):
--
-- CREATE POLICY "storage_support_prof_insert_v16"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (
--   bucket_id = 'student-documents'
--   AND (storage.foldername(name))[1] = 'support_professional'
--   AND public.support_professionals_can_manage()
-- );
--
-- CREATE POLICY "storage_support_prof_update_v16"
-- ON storage.objects FOR UPDATE TO authenticated
-- USING (
--   bucket_id = 'student-documents'
--   AND (storage.foldername(name))[1] = 'support_professional'
--   AND public.support_professionals_can_manage()
-- )
-- WITH CHECK (
--   bucket_id = 'student-documents'
--   AND (storage.foldername(name))[1] = 'support_professional'
--   AND public.support_professionals_can_manage()
-- );
-- ---------------------------------------------------------------------------

NOTIFY pgrst, 'reload config';

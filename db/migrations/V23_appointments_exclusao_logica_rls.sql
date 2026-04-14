-- V23 — Exclusão lógica em `public.appointments` + RLS (somente admin pode marcar excluído)
--
-- Colunas de auditoria; listagens operacionais filtram excluido = false no app e, para não-admin, via RLS.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS excluido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS excluido_em timestamptz,
  ADD COLUMN IF NOT EXISTS excluido_por uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motivo_exclusao text,
  ADD COLUMN IF NOT EXISTS excluido_papel text;

COMMENT ON COLUMN public.appointments.excluido IS 'Exclusão lógica: oculto das listagens quando true.';
COMMENT ON COLUMN public.appointments.excluido_em IS 'Momento da exclusão lógica.';
COMMENT ON COLUMN public.appointments.excluido_por IS 'Usuário (auth.users) que excluiu.';
COMMENT ON COLUMN public.appointments.motivo_exclusao IS 'Motivo opcional informado na exclusão.';
COMMENT ON COLUMN public.appointments.excluido_papel IS 'Papel do perfil no momento da exclusão lógica (ex.: ADMIN).';

CREATE OR REPLACE FUNCTION public.appointments_is_admin ()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    upper(trim(coalesce(auth.jwt() -> 'user_metadata' ->> 'role', ''))) = 'ADMIN',
    false
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND upper(coalesce(p.role::text, '')) = 'ADMIN'
  );
$$;

REVOKE ALL ON FUNCTION public.appointments_is_admin () FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.appointments_is_admin () TO authenticated;

-- SELECT: atendimentos ativos para todos; admin continua podendo ler excluídos (relatórios futuros).
DROP POLICY IF EXISTS appointments_read_all_v15 ON public.appointments;

CREATE POLICY appointments_select_active_or_admin_v23 ON public.appointments FOR SELECT TO authenticated USING (
  NOT COALESCE(excluido, false)
  OR public.appointments_is_admin ()
);

-- Equipe de agenda: remove FOR ALL (incluía DELETE físico). INSERT/UPDATE com bloqueio de exclusão lógica para não-admin.
DROP POLICY IF EXISTS appointments_staff_all_v15 ON public.appointments;

CREATE POLICY appointments_staff_insert_v23 ON public.appointments FOR INSERT TO authenticated
WITH CHECK (
  public.appointments_is_scheduling_staff ()
  AND (
    public.appointments_is_admin ()
    OR NOT COALESCE(excluido, false)
  )
);

CREATE POLICY appointments_staff_update_v23 ON public.appointments FOR UPDATE TO authenticated USING (
  public.appointments_is_scheduling_staff ()
  AND (
    NOT COALESCE(excluido, false)
    OR public.appointments_is_admin ()
  )
)
WITH CHECK (
  public.appointments_is_scheduling_staff ()
  AND (
    public.appointments_is_admin ()
    OR NOT COALESCE(excluido, false)
  )
);

-- Especialista: não pode marcar excluído nem alterar linha já excluída.
DROP POLICY IF EXISTS appointments_specialist_insert_v15 ON public.appointments;
DROP POLICY IF EXISTS appointments_specialist_update_v15 ON public.appointments;

CREATE POLICY appointments_specialist_insert_v23 ON public.appointments FOR INSERT TO authenticated
WITH CHECK (
  NOT public.appointments_is_scheduling_staff ()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text = 'SPECIALIST'
      AND p.specialty IS NOT NULL
      AND p.specialty::text = appointments.specialty::text
  )
  AND NOT COALESCE(excluido, false)
);

CREATE POLICY appointments_specialist_update_v23 ON public.appointments FOR UPDATE TO authenticated USING (
  NOT public.appointments_is_scheduling_staff ()
  AND NOT COALESCE(excluido, false)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text = 'SPECIALIST'
      AND p.specialty IS NOT NULL
      AND p.specialty::text = appointments.specialty::text
  )
)
WITH CHECK (
  NOT public.appointments_is_scheduling_staff ()
  AND NOT COALESCE(excluido, false)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text = 'SPECIALIST'
      AND p.specialty IS NOT NULL
      AND p.specialty::text = appointments.specialty::text
  )
);

-- Sem política de DELETE para authenticated => DELETE físico negado pelo RLS (exceto service_role).

NOTIFY pgrst, 'reload config';

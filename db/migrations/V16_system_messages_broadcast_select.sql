-- V16 - SELECT em system_messages para avisos broadcast (recipient_id nulo)
--
-- Contexto: getNotificationsInbox usa .or('recipient_id.eq.<user>,recipient_id.is.null').
-- Políticas legadas (ex.: messages_select_policy_v2) exigem auth.uid() = recipient_id,
-- o que exclui linhas com recipient_id IS NULL para todos os usuários.
--
-- Solução: política permissiva ADICIONAL (o Postgres OR entre políticas SELECT do mesmo papel).

DROP POLICY IF EXISTS "system_messages_select_broadcast_v16" ON public.system_messages;

CREATE POLICY "system_messages_select_broadcast_v16"
ON public.system_messages
FOR SELECT
TO authenticated
USING (
    recipient_id IS NULL
    AND (
        is_read = false
        OR (read_at IS NOT NULL AND read_at > (now() - interval '5 minutes'))
        OR (coalesce(type, 'ALERT') = 'ALERT')
    )
);

NOTIFY pgrst, 'reload config';

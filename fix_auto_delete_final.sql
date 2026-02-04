-- SCRIPT FINAL: UNIFICAÇÃO DE POLÍTICAS E AUTO-EXCLUSÃO (5 MINUTOS)
-- Este script resolve o problema das mensagens que não somem após serem lidas.

-- 1. Limpeza total de políticas legadas para evitar conflitos (OR logic do Postgres)
DROP POLICY IF EXISTS "Users can read their own messages" ON system_messages;
DROP POLICY IF EXISTS "message_select_policy" ON system_messages;
DROP POLICY IF EXISTS "messages_select_policy" ON public.system_messages;
DROP POLICY IF EXISTS "Visualizar Mensagens" ON public.system_messages;
DROP POLICY IF EXISTS "Recipients can delete their messages" ON system_messages;
DROP POLICY IF EXISTS "Senders can delete their messages" ON system_messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON public.system_messages;
DROP POLICY IF EXISTS "messages_update_policy" ON public.system_messages;
DROP POLICY IF EXISTS "Recipients can mark as read" ON system_messages;

-- 2. Garantir coluna read_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_messages' AND column_name = 'read_at') THEN
        ALTER TABLE system_messages ADD COLUMN read_at timestamp with time zone;
    END IF;
END $$;

-- 3. Nova Política de Visualização (SELECT)
-- Regra de Ouro: Só vê se for dono/destinatário E (não lida OU lida há menos de 5 min)
CREATE POLICY "messages_select_policy_v2" ON public.system_messages 
FOR SELECT USING (
    (auth.uid() = recipient_id OR auth.uid() = sender_id)
    AND (
        is_read = false 
        OR (read_at IS NOT NULL AND read_at > (now() - interval '5 minutes'))
        OR (type = 'ALERT') -- Alertas gerais não somem por tempo, apenas se o usuário deletar
    )
);

-- 4. Nova Política de Atualização (UPDATE)
-- Permite que o destinatário marque como lida
CREATE POLICY "messages_update_policy_v2" ON public.system_messages 
FOR UPDATE USING (auth.uid() = recipient_id);

-- 5. Nova Política de Exclusão (DELETE)
-- Permite que remetente ou destinatário deletem fisicamente
CREATE POLICY "messages_delete_policy_v2" ON public.system_messages 
FOR DELETE USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

-- 6. Trigger Robusto para read_at
CREATE OR REPLACE FUNCTION public.mark_message_read_at_final()
RETURNS TRIGGER AS $$
BEGIN
    -- Se is_read mudou para true, seta read_at
    IF (NEW.is_read = true AND (OLD.is_read = false OR OLD.is_read IS NULL)) THEN
        NEW.read_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mark_read_at ON system_messages;
CREATE TRIGGER trigger_mark_read_at
    BEFORE UPDATE ON system_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.mark_message_read_at_final();

-- 7. Correção de Dados Existentes
-- Para mensagens já lidas mas sem data, colocamos a data de criação para que expirem logo
UPDATE system_messages 
SET read_at = created_at 
WHERE is_read = true AND read_at IS NULL;

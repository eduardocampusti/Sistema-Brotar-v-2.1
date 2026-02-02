-- SCRIPT V3: CORREÇÃO DE EXPIRAÇÃO DE AVISOS (5 MINUTOS)
-- Objetivo: Garantir que mensagens lidas sejam ocultadas após 5 minutos.

-- 1. Limpar políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "messages_select_policy" ON public.system_messages;
DROP POLICY IF EXISTS "Visualizar Mensagens" ON public.system_messages;

-- 2. Criar a nova política de visibilidade restrita
-- Permite ver se:
--   - É o remetente ou destinatário
--   - AND (Ainda não foi lida OU (foi lida e o tempo de expiração de 5 min ainda não passou))
CREATE POLICY "messages_select_policy" ON public.system_messages 
FOR SELECT USING (
    (auth.uid() = recipient_id OR auth.uid() = sender_id)
    AND 
    (is_read = false OR (read_at IS NOT NULL AND read_at > (now() - interval '5 minutes')))
);

-- 3. Atualizar mensagens órfãs (lidas mas sem read_at) 
-- Isso permite que elas sejam ocultadas pela nova política
UPDATE public.system_messages 
SET read_at = created_at 
WHERE is_read = true AND read_at IS NULL;

-- 4. Reforçar o Trigger para preencher read_at sempre
CREATE OR REPLACE FUNCTION public.mark_message_read_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Se está marcando como lido AGORA, ou se já está lido mas falta o timestamp
    IF (NEW.is_read = true AND (OLD.is_read = false OR OLD.is_read IS NULL)) OR (NEW.is_read = true AND NEW.read_at IS NULL) THEN
        NEW.read_at = COALESCE(NEW.read_at, now());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Recarregar cache de políticas
-- NOTIFY pgrst, 'reload config';

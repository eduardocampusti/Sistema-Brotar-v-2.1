-- CORREÇÃO DE MENSAGENS (VERSÃO V5 - AUTODELETE 5 MINUTOS)
-- Objetivo: Sigilo total e remoção automática após 5 minutos de leitura.

-- 1. Recriar a tabela com colunas de controle de tempo
DROP TABLE IF EXISTS public.system_messages CASCADE;

CREATE TABLE public.system_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid NOT NULL,
    recipient_id uuid,
    title text NOT NULL,
    content text NOT NULL,
    priority text DEFAULT 'normal',
    is_read boolean DEFAULT false,
    read_at timestamp with time zone, -- Momento exato em que foi lida
    created_at timestamp with time zone DEFAULT now(),

    CONSTRAINT fk_sender FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_recipient FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 2. Habilitar RLS
ALTER TABLE public.system_messages ENABLE ROW LEVEL SECURITY;

-- 3. Função e Trigger para marcar read_at automaticamente
CREATE OR REPLACE FUNCTION public.mark_message_read_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = true AND (OLD.is_read = false OR OLD.is_read IS NULL) THEN
        NEW.read_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mark_read_at
    BEFORE UPDATE ON public.system_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.mark_message_read_at();

-- 4. Políticas de Sigilo Estrito + Expiração (5 minutos)

-- SELECT: Apenas remetente/destinatário E esconde se já expirou (5 min)
CREATE POLICY "messages_select_policy" ON public.system_messages 
FOR SELECT USING (
    (auth.uid() = recipient_id OR auth.uid() = sender_id)
    AND 
    (read_at IS NULL OR read_at > (now() - interval '5 minutes'))
);

CREATE POLICY "messages_insert_policy" ON public.system_messages 
FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_update_policy" ON public.system_messages 
FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "messages_delete_policy" ON public.system_messages 
FOR DELETE USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

-- 5. Permissões
GRANT ALL ON public.system_messages TO authenticated;
GRANT ALL ON public.system_messages TO service_role;

-- 6. Recarregar Schema
NOTIFY pgrst, 'reload config';

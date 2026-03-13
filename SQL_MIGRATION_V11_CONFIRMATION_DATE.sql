-- ADICIONAR COLUNA DE DATA DE CONFIRMAÇÃO
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS confirmado_em timestamp with time zone;

-- COMENTÁRIO PARA DOCUMENTAÇÃO
COMMENT ON COLUMN public.appointments.confirmado_em IS 'Data e hora em que o responsável confirmou ou cancelou o agendamento via WhatsApp.';

-- RECARREGAR CONFIGURAÇÃO DO POSTGREST
NOTIFY pgrst, 'reload config';

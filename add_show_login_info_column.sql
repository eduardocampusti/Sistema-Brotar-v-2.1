-- Adiciona suporte para mostrar/ocultar informações de login
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS show_login_info BOOLEAN DEFAULT TRUE;

-- Atualiza o schema cache do Supabase
NOTIFY pgrst, 'reload config';

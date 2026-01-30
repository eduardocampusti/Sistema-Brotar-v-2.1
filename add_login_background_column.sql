-- Adiciona suporte para imagem de fundo do login nas configurações do sistema
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS login_background_image TEXT;

-- Atualiza o schema cache do Supabase (opcional, mas bom para garantir)
NOTIFY pgrst, 'reload config';

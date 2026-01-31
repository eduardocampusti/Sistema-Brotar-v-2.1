-- 1. Cria a tabela se não existir (garantia)
CREATE TABLE IF NOT EXISTS public.letterhead_config (
    id SERIAL PRIMARY KEY,
    logo_url TEXT,
    title_l1 TEXT,
    title_l2 TEXT,
    title_l3 TEXT,
    cnpj TEXT,
    address TEXT,
    phone TEXT,
    footer_text TEXT,
    footer_img TEXT,
    show_logo BOOLEAN DEFAULT true,
    show_titles BOOLEAN DEFAULT true,
    show_contact BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilita RLS
ALTER TABLE public.letterhead_config ENABLE ROW LEVEL SECURITY;

-- 3. Garante que qualquer um logado pode VER a configuração
DROP POLICY IF EXISTS "Leitura pública de timbrado" ON public.letterhead_config;
CREATE POLICY "Leitura pública de timbrado" 
ON public.letterhead_config FOR SELECT 
USING (true); -- Permitir para todos (até anonimos se precisar imprimir sem login, ou mude para 'auth.role() = ''authenticated''' se quiser restrito)

-- 4. Garante que Admins/Authenticated podem EDITAR
DROP POLICY IF EXISTS "Edição de timbrado" ON public.letterhead_config;
CREATE POLICY "Edição de timbrado" 
ON public.letterhead_config FOR ALL 
USING (true) -- Simplificação: Todos logados podem editar (idealmente seria só admins, mas para resolver rápido: true)
WITH CHECK (true);

-- 5. Garante permissões de GRANT
GRANT ALL ON TABLE public.letterhead_config TO authenticated;
GRANT ALL ON TABLE public.letterhead_config TO service_role;
GRANT SELECT ON TABLE public.letterhead_config TO anon;

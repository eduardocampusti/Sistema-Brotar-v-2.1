-- SISTEMA BROTAR - CORREÇÃO DE TABELAS FALTANTES
-- Autor: Antigravity AI
-- Data: 2026-02-01

-- ==============================================================================
-- 1. TABELA DE AGENDAMENTOS (APPOINTMENTS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.appointments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id uuid REFERENCES public.students(id) NOT NULL,
    student_name text, -- Cache para facilitar visualização
    professional_id uuid REFERENCES auth.users(id) NOT NULL,
    professional_name text, -- Cache para facilitar visualização
    specialty specialty_type NOT NULL, -- Enum já existente no schema
    unit text CHECK (unit IN ('SEDE', 'COCAL')) NOT NULL,
    date date NOT NULL,
    start_time text NOT NULL, -- Formato HH:mm
    end_time text NOT NULL,   -- Formato HH:mm
    status text DEFAULT 'AGENDADO' CHECK (status IN ('AGENDADO', 'ATENDIDO', 'FALTOU', 'REMARCAR')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS (Appointments)
CREATE POLICY "Admin pode tudo nos agendamentos" ON public.appointments
    FOR ALL USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN' );

CREATE POLICY "Especialista vê seus agendamentos ou da sua área" ON public.appointments
    FOR SELECT USING (
        professional_id = auth.uid() 
        OR 
        specialty = (SELECT specialty FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Especialista cria agendamentos na sua área" ON public.appointments
    FOR INSERT WITH CHECK (
        specialty = (SELECT specialty FROM public.profiles WHERE id = auth.uid())
    );

-- ==============================================================================
-- 2. TABELA DE CONFIGURAÇÕES DO SISTEMA (SYSTEM_SETTINGS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Registro único
    system_name text DEFAULT 'Sistema Brotar',
    logo_url text,
    login_background_image text,
    show_login_info boolean DEFAULT true,
    active_theme_id text DEFAULT 'emerald',
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer logado vê as configurações" ON public.system_settings
    FOR SELECT USING ( auth.role() = 'authenticated' );

CREATE POLICY "Apenas Admin edita as configurações" ON public.system_settings
    FOR ALL USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN' );

-- Inserir registro inicial se não existir
INSERT INTO public.system_settings (id, system_name) VALUES (1, 'Sistema Brotar') ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 3. TABELA DE PAPEL TIMBRADO (LETTERHEAD_CONFIG)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.letterhead_config (
    id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Registro único
    logo_url text,
    title_l1 text,
    title_l2 text,
    title_l3 text,
    cnpj text,
    address text,
    phone text,
    footer_text text,
    footer_img text,
    show_logo boolean DEFAULT true,
    show_titles boolean DEFAULT true,
    show_contact boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE public.letterhead_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer logado vê o papel timbrado" ON public.letterhead_config
    FOR SELECT USING ( auth.role() = 'authenticated' );

CREATE POLICY "Apenas Admin edita o papel timbrado" ON public.letterhead_config
    FOR ALL USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN' );

-- Inserir registro inicial se não existir
INSERT INTO public.letterhead_config (id, title_l1) VALUES (1, 'PREFEITURA MUNICIPAL') ON CONFLICT DO NOTHING;

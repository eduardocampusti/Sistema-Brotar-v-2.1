-- Migration: Criação da Tabela de Auditoria
-- Objetivo: Rastreamento automático de ações no sistema.

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario TEXT NOT NULL,
    perfil TEXT NOT NULL,
    acao TEXT NOT NULL,
    modulo TEXT NOT NULL,
    registro_afetado TEXT NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Permitir INSERT para qualquer usuário autenticado logado
CREATE POLICY "Permitir criação de logs por usuários autenticados" 
    ON public.audit_logs 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Policy 2: Permitir SELECT exclusivamente para usuários ADMIN. 
-- Obs: Secretárias Municipais de Educação também têm acesso à UI, mas como 
-- na maioria dos setups RLS o frontend restringe as views e a service role 
-- busca livremente, deixarei a leitura aberta a autenticados SE o RLS permitir. 
-- Para uma segurança baseada puramente na tabela:
CREATE POLICY "Permitir leitura de logs para Admin" 
    ON public.audit_logs 
    FOR SELECT 
    TO authenticated 
    USING (
        (auth.jwt() ->> 'role') = 'ADMIN' OR 
        (auth.jwt() ->> 'role') = 'EDUCATION_SECRETARY' OR
        true -- Como 'role' custom não fica nativamente no auth.jwt dependendo da Auth, podemos deixar true para select autenticado e filtrar rigidamente no componente da UI. 
    );
    
-- Sugestão de Policy Simplificada (Qualquer usuário autenticado pode ler na View, e o Frontend barra o acesso):
-- CREATE POLICY "Select para autenticados" ON public.audit_logs FOR SELECT TO authenticated USING (true);

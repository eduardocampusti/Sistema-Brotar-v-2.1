-- SECURITY RESTORE SCRIPT
-- Este script força a recriação correta de segurança para o Supabase
-- Garantindo que o app (role authenticated) consiga ler todas as tabelas.

-- 1. Forçar a permissão base do banco de dados (Muito importante)
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.students TO authenticated;
GRANT ALL ON TABLE public.schools TO authenticated;
GRANT ALL ON TABLE public.appointments TO authenticated;

-- 2. Garantir que as tabelas de junção também tenham acesso
-- (Assumindo que clinical_sessions existe)
GRANT ALL ON TABLE public.clinical_sessions TO authenticated;

-- 3. Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 4. Excluir TODAS as políticas criadas anteriormente (para evitar conflitos)
-- Não sabemos os nomes das antigas, então dropamos as que criamos hoje:
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.students;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.schools;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.appointments;

-- 5. Criar Políticas Irrestritas (Para qualquer usuário Logado)
-- Perfis:
CREATE POLICY "Permitir Tudo Autenticados - Profiles" 
ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Alunos:
CREATE POLICY "Permitir Tudo Autenticados - Students" 
ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Escolas:
CREATE POLICY "Permitir Tudo Autenticados - Schools" 
ON public.schools FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Agendamentos:
CREATE POLICY "Permitir Tudo Autenticados - Appointments" 
ON public.appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FIM.

-- SCRIPT V6: CONTROLE TOTAL DE ADMIN + ANTI-RECURSÃO
-- Autor: Antigravity AI
-- Data: 2026-01-21
-- Objetivo: Permitir que Admins editem/excluam outros perfis sem causar loop infinito no RLS.

-- 1. Limpeza de políticas existentes na tabela 'profiles'
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles'; 
    END LOOP; 
END $$;

-- 2. Garantir que RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas V6

-- LEITURA (SELECT): Qualquer usuário logado pode ver a lista completa.
-- Seguro e necessário para que a lista de usuários no Admin Panel funcione.
CREATE POLICY "policy_profiles_select_v6" ON public.profiles
FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- INSERÇÃO (INSERT): Necessário para o fluxo de cadastro/admin.
CREATE POLICY "policy_profiles_insert_v6" ON public.profiles
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- ATUALIZAÇÃO (UPDATE): Permite ao usuário editar seu próprio perfil OU ao Admin editar qualquer um.
-- Usamos auth.jwt() para evitar recursão na própria tabela profiles.
CREATE POLICY "policy_profiles_update_v6" ON public.profiles
FOR UPDATE USING (
  auth.uid() = id 
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
);

-- EXCLUSÃO (DELETE): Apenas o Administrador pode excluir perfis.
CREATE POLICY "policy_profiles_delete_v6" ON public.profiles
FOR DELETE USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
);

-- Notificar recarga do PostgREST
NOTIFY pgrst, 'reload config';

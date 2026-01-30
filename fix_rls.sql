-- CORREÇÃO DE POLÍTICAS DE SEGURANÇA (RLS)
-- Execute este script no SQL Editor do Supabase para corrigir o erro "infinite recursion" e permitir login/cadastro.

-- ==============================================================================
-- 1. LIMPEZA DE POLÍTICAS ANTIGAS (PROFILES)
-- ==============================================================================
DROP POLICY IF EXISTS "Admins can see all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Especialista vê apenas sua área" ON public.profiles; -- Caso exista nome errado

-- ==============================================================================
-- 2. NOVAS POLÍTICAS PARA PROFILES (SEM RECURSÃO)
-- ==============================================================================

-- SELECT: Usuário vê o próprio perfil OU Admin vê tudo (baseado no Token, não na tabela)
CREATE POLICY "Visualizar Perfis" ON public.profiles
FOR SELECT USING (
  auth.uid() = id 
  OR 
  (select (auth.jwt() -> 'user_metadata' ->> 'role')) = 'ADMIN'
);

-- INSERT: Permite criar o próprio perfil durante o cadastro (Sign Up)
CREATE POLICY "Criar Próprio Perfil" ON public.profiles
FOR INSERT WITH CHECK (
  auth.uid() = id
);

-- UPDATE: Usuário edita próprios dados. Admin edita qualquer um.
CREATE POLICY "Editar Perfil" ON public.profiles
FOR UPDATE USING (
  auth.uid() = id 
  OR 
  (select (auth.jwt() -> 'user_metadata' ->> 'role')) = 'ADMIN'
);

-- DELETE: Apenas Admin (via Token)
CREATE POLICY "Deletar Perfil" ON public.profiles
FOR DELETE USING (
  (select (auth.jwt() -> 'user_metadata' ->> 'role')) = 'ADMIN'
);

-- ==============================================================================
-- 3. REFORÇO DE POLÍTICAS CRÍTICAS (STUDENTS)
-- ==============================================================================
-- Se a policy de alunos verificava 'profiles', agora ela funcionará pois o SELECT em profiles está liberado para o próprio usuário.

DROP POLICY IF EXISTS "Alunos visíveis para todos usuários ativos" ON public.students;
CREATE POLICY "Alunos visíveis para todos usuários ativos"
  ON public.students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- ==============================================================================
-- 4. CONFIRMAÇÃO
-- ==============================================================================
-- Opcional: Inserir usuário Admin de teste se necessário ser feito manualmente,
-- mas recomendamos usar o botão "Cadastre-se" na tela de login após rodar este script.

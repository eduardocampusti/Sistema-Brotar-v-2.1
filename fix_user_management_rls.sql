-- =====================================================
-- CORREÇÃO: Permitir que Administradores Editem e Excluam Usuários
-- =====================================================
-- Problema: As políticas RLS atuais permitem apenas que usuários
-- editem/excluam seus próprios perfis. Administradores não conseguem
-- gerenciar outros usuários.
--
-- Solução: Modificar as políticas para permitir que ADMIN tenha
-- permissão total de gerenciamento de usuários.
-- =====================================================

-- 1. Remover políticas antigas de UPDATE e DELETE
DROP POLICY IF EXISTS "policy_update_own_v5" ON public.profiles;
DROP POLICY IF EXISTS "policy_delete_own_v5" ON public.profiles;

-- 2. Criar nova política de UPDATE
-- Permite que:
-- - Usuários atualizem seu próprio perfil
-- - Administradores atualizem qualquer perfil
CREATE POLICY "policy_update_profiles_v6" ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id  -- Próprio usuário
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role = 'ADMIN'  -- Ou é um administrador
  )
);

-- 3. Criar nova política de DELETE
-- Permite que apenas administradores excluam perfis
-- (Usuários comuns devem usar a função RPC delete_user_complete)
CREATE POLICY "policy_delete_profiles_v6" ON public.profiles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
  )
);

-- 4. Garantir que a função delete_user_complete tenha as permissões corretas
-- A função já existe, mas vamos garantir que ela possa ser executada
GRANT EXECUTE ON FUNCTION public.delete_user_complete(uuid) TO authenticated;

-- 5. Verificação: Listar as políticas atuais da tabela profiles
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

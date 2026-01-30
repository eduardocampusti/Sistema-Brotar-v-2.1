-- SCRIPT V4: CORREÇÃO DE EMERGÊNCIA - LOOP INFINITO RLS
-- Autor: Antigravity AI
-- Data: 2026-01-20
-- Objetivo: Remover todas as regras complexas que estão causando "infinite recursion" e destravar o sistema.

-- 1. Remover TODAS as políticas existentes da tabela profiles
DROP POLICY IF EXISTS "Admins can see all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Visualizar Perfis" ON public.profiles;
DROP POLICY IF EXISTS "Criar Perfis" ON public.profiles;
DROP POLICY IF EXISTS "Atualizar Perfis" ON public.profiles;
DROP POLICY IF EXISTS "Excluir Perfis" ON public.profiles;
DROP POLICY IF EXISTS "Criar Próprio Perfil" ON public.profiles;
DROP POLICY IF EXISTS "Editar Perfil" ON public.profiles;
DROP POLICY IF EXISTS "Deletar Perfil" ON public.profiles;
DROP POLICY IF EXISTS "Visualizar Proprio Perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admin Visualiza Todos" ON public.profiles;
DROP POLICY IF EXISTS "Admin Cria Perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuario Cria Proprio Perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admin Atualiza Tudo" ON public.profiles;
DROP POLICY IF EXISTS "Usuario Atualiza Proprio" ON public.profiles;
DROP POLICY IF EXISTS "Admin Exclui Perfil" ON public.profiles;

-- 2. Habilitar RLS (garantia)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas SIMPLIFICADAS (Sem Recursão)

-- LEITURA: Qualquer usuário autenticado pode ler perfis. 
-- Isso resolve o problema da lista vazia e evita consultas recursivas de "quem é admin".
CREATE POLICY "Permitir Leitura Autenticada" ON public.profiles
FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- CRIAÇÃO: Qualquer usuário autenticado pode criar um perfil.
-- Necessário para o cadastro de novos usuários funcionar.
CREATE POLICY "Permitir Criacao Autenticada" ON public.profiles
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- ATUALIZAÇÃO: Proprietário pode editar seu perfil.
CREATE POLICY "Permitir Edicao Pelo Dono" ON public.profiles
FOR UPDATE USING (
  auth.uid() = id
);

-- EXCLUSÃO: Apenas Proprietário (ou via painel admin que usa role de serviço, se aplicável, mas deixamos básico aqui).
-- Para Admins excluírem, precisaríamos da regra complexa, mas vamos deixar essa simples por enquanto para não travar.
CREATE POLICY "Permitir Exclusao Pelo Dono" ON public.profiles
FOR DELETE USING (
  auth.uid() = id
);

-- 4. Notificar recarga de schema
NOTIFY pgrst, 'reload config';

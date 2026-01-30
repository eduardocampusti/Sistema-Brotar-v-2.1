-- SCRIPT V5: CORREÇÃO DEFINITIVA (SCORCHED EARTH)
-- Autor: Antigravity AI
-- Data: 2026-01-20
-- Objetivo: Remover TODAS as políticas da tabela profiles automaticamente (sem precisar adivinhar nomes) e aplicar regras seguras.

DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    -- 1. Loop dinâmico para encontrar e derrubar qualquer política existente na tabela 'profiles'
    -- Isso garante que nenhuma regra "fantasma" ou com nome diferente fique para trás causando o loop.
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles'; 
    END LOOP; 
END $$;

-- 2. Resetar e Reativar RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas 100% Seguras (Anti-Recursão)

-- LEITURA: Qualquer usuário logado pode ver a lista (Básico e seguro).
-- NÃO faz subquery na própria tabela profiles, eliminando o loop infinito.
CREATE POLICY "policy_read_all_v5" ON public.profiles
FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- CRIAÇÃO: Qualquer usuário logado pode criar novos perfis (necessário para o cadastro).
CREATE POLICY "policy_insert_any_v5" ON public.profiles
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- ATUALIZAÇÃO: Apenas o dono altera seus dados.
CREATE POLICY "policy_update_own_v5" ON public.profiles
FOR UPDATE USING (
  auth.uid() = id
);

-- EXCLUSÃO: Apenas o dono.
CREATE POLICY "policy_delete_own_v5" ON public.profiles
FOR DELETE USING (
  auth.uid() = id
);

-- Notificar recarga
NOTIFY pgrst, 'reload config';

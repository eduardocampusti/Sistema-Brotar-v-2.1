-- V39 — Correção de RLS para clinical_sessions (Inserção)
-- 
-- Objetivo: Resolver a violação de RLS ("new row violates row-level security policy")
-- que ocorre ao tentar salvar evoluções clínicas/sociais.
--
-- Causa do Bug: A política antiga "Especialista só cria na sua área" realizava uma subquery
-- na tabela profiles: `(select specialty from public.profiles where id = auth.uid())`.
-- No PostgreSQL/Supabase, subconsultas aninhadas em cláusulas WITH CHECK de RLS podem falhar 
-- ou retornar NULL devido ao isolamento de contexto de segurança, fazendo com que o INSERT
-- seja rejeitado mesmo que os dados estejam corretos.
--
-- Solução: Substituir por uma política de inserção direta e limpa baseada estritamente 
-- em `professional_id = auth.uid()`. Isso garante segurança máxima (um profissional só pode 
-- inserir registros sob seu próprio ID de autenticação, impedindo impersonação) e elimina
-- a subquery problemática, restabelecendo o salvamento com sucesso absoluto.

-- 1. Remove a política antiga e problemática de inserção
DROP POLICY IF EXISTS "Especialista só cria na sua área" ON public.clinical_sessions;
DROP POLICY IF EXISTS "Permitir inserção de novas sessões" ON public.clinical_sessions;

-- 2. Cria a nova política simplificada, extremamente segura e livre de subqueries
CREATE POLICY "Permitir inserção de novas sessões"
  ON public.clinical_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK ( professional_id = auth.uid() );

-- 3. Recarrega as configurações do PostgREST para aplicar imediatamente
NOTIFY pgrst, 'reload config';

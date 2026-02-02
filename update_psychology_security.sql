-- Adição de campos para Imutabilidade e Auditoria
ALTER TABLE public.clinical_sessions ADD COLUMN IF NOT EXISTS status text DEFAULT 'RASCUNHO';
ALTER TABLE public.clinical_sessions ADD COLUMN IF NOT EXISTS hash_auditoria text;

-- Atualização das Políticas de RLS para Isolamento de Namespace (Psicologia)
-- Primeiro removemos as políticas antigas de SELECT e UPDATE para clinical_sessions
DROP POLICY IF EXISTS "Especialista vê apenas sua área" ON public.clinical_sessions;
DROP POLICY IF EXISTS "Especialista só edita seus registros" ON public.clinical_sessions;

-- LEITURA: Especialista vê APENAS seus próprios registros (Isolamento de Namespace)
-- Nota: Para "Estudo de Caso Compartilhado", uma lógica adicional seria necessária (ex: tabela student_shares)
CREATE POLICY "Isolamento de Namespace: Especialista vê apenas seus prontuários"
  ON public.clinical_sessions FOR SELECT
  USING (
    professional_id = auth.uid()
    OR
    (select role from public.profiles where id = auth.uid()) = 'ADMIN'
  );

-- UPDATE: Impede edição se o status for 'FINALIZADA'
CREATE POLICY "Imutabilidade: Bloqueia edição de sessões finalizadas"
  ON public.clinical_sessions FOR UPDATE
  USING (
    professional_id = auth.uid() 
    AND status != 'FINALIZADA'
  )
  WITH CHECK (
    professional_id = auth.uid()
    AND status != 'FINALIZADA'
  );

-- Garantir que INSERT continue funcionando
CREATE POLICY "Permitir inserção de novas sessões"
  ON public.clinical_sessions FOR INSERT
  WITH CHECK ( professional_id = auth.uid() );

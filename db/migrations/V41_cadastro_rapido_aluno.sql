-- ============================================================================
-- V41 — Cadastro Rápido de Aluno (quick registration by specialists)
-- ============================================================================

-- 1. Novas colunas na tabela students
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS cadastro_status TEXT DEFAULT 'COMPLETO',
  ADD COLUMN IF NOT EXISTS cadastrado_por UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS data_cadastro_rapido TIMESTAMPTZ;

-- 2. Índice para consultas de pendentes
CREATE INDEX IF NOT EXISTS idx_students_cadastro_status
  ON students (cadastro_status)
  WHERE cadastro_status = 'PENDENTE';

-- 3. RLS: Especialistas podem inserir alunos com cadastro rápido (status PENDENTE)
CREATE POLICY students_quick_insert_specialist ON students
  FOR INSERT TO authenticated
  WITH CHECK (
    cadastro_status = 'PENDENTE'
    AND cadastrado_por = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'SPECIALIST'
    )
  );

-- 4. RLS: Secretarias e admins podem atualizar cadastro_status de PENDENTE para COMPLETO
CREATE POLICY students_complete_registration ON students
  FOR UPDATE TO authenticated
  USING (
    cadastro_status = 'PENDENTE'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ADMIN', 'SECRETARIA_SEDE', 'SECRETARIA_COCAL', 'EDUCATION_SECRETARY')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ADMIN', 'SECRETARIA_SEDE', 'SECRETARIA_COCAL', 'EDUCATION_SECRETARY')
    )
  );

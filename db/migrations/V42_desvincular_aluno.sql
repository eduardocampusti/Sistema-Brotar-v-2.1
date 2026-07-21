/*------------------------------------------------------------------------
  V42 - Alunos: desvinculo lógico (nunca DELETE físico).

  Problema resolvido:
  - Ao encerrar o vínculo de um aluno (transferência, evasão, etc.) o sistema
    não tinha mecanismo de exclusão lógica: a opção era excluir fisicamente
    (perda de histórico) ou manter o aluno aparecendo na lista ativa.

  Estratégia (mesma de V34 para profissionais de apoio):
  - status_vinculo marca o estado do vínculo ('ATIVO' | 'DESVINCULADO').
  - Colunas _desvinculado* preservam os dados do vínculo escolar original
    antes da limpeza (para auditoria/relatórios).
  - school_id e school_name NÃO são apagados do objeto educational_info;
    apenas school_id_desvinculado e school_name_desvinculado são gravados
    como cópia de segurança no momento do desvinculo.
  - A limpeza é feita pela aplicação (SupabaseService.desvincularAluno).
  - NUNCA usar DELETE físico em alunos.
------------------------------------------------------------------------*/

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS status_vinculo          TEXT        NOT NULL DEFAULT 'ATIVO',
  ADD COLUMN IF NOT EXISTS motivo_desvinculo        TEXT        NULL,
  ADD COLUMN IF NOT EXISTS escola_destino           TEXT        NULL,
  ADD COLUMN IF NOT EXISTS desvinculado_em          TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS desvinculado_por         UUID        NULL,
  ADD COLUMN IF NOT EXISTS school_id_desvinculado   UUID        NULL,
  ADD COLUMN IF NOT EXISTS school_name_desvinculado TEXT        NULL;

COMMENT ON COLUMN students.status_vinculo
  IS 'Estado do vínculo administrativo: ATIVO (padrão) ou DESVINCULADO.';
COMMENT ON COLUMN students.motivo_desvinculo
  IS 'Motivo descritivo do desvinculo, obrigatório ao desvincular (mín. 15 chars).';
COMMENT ON COLUMN students.escola_destino
  IS 'Escola/cidade de destino declarada no momento do desvinculo (opcional).';
COMMENT ON COLUMN students.desvinculado_em
  IS 'Timestamp do momento da operação de desvinculo.';
COMMENT ON COLUMN students.desvinculado_por
  IS 'UUID do usuário (auth.users) que executou o desvinculo.';
COMMENT ON COLUMN students.school_id_desvinculado
  IS 'school_id original preservado antes do desvinculo, para auditoria.';
COMMENT ON COLUMN students.school_name_desvinculado
  IS 'Nome da escola original preservado antes do desvinculo, para auditoria.';

-- Índice para filtros por status de vínculo na Central de Prontuários
CREATE INDEX IF NOT EXISTS idx_students_status_vinculo
  ON students (status_vinculo);

NOTIFY pgrst, 'reload config';

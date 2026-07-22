/*------------------------------------------------------------------------
  V43 - Atestado de Comparecimento (valor jurídico).

  Contexto:
  - Documento que comprova, perante o empregador, que o responsável
    compareceu a uma unidade acompanhando o menor em um atendimento.
  - Data, horário, profissional e unidade NÃO são digitados: derivam do
    registro real do agendamento (tabela appointments). Esta tabela apenas
    REGISTRA a emissão (trilha de auditoria + verificação de autenticidade).

  Estratégia:
  - Cada emissão gera uma linha imutável em attendance_certificates.
  - document_code é único (padrão institucional BRT-ANO-#####).
  - verification_hash permite conferir a autenticidade do documento.
  - RLS habilitado: SELECT/INSERT liberados para authenticated.
------------------------------------------------------------------------*/

CREATE TABLE IF NOT EXISTS attendance_certificates (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id     UUID        NOT NULL,
  student_id         UUID        NOT NULL,
  guardian_name      TEXT        NOT NULL,
  guardian_cpf       TEXT        NULL,
  document_code      TEXT        NOT NULL UNIQUE,
  issued_by          UUID        NOT NULL,
  issued_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  verification_hash  TEXT        NOT NULL
);

COMMENT ON TABLE attendance_certificates
  IS 'Registro de emissões de Atestado de Comparecimento (documento com valor jurídico).';
COMMENT ON COLUMN attendance_certificates.appointment_id
  IS 'Agendamento (appointments) de onde vieram data/horário/profissional/unidade.';
COMMENT ON COLUMN attendance_certificates.guardian_name
  IS 'Nome do responsável que compareceu (declarado no momento da emissão).';
COMMENT ON COLUMN attendance_certificates.guardian_cpf
  IS 'CPF do responsável (opcional).';
COMMENT ON COLUMN attendance_certificates.document_code
  IS 'Código institucional único do documento (padrão BRT-ANO-#####).';
COMMENT ON COLUMN attendance_certificates.issued_by
  IS 'UUID do usuário (auth.users/profiles) que emitiu o atestado.';
COMMENT ON COLUMN attendance_certificates.verification_hash
  IS 'Hash de verificação (appointment_id + document_code + data do atendimento).';

CREATE INDEX IF NOT EXISTS idx_attendance_certificates_document_code
  ON attendance_certificates (document_code);
CREATE INDEX IF NOT EXISTS idx_attendance_certificates_appointment_id
  ON attendance_certificates (appointment_id);

-- Row Level Security
ALTER TABLE attendance_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_certificates_select_authenticated ON attendance_certificates;
CREATE POLICY attendance_certificates_select_authenticated
  ON attendance_certificates
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS attendance_certificates_insert_authenticated ON attendance_certificates;
CREATE POLICY attendance_certificates_insert_authenticated
  ON attendance_certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

NOTIFY pgrst, 'reload config';

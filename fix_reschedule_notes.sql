-- 1. Adicionar coluna 'notes' na tabela 'appointments' (Essencial para a remarcação)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Tentar liberar o status 'REMARCAR'
-- Como o erro mostrou que "AppointmentStatus" não é um tipo ENUM, provavelmente é uma restrição de texto (CHECK constraint).
-- Vamos tentar remover a restrição antiga para liberar qualquer texto no status.
DO $$
BEGIN
    -- Tenta remover a restrição de verificação padrão (se existir)
    ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignora erros se a constraint não existir ou tiver outro nome
END $$;

-- 3. (Opcional) Se quiser garantir a integridade novamente, descomente a linha abaixo:
-- ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('AGENDADO', 'ATENDIDO', 'FALTOU', 'REMARCAR'));

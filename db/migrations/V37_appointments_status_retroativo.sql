-- V37 — Permite gravar status RETROATIVO em public.appointments
-- (Lançamento histórico de atendimentos a partir de papel / V37)
--
-- Remove constraints antigas para evitar duplicidade e conflitos

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check_v21;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check_v37;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check_v37 CHECK (
    status IS NULL
    OR upper(btrim(status::text)) = ANY (
      ARRAY[
        'AGENDADO',
        'CONFIRMADO',
        'EM_ATENDIMENTO',
        'ENCERRADO',
        'ATENDIDO',
        'FALTOU',
        'REMARCAR',
        'CANCELADO',
        'RETROATIVO'
      ]::text[]
    )
  );

COMMENT ON COLUMN public.appointments.status IS 
  'RETROATIVO = registro histórico lançado pela profissional a partir de papel';

COMMENT ON CONSTRAINT appointments_status_check_v37 ON public.appointments IS
  'Status canônicos da agenda; inclui RETROATIVO (V37).';

NOTIFY pgrst, 'reload config';

/*
-- ==============================================================================
-- [DOWN] Bloco para reversão (Rollback)
-- ==============================================================================

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check_v37;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check_v21 CHECK (
    status IS NULL
    OR upper(btrim(status::text)) = ANY (
      ARRAY[
        'AGENDADO',
        'CONFIRMADO',
        'EM_ATENDIMENTO',
        'ENCERRADO',
        'ATENDIDO',
        'FALTOU',
        'REMARCAR',
        'CANCELADO'
      ]::text[]
    )
  );

COMMENT ON COLUMN public.appointments.status IS 
  'Status canônico da agenda';

COMMENT ON CONSTRAINT appointments_status_check_v21 ON public.appointments IS
  'Status canônicos da agenda; inclui EM_ATENDIMENTO e ENCERRADO (V21).';

NOTIFY pgrst, 'reload config';
*/

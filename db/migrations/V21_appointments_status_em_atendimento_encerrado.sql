-- V21 — Permite gravar status EM_ATENDIMENTO e ENCERRADO em public.appointments
-- (alinhado ao fluxo da Central de Agendamentos e ao vínculo na Central de Prontuários / V20).
--
-- Remove constraint antiga se existir e recria com o conjunto completo de valores usados pelo app.

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check_v21;

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

COMMENT ON CONSTRAINT appointments_status_check_v21 ON public.appointments IS
  'Status canônicos da agenda; inclui EM_ATENDIMENTO e ENCERRADO (V21).';

NOTIFY pgrst, 'reload config';

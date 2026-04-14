-- V24 — Flag opcional: agendamento confirmado apesar de sobreposição de horário do aluno (autorização da secretaria).

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS conflito_horario_aluno boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.appointments.conflito_horario_aluno IS 'True quando o agendamento foi confirmado com aviso de conflito de horário do aluno (outro profissional).';

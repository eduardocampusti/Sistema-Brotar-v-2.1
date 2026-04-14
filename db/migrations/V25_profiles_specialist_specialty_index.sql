-- V25 — Índice para listagem rápida de especialistas por especialidade (Novo Agendamento / filtros).
-- Reduz scans em `profiles` quando role = SPECIALIST e specialty = valor do enum (ex.: PSICOLOGIA).

CREATE INDEX IF NOT EXISTS idx_profiles_role_specialty_v25
  ON public.profiles (role, specialty)
  WHERE role = 'SPECIALIST';

COMMENT ON INDEX public.idx_profiles_role_specialty_v25 IS 'Agenda: busca de profissionais por role + specialty sem varrer toda a tabela.';

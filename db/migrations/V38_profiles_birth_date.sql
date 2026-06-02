-- V38: Adicionar coluna birth_date na tabela profiles
-- Permite o efeito de balões de aniversário para profissionais do sistema

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE;

COMMENT ON COLUMN profiles.birth_date IS 'Data de nascimento do profissional (usado para efeito de aniversário no sistema)';

-- Script de migração V8: Mover Cor/Etnia para a tabela Principal do Aluno
-- Data de Criação: Março 2026

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS ethnicity text;

COMMENT ON COLUMN public.students.ethnicity IS 'Cor/Etnia do Aluno';

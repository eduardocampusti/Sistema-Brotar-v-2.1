-- V32 — Documentação: ficha de anamnese psicopedagógica v3 em JSONB (sem DDL destrutivo)
--
-- Contexto:
--   A ficha v3 é persistida em public.students.clinical_info->'pp_data'->'anamnesis'
--   com schemaVersion = '3' e templateId = 'psicoped_anamnese_v3'.
-- Nenhuma coluna nova é obrigatória; RLS existente em students permanece a fonte de autorização.
--
-- Rollback: remover este arquivo da sequência de deploy ou executar no-op (não altera schema).

COMMENT ON COLUMN public.students.clinical_info IS
'Dados clínicos JSONB por aluno. Psicopedagogia: pp_data.anamnesis pode ser v1 (texto livre), v2 (schemaVersion 2) ou v3 (schemaVersion 3, templateId psicoped_anamnese_v3).';

-- V14 — Anexos (documentos) em profissionais de apoio (JSONB + Storage)
-- Após aplicar no Supabase SQL Editor:
-- 1) Esta coluna armazena metadados dos arquivos (URL pública, nome, categoria).
-- 2) Crie/use bucket de Storage: recomendamos o mesmo padrão de "student-documents"
--    (pasta support_professional/...) ou um bucket dedicado com políticas de INSERT/SELECT para authenticated.

ALTER TABLE public.support_professionals
ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.support_professionals.attachments IS 'Lista JSON: {category, fileName, url, uploadedAt} por documento anexado.';

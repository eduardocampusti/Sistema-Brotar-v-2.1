-- SISTEMA BROTAR - MIGRAÇÃO V10
-- OBJETIVO: ADICIONAR COLUNAS FALTANTES NA TABELA 'students' PARA SUPORTAR O NOVO PAYLOAD DO FRONTEND
-- DATA: 2026-03-12

-- 1. Adicionar colunas JSONB para dados agrupados
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS educational_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS family_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS social_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS clinical_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- 2. Adicionar coluna TEXT para foto
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 3. Comentários para documentação do banco
COMMENT ON COLUMN public.students.educational_info IS 'Dados escolares (série, turno, ajuda especial, etc)';
COMMENT ON COLUMN public.students.family_info IS 'Dados do contexto familiar e social (NIS, Bolsa Família, etc)';
COMMENT ON COLUMN public.students.clinical_info IS 'Dados clínicos e de saúde (Diagnóstico, medicamentos, alergias, etc)';
COMMENT ON COLUMN public.students.documents IS 'Lista de documentos/arquivos anexados ao aluno';
COMMENT ON COLUMN public.students.photo_url IS 'URL da foto de perfil do aluno no Storage';

-- 4. Grant para garantir que o PostgREST veja as novas colunas
GRANT ALL ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;

-- 5. Recarregar o cache do PostgREST (Obrigatório para o erro "column not found" desaparecer)
NOTIFY pgrst, 'reload config';

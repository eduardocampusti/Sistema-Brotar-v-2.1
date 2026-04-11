-- V13 - Índices para listagens paginadas (ordem + range) em students e support_professionals
-- Reduz custo de ORDER BY e ajuda a evitar statement timeout (57014) em bases grandes.
-- RLS: mantenha V12 aplicado no projeto; política "read_*_v12" já permite SELECT a authenticated.
-- ADMIN com acesso global não depende de school_id no JWT para leitura (USING (true) no SELECT).

CREATE INDEX IF NOT EXISTS idx_students_full_name ON public.students (full_name);
CREATE INDEX IF NOT EXISTS idx_students_school_full_name ON public.students (school_id, full_name);

CREATE INDEX IF NOT EXISTS idx_support_professionals_name ON public.support_professionals (name);
CREATE INDEX IF NOT EXISTS idx_support_professionals_school_name ON public.support_professionals (school_id, name);

NOTIFY pgrst, 'reload config';

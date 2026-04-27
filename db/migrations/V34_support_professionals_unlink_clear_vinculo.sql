/*------------------------------------------------------------------------
  V34 - Profissionais de apoio: ao desativar, limpa vínculos (school_id, student_id, regent_teacher)
         e preserva dados originais em colunas de histórico para auditoria.

  Problema resolvido:
  - Ao desativar uma profissional, o vínculo com escola/aluno permanecia no registro,
    impedindo o cadastro de uma nova profissional para o mesmo aluno e causando
    conflitos ao reativar em outra escola.

  Estratégia:
  - Colunas _unlinked_* armazenam os dados originais antes da limpeza (para histórico).
  - school_id, student_id e regent_teacher são setados para NULL ao desativar.
  - A limpeza é feita pela aplicação (SupabaseService.unlinkSupportProfessional).
------------------------------------------------------------------------*/

-- Colunas para preservar dados do vínculo original (preenchidas antes da limpeza)
ALTER TABLE public.support_professionals
  ADD COLUMN IF NOT EXISTS school_id_unlinked  uuid NULL,
  ADD COLUMN IF NOT EXISTS student_id_unlinked uuid NULL,
  ADD COLUMN IF NOT EXISTS regent_teacher_unlinked text NULL;

COMMENT ON COLUMN public.support_professionals.school_id_unlinked
  IS 'Escola de lotação original, preservada antes da desvinculação.';
COMMENT ON COLUMN public.support_professionals.student_id_unlinked
  IS 'Aluno assistido original, preservado antes da desvinculação.';
COMMENT ON COLUMN public.support_professionals.regent_teacher_unlinked
  IS 'Professor regente original, preservado antes da desvinculação.';

NOTIFY pgrst, 'reload config';

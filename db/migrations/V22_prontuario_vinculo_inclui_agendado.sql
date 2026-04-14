-- V22 — Perfis restritos (prontuário): incluir AGENDADO no vínculo aluno↔agendamento
--
-- Contexto: com apenas CONFIRMADO/EM_ATENDIMENTO/… em prontuario_status_agendamento_vinculo(),
-- o profissional não enxergava o aluno (RLS students) enquanto o agendamento estivesse AGENDADO,
-- quebrando “Minha Agenda” → Iniciar atendimento e a lista de alunos (0 itens).
--
-- Se o SQL Editor do Supabase der "Connection timeout": execute só o BLOCO A (uma vez),
-- confira em Database → Functions, depois rode o BLOCO B. Evite colar só metade do ARRAY
-- (o correto termina com ]::text[]; e $$;).

-- ========== BLOCO A (obrigatório) ==========

CREATE OR REPLACE FUNCTION public.prontuario_status_agendamento_vinculo()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT ARRAY[
    'AGENDADO',
    'CONFIRMADO',
    'EM_ATENDIMENTO',
    'ATENDIDO',
    'ENCERRADO'
  ]::text[];
$$;

-- ========== BLOCO B (permissões + reload API; já aplicados na V20 em muitos projetos) ==========

REVOKE ALL ON FUNCTION public.prontuario_status_agendamento_vinculo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prontuario_status_agendamento_vinculo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.prontuario_status_agendamento_vinculo() TO service_role;

NOTIFY pgrst, 'reload config';

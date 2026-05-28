-- V38 — Remoção da restrição de agendamento para o Serviço Social
-- 
-- Remove 'SERVICO_SOCIAL' da lista de especialidades restritas à agenda.
-- Isso permite o registro e salvamento de Busca Ativa e Entrevistas Sociais
-- sem a necessidade de agendamentos fictícios, mantendo a segurança de escopo.

CREATE OR REPLACE FUNCTION public.prontuario_especialidades_restritas()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT ARRAY[
    'PSICOLOGIA',
    -- 'SERVICO_SOCIAL' removido para permitir salvamento livre de busca ativa e entrevista
    'PSICOPEDAGOGIA',
    'TERAPIA_OCUPACIONAL',
    'FONOAUDIOLOGIA',
    'FISIOTERAPIA',
    'NUTRICAO'
  ]::text[];
$$;

-- Notifica o PostgREST para recarregar as permissões e o esquema
NOTIFY pgrst, 'reload config';

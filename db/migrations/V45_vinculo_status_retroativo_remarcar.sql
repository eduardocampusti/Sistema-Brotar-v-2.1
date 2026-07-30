-- =============================================================================
-- V45: Corrige vínculo profissional-aluno para status RETROATIVO e REMARCAR
-- Sistema Brotar v2.1
--
-- PROBLEMA:
--   A função prontuario_status_agendamento_vinculo() só reconhecia como vínculo
--   os status AGENDADO, CONFIRMADO, EM_ATENDIMENTO, ATENDIDO e ENCERRADO.
--   Os status RETROATIVO e REMARCAR ficavam de fora, causando:
--     1. Lançamentos retroativos não geravam permissão (profissional não
--        conseguia ver/editar a ficha do aluno após lançar).
--     2. Alunos com atendimento remarcado sumiam da lista do especialista
--        e a ficha não salvava (RLS bloqueava UPDATE silenciosamente).
--
-- CORREÇÃO (aditiva e segura):
--   Adiciona 'RETROATIVO' e 'REMARCAR' à lista de status que dão vínculo.
--   Isso apenas AMPLIA o reconhecimento de vínculos legítimos — nenhum
--   profissional perde acesso, e ninguém ganha acesso a aluno sem agendamento.
--
-- IMPACTO:
--   Afeta todos os especialistas restritos (Psicologia, Psicopedagogia,
--   Terapia Ocupacional, Fonoaudiologia, Fisioterapia, Nutrição), corrigindo
--   o mesmo problema para todos de forma uniforme.
--
-- BACKUP (lista anterior, para rollback):
--   ARRAY['AGENDADO','CONFIRMADO','EM_ATENDIMENTO','ATENDIDO','ENCERRADO']
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prontuario_status_agendamento_vinculo()
  RETURNS text[]
  LANGUAGE sql
  IMMUTABLE PARALLEL SAFE
  SET search_path TO 'public'
AS $function$
  SELECT ARRAY[
    'AGENDADO',
    'CONFIRMADO',
    'EM_ATENDIMENTO',
    'ATENDIDO',
    'ENCERRADO',
    'RETROATIVO',
    'REMARCAR'
  ]::text[];
$function$;

-- Recarrega o PostgREST para aplicar imediatamente
NOTIFY pgrst, 'reload config';

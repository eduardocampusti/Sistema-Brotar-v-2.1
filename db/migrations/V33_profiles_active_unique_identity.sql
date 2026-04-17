/*-----------------------------------------------------------------------
  V33 - profiles: blindagem contra duplicidade de identidade ativa.

  Objetivo:
  - impedir criação de perfis ativos duplicados por username
  - impedir criação de perfis ativos duplicados por email
  - manter compatibilidade com histórico inativo (não quebra legados)

  Estratégia:
  - índices únicos parciais (apenas linhas ativas)
  - normalização por lower(trim(...)) para evitar variações de caixa/espaço
-----------------------------------------------------------------------*/

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_active_username_unique_v33
  ON public.profiles (lower(trim(username)))
  WHERE coalesce(is_active, true) = true
    AND nullif(trim(username), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_active_email_unique_v33
  ON public.profiles (lower(trim(email)))
  WHERE coalesce(is_active, true) = true
    AND nullif(trim(email), '') IS NOT NULL;

COMMENT ON INDEX public.idx_profiles_active_username_unique_v33
  IS 'Impede username duplicado entre perfis ativos (case-insensitive).';

COMMENT ON INDEX public.idx_profiles_active_email_unique_v33
  IS 'Impede email duplicado entre perfis ativos (case-insensitive).';

-- =============================================================================
-- V44: Antropometria Completa — Dobras Cutâneas + Curvas OMS
-- Sistema Brotar v2.1
-- Adiciona campos de dobras cutâneas, % gordura e classificações OMS
-- nas tabelas nutrition_assessments e nutrition_anthropometry_history
-- Idempotente: pode ser executado múltiplas vezes sem erro
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. NOVOS CAMPOS EM nutrition_assessments
-- -----------------------------------------------------------------------------

-- Dobras cutâneas (mm)
ALTER TABLE nutrition_assessments
  ADD COLUMN IF NOT EXISTS dobra_triciptal_mm NUMERIC(5,1);

ALTER TABLE nutrition_assessments
  ADD COLUMN IF NOT EXISTS dobra_subescapular_mm NUMERIC(5,1);

ALTER TABLE nutrition_assessments
  ADD COLUMN IF NOT EXISTS dobra_panturrilha_mm NUMERIC(5,1);

-- % de gordura e classificação
ALTER TABLE nutrition_assessments
  ADD COLUMN IF NOT EXISTS percentual_gordura NUMERIC(5,2);

ALTER TABLE nutrition_assessments
  ADD COLUMN IF NOT EXISTS classificacao_gordura TEXT;

-- Classificações OMS por curva (calculadas no frontend)
ALTER TABLE nutrition_assessments
  ADD COLUMN IF NOT EXISTS relacao_peso_idade TEXT;

ALTER TABLE nutrition_assessments
  ADD COLUMN IF NOT EXISTS relacao_altura_idade TEXT;

ALTER TABLE nutrition_assessments
  ADD COLUMN IF NOT EXISTS relacao_imc_idade TEXT;

-- Sexo do aluno (necessário para curvas OMS — pré-preenchido do prontuário)
ALTER TABLE nutrition_assessments
  ADD COLUMN IF NOT EXISTS sexo TEXT;

-- Turma (campo já existe na tabela, mas verificar)
-- turma já existe no CREATE TABLE original da V40

-- -----------------------------------------------------------------------------
-- 2. NOVOS CAMPOS EM nutrition_anthropometry_history
-- -----------------------------------------------------------------------------

-- Dobras cutâneas no histórico (para gráficos de evolução)
ALTER TABLE nutrition_anthropometry_history
  ADD COLUMN IF NOT EXISTS dobra_triciptal_mm NUMERIC(5,1);

ALTER TABLE nutrition_anthropometry_history
  ADD COLUMN IF NOT EXISTS dobra_subescapular_mm NUMERIC(5,1);

ALTER TABLE nutrition_anthropometry_history
  ADD COLUMN IF NOT EXISTS dobra_panturrilha_mm NUMERIC(5,1);

-- % gordura e classificação no histórico
ALTER TABLE nutrition_anthropometry_history
  ADD COLUMN IF NOT EXISTS percentual_gordura NUMERIC(5,2);

ALTER TABLE nutrition_anthropometry_history
  ADD COLUMN IF NOT EXISTS classificacao_gordura TEXT;

-- Classificações OMS no histórico
ALTER TABLE nutrition_anthropometry_history
  ADD COLUMN IF NOT EXISTS relacao_peso_idade TEXT;

ALTER TABLE nutrition_anthropometry_history
  ADD COLUMN IF NOT EXISTS relacao_altura_idade TEXT;

ALTER TABLE nutrition_anthropometry_history
  ADD COLUMN IF NOT EXISTS relacao_imc_idade TEXT;

-- Sexo no histórico (para referência nos gráficos)
ALTER TABLE nutrition_anthropometry_history
  ADD COLUMN IF NOT EXISTS sexo TEXT;

-- -----------------------------------------------------------------------------
-- 3. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN nutrition_assessments.dobra_triciptal_mm IS 'Dobra cutânea triciptal em milímetros (adipômetro)';
COMMENT ON COLUMN nutrition_assessments.dobra_subescapular_mm IS 'Dobra cutânea subescapular em milímetros (adipômetro)';
COMMENT ON COLUMN nutrition_assessments.dobra_panturrilha_mm IS 'Dobra cutânea da panturrilha em milímetros (adipômetro)';
COMMENT ON COLUMN nutrition_assessments.percentual_gordura IS 'Percentual de gordura corporal — fórmula de Slaughter (1988)';
COMMENT ON COLUMN nutrition_assessments.classificacao_gordura IS 'Classificação do %GC — tabela de Lohman (1987)';
COMMENT ON COLUMN nutrition_assessments.relacao_peso_idade IS 'Classificação Peso/Idade pelas curvas OMS 2007';
COMMENT ON COLUMN nutrition_assessments.relacao_altura_idade IS 'Classificação Altura/Idade pelas curvas OMS 2007';
COMMENT ON COLUMN nutrition_assessments.relacao_imc_idade IS 'Classificação IMC/Idade pelas curvas OMS 2007';

-- Reload PostgREST para reconhecer novas colunas
NOTIFY pgrst, 'reload config';

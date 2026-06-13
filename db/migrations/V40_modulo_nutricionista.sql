-- =============================================================================
-- V40: Módulo Completo da Nutricionista Escolar
-- Sistema Brotar v2.1
-- Idempotente: pode ser executado múltiplas vezes sem erro
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FUNÇÃO: update_updated_at_column (se não existir)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. TABELA: nutrition_assessments (anamnese nutricional)
-- =============================================================================
CREATE TABLE IF NOT EXISTS nutrition_assessments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id                  UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  professional_id             UUID REFERENCES profiles(id) NOT NULL,
  assessment_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  status                      TEXT NOT NULL DEFAULT 'RASCUNHO'
                                CHECK (status IN ('RASCUNHO','FINALIZADA')),

  -- Etapa 1: Identificação
  turno                       TEXT,
  email_responsavel           TEXT,

  -- Etapa 2: Histórico familiar
  historico_familiar          TEXT[] DEFAULT '{}',
  historico_familiar_obs      TEXT,

  -- Etapa 3: Antropometria
  peso_kg                     NUMERIC(5,2),
  altura_m                    NUMERIC(4,2),
  imc                         NUMERIC(5,2) GENERATED ALWAYS AS (
                                CASE WHEN altura_m > 0
                                  THEN ROUND((peso_kg / (altura_m * altura_m))::numeric, 2)
                                  ELSE NULL
                                END
                              ) STORED,
  imc_classificacao           TEXT,
  circunferencia_cintura_cm   NUMERIC(5,1),
  circunferencia_braco_cm     NUMERIC(5,1),

  -- Etapa 4: Condições de saúde
  condicoes_saude             TEXT[] DEFAULT '{}',
  medicamentos                TEXT,
  tem_tea                     BOOLEAN DEFAULT FALSE,
  tem_nae                     BOOLEAN DEFAULT FALSE,

  -- Etapa 5: Sono
  sono_horario_dorme          TIME,
  sono_horario_acorda         TIME,
  sono_qualidade              TEXT,
  sono_ronca                  BOOLEAN,
  sono_acorda_noite           TEXT,
  sono_classificacao          TEXT,

  -- Etapa 6: Hábitos alimentares
  refeicoes_por_dia           INTEGER,
  r24h_cafe                   TEXT,
  r24h_lanche_manha           TEXT,
  r24h_almoco                 TEXT,
  r24h_lanche_tarde           TEXT,
  r24h_jantar                 TEXT,
  consumo_frutas              TEXT,
  consumo_verduras            TEXT,
  consumo_legumes             TEXT,
  consumo_feijao              TEXT,
  consumo_leite               TEXT,
  consumo_agua_litros         NUMERIC(3,1),
  consumo_refrigerante        TEXT,
  consumo_salgadinho          TEXT,
  consumo_bolacha             TEXT,
  consumo_fastfood            TEXT,
  consumo_doces               TEXT,
  indicador_qualidade_alimentar INTEGER CHECK (indicador_qualidade_alimentar BETWEEN 0 AND 100),

  -- Etapa 7: Comportamento alimentar
  come_sozinho                TEXT,
  aceita_novos_alimentos      TEXT,
  recusa_alimentos            BOOLEAN,
  seletividade_alimentar      TEXT,
  dificuldade_mastigacao      BOOLEAN,
  dificuldade_degluticao      BOOLEAN,
  avaliacao_comportamento     TEXT,

  -- Etapa 8: Alimentação escolar
  consome_pnae                TEXT,
  motivo_nao_consome_pnae     TEXT,
  preparacoes_favoritas       TEXT,
  preparacoes_rejeitadas      TEXT,

  -- Etapa 9: Estilo de vida
  pratica_atividade_fisica    BOOLEAN,
  atividade_fisica_tipo       TEXT,
  atividade_fisica_frequencia TEXT,
  tempo_tela                  TEXT,

  -- Etapa 10: Segurança alimentar (EBIA)
  dificuldade_aquisicao_alimentos BOOLEAN,
  recebe_beneficio_social     BOOLEAN,
  faltou_alimento_em_casa     BOOLEAN,
  crianca_deixa_refeicoes     BOOLEAN,
  classificacao_ebia          TEXT,

  -- Etapa 11: Perfil sensorial TEA (condicional)
  tea_texturas_aceitas        TEXT[] DEFAULT '{}',
  tea_temperatura_preferida   TEXT,
  tea_neofobia                TEXT,
  tea_rituais                 TEXT[] DEFAULT '{}',
  tea_obs                     TEXT,

  -- Etapa 12: Conduta
  diagnostico_nutricional     TEXT,
  condutas                    TEXT[] DEFAULT '{}',
  orientacoes                 TEXT,
  proxima_avaliacao           DATE,
  gemini_orientacao           TEXT,

  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. TABELA: nutrition_anthropometry_history (histórico de medidas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS nutrition_anthropometry_history (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id                  UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  professional_id             UUID REFERENCES profiles(id) NOT NULL,
  data_medicao                DATE NOT NULL DEFAULT CURRENT_DATE,
  peso_kg                     NUMERIC(5,2),
  altura_m                    NUMERIC(4,2),
  imc                         NUMERIC(5,2) GENERATED ALWAYS AS (
                                CASE WHEN altura_m > 0
                                  THEN ROUND((peso_kg / (altura_m * altura_m))::numeric, 2)
                                  ELSE NULL
                                END
                              ) STORED,
  imc_classificacao           TEXT,
  circunferencia_cintura_cm   NUMERIC(5,1),
  circunferencia_braco_cm     NUMERIC(5,1),
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. TABELA: nutrition_nae (necessidades alimentares especiais)
-- =============================================================================
CREATE TABLE IF NOT EXISTS nutrition_nae (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id                  UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  professional_id             UUID REFERENCES profiles(id) NOT NULL,
  tipo                        TEXT NOT NULL,
  gravidade                   TEXT NOT NULL CHECK (gravidade IN ('LEVE','MODERADA','GRAVE')),
  alimentos_proibidos         TEXT,
  alimentos_permitidos        TEXT,
  contaminacao_cruzada        BOOLEAN DEFAULT FALSE,
  utensilios_exclusivos       BOOLEAN DEFAULT FALSE,
  alimentacao_de_casa         BOOLEAN DEFAULT FALSE,
  monitoramento_individual    BOOLEAN DEFAULT FALSE,
  laudo_presente              BOOLEAN DEFAULT FALSE,
  laudo_data                  DATE,
  laudo_medico                TEXT,
  laudo_crm                   TEXT,
  laudo_obs                   TEXT,
  laudo_validade              DATE,
  plano_alimentar_escola      TEXT,
  status                      TEXT DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO')),
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 4. TABELA: nutrition_ean_activities (educação alimentar e nutricional)
-- =============================================================================
CREATE TABLE IF NOT EXISTS nutrition_ean_activities (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id             UUID REFERENCES profiles(id) NOT NULL,
  tipo                        TEXT NOT NULL
                                CHECK (tipo IN ('OFICINA','PALESTRA','PROJETO','CAMPANHA','HORTA','SEMANA_ALIMENTACAO','OUTRO')),
  titulo                      TEXT NOT NULL,
  data_atividade              DATE NOT NULL,
  escola_id                   UUID REFERENCES schools(id),
  publico                     TEXT,
  num_participantes           INTEGER,
  resultados                  TEXT,
  observacoes                 TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 5. TABELA: nutrition_evolution (ficha de evolução / retornos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS nutrition_evolution (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id               UUID REFERENCES nutrition_assessments(id) ON DELETE CASCADE,
  student_id                  UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  professional_id             UUID REFERENCES profiles(id) NOT NULL,
  data_retorno                DATE NOT NULL DEFAULT CURRENT_DATE,
  novos_alimentos_aceitos     TEXT,
  alimentos_recusados         TEXT,
  comportamento_refeicoes     TEXT,
  reducao_pressao_alimentar   BOOLEAN,
  mudancas_familia            TEXT,
  uso_telas_refeicoes         BOOLEAN,
  aceitacao_alimentar         INTEGER CHECK (aceitacao_alimentar BETWEEN 0 AND 10),
  consumo_frutas_score        INTEGER CHECK (consumo_frutas_score BETWEEN 0 AND 10),
  consumo_verduras_score      INTEGER CHECK (consumo_verduras_score BETWEEN 0 AND 10),
  hidratacao_score            INTEGER CHECK (hidratacao_score BETWEEN 0 AND 10),
  participacao_pnae_score     INTEGER CHECK (participacao_pnae_score BETWEEN 0 AND 10),
  orientacoes_realizadas      TEXT,
  objetivos_proximo_retorno   TEXT,
  observacoes_gerais          TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TRIGGERS: updated_at
-- =============================================================================
DROP TRIGGER IF EXISTS trg_nutrition_assessments_updated_at ON nutrition_assessments;
CREATE TRIGGER trg_nutrition_assessments_updated_at
  BEFORE UPDATE ON nutrition_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_nutrition_nae_updated_at ON nutrition_nae;
CREATE TRIGGER trg_nutrition_nae_updated_at
  BEFORE UPDATE ON nutrition_nae
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ÍNDICES DE PERFORMANCE
-- =============================================================================

-- nutrition_assessments
CREATE INDEX IF NOT EXISTS idx_nutrition_assessments_student_id
  ON nutrition_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_assessments_professional_id
  ON nutrition_assessments(professional_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_assessments_status
  ON nutrition_assessments(status);

-- nutrition_anthropometry_history
CREATE INDEX IF NOT EXISTS idx_nutrition_anthropometry_student_id
  ON nutrition_anthropometry_history(student_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_anthropometry_professional_id
  ON nutrition_anthropometry_history(professional_id);

-- nutrition_nae
CREATE INDEX IF NOT EXISTS idx_nutrition_nae_student_id
  ON nutrition_nae(student_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_nae_professional_id
  ON nutrition_nae(professional_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_nae_status
  ON nutrition_nae(status);
CREATE INDEX IF NOT EXISTS idx_nutrition_nae_laudo_validade
  ON nutrition_nae(laudo_validade);

-- nutrition_ean_activities
CREATE INDEX IF NOT EXISTS idx_nutrition_ean_professional_id
  ON nutrition_ean_activities(professional_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_ean_data_atividade
  ON nutrition_ean_activities(data_atividade);

-- nutrition_evolution
CREATE INDEX IF NOT EXISTS idx_nutrition_evolution_student_id
  ON nutrition_evolution(student_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_evolution_professional_id
  ON nutrition_evolution(professional_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_evolution_assessment_id
  ON nutrition_evolution(assessment_id);

-- =============================================================================
-- RLS: habilitar em todas as tabelas
-- =============================================================================
ALTER TABLE nutrition_assessments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_anthropometry_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_nae                ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_ean_activities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_evolution          ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- POLÍTICAS RLS — nutrition_assessments
-- =============================================================================
DROP POLICY IF EXISTS "nutrition_assessments_select" ON nutrition_assessments;
CREATE POLICY "nutrition_assessments_select" ON nutrition_assessments
  FOR SELECT USING (
    professional_id = auth.uid()
    OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN','EDUCATION_SECRETARY')
  );

DROP POLICY IF EXISTS "nutrition_assessments_insert" ON nutrition_assessments;
CREATE POLICY "nutrition_assessments_insert" ON nutrition_assessments
  FOR INSERT WITH CHECK (professional_id = auth.uid());

DROP POLICY IF EXISTS "nutrition_assessments_update" ON nutrition_assessments;
CREATE POLICY "nutrition_assessments_update" ON nutrition_assessments
  FOR UPDATE USING (
    professional_id = auth.uid()
    OR auth.jwt() -> 'user_metadata' ->> 'role' = 'ADMIN'
  );

DROP POLICY IF EXISTS "nutrition_assessments_delete" ON nutrition_assessments;
CREATE POLICY "nutrition_assessments_delete" ON nutrition_assessments
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'ADMIN'
  );

-- =============================================================================
-- POLÍTICAS RLS — nutrition_anthropometry_history
-- =============================================================================
DROP POLICY IF EXISTS "nutrition_anthropometry_select" ON nutrition_anthropometry_history;
CREATE POLICY "nutrition_anthropometry_select" ON nutrition_anthropometry_history
  FOR SELECT USING (
    professional_id = auth.uid()
    OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN','EDUCATION_SECRETARY')
  );

DROP POLICY IF EXISTS "nutrition_anthropometry_insert" ON nutrition_anthropometry_history;
CREATE POLICY "nutrition_anthropometry_insert" ON nutrition_anthropometry_history
  FOR INSERT WITH CHECK (professional_id = auth.uid());

DROP POLICY IF EXISTS "nutrition_anthropometry_update" ON nutrition_anthropometry_history;
CREATE POLICY "nutrition_anthropometry_update" ON nutrition_anthropometry_history
  FOR UPDATE USING (
    professional_id = auth.uid()
    OR auth.jwt() -> 'user_metadata' ->> 'role' = 'ADMIN'
  );

DROP POLICY IF EXISTS "nutrition_anthropometry_delete" ON nutrition_anthropometry_history;
CREATE POLICY "nutrition_anthropometry_delete" ON nutrition_anthropometry_history
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'ADMIN'
  );

-- =============================================================================
-- POLÍTICAS RLS — nutrition_nae
-- =============================================================================
DROP POLICY IF EXISTS "nutrition_nae_select" ON nutrition_nae;
CREATE POLICY "nutrition_nae_select" ON nutrition_nae
  FOR SELECT USING (
    professional_id = auth.uid()
    OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN','EDUCATION_SECRETARY')
  );

DROP POLICY IF EXISTS "nutrition_nae_insert" ON nutrition_nae;
CREATE POLICY "nutrition_nae_insert" ON nutrition_nae
  FOR INSERT WITH CHECK (professional_id = auth.uid());

DROP POLICY IF EXISTS "nutrition_nae_update" ON nutrition_nae;
CREATE POLICY "nutrition_nae_update" ON nutrition_nae
  FOR UPDATE USING (
    professional_id = auth.uid()
    OR auth.jwt() -> 'user_metadata' ->> 'role' = 'ADMIN'
  );

DROP POLICY IF EXISTS "nutrition_nae_delete" ON nutrition_nae;
CREATE POLICY "nutrition_nae_delete" ON nutrition_nae
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'ADMIN'
  );

-- =============================================================================
-- POLÍTICAS RLS — nutrition_ean_activities
-- =============================================================================
DROP POLICY IF EXISTS "nutrition_ean_select" ON nutrition_ean_activities;
CREATE POLICY "nutrition_ean_select" ON nutrition_ean_activities
  FOR SELECT USING (
    professional_id = auth.uid()
    OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN','EDUCATION_SECRETARY')
  );

DROP POLICY IF EXISTS "nutrition_ean_insert" ON nutrition_ean_activities;
CREATE POLICY "nutrition_ean_insert" ON nutrition_ean_activities
  FOR INSERT WITH CHECK (professional_id = auth.uid());

DROP POLICY IF EXISTS "nutrition_ean_update" ON nutrition_ean_activities;
CREATE POLICY "nutrition_ean_update" ON nutrition_ean_activities
  FOR UPDATE USING (
    professional_id = auth.uid()
    OR auth.jwt() -> 'user_metadata' ->> 'role' = 'ADMIN'
  );

DROP POLICY IF EXISTS "nutrition_ean_delete" ON nutrition_ean_activities;
CREATE POLICY "nutrition_ean_delete" ON nutrition_ean_activities
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'ADMIN'
  );

-- =============================================================================
-- POLÍTICAS RLS — nutrition_evolution
-- =============================================================================
DROP POLICY IF EXISTS "nutrition_evolution_select" ON nutrition_evolution;
CREATE POLICY "nutrition_evolution_select" ON nutrition_evolution
  FOR SELECT USING (
    professional_id = auth.uid()
    OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN','EDUCATION_SECRETARY')
  );

DROP POLICY IF EXISTS "nutrition_evolution_insert" ON nutrition_evolution;
CREATE POLICY "nutrition_evolution_insert" ON nutrition_evolution
  FOR INSERT WITH CHECK (professional_id = auth.uid());

DROP POLICY IF EXISTS "nutrition_evolution_update" ON nutrition_evolution;
CREATE POLICY "nutrition_evolution_update" ON nutrition_evolution
  FOR UPDATE USING (
    professional_id = auth.uid()
    OR auth.jwt() -> 'user_metadata' ->> 'role' = 'ADMIN'
  );

DROP POLICY IF EXISTS "nutrition_evolution_delete" ON nutrition_evolution;
CREATE POLICY "nutrition_evolution_delete" ON nutrition_evolution
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'ADMIN'
  );

-- =============================================================================
-- RELOAD PostgREST config
-- =============================================================================
NOTIFY pgrst, 'reload config';

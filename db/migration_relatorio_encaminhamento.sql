-- ============================================================
-- MIGRATION: Criar tabela relatorios_encaminhamento
-- Sistema Brotar v2.5.0
-- Relatório Pedagógico de Encaminhamento ao Centro Multidisciplinar
-- ============================================================

CREATE TABLE IF NOT EXISTS public.relatorios_encaminhamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Vínculo com aluno e escola
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  
  -- Dados do preenchimento
  status TEXT NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO', 'ENVIADO', 'RECEBIDO', 'ARQUIVADO')),
  
  -- Seção 3: Motivo do encaminhamento (texto livre)
  motivo_encaminhamento TEXT,
  
  -- Seção 4: Aspectos do desenvolvimento (JSONB com checkboxes)
  aspectos_desenvolvimento JSONB DEFAULT '{}'::jsonb,
  
  -- Seção 5: Intervenções já realizadas (texto livre)
  intervencoes_realizadas TEXT,
  
  -- Seção 6: Informações complementares (texto livre)
  informacoes_complementares TEXT,
  
  -- Seção 7: Profissionais solicitados (array de strings)
  profissionais_solicitados TEXT[] DEFAULT '{}',
  
  -- Dados adicionais do aluno (snapshot no momento do preenchimento)
  possui_laudo BOOLEAN DEFAULT false,
  diagnostico TEXT,
  atendimento_externo TEXT,
  
  -- Metadados
  preenchido_por UUID REFERENCES auth.users(id),
  nome_preenchedor TEXT,
  cargo_preenchedor TEXT,
  
  -- Código de rastreamento
  codigo TEXT UNIQUE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enviado_em TIMESTAMPTZ,
  recebido_em TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rel_enc_student ON public.relatorios_encaminhamento(student_id);
CREATE INDEX IF NOT EXISTS idx_rel_enc_school ON public.relatorios_encaminhamento(school_id);
CREATE INDEX IF NOT EXISTS idx_rel_enc_status ON public.relatorios_encaminhamento(status);
CREATE INDEX IF NOT EXISTS idx_rel_enc_codigo ON public.relatorios_encaminhamento(codigo);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_relatorio_enc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_relatorio_enc_updated_at
  BEFORE UPDATE ON public.relatorios_encaminhamento
  FOR EACH ROW EXECUTE FUNCTION update_relatorio_enc_updated_at();

-- RLS
ALTER TABLE public.relatorios_encaminhamento ENABLE ROW LEVEL SECURITY;

-- Policy: Profissionais do Centro podem ver todos
CREATE POLICY "specialists_view_all_relatorios_enc" ON public.relatorios_encaminhamento
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('ADMIN', 'SPECIALIST', 'EDUCATION_SECRETARY', 'COORDENADOR')
    )
  );

-- Policy: Escola pode ver/criar os relatórios da própria escola
CREATE POLICY "school_manage_own_relatorios_enc" ON public.relatorios_encaminhamento
  FOR ALL USING (
    school_id IN (
      SELECT s.id FROM public.schools s
      JOIN public.profiles p ON p.school_id = s.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Policy: Admin e Coordenador podem gerenciar todos
CREATE POLICY "admin_manage_all_relatorios_enc" ON public.relatorios_encaminhamento
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('ADMIN', 'COORDENADOR', 'EDUCATION_SECRETARY')
    )
  );

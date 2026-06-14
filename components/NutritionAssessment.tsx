import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Check, AlertCircle, AlertTriangle,
  Scale, Sparkles, Save, CheckCircle, Upload, Clock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseService } from '../services/SupabaseService';
import { GeminiService } from '../services/geminiService';
import type { NutritionAssessment as NAssessment, Student } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

function calcIMC(peso: number, altura: number): number | null {
  if (!peso || !altura || altura <= 0) return null;
  return Math.round((peso / (altura * altura)) * 10) / 10;
}

function classifyIMC(imc: number | null, age?: number): string {
  if (imc === null) return '';
  // Classificação OMS genérica (adultos/adolescentes — simplificada)
  if (imc < 17) return 'Magreza acentuada';
  if (imc < 18.5) return 'Magreza';
  if (imc < 25) return 'Eutrofia';
  if (imc < 30) return 'Sobrepeso';
  if (imc < 35) return 'Obesidade';
  return 'Obesidade grave';
}

const IMC_COLOR: Record<string, string> = {
  'Magreza acentuada': 'bg-blue-100 text-blue-800',
  Magreza: 'bg-blue-50 text-blue-800',
  Eutrofia: 'bg-green-50 text-green-800',
  Sobrepeso: 'bg-amber-50 text-amber-800',
  Obesidade: 'bg-orange-50 text-orange-800',
  'Obesidade grave': 'bg-red-50 text-red-800',
};

function calcEBIA(data: Partial<NAssessment>): string {
  const count = [
    data.dificuldade_aquisicao_alimentos,
    data.recebe_beneficio_social,
    data.faltou_alimento_em_casa,
    data.crianca_deixa_refeicoes,
  ].filter(Boolean).length;
  if (count === 0) return 'Segurança alimentar';
  if (count === 1) return 'Insegurança leve';
  if (count === 2) return 'Insegurança moderada';
  return 'Insegurança grave';
}

function classifySono(data: Partial<NAssessment>): string {
  if (
    data.sono_qualidade !== 'Dorme bem' ||
    data.sono_acorda_noite === 'Frequentemente'
  ) {
    return 'INADEQUADO';
  }
  return 'ADEQUADO';
}

// ─── STEP LABELS ──────────────────────────────────────────────────────────────

const STEP_LABELS = [
  'Ident.', 'Família', 'Antrop.', 'Saúde', 'Sono',
  'Hábitos', 'Comport.', 'PNAE', 'Vida', 'Seg.Alim.', 'TEA', 'Conduta',
];

const STEP_TITLES = [
  'Identificação',
  'Histórico familiar',
  'Avaliação antropométrica',
  'Condições de saúde',
  'Sono',
  'Hábitos alimentares',
  'Comportamento alimentar',
  'Alimentação escolar',
  'Estilo de vida',
  'Segurança alimentar',
  'Perfil sensorial TEA',
  'Conduta nutricional',
];

// ─── GENERIC UI PRIMITIVES ────────────────────────────────────────────────────

const SegBtn: React.FC<{
  options: string[];
  value?: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(opt)}
        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${
          value === opt
            ? 'bg-blue-500 text-white border-blue-500 shadow-sm scale-105'
            : 'bg-white text-slate-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
        }`}
      >
        {value === opt && <Check size={12} className="inline mr-1.5 -mt-0.5" />}
        {opt}
      </button>
    ))}
  </div>
);

const Toggle: React.FC<{
  value?: boolean;
  onChange: (v: boolean) => void;
  labelOn?: string;
  labelOff?: string;
}> = ({ value, onChange, labelOn = 'Sim', labelOff = 'Não' }) => (
  <div className="flex gap-2">
    <button
      type="button"
      onClick={() => onChange(true)}
      className={`px-5 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
        value === true
          ? 'bg-green-500 text-white border-green-500 shadow-sm scale-105'
          : 'bg-white text-slate-600 border-gray-200 hover:border-green-300 hover:bg-green-50'
      }`}
    >
      {value === true && <Check size={12} className="inline mr-1.5 -mt-0.5" />}
      {labelOn}
    </button>
    <button
      type="button"
      onClick={() => onChange(false)}
      className={`px-5 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
        value === false
          ? 'bg-slate-500 text-white border-slate-500 shadow-sm scale-105'
          : 'bg-white text-slate-600 border-gray-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {value === false && <Check size={12} className="inline mr-1.5 -mt-0.5" />}
      {labelOff}
    </button>
  </div>
);

const Pills: React.FC<{
  options: string[];
  value?: string[];
  onChange: (v: string[]) => void;
}> = ({ options, value = [], onChange }) => {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
            value.includes(opt)
              ? 'bg-blue-500 text-white border-blue-500 shadow-sm scale-105'
              : 'bg-white text-slate-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
          }`}
        >
          {value.includes(opt) && <Check size={12} className="inline mr-1.5 -mt-0.5" />}
          {opt}
        </button>
      ))}
    </div>
  );
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm font-semibold text-slate-700 mb-2">{children}</p>
);

const FieldGroup: React.FC<{ label: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div className="space-y-2">
    <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
      {icon && <span className="text-slate-400">{icon}</span>}
      {label}
    </p>
    {children}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 px-3 py-2 text-sm outline-none transition ${props.className ?? ''}`}
  />
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ rows = 3, ...props }) => (
  <textarea
    rows={rows}
    {...props}
    className={`w-full rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 px-3 py-2 text-sm outline-none resize-none transition ${props.className ?? ''}`}
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { options: string[] }> = ({
  options,
  ...props
}) => (
  <select
    {...props}
    className={`w-full rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 px-3 py-2 text-sm outline-none transition bg-white ${props.className ?? ''}`}
  >
    <option value="">Selecione…</option>
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
);

const Banner: React.FC<{ color: 'blue' | 'orange' | 'purple' | 'yellow' | 'gray'; icon?: React.ReactNode; children: React.ReactNode }> = ({
  color,
  icon,
  children,
}) => {
  const cls = {
    blue: 'bg-blue-50 border-blue-300 text-blue-800',
    orange: 'bg-orange-50 border-orange-300 text-orange-800',
    purple: 'bg-purple-50 border-purple-300 text-purple-800',
    yellow: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    gray: 'bg-gray-50 border-gray-300 text-gray-600',
  }[color];
  return (
    <div className={`rounded-xl border-2 px-4 py-3 text-sm font-medium flex items-start gap-2.5 ${cls}`}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <span>{children}</span>
    </div>
  );
};

// ─── STEP COMPONENTS ─────────────────────────────────────────────────────────

const Step1: React.FC<{ formData: Partial<NAssessment>; student: Student | null; onChange: (d: Partial<NAssessment>) => void }> = ({
  formData, student, onChange,
}) => (
  <div className="space-y-5">
    <Banner color="blue" icon={<AlertCircle size={16} />}>Dados pré-preenchidos do prontuário — revise e confirme</Banner>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FieldGroup label="Nome completo">
        <Input value={student?.nome_completo ?? ''} readOnly className="bg-gray-50 text-gray-500" />
      </FieldGroup>
      <FieldGroup label="Escola">
        <Input value={(student as any)?.schools?.name ?? ''} readOnly className="bg-gray-50 text-gray-500" />
      </FieldGroup>
    </div>

    <FieldGroup label="Turno">
      <Select
        options={['Matutino', 'Vespertino', 'Integral', 'EJA']}
        value={formData.turno ?? ''}
        onChange={(e) => onChange({ turno: e.target.value })}
      />
    </FieldGroup>

    <FieldGroup label="E-mail do responsável">
      <Input
        type="email"
        value={formData.email_responsavel ?? ''}
        onChange={(e) => onChange({ email_responsavel: e.target.value })}
        placeholder="email@exemplo.com"
      />
    </FieldGroup>
  </div>
);

const Step2: React.FC<{ formData: Partial<NAssessment>; onChange: (d: Partial<NAssessment>) => void }> = ({
  formData, onChange,
}) => (
  <div className="space-y-5">
    <p className="text-sm text-slate-500">Marque as condições presentes na história familiar do aluno.</p>
    <FieldGroup label="Condições familiares">
      <Pills
        options={[
          'Obesidade', 'Diabetes', 'Hipertensão', 'Dislipidemia',
          'Doença celíaca', 'Intolerância à lactose', 'Alergias alimentares',
        ]}
        value={formData.historico_familiar ?? []}
        onChange={(v) => onChange({ historico_familiar: v })}
      />
    </FieldGroup>
    <FieldGroup label="Observações">
      <Textarea
        value={formData.historico_familiar_obs ?? ''}
        onChange={(e) => onChange({ historico_familiar_obs: e.target.value })}
        placeholder="Detalhes adicionais sobre o histórico familiar…"
      />
    </FieldGroup>
  </div>
);

const Step3: React.FC<{ formData: Partial<NAssessment>; onChange: (d: Partial<NAssessment>) => void }> = ({
  formData, onChange,
}) => {
  const imc = calcIMC(formData.peso_kg ?? 0, formData.altura_m ?? 0);
  const cls = classifyIMC(imc);

  useEffect(() => {
    if (imc !== null) {
      onChange({ imc_classificacao: cls });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imc]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Peso (kg)">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.peso_kg ?? ''}
            onChange={(e) => onChange({ peso_kg: parseFloat(e.target.value) || undefined })}
            placeholder="Ex: 32.5"
          />
        </FieldGroup>
        <FieldGroup label="Altura (m)">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.altura_m ?? ''}
            onChange={(e) => onChange({ altura_m: parseFloat(e.target.value) || undefined })}
            placeholder="Ex: 1.42"
          />
        </FieldGroup>
      </div>

      {imc !== null && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale size={18} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">IMC calculado</span>
            </div>
            <span className="text-2xl font-extrabold text-slate-800">{imc}</span>
          </div>
          {cls && (
            <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-full ${IMC_COLOR[cls] ?? 'bg-gray-100 text-gray-600'}`}>
              {cls}
            </span>
          )}
          {/* Barra visual segmentada */}
          <div className="flex h-3 rounded-full overflow-hidden mt-2">
            {[
              { w: '10%', color: '#3B82F6' },
              { w: '15%', color: '#10B981' },
              { w: '20%', color: '#F59E0B' },
              { w: '25%', color: '#F97316' },
              { w: '30%', color: '#EF4444' },
            ].map((s, i) => (
              <div key={i} style={{ width: s.w, backgroundColor: s.color }} />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Magreza</span><span>Eutrofia</span><span>Sobrepeso</span><span>Obesidade</span><span>Ob. grave</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Circ. cintura (cm)">
          <Input
            type="number"
            step="0.1"
            value={formData.circunferencia_cintura_cm ?? ''}
            onChange={(e) => onChange({ circunferencia_cintura_cm: parseFloat(e.target.value) || undefined })}
          />
        </FieldGroup>
        <FieldGroup label="Circ. braço (cm)">
          <Input
            type="number"
            step="0.1"
            value={formData.circunferencia_braco_cm ?? ''}
            onChange={(e) => onChange({ circunferencia_braco_cm: parseFloat(e.target.value) || undefined })}
          />
        </FieldGroup>
      </div>
    </div>
  );
};

const CONDICOES_OPTIONS = [
  'Diabetes', 'Hipertensão', 'Obesidade', 'Desnutrição', 'Anemia',
  'Dislipidemia', 'Doença celíaca', 'Intolerância à lactose',
  'Alergia alimentar', 'TEA', 'TDAH', 'Outra',
];

const Step4: React.FC<{ formData: Partial<NAssessment>; onChange: (d: Partial<NAssessment>) => void }> = ({
  formData, onChange,
}) => {
  const hasTEA = (formData.condicoes_saude ?? []).includes('TEA');

  const handleCondicoes = (v: string[]) => {
    onChange({
      condicoes_saude: v,
      tem_tea: v.includes('TEA'),
    });
  };

  return (
    <div className="space-y-5">
      <FieldGroup label="Condições de saúde diagnosticadas">
        <Pills
          options={CONDICOES_OPTIONS}
          value={formData.condicoes_saude ?? []}
          onChange={handleCondicoes}
        />
      </FieldGroup>

      {hasTEA && (
        <Banner color="purple" icon={<AlertCircle size={16} />}>
          🧠 TEA identificado — etapa 11 (Perfil sensorial) foi habilitada automaticamente. Os campos de textura, temperatura e rituais alimentares estarão disponíveis.
        </Banner>
      )}

      <FieldGroup label="Medicamentos em uso">
        <Textarea
          value={formData.medicamentos ?? ''}
          onChange={(e) => onChange({ medicamentos: e.target.value })}
          placeholder="Liste os medicamentos, doses e periodicidade…"
        />
      </FieldGroup>

      {/* Upload visual sem funcionalidade real */}
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-2 text-gray-400 cursor-pointer hover:border-blue-300 transition-colors">
        <Upload size={28} />
        <span className="text-sm font-medium">Toque para anexar laudo (PDF ou imagem)</span>
        <span className="text-xs">Funcionalidade disponível em breve</span>
      </div>
    </div>
  );
};

const Step5: React.FC<{ formData: Partial<NAssessment>; onChange: (d: Partial<NAssessment>) => void }> = ({
  formData, onChange,
}) => {
  useEffect(() => {
    const cls = classifySono(formData);
    if (cls !== formData.sono_classificacao) onChange({ sono_classificacao: cls });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.sono_qualidade, formData.sono_acorda_noite]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Horário que dorme">
          <Input
            type="time"
            value={formData.sono_horario_dorme ?? ''}
            onChange={(e) => onChange({ sono_horario_dorme: e.target.value })}
          />
        </FieldGroup>
        <FieldGroup label="Horário que acorda">
          <Input
            type="time"
            value={formData.sono_horario_acorda ?? ''}
            onChange={(e) => onChange({ sono_horario_acorda: e.target.value })}
          />
        </FieldGroup>
      </div>

      <FieldGroup label="Qualidade do sono">
        <SegBtn
          options={['Dorme bem', 'Irregular', 'Não dorme bem']}
          value={formData.sono_qualidade}
          onChange={(v) => onChange({ sono_qualidade: v })}
        />
      </FieldGroup>

      <FieldGroup label="Ronca?">
        <Toggle
          value={formData.sono_ronca}
          onChange={(v) => onChange({ sono_ronca: v })}
        />
      </FieldGroup>

      <FieldGroup label="Acorda à noite?">
        <SegBtn
          options={['Frequentemente', 'Às vezes', 'Não']}
          value={formData.sono_acorda_noite}
          onChange={(v) => onChange({ sono_acorda_noite: v })}
        />
      </FieldGroup>

      {formData.sono_classificacao === 'INADEQUADO' && (
        <Banner color="orange">
          Padrão de sono inadequado identificado — considere orientações específicas na conduta.
        </Banner>
      )}
    </div>
  );
};

const FREQ_OPTIONS = ['Nunca', 'Raramente', '1-2x/semana', '3-4x/semana', 'Diário'];

const Step6: React.FC<{ formData: Partial<NAssessment>; onChange: (d: Partial<NAssessment>) => void }> = ({
  formData, onChange,
}) => (
  <div className="space-y-5">
    <p className="text-sm font-bold text-slate-700">Recordatório 24h — o que comeu ontem?</p>
    {[
      { label: 'Café da manhã', field: 'r24h_cafe' as keyof NAssessment },
      { label: 'Lanche da manhã', field: 'r24h_lanche_manha' as keyof NAssessment },
      { label: 'Almoço', field: 'r24h_almoco' as keyof NAssessment },
      { label: 'Lanche da tarde', field: 'r24h_lanche_tarde' as keyof NAssessment },
      { label: 'Jantar / Ceia', field: 'r24h_jantar' as keyof NAssessment },
    ].map(({ label, field }) => (
      <FieldGroup key={field} label={label}>
        <Textarea
          rows={2}
          value={(formData[field] as string) ?? ''}
          onChange={(e) => onChange({ [field]: e.target.value })}
          placeholder={`Descreva o ${label.toLowerCase()}…`}
        />
      </FieldGroup>
    ))}

    <p className="text-sm font-bold text-slate-700 pt-2">Frequência semanal</p>
    {[
      { label: 'Frutas', field: 'consumo_frutas' },
      { label: 'Verduras', field: 'consumo_verduras' },
      { label: 'Legumes', field: 'consumo_legumes' },
      { label: 'Feijão', field: 'consumo_feijao' },
      { label: 'Leite / Derivados', field: 'consumo_leite' },
    ].map(({ label, field }) => (
      <FieldGroup key={field} label={label}>
        <Select
          options={FREQ_OPTIONS}
          value={(formData as any)[field] ?? ''}
          onChange={(e) => onChange({ [field]: e.target.value })}
        />
      </FieldGroup>
    ))}

    <FieldGroup label="Água (litros/dia)">
      <Input
        type="number"
        step="0.1"
        min="0"
        max="10"
        value={formData.consumo_agua_litros ?? ''}
        onChange={(e) => onChange({ consumo_agua_litros: parseFloat(e.target.value) || undefined })}
        placeholder="Ex: 1.5"
      />
    </FieldGroup>

    <p className="text-sm font-bold text-slate-700 pt-2">Ultraprocessados</p>
    {[
      { label: 'Refrigerante', field: 'consumo_refrigerante' },
      { label: 'Salgadinho', field: 'consumo_salgadinho' },
      { label: 'Bolacha recheada', field: 'consumo_bolacha' },
      { label: 'Fast food', field: 'consumo_fastfood' },
      { label: 'Doces', field: 'consumo_doces' },
    ].map(({ label, field }) => (
      <FieldGroup key={field} label={label}>
        <Select
          options={FREQ_OPTIONS}
          value={(formData as any)[field] ?? ''}
          onChange={(e) => onChange({ [field]: e.target.value })}
        />
      </FieldGroup>
    ))}
  </div>
);

const Step7: React.FC<{ formData: Partial<NAssessment>; onChange: (d: Partial<NAssessment>) => void }> = ({
  formData, onChange,
}) => (
  <div className="space-y-5">
    <FieldGroup label="Come sozinho">
      <SegBtn
        options={['Sim', 'Com ajuda parcial', 'Ajuda total']}
        value={formData.come_sozinho}
        onChange={(v) => onChange({ come_sozinho: v })}
      />
    </FieldGroup>
    <FieldGroup label="Aceita novos alimentos">
      <SegBtn
        options={['Sim', 'Às vezes', 'Não']}
        value={formData.aceita_novos_alimentos}
        onChange={(v) => onChange({ aceita_novos_alimentos: v })}
      />
    </FieldGroup>
    <FieldGroup label="Seletividade alimentar">
      <SegBtn
        options={['Ausente', 'Leve', 'Moderada', 'Severa']}
        value={formData.seletividade_alimentar}
        onChange={(v) => onChange({ seletividade_alimentar: v })}
      />
    </FieldGroup>
    <FieldGroup label="Mastigação">
      <SegBtn
        options={['Normal', 'Com dificuldade']}
        value={formData.dificuldade_mastigacao === true ? 'Com dificuldade' : formData.dificuldade_mastigacao === false ? 'Normal' : undefined}
        onChange={(v) => onChange({ dificuldade_mastigacao: v === 'Com dificuldade' })}
      />
    </FieldGroup>
    <FieldGroup label="Deglutição">
      <SegBtn
        options={['Normal', 'Com dificuldade']}
        value={formData.dificuldade_degluticao === true ? 'Com dificuldade' : formData.dificuldade_degluticao === false ? 'Normal' : undefined}
        onChange={(v) => onChange({ dificuldade_degluticao: v === 'Com dificuldade' })}
      />
    </FieldGroup>
    <FieldGroup label="Avaliação geral do comportamento">
      <Select
        options={['Excelente', 'Boa', 'Regular', 'Ruim']}
        value={formData.avaliacao_comportamento ?? ''}
        onChange={(e) => onChange({ avaliacao_comportamento: e.target.value })}
      />
    </FieldGroup>
  </div>
);

const Step8: React.FC<{ formData: Partial<NAssessment>; onChange: (d: Partial<NAssessment>) => void }> = ({
  formData, onChange,
}) => (
  <div className="space-y-5">
    {formData.tem_nae && (
      <Banner color="orange">
        Este aluno tem NAE ativo — verifique o Módulo NAE para restrições alimentares.
      </Banner>
    )}
    <FieldGroup label="Consome alimentação PNAE?">
      <SegBtn
        options={['Sempre', 'Frequentemente', 'Às vezes', 'Nunca']}
        value={formData.consome_pnae}
        onChange={(v) => onChange({ consome_pnae: v })}
      />
    </FieldGroup>
    {formData.consome_pnae && formData.consome_pnae !== 'Sempre' && (
      <FieldGroup label="Motivo de não consumir sempre">
        <Select
          options={['Não gosta', 'Leva lanche de casa', 'Restrição alimentar', 'Falta de apetite', 'Outro']}
          value={formData.motivo_nao_consome_pnae ?? ''}
          onChange={(e) => onChange({ motivo_nao_consome_pnae: e.target.value })}
        />
      </FieldGroup>
    )}
    <FieldGroup label="Preparações favoritas na escola">
      <Textarea
        value={formData.preparacoes_favoritas ?? ''}
        onChange={(e) => onChange({ preparacoes_favoritas: e.target.value })}
      />
    </FieldGroup>
    <FieldGroup label="Preparações que rejeita">
      <Textarea
        value={formData.preparacoes_rejeitadas ?? ''}
        onChange={(e) => onChange({ preparacoes_rejeitadas: e.target.value })}
      />
    </FieldGroup>
  </div>
);

const Step9: React.FC<{ formData: Partial<NAssessment>; onChange: (d: Partial<NAssessment>) => void }> = ({
  formData, onChange,
}) => (
  <div className="space-y-5">
    <FieldGroup label="Pratica atividade física?">
      <Toggle value={formData.pratica_atividade_fisica} onChange={(v) => onChange({ pratica_atividade_fisica: v })} />
    </FieldGroup>
    {formData.pratica_atividade_fisica && (
      <>
        <FieldGroup label="Qual atividade?">
          <Input
            value={formData.atividade_fisica_tipo ?? ''}
            onChange={(e) => onChange({ atividade_fisica_tipo: e.target.value })}
            placeholder="Ex: Futebol, natação, dança…"
          />
        </FieldGroup>
        <FieldGroup label="Frequência">
          <Select
            options={['1x/semana', '2-3x/semana', '4+x/semana']}
            value={formData.atividade_fisica_frequencia ?? ''}
            onChange={(e) => onChange({ atividade_fisica_frequencia: e.target.value })}
          />
        </FieldGroup>
      </>
    )}
    <FieldGroup label="Tempo de tela diário">
      <SegBtn
        options={['Menos de 2h', '2 a 4h', 'Mais de 4h']}
        value={formData.tempo_tela}
        onChange={(v) => onChange({ tempo_tela: v })}
      />
    </FieldGroup>
  </div>
);

const EBIA_BADGE: Record<string, string> = {
  'Segurança alimentar': 'bg-green-50 text-green-800',
  'Insegurança leve': 'bg-yellow-50 text-yellow-800',
  'Insegurança moderada': 'bg-orange-50 text-orange-800',
  'Insegurança grave': 'bg-red-50 text-red-800',
};

const Step10: React.FC<{ formData: Partial<NAssessment>; onChange: (d: Partial<NAssessment>) => void }> = ({
  formData, onChange,
}) => {
  useEffect(() => {
    const cls = calcEBIA(formData);
    if (cls !== formData.classificacao_ebia) onChange({ classificacao_ebia: cls });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.dificuldade_aquisicao_alimentos,
    formData.recebe_beneficio_social,
    formData.faltou_alimento_em_casa,
    formData.crianca_deixa_refeicoes,
  ]);

  return (
    <div className="space-y-5">
      <Banner color="yellow">
        As respostas são confidenciais e usadas apenas para fins nutricionais e políticas públicas.
      </Banner>
      {[
        { label: 'Existe dificuldade para aquisição de alimentos?', field: 'dificuldade_aquisicao_alimentos' as keyof NAssessment },
        { label: 'Recebe benefícios sociais (Bolsa Família / BPC)?', field: 'recebe_beneficio_social' as keyof NAssessment },
        { label: 'Já faltou alimento em casa?', field: 'faltou_alimento_em_casa' as keyof NAssessment },
        { label: 'A criança deixa de realizar refeições por falta de alimento?', field: 'crianca_deixa_refeicoes' as keyof NAssessment },
      ].map(({ label, field }) => (
        <FieldGroup key={field} label={label}>
          <Toggle
            value={formData[field] as boolean | undefined}
            onChange={(v) => onChange({ [field]: v })}
          />
        </FieldGroup>
      ))}
      {formData.classificacao_ebia && (
        <div className="flex items-center gap-2 pt-2">
          <span className="text-sm font-semibold text-slate-600">Classificação EBIA:</span>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${EBIA_BADGE[formData.classificacao_ebia] ?? 'bg-gray-100 text-gray-600'}`}>
            {formData.classificacao_ebia}
          </span>
        </div>
      )}
    </div>
  );
};

const Step11: React.FC<{ formData: Partial<NAssessment>; onChange: (d: Partial<NAssessment>) => void }> = ({
  formData, onChange,
}) => {
  if (!formData.tem_tea) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-gray-400" />
          </div>
          <p className="font-bold text-gray-700 text-base mb-2">Esta etapa não se aplica a este aluno</p>
          <p className="text-gray-500 text-sm mb-5 max-w-xs mx-auto">O perfil sensorial TEA só é habilitado quando o diagnóstico de TEA está marcado na etapa 4 (Condições de saúde).</p>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-500 text-white rounded-xl text-sm font-semibold cursor-pointer hover:bg-purple-600 transition-colors"
            onClick={() => onChange({ condicoes_saude: [...(formData.condicoes_saude ?? []), 'TEA'], tem_tea: true })}
          >
            <Check size={14} />
            Marcar TEA e habilitar esta etapa
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <Banner color="purple" icon={<AlertCircle size={16} />}>
        🧠 Perfil sensorial habilitado — TEA identificado na Etapa 4. Preencha com atenção — estas informações são essenciais para o plano alimentar escolar.
      </Banner>
      <FieldGroup label="Texturas aceitas">
        <Pills
          options={['Pastosa', 'Mole', 'Crocante', 'Firme', 'Pegajosa', 'Grumosa', 'Líquida']}
          value={formData.tea_texturas_aceitas ?? []}
          onChange={(v) => onChange({ tea_texturas_aceitas: v })}
        />
      </FieldGroup>
      <FieldGroup label="Temperatura preferida">
        <SegBtn
          options={['Frios', 'Temperatura ambiente', 'Quentes', 'Indiferente']}
          value={formData.tea_temperatura_preferida}
          onChange={(v) => onChange({ tea_temperatura_preferida: v })}
        />
      </FieldGroup>
      <FieldGroup label="Neofobia alimentar">
        <SegBtn
          options={['Ausente', 'Leve', 'Moderada', 'Severa']}
          value={formData.tea_neofobia}
          onChange={(v) => onChange({ tea_neofobia: v })}
        />
      </FieldGroup>
      <FieldGroup label="Rituais alimentares">
        <Pills
          options={['Alimentos não podem se tocar', 'Cor específica', 'Utensílio fixo', 'Mesma sequência', 'Local fixo', 'Tempo fixo']}
          value={formData.tea_rituais ?? []}
          onChange={(v) => onChange({ tea_rituais: v })}
        />
      </FieldGroup>
      <FieldGroup label="Observações do perfil sensorial">
        <Textarea
          value={formData.tea_obs ?? ''}
          onChange={(e) => onChange({ tea_obs: e.target.value })}
        />
      </FieldGroup>
    </div>
  );
};

const Step12: React.FC<{
  formData: Partial<NAssessment>;
  student: Student | null;
  onChange: (d: Partial<NAssessment>) => void;
  onFinalize: () => void;
  isSaving: boolean;
}> = ({ formData, student, onChange, onFinalize, isSaving }) => {
  const [geminiLoading, setGeminiLoading] = useState(false);

  const handleGemini = async () => {
    if (!student) return;
    setGeminiLoading(true);
    try {
      const prompt = [
        `Aluno: ${student.nome_completo}`,
        `IMC: ${formData.imc ?? 'N/D'} — ${formData.imc_classificacao ?? ''}`,
        `Diagnóstico nutricional: ${formData.diagnostico_nutricional ?? 'N/D'}`,
        `Condições de saúde: ${(formData.condicoes_saude ?? []).join(', ') || 'Nenhuma'}`,
        `TEA: ${formData.tem_tea ? 'Sim' : 'Não'}`,
        `EBIA: ${formData.classificacao_ebia ?? 'N/D'}`,
        `Sono: ${formData.sono_classificacao ?? 'N/D'}`,
        `Atividade física: ${formData.pratica_atividade_fisica ? `Sim — ${formData.atividade_fisica_tipo ?? ''}` : 'Não'}`,
        `Condutas selecionadas: ${(formData.condutas ?? []).join(', ') || 'Nenhuma'}`,
        '',
        'Gere orientações nutricionais objetivas e práticas para a família deste aluno, considerando o contexto escolar e as políticas do PNAE.',
      ].join('\n');

      const result = await GeminiService.generateOfficialDocument(
        'orientacao_nutricional',
        student,
        'Nutricionista',
        'SPECIALIST',
        prompt,
      );
      onChange({ gemini_orientacao: result });
    } catch {
      // silenciar — usuário pode digitar manualmente
    } finally {
      setGeminiLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <FieldGroup label="Diagnóstico nutricional">
        <Select
          options={['Magreza acentuada', 'Magreza', 'Eutrofia', 'Sobrepeso', 'Obesidade', 'Obesidade grave']}
          value={formData.diagnostico_nutricional ?? ''}
          onChange={(e) => onChange({ diagnostico_nutricional: e.target.value })}
        />
      </FieldGroup>

      <FieldGroup label="Condutas">
        <Pills
          options={[
            'Educação alimentar',
            'Orientação à família',
            'Encaminhamento para unidade de saúde',
            'Solicitação de laudo',
            'Inclusão em dieta especial PNAE',
            'Monitoramento antropométrico',
          ]}
          value={formData.condutas ?? []}
          onChange={(v) => onChange({ condutas: v })}
        />
      </FieldGroup>

      <FieldGroup label="Orientações">
        <Textarea
          rows={4}
          value={formData.orientacoes ?? ''}
          onChange={(e) => onChange({ orientacoes: e.target.value })}
          placeholder="Descreva as orientações para o aluno e família…"
        />
      </FieldGroup>

      <FieldGroup label="Próxima avaliação">
        <Input
          type="date"
          value={formData.proxima_avaliacao ?? ''}
          onChange={(e) => onChange({ proxima_avaliacao: e.target.value })}
        />
      </FieldGroup>

      <div className="space-y-3">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
            <Sparkles size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-blue-800 mb-0.5">Gerar orientação com Gemini</p>
            <p className="text-xs text-blue-600">Orientação nutricional personalizada com base nos dados desta anamnese</p>
          </div>
          <button
            type="button"
            onClick={handleGemini}
            disabled={geminiLoading || !student}
            className="shrink-0 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
          >
            {geminiLoading ? 'Gerando…' : 'Gerar'}
          </button>
        </div>
        {formData.gemini_orientacao && (
          <Textarea
            rows={5}
            value={formData.gemini_orientacao}
            onChange={(e) => onChange({ gemini_orientacao: e.target.value })}
            className="bg-blue-50 border-blue-200"
          />
        )}
      </div>

      <button
        type="button"
        onClick={onFinalize}
        disabled={isSaving}
        className="w-full py-4 bg-[#F97316] hover:bg-orange-600 text-white rounded-2xl font-bold text-base transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSaving ? <><Clock size={16} className="animate-spin" /> Salvando…</> : <><CheckCircle size={16} /> Finalizar e salvar</>}
      </button>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const NutritionAssessmentPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const studentIdParam = searchParams.get('studentId') ?? undefined;
  const assessmentIdParam = searchParams.get('id') ?? undefined;

  const [currentStep, setCurrentStep] = useState(0);
  const [assessmentId, setAssessmentId] = useState<string | null>(assessmentIdParam ?? null);
  const [formData, setFormData] = useState<Partial<NAssessment>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstSave = useRef(true);

  // Carregar student
  useEffect(() => {
    if (studentIdParam) {
      SupabaseService.getStudentById?.(studentIdParam)
        .then((s) => { if (s) setStudent(s); })
        .catch(() => {});
    }
  }, [studentIdParam]);

  // Carregar assessment existente
  useEffect(() => {
    if (assessmentIdParam) {
      SupabaseService.getNutritionAssessmentById(assessmentIdParam).then((a) => {
        if (a) {
          setFormData(a);
          isFirstSave.current = false;
        }
      }).catch(() => {});
    }
  }, [assessmentIdParam]);

  const handleChange = useCallback((delta: Partial<NAssessment>) => {
    setFormData((prev) => ({ ...prev, ...delta }));
  }, []);

  // Auto-save com debounce 2s
  useEffect(() => {
    if (!user?.id) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (isSaving) return;
      try {
        if (isFirstSave.current || !assessmentId) {
          const payload: Partial<NAssessment> = {
            ...formData,
            professional_id: user.id,
            student_id: studentIdParam ?? formData.student_id,
            status: 'RASCUNHO',
          };
          if (!payload.student_id) return;
          setIsSaving(true);
          const created = await SupabaseService.createNutritionAssessment(payload);
          setAssessmentId(created.id);
          isFirstSave.current = false;
        } else {
          setIsSaving(true);
          await SupabaseService.updateNutritionAssessment(assessmentId, formData);
        }
      } catch {
        // silenciar auto-save errors
      } finally {
        setIsSaving(false);
      }
    }, 2000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  const handleFinalize = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const finalData: Partial<NAssessment> = {
        ...formData,
        status: 'FINALIZADA',
        professional_id: user.id,
        student_id: studentIdParam ?? formData.student_id,
      };

      if (assessmentId) {
        await SupabaseService.updateNutritionAssessment(assessmentId, finalData);
      } else if (finalData.student_id) {
        await SupabaseService.createNutritionAssessment(finalData);
      }

      // Registrar histórico antropométrico
      if (formData.peso_kg && formData.altura_m && (studentIdParam ?? formData.student_id)) {
        await SupabaseService.addAnthropometryRecord({
          student_id: studentIdParam ?? formData.student_id!,
          professional_id: user.id,
          peso_kg: formData.peso_kg,
          altura_m: formData.altura_m,
          imc_classificacao: formData.imc_classificacao,
          circunferencia_cintura_cm: formData.circunferencia_cintura_cm,
          circunferencia_braco_cm: formData.circunferencia_braco_cm,
        });
      }

      navigate('/nutricion/dashboard');
    } catch {
      // mostrar erro se quiser no futuro
    } finally {
      setIsSaving(false);
    }
  };

  const progress = Math.round(((currentStep + 1) / 12) * 100);

  const renderStep = () => {
    const p = { formData, onChange: handleChange };
    switch (currentStep) {
      case 0: return <Step1 {...p} student={student} />;
      case 1: return <Step2 {...p} />;
      case 2: return <Step3 {...p} />;
      case 3: return <Step4 {...p} />;
      case 4: return <Step5 {...p} />;
      case 5: return <Step6 {...p} />;
      case 6: return <Step7 {...p} />;
      case 7: return <Step8 {...p} />;
      case 8: return <Step9 {...p} />;
      case 9: return <Step10 {...p} />;
      case 10: return <Step11 {...p} />;
      case 11: return (
        <Step12
          formData={formData}
          student={student}
          onChange={handleChange}
          onFinalize={handleFinalize}
          isSaving={isSaving}
        />
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Header fixo */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate('/nutricion/dashboard')}
          className="p-2 rounded-lg hover:bg-gray-100 text-slate-500 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Avaliação nutricional</p>
          {student && (
            <p className="text-sm font-semibold text-slate-700 truncate">{student.nome_completo}</p>
          )}
        </div>
        {isSaving && (
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Save size={12} className="animate-pulse" />
            Salvando…
          </div>
        )}
      </div>

      {/* Barra de progresso */}
      <div className="bg-white border-b border-gray-100 px-4 pb-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5 pt-2">
          <span className="font-semibold">{STEP_TITLES[currentStep]}</span>
          <span>Etapa {currentStep + 1} de 12 — {progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tabs de navegação */}
      <div className="bg-white border-b border-gray-100 overflow-x-auto">
        <div className="flex gap-1 px-3 py-2 min-w-max">
          {STEP_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                i === currentStep
                  ? 'bg-blue-500 text-white shadow-sm'
                  : i < currentStep
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              {i < currentStep
                ? <span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center" style={{fontSize: '9px'}}><Check size={9} /></span>
                : <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${i === currentStep ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-500'}`}>{i + 1}</span>
              }
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo da etapa */}
      <div className="flex-1 overflow-y-auto p-4 pb-28 max-w-2xl mx-auto w-full">
        {renderStep()}
      </div>

      {/* Rodapé de navegação fixo — sempre visível */}
      {currentStep < 11 && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t-2 border-gray-100 px-4 py-4 flex gap-3 max-w-2xl mx-auto" style={{paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'}}>
          <button
            type="button"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((s) => s - 1)}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-slate-600 font-semibold text-sm hover:bg-gray-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep((s) => s + 1)}
            className="flex-2 flex-grow-[2] py-3 rounded-xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            Próxima etapa
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default NutritionAssessmentPage;

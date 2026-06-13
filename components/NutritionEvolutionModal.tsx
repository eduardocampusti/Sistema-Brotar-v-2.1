import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseService } from '../services/SupabaseService';
import type { NutritionEvolution } from '../types';

// ─── props ────────────────────────────────────────────────────────────────────

export interface NutritionEvolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  assessmentId?: string;
  onSaved?: () => void;
}

// ─── UI primitives ────────────────────────────────────────────────────────────

const FieldGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <p className="text-sm font-semibold text-slate-700">{label}</p>
    {children}
  </div>
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ rows = 3, ...props }) => (
  <textarea
    rows={rows}
    {...props}
    className={`w-full rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 px-3 py-2 text-sm outline-none resize-none transition ${props.className ?? ''}`}
  />
);

const Toggle: React.FC<{
  label: string;
  value?: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-sm text-slate-700 flex-1 pr-3">{label}</span>
    <div className="flex gap-2 shrink-0">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
            value === v
              ? v
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-slate-500 text-white border-slate-500'
              : 'bg-white text-slate-500 border-gray-200 hover:border-slate-300'
          }`}
        >
          {v ? 'Sim' : 'Não'}
        </button>
      ))}
    </div>
  </div>
);

// ─── Slider 0-10 ─────────────────────────────────────────────────────────────

const ScoreSlider: React.FC<{
  label: string;
  value?: number;
  onChange: (v: number) => void;
}> = ({ label, value, onChange }) => {
  const val = value ?? 5;
  const pct = (val / 10) * 100;
  const color =
    val <= 3 ? '#EF4444' : val <= 6 ? '#F59E0B' : '#10B981';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <span
          className="text-sm font-extrabold tabular-nums w-6 text-right"
          style={{ color }}
        >
          {val}
        </span>
      </div>
      <div className="relative h-2 bg-gray-100 rounded-full">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-150"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={val}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full appearance-none h-2 rounded-full cursor-pointer opacity-0 -mt-4 relative z-10"
        style={{ height: '1.5rem' }}
      />
    </div>
  );
};

// ─── SECTION HEADER ──────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-2 pb-1 border-t border-gray-50">
    {children}
  </p>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const NutritionEvolutionModal: React.FC<NutritionEvolutionModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
  assessmentId,
  onSaved,
}) => {
  const { user } = useAuth();
  const [form, setForm] = useState<Partial<NutritionEvolution>>({
    aceitacao_alimentar: 5,
    consumo_frutas_score: 5,
    consumo_verduras_score: 5,
    hidratacao_score: 5,
    participacao_pnae_score: 5,
  });
  const [saving, setSaving] = useState(false);

  const set = (delta: Partial<NutritionEvolution>) =>
    setForm((p) => ({ ...p, ...delta }));

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await SupabaseService.createNutritionEvolution({
        ...form,
        student_id: studentId,
        professional_id: user.id,
        assessment_id: assessmentId,
        data_retorno: new Date().toISOString().split('T')[0],
      });
      onSaved?.();
      onClose();
    } catch {
      // silenciar — usuário pode tentar novamente
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal */}
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Evolução — <span className="text-blue-600">{studentName}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{today}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-slate-400 transition-colors -mt-1 -mr-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Seção 1 — Evolução alimentar */}
          <SectionHeader>Evolução alimentar</SectionHeader>

          <FieldGroup label="Novos alimentos aceitos">
            <Textarea
              value={form.novos_alimentos_aceitos ?? ''}
              onChange={(e) => set({ novos_alimentos_aceitos: e.target.value })}
              placeholder="Descreva os alimentos introduzidos com sucesso…"
              rows={2}
            />
          </FieldGroup>

          <FieldGroup label="Alimentos ainda recusados">
            <Textarea
              value={form.alimentos_recusados ?? ''}
              onChange={(e) => set({ alimentos_recusados: e.target.value })}
              placeholder="Liste os alimentos que continuam sendo recusados…"
              rows={2}
            />
          </FieldGroup>

          <FieldGroup label="Comportamento durante as refeições">
            <Textarea
              value={form.comportamento_refeicoes ?? ''}
              onChange={(e) => set({ comportamento_refeicoes: e.target.value })}
              placeholder="Descreva o comportamento geral nas refeições…"
              rows={2}
            />
          </FieldGroup>

          <Toggle
            label="Houve redução de pressão alimentar pela família?"
            value={form.reducao_pressao_alimentar}
            onChange={(v) => set({ reducao_pressao_alimentar: v })}
          />

          {/* Seção 2 — Rotina */}
          <SectionHeader>Rotina</SectionHeader>

          <FieldGroup label="Mudanças realizadas pela família">
            <Textarea
              value={form.mudancas_familia ?? ''}
              onChange={(e) => set({ mudancas_familia: e.target.value })}
              placeholder="Descreva as mudanças de hábito em casa…"
              rows={2}
            />
          </FieldGroup>

          <Toggle
            label="Uso de telas durante as refeições?"
            value={form.uso_telas_refeicoes}
            onChange={(v) => set({ uso_telas_refeicoes: v })}
          />

          {/* Seção 3 — Indicadores 0-10 */}
          <SectionHeader>Indicadores (0 a 10)</SectionHeader>

          <ScoreSlider
            label="Aceitação alimentar"
            value={form.aceitacao_alimentar}
            onChange={(v) => set({ aceitacao_alimentar: v })}
          />
          <ScoreSlider
            label="Consumo de frutas"
            value={form.consumo_frutas_score}
            onChange={(v) => set({ consumo_frutas_score: v })}
          />
          <ScoreSlider
            label="Consumo de verduras"
            value={form.consumo_verduras_score}
            onChange={(v) => set({ consumo_verduras_score: v })}
          />
          <ScoreSlider
            label="Hidratação"
            value={form.hidratacao_score}
            onChange={(v) => set({ hidratacao_score: v })}
          />
          <ScoreSlider
            label="Participação na alimentação escolar (PNAE)"
            value={form.participacao_pnae_score}
            onChange={(v) => set({ participacao_pnae_score: v })}
          />

          {/* Seção 4 — Orientações */}
          <SectionHeader>Orientações e objetivos</SectionHeader>

          <FieldGroup label="Orientações realizadas nesta consulta">
            <Textarea
              value={form.orientacoes_realizadas ?? ''}
              onChange={(e) => set({ orientacoes_realizadas: e.target.value })}
              placeholder="Descreva as orientações dadas à família e ao aluno…"
            />
          </FieldGroup>

          <FieldGroup label="Objetivos para o próximo retorno">
            <Textarea
              value={form.objetivos_proximo_retorno ?? ''}
              onChange={(e) => set({ objetivos_proximo_retorno: e.target.value })}
              placeholder="Metas a serem alcançadas até o próximo retorno…"
              rows={2}
            />
          </FieldGroup>

          <FieldGroup label="Observações gerais">
            <Textarea
              value={form.observacoes_gerais ?? ''}
              onChange={(e) => set({ observacoes_gerais: e.target.value })}
              placeholder="Informações adicionais relevantes…"
              rows={2}
            />
          </FieldGroup>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-[2] py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={15} />
            {saving ? 'Salvando…' : 'Salvar evolução'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NutritionEvolutionModal;

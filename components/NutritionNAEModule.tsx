import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Plus, AlertCircle, AlertTriangle, Edit2,
  Check, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseService } from '../services/SupabaseService';
import type { NutritionNAE } from '../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const GRAVIDADE_BADGE: Record<string, string> = {
  LEVE: 'bg-green-50 text-green-700 border-green-200',
  MODERADA: 'bg-orange-50 text-orange-700 border-orange-200',
  GRAVE: 'bg-red-50 text-red-700 border-red-200',
};

// ─── UI primitives ────────────────────────────────────────────────────────────

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm font-semibold text-slate-700 mb-1.5">{children}</p>
);

const FieldGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
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

const SelField: React.FC<{ label: string; value?: string; options: string[]; onChange: (v: string) => void }> = ({
  label, value, options, onChange,
}) => (
  <FieldGroup label={label}>
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-200 focus:border-blue-500 px-3 py-2 text-sm outline-none bg-white"
    >
      <option value="">Selecione…</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </FieldGroup>
);

const Toggle: React.FC<{
  label: string;
  value?: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-sm text-slate-700">{label}</span>
    <div className="flex gap-2">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
            value === v
              ? v ? 'bg-green-500 text-white border-green-500' : 'bg-slate-500 text-white border-slate-500'
              : 'bg-white text-slate-500 border-gray-200 hover:border-slate-300'
          }`}
        >
          {v ? 'Sim' : 'Não'}
        </button>
      ))}
    </div>
  </div>
);

// ─── NAE Form ─────────────────────────────────────────────────────────────────

const TIPO_OPTIONS = [
  'Alergia alimentar',
  'Intolerância à lactose',
  'Doença celíaca',
  'Diabetes',
  'Hipertensão',
  'TEA com seletividade',
  'Desnutrição',
  'Obesidade',
  'Outro',
];

interface NAEFormProps {
  initialData?: Partial<NutritionNAE>;
  studentId: string;
  professionalId: string;
  onSave: (nae: NutritionNAE) => void;
  onCancel: () => void;
}

const NAEForm: React.FC<NAEFormProps> = ({ initialData, studentId, professionalId, onSave, onCancel }) => {
  const [form, setForm] = useState<Partial<NutritionNAE>>({
    student_id: studentId,
    professional_id: professionalId,
    status: 'ATIVO',
    ...initialData,
  });
  const [saving, setSaving] = useState(false);

  const set = (delta: Partial<NutritionNAE>) => setForm((p) => ({ ...p, ...delta }));

  const handleSave = async () => {
    if (!form.tipo || !form.gravidade) return;
    setSaving(true);
    try {
      let result: NutritionNAE;
      if (form.id) {
        result = await SupabaseService.updateNAE(form.id, form);
      } else {
        result = await SupabaseService.createNAE(form as Partial<NutritionNAE>);
      }
      onSave(result);
    } catch {
      // silenciar
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelField
          label="Tipo de necessidade"
          value={form.tipo}
          options={TIPO_OPTIONS}
          onChange={(v) => set({ tipo: v })}
        />
        <SelField
          label="Gravidade"
          value={form.gravidade}
          options={['LEVE', 'MODERADA', 'GRAVE']}
          onChange={(v) => set({ gravidade: v as NutritionNAE['gravidade'] })}
        />
      </div>

      <FieldGroup label="Alimentos proibidos">
        <Textarea
          value={form.alimentos_proibidos ?? ''}
          onChange={(e) => set({ alimentos_proibidos: e.target.value })}
          placeholder="Liste os alimentos que devem ser evitados…"
        />
      </FieldGroup>

      <FieldGroup label="Alimentos permitidos">
        <Textarea
          value={form.alimentos_permitidos ?? ''}
          onChange={(e) => set({ alimentos_permitidos: e.target.value })}
          placeholder="Liste os alimentos seguros…"
        />
      </FieldGroup>

      <div className="space-y-2 bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Cuidados necessários</p>
        <Toggle label="Risco de contaminação cruzada" value={form.contaminacao_cruzada} onChange={(v) => set({ contaminacao_cruzada: v })} />
        <Toggle label="Utensílios exclusivos" value={form.utensilios_exclusivos} onChange={(v) => set({ utensilios_exclusivos: v })} />
        <Toggle label="Alimentação de casa" value={form.alimentacao_de_casa} onChange={(v) => set({ alimentacao_de_casa: v })} />
        <Toggle label="Monitoramento individual" value={form.monitoramento_individual} onChange={(v) => set({ monitoramento_individual: v })} />
      </div>

      <Toggle label="Laudo médico presente?" value={form.laudo_presente} onChange={(v) => set({ laudo_presente: v })} />

      {form.laudo_presente && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white rounded-lg border border-gray-200 p-4">
          <FieldGroup label="Data do laudo">
            <Input type="date" value={form.laudo_data ?? ''} onChange={(e) => set({ laudo_data: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Validade do laudo">
            <Input type="date" value={form.laudo_validade ?? ''} onChange={(e) => set({ laudo_validade: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Médico responsável">
            <Input value={form.laudo_medico ?? ''} onChange={(e) => set({ laudo_medico: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="CRM">
            <Input value={form.laudo_crm ?? ''} onChange={(e) => set({ laudo_crm: e.target.value })} />
          </FieldGroup>
          <div className="sm:col-span-2">
            <FieldGroup label="Observações do laudo">
              <Textarea rows={2} value={form.laudo_obs ?? ''} onChange={(e) => set({ laudo_obs: e.target.value })} />
            </FieldGroup>
          </div>
        </div>
      )}

      <FieldGroup label="Plano alimentar na escola">
        <Textarea
          value={form.plano_alimentar_escola ?? ''}
          onChange={(e) => set({ plano_alimentar_escola: e.target.value })}
          placeholder="Descreva as adaptações necessárias na alimentação escolar…"
        />
      </FieldGroup>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !form.tipo || !form.gravidade}
          className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Check size={15} />
          {saving ? 'Salvando…' : 'Salvar NAE'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 bg-gray-100 text-slate-600 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <X size={15} />
          Cancelar
        </button>
      </div>
    </div>
  );
};

// ─── NAE Card ─────────────────────────────────────────────────────────────────

const NAECard: React.FC<{
  nae: NutritionNAE & { students?: { nome_completo?: string } };
  onEdit: () => void;
}> = ({ nae, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const days = daysUntil(nae.laudo_validade);
  const isExpired = days !== null && days < 0;
  const isExpiring = days !== null && days >= 0 && days <= 30;
  const studentName = (nae as any).students?.full_name ?? 'Aluno';

  const chips = [
    nae.contaminacao_cruzada && 'Contam. cruzada',
    nae.utensilios_exclusivos && 'Utensílios exclusivos',
    nae.alimentacao_de_casa && 'Alim. de casa',
    nae.monitoramento_individual && 'Monit. individual',
  ].filter(Boolean) as string[];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center shrink-0">
          {getInitials(studentName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-bold text-slate-800 text-sm">{studentName}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${GRAVIDADE_BADGE[nae.gravidade] ?? ''}`}>
              {nae.gravidade}
            </span>
            {isExpired && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                Laudo vencido
              </span>
            )}
            {isExpiring && !isExpired && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
                Vence em {days}d
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{nae.tipo}</p>
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {chips.map((c) => (
                <span key={c} className="text-[11px] bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-gray-100 text-slate-400 transition-colors"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-2 rounded-lg hover:bg-gray-100 text-slate-400 transition-colors"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-2 text-sm text-slate-600">
          {nae.alimentos_proibidos && (
            <p><span className="font-semibold text-red-600">Proibidos:</span> {nae.alimentos_proibidos}</p>
          )}
          {nae.alimentos_permitidos && (
            <p><span className="font-semibold text-green-600">Permitidos:</span> {nae.alimentos_permitidos}</p>
          )}
          {nae.plano_alimentar_escola && (
            <p><span className="font-semibold">Plano escolar:</span> {nae.plano_alimentar_escola}</p>
          )}
          {nae.laudo_presente && nae.laudo_validade && (
            <p className="text-xs text-slate-400">
              Laudo válido até {fmtDate(nae.laudo_validade)}
              {nae.laudo_medico && ` — Dr(a). ${nae.laudo_medico}`}
              {nae.laudo_crm && ` (CRM ${nae.laudo_crm})`}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────

const NutritionNAEModule: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [naeList, setNaeList] = useState<(NutritionNAE & { students?: { nome_completo?: string } })[]>([]);
  const [expiring, setExpiring] = useState<NutritionNAE[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNae, setEditingNae] = useState<NutritionNAE | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [all, exp] = await Promise.all([
        SupabaseService.getAllActiveNAE(),
        SupabaseService.getExpiredOrExpiringNAE(30),
      ]);
      setNaeList(all as any);
      setExpiring(exp);
    } catch {
      // silenciar
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hoje = new Date().toISOString().split('T')[0];
  const vencidos = expiring.filter((n) => (n.laudo_validade ?? '') < hoje);
  const vencendo = expiring.filter((n) => (n.laudo_validade ?? '') >= hoje);

  const handleSave = (saved: NutritionNAE) => {
    setNaeList((prev) => {
      const idx = prev.findIndex((n) => n.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...saved };
        return next;
      }
      return [saved as any, ...prev];
    });
    setShowForm(false);
    setEditingNae(null);
  };

  const handleEdit = (nae: NutritionNAE) => {
    setEditingNae(nae);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate('/nutricion/dashboard')}
          className="p-2 rounded-lg hover:bg-gray-100 text-slate-500 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="flex-1 text-base font-bold text-slate-800">Módulo NAE</h1>
        <button
          onClick={() => { setEditingNae(null); setShowForm((v) => !v); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-orange-600 text-white rounded-lg font-semibold text-sm transition-colors"
        >
          <Plus size={15} />
          Cadastrar NAE
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4 pb-10">

        {/* Alertas de laudos */}
        {vencidos.length > 0 && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm font-semibold text-red-700">
              {vencidos.length} laudo{vencidos.length > 1 ? 's' : ''} vencido{vencidos.length > 1 ? 's' : ''} — renovação urgente
            </p>
          </div>
        )}
        {vencendo.length > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm font-semibold text-amber-700">
              {vencendo.length} laudo{vencendo.length > 1 ? 's' : ''} vencendo em breve
            </p>
          </div>
        )}

        {/* Formulário inline */}
        {showForm && user && (
          <NAEForm
            initialData={editingNae ?? undefined}
            studentId={(editingNae as any)?.student_id ?? ''}
            professionalId={user.id}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingNae(null); }}
          />
        )}

        {/* Lista de NAEs */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm h-24 animate-pulse" />
            ))}
          </div>
        ) : naeList.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-slate-400">
            <p className="font-semibold">Nenhum NAE ativo cadastrado</p>
            <p className="text-sm mt-1">Clique em "Cadastrar NAE" para adicionar o primeiro</p>
          </div>
        ) : (
          <div className="space-y-3">
            {naeList.map((nae) => (
              <NAECard
                key={nae.id}
                nae={nae}
                onEdit={() => handleEdit(nae)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NutritionNAEModule;

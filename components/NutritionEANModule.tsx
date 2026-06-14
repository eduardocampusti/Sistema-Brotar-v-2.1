import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Plus, ChefHat, Users, Leaf, Megaphone,
  FolderOpen, Star, ChevronDown, ChevronUp, Check, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseService } from '../services/SupabaseService';
import type { NutritionEanActivity, School } from '../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const TIPO_ICON: Record<string, React.ElementType> = {
  OFICINA: ChefHat,
  PALESTRA: Users,
  HORTA: Leaf,
  CAMPANHA: Megaphone,
  PROJETO: FolderOpen,
  SEMANA_ALIMENTACAO: Star,
  OUTRO: Star,
};

const TIPO_COLOR: Record<string, string> = {
  OFICINA: 'bg-orange-50 text-orange-600',
  PALESTRA: 'bg-blue-50 text-blue-600',
  HORTA: 'bg-green-50 text-green-600',
  CAMPANHA: 'bg-red-50 text-red-600',
  PROJETO: 'bg-purple-50 text-purple-600',
  SEMANA_ALIMENTACAO: 'bg-yellow-50 text-yellow-600',
  OUTRO: 'bg-gray-50 text-gray-500',
};

const TIPO_LABEL: Record<string, string> = {
  OFICINA: 'Oficina',
  PALESTRA: 'Palestra',
  HORTA: 'Horta',
  CAMPANHA: 'Campanha',
  PROJETO: 'Projeto',
  SEMANA_ALIMENTACAO: 'Semana Alim.',
  OUTRO: 'Outro',
};

// ─── UI primitives ────────────────────────────────────────────────────────────

const FieldGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <p className="text-sm font-semibold text-slate-700">{label}</p>
    {children}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full rounded-lg border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 px-3 py-2 text-sm outline-none transition ${props.className ?? ''}`}
  />
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ rows = 3, ...props }) => (
  <textarea
    rows={rows}
    {...props}
    className={`w-full rounded-lg border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 px-3 py-2 text-sm outline-none resize-none transition ${props.className ?? ''}`}
  />
);

// ─── EAN Form ─────────────────────────────────────────────────────────────────

const TIPO_OPTIONS: NutritionEanActivity['tipo'][] = [
  'OFICINA', 'PALESTRA', 'PROJETO', 'CAMPANHA', 'HORTA', 'SEMANA_ALIMENTACAO', 'OUTRO',
];

const EANForm: React.FC<{
  professionalId: string;
  schools: School[];
  onSave: (a: NutritionEanActivity) => void;
  onCancel: () => void;
}> = ({ professionalId, schools, onSave, onCancel }) => {
  const [form, setForm] = useState<Partial<NutritionEanActivity>>({
    professional_id: professionalId,
  });
  const [saving, setSaving] = useState(false);

  const set = (d: Partial<NutritionEanActivity>) => setForm((p) => ({ ...p, ...d }));

  const handleSave = async () => {
    if (!form.tipo || !form.titulo || !form.data_atividade) return;
    setSaving(true);
    try {
      const created = await SupabaseService.createEANActivity(form);
      onSave(created);
    } catch {
      // silenciar
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldGroup label="Tipo de atividade">
          <select
            value={form.tipo ?? ''}
            onChange={(e) => set({ tipo: e.target.value as NutritionEanActivity['tipo'] })}
            className="w-full rounded-lg border border-gray-200 focus:border-purple-400 px-3 py-2 text-sm outline-none bg-white"
          >
            <option value="">Selecione…</option>
            {TIPO_OPTIONS.map((t) => (
              <option key={t} value={t}>{TIPO_LABEL[t]}</option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup label="Data da atividade">
          <Input
            type="date"
            value={form.data_atividade ?? ''}
            onChange={(e) => set({ data_atividade: e.target.value })}
          />
        </FieldGroup>
      </div>

      <FieldGroup label="Título">
        <Input
          value={form.titulo ?? ''}
          onChange={(e) => set({ titulo: e.target.value })}
          placeholder="Ex: Oficina de frutas e verduras"
        />
      </FieldGroup>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldGroup label="Escola">
          <select
            value={form.escola_id ?? ''}
            onChange={(e) => set({ escola_id: e.target.value || undefined })}
            className="w-full rounded-lg border border-gray-200 focus:border-purple-400 px-3 py-2 text-sm outline-none bg-white"
          >
            <option value="">Todas / Não especificado</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup label="Público-alvo">
          <Input
            value={form.publico ?? ''}
            onChange={(e) => set({ publico: e.target.value })}
            placeholder="Ex: Alunos do 3º ao 5º ano"
          />
        </FieldGroup>
      </div>

      <FieldGroup label="Número de participantes">
        <Input
          type="number"
          min="0"
          value={form.num_participantes ?? ''}
          onChange={(e) => set({ num_participantes: parseInt(e.target.value) || undefined })}
        />
      </FieldGroup>

      <FieldGroup label="Resultados">
        <Textarea
          value={form.resultados ?? ''}
          onChange={(e) => set({ resultados: e.target.value })}
          placeholder="Descreva os resultados observados…"
        />
      </FieldGroup>

      <FieldGroup label="Observações">
        <Textarea
          value={form.observacoes ?? ''}
          onChange={(e) => set({ observacoes: e.target.value })}
          placeholder="Informações adicionais…"
        />
      </FieldGroup>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !form.tipo || !form.titulo || !form.data_atividade}
          className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Check size={15} />
          {saving ? 'Salvando…' : 'Salvar atividade'}
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

// ─── Activity Card ────────────────────────────────────────────────────────────

const ActivityCard: React.FC<{ activity: NutritionEanActivity; schools: School[] }> = ({ activity, schools }) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = TIPO_ICON[activity.tipo] ?? Star;
  const colorClass = TIPO_COLOR[activity.tipo] ?? 'bg-gray-50 text-gray-500';
  const schoolName = schools.find((s) => s.id === activity.escola_id)?.name;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className={`p-2.5 rounded-xl shrink-0 ${colorClass}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="font-bold text-slate-800 text-sm truncate">{activity.titulo}</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>
              {TIPO_LABEL[activity.tipo]}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
            <span>{fmtDate(activity.data_atividade)}</span>
            {schoolName && <span>{schoolName}</span>}
            {activity.num_participantes && (
              <span className="flex items-center gap-1">
                <Users size={10} />
                {activity.num_participantes} participantes
              </span>
            )}
          </div>
        </div>
        {(activity.resultados || activity.observacoes) && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-2 rounded-lg hover:bg-gray-100 text-slate-400 transition-colors shrink-0"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        )}
      </div>
      {expanded && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-2 text-sm text-slate-600">
          {activity.publico && <p><span className="font-semibold">Público:</span> {activity.publico}</p>}
          {activity.resultados && <p><span className="font-semibold">Resultados:</span> {activity.resultados}</p>}
          {activity.observacoes && <p><span className="font-semibold">Obs:</span> {activity.observacoes}</p>}
        </div>
      )}
    </div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────

const NutritionEANModule: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activities, setActivities] = useState<NutritionEanActivity[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [acts, schs] = await Promise.all([
        SupabaseService.getEANActivities(),
        SupabaseService.getSchools(),
      ]);
      setActivities(acts);
      setSchools(schs);
    } catch {
      // silenciar
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currentYear = new Date().getFullYear();
  const thisYear = activities.filter((a) => a.data_atividade?.startsWith(String(currentYear)));
  const totalParticipants = thisYear.reduce((s, a) => s + (a.num_participantes ?? 0), 0);
  const distinctSchools = new Set(thisYear.map((a) => a.escola_id).filter(Boolean)).size;

  const handleSave = (saved: NutritionEanActivity) => {
    setActivities((prev) => [saved, ...prev]);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate('/app/nutricion/dashboard')}
          className="p-2 rounded-lg hover:bg-gray-100 text-slate-500 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="flex-1 text-base font-bold text-slate-800">Módulo EAN</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold text-sm transition-colors"
        >
          <Plus size={15} />
          Nova atividade
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4 pb-10">

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: `Atividades ${currentYear}`, value: thisYear.length, color: 'bg-purple-50 text-purple-700' },
            { label: 'Participantes', value: totalParticipants, color: 'bg-blue-50 text-blue-700' },
            { label: 'Escolas alcançadas', value: distinctSchools, color: 'bg-green-50 text-green-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className={`text-2xl font-extrabold ${color.split(' ')[1]}`}>{value}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Formulário inline */}
        {showForm && user && (
          <EANForm
            professionalId={user.id}
            schools={schools}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm h-20 animate-pulse" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-slate-400">
            <p className="font-semibold">Nenhuma atividade cadastrada</p>
            <p className="text-sm mt-1">Clique em "Nova atividade" para registrar a primeira</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((a) => (
              <ActivityCard key={a.id} activity={a} schools={schools} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NutritionEANModule;

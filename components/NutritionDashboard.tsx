import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, BarChart2, ChevronRight,
  ClipboardList, Salad, Scale, Users, Plus, Leaf, Megaphone,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseService } from '../services/SupabaseService';
import type { NutritionDashboardStats, NutritionAssessment } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const IMC_BADGE: Record<string, string> = {
  'Baixo peso': 'bg-blue-50 text-blue-800',
  Magreza: 'bg-blue-50 text-blue-800',
  Eutrofia: 'bg-green-50 text-green-800',
  Adequado: 'bg-green-50 text-green-800',
  Sobrepeso: 'bg-amber-50 text-amber-800',
  Obesidade: 'bg-orange-50 text-orange-800',
  'Obesidade grave': 'bg-red-50 text-red-800',
};

function imcBadgeClass(cls?: string): string {
  if (!cls) return 'bg-gray-100 text-gray-500';
  for (const [k, v] of Object.entries(IMC_BADGE)) {
    if (cls.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return 'bg-gray-100 text-gray-500';
}

// ─── sub-components ───────────────────────────────────────────────────────────

const MetricCard: React.FC<{
  label: string;
  value: number;
  sub?: string;
  colorClass: string;
  Icon: React.ElementType;
}> = ({ label, value, sub, colorClass, Icon }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex gap-4 items-start">
    <div className={`p-3 rounded-xl ${colorClass}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-2xl font-extrabold text-slate-800">{value}</p>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  </div>
);

// ─── main component ───────────────────────────────────────────────────────────

const NutritionDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<NutritionDashboardStats | null>(null);
  const [recentAssessments, setRecentAssessments] = useState<(NutritionAssessment & { studentName?: string })[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const load = useCallback(async () => {
    setLoadingStats(true);
    try {
      const s = await SupabaseService.getNutritionDashboardStats();
      setStats(s);
    } catch {
      // silenciar — sem dados ainda é estado válido
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // gráfico de perfil nutricional
  const chartData = stats
    ? [
        { name: 'Baixo peso', value: stats.perfilNutricional.baixoPeso, color: '#3B82F6' },
        { name: 'Eutrofia', value: stats.perfilNutricional.eutrofia, color: '#10B981' },
        { name: 'Sobrepeso', value: stats.perfilNutricional.sobrepeso, color: '#F59E0B' },
        { name: 'Obesidade', value: stats.perfilNutricional.obesidade, color: '#F97316' },
        { name: 'Ob. grave', value: stats.perfilNutricional.obesidadeGrave, color: '#EF4444' },
      ]
    : [];

  const alertas = stats?.alertas ?? [];
  const visibleAlerts = showAllAlerts ? alertas : alertas.slice(0, 5);
  const userName = user?.name ?? 'Nutricionista';

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">

        {/* ── SEÇÃO 1 — Header ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg shrink-0">
              {getInitials(userName)}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">{userName}</h1>
              <p className="text-sm text-slate-500">Nutrição Escolar — PNAE</p>
              {user?.jobTitle && (
                <span className="inline-block mt-1 text-xs bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                  {user.jobTitle}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/nutricion/avaliacao')}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-[#F97316] hover:bg-orange-600 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nova avaliação
          </button>
        </div>

        {/* ── SEÇÃO 2 — Métricas ── */}
        {loadingStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Total alunos"
              value={stats?.totalAlunos ?? 0}
              sub="cadastrados no sistema"
              colorClass="bg-blue-50 text-blue-600"
              Icon={Users}
            />
            <MetricCard
              label="Avaliados"
              value={stats?.avaliados ?? 0}
              sub="com anamnese finalizada"
              colorClass="bg-green-50 text-green-600"
              Icon={ClipboardList}
            />
            <MetricCard
              label="Pendentes"
              value={stats?.pendentes ?? 0}
              sub="sem avaliação nutricional"
              colorClass="bg-amber-50 text-amber-600"
              Icon={Scale}
            />
            <MetricCard
              label="NAE ativos"
              value={stats?.naeAtivos ?? 0}
              sub="necessidades alimentares especiais"
              colorClass={
                (stats?.naeAtivos ?? 0) > 0
                  ? 'bg-red-50 text-red-600'
                  : 'bg-gray-100 text-gray-500'
              }
              Icon={Salad}
            />
          </div>
        )}

        {/* ── SEÇÃO 3 — Perfil nutricional ── */}
        {!loadingStats && chartData.some((d) => d.value > 0) && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={18} className="text-slate-400" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Perfil nutricional</h2>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Alunos" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-3">
              {chartData.map((d) => (
                <span key={d.name} className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── SEÇÃO 4 — Alertas ── */}
        {alertas.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Alertas automáticos</h2>
            <div className="space-y-2">
              {visibleAlerts.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    a.severidade === 'CRITICO' ? 'bg-red-50' : 'bg-amber-50'
                  }`}
                >
                  {a.severidade === 'CRITICO' ? (
                    <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {a.studentName && (
                      <span className="font-semibold text-slate-800 text-sm">{a.studentName} — </span>
                    )}
                    <span className="text-sm text-slate-600">{a.mensagem}</span>
                  </div>
                  {a.student_id && (
                    <button
                      onClick={() => navigate(`/nutricion/avaliacao?studentId=${a.student_id}`)}
                      className="shrink-0 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Avaliar
                    </button>
                  )}
                </div>
              ))}
            </div>
            {alertas.length > 5 && (
              <button
                onClick={() => setShowAllAlerts((v) => !v)}
                className="mt-3 text-xs font-semibold text-blue-600 hover:underline"
              >
                {showAllAlerts ? 'Ver menos' : `Ver todos (${alertas.length})`}
              </button>
            )}
          </div>
        )}

        {/* ── SEÇÃO 5 — Últimos avaliados ── */}
        {recentAssessments.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Últimas avaliações</h2>
            <div className="divide-y divide-gray-50">
              {recentAssessments.map((a) => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/nutricion/avaliacao?id=${a.id}`)}
                  className="w-full flex items-center gap-3 py-3 hover:bg-gray-50 rounded-lg px-2 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center shrink-0">
                    {getInitials(a.studentName ?? '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{a.studentName ?? a.student_id}</p>
                    <p className="text-xs text-slate-400">{fmtDate(a.assessment_date)}</p>
                  </div>
                  {a.imc_classificacao && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${imcBadgeClass(a.imc_classificacao)}`}>
                      {a.imc_classificacao}
                    </span>
                  )}
                  <ChevronRight size={14} className="text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── SEÇÃO 6 — Acesso rápido ── */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/nutricion/nae')}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-green-200 hover:shadow-md transition-all"
          >
            <div className="p-3 rounded-xl bg-green-50 text-green-600">
              <Leaf size={22} />
            </div>
            <span className="text-xs font-semibold text-slate-700 text-center leading-tight">Módulo NAE</span>
          </button>

          <button
            onClick={() => navigate('/nutricion/ean')}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-purple-200 hover:shadow-md transition-all"
          >
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
              <Megaphone size={22} />
            </div>
            <span className="text-xs font-semibold text-slate-700 text-center leading-tight">Módulo EAN</span>
          </button>

          <div className="relative flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm opacity-60 cursor-not-allowed">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-400">
              <BarChart2 size={22} />
            </div>
            <span className="text-xs font-semibold text-slate-500 text-center leading-tight">Relatórios</span>
            <span className="absolute -top-1.5 -right-1.5 text-[10px] bg-slate-200 text-slate-500 font-bold px-1.5 py-0.5 rounded-full">em breve</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NutritionDashboard;

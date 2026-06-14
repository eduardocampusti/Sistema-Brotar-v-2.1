import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, BarChart2, Clock,
  ClipboardList, Users, Plus, Leaf, BookOpen,
  ShieldCheck, Activity,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseService } from '../services/SupabaseService';
import type { NutritionDashboardStats } from '../types';

const EMPTY_STATS: NutritionDashboardStats = {
  totalAlunos: 0, avaliados: 0, pendentes: 0,
  perfilNutricional: { baixoPeso: 0, eutrofia: 0, sobrepeso: 0, obesidade: 0, obesidadeGrave: 0 },
  naeAtivos: 0, laudosVencendo: 0, alertas: [],
};

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

const NutritionDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<NutritionDashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await SupabaseService.getNutritionDashboardStats();
        setStats(s);
      } catch (err) {
        console.error('Erro dashboard nutrição:', err);
        setStats(EMPTY_STATS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const alertas = stats.alertas;
  const visibleAlerts = showAllAlerts ? alertas : alertas.slice(0, 5);
  const userName = user?.name ?? 'Nutricionista';
  const pn = stats.perfilNutricional;
  const totalAvaliados = pn.baixoPeso + pn.eutrofia + pn.sobrepeso + pn.obesidade + pn.obesidadeGrave;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-4">

        {/* ── HEADER ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-[52px] h-[52px] rounded-2xl bg-green-50 flex items-center justify-center text-green-700 font-medium text-lg shrink-0">
              {getInitials(userName)}
            </div>
            <div>
              <h1 className="text-lg font-medium text-slate-800">{userName}</h1>
              <p className="text-sm text-slate-500">Nutrição Escolar — PNAE · SEMED Brotas de Macaúbas</p>
              {user?.jobTitle && (
                <span className="inline-block mt-1.5 text-xs bg-blue-50 text-blue-700 font-medium px-2.5 py-0.5 rounded-full">
                  {user.jobTitle}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/app/nutricion/avaliacao')}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl font-medium text-sm transition-colors"
          >
            <Plus size={16} /> Nova avaliação
          </button>
        </div>

        {/* ── 4 CARDS DE MÉTRICAS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'TOTAL ALUNOS', value: stats.totalAlunos, sub: 'rede municipal', barColor: 'bg-blue-500', iconBg: 'bg-blue-50 text-blue-600', Icon: Users },
            { label: 'AVALIADOS', value: stats.avaliados, sub: `${stats.totalAlunos > 0 ? Math.round((stats.avaliados / stats.totalAlunos) * 100) : 0}% da meta`, barColor: 'bg-emerald-500', iconBg: 'bg-emerald-50 text-emerald-600', Icon: ClipboardList },
            { label: 'PENDENTES', value: stats.pendentes, sub: 'sem avaliação', barColor: 'bg-amber-500', iconBg: 'bg-amber-50 text-amber-600', Icon: Clock },
            { label: 'NAE ATIVOS', value: stats.naeAtivos, sub: `${stats.laudosVencendo} laudos vencendo`, barColor: 'bg-red-500', iconBg: stats.naeAtivos > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400', Icon: ShieldCheck },
          ].map((m) => (
            <div key={m.label} className="bg-white rounded-2xl border border-gray-100 p-4 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1 ${m.barColor}`} />
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center mb-3 ${m.iconBg}`}>
                <m.Icon size={18} />
              </div>
              <p className="text-[28px] font-medium text-slate-800 leading-none">{m.value}</p>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mt-1">{m.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* ── PERFIL NUTRICIONAL + ALERTAS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-3">
          {/* Perfil nutricional */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center text-green-700">
                  <BarChart2 size={14} />
                </div>
                <span className="text-[13px] font-medium text-slate-800">Perfil nutricional</span>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-slate-500">{totalAvaliados} avaliados</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: 'Baixo peso', value: pn.baixoPeso, bg: 'bg-blue-50', numColor: 'text-blue-800', lblColor: 'text-blue-600' },
                  { label: 'Eutrofia', value: pn.eutrofia, bg: 'bg-green-50', numColor: 'text-green-800', lblColor: 'text-green-600' },
                  { label: 'Sobrepeso', value: pn.sobrepeso, bg: 'bg-amber-50', numColor: 'text-amber-800', lblColor: 'text-amber-600' },
                  { label: 'Obesidade', value: pn.obesidade, bg: 'bg-orange-50', numColor: 'text-orange-800', lblColor: 'text-orange-600' },
                  { label: 'Ob. grave', value: pn.obesidadeGrave, bg: 'bg-red-50', numColor: 'text-red-800', lblColor: 'text-red-600' },
                ].map((s) => (
                  <div key={s.label} className={`${s.bg} rounded-lg text-center py-3 px-1`}>
                    <p className={`text-xl font-medium ${s.numColor} leading-none`}>{s.value}</p>
                    <p className={`text-[9px] font-medium ${s.lblColor} mt-1`}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alertas */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                  <AlertTriangle size={14} />
                </div>
                <span className="text-[13px] font-medium text-slate-800">Alertas</span>
              </div>
              {alertas.length > 0 && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">{alertas.length} ativos</span>
              )}
            </div>
            <div>
              {visibleAlerts.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-400">Nenhum alerta ativo</div>
              ) : (
                visibleAlerts.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${a.severidade === 'CRITICO' ? 'bg-red-500' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0 text-[12px] text-slate-500">
                      {a.studentName && <span className="font-medium text-slate-800">{a.studentName}</span>}
                      {a.studentName && ' — '}{a.mensagem}
                    </div>
                    {a.student_id && (
                      <button onClick={() => navigate(`/app/nutricion/avaliacao?studentId=${a.student_id}`)} className="shrink-0 text-[11px] font-medium text-blue-600 hover:underline whitespace-nowrap">
                        avaliar →
                      </button>
                    )}
                  </div>
                ))
              )}
              {alertas.length > 5 && (
                <button onClick={() => setShowAllAlerts((v) => !v)} className="w-full px-4 py-2.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50/50 transition-colors">
                  {showAllAlerts ? 'Ver menos' : `Ver todos (${alertas.length})`}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── ÚLTIMOS ALUNOS AVALIADOS ── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Activity size={14} />
            </div>
            <span className="text-[13px] font-medium text-slate-800">Últimos alunos avaliados</span>
          </div>
          <div>
            {stats.totalAlunos === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">Nenhum aluno avaliado ainda</div>
            ) : (
              <div className="px-4 py-2 text-center text-sm text-slate-400">Os alunos aparecerão aqui após as avaliações</div>
            )}
          </div>
        </div>

        {/* ── BOTÕES DE ACESSO RÁPIDO ── */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/app/nutricion/nae')}
            className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-green-200 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-700">
              <ShieldCheck size={20} />
            </div>
            <span className="text-[12px] font-medium text-slate-700">Módulo NAE</span>
            <span className="text-[10px] text-slate-400">Necessidades alimentares</span>
          </button>

          <button
            onClick={() => navigate('/app/nutricion/ean')}
            className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-purple-200 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
              <BookOpen size={20} />
            </div>
            <span className="text-[12px] font-medium text-slate-700">Módulo EAN</span>
            <span className="text-[10px] text-slate-400">Educação alimentar</span>
          </button>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-2 opacity-50 cursor-not-allowed relative">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
              <BarChart2 size={20} />
            </div>
            <span className="text-[12px] font-medium text-slate-500">Relatórios</span>
            <span className="text-[10px] text-slate-400">em breve</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NutritionDashboard;

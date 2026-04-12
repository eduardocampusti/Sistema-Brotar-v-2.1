import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { User, Student, Appointment } from '../types';
import type { LucideIcon } from 'lucide-react';
import { School, UserX, PieChart, UserCheck, ArrowRight, CalendarRange } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { computeEducationSecretaryDerived } from '../utils/educationSecretaryMetrics';
import { useEducationSecretaryPanelData } from '../hooks/useEducationSecretaryPanelData';
import { SupabaseService } from '../services/SupabaseService';

interface RelatoriosGerenciaisProps {
  currentUser: User;
  students: Student[];
}

interface RelatorioCardProps {
  title: string;
  description: string;
  summary: React.ReactNode;
  icon: LucideIcon;
  gradient: string;
}

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Segunda-feira como início da semana (calendário local). */
function startOfIsoWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  return x;
}

function endOfIsoWeek(d: Date): Date {
  const s = startOfIsoWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return e;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** Mesmo critério de `EducationSecretaryDashboard` / `RoleDashboards` para “confirmado ou realizado”. */
function isConfirmedOrAttended(status: Appointment['status']): boolean {
  return status === 'AGENDADO' || status === 'CONFIRMADO' || status === 'ATENDIDO';
}

/**
 * Mesmo caminho de dados que `SchedulingCenter` / `useEducationSecretaryPanelData`:
 * `SupabaseService.getAppointments` + filtro local por [startDate, endDate] e status.
 * (O serviço só aplica `gte` em `fromDate`; o teto do período é aplicado aqui.)
 */
async function getAppointmentsByPeriod(
  startDate: string,
  endDate: string,
  scope: User['scope'] | undefined
): Promise<Appointment[]> {
  let rows: Appointment[] = [];

  try {
    if (scope === 'SEDE') {
      rows = await SupabaseService.getAppointments({ unit: 'SEDE', fromDate: startDate });
    } else if (scope === 'COCAL') {
      rows = await SupabaseService.getAppointments({ unit: 'COCAL', fromDate: startDate });
    } else {
      const [sede, cocal] = await Promise.all([
        SupabaseService.getAppointments({ unit: 'SEDE', fromDate: startDate }),
        SupabaseService.getAppointments({ unit: 'COCAL', fromDate: startDate }),
      ]);
      const byId = new Map<string, Appointment>();
      [...sede, ...cocal].forEach(a => byId.set(a.id, a));
      rows = [...byId.values()];
    }
  } catch (e) {
    console.error('[RelatoriosGerenciais] Erro ao buscar agendamentos por período:', e);
    return [];
  }

  return rows.filter(
    a =>
      Boolean(a.date) &&
      a.date >= startDate &&
      a.date <= endDate &&
      isConfirmedOrAttended(a.status)
  );
}

const RelatorioCard: React.FC<RelatorioCardProps> = ({ title, description, summary, icon: Icon, gradient }) => (
  <div className="relative overflow-hidden p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group bg-white flex flex-col">
    <div className="relative z-10 flex justify-between items-start gap-4 flex-1">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        <div className="text-3xl font-extrabold text-slate-800 mt-2 tracking-tight tabular-nums">{summary}</div>
        <p className="text-xs text-slate-500 mt-2 leading-snug">{description}</p>
      </div>
      <div className={`p-3 rounded-xl shadow-lg text-white bg-gradient-to-br shrink-0 ${gradient}`}>
        <Icon size={20} />
      </div>
    </div>
    <button
      type="button"
      onClick={() => undefined}
      className="mt-5 inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 hover:bg-primary-100 hover:border-primary-300 transition-colors"
    >
      Ver detalhes
      <ArrowRight size={16} className="opacity-80" />
    </button>
  </div>
);

type MainTab = 'indicadores' | 'agendamentos';
type AgendaPeriod = 'week' | 'month';

interface AgendaStatCardProps {
  title: string;
  description: string;
  summary: React.ReactNode;
  icon: LucideIcon;
  gradient: string;
}

const AgendaStatCard: React.FC<AgendaStatCardProps> = ({ title, description, summary, icon: Icon, gradient }) => (
  <div className="relative overflow-hidden p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 bg-white flex flex-col">
    <div className="relative z-10 flex justify-between items-start gap-4 flex-1">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        <div className="text-3xl font-extrabold text-slate-800 mt-2 tracking-tight tabular-nums">{summary}</div>
        <p className="text-xs text-slate-500 mt-2 leading-snug">{description}</p>
      </div>
      <div className={`p-3 rounded-xl shadow-lg text-white bg-gradient-to-br shrink-0 ${gradient}`}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

interface TableRow {
  key: string;
  professional: string;
  specialty: string;
  school: string;
  weekCount: number;
  monthCount: number;
}

export const RelatoriosGerenciais: React.FC<RelatoriosGerenciaisProps> = ({ currentUser, students }) => {
  const monthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const { loading, appointments, supportProfessionals, schoolsList } = useEducationSecretaryPanelData(currentUser);

  const [mainTab, setMainTab] = useState<MainTab>('indicadores');
  const [agendaPeriod, setAgendaPeriod] = useState<AgendaPeriod>('week');
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [weekAppointments, setWeekAppointments] = useState<Appointment[]>([]);
  const [monthAppointments, setMonthAppointments] = useState<Appointment[]>([]);
  const [barGradFrom, setBarGradFrom] = useState('#14b8a6');
  const [barGradTo, setBarGradTo] = useState('#0f766e');

  useLayoutEffect(() => {
    const root = document.documentElement;
    const from = getComputedStyle(root).getPropertyValue('--color-primary-500').trim();
    const to = getComputedStyle(root).getPropertyValue('--color-primary-700').trim();
    if (from) setBarGradFrom(from);
    if (to) setBarGradTo(to);
  }, []);

  const derived = useMemo(
    () =>
      computeEducationSecretaryDerived(
        students,
        schoolsList,
        supportProfessionals,
        appointments,
        currentUser,
        monthStr
      ),
    [students, schoolsList, supportProfessionals, appointments, currentUser, monthStr]
  );

  const { strategic, schoolCoverageRows, diagnosisDonut, scopedSupportProfessionals } = derived;

  const diagnosisActiveCategories = useMemo(
    () => diagnosisDonut.filter(d => d.value > 0).length,
    [diagnosisDonut]
  );

  const studentSchoolNameById = useMemo(() => {
    const m = new Map<string, string>();
    students.forEach(s => {
      m.set(s.id, s.school?.schoolName?.trim() || 'Não vinculada');
    });
    return m;
  }, [students]);

  const weekRange = useMemo(() => {
    const now = new Date();
    const start = startOfIsoWeek(now);
    const end = endOfIsoWeek(now);
    return { start: toLocalYmd(start), end: toLocalYmd(end) };
  }, []);

  const monthRange = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return { start: toLocalYmd(start), end: toLocalYmd(end) };
  }, []);

  const loadAgendaData = useCallback(async () => {
    if (currentUser.role !== 'EDUCATION_SECRETARY') return;
    setAgendaLoading(true);
    try {
      const scope = currentUser.scope;
      const [w, mo] = await Promise.all([
        getAppointmentsByPeriod(weekRange.start, weekRange.end, scope),
        getAppointmentsByPeriod(monthRange.start, monthRange.end, scope),
      ]);
      setWeekAppointments(w);
      setMonthAppointments(mo);
    } finally {
      setAgendaLoading(false);
    }
  }, [currentUser.role, currentUser.scope, weekRange.start, weekRange.end, monthRange.start, monthRange.end]);

  useEffect(() => {
    if (mainTab !== 'agendamentos' || currentUser.role !== 'EDUCATION_SECRETARY') return;
    void loadAgendaData();
  }, [mainTab, loadAgendaData, currentUser.role]);

  const periodAppointments = agendaPeriod === 'week' ? weekAppointments : monthAppointments;

  const periodTotal = periodAppointments.length;
  const monthTotal = monthAppointments.length;

  const countsByProfessionalInPeriod = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    periodAppointments.forEach(a => {
      const id = a.professionalId || a.professionalName;
      const prev = map.get(id) || { name: a.professionalName || '—', count: 0 };
      prev.count += 1;
      prev.name = a.professionalName || prev.name;
      map.set(id, prev);
    });
    return map;
  }, [periodAppointments]);

  const topProfessional = useMemo(() => {
    let best: { name: string; count: number } | null = null;
    countsByProfessionalInPeriod.forEach(v => {
      if (!best || v.count > best.count) best = { name: v.name, count: v.count };
      else if (best && v.count === best.count && v.name.localeCompare(best.name) < 0) {
        best = { name: v.name, count: v.count };
      }
    });
    return best;
  }, [countsByProfessionalInPeriod]);

  const chartData = useMemo(() => {
    const arr = Array.from(countsByProfessionalInPeriod.values())
      .map(v => ({ name: v.name.length > 28 ? `${v.name.slice(0, 26)}…` : v.name, fullName: v.name, atendimentos: v.count }))
      .sort((a, b) => b.atendimentos - a.atendimentos || a.fullName.localeCompare(b.fullName));
    return arr;
  }, [countsByProfessionalInPeriod]);

  const chartPixelHeight = Math.max(320, chartData.length * 40);

  const tableRows: TableRow[] = useMemo(() => {
    const byKey = new Map<
      string,
      { professional: string; specialties: Set<string>; school: string; weekCount: number; monthCount: number }
    >();

    const bump = (list: Appointment[], field: 'weekCount' | 'monthCount') => {
      list.forEach(a => {
        const school = studentSchoolNameById.get(a.studentId) ?? 'Aluno não listado';
        const key = `${a.professionalId}|${school}`;
        const cur =
          byKey.get(key) || {
            professional: a.professionalName || '—',
            specialties: new Set<string>(),
            school,
            weekCount: 0,
            monthCount: 0,
          };
        if (a.specialty) cur.specialties.add(String(a.specialty));
        cur[field] += 1;
        byKey.set(key, cur);
      });
    };

    bump(weekAppointments, 'weekCount');
    bump(monthAppointments, 'monthCount');

    return Array.from(byKey.entries())
      .map(([key, v]) => ({
        key,
        professional: v.professional,
        specialty: [...v.specialties].sort().join(', ') || '—',
        school: v.school,
        weekCount: v.weekCount,
        monthCount: v.monthCount,
      }))
      .sort((a, b) => b.monthCount - a.monthCount || b.weekCount - a.weekCount || a.professional.localeCompare(b.professional));
  }, [weekAppointments, monthAppointments, studentSchoolNameById]);

  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="space-y-8 animate-slideUp">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Relatórios gerenciais</h1>
        <p className="mt-1 text-sm text-slate-600">
          Indicadores consolidados para a gestão municipal — {currentUser.name.split(' ')[0]}
        </p>
      </div>

      <div
        className="inline-flex rounded-2xl border border-slate-200 bg-slate-50/80 p-1 shadow-sm"
        role="tablist"
        aria-label="Seções de relatórios"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === 'indicadores'}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
            mainTab === 'indicadores'
              ? 'bg-white text-primary-800 shadow-sm border border-primary-100'
              : 'text-slate-600 hover:text-slate-800'
          }`}
          onClick={() => setMainTab('indicadores')}
        >
          Indicadores
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === 'agendamentos'}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
            mainTab === 'agendamentos'
              ? 'bg-white text-primary-800 shadow-sm border border-primary-100'
              : 'text-slate-600 hover:text-slate-800'
          }`}
          onClick={() => setMainTab('agendamentos')}
        >
          Agendamentos
        </button>
      </div>

      {mainTab === 'indicadores' && (
        <>
          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-500">
              Carregando indicadores…
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RelatorioCard
              title="Cobertura por escola"
              description={`Média municipal (alunos com vínculo / total). ${schoolCoverageRows.length} escola${schoolCoverageRows.length === 1 ? '' : 's'} com alunos no escopo.`}
              summary={<span style={{ color: strategic.covColor }}>{strategic.coveragePct}%</span>}
              icon={School}
              gradient="from-blue-500 to-indigo-600"
            />
            <RelatorioCard
              title="Alunos sem cobertura"
              description="Sem vínculo em profissionais de apoio (mesmo critério do painel «Alunos sem apoio»)."
              summary={
                <span className={strategic.withoutSupport > 0 ? 'text-red-600' : undefined}>{strategic.withoutSupport}</span>
              }
              icon={UserX}
              gradient="from-orange-400 to-red-500"
            />
            <RelatorioCard
              title="Distribuição por diagnóstico"
              description={`${diagnosisActiveCategories} faixa${diagnosisActiveCategories === 1 ? '' : 's'} com alunos · base ${strategic.total} aluno${strategic.total === 1 ? '' : 's'} (escopo).`}
              summary={strategic.total}
              icon={PieChart}
              gradient="from-teal-500 to-emerald-600"
            />
            <RelatorioCard
              title="Profissionais ativos"
              description="Profissionais de apoio com vínculo às escolas ou alunos do escopo (mesmo filtro do painel)."
              summary={scopedSupportProfessionals.length}
              icon={UserCheck}
              gradient="from-amber-500 to-orange-600"
            />
          </div>
        </>
      )}

      {mainTab === 'agendamentos' && currentUser.role === 'EDUCATION_SECRETARY' && (
        <div
          className={`space-y-6 ${reduceMotion ? '' : 'transition-opacity duration-300'}`}
          style={{ opacity: agendaLoading ? 0.55 : 1 }}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Período de análise</p>
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  agendaPeriod === 'week'
                    ? 'bg-primary-600 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setAgendaPeriod('week')}
              >
                Esta semana
              </button>
              <button
                type="button"
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  agendaPeriod === 'month'
                    ? 'bg-primary-600 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setAgendaPeriod('month')}
              >
                Este mês
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Semana: {weekRange.start} — {weekRange.end} · Mês corrente: {monthRange.start.slice(0, 7)}
            </p>
          </div>

          {agendaLoading && (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-500">
              Carregando agendamentos…
            </div>
          )}

          <div
            key={agendaPeriod}
            className={reduceMotion ? 'space-y-6' : 'space-y-6 animate-fadeIn transition-opacity duration-300'}
          >
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Resumo</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <AgendaStatCard
                title="Total de Atendimentos"
                description={agendaPeriod === 'week' ? 'Confirmados ou realizados na semana atual.' : 'Confirmados ou realizados no mês corrente.'}
                summary={periodTotal}
                icon={UserCheck}
                gradient="from-primary-500 to-primary-700"
              />
              <AgendaStatCard
                title="Atendimentos este mês"
                description="Total fixo do mês corrente (confirmado ou realizado)."
                summary={monthTotal}
                icon={CalendarRange}
                gradient="from-teal-500 to-emerald-600"
              />
              <AgendaStatCard
                title="Profissional Destaque"
                description="Maior volume no período selecionado (semana ou mês)."
                summary={
                  topProfessional && topProfessional.count > 0 ? (
                    <span className="text-xl sm:text-2xl leading-tight">{topProfessional.name}</span>
                  ) : (
                    '—'
                  )
                }
                icon={PieChart}
                gradient="from-amber-500 to-orange-600"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Atendimentos por Profissional</p>
              {chartData.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">Nenhum agendamento encontrado</p>
              ) : (
                <div className="max-h-[320px] overflow-y-auto pr-1">
                  <ResponsiveContainer width="100%" height={chartPixelHeight} debounce={50}>
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                      barCategoryGap="12%"
                    >
                      <defs>
                        <linearGradient id="agendaPrimaryBarGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={barGradFrom} />
                          <stop offset="100%" stopColor={barGradTo} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={132}
                        tick={{ fontSize: 11, fill: '#475569' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(v: number) => [v, 'Atendimentos']}
                        labelFormatter={(_l, payload) => {
                          const row = payload?.[0]?.payload as { fullName?: string } | undefined;
                          return row?.fullName ?? '';
                        }}
                      />
                      <Bar dataKey="atendimentos" radius={[0, 8, 8, 0]} barSize={22}>
                        {chartData.map((_, i) => (
                          <Cell key={`c-${i}`} fill="url(#agendaPrimaryBarGrad)" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 pt-5 pb-2">Detalhamento por profissional e local</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    <th className="px-4 py-3">Profissional</th>
                    <th className="px-4 py-3">Especialidade</th>
                    <th className="px-4 py-3">Local (escola)</th>
                    <th className="px-4 py-3 text-right tabular-nums">Atendimentos na semana</th>
                    <th className="px-4 py-3 text-right tabular-nums">Atendimentos no mês</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                        Nenhum agendamento encontrado
                      </td>
                    </tr>
                  ) : (
                    tableRows.map((row, idx) => (
                      <tr
                        key={row.key}
                        className={`border-b border-slate-100 ${idx % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}`}
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">{row.professional}</td>
                        <td className="px-4 py-3 text-slate-600">{row.specialty}</td>
                        <td className="px-4 py-3 text-slate-600">{row.school}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-800">{row.weekCount}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-800">{row.monthCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {mainTab === 'agendamentos' && currentUser.role !== 'EDUCATION_SECRETARY' && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
          A aba de agendamentos está disponível para o perfil de secretaria de educação.
        </div>
      )}
    </div>
  );
};

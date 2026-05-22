import React, { useMemo, useState, useEffect } from 'react';
import {
    Student,
    User,
    Specialty,
    Session,
    Appointment,
    SupportProfessional,
    SavedDocument,
    AuditLog,
    hasPermission,
    School as SchoolEntity,
    Unit,
    statusAgendamentoRealizado,
    isSupportProfessionalActive,
} from '../types';
import { StorageService } from '../services/storageService';
import { SupabaseService } from '../services/SupabaseService';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Users, Calendar, Activity, Clock, School, AlertTriangle, FileText, CheckCircle, Brain, HeartPulse, Stethoscope, Baby, Mic, Puzzle, Heart, Search, Settings, Shield, Download, UserPlus, Globe, TrendingUp, ArrowRight, Palette, PlusCircle, Printer, ShieldAlert, Bell, ClipboardList, MessageSquare, UserCheck, Phone, Loader2, Send, Building2, Link2, Wifi, WifiOff, Info, ChevronRight, Sparkles } from 'lucide-react';
import { PatientList } from './PatientList';
import { WelcomeHeader } from './WelcomeHeader';
import { countTeaAutismStudents } from '../utils/teaAutismCount';
import { computeEducationSecretaryDerived } from '../utils/educationSecretaryMetrics';
import { useEducationSecretaryPanelData } from '../hooks/useEducationSecretaryPanelData';

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

interface DashboardProps {
    students: Student[];
    currentUser: User;
    onNavigate: (page: string) => void;
    /** Abre o prontuário do aluno (ex.: a partir da agenda). Opcional para não exigir mudanças em todos os painéis. */
    onOpenPatient?: (studentId: string) => void;
}

// --- COMPONENTES VISUAIS (ESTILO DA IMAGEM) ---


const ActionCard = ({ title, description, icon: Icon, onClick, colorClass = "bg-primary-50 text-primary-600" }: any) => (
    <button
        onClick={onClick}
        className="flex flex-row items-center gap-4 p-6 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 hover:shadow-lg hover:border-primary-300 transition-all text-left group w-full h-full"
    >
        <div className={`p-4 rounded-2xl ${colorClass} group-hover:scale-110 transition-transform`}>
            <Icon size={32} />
        </div>
        <div>
            <h3 className="font-bold text-slate-800 text-lg group-hover:text-primary-700 transition-colors">{title}</h3>
            <p className="text-sm text-slate-500 mt-1 leading-snug">{description}</p>
        </div>
    </button>
);

const StatCard = ({ title, value, icon: Icon, gradient, subtext, trend, onClick }: any) => {
    const Wrapper = onClick ? 'button' : 'div';
    return (
        <Wrapper
            onClick={onClick}
            className={`relative overflow-hidden p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group bg-white text-left w-full ${
                onClick ? 'cursor-pointer hover:border-primary-300' : ''
            }`}
        >
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
                    <h3 className="text-3xl font-extrabold text-slate-800 mt-2 tracking-tight">{value}</h3>
                    {subtext && (
                        <div className="flex items-center gap-1 mt-2">
                            {trend === 'up' && <TrendingUp size={14} className="text-green-500" />}
                            <p className="text-xs font-medium text-slate-400">{subtext}</p>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-xl shadow-lg text-white bg-gradient-to-br ${gradient}`}>
                    <Icon size={20} />
                </div>
            </div>
        </Wrapper>
    );
};

const formatRelativePt = (iso: string): string => {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '—';
    let diffMs = Date.now() - t;
    if (diffMs < 0) diffMs = 0;
    const s = Math.floor(diffMs / 1000);
    if (s < 45) return 'agora';
    const m = Math.floor(s / 60);
    if (m < 60) return `há ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `há ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `há ${d} dia${d > 1 ? 's' : ''}`;
    return new Date(iso).toLocaleDateString('pt-BR');
};

// --- Shared: painel clínico do especialista (home) ---
function ymdLocal(d = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function addDaysToYmd(ymd: string, deltaDays: number): string {
    const [y, mo, da] = ymd.split('-').map(Number);
    const dt = new Date(y, mo - 1, da + deltaDays);
    return ymdLocal(dt);
}

function matchesSpecialistUnit(a: Appointment, scope: User['scope']): boolean {
    if (!scope || scope === 'GLOBAL') return true;
    if (scope === 'SEDE') return a.unit === 'SEDE';
    if (scope === 'COCAL') return a.unit === 'COCAL';
    return true;
}

function studentInAssistantScope(s: Student, scope: User['scope']): boolean {
    if (!scope || scope === 'GLOBAL') return true;
    const u = s.unit ?? 'SEDE';
    if (scope === 'SEDE') return u === 'SEDE';
    if (scope === 'COCAL') return u === 'COCAL';
    return true;
}

export function specialistAppointmentsMine(all: Appointment[], user: User): Appointment[] {
    return all.filter(a => a.professionalId === user.id && matchesSpecialistUnit(a, user.scope));
}

function appointmentStatusBadgeClass(status: Appointment['status']): string {
    switch (status) {
        case 'CONFIRMADO':
            return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
        case 'AGENDADO':
            return 'bg-amber-100 text-amber-900 border border-amber-200';
        case 'EM_ATENDIMENTO':
            return 'bg-violet-100 text-violet-800 border border-violet-200';
        case 'ATENDIDO':
        case 'ENCERRADO':
            return 'bg-slate-200 text-slate-700 border border-slate-300';
        case 'FALTOU':
            return 'bg-red-100 text-red-800 border border-red-200';
        case 'CANCELADO':
            return 'bg-rose-100 text-rose-800 border border-rose-200';
        case 'REMARCAR':
            return 'bg-orange-50 text-orange-800 border border-orange-200';
        default:
            return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
}

function scopeUnitLabel(scope: User['scope']): string {
    if (scope === 'SEDE') return 'SEDE';
    if (scope === 'COCAL') return 'COCAL';
    return 'Todas as unidades';
}

function studentDiagnosisLine(s: Student): string {
    const cid = (s.clinical?.cid || '').trim();
    const d = (s.clinical?.diagnosis || '').trim();
    if (cid && d) return `${cid} · ${d}`.slice(0, 72);
    return cid || d || '—';
}

function sortAppointmentsByStart(a: Appointment, b: Appointment): number {
    const ta = (a.startTime || '00:00').slice(0, 5);
    const tb = (b.startTime || '00:00').slice(0, 5);
    if (ta !== tb) return ta.localeCompare(tb);
    return (a.createdAt || '').localeCompare(b.createdAt || '');
}

export interface SpecialistClinicalHomeProps {
    students: Student[];
    currentUser: User;
    onNavigate: (page: string) => void;
    onOpenPatient?: (studentId: string) => void;
    registerSessionRoute: string;
    extraAction?: { label: string; route: string };
}


const normalizeSpecialty = (s?: string): string => {
    if (!s) return '';
    const ptMap: Record<string, string> = {
        'Psicopedagogia': 'PSYCHOPEDAGOGY', 'Psicologia': 'PSYCHOLOGY',
        'Fonoaudiologia': 'SPEECH_THERAPY', 'Terapia Ocupacional': 'OCCUPATIONAL_THERAPY',
        'Fisioterapia': 'PHYSIOTHERAPY', 'Nutri\u00e7\u00e3o': 'NUTRITION',
        'Servi\u00e7o Social': 'SOCIAL_WORK',
    };
    return ptMap[s] || s;
};

export const SpecialistClinicalHomeDashboard: React.FC<SpecialistClinicalHomeProps> = ({
    students,
    currentUser,
    onNavigate,
    onOpenPatient,
    registerSessionRoute,
    extraAction,
}) => {
    const today = new Date().toISOString().slice(0, 10);
    const monthStr = today.slice(0, 7);

    const specialtyLabel = useMemo(() => {
        const map: Record<string, string> = {
            PSYCHOPEDAGOGY: 'Psicopedagogia', PSYCHOLOGY: 'Psicologia',
            SPEECH_THERAPY: 'Fonoaudiologia', OCCUPATIONAL_THERAPY: 'Terapia Ocupacional',
            PHYSIOTHERAPY: 'Fisioterapia', NUTRITION: 'Nutrição', SOCIAL_WORK: 'Serviço Social',
        };
        return map[normalizeSpecialty(currentUser.specialty)] || 'Especialista';
    }, [currentUser.specialty]);

    const clinicalRoute = useMemo(() => {
        const map: Record<string, string> = {
            PSYCHOPEDAGOGY: 'psychopedagogy', PSYCHOLOGY: 'psychology',
            SPEECH_THERAPY: 'speech-therapy', OCCUPATIONAL_THERAPY: 'occupational-therapy',
            PHYSIOTHERAPY: 'physiotherapy', NUTRITION: 'nutrition', SOCIAL_WORK: 'social-service-hub',
        };
        return map[normalizeSpecialty(currentUser.specialty)] || 'psychopedagogy';
    }, [currentUser.specialty]);

    const specialtyGradient = useMemo(() => {
        const map: Record<string, string> = {
            PSYCHOPEDAGOGY: 'linear-gradient(135deg,#9F5FC0,#D9ABFF)',
            PSYCHOLOGY: 'linear-gradient(135deg,#534AB7,#AFA9EC)',
            SPEECH_THERAPY: 'linear-gradient(135deg,#0F6E56,#5DCAA5)',
            OCCUPATIONAL_THERAPY: 'linear-gradient(135deg,#185FA5,#85B7EB)',
            PHYSIOTHERAPY: 'linear-gradient(135deg,#0F6E56,#9FE1CB)',
            NUTRITION: 'linear-gradient(135deg,#3B6D11,#97C459)',
            SOCIAL_WORK: 'linear-gradient(135deg,#854F0B,#EF9F27)',
        };
        return map[normalizeSpecialty(currentUser.specialty)] || 'linear-gradient(135deg,#64748B,#94A3B8)';
    }, [currentUser.specialty]);

    const [appointments, setAppointments] = useState<any[]>([]);
    const [loadingApts, setLoadingApts] = useState(true);

    useEffect(() => {
        SupabaseService.getAppointments({ professionalId: currentUser.id })
            .then(data => { setAppointments(data || []); setLoadingApts(false); })
            .catch(() => setLoadingApts(false));
    }, [currentUser.id]);

    const todayApts = useMemo(() =>
        appointments.filter(a => a.date === today && !['CANCELADO','FALTOU'].includes(a.status)),
        [appointments, today]);

    const monthFaltas = useMemo(() =>
        appointments.filter(a => a.date.startsWith(monthStr) && a.status === 'FALTOU').length,
        [appointments, monthStr]);

    const nextApt = useMemo(() =>
        appointments
            .filter(a => a.date > today && !['CANCELADO','FALTOU'].includes(a.status))
            .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime||'').localeCompare(b.startTime||''))[0],
        [appointments, today]);

    const recentStudentIds = useMemo(() => {
        const seen = new Set<string>();
        return appointments
            .filter(a => a.date <= today)
            .sort((a, b) => b.date.localeCompare(a.date))
            .filter(a => { if (seen.has(a.studentId)) return false; seen.add(a.studentId); return true; })
            .slice(0, 4)
            .map(a => ({ studentId: a.studentId, date: a.date }));
    }, [appointments, today]);

    const weekDays = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const todayDate = new Date();
    const todayDay = todayDate.getDay();
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() - todayDay);

    const weekStats = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            const ds = d.toISOString().slice(0, 10);
            const count = appointments.filter(a => a.date === ds && !['CANCELADO','FALTOU'].includes(a.status)).length;
            return { day: weekDays[i], date: ds, count, isToday: ds === today };
        });
    }, [appointments, today]);

    const maxWeek = Math.max(...weekStats.map(w => w.count), 1);

    return (
        <div className="space-y-5 animate-slideUp pb-6">
            {/* HEADER */}
            <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: specialtyGradient }}>
                <div className="absolute right-4 top-4 opacity-10 text-[100px] leading-none">✦</div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative z-10">
                    <div>
                        <p className="text-[12px] text-white/70 mb-0.5">Visão Geral</p>
                        <h1 className="text-xl font-bold text-white">{currentUser.name}</h1>
                        <p className="text-[12px] text-white/70 mt-0.5">{specialtyLabel} · {todayDate.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}</p>
                    </div>
                    <button onClick={() => onNavigate(clinicalRoute)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shrink-0 transition-all hover:opacity-90"
                        style={{ background: 'rgba(255,255,255,0.2)', border: '0.5px solid rgba(255,255,255,0.3)', color: 'white' }}>
                        Abrir módulo clínico →
                    </button>
                </div>
            </div>

            {/* CARDS RESUMO */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Hoje', value: loadingApts ? '...' : todayApts.length, sub: 'atendimentos', color: '#1D9E75', route: 'scheduling' },
                    { label: 'Meus alunos', value: loadingApts ? '...' : new Set(appointments.map(a => a.studentId)).size, sub: 'no histórico', color: '#7F77DD', route: clinicalRoute },
                    { label: 'Faltas no mês', value: loadingApts ? '...' : monthFaltas, sub: 'registradas', color: '#E24B4A', route: 'scheduling' },
                    { label: 'Próximo', value: nextApt ? (nextApt.startTime||'—').slice(0,5) : '—', sub: nextApt ? new Date(nextApt.date+'T12:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) : 'sem agend.', color: '#BA7517', route: 'scheduling' },
                ].map((card, i) => (
                    <button key={i} onClick={() => onNavigate(card.route)}
                        className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:shadow-md transition-all">
                        <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">{card.label}</p>
                        <p className="text-2xl font-bold text-slate-800 mb-0.5">{card.value}</p>
                        <p className="text-[11px]" style={{ color: card.color }}>{card.sub}</p>
                    </button>
                ))}
            </div>

            {/* GRID PRINCIPAL */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* AGENDA DO DIA */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <span className="text-[13px] font-medium text-slate-700">Agenda de hoje</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{todayApts.length} atend.</span>
                    </div>
                    {loadingApts ? (
                        <div className="p-6 text-center text-sm text-slate-400">Carregando...</div>
                    ) : todayApts.length === 0 ? (
                        <div className="p-6 text-center">
                            <p className="text-sm text-slate-400 mb-3">Nenhum atendimento hoje.</p>
                            {nextApt && (
                                <div className="bg-slate-50 rounded-xl p-3 text-left border border-slate-100">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Próximo agendamento</p>
                                    <p className="text-[13px] font-medium text-slate-700">{nextApt.studentName}</p>
                                    <p className="text-[11px] text-slate-400">{new Date(nextApt.date+'T12:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'})} · {(nextApt.startTime||'—').slice(0,5)}</p>
                                </div>
                            )}
                            <button onClick={() => onNavigate('scheduling')}
                                className="mt-3 text-[12px] font-medium px-4 py-2 rounded-lg text-white transition-all"
                                style={{ background: specialtyGradient }}>
                                Agendar atendimento
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {todayApts.map((apt, i) => (
                                <div key={apt.id} className={`flex items-center gap-3 px-4 py-2.5 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                                    <span className="text-[11px] font-medium text-slate-500 w-10 shrink-0">{(apt.startTime||'—').slice(0,5)}</span>
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: apt.status==='EM_ATENDIMENTO'?'#1D9E75':apt.status==='CONFIRMADO'?'#3B82F6':'#94A3B8' }}></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-slate-800 truncate">{apt.studentName}</p>
                                        <p className="text-[10px] text-slate-400">{apt.unit}</p>
                                    </div>
                                    <button onClick={() => onOpenPatient && onOpenPatient(apt.studentId)}
                                        className="text-[10px] font-medium px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0">
                                        Ver
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* COLUNA DIREITA */}
                <div className="flex flex-col gap-4">
                    {/* SEMANA VISUAL */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                        <p className="text-[13px] font-medium text-slate-700 mb-3">Atendimentos esta semana</p>
                        <div className="flex items-end gap-2 h-16">
                            {weekStats.map((w, i) => (
                                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                                    <div className="w-full rounded-t-md transition-all" style={{
                                        height: `${Math.max(4, (w.count / maxWeek) * 48)}px`,
                                        background: w.isToday ? specialtyGradient : w.count > 0 ? 'rgba(148,163,184,0.4)' : 'rgba(241,245,249,1)'
                                    }}></div>
                                    <span className={`text-[9px] font-medium ${w.isToday ? 'text-slate-800' : 'text-slate-400'}`}>{w.day}</span>
                                    {w.count > 0 && <span className="text-[9px] text-slate-500">{w.count}</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ALUNOS RECENTES */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex-1">
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                            <span className="text-[13px] font-medium text-slate-700">Alunos recentes</span>
                            <button onClick={() => onNavigate('list')} className="text-[11px] font-medium text-slate-500 hover:underline">Ver todos</button>
                        </div>
                        {recentStudentIds.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-400">Nenhum atendimento anterior.</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recentStudentIds.map(({ studentId, date }) => {
                                    const st = students.find(s => s.id === studentId);
                                    if (!st) return null;
                                    const initials = st.fullName.split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase();
                                    return (
                                        <button key={studentId} onClick={() => onOpenPatient && onOpenPatient(studentId)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 text-white" style={{ background: specialtyGradient }}>
                                                {initials}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-medium text-slate-800 truncate">{st.fullName}</p>
                                                <p className="text-[10px] text-slate-400">{new Date(date+'T12:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'})}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AÇÕES RÁPIDAS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-[13px] font-medium text-slate-700 mb-3">Ações rápidas</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Módulo clínico', sub: 'Abrir prontuários', route: clinicalRoute, emoji: '🩺' },
                        { label: 'Minha agenda', sub: 'Ver atendimentos', route: 'scheduling', emoji: '📅' },
                        { label: 'Painel ANEE', sub: 'Dados da rede', route: 'relatorio-tea', emoji: '📊' },
                        { label: 'Documentos', sub: 'Laudos e relatórios', route: 'documents', emoji: '📄' },
                    ].map((action, i) => (
                        <button key={i} onClick={() => onNavigate(action.route)}
                            className="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 hover:shadow-sm hover:border-slate-200 transition-all text-left bg-slate-50/50">
                            <span className="text-xl">{action.emoji}</span>
                            <div>
                                <p className="text-[12px] font-medium text-slate-700">{action.label}</p>
                                <p className="text-[10px] text-slate-400">{action.sub}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ADMIN_ROLE_LABELS: Record<string, string> = {
    SPECIALIST: 'Especialista clínico',
    ESCOLA: 'Escola',
    ASSISTANT: 'Assistente',
    SECRETARIA_SEDE: 'Secretaria (Sede)',
    SECRETARIA_COCAL: 'Secretaria (Cocal)',
};

// --- 1. ADMINISTRADOR GERAL ---
export const AdminDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [supportProfessionals, setSupportProfessionals] = useState<SupportProfessional[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [documents, setDocuments] = useState<SavedDocument[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [notificationRows, setNotificationRows] = useState<any[]>([]);

    const monthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const [pros, users, apts, docs, logs, notifs] = await Promise.all([
                    SupabaseService.getSupportProfessionals(),
                    SupabaseService.getUsers(),
                    SupabaseService.getAppointments({}),
                    SupabaseService.getDocuments(),
                    SupabaseService.getAuditLogs(),
                    SupabaseService.getNotifications(currentUser.id),
                ]);
                if (!cancelled) {
                    setSupportProfessionals(pros);
                    setAllUsers(users);
                    setAppointments(apts);
                    setDocuments(docs);
                    setAuditLogs((logs || []).slice(0, 5));
                    setNotificationRows(notifs || []);
                }
            } catch (e) {
                console.error('[AdminDashboard] Erro ao carregar painel:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [currentUser.id]);

    const metrics = useMemo(() => {
        const activeSupportPros = supportProfessionals.filter(isSupportProfessionalActive);
        const totalStudents = students.length;
        const spWithStudent = activeSupportPros.filter(
            p => p.studentId && String(p.studentId).trim() !== ''
        ).length;
        const spWithoutStudent = activeSupportPros.length - spWithStudent;

        const specialists = allUsers.filter(u => u.role === 'SPECIALIST');
        const specialtyAreas = new Set(
            specialists.map(u =>
                u.specialty != null && String(u.specialty).trim() !== '' ? String(u.specialty) : '__sem__'
            )
        ).size;

        const monthApts = appointments.filter(a => a.date && a.date.startsWith(monthStr));
        const apAttended = monthApts.filter((a) => statusAgendamentoRealizado(a.status)).length;
        const apAbsent = monthApts.filter(a => a.status === 'FALTOU').length;
        const apCancelled = monthApts.filter(a => a.status === 'CANCELADO').length;

        const activeProfiles = allUsers.filter(u => u.isActive === true).length;

        const [y, m] = monthStr.split('-').map(Number);
        const startMs = new Date(y, m - 1, 1).getTime();
        const endMs = new Date(y, m, 1).getTime();
        const docsThisMonth = documents.filter(d => {
            if (!d.createdAt) return false;
            const t = new Date(d.createdAt).getTime();
            return !Number.isNaN(t) && t >= startMs && t < endMs;
        }).length;

        return {
            totalStudents,
            supportTotal: activeSupportPros.length,
            spWithStudent,
            spWithoutStudent,
            specialistCount: specialists.length,
            specialtyAreas,
            monthAptsTotal: monthApts.length,
            apAttended,
            apAbsent,
            apCancelled,
            activeProfiles,
            docsThisMonth,
        };
    }, [students, supportProfessionals, allUsers, appointments, documents, monthStr]);

    const teaAutismTotal = useMemo(() => countTeaAutismStudents(students), [students]);

    const alerts = useMemo(() => {
        const activeSupportPros = supportProfessionals.filter(isSupportProfessionalActive);
        const linkedStudentIds = new Set(
            activeSupportPros
                .map(p => p.studentId)
                .filter(id => id && String(id).trim() !== '')
        );
        const studentsWithoutSupportPro = students.filter(s => !linkedStudentIds.has(s.id)).length;
        const usersMustChangePassword = allUsers.filter(u => u.mustChangePassword === true).length;
        const supportProsUnlinked = activeSupportPros.filter(
            p => !p.studentId || String(p.studentId).trim() === ''
        ).length;
        const studentsNoCid = students.filter(
            s => !s.clinical?.cid || String(s.clinical.cid).trim() === ''
        ).length;
        const urgentUnread = notificationRows.filter((n: any) => {
            const pr = n.priority;
            const read = n.is_read;
            return pr === 'urgent' && read === false;
        }).length;

        return {
            studentsWithoutSupportPro,
            usersMustChangePassword,
            supportProsUnlinked,
            studentsNoCid,
            urgentUnread,
        };
    }, [students, supportProfessionals, allUsers, notificationRows]);

    const roleDistribution = useMemo(() => {
        const keys = ['SPECIALIST', 'ESCOLA', 'ASSISTANT', 'SECRETARIA_SEDE', 'SECRETARIA_COCAL'] as const;
        const rows = keys.map(role => ({
            role,
            count: allUsers.filter(u => u.role === role).length,
        }));
        const max = Math.max(1, ...rows.map(r => r.count));
        return { rows, max };
    }, [allUsers]);

    const auditPresentation = (action: string) => {
        const a = (action || '').toUpperCase();
        if (a === 'CRIAR' || a === 'CREATE')
            return { Icon: PlusCircle, box: 'bg-emerald-100 text-emerald-700' };
        if (a === 'EDITAR' || a === 'UPDATE')
            return { Icon: Activity, box: 'bg-blue-100 text-blue-700' };
        if (a === 'EXCLUIR' || a === 'DELETE')
            return { Icon: AlertTriangle, box: 'bg-red-100 text-red-700' };
        if (a === 'LOGIN')
            return { Icon: Shield, box: 'bg-slate-100 text-slate-600' };
        return { Icon: FileText, box: 'bg-slate-100 text-slate-500' };
    };

    const handleSendSystemAlert = async () => {
        const recipientId = window.prompt('UUID do usuário destinatário:');
        if (!recipientId?.trim()) return;
        const title = window.prompt('Título do alerta:') || 'Alerta do sistema';
        const content = window.prompt('Mensagem:') || '';
        try {
            await SupabaseService.sendSystemAlert(recipientId.trim(), title, content, 'urgent');
            window.alert('Alerta enviado com sucesso.');
        } catch (err) {
            console.error('[AdminDashboard] sendSystemAlert:', err);
            window.alert('Não foi possível enviar o alerta.');
        }
    };

    return (
        <div className="space-y-8 animate-slideUp">
            <WelcomeHeader name={currentUser.name.split(' ')[0]} />

            {loading && (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-500">
                    Carregando métricas administrativas…
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <StatCard
                    title="Total de alunos"
                    value={metrics.totalStudents}
                    icon={Users}
                    gradient="from-sky-500 to-blue-600"
                    onClick={() => onNavigate('list')}
                />
                <StatCard
                    title="Profissionais de apoio"
                    value={metrics.supportTotal}
                    icon={HeartPulse}
                    gradient="from-teal-500 to-emerald-600"
                    subtext={`${metrics.spWithStudent} com aluno · ${metrics.spWithoutStudent} sem aluno`}
                    onClick={() => onNavigate('support-professionals')}
                />
                <StatCard
                    title="Especialistas clínicos"
                    value={metrics.specialistCount}
                    icon={Stethoscope}
                    gradient="from-cyan-500 to-teal-600"
                    subtext={`${metrics.specialistCount} especialistas · ${metrics.specialtyAreas} áreas`}
                    onClick={() => onNavigate('admin')}
                />
                <StatCard
                    title="Agendamentos do mês"
                    value={metrics.monthAptsTotal}
                    icon={Calendar}
                    gradient="from-amber-500 to-orange-600"
                    subtext={`Encerrados ${metrics.apAttended} · FALTOU ${metrics.apAbsent} · CANCELADO ${metrics.apCancelled}`}
                    onClick={() => onNavigate('scheduling')}
                />
                <StatCard
                    title="Usuários ativos"
                    value={metrics.activeProfiles}
                    icon={UserCheck}
                    gradient="from-emerald-500 to-green-600"
                    onClick={() => onNavigate('admin')}
                />
                <StatCard
                    title="Documentos gerados (mês)"
                    value={metrics.docsThisMonth}
                    icon={FileText}
                    gradient="from-slate-600 to-slate-800"
                    subtext="generated_documents · createdAt"
                    onClick={() => onNavigate('documents')}
                />
                <StatCard
                    title="Alunos com TEA/Autismo"
                    value={teaAutismTotal}
                    icon={Puzzle}
                    gradient="from-blue-400 to-blue-600"
                    subtext="Diagnóstico registrado"
                    onClick={() => onNavigate('list')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 space-y-3">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Bell size={20} className="text-amber-600" /> Alertas prioritários
                    </h3>
                    {alerts.studentsWithoutSupportPro > 0 && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                            {alerts.studentsWithoutSupportPro} alunos sem profissional de apoio
                        </div>
                    )}
                    {alerts.usersMustChangePassword > 0 && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                            {alerts.usersMustChangePassword} usuários precisam trocar a senha
                        </div>
                    )}
                    {alerts.supportProsUnlinked > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                            {alerts.supportProsUnlinked} profissionais sem aluno vinculado
                        </div>
                    )}
                    {alerts.studentsNoCid > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                            {alerts.studentsNoCid} alunos sem CID informado
                        </div>
                    )}
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
                        {alerts.urgentUnread} mensagens urgentes não lidas — system_messages
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4">
                        <ClipboardList size={20} className="text-primary-600" /> Auditoria recente
                    </h3>
                    <ul className="space-y-3">
                        {auditLogs.length === 0 && !loading && (
                            <li className="text-sm text-slate-400">Nenhum registro de auditoria.</li>
                        )}
                        {auditLogs.map(log => {
                            const { Icon, box } = auditPresentation(String(log.action));
                            return (
                                <li key={log.id} className="flex gap-3 border-b border-slate-100 pb-3 text-sm last:border-0 last:pb-0">
                                    <div className={`shrink-0 rounded-lg p-2 ${box}`}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold text-slate-800">{log.user}</p>
                                        <p className="text-xs text-slate-500">
                                            {log.module} · <span className="text-slate-600">{log.affected_record ?? '—'}</span>
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">{formatRelativePt(log.timestamp)}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 flex flex-col">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4">
                        <Users size={20} className="text-primary-600" /> Distribuição por role
                    </h3>
                    <div className="space-y-4">
                        {roleDistribution.rows.map(r => (
                            <div key={r.role}>
                                <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
                                    <span>{ADMIN_ROLE_LABELS[r.role] ?? r.role}</span>
                                    <span>{r.count}</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full bg-primary-500 transition-all"
                                        style={{ width: `${(r.count / roleDistribution.max) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
                        Acesso exclusivo ADMIN: Segurança + Backup
                        {hasPermission(currentUser, 'can_access_security_data') ? ' · permissões de segurança ativas.' : ''}
                    </p>
                </div>
            </div>

            <div>
                <h3 className="font-bold text-lg text-slate-800 mb-4">Ações rápidas (ADMIN)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ActionCard
                        title="Gestão de Usuários"
                        description="Contas, papéis e escopos"
                        icon={Shield}
                        onClick={() => onNavigate('admin')}
                        colorClass="bg-sky-50 text-sky-700"
                    />
                    <ActionCard
                        title="Auditoria do Sistema"
                        description="Histórico de ações no sistema"
                        icon={ShieldAlert}
                        onClick={() => onNavigate('audit-logs')}
                        colorClass="bg-rose-50 text-rose-700"
                    />
                    <ActionCard
                        title="Configurações"
                        description="Identidade visual e timbrado"
                        icon={Settings}
                        onClick={() => onNavigate('settings')}
                        colorClass="bg-slate-50 text-slate-700"
                    />
                    <ActionCard
                        title="Enviar Alerta"
                        description="Alerta urgente (system_messages)"
                        icon={MessageSquare}
                        onClick={handleSendSystemAlert}
                        colorClass="bg-orange-50 text-orange-700"
                    />
                </div>
            </div>
        </div>
    );
};

// --- 2. SECRETÁRIA DE EDUCAÇÃO ---

function normalizeWorkload(w: string | undefined): string {
    const t = (w || '').toLowerCase().replace(/\s/g, '');
    if (t.includes('40')) return '40h';
    if (t.includes('20')) return '20h';
    return 'Outras / não informado';
}

export const EducationSecretaryDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {
    const monthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
    const { loading, appointments, supportProfessionals, schoolsList, generatedLaudoDocs } =
        useEducationSecretaryPanelData(currentUser);

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

    const {
        isCocal,
        scope,
        scopedStudents,
        scopedStudentIdSet,
        scopedSupportProfessionals,
        strategic,
        schoolCoverageRows,
        diagnosisDonut,
    } = derived;

    const teaAutismStudentCount = useMemo(() => countTeaAutismStudents(scopedStudents), [scopedStudents]);

    const workloadDist = useMemo(() => {
        const bucket = new Map<string, number>();
        scopedSupportProfessionals.forEach(p => {
            const k = normalizeWorkload(p.workload);
            bucket.set(k, (bucket.get(k) || 0) + 1);
        });
        const total = scopedSupportProfessionals.length || 1;
        const order = ['20h', '40h', 'Outras / não informado'];
        return order
            .filter(k => (bucket.get(k) || 0) > 0 || k === '20h' || k === '40h')
            .map(k => ({
                name: k,
                count: bucket.get(k) || 0,
                pct: Math.round(((bucket.get(k) || 0) / total) * 1000) / 10,
            }));
    }, [scopedSupportProfessionals]);

    const quality = useMemo(() => {
        const criticalSchools = schoolCoverageRows.filter(r => r.pct < 50);
        const noCid = scopedStudents.filter(
            s => !s.clinical?.cid || String(s.clinical.cid).trim() === ''
        ).length;
        const prosNoStudent = scopedSupportProfessionals.filter(
            p => !p.studentId || String(p.studentId).trim() === ''
        ).length;
        const generatedLaudosScoped = generatedLaudoDocs.filter(d => scopedStudentIdSet.has(d.studentId));
        const laudoDates: { ms: number }[] = [];
        scopedStudents.forEach(s => {
            (s.documents || [])
                .filter(d => d.type === 'Laudo Médico')
                .forEach(d => {
                    const ms = new Date(d.uploadedAt).getTime();
                    if (!Number.isNaN(ms)) laudoDates.push({ ms });
                });
        });
        generatedLaudosScoped.forEach(d => {
            const ms = new Date(d.createdAt).getTime();
            if (!Number.isNaN(ms)) laudoDates.push({ ms });
        });
        const twelveMs = 12 * 30.4375 * 24 * 60 * 60 * 1000;
        const tenMs = 10 * 30.4375 * 24 * 60 * 60 * 1000;
        let expired = 0;
        let dueSoon = 0;
        laudoDates.forEach(({ ms }) => {
            const age = Date.now() - ms;
            if (age >= twelveMs) expired++;
            else if (age >= tenMs) dueSoon++;
        });
        const avgStudentsPerPro =
            scopedSupportProfessionals.length > 0
                ? Math.round((scopedStudents.length / scopedSupportProfessionals.length) * 10) / 10
                : 0;
        return {
            criticalSchools,
            noCid,
            prosNoStudent,
            laudoExpired: expired,
            laudoDueSoon: dueSoon,
            avgStudentsPerPro,
        };
    }, [
        schoolCoverageRows,
        scopedStudents,
        scopedSupportProfessionals,
        generatedLaudoDocs,
        scopedStudentIdSet,
    ]);

    const diagPieColors = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#64748b', '#cbd5e1'];

    return (
        <div className="space-y-8 animate-slideUp">
            <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-start">
                <div>
                    <WelcomeHeader name={currentUser.name.split(' ')[0]} />
                    <p className="mt-1 text-sm text-slate-600">
                        Secretaria Municipal de Educação — Brotas de Macaúbas
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    {isCocal && (
                        <div className="px-3 py-1.5 bg-amber-100 text-amber-900 rounded-xl text-xs font-bold border border-amber-300 flex items-center gap-2">
                            <Globe size={14} /> Distrito de Cocal
                        </div>
                    )}
                    {scope === 'GLOBAL' && (
                        <div className="px-3 py-1.5 bg-sky-100 text-sky-900 rounded-xl text-xs font-bold border border-sky-300 flex items-center gap-2">
                            <Globe size={14} /> Visão Municipal Consolidada
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => onNavigate('list')}
                        className="text-xs font-semibold text-primary-600 hover:underline"
                    >
                        Ver lista de alunos
                    </button>
                </div>
            </div>

            {loading && (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-500">
                    Carregando indicadores estratégicos…
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <StatCard
                    title="Total de alunos cadastrados"
                    value={strategic.total}
                    icon={Users}
                    gradient="from-blue-500 to-indigo-600"
                    subtext={`${strategic.newThisMonth} novos este mês`}
                    onClick={() => onNavigate('list')}
                />
                <StatCard
                    title="Cobertura de apoio"
                    value={<span style={{ color: strategic.covColor }}>{strategic.coveragePct}%</span>}
                    icon={HeartPulse}
                    gradient="from-teal-500 to-emerald-600"
                    subtext="Alunos com profissional vinculado / total"
                    onClick={() => onNavigate('support-professionals')}
                />
                <StatCard
                    title="Alunos sem apoio"
                    value={
                        <span className={strategic.withoutSupport > 0 ? 'text-red-600' : ''}>{strategic.withoutSupport}</span>
                    }
                    icon={AlertTriangle}
                    gradient="from-orange-400 to-red-500"
                    subtext="Sem vínculo em profissionais de apoio (escopo)"
                    onClick={() => onNavigate('support-professionals')}
                />
                <StatCard
                    title="Agendamentos do mês"
                    value={strategic.monthAptsTotal}
                    icon={Calendar}
                    gradient="from-amber-500 to-orange-600"
                    subtext={`Referência: ${monthStr}`}
                    onClick={() => onNavigate('scheduling')}
                />
                <StatCard
                    title="Alunos com TEA/Autismo"
                    value={teaAutismStudentCount}
                    icon={Puzzle}
                    gradient="from-blue-400 to-blue-600"
                    subtext="Diagnóstico registrado"
                    onClick={() => onNavigate('list')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                    <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                        <School size={20} className="text-primary-600" /> Cobertura por escola
                    </h3>
                    {schoolCoverageRows.length === 0 ? (
                        <p className="text-sm text-slate-400">Sem alunos por escola no escopo atual.</p>
                    ) : (
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={schoolCoverageRows} layout="vertical" margin={{ left: 8, right: 16 }}>
                                    <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} fontSize={11} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={120}
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [`${value}%`, 'Cobertura']}
                                        labelFormatter={(_l, payload: any[]) => {
                                            const pl = payload?.[0]?.payload;
                                            return pl ? `${pl.name} · ${pl.withP}/${pl.total} alunos` : '';
                                        }}
                                    />
                                    <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={18}>
                                        {schoolCoverageRows.map((e, i) => (
                                            <Cell key={e.id || String(i)} fill={e.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                        Legenda de cor: ≥70% verde · 50–69% amarelo · &lt;50% vermelho
                    </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                    <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                        <Brain size={20} className="text-primary-600" /> Distribuição por diagnóstico
                    </h3>
                    <div className="h-80 flex flex-col md:flex-row items-center gap-4">
                        <div className="w-full h-56 md:h-full md:flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={diagnosisDonut}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={52}
                                        outerRadius={78}
                                        paddingAngle={2}
                                    >
                                        {diagnosisDonut.map((_, i) => (
                                            <Cell key={i} fill={diagPieColors[i % diagPieColors.length]} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(v: number, _k, item: any) => [
                                            `${v} (${item?.payload?.pct ?? 0}%)`,
                                            'Alunos',
                                        ]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <ul className="w-full md:w-52 text-xs space-y-2 shrink-0">
                            {diagnosisDonut.map((row, i) => (
                                <li key={row.name} className="flex justify-between gap-2 border-b border-slate-100 pb-1">
                                    <span className="flex items-center gap-2 text-slate-700">
                                        <span
                                            className="inline-block h-2 w-2 rounded-full"
                                            style={{ background: diagPieColors[i % diagPieColors.length] }}
                                        />
                                        {row.name}
                                    </span>
                                    <span className="font-semibold text-slate-800">
                                        {row.value} · {row.pct}%
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                    <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                        <Clock size={20} className="text-primary-600" /> Carga horária (profissionais de apoio)
                    </h3>
                    <div className="space-y-3">
                        {workloadDist.map(row => (
                            <div key={row.name}>
                                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                                    <span>{row.name}</span>
                                    <span>
                                        {row.count} ({row.pct}%)
                                    </span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-primary-500 transition-all"
                                        style={{ width: `${Math.min(100, row.pct)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="mt-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
                        Total: {scopedSupportProfessionals.length} profissionais · Média: {quality.avgStudentsPerPro}{' '}
                        alunos/profissional
                    </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)] space-y-4">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <ClipboardList size={20} className="text-primary-600" /> Indicadores de qualidade
                    </h3>

                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Escolas com cobertura &lt; 50%</p>
                        {quality.criticalSchools.length === 0 ? (
                            <p className="text-sm text-slate-400">Nenhuma escola crítica no escopo.</p>
                        ) : (
                            <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {quality.criticalSchools.map(s => (
                                    <li
                                        key={s.id}
                                        className="flex items-center justify-between gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm"
                                    >
                                        <span className="font-medium text-slate-800 truncate">{s.name}</span>
                                        <span className="flex items-center gap-2 shrink-0">
                                            <span className="text-red-700 font-bold">{s.pct}%</span>
                                            <span className="text-[10px] font-bold uppercase bg-red-200 text-red-900 px-1.5 py-0.5 rounded">
                                                Crítico
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {quality.noCid > 0 && (
                            <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                                <span className="font-semibold">{quality.noCid} alunos sem CID</span>
                                <span className="text-[10px] font-bold uppercase bg-amber-200 px-1.5 py-0.5 rounded">Preencher</span>
                            </div>
                        )}
                        {quality.prosNoStudent > 0 && (
                            <div className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-950">
                                <span className="font-semibold">{quality.prosNoStudent} prof. sem aluno</span>
                                <span className="text-[10px] font-bold uppercase bg-orange-200 px-1.5 py-0.5 rounded">Atenção</span>
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                        <p className="font-semibold text-slate-700 mb-1">Laudos médicos (escopo)</p>
                        <p className="text-xs text-slate-600">
                            Vencidos (&gt;12 meses): <strong>{quality.laudoExpired}</strong> · A vencer (10–12 meses):{' '}
                            <strong>{quality.laudoDueSoon}</strong>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Fontes: anexos do aluno (tipo &quot;Laudo Médico&quot;) e documentos gerados com o mesmo tipo.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 2.1. SECRETÁRIAS (SEDE e COCAL) ---
export const SecretaryDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAppointments = async () => {
            try {
                const data = await SupabaseService.getAppointments({
                    unit: currentUser.scope as any // Filtra por unidade se aplicável
                });
                setAppointments(data);
            } catch (error) {
                console.error('Erro ao carregar atendimentos para dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        loadAppointments();
    }, [currentUser.scope]);

    const stats = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Atendimentos do dia
        const todayAppointments = appointments.filter(a => a.date === todayStr);

        // Atendimentos da semana (próximos 7 dias)
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);
        const stWeek = now.getTime();
        const enWeek = nextWeek.getTime();

        const weekAppointments = appointments.filter(a => {
            const d = new Date(a.date).getTime();
            return d >= stWeek && d <= enWeek;
        });

        const confirmed = appointments.filter(
            (a) =>
                a.status === 'CONFIRMADO' ||
                a.status === 'EM_ATENDIMENTO' ||
                statusAgendamentoRealizado(a.status)
        ).length;
        const cancelled = appointments.filter(a => a.status === 'CANCELADO').length;
        const waiting = students.filter(s => s.status === 'Pending').length;

        return {
            today: todayAppointments.length,
            week: weekAppointments.length,
            confirmed,
            cancelled,
            waiting
        };
    }, [appointments, students]);

    return (
        <div className="space-y-8 animate-slideUp">
            <WelcomeHeader name={currentUser.name.split(' ')[0]} />

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ActionCard
                    title="Novo Agendamento"
                    description="Marcar novo atendimento para aluno"
                    icon={Calendar}
                    onClick={() => onNavigate('new-appointment')}
                    colorClass="bg-blue-50 text-blue-600"
                />
                <ActionCard
                    title="Central de Vagas"
                    description="Gerenciar lista de espera e triagens"
                    icon={Clock}
                    onClick={() => onNavigate('list')}
                    colorClass="bg-amber-50 text-amber-600"
                />
                <ActionCard
                    title="Minha Agenda"
                    description="Visualizar todos os horários marcados"
                    icon={Calendar}
                    onClick={() => onNavigate('scheduling')}
                    colorClass="bg-indigo-50 text-indigo-600"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    title="Hoje"
                    value={stats.today}
                    icon={Calendar}
                    gradient="from-blue-400 to-blue-600"
                    subtext="Atendimentos hoje"
                />
                <StatCard
                    title="Semana"
                    value={stats.week}
                    icon={Activity}
                    gradient="from-indigo-400 to-indigo-600"
                    subtext="Próximos 7 dias"
                />
                <StatCard
                    title="Confirmados"
                    value={stats.confirmed}
                    icon={CheckCircle}
                    gradient="from-emerald-400 to-emerald-600"
                    subtext="Status: Confirmado"
                />
                <StatCard
                    title="Cancelados"
                    value={stats.cancelled}
                    icon={AlertTriangle}
                    gradient="from-rose-400 to-rose-600"
                    subtext="Status: Cancelado"
                />
                <StatCard
                    title="Aguar. Vaga"
                    value={stats.waiting}
                    icon={Clock}
                    gradient="from-amber-400 to-amber-600"
                    subtext="Fila de espera"
                />
            </div>
        </div>
    );
};

// --- Secretaria da Sede (SECRETARIA_SEDE): operacional, sem dados de Cocal ---
function sedeExcludeCocal(district: string | undefined, name: string | undefined): boolean {
    const d = (district || '').toLowerCase();
    const n = (name || '').toLowerCase();
    return !d.includes('cocal') && !n.includes('cocal');
}

function cocalIncludeTerritory(district: string | undefined, name: string | undefined): boolean {
    const d = (district || '').toLowerCase();
    const n = (name || '').toLowerCase();
    return d.includes('cocal') || n.includes('cocal');
}

function mondayStartYmdFrom(todayYmd: string): string {
    const [y, m, da] = todayYmd.split('-').map(Number);
    const dt = new Date(y, m - 1, da);
    const day = dt.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    dt.setDate(dt.getDate() + diff);
    return ymdLocal(dt);
}

function capitalizePt(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function studentLooksTea(s: Student): boolean {
    const cid = (s.clinical?.cid || '').toUpperCase();
    if (cid.includes('F84')) return true;
    const needs = s.clinical?.specialNeeds || [];
    return needs.some(x => (x || '').toLowerCase().includes('tea'));
}

export const SecretariaSedeDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {
    const [schools, setSchools] = useState<SchoolEntity[]>([]);
    const [supportProfessionals, setSupportProfessionals] = useState<SupportProfessional[]>([]);
    const [sedeAppointments, setSedeAppointments] = useState<Appointment[]>([]);
    const [documents, setDocuments] = useState<SavedDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const [sch, sp, ap, docs] = await Promise.all([
                    SupabaseService.getSchools(),
                    SupabaseService.getSupportProfessionals(),
                    SupabaseService.getAppointments({ unit: 'SEDE' as Unit }),
                    SupabaseService.getDocuments(),
                ]);
                if (!cancelled) {
                    setSchools(sch || []);
                    setSupportProfessionals(sp || []);
                    setSedeAppointments((ap || []).filter(a => a.unit === 'SEDE'));
                    setDocuments(docs || []);
                }
            } catch (e) {
                console.error('[SecretariaSedeDashboard]', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [currentUser.id]);

    const todayY = ymdLocal();

    const sedeStudents = useMemo(
        () => students.filter(s => sedeExcludeCocal(s.school?.district, s.school?.schoolName)),
        [students]
    );

    const sedeSchools = useMemo(
        () => schools.filter(s => sedeExcludeCocal(s.district, s.name)),
        [schools]
    );

    const sedeSchoolIdSet = useMemo(() => new Set(sedeSchools.map(s => s.id)), [sedeSchools]);

    const sedeSupportProfessionals = useMemo(
        () => supportProfessionals.filter(sp => isSupportProfessionalActive(sp) && sedeSchoolIdSet.has(sp.schoolId)),
        [supportProfessionals, sedeSchoolIdSet]
    );

    const linkedStudentIds = useMemo(() => {
        const set = new Set<string>();
        for (const sp of sedeSupportProfessionals) {
            const sid = (sp.studentId || '').trim();
            if (sid) set.add(sid);
        }
        return set;
    }, [sedeSupportProfessionals]);

    const studentsSemApoio = useMemo(
        () => sedeStudents.filter(s => !linkedStudentIds.has(s.id)),
        [sedeStudents, linkedStudentIds]
    );

    const studentsComApoioCount = useMemo(
        () => sedeStudents.filter(s => linkedStudentIds.has(s.id)).length,
        [sedeStudents, linkedStudentIds]
    );

    const coberturaPct = useMemo(() => {
        if (sedeStudents.length === 0) return 100;
        return Math.round((studentsComApoioCount / sedeStudents.length) * 100);
    }, [sedeStudents.length, studentsComApoioCount]);

    const coberturaColorClass =
        coberturaPct >= 70 ? 'text-emerald-700' : coberturaPct >= 50 ? 'text-amber-800' : 'text-red-700';

    const apptsSedeHoje = useMemo(
        () => sedeAppointments.filter(a => a.date === todayY && a.unit === 'SEDE'),
        [sedeAppointments, todayY]
    );

    const profSemAluno = useMemo(
        () =>
            sedeSupportProfessionals.filter(sp => {
                const sid = (sp.studentId || '').trim();
                return !sid;
            }),
        [sedeSupportProfessionals]
    );

    const schoolCoverageRows = useMemo(
        () =>
            sedeSchools
                .map(escola => {
                    const totalAlunos = sedeStudents.filter(s => (s.school?.schoolId || '') === escola.id).length;
                    const comApoio = sedeSupportProfessionals.filter(
                        sp => sp.schoolId === escola.id && (sp.studentId || '').trim()
                    ).length;
                    const pct = totalAlunos === 0 ? 100 : Math.min(100, Math.round((comApoio / totalAlunos) * 100));
                    return { escola, totalAlunos, comApoio, pct };
                })
                .sort((a, b) => a.pct - b.pct),
        [sedeSchools, sedeStudents, sedeSupportProfessionals]
    );

    const schoolsUnder50 = useMemo(
        () => schoolCoverageRows.filter(r => r.totalAlunos > 0 && r.pct < 50).map(r => r.escola.name),
        [schoolCoverageRows]
    );

    const teaSemProf = useMemo(() => studentsSemApoio.filter(s => studentLooksTea(s)), [studentsSemApoio]);

    const profContractStale = useMemo(() => {
        const limit = new Date();
        limit.setFullYear(limit.getFullYear() - 1);
        return sedeSupportProfessionals.filter(sp => {
            const raw = (sp.contractStartDate || '').trim();
            if (!raw) return false;
            const t = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`).getTime();
            if (Number.isNaN(t)) return false;
            return t < limit.getTime();
        });
    }, [sedeSupportProfessionals]);

    const alunosPendingSede = useMemo(() => sedeStudents.filter(s => s.status === 'Pending'), [sedeStudents]);

    const weekStart = mondayStartYmdFrom(todayY);
    const weekEnd = addDaysToYmd(weekStart, 6);
    const apptsSedeSemana = useMemo(
        () => sedeAppointments.filter(a => a.unit === 'SEDE' && a.date >= weekStart && a.date <= weekEnd),
        [sedeAppointments, weekStart, weekEnd]
    );

    const sedeStudentIdSet = useMemo(() => new Set(sedeStudents.map(s => s.id)), [sedeStudents]);
    const monthPrefix = todayY.slice(0, 7);
    const docsSedeMes = useMemo(
        () =>
            documents.filter(
                d => sedeStudentIdSet.has(d.studentId) && (d.createdAt || '').slice(0, 7) === monthPrefix
            ),
        [documents, sedeStudentIdSet, monthPrefix]
    );

    const headerDate = capitalizePt(
        new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
    );

    const alunosSemApoioSorted = useMemo(
        () =>
            [...studentsSemApoio].sort((a, b) =>
                (a.school?.schoolName || '').localeCompare(b.school?.schoolName || '', 'pt-BR')
            ),
        [studentsSemApoio]
    );

    const teaAutismSedeCount = useMemo(() => countTeaAutismStudents(sedeStudents), [sedeStudents]);

    const diagResumo = (s: Student) => {
        const cid = (s.clinical?.cid || '').trim();
        const sn0 = (s.clinical?.specialNeeds && s.clinical.specialNeeds[0]) || '';
        return cid || sn0 || '—';
    };

    if (loading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="font-medium">Carregando painel da Secretaria (Sede)…</span>
            </div>
        );
    }

    const firstName = (currentUser.name || '').trim().split(/\s+/)[0] || 'Secretaria';

    return (
        <div className="relative mx-auto max-w-7xl space-y-8 p-6 animate-slideUp">
            <header className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-black text-slate-900">Olá, {firstName}</h1>
                    <span className="rounded-full border border-amber-400 bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-950">
                        Secretaria — Sede
                    </span>
                </div>
                <p className="text-slate-600">Gestão das escolas da unidade Sede</p>
                <p className="text-sm font-medium text-slate-500">{headerDate}</p>
            </header>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <button
                    type="button"
                    onClick={() => onNavigate('list')}
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-left transition-all hover:border-primary-300 hover:shadow-lg"
                >
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Alunos AEE — Sede</p>
                            <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-800">{sedeStudents.length}</h3>
                            {studentsSemApoio.length > 0 ? (
                                <p className="mt-2 text-xs font-semibold text-red-600">
                                    {studentsSemApoio.length} sem apoio vinculado
                                </p>
                            ) : (
                                <p className="mt-2 text-xs font-medium text-slate-400">Todos com apoio vinculado neste recorte</p>
                            )}
                        </div>
                        <div className="rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 p-3 text-white shadow-lg">
                            <Users size={20} />
                        </div>
                    </div>
                </button>
                <StatCard
                    title="Profissionais de apoio — Sede"
                    value={sedeSupportProfessionals.length}
                    icon={UserCheck}
                    gradient="from-sky-500 to-blue-600"
                    subtext={`${profSemAluno.length} sem aluno vinculado`}
                    onClick={() => onNavigate('support-professionals')}
                />
                <button
                    type="button"
                    onClick={() => onNavigate('support-professionals')}
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-left transition-all hover:border-primary-300 hover:shadow-lg"
                >
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Cobertura média — Sede</p>
                    <h3 className={`mt-2 text-3xl font-extrabold tracking-tight ${coberturaColorClass}`}>{coberturaPct}%</h3>
                    <p className="mt-2 text-xs font-medium text-slate-500">Meta: 100% de cobertura</p>
                    <div className="absolute right-4 top-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 text-white shadow-lg">
                        <Activity size={20} />
                    </div>
                </button>
                <StatCard
                    title="Agendamentos Sede hoje"
                    value={apptsSedeHoje.length}
                    icon={Calendar}
                    gradient="from-orange-400 to-amber-600"
                    subtext={`${apptsSedeHoje.filter(a => a.status === 'CONFIRMADO').length} confirmados`}
                    onClick={() => onNavigate('scheduling')}
                />
                <StatCard
                    title="Alunos com TEA/Autismo"
                    value={teaAutismSedeCount}
                    icon={Puzzle}
                    gradient="from-blue-400 to-blue-600"
                    subtext="Diagnóstico registrado"
                    onClick={() => onNavigate('list')}
                />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                        <Building2 className="h-5 w-5 text-slate-600" />
                        Cobertura por escola (Sede)
                    </h2>
                    <ul className="max-h-[28rem] space-y-4 overflow-y-auto pr-1">
                        {schoolCoverageRows.map(({ escola, totalAlunos, comApoio, pct }) => {
                            const barColor = pct >= 70 ? '#1D9E75' : pct >= 50 ? '#BA7517' : '#E24B4A';
                            return (
                                <li key={escola.id} className="space-y-1">
                                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                                        <span className="font-semibold text-slate-800">{escola.name}</span>
                                        <span className="text-slate-600">
                                            {comApoio}/{totalAlunos} alunos · {pct}%
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                        <Link2 className="h-5 w-5 text-slate-600" />
                        Profissionais sem aluno vinculado
                    </h2>
                    {profSemAluno.length === 0 ? (
                        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
                            Todos os profissionais estão vinculados
                        </p>
                    ) : (
                        <ul className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                            {profSemAluno.map(sp => {
                                const esc = sedeSchools.find(x => x.id === sp.schoolId);
                                return (
                                    <li
                                        key={sp.id}
                                        className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <p className="font-semibold text-slate-800">{sp.name}</p>
                                            <p className="text-xs text-slate-600">
                                                Carga horária: {sp.workload?.trim() || '—'} · Lotação: {esc?.name || '—'}
                                            </p>
                                        </div>
                                        <span className="shrink-0 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-950">
                                            Sem vínculo
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <button
                        type="button"
                        className="mt-4 w-full rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                        onClick={() => onNavigate('support-professionals')}
                    >
                        Gerenciar vínculos
                    </button>
                </section>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-4 text-lg font-bold text-slate-800">Alunos sem profissional de apoio</h2>
                    <p className="mb-3 text-xs font-medium text-slate-500">Total: {studentsSemApoio.length}</p>
                    <ul className="space-y-3">
                        {alunosSemApoioSorted.slice(0, 6).map(s => (
                            <li
                                key={s.id}
                                className="flex flex-col gap-1 rounded-xl border border-red-100 bg-red-50/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="font-semibold text-slate-800">{s.fullName}</p>
                                    <p className="text-xs text-slate-600">
                                        {s.school?.schoolName || '—'} · {diagResumo(s)}
                                    </p>
                                </div>
                                <span className="shrink-0 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-900">
                                    Sem apoio
                                </span>
                            </li>
                        ))}
                    </ul>
                    <button
                        type="button"
                        className="mt-4 w-full rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                        onClick={() => onNavigate('list')}
                    >
                        Ver todos
                    </button>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-4 text-lg font-bold text-slate-800">Alertas operacionais da Sede</h2>
                    <div className="space-y-4 text-sm">
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                            <p className="font-bold text-red-900">Crítico</p>
                            {schoolsUnder50.length > 0 ? (
                                <ul className="mt-2 list-inside list-disc text-red-950">
                                    {schoolsUnder50.slice(0, 8).map(n => (
                                        <li key={n}>{n}</li>
                                    ))}
                                    {schoolsUnder50.length > 8 && <li>+ {schoolsUnder50.length - 8} escola(s)</li>}
                                </ul>
                            ) : (
                                <p className="mt-1 text-red-900/80">Nenhuma escola da Sede com cobertura abaixo de 50%.</p>
                            )}
                            <p className="mt-3 font-semibold text-red-900">Alunos TEA sem profissional</p>
                            {teaSemProf.length > 0 ? (
                                <ul className="mt-1 list-inside list-disc text-red-950">
                                    {teaSemProf.slice(0, 6).map(s => (
                                        <li key={s.id}>{s.fullName}</li>
                                    ))}
                                    {teaSemProf.length > 6 && <li>+ {teaSemProf.length - 6}</li>}
                                </ul>
                            ) : (
                                <p className="mt-1 text-red-900/80">Nenhum caso neste recorte.</p>
                            )}
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <p className="font-bold text-amber-950">Atenção</p>
                            <p className="mt-1 text-amber-950">
                                Profissionais com contrato há mais de 12 meses (revisar):{' '}
                                <strong>{profContractStale.length}</strong>
                            </p>
                            <p className="mt-2 text-amber-950">
                                Alunos com status &quot;Pending&quot;: <strong>{alunosPendingSede.length}</strong>
                            </p>
                        </div>
                        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                            <p className="font-bold text-sky-950">Info</p>
                            <p className="mt-1 text-sky-950">
                                Agendamentos da Sede nesta semana: <strong>{apptsSedeSemana.length}</strong>
                            </p>
                            <p className="mt-2 text-sky-950">
                                Documentos gerados este mês (alunos da Sede): <strong>{docsSedeMes.length}</strong>
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            <section>
                <h2 className="mb-4 text-lg font-bold text-slate-800">Ações rápidas da Sede</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <ActionCard
                        title="Novo profissional de apoio"
                        description="Cadastro e vínculos na unidade"
                        icon={UserPlus}
                        onClick={() => onNavigate('support-professionals')}
                        colorClass="bg-emerald-50 text-emerald-700"
                    />
                    <ActionCard
                        title="Relatório da Sede (PDF)"
                        description="Relatório de profissionais com timbrado da Sede"
                        icon={FileText}
                        onClick={() => onNavigate('reports')}
                        colorClass="bg-slate-50 text-slate-800"
                    />
                    <ActionCard
                        title="Gerenciar escolas"
                        description="Unidades escolares e cadastros"
                        icon={School}
                        onClick={() => onNavigate('schools')}
                        colorClass="bg-amber-50 text-amber-800"
                    />
                    <ActionCard
                        title="Ver agendamentos Sede"
                        description="Central de agendamentos (filtra por unidade no módulo)"
                        icon={Calendar}
                        onClick={() => onNavigate('scheduling')}
                        colorClass="bg-sky-50 text-sky-700"
                    />
                </div>
            </section>
        </div>
    );
};

export const SecretariaCocalDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {
    const [schools, setSchools] = useState<SchoolEntity[]>([]);
    const [supportProfessionals, setSupportProfessionals] = useState<SupportProfessional[]>([]);
    const [cocalAppointments, setCocalAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const packs = await Promise.all([
                    SupabaseService.getSchools(),
                    SupabaseService.getSupportProfessionals(),
                    SupabaseService.getAppointments({ unit: 'COCAL' }),
                    SupabaseService.getPapelTimbradoConfig('COCAL'),
                ]);
                if (!cancelled) {
                    setSchools((packs[0] as SchoolEntity[]) || []);
                    setSupportProfessionals((packs[1] as SupportProfessional[]) || []);
                    setCocalAppointments(((packs[2] as Appointment[]) || []).filter(a => a.unit === 'COCAL'));
                }
            } catch (e) {
                console.error('[SecretariaCocalDashboard]', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [currentUser.id]);

    const todayY = ymdLocal();

    const cocalStudents = useMemo(
        () =>
            students.filter(s => {
                const district = (s.school?.district || '').toLowerCase();
                const schoolName = (s.school?.schoolName || '').toLowerCase();
                return district.includes('cocal') || schoolName.includes('cocal');
            }),
        [students]
    );

    const cocalSchools = useMemo(
        () => schools.filter(s => cocalIncludeTerritory(s.district, s.name)),
        [schools]
    );

    const cocalSchoolIdSet = useMemo(() => new Set(cocalSchools.map(s => s.id).filter(Boolean)), [cocalSchools]);

    const cocalSupportProfessionals = useMemo(
        () => supportProfessionals.filter(sp => isSupportProfessionalActive(sp) && cocalSchoolIdSet.has(sp.schoolId)),
        [supportProfessionals, cocalSchoolIdSet]
    );

    const cocalStudentIdSet = useMemo(() => new Set(cocalStudents.map(s => s.id)), [cocalStudents]);

    const linkedStudentIds = useMemo(() => {
        const set = new Set<string>();
        for (const sp of cocalSupportProfessionals) {
            const sid = (sp.studentId || '').trim();
            if (sid && cocalStudentIdSet.has(sid)) set.add(sid);
        }
        return set;
    }, [cocalSupportProfessionals, cocalStudentIdSet]);

    const studentsSemApoio = useMemo(
        () => cocalStudents.filter(s => !linkedStudentIds.has(s.id)),
        [cocalStudents, linkedStudentIds]
    );

    const studentsComApoioCount = useMemo(
        () => cocalStudents.filter(s => linkedStudentIds.has(s.id)).length,
        [cocalStudents, linkedStudentIds]
    );

    const coberturaPct = useMemo(() => {
        if (cocalStudents.length === 0) return 100;
        return Math.round((studentsComApoioCount / cocalStudents.length) * 100);
    }, [cocalStudents.length, studentsComApoioCount]);

    const coberturaBaixa = coberturaPct < 50;

    const coberturaColorClass =
        coberturaPct >= 70 ? 'text-emerald-700' : coberturaPct >= 50 ? 'text-amber-800' : 'text-red-700';

    const profSemAluno = useMemo(
        () =>
            cocalSupportProfessionals.filter(sp => {
                const sid = (sp.studentId || '').trim();
                return !sid;
            }),
        [cocalSupportProfessionals]
    );

    const apptsCocalHoje = useMemo(
        () => cocalAppointments.filter(a => a.date === todayY && a.unit === 'COCAL'),
        [cocalAppointments, todayY]
    );

    const schoolCoverageRows = useMemo(
        () =>
            cocalSchools
                .map(escola => {
                    const totalAlunos = cocalStudents.filter(s => (s.school?.schoolId || '') === escola.id).length;
                    const comApoio = cocalSupportProfessionals.filter(
                        sp => sp.schoolId === escola.id && (sp.studentId || '').trim()
                    ).length;
                    const pct = totalAlunos === 0 ? 100 : Math.min(100, Math.round((comApoio / totalAlunos) * 100));
                    return { escola, totalAlunos, comApoio, pct };
                })
                .filter(r => r.totalAlunos > 0)
                .sort((a, b) => a.pct - b.pct),
        [cocalSchools, cocalStudents, cocalSupportProfessionals]
    );

    const teaSemProf = useMemo(() => studentsSemApoio.filter(s => studentLooksTea(s)), [studentsSemApoio]);

    const profContractStale = useMemo(() => {
        const limit = new Date();
        limit.setFullYear(limit.getFullYear() - 1);
        return cocalSupportProfessionals.filter(sp => {
            const raw = (sp.contractStartDate || '').trim();
            if (!raw) return false;
            const t = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`).getTime();
            if (Number.isNaN(t)) return false;
            return t < limit.getTime();
        });
    }, [cocalSupportProfessionals]);

    const alunosPendingCocal = useMemo(() => cocalStudents.filter(s => s.status === 'Pending'), [cocalStudents]);

    const weekStart = mondayStartYmdFrom(todayY);
    const weekEnd = addDaysToYmd(weekStart, 6);
    const apptsCocalSemana = useMemo(
        () => cocalAppointments.filter(a => a.unit === 'COCAL' && a.date >= weekStart && a.date <= weekEnd),
        [cocalAppointments, weekStart, weekEnd]
    );

    const escolasSemInternet = useMemo(
        () => cocalSchools.filter(s => s.hasInternet === false),
        [cocalSchools]
    );

    const sedeSchools = useMemo(() => schools.filter(s => sedeExcludeCocal(s.district, s.name)), [schools]);
    const sedeSchoolIdSet = useMemo(() => new Set(sedeSchools.map(s => s.id).filter(Boolean)), [sedeSchools]);
    const sedeStudents = useMemo(
        () => students.filter(s => sedeExcludeCocal(s.school?.district, s.school?.schoolName)),
        [students]
    );
    const sedeStudentIdSet = useMemo(() => new Set(sedeStudents.map(s => s.id)), [sedeStudents]);
    const sedeSupportProfessionals = useMemo(
        () => supportProfessionals.filter(sp => isSupportProfessionalActive(sp) && sedeSchoolIdSet.has(sp.schoolId)),
        [supportProfessionals, sedeSchoolIdSet]
    );
    const sedeLinkedIds = useMemo(() => {
        const set = new Set<string>();
        for (const sp of sedeSupportProfessionals) {
            const sid = (sp.studentId || '').trim();
            if (sid && sedeStudentIdSet.has(sid)) set.add(sid);
        }
        return set;
    }, [sedeSupportProfessionals, sedeStudentIdSet]);
    const sedeCoberturaPct = useMemo(() => {
        if (sedeStudents.length === 0) return 100;
        return Math.round((sedeStudents.filter(s => sedeLinkedIds.has(s.id)).length / sedeStudents.length) * 100);
    }, [sedeStudents, sedeLinkedIds]);

    const headerDate = capitalizePt(
        new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
    );

    const alunosSemApoioSorted = useMemo(
        () =>
            [...studentsSemApoio].sort((a, b) =>
                (a.school?.schoolName || '').localeCompare(b.school?.schoolName || '', 'pt-BR')
            ),
        [studentsSemApoio]
    );

    const teaAutismCocalCount = useMemo(() => countTeaAutismStudents(cocalStudents), [cocalStudents]);

    const diagResumo = (s: Student) => {
        const cid = (s.clinical?.cid || '').trim();
        const sn0 = (s.clinical?.specialNeeds && s.clinical.specialNeeds[0]) || '';
        return cid || sn0 || '—';
    };

    if (loading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="font-medium">Carregando painel da Secretaria (Cocal)…</span>
            </div>
        );
    }

    const displayName = (currentUser.name || '').trim() || 'Secretaria';

    return (
        <div className="relative mx-auto max-w-7xl space-y-8 p-6 animate-slideUp">
            <header className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-black text-slate-900">Olá, {displayName}</h1>
                    <span className="rounded-full border border-teal-600 bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-900">
                        Secretaria — Distrito de Cocal
                    </span>
                </div>
                <p className="text-slate-600">Gestão das escolas do Distrito de Cocal</p>
                <p className="text-sm font-medium text-slate-500">{headerDate}</p>
            </header>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <button
                    type="button"
                    onClick={() => onNavigate('list')}
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-left transition-all hover:border-primary-300 hover:shadow-lg"
                >
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Alunos AEE — Cocal</p>
                            <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-800">{cocalStudents.length}</h3>
                            {studentsSemApoio.length > 0 ? (
                                <p className="mt-2 text-xs font-semibold text-red-600">
                                    {studentsSemApoio.length} sem apoio vinculado
                                </p>
                            ) : (
                                <p className="mt-2 text-xs font-medium text-slate-400">Todos com apoio vinculado neste recorte</p>
                            )}
                        </div>
                        <div className="rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 p-3 text-white shadow-lg">
                            <Users size={20} />
                        </div>
                    </div>
                </button>
                <StatCard
                    title="Profissionais de apoio — Cocal"
                    value={cocalSupportProfessionals.length}
                    icon={UserCheck}
                    gradient="from-sky-500 to-blue-600"
                    subtext={`${profSemAluno.length} sem aluno vinculado`}
                    onClick={() => onNavigate('support-professionals')}
                />
                <button
                    type="button"
                    onClick={() => onNavigate('support-professionals')}
                    className={`relative overflow-hidden rounded-2xl border bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-left transition-all hover:shadow-lg ${
                        coberturaBaixa ? 'border-2 border-red-500 ring-2 ring-red-200' : 'border border-slate-200'
                    }`}
                >
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Cobertura — Cocal</p>
                    <h3 className={`mt-2 text-3xl font-extrabold tracking-tight ${coberturaColorClass}`}>{coberturaPct}%</h3>
                    <p className="mt-2 text-xs font-medium text-slate-500">Meta: 100% de cobertura</p>
                    {coberturaBaixa && (
                        <p className="mt-2 text-xs font-bold text-red-600">Cobertura abaixo de 50% — priorize vínculos e vagas.</p>
                    )}
                    <div className="absolute right-4 top-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 text-white shadow-lg">
                        <Activity size={20} />
                    </div>
                </button>
                <StatCard
                    title="Agendamentos Cocal hoje"
                    value={apptsCocalHoje.length}
                    icon={Calendar}
                    gradient="from-orange-400 to-amber-600"
                    subtext={`${apptsCocalHoje.filter(a => a.status === 'CONFIRMADO').length} confirmados`}
                    onClick={() => onNavigate('scheduling')}
                />
                <StatCard
                    title="Alunos com TEA/Autismo"
                    value={teaAutismCocalCount}
                    icon={Puzzle}
                    gradient="from-blue-400 to-blue-600"
                    subtext="Diagnóstico registrado"
                    onClick={() => onNavigate('list')}
                />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                        <Building2 className="h-5 w-5 text-slate-600" />
                        Cobertura por escola (Cocal)
                    </h2>
                    <ul className="max-h-[28rem] space-y-4 overflow-y-auto pr-1">
                        {schoolCoverageRows.map(({ escola, totalAlunos, comApoio, pct }) => {
                            const barColor = pct >= 70 ? '#1D9E75' : pct >= 50 ? '#BA7517' : '#E24B4A';
                            return (
                                <li key={escola.id} className="space-y-1">
                                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                                        <span className="font-semibold text-slate-800">{escola.name}</span>
                                        <span className="text-slate-600">
                                            {comApoio}/{totalAlunos} alunos · {pct}%
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                        <Link2 className="h-5 w-5 text-slate-600" />
                        Profissionais sem aluno vinculado (Cocal)
                    </h2>
                    {profSemAluno.length === 0 ? (
                        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
                            Todos os profissionais estão vinculados
                        </p>
                    ) : (
                        <ul className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                            {profSemAluno.map(sp => {
                                const esc = cocalSchools.find(x => x.id === sp.schoolId);
                                return (
                                    <li
                                        key={sp.id}
                                        className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <p className="font-semibold text-slate-800">{sp.name}</p>
                                            <p className="text-xs text-slate-600">
                                                Carga horária: {sp.workload?.trim() || '—'} · Lotação: {esc?.name || '—'}
                                            </p>
                                        </div>
                                        <span className="shrink-0 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-950">
                                            Sem vínculo
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <button
                        type="button"
                        className="mt-4 w-full rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                        onClick={() => onNavigate('support-professionals')}
                    >
                        Gerenciar vínculos
                    </button>
                </section>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-4 text-lg font-bold text-slate-800">Alunos sem profissional de apoio (Cocal)</h2>
                    <p className="mb-3 text-xs font-medium text-slate-500">Total: {studentsSemApoio.length}</p>
                    <ul className="space-y-3">
                        {alunosSemApoioSorted.slice(0, 6).map(s => (
                            <li
                                key={s.id}
                                className="flex flex-col gap-1 rounded-xl border border-red-100 bg-red-50/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="font-semibold text-slate-800">{s.fullName}</p>
                                    <p className="text-xs text-slate-600">
                                        {s.school?.schoolName || '—'} · {diagResumo(s)}
                                    </p>
                                </div>
                                <span className="shrink-0 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-900">
                                    Sem apoio
                                </span>
                            </li>
                        ))}
                    </ul>
                    <button
                        type="button"
                        className="mt-4 w-full rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                        onClick={() => onNavigate('list')}
                    >
                        Ver todos
                    </button>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-4 text-lg font-bold text-slate-800">Alertas operacionais de Cocal</h2>
                    <div className="space-y-4 text-sm">
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                            <p className="font-bold text-red-900">Crítico</p>
                            {coberturaBaixa ? (
                                <p className="mt-1 font-semibold text-red-950">
                                    Cobertura geral em Cocal: <strong>{coberturaPct}%</strong> (abaixo de 50%).
                                </p>
                            ) : (
                                <p className="mt-1 text-red-900/80">Cobertura geral em Cocal acima ou igual a 50%.</p>
                            )}
                            <p className="mt-3 font-semibold text-red-900">Alunos TEA sem profissional</p>
                            {teaSemProf.length > 0 ? (
                                <ul className="mt-1 list-inside list-disc text-red-950">
                                    {teaSemProf.slice(0, 6).map(s => (
                                        <li key={s.id}>{s.fullName}</li>
                                    ))}
                                    {teaSemProf.length > 6 && <li>+ {teaSemProf.length - 6}</li>}
                                </ul>
                            ) : (
                                <p className="mt-1 text-red-900/80">Nenhum caso neste recorte.</p>
                            )}
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <p className="font-bold text-amber-950">Atenção</p>
                            <p className="mt-1 text-amber-950">
                                {escolasSemInternet.length > 0
                                    ? `${escolasSemInternet.length} escola(s) sem conectividade verificada`
                                    : 'Todas as escolas de Cocal com conectividade verificada ou não informada.'}
                            </p>
                            <p className="mt-2 text-amber-950">
                                Alunos com status &quot;Pending&quot; em Cocal: <strong>{alunosPendingCocal.length}</strong>
                            </p>
                            <p className="mt-2 text-amber-950">
                                Profissionais com contrato há mais de 12 meses (revisar):{' '}
                                <strong>{profContractStale.length}</strong>
                            </p>
                        </div>
                        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                            <p className="font-bold text-sky-950">Info</p>
                            <p className="mt-1 text-sky-950">
                                Agendamentos de Cocal nesta semana: <strong>{apptsCocalSemana.length}</strong>
                            </p>
                            <p className="mt-2 text-sky-950">
                                Comparativo de cobertura (alunos com apoio):{' '}
                                <strong>
                                    Cocal {coberturaPct}% · Sede {sedeCoberturaPct}%
                                </strong>
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            <section>
                <h2 className="mb-4 text-lg font-bold text-slate-800">Ações rápidas de Cocal</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <ActionCard
                        title="Novo profissional de apoio"
                        description="Cadastro e vínculos na unidade"
                        icon={UserPlus}
                        onClick={() => onNavigate('support-professionals')}
                        colorClass="bg-emerald-50 text-emerald-700"
                    />
                    <ActionCard
                        title="Relatório de Cocal (PDF)"
                        description="Relatório com timbrado da unidade Cocal"
                        icon={FileText}
                        onClick={() => onNavigate('support-professionals?tab=relatorios&unit=COCAL')}
                        colorClass="bg-slate-50 text-slate-800"
                    />
                    <ActionCard
                        title="Gerenciar escolas"
                        description="Unidades escolares e cadastros"
                        icon={School}
                        onClick={() => onNavigate('schools')}
                        colorClass="bg-amber-50 text-amber-800"
                    />
                    <ActionCard
                        title="Ver agendamentos Cocal"
                        description="Central de agendamentos (filtra por unidade no módulo)"
                        icon={Calendar}
                        onClick={() => onNavigate('scheduling')}
                        colorClass="bg-sky-50 text-sky-700"
                    />
                </div>
            </section>
        </div>
    );
};

// --- 3. PSICOLOGIA (painel home reutilizável; rota dedicada continua em PsychologyDashboard.tsx) ---
export const PsychologyDashboard: React.FC<DashboardProps> = props => (
    <SpecialistClinicalHomeDashboard
        {...props}
        registerSessionRoute="psychology/new-session"
        extraAction={{ label: 'Aplicar avaliação psicológica', route: 'psychology' }}
    />
);

// --- 4. SERVIÇO SOCIAL ---
export const SocialServiceDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {

    // Cálculo de Indicadores Unificados
    const stats = useMemo(() => {
        let totalSessions = 0;
        let vulnerableCount = 0;
        let familiesCount = 0;
        let referralsCount = 0;

        const activeStudents = students.filter(s => {
            const hasSocialData = s.clinical?.social_data || (s.history && s.history.some(h => h.specialty === Specialty.SOCIAL_WORK));
            return hasSocialData;
        });

        familiesCount = activeStudents.length;

        students.forEach(s => {
            // Contagem de Sessões/Visitas (Histórico)
            const sessions = s.history?.filter(h => h.specialty === Specialty.SOCIAL_WORK) || [];
            totalSessions += sessions.length;

            // Vulnerabilidade (Busca Ativa + Entrevista)
            const isVulnerableBusca = s.clinical?.social_data?.formData?.parecer?.prioridade === 'Alta';
            const isVulnerableEntrevista = s.clinical?.social_interview?.formData?.analiseTecnica?.prioridadeCaso === 'Alta';

            if (isVulnerableBusca || isVulnerableEntrevista) {
                vulnerableCount++;
            }

            // Encaminhamentos (Estimativa simples)
            if (s.clinical?.social_data?.formData?.parecer?.encaminhamentos || s.clinical?.social_interview?.formData?.analiseTecnica?.encaminhamentos) {
                referralsCount++;
            }
        });

        return { totalSessions, vulnerableCount, familiesCount, referralsCount };
    }, [students]);

    const teaAutismSocialCount = useMemo(() => countTeaAutismStudents(students), [students]);

    return (
        <div className="space-y-8 animate-slideUp">
            <WelcomeHeader name={currentUser.name.split(' ')[0]} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ActionCard
                    title="Acessar Formulários"
                    description="Hub central para Busca Ativa e Entrevista Social"
                    icon={Heart}
                    onClick={() => onNavigate('social-service-hub')}
                    colorClass="bg-cyan-50 text-cyan-600"
                />
                <ActionCard
                    title="Alunos Acompanhados"
                    description="Lista geral e histórico de atendimentos"
                    icon={Users}
                    onClick={() => onNavigate('social-service-list')}
                    colorClass="bg-sky-50 text-sky-600"
                />
                <ActionCard
                    title="Minha Agenda"
                    description="Verificar visitas e atendimentos futuros"
                    icon={Calendar}
                    onClick={() => onNavigate('scheduling')}
                    colorClass="bg-indigo-50 text-indigo-600"
                />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <StatCard
                    title="Atendimentos/Visitas"
                    value={stats.totalSessions}
                    icon={School}
                    gradient="from-cyan-400 to-blue-500"
                    subtext="Total Registrado"
                    onClick={() => onNavigate('social-service-list')}
                />
                <StatCard
                    title="Casos Prioritários"
                    value={stats.vulnerableCount}
                    icon={AlertTriangle}
                    gradient="from-red-400 to-rose-500"
                    subtext="Alta Prioridade"
                    onClick={() => onNavigate('social-service-list')}
                />
                <StatCard
                    title="Famílias Acomp."
                    value={stats.familiesCount}
                    icon={Users}
                    gradient="from-blue-400 to-indigo-500"
                    subtext="Em Acompanhamento"
                    onClick={() => onNavigate('social-service-list')}
                />
                <StatCard
                    title="Encaminhamentos"
                    value={stats.referralsCount}
                    icon={FileText}
                    gradient="from-teal-400 to-emerald-500"
                    subtext="Rede de Proteção"
                    onClick={() => onNavigate('social-service-hub')}
                />
                <StatCard
                    title="Alunos com TEA/Autismo"
                    value={teaAutismSocialCount}
                    icon={Puzzle}
                    gradient="from-blue-400 to-blue-600"
                    subtext="Diagnóstico registrado"
                    onClick={() => onNavigate('list')}
                />
            </div>
        </div>
    );
};

// --- 5. TERAPIA OCUPACIONAL ---
export const OccupationalTherapyDashboard: React.FC<DashboardProps> = props => (
    <SpecialistClinicalHomeDashboard
        {...props}
        registerSessionRoute="occupational-therapy/new-session"
        extraAction={{ label: 'Módulo Terapia Ocupacional', route: 'occupational-therapy' }}
    />
);

// --- 6. PSICOPEDAGOGIA ---
export const PsychopedagogyDashboard: React.FC<DashboardProps> = props => (
    <SpecialistClinicalHomeDashboard
        {...props}
        registerSessionRoute="psychopedagogy/new-session"
        extraAction={{ label: 'Aplicar Portage IPO', route: 'psychopedagogy' }}
    />
);

// --- 7. FONOAUDIOLOGIA ---
export const SpeechTherapyDashboard: React.FC<DashboardProps> = props => (
    <SpecialistClinicalHomeDashboard
        {...props}
        registerSessionRoute="speech-therapy/new-session"
        extraAction={{ label: 'Módulo Fonoaudiologia', route: 'speech-therapy' }}
    />
);

// --- 8. NUTRIÇÃO ---
export const NutritionDashboard: React.FC<DashboardProps> = props => (
    <SpecialistClinicalHomeDashboard
        {...props}
        registerSessionRoute="nutrition/new-session"
        extraAction={{ label: 'Módulo Nutrição', route: 'nutrition' }}
    />
);

// --- ASSISTENTE (visão operacional, sem dados clínicos detalhados) ---
export const AssistantDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate, onOpenPatient }) => {
    const [rawAppointments, setRawAppointments] = useState<Appointment[]>([]);
    const [documents, setDocuments] = useState<SavedDocument[]>([]);
    const [inbox, setInbox] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [silentRefresh, setSilentRefresh] = useState(false);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);

    const loadData = React.useCallback(
        async (silent: boolean) => {
            if (silent) setSilentRefresh(true);
            else setLoading(true);
            try {
                const [apts, docs, msgs] = await Promise.all([
                    SupabaseService.getAppointments({}),
                    SupabaseService.getDocuments(),
                    SupabaseService.getNotificationsInbox(currentUser.id),
                ]);
                setRawAppointments(apts || []);
                setDocuments(docs || []);
                setInbox(msgs || []);
            } catch (e) {
                console.error('[AssistantDashboard] Erro ao carregar:', e);
            } finally {
                if (silent) setSilentRefresh(false);
                else setLoading(false);
            }
        },
        [currentUser.id]
    );

    useEffect(() => {
        void loadData(false);
    }, [loadData, currentUser.scope]);

    const todayY = ymdLocal();

    const scopedAppts = useMemo(
        () => rawAppointments.filter(a => matchesSpecialistUnit(a, currentUser.scope)),
        [rawAppointments, currentUser.scope]
    );

    const scopedStudents = useMemo(
        () => students.filter(s => studentInAssistantScope(s, currentUser.scope)),
        [students, currentUser.scope]
    );

    const scopedStudentIds = useMemo(() => new Set(scopedStudents.map(s => s.id)), [scopedStudents]);

    const documentsScoped = useMemo(
        () => documents.filter(d => scopedStudentIds.has(d.studentId)),
        [documents, scopedStudentIds]
    );

    const apptsToday = useMemo(
        () => scopedAppts.filter(a => a.date === todayY).sort(sortAppointmentsByStart),
        [scopedAppts, todayY]
    );

    const apptsNext3Days = useMemo(() => {
        const start = addDaysToYmd(todayY, 1);
        const end = addDaysToYmd(todayY, 3);
        return scopedAppts
            .filter(a => a.date >= start && a.date <= end)
            .sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : sortAppointmentsByStart(a, b)));
    }, [scopedAppts, todayY]);

    const agendaByProfessional = useMemo(() => {
        const map = new Map<string, Appointment[]>();
        for (const a of apptsToday) {
            const key = (a.professionalName || '').trim() || 'Profissional';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(a);
        }
        for (const [, list] of map) list.sort(sortAppointmentsByStart);
        return Array.from(map.entries()).sort(([, aa], [, bb]) => sortAppointmentsByStart(aa[0], bb[0]));
    }, [apptsToday]);

    const unreadInbox = useMemo(() => inbox.filter(m => !m.is_read), [inbox]);

    const headerSubtitle = useMemo(() => {
        const hour = new Date().getHours();
        const attended = apptsToday.filter((a) => statusAgendamentoRealizado(a.status)).length;
        const pending = apptsToday.filter(a => a.status === 'AGENDADO').length;
        const unit = scopeUnitLabel(currentUser.scope);
        if (hour < 12)
            return `${apptsToday.length} horário(s) hoje (${unit}) · ${pending} aguardando confirmação`;
        if (hour < 18) return `${apptsToday.length} horário(s) hoje · ${pending} ainda como AGENDADO`;
        return `Encerrando o dia: ${attended} atendimento(s) encerrado(s) na agenda (inclui legado ATENDIDO).`;
    }, [apptsToday, currentUser.scope]);

    const stats = useMemo(() => {
        const weekEnd = addDaysToYmd(todayY, 6);
        const weekScoped = scopedAppts.filter(a => a.date >= todayY && a.date <= weekEnd);
        const sevenDaysAgo = addDaysToYmd(todayY, -7);
        const docsWeek = documentsScoped.filter(d => (d.createdAt || '').slice(0, 10) >= sevenDaysAgo);
        return {
            todayCount: apptsToday.length,
            pendingConfirm: apptsToday.filter(a => a.status === 'AGENDADO').length,
            activeStudents: scopedStudents.filter(s => s.status === 'Active').length,
            weekAppts: weekScoped.length,
            docsRecent: docsWeek.length,
            unread: unreadInbox.length,
        };
    }, [apptsToday, scopedAppts, scopedStudents, documentsScoped, todayY, unreadInbox.length]);

    const teaAutismScopedCount = useMemo(() => countTeaAutismStudents(scopedStudents), [scopedStudents]);

    const handleConfirm = async (id: string) => {
        setConfirmingId(id);
        try {
            await SupabaseService.updateAppointmentStatus(id, 'CONFIRMADO');
            await loadData(true);
        } catch (e) {
            console.error(e);
            window.alert('Não foi possível confirmar o agendamento.');
        } finally {
            setConfirmingId(null);
        }
    };

    const handleSendQuickMessage = async () => {
        const recipientId = window.prompt('ID do destinatário (UUID do usuário no sistema):');
        if (!recipientId?.trim()) return;
        const title = window.prompt('Assunto:') || 'Mensagem';
        const content = window.prompt('Mensagem:') || '';
        if (!content.trim()) return;
        try {
            await SupabaseService.sendSystemMessage(
                currentUser.id,
                recipientId.trim(),
                title.trim(),
                content.trim(),
                'normal',
                'MESSAGE'
            );
            window.alert('Mensagem enviada.');
        } catch (e) {
            console.error(e);
            window.alert('Falha ao enviar a mensagem.');
        }
    };

    const scrollToPending = () => {
        document.getElementById('assistant-pending-confirm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    /** Abre a rota de perfil (/app/profile) só se o aluno existir e estiver no mesmo escopo de unidade do assistente. */
    const openStudentFicha = (studentId: string | undefined) => {
        if (!onOpenPatient || !studentId) return;
        const st = students.find(s => s.id === studentId);
        if (!st) {
            window.alert('Cadastro não encontrado na lista carregada. Use a lista de alunos para localizar.');
            return;
        }
        if (!studentInAssistantScope(st, currentUser.scope)) {
            window.alert('Este cadastro está fora do escopo da sua unidade.');
            return;
        }
        onOpenPatient(studentId);
    };

    if (loading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="font-medium">Carregando painel do assistente…</span>
            </div>
        );
    }

    const firstName = (currentUser.name || 'Assistente').split(/\s+/)[0];

    return (
        <div className="relative mx-auto max-w-7xl space-y-8 p-6">
            {silentRefresh && (
                <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Atualizando…
                </div>
            )}

            <WelcomeHeader name={firstName} subtitle={headerSubtitle} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Agenda hoje (unidade)"
                    value={stats.todayCount}
                    icon={Calendar}
                    gradient="from-sky-500 to-blue-600"
                    subtext={`${stats.pendingConfirm} pendente(s) de confirmação`}
                    onClick={() => onNavigate('scheduling')}
                />
                <StatCard
                    title="Alunos ativos (escopo)"
                    value={stats.activeStudents}
                    icon={Users}
                    gradient="from-emerald-500 to-teal-600"
                    subtext={scopeUnitLabel(currentUser.scope)}
                    onClick={() => onNavigate('list')}
                />
                <StatCard
                    title="Mensagens não lidas"
                    value={stats.unread}
                    icon={Bell}
                    gradient="from-amber-500 to-orange-600"
                    subtext="Diretas e avisos gerais"
                    onClick={() => onNavigate('my-access')}
                />
                <StatCard
                    title="Alunos com TEA/Autismo"
                    value={teaAutismScopedCount}
                    icon={Puzzle}
                    gradient="from-blue-400 to-blue-600"
                    subtext="Diagnóstico registrado"
                    onClick={() => onNavigate('list')}
                />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                                <Clock size={20} className="text-teal-600" />
                                Agenda de hoje — por especialista
                            </h3>
                            <button
                                type="button"
                                onClick={() => onNavigate('scheduling')}
                                className="text-xs font-bold text-teal-700 hover:underline"
                            >
                                Ver agenda completa
                            </button>
                        </div>
                        {agendaByProfessional.length === 0 ? (
                            <p className="text-sm text-slate-400">Nenhum agendamento hoje no seu escopo.</p>
                        ) : (
                            <div className="space-y-6">
                                {agendaByProfessional.map(([proName, list]) => (
                                    <div key={proName}>
                                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{proName}</p>
                                        <ul className="space-y-2">
                                            {list.map(apt => (
                                                <li
                                                    key={apt.id}
                                                    className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-800">
                                                            {(apt.startTime || '—').slice(0, 5)} – {(apt.endTime || '—').slice(0, 5)}
                                                        </p>
                                                        <p className="truncate text-sm font-semibold text-slate-700">{apt.studentName}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {apt.specialty ? String(apt.specialty) : '—'} · {apt.unit || '—'}
                                                        </p>
                                                        {apt.telefoneResponsavel ? (
                                                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                                                                <Phone size={12} className="shrink-0" />
                                                                {apt.telefoneResponsavel}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span
                                                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${appointmentStatusBadgeClass(apt.status)}`}
                                                        >
                                                            {apt.status}
                                                        </span>
                                                        {onOpenPatient && apt.studentId ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => openStudentFicha(apt.studentId)}
                                                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50/60"
                                                            >
                                                                <FileText size={14} />
                                                                Ficha do aluno
                                                            </button>
                                                        ) : null}
                                                        {apt.status === 'AGENDADO' && (
                                                            <button
                                                                type="button"
                                                                disabled={confirmingId === apt.id}
                                                                onClick={() => void handleConfirm(apt.id)}
                                                                className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                                                            >
                                                                {confirmingId === apt.id ? '…' : 'Confirmar'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div
                        id="assistant-pending-confirm"
                        className="rounded-3xl border border-amber-200 bg-amber-50/40 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                    >
                        <h3 className="mb-3 text-lg font-bold text-slate-800">Confirmações pendentes (hoje)</h3>
                        <p className="mb-4 text-sm text-slate-600">
                            Agendamentos em <span className="font-semibold">AGENDADO</span> que você pode confirmar com um clique.
                        </p>
                        {apptsToday.filter(a => a.status === 'AGENDADO').length === 0 ? (
                            <p className="text-sm text-slate-500">Nenhuma pendência de confirmação para hoje.</p>
                        ) : (
                            <ul className="space-y-2">
                                {apptsToday
                                    .filter(a => a.status === 'AGENDADO')
                                    .sort(sortAppointmentsByStart)
                                    .map(apt => (
                                        <li
                                            key={`pend-${apt.id}`}
                                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100 bg-white px-4 py-3 text-sm"
                                        >
                                            <span className="font-semibold text-slate-700">
                                                {(apt.startTime || '').slice(0, 5)} · {apt.studentName} · {apt.professionalName || '—'}
                                            </span>
                                            <span className="flex flex-wrap items-center gap-2">
                                                {onOpenPatient && apt.studentId ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => openStudentFicha(apt.studentId)}
                                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        Ficha
                                                    </button>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    disabled={confirmingId === apt.id}
                                                    onClick={() => void handleConfirm(apt.id)}
                                                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                                >
                                                    {confirmingId === apt.id ? 'Confirmando…' : 'Confirmar presença'}
                                                </button>
                                            </span>
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-800">
                            <Calendar size={20} className="text-amber-600" />
                            Próximos 3 dias
                        </h3>
                        {apptsNext3Days.length === 0 ? (
                            <p className="text-sm text-slate-400">Nenhum agendamento neste período.</p>
                        ) : (
                            <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
                                {apptsNext3Days.slice(0, 24).map(apt => (
                                    <li
                                        key={apt.id}
                                        className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-2 last:border-0"
                                    >
                                        <span className="font-semibold text-slate-700">
                                            {new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                                                weekday: 'short',
                                                day: '2-digit',
                                                month: '2-digit',
                                            })}{' '}
                                            · {(apt.startTime || '').slice(0, 5)} · {apt.studentName}
                                        </span>
                                        <span className="text-xs text-slate-500">{apt.professionalName || ''}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                                <Bell size={20} className="text-rose-500" />
                                Caixa de mensagens
                            </h3>
                            <button
                                type="button"
                                onClick={() => onNavigate('my-access')}
                                className="text-xs font-bold text-teal-700 hover:underline"
                            >
                                Ver todas
                            </button>
                        </div>
                        {unreadInbox.length === 0 ? (
                            <p className="text-sm text-slate-400">Nenhuma mensagem não lida.</p>
                        ) : (
                            <ul className="max-h-64 space-y-3 overflow-y-auto">
                                {unreadInbox.slice(0, 6).map((n: any) => (
                                    <li key={n.id} className="border-b border-slate-100 pb-3 last:border-0">
                                        <p className="text-sm font-bold text-slate-800">{n.title || 'Mensagem'}</p>
                                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                                            {String(n.content || '').slice(0, 120)}
                                            {String(n.content || '').length > 120 ? '…' : ''}
                                        </p>
                                        <p className="mt-1 text-[11px] text-slate-400">
                                            {n.sender?.full_name || 'Sistema'}
                                            {n.priority === 'urgent' ? ' · urgente' : ''} · {formatRelativePt(n.created_at)}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumo rápido</p>
                        <p className="mt-2 text-sm text-slate-600">
                            <span className="font-bold text-slate-800">{stats.weekAppts}</span> agendamentos na semana (escopo) ·{' '}
                            <span className="font-bold text-slate-800">{stats.docsRecent}</span> documento(s) gerados nos últimos 7 dias
                            (alunos do escopo)
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                <h3 className="mb-4 text-lg font-bold text-slate-800">Ações rápidas</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    <button
                        type="button"
                        onClick={() => onNavigate('scheduling')}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-800 hover:border-teal-300 hover:bg-teal-50/60"
                    >
                        Central de agendamentos
                    </button>
                    <button
                        type="button"
                        onClick={() => onNavigate('list')}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-800 hover:border-teal-300 hover:bg-teal-50/60"
                    >
                        Lista de alunos
                    </button>
                    <button
                        type="button"
                        onClick={() => onNavigate('documents')}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-800 hover:border-teal-300 hover:bg-teal-50/60"
                    >
                        Documentos
                    </button>
                    <button
                        type="button"
                        onClick={() => onNavigate('my-access')}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-800 hover:border-teal-300 hover:bg-teal-50/60"
                    >
                        Minhas mensagens
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSendQuickMessage()}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-800 hover:border-teal-300 hover:bg-teal-50/60"
                    >
                        <span className="inline-flex items-center gap-2">
                            <Send size={16} />
                            Enviar mensagem
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={scrollToPending}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-800 hover:border-teal-300 hover:bg-teal-50/60"
                    >
                        Confirmar presenças pendentes
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 9. ESCOLA ---
export const SchoolDashboard: React.FC<DashboardProps> = ({
    students,
    currentUser,
    onNavigate,
    onOpenPatient,
}) => {
    const myStudents = useMemo(
        () => students.filter(s => s.school.schoolId === currentUser.schoolId),
        [students, currentUser.schoolId]
    );

    const [supportProfessionals, setSupportProfessionals] = useState<SupportProfessional[]>([]);
    const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
    const [schoolsList, setSchoolsList] = useState<SchoolEntity[]>([]);
    const [loadingRemote, setLoadingRemote] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingRemote(true);
            try {
                const sid = (currentUser.schoolId || '').trim();
                const [sp, apts, sch] = await Promise.all([
                    SupabaseService.getSupportProfessionals(sid || undefined),
                    SupabaseService.getAppointments({}),
                    SupabaseService.getSchools(),
                ]);
                if (!cancelled) {
                    setSupportProfessionals(sp);
                    setAllAppointments(apts);
                    setSchoolsList(sch);
                }
            } catch (e) {
                console.error('[SchoolDashboard] Erro ao carregar dados:', e);
                if (!cancelled) {
                    setSupportProfessionals([]);
                    setAllAppointments([]);
                    setSchoolsList([]);
                }
            } finally {
                if (!cancelled) setLoadingRemote(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [currentUser.schoolId]);

    const schoolSupportProfessionals = useMemo(
        () =>
            supportProfessionals.filter(
                sp => isSupportProfessionalActive(sp) && sp.schoolId === currentUser.schoolId
            ),
        [supportProfessionals, currentUser.schoolId]
    );

    const studentIdsWithSupport = useMemo(() => {
        const set = new Set<string>();
        for (const sp of schoolSupportProfessionals) {
            if (sp.studentId && sp.studentId.trim()) set.add(sp.studentId);
        }
        return set;
    }, [schoolSupportProfessionals]);

    const myStudentIdSet = useMemo(() => new Set(myStudents.map(s => s.id)), [myStudents]);

    const todayYmd = ymdLocal();
    const weekEndYmd = addDaysToYmd(todayYmd, 6);

    const appointmentsThisWeekForSchool = useMemo(() => {
        return allAppointments.filter(a => {
            if (!myStudentIdSet.has(a.studentId)) return false;
            if (a.status === 'CANCELADO') return false;
            return a.date >= todayYmd && a.date <= weekEndYmd;
        });
    }, [allAppointments, myStudentIdSet, todayYmd, weekEndYmd]);

    const coverageCount = useMemo(
        () => myStudents.filter(s => studentIdsWithSupport.has(s.id)).length,
        [myStudents, studentIdsWithSupport]
    );

    const coveragePct = myStudents.length === 0 ? 0 : Math.round((coverageCount / myStudents.length) * 100);

    const coverageColorClass =
        coveragePct >= 70
            ? 'border-emerald-200 bg-emerald-50/80'
            : coveragePct >= 50
              ? 'border-amber-200 bg-amber-50/80'
              : 'border-rose-200 bg-rose-50/80';

    const confirmedThisWeek = useMemo(
        () => appointmentsThisWeekForSchool.filter(a => a.status === 'CONFIRMADO').length,
        [appointmentsThisWeekForSchool]
    );

    const morningCount = useMemo(
        () => myStudents.filter(s => s.school?.shift === 'Manhã').length,
        [myStudents]
    );
    const afternoonCount = useMemo(
        () => myStudents.filter(s => s.school?.shift === 'Tarde').length,
        [myStudents]
    );

    const schoolRecord = useMemo(
        () => schoolsList.find(s => s.id === currentUser.schoolId),
        [schoolsList, currentUser.schoolId]
    );

    const displaySchoolName =
        schoolRecord?.name || myStudents[0]?.school?.schoolName || 'Escola';

    const sortedMyStudents = useMemo(
        () => [...myStudents].sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR')),
        [myStudents]
    );

    const visibleStudents = sortedMyStudents.slice(0, 8);

    const upcomingAppointments = useMemo(() => {
        return allAppointments
            .filter(
                a =>
                    myStudentIdSet.has(a.studentId) &&
                    a.date >= todayYmd &&
                    a.status !== 'CANCELADO'
            )
            .sort((a, b) => {
                const d = a.date.localeCompare(b.date);
                if (d !== 0) return d;
                return (a.startTime || '').localeCompare(b.startTime || '');
            })
            .slice(0, 6);
    }, [allAppointments, myStudentIdSet, todayYmd]);

    const teaTrackedCount = useMemo(() => countTeaAutismStudents(myStudents), [myStudents]);

    const withoutSupportCount = myStudents.length - coverageCount;
    const pendingCount = useMemo(() => myStudents.filter(s => s.status === 'Pending').length, [myStudents]);

    const studentsWithAppointmentThisWeek = useMemo(() => {
        const ids = new Set<string>();
        for (const a of appointmentsThisWeekForSchool) ids.add(a.studentId);
        return ids.size;
    }, [appointmentsThisWeekForSchool]);

    const diagnosisSummary = (s: Student): string => {
        const cid = (s.clinical?.cid || '').trim();
        if (cid) return cid;
        const sn0 = (s.clinical?.specialNeeds || []).find(x => (x || '').trim());
        if (sn0) return sn0.trim();
        return 'Não informado';
    };

    const statusStudentBadge = (st: Student['status']) => {
        if (st === 'Active') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
        if (st === 'Pending') return 'bg-amber-100 text-amber-900 border border-amber-200';
        return 'bg-slate-200 text-slate-700 border border-slate-300';
    };

    const initialsOf = (name: string) => {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    };

    const openReadonlyRecord = (studentId: string) => {
        if (onOpenPatient) {
            onOpenPatient(studentId);
            return;
        }
        onNavigate('list');
    };

    const unitBadgeClass = (u: Unit) =>
        u === 'SEDE'
            ? 'bg-sky-100 text-sky-900 border border-sky-200'
            : 'bg-amber-100 text-amber-900 border border-amber-200';

    return (
        <div className="space-y-8 animate-slideUp">
            <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white shadow-[0_8px_30px_rgba(16,185,129,0.25)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-emerald-100">Olá, {currentUser.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{displaySchoolName}</h1>
                            <span className="rounded-full border border-white/40 bg-white/15 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                                Escola
                            </span>
                        </div>
                        <p className="mt-2 max-w-2xl text-sm font-medium text-emerald-50">
                            Acompanhamento dos alunos AEE — somente leitura
                        </p>
                        {currentUser.schoolInep ? (
                            <p className="mt-1 text-xs text-emerald-100/90">INEP: {currentUser.schoolInep}</p>
                        ) : null}
                    </div>
                    <div className="hidden opacity-90 md:block">
                        <School size={72} className="text-white" />
                    </div>
                </div>
            </div>

            {loadingRemote ? (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    Carregando dados da escola…
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <button
                    type="button"
                    onClick={() => onNavigate('list')}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-left transition-all hover:border-emerald-300 hover:shadow-md"
                >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alunos AEE matriculados</p>
                    <p className="mt-2 text-3xl font-extrabold text-slate-900">{myStudents.length}</p>
                    <p className="mt-2 text-xs text-slate-500">
                        Manhã: {morningCount} · Tarde: {afternoonCount}
                    </p>
                </button>
                <button
                    type="button"
                    onClick={() => onNavigate('support-professionals')}
                    className={`rounded-2xl border p-6 shadow-sm text-left transition-all hover:shadow-md ${coverageColorClass}`}
                >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Com profissional de apoio</p>
                    <p className="mt-2 text-3xl font-extrabold text-slate-900">
                        {coverageCount} <span className="text-lg font-bold text-slate-500">de</span> {myStudents.length}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-600">Cobertura: {coveragePct}%</p>
                </button>
                <button
                    type="button"
                    onClick={() => onNavigate('scheduling')}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-left transition-all hover:border-emerald-300 hover:shadow-md"
                >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Agendamentos esta semana</p>
                    <p className="mt-2 text-3xl font-extrabold text-slate-900">{appointmentsThisWeekForSchool.length}</p>
                    <p className="mt-2 text-xs text-slate-500">{confirmedThisWeek} confirmados</p>
                </button>
                <button
                    type="button"
                    onClick={() => onNavigate('list')}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-left transition-all hover:border-emerald-300 hover:shadow-md"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alunos com TEA/Autismo</p>
                            <p className="mt-2 text-3xl font-extrabold text-slate-900">{teaTrackedCount}</p>
                            <p className="mt-2 text-xs text-slate-500">Diagnóstico registrado</p>
                        </div>
                        <div className="rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 p-3 text-white shadow-lg">
                            <Puzzle size={22} />
                        </div>
                    </div>
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-lg font-bold text-slate-800">Alunos da escola</h2>
                        <button
                            type="button"
                            onClick={() => onNavigate('list')}
                            className="text-xs font-bold text-emerald-700 hover:underline"
                        >
                            Ver todos {myStudents.length} alunos
                        </button>
                    </div>
                    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        {visibleStudents.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-500">Nenhum aluno AEE vinculado a esta escola.</p>
                        ) : (
                            visibleStudents.map(s => {
                                const hasSp = studentIdsWithSupport.has(s.id);
                                return (
                                    <div
                                        key={s.id}
                                        className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="flex min-w-0 flex-1 gap-3">
                                            {s.photoUrl ? (
                                                <img
                                                    src={s.photoUrl}
                                                    alt=""
                                                    className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white"
                                                />
                                            ) : (
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white ring-2 ring-white">
                                                    {initialsOf(s.fullName)}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="truncate font-bold text-slate-900">{s.fullName}</p>
                                                <p className="text-xs text-slate-600">
                                                    {s.school?.grade || '—'} · {s.school?.shift || '—'}
                                                </p>
                                                <p className="text-xs text-slate-500">{s.school?.teachingType || '—'}</p>
                                                <p className="mt-1 truncate text-xs text-slate-600">{diagnosisSummary(s)}</p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                            hasSp
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : 'bg-rose-100 text-rose-800'
                                                        }`}
                                                    >
                                                        {hasSp ? 'Com apoio' : 'Sem apoio'}
                                                    </span>
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusStudentBadge(s.status)}`}>
                                                        {s.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => openReadonlyRecord(s.id)}
                                            className="shrink-0 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                                        >
                                            Ver prontuário
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800">Profissionais de apoio</h2>
                    <div className="max-h-[560px] space-y-3 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        {schoolSupportProfessionals.length === 0 ? (
                            <p className="py-6 text-center text-sm text-slate-500">
                                Nenhum profissional de apoio cadastrado para esta escola
                            </p>
                        ) : (
                            schoolSupportProfessionals.map(sp => {
                                const linked = !!(sp.studentId && sp.studentId.trim());
                                const stName = myStudents.find(x => x.id === sp.studentId)?.fullName || '—';
                                return (
                                    <div key={sp.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-bold text-slate-900">{sp.name}</p>
                                            <span
                                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                    linked ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                                                }`}
                                            >
                                                {linked ? 'Vinculado' : 'Sem aluno'}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-600">Formação: {sp.education || '—'}</p>
                                        <p className="text-xs text-slate-600">Carga horária: {sp.workload || '—'}</p>
                                        <p className="mt-2 text-xs text-slate-700">
                                            <span className="font-semibold">Aluno:</span> {stName}
                                        </p>
                                        <p className="text-xs text-slate-700">
                                            <span className="font-semibold">Professor regente:</span> {sp.regentTeacher || '—'}
                                        </p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-lg font-bold text-slate-800">Próximos agendamentos</h2>
                        <button
                            type="button"
                            onClick={() => onNavigate('scheduling')}
                            className="text-xs font-bold text-emerald-700 hover:underline"
                        >
                            Ver agenda completa
                        </button>
                    </div>
                    {upcomingAppointments.length === 0 ? (
                        <p className="py-6 text-center text-sm text-slate-500">Nenhum agendamento futuro para os alunos desta escola.</p>
                    ) : (
                        <ul className="space-y-3">
                            {upcomingAppointments.map(a => (
                                <li key={a.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                        <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                                        <span className="font-semibold text-slate-800">
                                            {new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR')} · {a.startTime}
                                        </span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${unitBadgeClass(a.unit)}`}>
                                            {a.unit}
                                        </span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${appointmentStatusBadgeClass(a.status)}`}>
                                            {a.status}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm font-bold text-slate-900">{a.studentName}</p>
                                    <p className="text-xs text-slate-600">
                                        {String(a.specialty ?? '')} · {a.professionalName}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800">Alertas da escola</h2>
                    <ul className="space-y-3 text-sm">
                        {withoutSupportCount > 0 ? (
                            <li className="flex gap-2 rounded-2xl border border-amber-100 bg-amber-50/80 p-3 text-amber-950">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                <span>
                                    <strong>Atenção:</strong> {withoutSupportCount} aluno(s) sem profissional de apoio vinculado
                                </span>
                            </li>
                        ) : null}
                        {pendingCount > 0 ? (
                            <li className="flex gap-2 rounded-2xl border border-amber-100 bg-amber-50/80 p-3 text-amber-950">
                                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                <span>
                                    <strong>Atenção:</strong> {pendingCount} aluno(s) aguardando avaliação
                                </span>
                            </li>
                        ) : null}
                        <li className="flex gap-2 rounded-2xl border border-sky-100 bg-sky-50/80 p-3 text-sky-950">
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                            <span>
                                <strong>Info:</strong> {studentsWithAppointmentThisWeek} aluno(s) com atendimento agendado esta semana
                            </span>
                        </li>
                        <li className="flex gap-2 rounded-2xl border border-sky-100 bg-sky-50/80 p-3 text-sky-950">
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                            <span>
                                <strong>Info:</strong> {teaTrackedCount} aluno(s) com diagnóstico TEA acompanhados
                            </span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800">Informações da escola</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Nome</p>
                        <p className="font-bold text-slate-900">{schoolRecord?.name || displaySchoolName}</p>
                        <p className="mt-1 text-xs text-slate-500">INEP (perfil): {currentUser.schoolInep || schoolRecord?.inep || '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Direção</p>
                        <p className="text-sm text-slate-800">{schoolRecord?.director?.trim() || '—'}</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
                        <div>
                            <p className="text-xs font-semibold uppercase text-slate-500">Telefone</p>
                            <p className="text-sm text-slate-800">{schoolRecord?.phone || '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Building2 className="mt-0.5 h-4 w-4 text-slate-400" />
                        <div>
                            <p className="text-xs font-semibold uppercase text-slate-500">Distrito</p>
                            <p className="text-sm text-slate-800">{schoolRecord?.district || '—'}</p>
                        </div>
                    </div>
                    <div className="sm:col-span-2">
                        <p className="text-xs font-semibold uppercase text-slate-500">Conectividade</p>
                        {schoolRecord?.hasInternet === true ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
                                <Wifi className="h-3.5 w-3.5" /> Com internet
                            </span>
                        ) : schoolRecord?.hasInternet === false ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                                <WifiOff className="h-3.5 w-3.5" /> Sem internet
                            </span>
                        ) : (
                            <span className="mt-1 text-xs text-slate-500">Dado não disponível no cadastro atual</span>
                        )}
                    </div>
                </div>
            </div>

            <p className="text-center text-xs text-slate-500">
                Painel consultivo: não há ações de criação, edição ou exclusão nesta visão.
            </p>
        </div>
    );
};
import React, { useMemo, useState, useEffect } from 'react';
import { Student, User, Specialty, Session, Appointment } from '../types';
import { StorageService } from '../services/storageService';
import { SupabaseService } from '../services/SupabaseService';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Users, Calendar, Activity, Clock, School, AlertTriangle, FileText, CheckCircle, Brain, HeartPulse, Stethoscope, Baby, Mic, Puzzle, Heart, Search, Settings, Shield, Download, UserPlus, Globe, TrendingUp, ArrowRight, Palette, PlusCircle, Printer } from 'lucide-react';
import { PatientList } from './PatientList';
import { WelcomeHeader } from './WelcomeHeader';

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

interface DashboardProps {
    students: Student[];
    currentUser: User;
    onNavigate: (page: string) => void;
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

const StatCard = ({ title, value, icon: Icon, gradient, subtext, trend }: any) => (
    <div className={`relative overflow-hidden p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group bg-white`}>
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
    </div>
);

// --- 1. ADMINISTRADOR GERAL ---
export const AdminDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {
    const stats = useMemo(() => {
        const total = students.length;
        const teaStudents = students.filter(s => {
            const diag = (s.clinical?.diagnosis || '').toUpperCase();
            const needs = (s.clinical?.specialNeeds || []).map(n => n.toUpperCase());
            return diag.includes('TEA') || diag.includes('AUTISMO') || needs.includes('AUTISMO') || needs.includes('TEA');
        });

        const withSupport = students.filter(s => s.school?.hasSpecialAide === true).length;
        const pendingEval = students.filter(s => s.status === 'Pending').length;

        // Distribuição TEA por Escola
        const teaBySchool = teaStudents.reduce((acc: any[], s) => {
            const school = s.school.schoolName || 'Não Informada';
            const existing = acc.find(i => i.name === school);
            if (existing) existing.value++;
            else acc.push({ name: school, value: 1 });
            return acc;
        }, []).sort((a, b) => b.value - a.value).slice(0, 5);

        // Distribuição TEA por Idade
        const teaByAge = teaStudents.reduce((acc: any[], s) => {
            if (!s.birthDate) return acc;
            const birth = new Date(s.birthDate);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

            const ageGroup = `${age} anos`;
            const existing = acc.find(i => i.name === ageGroup);
            if (existing) existing.value++;
            else acc.push({ name: ageGroup, age, value: 1 });
            return acc;
        }, []).sort((a, b) => a.age - b.age);

        return {
            total,
            teaCount: teaStudents.length,
            withSupport,
            withoutSupport: total - withSupport,
            pendingEval,
            teaBySchool,
            teaByAge
        };
    }, [students]);

    return (
        <div className="space-y-8 animate-slideUp">
            <WelcomeHeader name={currentUser.name.split(' ')[0]} />

            {/* Indicadores de Educação Inclusiva */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total Alunos" value={stats.total} icon={Users} gradient="from-blue-500 to-indigo-600" />
                <StatCard title="Alunos TEA" value={stats.teaCount} icon={Brain} gradient="from-purple-500 to-indigo-600" />
                <StatCard title="Com Apoio" value={stats.withSupport} icon={HeartPulse} gradient="from-emerald-500 to-teal-600" />
                <StatCard title="Sem Apoio" value={stats.withoutSupport} icon={AlertTriangle} gradient="from-orange-400 to-red-500" />
                <StatCard title="Aguar. Avaliação" value={stats.pendingEval} icon={Clock} gradient="from-slate-600 to-slate-800" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gráfico 1: TEA por Escola */}
                <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200">
                    <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                        <School size={20} className="text-primary-600" /> Distribuição TEA por Escola
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.teaBySchool} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} fontSize={11} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px' }} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfico 2: TEA por Idade */}
                <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200">
                    <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-primary-600" /> Alunos TEA por Idade
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.teaByAge}>
                                <defs>
                                    <linearGradient id="colorTea" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorTea)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 2. SECRETÁRIA DE EDUCAÇÃO ---
export const EducationSecretaryDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {
    const isCocal = currentUser.scope === 'COCAL';

    const stats = useMemo(() => {
        const filteredStudents = isCocal
            ? students.filter(s => {
                const schoolName = (s.school.schoolName || '').toLowerCase();
                const district = (s.school.district || '').toLowerCase();
                return schoolName.includes('cocal') || district.includes('cocal');
            })
            : students;

        const total = filteredStudents.length;
        const teaStudents = filteredStudents.filter(s => {
            const diag = (s.clinical?.diagnosis || '').toUpperCase();
            const needs = (s.clinical?.specialNeeds || []).map(n => n.toUpperCase());
            return diag.includes('TEA') || diag.includes('AUTISMO') || needs.includes('AUTISMO') || needs.includes('TEA');
        });

        const withSupport = filteredStudents.filter(s => s.school?.hasSpecialAide === true).length;
        const pendingEval = filteredStudents.filter(s => s.status === 'Pending').length;

        // Distribuição TEA por Escola
        const teaBySchool = teaStudents.reduce((acc: any[], s) => {
            const school = s.school.schoolName || 'Não Informada';
            const existing = acc.find(i => i.name === school);
            if (existing) existing.value++;
            else acc.push({ name: school, value: 1 });
            return acc;
        }, []).sort((a, b) => b.value - a.value).slice(0, 5);

        // Distribuição TEA por Idade
        const teaByAge = teaStudents.reduce((acc: any[], s) => {
            if (!s.birthDate) return acc;
            const birth = new Date(s.birthDate);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

            const ageGroup = `${age} anos`;
            const existing = acc.find(i => i.name === ageGroup);
            if (existing) existing.value++;
            else acc.push({ name: ageGroup, age, value: 1 });
            return acc;
        }, []).sort((a, b) => a.age - b.age);

        return {
            total,
            teaCount: teaStudents.length,
            withSupport,
            withoutSupport: total - withSupport,
            pendingEval,
            teaBySchool,
            teaByAge
        };
    }, [students, isCocal]);

    return (
        <div className="space-y-8 animate-slideUp">
            <div className="flex justify-between items-start">
                <WelcomeHeader name={currentUser.name.split(' ')[0]} />
                {isCocal && (
                    <div className="hidden md:flex px-4 py-2 bg-orange-100 text-orange-800 rounded-xl text-sm font-bold border border-orange-200 items-center gap-2 shadow-sm">
                        <Globe size={16} /> Distrito Cocal
                    </div>
                )}
            </div>

            {/* Indicadores de Educação Inclusiva */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total Alunos" value={stats.total} icon={Users} gradient="from-blue-500 to-indigo-600" />
                <StatCard title="Alunos TEA" value={stats.teaCount} icon={Brain} gradient="from-purple-500 to-indigo-600" />
                <StatCard title="Com Apoio" value={stats.withSupport} icon={HeartPulse} gradient="from-emerald-500 to-teal-600" />
                <StatCard title="Sem Apoio" value={stats.withoutSupport} icon={AlertTriangle} gradient="from-orange-400 to-red-500" />
                <StatCard title="Aguar. Avaliação" value={stats.pendingEval} icon={Clock} gradient="from-slate-600 to-slate-800" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gráfico 1: TEA por Escola */}
                <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200">
                    <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                        <School size={20} className="text-primary-600" /> Distribuição TEA por Escola
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.teaBySchool} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} fontSize={11} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px' }} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfico 2: TEA por Idade */}
                <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200">
                    <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-primary-600" /> Alunos TEA por Idade
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.teaByAge}>
                                <defs>
                                    <linearGradient id="colorTea" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorTea)" />
                            </AreaChart>
                        </ResponsiveContainer>
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

        const confirmed = appointments.filter(a => a.status === 'CONFIRMADO' || a.status === 'ATENDIDO').length;
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

// --- 3. PSICOLOGIA ---
export const PsychologyDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await SupabaseService.getAppointments({ professionalId: currentUser.id });
                setAppointments(data);
            } catch (error) {
                console.error('Erro ao carregar agenda:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser.id]);

    const stats = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthStr = now.toISOString().slice(0, 7);

        const myStudents = students.filter(s => s.history?.some(h => h.specialty === Specialty.PSYCHOLOGY));

        const todayCount = appointments.filter(a => a.date === todayStr).length;
        const weekCount = appointments.filter(a => {
            const d = new Date(a.date);
            const weekAhead = new Date();
            weekAhead.setDate(now.getDate() + 7);
            return d >= now && d <= weekAhead;
        }).length;
        const monthCount = appointments.filter(a => a.date.startsWith(monthStr)).length;
        const absences = appointments.filter(a => a.status === 'FALTOU').length;

        const diagnosisData = myStudents.reduce((acc: any[], s) => {
            const diag = (s.clinical?.diagnosis || '').split(' ')[0] || 'Outros';
            const existing = acc.find(i => i.name === diag);
            if (existing) existing.value++;
            else acc.push({ name: diag, value: 1 });
            return acc;
        }, []);

        return { activeCount: myStudents.length, diagnosisData, todayCount, weekCount, monthCount, absences };
    }, [students, appointments]);

    return (
        <div className="space-y-8 animate-slideUp">
            <WelcomeHeader name={currentUser.name.split(' ')[0]} />

            {/* Indicadores de Agenda */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Hoje" value={stats.todayCount} icon={Calendar} gradient="from-purple-500 to-indigo-600" />
                <StatCard title="Esta Semana" value={stats.weekCount} icon={Activity} gradient="from-indigo-500 to-blue-600" />
                <StatCard title="Este Mês" value={stats.monthCount} icon={TrendingUp} gradient="from-blue-500 to-cyan-600" />
                <StatCard title="Pacientes Ativos" value={stats.activeCount} icon={Users} gradient="from-emerald-500 to-teal-600" />
                <StatCard title="Faltas" value={stats.absences} icon={AlertTriangle} gradient="from-orange-400 to-red-500" subtext="Faltas recorrentes" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ActionCard
                            title="Nova sessão"
                            description="Inicie o acompanhamento com um paciente"
                            icon={Brain}
                            onClick={() => onNavigate('psychology/new-session')}
                            colorClass="bg-purple-50 text-purple-600"
                        />
                        <ActionCard
                            title="Minha Agenda"
                            description="Visualize seus atendimentos programados"
                            icon={Calendar}
                            onClick={() => onNavigate('agenda')}
                            colorClass="bg-indigo-50 text-indigo-600"
                        />
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200">
                        <h3 className="font-bold text-xl text-slate-800 mb-6">Diagnósticos Recorrentes</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.diagnosisData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {stats.diagnosisData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-card border border-slate-100">
                        <h3 className="font-bold text-lg text-slate-800 mb-4">Acesso Rápido</h3>
                        <div className="space-y-3">
                            <button onClick={() => onNavigate('list')} className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors">
                                <span className="font-semibold flex items-center gap-2"><Activity size={18} /> Prontuários</span>
                                <ArrowRight size={16} />
                            </button>
                            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors">
                                <span className="font-semibold flex items-center gap-2"><FileText size={18} /> Modelos de Laudo</span>
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

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
                    onClick={() => onNavigate('agenda')}
                    colorClass="bg-indigo-50 text-indigo-600"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Atendimentos/Visitas"
                    value={stats.totalSessions}
                    icon={School}
                    gradient="from-cyan-400 to-blue-500"
                    subtext="Total Registrado"
                />
                <StatCard
                    title="Casos Prioritários"
                    value={stats.vulnerableCount}
                    icon={AlertTriangle}
                    gradient="from-red-400 to-rose-500"
                    subtext="Alta Prioridade"
                />
                <StatCard
                    title="Famílias Acomp."
                    value={stats.familiesCount}
                    icon={Users}
                    gradient="from-blue-400 to-indigo-500"
                    subtext="Em Acompanhamento"
                />
                <StatCard
                    title="Encaminhamentos"
                    value={stats.referralsCount}
                    icon={FileText}
                    gradient="from-teal-400 to-emerald-500"
                    subtext="Rede de Proteção"
                />
            </div>
        </div>
    );
};

// --- 5. TERAPIA OCUPACIONAL ---
export const OccupationalTherapyDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await SupabaseService.getAppointments({ professionalId: currentUser.id });
                setAppointments(data);
            } catch (error) {
                console.error('Erro ao carregar agenda:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser.id]);

    const stats = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthStr = now.toISOString().slice(0, 7);

        const myStudents = students.filter(s => s.history?.some(h => h.specialty === Specialty.OCCUPATIONAL_THERAPY));

        const todayCount = appointments.filter(a => a.date === todayStr).length;
        const weekCount = appointments.filter(a => {
            const d = new Date(a.date);
            const weekAhead = new Date();
            weekAhead.setDate(now.getDate() + 7);
            return d >= now && d <= weekAhead;
        }).length;
        const monthCount = appointments.filter(a => a.date.startsWith(monthStr)).length;
        const absences = appointments.filter(a => a.status === 'FALTOU').length;

        return { activeCases: myStudents.length, todayCount, weekCount, monthCount, absences };
    }, [students, appointments]);

    return (
        <div className="space-y-8 animate-slideUp">
            <WelcomeHeader name={currentUser.name.split(' ')[0]} />

            {/* Indicadores de Agenda */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Hoje" value={stats.todayCount} icon={Calendar} gradient="from-indigo-500 to-violet-600" />
                <StatCard title="Esta Semana" value={stats.weekCount} icon={Activity} gradient="from-violet-500 to-purple-600" />
                <StatCard title="Este Mês" value={stats.monthCount} icon={TrendingUp} gradient="from-purple-500 to-fuchsia-600" />
                <StatCard title="Pacientes Ativos" value={stats.activeCases} icon={Users} gradient="from-blue-500 to-indigo-600" />
                <StatCard title="Faltas" value={stats.absences} icon={AlertTriangle} gradient="from-red-400 to-rose-500" subtext="Faltas recorrentes" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ActionCard
                    title="Sessão T.O."
                    description="Registrar evolução de terapia ocupacional"
                    icon={Puzzle}
                    onClick={() => onNavigate('occupational-therapy/new-session')}
                    colorClass="bg-indigo-50 text-indigo-600"
                />
                <ActionCard
                    title="Agenda"
                    description="Verificar pacientes do dia"
                    icon={Calendar}
                    onClick={() => onNavigate('agenda')}
                    colorClass="bg-violet-50 text-violet-600"
                />
            </div>
        </div>
    );
};

// --- 6. PSICOPEDAGOGIA ---
export const PsychopedagogyDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await SupabaseService.getAppointments({ professionalId: currentUser.id });
                setAppointments(data);
            } catch (error) {
                console.error('Erro ao carregar agenda:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser.id]);

    const stats = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthStr = now.toISOString().slice(0, 7);

        const ppStudents = students.filter(s => s.history?.some(h => h.specialty === Specialty.PSYCHOPEDAGOGY) || (s.clinical.pp_data && s.clinical.pp_data.diagnosis));

        const todayCount = appointments.filter(a => a.date === todayStr).length;
        const weekCount = appointments.filter(a => {
            const d = new Date(a.date);
            const weekAhead = new Date();
            weekAhead.setDate(now.getDate() + 7);
            return d >= now && d <= weekAhead;
        }).length;
        const monthCount = appointments.filter(a => a.date.startsWith(monthStr)).length;
        const absences = appointments.filter(a => a.status === 'FALTOU').length;

        // Diagnosis Logic
        const diagnosisMap = new Map<string, number>();
        ppStudents.forEach(student => {
            const rawPP = student.clinical.pp_data || {};
            if (rawPP.diagnosis && rawPP.diagnosis.hipoteseDiagnostica) {
                const diag = rawPP.diagnosis.hipoteseDiagnostica.split(' ')[0] || 'Em Avaliação';
                diagnosisMap.set(diag, (diagnosisMap.get(diag) || 0) + 1);
            } else {
                diagnosisMap.set('Em Avaliação', (diagnosisMap.get('Em Avaliação') || 0) + 1);
            }
        });

        const diagnosisData = Array.from(diagnosisMap.entries()).map(([name, value]) => ({ name, value }));
        const upcoming = appointments.filter(a => a.date === todayStr).map(a => ({ session: a, studentName: a.studentName }));

        return { activeCases: ppStudents.length, diagnosisData, todayCount, weekCount, monthCount, absences, upcoming };
    }, [students, appointments]);

    return (
        <div className="space-y-8 animate-slideUp">
            <WelcomeHeader name={currentUser.name.split(' ')[0]} />

            {/* Indicadores de Agenda */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Hoje" value={stats.todayCount} icon={Calendar} gradient="from-pink-500 to-rose-600" />
                <StatCard title="Esta Semana" value={stats.weekCount} icon={Activity} gradient="from-rose-500 to-orange-600" />
                <StatCard title="Este Mês" value={stats.monthCount} icon={TrendingUp} gradient="from-orange-500 to-amber-600" />
                <StatCard title="Pacientes Ativos" value={stats.activeCases} icon={Users} gradient="from-emerald-500 to-teal-600" />
                <StatCard title="Faltas" value={stats.absences} icon={AlertTriangle} gradient="from-red-400 to-rose-500" subtext="Faltas recorrentes" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ActionCard
                            title="Nova Avaliação"
                            description="Iniciar nova bateria de testes ou sessão"
                            icon={Puzzle}
                            onClick={() => onNavigate('psychopedagogy/new-session')}
                            colorClass="bg-pink-50 text-pink-600"
                        />
                        <ActionCard
                            title="Central de Laudos"
                            description="Acesse modelos e documentos emitidos"
                            icon={Printer}
                            onClick={() => onNavigate('documents')}
                            colorClass="bg-rose-50 text-rose-600"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                <Activity size={18} className="text-pink-500" /> Diagnósticos
                            </h3>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.diagnosisData.length > 0 ? stats.diagnosisData : [{ name: 'Sem dados', value: 1 }]}
                                            cx="50%" cy="50%"
                                            innerRadius={40} outerRadius={60}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.diagnosisData.length > 0 ? stats.diagnosisData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                            )) : <Cell fill="#e2e8f0" />}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                <TrendingUp size={18} className="text-pink-500" /> Evolução (Atendimentos Mês)
                            </h3>
                            <div className="h-48 flex items-center justify-center">
                                <span className="text-4xl font-black text-pink-600">{stats.monthCount}</span>
                                <span className="text-slate-400 ml-2 font-bold uppercase text-xs">Sessões em Março</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                            <span className="flex items-center gap-2"><Calendar size={16} className="text-pink-600" /> Agenda (Hoje)</span>
                        </h4>

                        {stats.upcoming.length > 0 ? (
                            <div className="space-y-3">
                                {stats.upcoming.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl border border-pink-100">
                                        <div className="font-bold text-pink-700 bg-white px-2 py-1 rounded text-xs shadow-sm">
                                            {(item.session.startTime || '00:00').substring(0, 5)}
                                        </div>
                                        <p className="text-sm font-bold text-slate-700 truncate">{item.studentName}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-slate-400 text-sm py-4 italic">Sem agendamentos para hoje.</p>
                        )}

                        <button onClick={() => onNavigate('agenda')} className="w-full mt-4 py-2 text-xs font-bold text-pink-600 uppercase tracking-wider hover:bg-pink-50 rounded-lg transition-colors">
                            Ver Agenda Completa
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 7. FONOAUDIOLOGIA ---
export const SpeechTherapyDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await SupabaseService.getAppointments({ professionalId: currentUser.id });
                setAppointments(data);
            } catch (error) {
                console.error('Erro ao carregar agenda:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser.id]);

    const stats = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthStr = now.toISOString().slice(0, 7);

        const myStudents = students.filter(s => s.history?.some(h => h.specialty === Specialty.SPEECH_THERAPY));

        const todayCount = appointments.filter(a => a.date === todayStr).length;
        const weekCount = appointments.filter(a => {
            const d = new Date(a.date);
            const weekAhead = new Date();
            weekAhead.setDate(now.getDate() + 7);
            return d >= now && d <= weekAhead;
        }).length;
        const monthCount = appointments.filter(a => a.date.startsWith(monthStr)).length;
        const absences = appointments.filter(a => a.status === 'FALTOU').length;

        return { activeCases: myStudents.length, todayCount, weekCount, monthCount, absences };
    }, [students, appointments]);

    return (
        <div className="space-y-8 animate-slideUp">
            <WelcomeHeader name={currentUser.name.split(' ')[0]} />

            {/* Indicadores de Agenda */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Hoje" value={stats.todayCount} icon={Calendar} gradient="from-teal-500 to-emerald-600" />
                <StatCard title="Esta Semana" value={stats.weekCount} icon={Activity} gradient="from-emerald-500 to-green-600" />
                <StatCard title="Este Mês" value={stats.monthCount} icon={TrendingUp} gradient="from-green-500 to-lime-600" />
                <StatCard title="Pacientes Ativos" value={stats.activeCases} icon={Users} gradient="from-cyan-500 to-blue-600" />
                <StatCard title="Faltas" value={stats.absences} icon={AlertTriangle} gradient="from-red-400 to-rose-500" subtext="Faltas recorrentes" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ActionCard
                    title="Sessão Fono"
                    description="Registrar terapia de fala e linguagem"
                    icon={Mic}
                    onClick={() => onNavigate('speech-therapy/new-session')}
                    colorClass="bg-teal-50 text-teal-600"
                />
                <ActionCard
                    title="Agenda"
                    description="Visualizar agendamentos"
                    icon={Calendar}
                    onClick={() => onNavigate('agenda')}
                    colorClass="bg-cyan-50 text-cyan-600"
                />
            </div>
        </div>
    );
};

// --- 8. NUTRIÇÃO ---
export const NutritionDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await SupabaseService.getAppointments({ professionalId: currentUser.id });
                setAppointments(data);
            } catch (error) {
                console.error('Erro ao carregar agenda:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser.id]);

    const stats = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthStr = now.toISOString().slice(0, 7);

        const myStudents = students.filter(s => s.history?.some(h => h.specialty === Specialty.NUTRITION));

        const todayCount = appointments.filter(a => a.date === todayStr).length;
        const weekCount = appointments.filter(a => {
            const d = new Date(a.date);
            const weekAhead = new Date();
            weekAhead.setDate(now.getDate() + 7);
            return d >= now && d <= weekAhead;
        }).length;
        const monthCount = appointments.filter(a => a.date.startsWith(monthStr)).length;
        const absences = appointments.filter(a => a.status === 'FALTOU').length;

        return { activeCases: myStudents.length, todayCount, weekCount, monthCount, absences };
    }, [students, appointments]);

    return (
        <div className="space-y-8 animate-slideUp">
            <WelcomeHeader name={currentUser.name.split(' ')[0]} />

            {/* Indicadores de Agenda */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Hoje" value={stats.todayCount} icon={Calendar} gradient="from-green-500 to-emerald-600" />
                <StatCard title="Esta Semana" value={stats.weekCount} icon={Activity} gradient="from-emerald-500 to-teal-600" />
                <StatCard title="Este Mês" value={stats.monthCount} icon={TrendingUp} gradient="from-teal-500 to-cyan-600" />
                <StatCard title="Pacientes Ativos" value={stats.activeCases} icon={Users} gradient="from-lime-500 to-green-600" />
                <StatCard title="Faltas" value={stats.absences} icon={AlertTriangle} gradient="from-red-400 to-rose-500" subtext="Faltas recorrentes" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ActionCard
                    title="Consulta Nutricional"
                    description="Registrar anamnese e plano alimentar"
                    icon={Activity}
                    onClick={() => onNavigate('nutrition/new-session')}
                    colorClass="bg-green-50 text-green-600"
                />
                <ActionCard
                    title="Meus Pacientes"
                    description="Consultar histórico nutricional"
                    icon={Users}
                    onClick={() => onNavigate('list')}
                    colorClass="bg-emerald-50 text-emerald-600"
                />
            </div>
        </div>
    );
};

// --- 9. ESCOLA ---
export const SchoolDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {
    const stats = useMemo(() => {
        // Filtra alunos da escola do usuário logado baseado no schoolId (UUID)
        const myStudents = students.filter(s =>
            s.school.schoolId === currentUser.schoolId
        );
        const total = myStudents.length;

        const teaStudents = myStudents.filter(s => {
            const diag = (s.clinical?.diagnosis || '').toUpperCase();
            const needs = (s.clinical?.specialNeeds || []).map(n => n.toUpperCase());
            return diag.includes('TEA') || diag.includes('AUTISMO') || needs.includes('AUTISMO') || needs.includes('TEA');
        });

        const withSupport = myStudents.filter(s => s.school?.hasSpecialAide === true).length;
        const pendingEval = myStudents.filter(s => s.status === 'Pending').length;

        // Distribuição TEA por Idade
        const teaByAge = teaStudents.reduce((acc: any[], s) => {
            if (!s.birthDate) return acc;
            const birth = new Date(s.birthDate);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

            const ageGroup = `${age} anos`;
            const existing = acc.find(i => i.name === ageGroup);
            if (existing) existing.value++;
            else acc.push({ name: ageGroup, age, value: 1 });
            return acc;
        }, []).sort((a, b) => a.age - b.age);

        return {
            total,
            teaCount: teaStudents.length,
            withSupport,
            withoutSupport: total - withSupport,
            pendingEval,
            teaByAge
        };
    }, [students, currentUser]);

    return (
        <div className="space-y-8 animate-slideUp">
            {/* Header com mensagem específica solicitada */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white shadow-[0_8px_30px_rgba(16,185,129,0.3)] relative overflow-hidden flex items-center justify-between">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold mb-2 text-white">Painel Escolar</h1>
                    <p className="text-emerald-50 text-xl font-bold mb-2">Unidade: {currentUser.name}</p>
                    <p className="text-emerald-100 font-medium">Acompanhamento de Educação Inclusiva e Gestão de Alunos</p>
                </div>
                <div className="relative z-10 hidden md:block opacity-90">
                    <School size={80} className="text-white" />
                </div>
                <div className="absolute right-0 top-0 h-full w-1/3 bg-white opacity-10 skew-x-12 transform translate-x-10"></div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ActionCard
                    title="Alunos"
                    description="Gerencie os cadastros e acompanhe os alunos da sua escola"
                    icon={Users}
                    onClick={() => onNavigate('list')}
                    colorClass="bg-emerald-50 text-emerald-600"
                />
                <ActionCard
                    title="Profissionais de Apoio"
                    description="Gestão de acompanhantes e monitores escolares"
                    icon={HeartPulse}
                    onClick={() => onNavigate('support-professionals')}
                    colorClass="bg-teal-50 text-teal-600"
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total Alunos" value={stats.total} icon={Users} gradient="from-blue-500 to-indigo-600" />
                <StatCard title="Alunos TEA" value={stats.teaCount} icon={Brain} gradient="from-purple-500 to-indigo-600" />
                <StatCard title="Com Apoio" value={stats.withSupport} icon={HeartPulse} gradient="from-emerald-500 to-teal-600" />
                <StatCard title="Sem Apoio" value={stats.withoutSupport} icon={AlertTriangle} gradient="from-orange-400 to-red-500" />
                <StatCard title="Aguar. Avaliação" value={stats.pendingEval} icon={Clock} gradient="from-slate-600 to-slate-800" />
            </div>

            {/* Gráfico TEA por Idade */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200">
                    <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-primary-600" /> Alunos TEA por Idade na Unidade
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.teaByAge}>
                                <defs>
                                    <linearGradient id="colorTeaSchool" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="value" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorTeaSchool)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Info Section */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-lg">Informações Importantes</h4>
                        <p className="text-slate-600 mt-2 leading-relaxed">
                            Como usuário da escola, você tem permissão para visualizar e editar os dados cadastrais dos alunos e profissionais vinculados à sua instituição.
                            <strong> Dados clínicos e agendas são restritos à equipe técnica da sede.</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
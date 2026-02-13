import React, { useMemo } from 'react';
import { Student, User, Specialty, Session } from '../types';
import { StorageService } from '../services/storageService';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Users, Calendar, Activity, Clock, School, AlertTriangle, FileText, CheckCircle, Brain, HeartPulse, Stethoscope, Baby, Mic, Puzzle, Heart, Search, Settings, Shield, Download, UserPlus, Globe, TrendingUp, ArrowRight, Palette, PlusCircle, Printer } from 'lucide-react';

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

interface DashboardProps {
    students: Student[];
    currentUser: User;
    onNavigate: (page: string) => void;
}

// --- COMPONENTES VISUAIS (ESTILO DA IMAGEM) ---

const WelcomeHeader = ({ name, subtitle, title }: { name: string, subtitle?: string, title?: string }) => (
    <div className="mb-8 animate-fadeIn">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {title ? title : <>Olá, <span className="text-primary-600">{name}</span></>}
        </h1>
        <p className="text-xl text-slate-500 mt-2 font-medium">
            {subtitle || "O que você quer fazer hoje?"}
        </p>
    </div>
);

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
        const active = students.filter(s => s.status === 'Active').length;
        const pending = students.filter(s => s.status === 'Pending').length;
        const professionals = StorageService.getUsers().filter(u => u.isActive && (u.role === 'SPECIALIST' || u.role === 'EDUCATION_SECRETARY')).length;

        const schoolData = students.reduce((acc: any[], s) => {
            const school = s.school.schoolName || 'Não Informada';
            const existing = acc.find(i => i.name === school);
            if (existing) existing.value++;
            else acc.push({ name: school, value: 1 });
            return acc;
        }, []).slice(0, 5);

        return { total, active, pending, professionals, schoolData };
    }, [students]);

    return (
        <div className="space-y-8 animate-slideUp">
            <WelcomeHeader name={currentUser.name.split(' ')[0]} />

            {/* Action Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ActionCard
                    title="Novo Usuário"
                    description="Cadastre profissionais e defina permissões de acesso"
                    icon={UserPlus}
                    onClick={() => onNavigate('admin')}
                    colorClass="bg-blue-50 text-blue-600"
                />
                <ActionCard
                    title="Segurança"
                    description="Gerencie backups e restaure dados do sistema"
                    icon={Shield}
                    onClick={() => onNavigate('backup')}
                    colorClass="bg-emerald-50 text-emerald-600"
                />
                <ActionCard
                    title="Personalização"
                    description="Ajuste a identidade visual e temas do sistema"
                    icon={Palette}
                    onClick={() => onNavigate('settings')}
                    colorClass="bg-purple-50 text-purple-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Stats Column */}
                <div className="lg:col-span-1 space-y-6">
                    <StatCard title="Total Alunos" value={stats.total} icon={Users} gradient="from-blue-500 to-indigo-600" subtext="Na rede" />
                    <StatCard title="Profissionais" value={stats.professionals} icon={Stethoscope} gradient="from-slate-700 to-slate-900" subtext="Ativos" />
                    <StatCard title="Fila de Espera" value={stats.pending} icon={AlertTriangle} gradient="from-amber-400 to-orange-500" subtext="Pendentes" />
                </div>

                {/* Main Chart */}
                <div className="lg:col-span-3 bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-xl text-slate-800">Distribuição por Escola</h3>
                        <button onClick={() => onNavigate('schools')} className="text-sm text-primary-600 font-bold hover:underline">Gerenciar Escolas</button>
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.schoolData} layout="vertical" margin={{ left: 0, right: 30 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} fontSize={11} fontWeight={600} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px' }} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={24} />
                            </BarChart>
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

        const served = filteredStudents.length;
        const waiting = filteredStudents.filter(s => s.status === 'Pending').length;
        const waitingList = [
            { name: 'Psicologia', value: isCocal ? 2 : 45 },
            { name: 'Fono', value: isCocal ? 1 : 32 },
            { name: 'Psicopedagogia', value: isCocal ? 0 : 28 },
            { name: 'T.O.', value: isCocal ? 1 : 15 },
        ];
        return { served, waiting, waitingList };
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

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ActionCard
                    title="Novo Aluno"
                    description="Inicie o processo de matrícula ou cadastro"
                    icon={UserPlus}
                    onClick={() => onNavigate('register')}
                    colorClass="bg-blue-50 text-blue-600"
                />
                <ActionCard
                    title="Lista de Espera"
                    description="Verifique alunos aguardando atendimento"
                    icon={Clock}
                    onClick={() => onNavigate('list')}
                    colorClass="bg-amber-50 text-amber-600"
                />
                <ActionCard
                    title="Unidades Escolares"
                    description={isCocal ? "Gerencie as escolas do distrito" : "Visualize todas as escolas da rede"}
                    icon={School}
                    onClick={() => onNavigate('schools')}
                    colorClass="bg-indigo-50 text-indigo-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6">
                    <StatCard
                        title="Alunos Ativos"
                        value={stats.served}
                        icon={Users}
                        gradient={isCocal ? "from-orange-400 to-red-500" : "from-blue-500 to-indigo-600"}
                    />
                    <StatCard title="Fila de Espera" value={stats.waiting} icon={Clock} gradient="from-amber-400 to-yellow-500" />
                </div>

                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200">
                    <h3 className="font-bold text-xl text-slate-800 mb-6">Demanda por Especialidade</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.waitingList}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px' }} />
                                <Bar dataKey="value" fill={isCocal ? "#f97316" : "#3b82f6"} radius={[6, 6, 0, 0]} barSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 3. PSICOLOGIA ---
export const PsychologyDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {
    const stats = useMemo(() => {
        const myStudents = students.filter(s => s.history?.some(h => h.specialty === Specialty.PSYCHOLOGY));
        const diagnosisData = myStudents.reduce((acc: any[], s) => {
            const diag = s.clinical.diagnosis.split(' ')[0] || 'Outros';
            const existing = acc.find(i => i.name === diag);
            if (existing) existing.value++;
            else acc.push({ name: diag, value: 1 });
            return acc;
        }, []);
        return { activeCount: myStudents.length, diagnosisData };
    }, [students]);

    return (
        <div className="space-y-8 animate-slideUp">
            <WelcomeHeader name={currentUser.name.split(' ')[0]} />

            {/* Main Layout: Actions Left, Stats Right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Actions & Quick Stats */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Action Cards similar to image */}
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

                    {/* Chart Area */}
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

                {/* Right Column: Stats & Secondary Actions */}
                <div className="space-y-6">
                    <StatCard title="Meus Pacientes" value={stats.activeCount} icon={Users} gradient="from-purple-500 to-indigo-600" />
                    <StatCard title="Sessões Hoje" value={4} icon={Calendar} gradient="from-fuchsia-500 to-pink-500" />

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
    return (
        <div className="space-y-8 animate-slideUp">
            <WelcomeHeader name={currentUser.name.split(' ')[0]} />

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Sessões" value={24} icon={CheckCircle} gradient="from-indigo-400 to-violet-600" />
                <StatCard title="Pacientes" value={15} icon={Users} gradient="from-violet-400 to-fuchsia-500" />
                <StatCard title="Avaliações" value={3} icon={Clock} gradient="from-slate-400 to-slate-600" />
            </div>
        </div>
    );
};

// --- 6. PSICOPEDAGOGIA ---
export const PsychopedagogyDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {
    const stats = useMemo(() => {
        const ppStudents = students.filter(s => s.history?.some(h => h.specialty === Specialty.PSYCHOPEDAGOGY) || (s.clinical.pp_data && s.clinical.pp_data.diagnosis));

        // Diagnosis Logic
        const diagnosisMap = new Map<string, number>();
        let activeCases = 0;
        let totalSessions = 0;
        const upcoming: any[] = [];
        const recent: any[] = [];

        // Obtém a data local formatada como YYYY-MM-DD
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        ppStudents.forEach(student => {
            // Extract Diagnosis
            const rawPP = student.clinical.pp_data || {};
            if (rawPP.diagnosis && rawPP.diagnosis.hipoteseDiagnostica) {
                const diag = rawPP.diagnosis.hipoteseDiagnostica.split(' ')[0] || 'Em Avaliação';
                diagnosisMap.set(diag, (diagnosisMap.get(diag) || 0) + 1);
            } else {
                diagnosisMap.set('Em Avaliação', (diagnosisMap.get('Em Avaliação') || 0) + 1);
            }

            // Extract Sessions
            const ppSessions = (student.history || []).filter(h => h.specialty === Specialty.PSYCHOPEDAGOGY);
            if (ppSessions.length > 0) {
                activeCases++;
                totalSessions += ppSessions.length;

                ppSessions.forEach(session => {
                    if ((session as any).content?.status === 'Agendado' && session.date === today) {
                        upcoming.push({ session, studentName: student.fullName, studentId: student.id });
                    } else if ((session as any).content?.status === 'Realizado' || !session.hasOwnProperty('content')) {
                        // Fallback for legacy sessions without content wrapper which are usually realized
                        recent.push({ session, studentName: student.fullName, studentId: student.id });
                    }
                });
            }
        });

        const diagnosisData = Array.from(diagnosisMap.entries()).map(([name, value]) => ({ name, value }));

        return { activeCases, totalSessions, diagnosisData, upcoming, recent };
    }, [students]);

    return (
        <div className="space-y-8 animate-slideUp">
            {/* Header Removed (Replaced by Custom Banner below) */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Actions & Chart */}
                {/* Left Column: Actions & Charts */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Welcome Banner Personalized */}
                    <div className="bg-gradient-to-r from-pink-600 to-rose-600 rounded-3xl p-8 text-white shadow-[0_8px_30px_rgba(236,72,153,0.3)] relative overflow-hidden flex items-center justify-between">
                        <div className="relative z-10">
                            <h1 className="text-3xl font-extrabold mb-2">Olá, {currentUser.name.split(' ')[0]}</h1>
                            <p className="text-pink-100 font-medium text-lg">Bem-vinda de volta ao seu painel de Psicopedagogia.</p>
                        </div>
                        <div className="relative z-10 hidden md:block opacity-90">
                            <Brain size={64} className="text-white" />
                        </div>
                        {/* Decorative Background */}
                        <div className="absolute right-0 top-0 h-full w-1/3 bg-white opacity-10 skew-x-12 transform translate-x-10"></div>
                    </div>

                    {/* Action Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ActionCard
                            title="Nova Avaliação"
                            description="Iniciar nova bateria de testes, anamnese ou sessão"
                            icon={Puzzle}
                            onClick={() => onNavigate('psychopedagogy/new-session')}
                            colorClass="bg-pink-50 text-pink-600"
                        />
                        <ActionCard
                            title="Central de Laudos"
                            description="Acesse modelos e documentos emitidos recentemente"
                            icon={Printer}
                            onClick={() => onNavigate('documents')}
                            colorClass="bg-rose-50 text-rose-600"
                        />
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Chart 1: Diagnosis */}
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
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Chart 2: Evolution (New) */}
                        <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                <TrendingUp size={18} className="text-pink-500" /> Evolução Mensal
                            </h3>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={[
                                        { name: 'Set', valor: 4 },
                                        { name: 'Out', valor: 8 },
                                        { name: 'Nov', valor: 12 },
                                        { name: 'Dez', valor: 10 },
                                        { name: 'Jan', valor: stats.totalSessions } // Current month approx
                                    ]}>
                                        <defs>
                                            <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                        <Area type="monotone" dataKey="valor" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorValor)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Stats & Agenda */}
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                        <StatCard
                            title="Pacientes Ativos"
                            value={stats.activeCases}
                            icon={Users}
                            gradient="from-pink-500 to-rose-600"
                        />
                        <StatCard
                            title="Sessões Realizadas"
                            value={stats.totalSessions}
                            icon={CheckCircle}
                            gradient="from-orange-400 to-pink-500"
                        />
                    </div>

                    {/* Agenda Quick View */}
                    <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                            <span className="flex items-center gap-2"><Calendar size={16} className="text-pink-600" /> Agenda (Hoje)</span>
                        </h4>

                        {stats.upcoming.length > 0 ? (
                            <div className="space-y-3">
                                {stats.upcoming.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl border border-pink-100">
                                        <div className="font-bold text-pink-700 bg-white px-2 py-1 rounded text-xs shadow-sm">
                                            {(item.session.content?.startTime || '00:00').substring(0, 5)}
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
    return (
        <div className="space-y-8 animate-slideUp">
            <WelcomeHeader name={currentUser.name.split(' ')[0]} />

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Sessões" value={18} icon={CheckCircle} gradient="from-cyan-400 to-teal-600" />
                <StatCard title="Pacientes" value={10} icon={Users} gradient="from-teal-400 to-emerald-500" />
                <StatCard title="Triagens" value={50} icon={Stethoscope} gradient="from-emerald-400 to-green-500" />
            </div>
        </div>
    );
};

// --- 8. NUTRIÇÃO ---
export const NutritionDashboard: React.FC<DashboardProps> = ({ students, currentUser, onNavigate }) => {
    return (
        <div className="space-y-8 animate-slideUp">
            <WelcomeHeader name={currentUser.name.split(' ')[0]} />

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Consultas" value={15} icon={CheckCircle} gradient="from-green-400 to-emerald-600" />
                <StatCard title="Avaliações" value={8} icon={Activity} gradient="from-emerald-400 to-teal-500" />
                <StatCard title="Triagens" value={20} icon={Search} gradient="from-lime-400 to-green-500" />
            </div>
        </div>
    );
};
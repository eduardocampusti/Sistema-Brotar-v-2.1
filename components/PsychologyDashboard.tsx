import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Student, Specialty, Session, User, hasPermission } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { SpecialistClinicalHomeDashboard } from './RoleDashboards';
import CadastroRapidoModal from './CadastroRapidoModal';
import {
    Brain, Calendar, Users, FileText, History, TrendingUp,
    Shield, FolderLock, LayoutDashboard, Clock,
    Printer, Search, PlusCircle, ArrowRight,
    Download, Lock, Eye, EyeOff, MessageSquare, BookOpen,
    ClipboardList, PieChart as PieIcon, Activity, UserPlus, Plus
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line,
    CartesianGrid, AreaChart, Area
} from 'recharts';

interface DashboardSession extends Session {
    studentId?: string;
}

const COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

export const PsychologyDashboard: React.FC<{
    currentUser: User,
    onNavigate: (page: string) => void,
    onOpenPatient?: (studentId: string) => void,
}> = ({ currentUser, onNavigate, onOpenPatient }) => {
    type PsychologyTab = 'resumo' | 'evolucoes' | 'documentos' | 'relatorios' | 'agenda' | 'prontuarios' | 'pasta-clinica' | 'cofre' | 'auditoria';

    const [searchParams, setSearchParams] = useSearchParams();

    const [activeTab, setActiveTabState] = useState<PsychologyTab>(() => {
        const tabFromUrl = (searchParams.get('tab') || 'resumo') as PsychologyTab;
        const validTabs: PsychologyTab[] = ['resumo', 'evolucoes', 'documentos', 'relatorios', 'agenda', 'prontuarios', 'pasta-clinica', 'cofre', 'auditoria'];
        return validTabs.includes(tabFromUrl) ? tabFromUrl : 'resumo';
    });
    const [subTab, setSubTab] = useState<'evolucoes' | 'pasta-clinica'>('evolucoes');

    useEffect(() => {
        const tabFromUrl = (searchParams.get('tab') || 'resumo') as PsychologyTab;
        const validTabs: PsychologyTab[] = ['resumo', 'evolucoes', 'documentos', 'relatorios', 'agenda', 'prontuarios', 'pasta-clinica', 'cofre', 'auditoria'];
        const targetTab = validTabs.includes(tabFromUrl) ? tabFromUrl : 'resumo';
        if (targetTab !== activeTab) {
            setActiveTabState(targetTab);
        }
    }, [searchParams, activeTab]);

    const setActiveTab = (newTab: string) => {
        setSearchParams({ tab: newTab });
    };
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCadastroRapido, setShowCadastroRapido] = useState(false);

    // Novos Estados para a aba Prontuários (Alunos)
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [patientTab, setPatientTab] = useState<'resumo' | 'sessoes' | 'anamnese' | 'percepcoes' | 'evolucao' | 'documentos'>('resumo');
    const [sessions, setSessions] = useState<DashboardSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const allStudents = await SupabaseService.getStudentsForUser(currentUser);
                setStudents(allStudents);

                // Inicializa as sessões clínicas a partir do histórico dos estudantes
                const initialSessions: DashboardSession[] = allStudents.flatMap(student => 
                    (student.history || []).map(session => ({
                        ...session,
                        studentId: student.id
                    }))
                );
                setSessions(initialSessions);
            } catch (error) {
                console.error('Erro ao carregar dados do dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [currentUser.id]);

    const menuItems = [
        { id: 'resumo', label: 'Início', icon: LayoutDashboard },
        { id: 'agenda', label: 'Agenda', icon: Calendar },
        { id: 'prontuarios', label: 'Alunos', icon: Users },
        { id: 'evolucoes', label: 'Evoluções', icon: History },
        { id: 'pasta-clinica', label: 'Pasta Clínica', icon: FolderLock },
        { id: 'relatorios', label: 'Analytics', icon: TrendingUp },
        { id: 'documentos', label: 'Documentos IA', icon: FileText },
        { id: 'cofre', label: 'Cofre', icon: Shield },
        { id: 'auditoria', label: 'Acessos', icon: ClipboardList },
    ];

    const goToScheduling = () => onNavigate('scheduling');
    const goToDocuments = () => onNavigate('documents');
    const goToVault = () => onNavigate('vault');

    const renderHeader = () => (
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Painel de Psicologia</h1>
                <p className="text-slate-500 font-medium">Bem-vindo(a), {currentUser.name}</p>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowCadastroRapido(true)}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-purple-100"
                >
                    <UserPlus size={16} /> Cadastro Rápido
                </button>
                <button
                    onClick={() => onNavigate('psychology/new-session')}
                    className="flex items-center gap-2 bg-[#F97316] hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md"
                >
                    <Plus size={16} /> Nova Sessão
                </button>
            </div>
        </div>
    );

    const renderResumo = () => (
        <div className="space-y-6 animate-fadeIn">
            {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-500">
                    Carregando alunos…
                </div>
            ) : (
                <SpecialistClinicalHomeDashboard
                    students={students}
                    currentUser={currentUser}
                    onNavigate={onNavigate}
                    onOpenPatient={onOpenPatient}
                    registerSessionRoute="psychology/new-session"
                    extraAction={{ label: 'Aplicar avaliação psicológica', route: 'psychology' }}
                />
            )}
        </div>
    );

    const renderAgenda = () => (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-800">Agenda & Marcação</h2>
                <div className="flex gap-2">
                    <select className="bg-slate-100 border-none rounded-xl text-sm font-bold px-4 py-2">
                        <option>Sede (Brotas)</option>
                        <option>Distrito (Cocal)</option>
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-4 mb-4">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map(d => (
                    <div key={d} className="text-center text-xs font-bold text-slate-400 uppercase">{d}</div>
                ))}
            </div>
            <div className="h-[400px] border-2 border-dashed border-slate-100 rounded-3xl flex items-center justify-center text-slate-300 flex-col gap-4">
                <Calendar size={48} />
                <p className="font-bold uppercase tracking-widest text-sm">Visualização de Grade Integrada</p>
                <button
                    type="button"
                    onClick={goToScheduling}
                    className="mt-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100"
                >
                    Abrir agenda completa
                </button>
            </div>
        </div>
    );

    const renderProntuarios = () => {
        // Filtragem dos estudantes por fullName (case insensitive)
        const filteredStudents = students.filter(student =>
            student.fullName.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Lógica de classes de cores para avatares
        const avatarBgClasses = [
            'bg-purple-100 text-purple-700',
            'bg-teal-100 text-teal-700',
            'bg-amber-100 text-amber-700',
            'bg-rose-100 text-rose-700'
        ];

        // Lógica para formatar datas (dd/mm/yyyy)
        const formatDate = (dateStr?: string): string => {
            if (!dateStr) return '—';
            try {
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return dateStr;
                return d.toLocaleDateString('pt-BR');
            } catch {
                return dateStr;
            }
        };

        // Lógica para calcular idade
        const calculateAge = (birthDateStr?: string): string => {
            if (!birthDateStr) return '—';
            const birthDate = new Date(birthDateStr);
            if (isNaN(birthDate.getTime())) return '—';
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return `${age} anos`;
        };

        // Lógica para calcular a diferença de tempo desde a última sessão
        const getDaysSinceLastSession = (studentId: string): string => {
            const studentSessions = sessions.filter(s => s.studentId === studentId);
            if (studentSessions.length === 0) return 'Sem sessão';

            const dates = studentSessions
                .map(s => new Date(s.date).getTime())
                .filter(t => !isNaN(t));
            if (dates.length === 0) return 'Sem sessão';

            const lastSessionTime = Math.max(...dates);
            const lastSessionDate = new Date(lastSessionTime);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            lastSessionDate.setHours(0, 0, 0, 0);

            const diffTime = today.getTime() - lastSessionDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) return 'Hoje';
            if (diffDays === 0) return 'Hoje';
            if (diffDays === 1) return 'Ontem';
            return `Há ${diffDays} dias`;
        };

        return (
            <div className="flex h-[600px] border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-sm animate-fadeIn">
                {/* PAINEL ESQUERDO (sidebar de pacientes) */}
                <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 space-y-3 shrink-0 bg-white">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Meus pacientes</h3>
                        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 focus-within:border-purple-300 focus-within:ring-1 focus-within:ring-purple-300 transition-all">
                            <Search className="text-slate-400 mr-2 shrink-0" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none p-0 focus:ring-0 text-sm font-medium w-full outline-none"
                            />
                        </div>
                    </div>
                    {/* Lista de pacientes */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
                        {filteredStudents.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 font-medium">Nenhum paciente encontrado.</div>
                        ) : (
                            filteredStudents.map((student, idx) => {
                                const isActive = student.id === selectedPatientId;
                                const avatarClass = avatarBgClasses[idx % avatarBgClasses.length];
                                const complexity = getComplexity(student);
                                const getBarColor = (barIndex: number) => {
                                    const isFilled = barIndex < complexity.filled;
                                    if (complexity.level === 'baixa') {
                                        return isFilled ? '#1D9E75' : '#9FE1CB';
                                    } else if (complexity.level === 'media') {
                                        return isFilled ? '#EF9F27' : '#FAC775';
                                    } else {
                                        return isFilled ? '#7F77DD' : '#AFA9EC';
                                    }
                                };
                                const studentSessionsCount = sessions.filter(s => s.studentId === student.id).length;

                                return (
                                    <div
                                        key={student.id}
                                        onClick={() => handleSelectPatient(student.id)}
                                        className={`p-3.5 flex items-center justify-between cursor-pointer transition-all border-l-4 ${
                                            isActive
                                                ? 'bg-purple-50/70 border-purple-600'
                                                : 'border-transparent hover:bg-slate-50/80'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className={`w-9 h-9 rounded-full ${avatarClass} flex items-center justify-center font-bold text-sm shrink-0 shadow-sm`}>
                                                {student.fullName.charAt(0)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-sm font-bold text-slate-800 truncate leading-snug">{student.fullName}</h4>
                                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
                                                    Sessão {studentSessionsCount} · {getDaysSinceLastSession(student.id)}
                                                </p>
                                            </div>
                                        </div>
                                        {/* Barrinhas de complexidade */}
                                        <div className="flex gap-0.5 ml-2 shrink-0">
                                            {[0, 1, 2, 3, 4].map(i => (
                                                <div
                                                    key={i}
                                                    className="w-0.5 h-3 rounded-sm"
                                                    style={{ backgroundColor: getBarColor(i) }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* PAINEL DIREITO (perfil do paciente) */}
                <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
                    {selectedPatientId === null ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-300 shadow-sm border border-slate-100">
                                <Users size={32} />
                            </div>
                            <p className="text-sm font-bold uppercase tracking-wider">Selecione um paciente</p>
                        </div>
                    ) : (() => {
                        const patient = students.find(s => s.id === selectedPatientId);
                        if (!patient) {
                            return (
                                <div className="flex-1 flex items-center justify-center text-slate-500 font-medium">
                                    Paciente não encontrado
                                </div>
                            );
                        }

                        const studentSessions = sessions.filter(s => s.studentId === patient.id);
                        const totalSessions = studentSessions.length;
                        const finalizedSessions = studentSessions.filter(s => s.content?.status === 'FINALIZADA' || s.content?.status === 'Finalizado').length;
                        const draftSessions = studentSessions.filter(s => s.content?.status === 'RASCUNHO' || s.content?.status === 'Rascunho').length;
                        const absenceSessions = 0; // default 0 conforme plano

                        const complexity = getComplexity(patient);

                        // Abas do Perfil
                        const tabs = [
                            { id: 'resumo', label: 'Resumo', icon: LayoutDashboard },
                            { id: 'sessoes', label: 'Sessões', icon: Calendar },
                            { id: 'anamnese', label: 'Anamnese', icon: ClipboardList },
                            { id: 'percepcoes', label: 'Percepções', icon: Eye },
                            { id: 'evolucao', label: 'Evolução', icon: TrendingUp },
                            { id: 'documentos', label: 'Documentos', icon: FileText }
                        ];

                        return (
                            <div className="flex flex-col h-full overflow-hidden">
                                {/* Cabeçalho */}
                                <div className="bg-white p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                                            {patient.fullName.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-slate-800 leading-snug">{patient.fullName}</h3>
                                            <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                                {patient.school?.schoolName || 'Sem Escola'} · {patient.school?.grade || 'Sem Série'}
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-200 uppercase tracking-wider">
                                                    Ativo
                                                </span>
                                                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-purple-200 uppercase tracking-wider">
                                                    {totalSessions} sessões
                                                </span>
                                                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 uppercase tracking-wider">
                                                    Complexidade {complexity.level.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        <button
                                            onClick={() => onNavigate('documents')}
                                            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                                        >
                                            <FileText size={14} /> Documento
                                        </button>
                                        <button
                                            onClick={() => onNavigate('psychology/new-session')}
                                            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-100"
                                        >
                                            <Plus size={14} /> Nova sessão
                                        </button>
                                    </div>
                                </div>

                                {/* Abas */}
                                <div className="bg-white px-4 border-b border-slate-200 shrink-0 flex gap-1 overflow-x-auto no-scrollbar shadow-sm">
                                    {tabs.map(tab => {
                                        const isTabActive = patientTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setPatientTab(tab.id as any)}
                                                className={`flex items-center gap-2 px-4 py-3.5 font-bold text-xs whitespace-nowrap transition-all border-b-2 border-transparent ${
                                                    isTabActive
                                                        ? 'text-purple-700 border-purple-600'
                                                        : 'text-slate-500 hover:text-purple-600'
                                                }`}
                                            >
                                                <tab.icon size={14} />
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Corpo da Aba */}
                                <div className="flex-1 p-5 overflow-y-auto">
                                    {loadingSessions ? (
                                        <div className="h-full flex items-center justify-center text-sm text-slate-500 font-medium">
                                            Carregando informações do paciente…
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {patientTab === 'resumo' && (
                                                <>
                                                    {/* Card Informações Pessoais */}
                                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                                        <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                                                            Informações pessoais
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <div>
                                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Nome completo</span>
                                                                <span className="text-xs font-semibold text-slate-700">{patient.fullName}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Data de nascimento</span>
                                                                <span className="text-xs font-semibold text-slate-700">{formatDate(patient.birthDate)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Idade</span>
                                                                <span className="text-xs font-semibold text-slate-700">{calculateAge(patient.birthDate)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Escola</span>
                                                                <span className="text-xs font-semibold text-slate-700">
                                                                    {patient.school?.schoolName || '—'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Série</span>
                                                                <span className="text-xs font-semibold text-slate-700">{patient.school?.grade || '—'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Responsável</span>
                                                                <span className="text-xs font-semibold text-slate-700">{patient.guardians?.[0]?.name || '—'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Início atendimento</span>
                                                                <span className="text-xs font-semibold text-slate-700">{formatDate(patient.createdAt)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Unidade</span>
                                                                <span className="text-xs font-semibold text-slate-700">{patient.unit || 'Sede'}</span>
                                                            </div>
                                                            <div className="md:col-span-3">
                                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Queixa principal</span>
                                                                <span className="text-xs font-semibold text-slate-700 block bg-slate-50 p-3 rounded-xl border border-slate-100 mt-1 leading-relaxed">
                                                                    {(patient as any).notes || '—'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Card Resumo das sessões */}
                                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                                        <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                                                            Resumo das sessões
                                                        </h4>
                                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center shadow-sm">
                                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total realizadas</span>
                                                                <span className="text-xl font-bold text-slate-800 block mt-1">{totalSessions}</span>
                                                            </div>
                                                            <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 text-center shadow-sm">
                                                                <span className="text-[10px] uppercase font-bold text-green-600 block">Finalizadas</span>
                                                                <span className="text-xl font-bold text-green-700 block mt-1">{finalizedSessions}</span>
                                                            </div>
                                                            <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100 text-center shadow-sm">
                                                                <span className="text-[10px] uppercase font-bold text-yellow-600 block">Rascunhos</span>
                                                                <span className="text-xl font-bold text-yellow-700 block mt-1">{draftSessions}</span>
                                                            </div>
                                                            <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 text-center shadow-sm">
                                                                <span className="text-[10px] uppercase font-bold text-red-600 block">Faltas</span>
                                                                <span className="text-xl font-bold text-red-700 block mt-1">{absenceSessions}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Card Últimas sessões */}
                                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                                        <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                                                            Últimas sessões
                                                        </h4>
                                                        {studentSessions.length === 0 ? (
                                                            <p className="text-xs text-slate-400 font-medium py-2">Nenhuma sessão registrada para este aluno.</p>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {studentSessions.slice(0, 3).map((session) => {
                                                                    const isFinalized = session.content?.status === 'FINALIZADA' || session.content?.status === 'Finalizado';
                                                                    return (
                                                                        <div key={session.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                                                            <div>
                                                                                <span className="text-xs font-bold text-slate-700 block">{formatDate(session.date)}</span>
                                                                                <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block truncate max-w-md">
                                                                                    {session.notes}
                                                                                </span>
                                                                            </div>
                                                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                                                                isFinalized
                                                                                    ? 'bg-green-100 text-green-700 border-green-200'
                                                                                    : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                                            }`}>
                                                                                {isFinalized ? 'Finalizada' : 'Rascunho'}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            {patientTab === 'sessoes' && (
                                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                        <h4 className="text-sm font-bold text-slate-800">
                                                            Sessões registradas
                                                        </h4>
                                                        <button
                                                            onClick={() => onNavigate('psychology/new-session')}
                                                            className="bg-purple-50 hover:bg-purple-100 text-purple-600 px-3 py-1.5 border border-purple-100 rounded-xl text-xs font-bold transition-all shadow-sm"
                                                        >
                                                            + Nova sessão
                                                        </button>
                                                    </div>
                                                    {studentSessions.length === 0 ? (
                                                        <p className="text-xs text-slate-400 font-medium py-4 text-center">Nenhuma sessão clínica registrada para este aluno.</p>
                                                    ) : (
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left text-xs font-medium text-slate-600">
                                                                <thead>
                                                                    <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold">
                                                                        <th className="pb-3">Data</th>
                                                                        <th className="pb-3">Tipo de sessão</th>
                                                                        <th className="pb-3">Status</th>
                                                                        <th className="pb-3 text-right">Ações</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50">
                                                                    {studentSessions.map((session) => {
                                                                        const isFinalized = session.content?.status === 'FINALIZADA' || session.content?.status === 'Finalizado';
                                                                        return (
                                                                            <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                                                                                <td className="py-3 font-bold text-slate-700">{formatDate(session.date)}</td>
                                                                                <td className="py-3 text-slate-500 font-semibold">
                                                                                    {(session as any).sessionType || session.specialty || 'Sessão clínica'}
                                                                                </td>
                                                                                <td className="py-3">
                                                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                                                                        isFinalized
                                                                                            ? 'bg-green-100 text-green-700 border-green-200'
                                                                                            : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                                                    }`}>
                                                                                        {isFinalized ? 'Finalizada' : 'Rascunho'}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="py-3 text-right">
                                                                                    <button
                                                                                        onClick={() => onNavigate('psychology')}
                                                                                        className="text-purple-600 hover:text-purple-800 font-bold hover:underline"
                                                                                    >
                                                                                        Ver
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {patientTab === 'anamnese' && (
                                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4 max-w-md mx-auto my-4">
                                                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                                        <ClipboardList size={24} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-800">Ficha de Anamnese</h4>
                                                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                            A anamnese completa está disponível na ficha clínica do aluno.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => onNavigate('psychology')}
                                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-100"
                                                    >
                                                        Abrir ficha de anamnese
                                                    </button>
                                                </div>
                                            )}

                                            {patientTab === 'percepcoes' && (
                                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                                                        Percepções Clínicas
                                                    </h4>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Notas privadas e percepções</span>
                                                        <textarea
                                                            readOnly
                                                            placeholder="Percepções clínicas registradas nas sessões aparecerão aqui."
                                                            value={studentSessions[0]?.privateNotes || ''}
                                                            className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-600 focus:ring-0 focus:border-slate-200 cursor-not-allowed leading-relaxed mt-1"
                                                        />
                                                        {(!studentSessions[0]?.privateNotes) && (
                                                            <p className="text-[10px] text-slate-400 font-medium italic mt-1.5">
                                                                Nenhuma percepção registrada. As notas privadas da sessão mais recente aparecerão nesta área.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {patientTab === 'evolucao' && (
                                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                        <h4 className="text-sm font-bold text-slate-800">
                                                            Linha do Tempo de Evolução
                                                        </h4>
                                                        <button
                                                            onClick={() => onNavigate('psychology')}
                                                            className="text-purple-600 hover:text-purple-800 text-xs font-bold hover:underline"
                                                        >
                                                            Ver histórico completo
                                                        </button>
                                                    </div>

                                                    {studentSessions.length === 0 ? (
                                                        <p className="text-xs text-slate-400 font-medium py-4 text-center">Nenhum registro de evolução encontrado para este aluno.</p>
                                                    ) : (
                                                        <div className="relative border-l border-purple-100 ml-3 space-y-6 py-2">
                                                            {studentSessions.slice(0, 5).map((session) => {
                                                                const isFinalized = session.content?.status === 'FINALIZADA' || session.content?.status === 'Finalizado';
                                                                const dotColor = isFinalized ? 'bg-purple-500' : 'bg-amber-400';
                                                                return (
                                                                    <div key={session.id} className="relative pl-6">
                                                                        <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full ${dotColor} border border-white ring-4 ring-white shadow-sm`} />
                                                                        <div>
                                                                            <span className="text-[10px] font-bold text-slate-400 block">{formatDate(session.date)}</span>
                                                                            <h5 className="text-xs font-bold text-slate-700 leading-snug mt-0.5">
                                                                                {(session as any).sessionType || session.specialty || 'Sessão clínica'}
                                                                            </h5>
                                                                            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                                                                                {session.notes}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {patientTab === 'documentos' && (
                                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4 max-w-md mx-auto my-4">
                                                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                                        <FileText size={24} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-800">Documentos do Aluno</h4>
                                                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                            Documentos gerados para este paciente aparecerão aqui.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => onNavigate('documents')}
                                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-100"
                                                    >
                                                        Gerar documento
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        );
    };

    const renderEvolucoes = () => (
        <div className="space-y-6 animate-fadeIn">
            {/* Alternador de Sub-abas */}
            <div className="flex gap-2 border-b border-slate-100 pb-4">
                <button
                    type="button"
                    onClick={() => setSubTab('evolucoes')}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                        subTab === 'evolucoes'
                            ? 'bg-[#8b5cf6] text-white border-[#8b5cf6] shadow-md shadow-purple-100'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-purple-200'
                    }`}
                >
                    Minhas Evoluções
                </button>
                <button
                    type="button"
                    onClick={() => setSubTab('pasta-clinica')}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                        subTab === 'pasta-clinica'
                            ? 'bg-[#8b5cf6] text-white border-[#8b5cf6] shadow-md shadow-purple-100'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-purple-200'
                    }`}
                >
                    Pasta Clínica Digital
                </button>
            </div>

            {subTab === 'evolucoes' ? (
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">Minhas Evoluções</h2>
                            <p className="text-slate-500 text-sm font-medium mt-1">Repositório histórico de atuação profissional</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => onNavigate('retroativo')}
                                className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold border border-orange-100 flex items-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                            >
                                <Clock size={14} /> Lançamentos Históricos
                            </button>
                            <button
                                type="button"
                                onClick={goToDocuments}
                                className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold border border-purple-100"
                            >
                                Rascunhos
                            </button>
                            <button
                                type="button"
                                onClick={goToDocuments}
                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200"
                            >
                                Finalizados
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="pb-4 px-2">Data</th>
                                    <th className="pb-4">Aluno</th>
                                    <th className="pb-4">Sessão</th>
                                    <th className="pb-4">Status</th>
                                    <th className="pb-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                        <td className="py-4 px-2 text-sm font-bold text-slate-600">12/02/2026</td>
                                        <td className="py-4 font-bold text-slate-800 text-sm">Miguel Oliveira Santos</td>
                                        <td className="py-4 text-xs font-medium text-slate-500">Sessão Individual #5</td>
                                        <td className="py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${i % 2 === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {i % 2 === 0 ? 'Finalizado' : 'Rascunho'}
                                            </span>
                                        </td>
                                        <td className="py-4 text-center">
                                            <button
                                                type="button"
                                                onClick={goToDocuments}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-purple-600 hover:text-white text-slate-600 rounded-lg text-[10px] font-black transition-all"
                                            >
                                                <Printer size={14} /> PDF AUDITADO
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-8 p-4 bg-slate-900 rounded-2xl flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                            <Shield size={20} className="text-purple-400" />
                            <div>
                                <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Segurança de Dados H.23</p>
                                <p className="text-xs opacity-60">Todos os PDFs gerados contêm carimbo de auditoria e hash criptográfico.</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                renderPastaClinica()
            )}
        </div>
    );

    const renderPastaClinica = () => (
        <div className="bg-white p-6 md:p-10 rounded-3xl border border-slate-100 shadow-sm animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pasta Clínica Digital</h2>
                    <p className="text-slate-500 font-medium">Visão 360º do Paciente (Eixo Clínico)</p>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={goToScheduling}
                        className="bg-red-50 text-red-600 px-5 py-2.5 rounded-xl font-bold text-sm border border-red-100 hover:bg-red-100 transition-colors"
                    >
                        Alta Técnica / Pausa
                    </button>
                    <button
                        type="button"
                        onClick={goToDocuments}
                        className="bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-slate-200"
                    >
                        Exportar Prontuário Completo
                    </button>
                </div>
            </div>

            <div className="relative border-l-2 border-slate-100 ml-4 md:ml-6 pl-8 space-y-12">
                {[
                    { tipo: 'Sessão', data: '12/02/2026', desc: 'Sessão individual realizada com foco em regulação emocional.', icon: Brain, color: 'bg-purple-600' },
                    { tipo: 'Avaliação', data: '01/02/2026', desc: 'Avaliação inicial concluída. Hipótese diagnóstica: TDAH.', icon: ClipboardList, color: 'bg-blue-600' },
                    { tipo: 'Relatório', data: '15/01/2026', desc: 'Encaminhamento para neuropediatra emitido.', icon: FileText, color: 'bg-emerald-600' }
                ].map((item, idx) => (
                    <div key={idx} className="relative">
                        <div className={`absolute -left-[41px] top-0 w-8 h-8 rounded-full ${item.color} text-white flex items-center justify-center shadow-lg border-4 border-white`}>
                            <item.icon size={14} />
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-purple-200 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.tipo}</span>
                                <span className="text-xs font-bold text-slate-400">{item.data}</span>
                            </div>
                            <p className="text-slate-700 text-sm leading-relaxed">{item.desc}</p>
                            <button
                                type="button"
                                onClick={goToDocuments}
                                className="mt-4 text-xs font-bold text-purple-600 hover:underline"
                            >
                                Ver Detalhes
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderRelatorios = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-8">Inteligência de Dados e Produtividade</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Volume de Atendimentos</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Set', value: 34 },
                                    { name: 'Out', value: 45 },
                                    { name: 'Nov', value: 38 },
                                    { name: 'Dez', value: 28 },
                                    { name: 'Jan', value: 52 }
                                ]}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Taxa de Absenteísmo (Faltas)</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Presente', value: 85 },
                                            { name: 'Falha/Ausente', value: 15 }
                                        ]}
                                        cx="50%" cy="50%"
                                        innerRadius={60} outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        <Cell fill="#8b5cf6" />
                                        <Cell fill="#cbd5e1" />
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '16px' }} />
                                    <Legend align="center" verticalAlign="bottom" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Users size={20} className="text-purple-600" /> Sumário Nominal de Produtividade
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="pb-4">Paciente</th>
                                <th className="pb-4 text-center">Sessões Realizadas</th>
                                <th className="pb-4 text-center">Status Clinico</th>
                                <th className="pb-4 text-end">Última Atividade</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {students.slice(0, 5).map((s, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-4 font-bold text-slate-800">{s.fullName}</td>
                                    <td className="py-4 text-center font-black text-purple-600">{10 + i}</td>
                                    <td className="py-4 text-center">
                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase">Estável</span>
                                    </td>
                                    <td className="py-4 text-end text-xs font-medium text-slate-500">Há {i + 1} dias</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderDocumentos = () => (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Documentos Oficiais</h2>
                    <p className="text-slate-500 font-medium">Emissão de documentação externa com IA</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-3">
                    {['Declaração de Comparecimento', 'Parecer Psicológico', 'Encaminhamento Rede', 'Relatório de Progresso'].map(doc => (
                        <button
                            key={doc}
                            type="button"
                            onClick={goToDocuments}
                            className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-purple-50 hover:text-purple-700 font-bold text-sm transition-all border border-transparent hover:border-purple-100"
                        >
                            {doc}
                        </button>
                    ))}
                </div>
                <div className="md:col-span-2 bg-slate-50 rounded-3xl p-6 border border-slate-100 relative min-h-[400px]">
                    <div className="absolute top-4 right-4 bg-white px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm border border-slate-100">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase text-slate-600">Assistente IA Gemini Ativo</span>
                    </div>

                    <div className="mt-10 space-y-4">
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm max-w-[80%]">
                            <p className="text-sm text-slate-700">Olá! Selecione um modelo e o histórico que deseja processar para eu ajudar na redação técnica (H.24).</p>
                        </div>
                    </div>

                    <div className="absolute bottom-6 left-6 right-6 flex gap-2">
                        <input type="text" placeholder="Dê comandos para a IA (ex: 'Resuma os ganhos da última sessão')" className="flex-1 bg-white border border-slate-200 rounded-2xl text-sm px-4 py-3 shadow-inner" />
                        <button
                            type="button"
                            onClick={goToDocuments}
                            className="bg-purple-600 text-white p-3 rounded-2xl shadow-lg shadow-purple-200"
                        >
                            <MessageSquare size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderCofre = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <BookOpen size={18} className="text-blue-500" /> Biblioteca de Apoio
                        </h3>
                        <div className="space-y-2">
                            {['Normativas Secretaria', 'Manual do Sistema', 'Ética Profissional'].map(m => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={goToVault}
                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 text-sm font-medium text-slate-600"
                                >
                                    {m} <Download size={14} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <FolderLock size={18} className="text-indigo-600" /> Arquivos do Aluno
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <button
                                key={i}
                                type="button"
                                onClick={goToVault}
                                className="aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-4 text-center group cursor-pointer hover:border-indigo-300 transition-all"
                            >
                                <FileText size={24} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Laudo Externo {i}.pdf</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderAuditoria = () => (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm animate-fadeIn">
            <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Meus Acessos</h2>
                <p className="text-slate-500 font-medium">Transparência e segurança (Auditoria LGPD)</p>
            </div>

            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                            <span className="font-bold text-slate-700">Acesso a Prontuário</span>
                            <span className="text-slate-400 font-medium">Aluno ID: {students[0]?.id.substring(0, 8) || '---'}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-400">12/02/2026 09:4{i}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    const getComplexity = (student: Student): { level: 'baixa' | 'media' | 'alta', filled: number } => {
        const studentSessions = sessions.filter(s => s.studentId === student.id);
        const count = studentSessions.length;
        if (count >= 10) return { level: 'alta', filled: 5 };
        if (count >= 5) return { level: 'alta', filled: 4 };
        if (count >= 3) return { level: 'media', filled: 3 };
        if (count >= 1) return { level: 'media', filled: 2 };
        return { level: 'baixa', filled: 1 };
    };

    const handleSelectPatient = async (studentId: string) => {
        setSelectedPatientId(studentId);
        setPatientTab('resumo');
        setLoadingSessions(true);
        try {
            const data = await SupabaseService.getStudentSessions(studentId);
            const studentSessions = data.map(s => ({ ...s, studentId }));
            setSessions(prev => [
                ...prev.filter(s => s.studentId !== studentId),
                ...studentSessions
            ]);
        } catch (err) {
            console.error('Erro ao carregar sessões:', err);
        } finally {
            setLoadingSessions(false);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'resumo': return renderResumo();
            case 'agenda': return renderAgenda();
            case 'prontuarios': return renderProntuarios();
            case 'evolucoes': return renderEvolucoes();
            case 'pasta-clinica': return renderPastaClinica();
            case 'relatorios': return renderRelatorios();
            case 'documentos': return renderDocumentos();
            case 'cofre': return renderCofre();
            case 'auditoria': return renderAuditoria();
            default: return (
                <div className="h-[400px] bg-white rounded-3xl border border-slate-100 flex items-center justify-center flex-col gap-4 text-slate-400">
                    <History size={48} />
                    <p className="font-bold uppercase tracking-widest text-sm">Módulo em Desenvolvimento</p>
                    <p className="text-xs">A aba "{activeTab}" será preenchida nas próximas etapas.</p>
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
            {renderHeader()}

            <div className="max-w-7xl mx-auto">
                {renderContent()}
            </div>

            {/* ── Cadastro Rápido Modal ── */}
            <CadastroRapidoModal
                isOpen={showCadastroRapido}
                onClose={() => setShowCadastroRapido(false)}
                currentUserId={currentUser.id}
                currentUserName={currentUser.name}
                currentUserRole={'SPECIALIST'}
                currentUserSpecialty={'Psicologia'}
            />
        </div>
    );
};

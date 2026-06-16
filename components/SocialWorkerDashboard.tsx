
import React, { useState, useEffect, useMemo } from 'react';
import { SupabaseService } from '../services/SupabaseService';
import {
    Users,
    Activity,
    Calendar,
    AlertCircle,
    Search,
    FileText,
    Clock,
    CheckCircle2,
    MapPin,
    ArrowRight,
    Plus,
    FileEdit,
    ClipboardList,
    AlertTriangle,
    Flag,
    Puzzle,
    UserPlus,
} from 'lucide-react';
import { Student, User, Specialty, Appointment } from '../types';
import { countTeaAutismStudents } from '../utils/teaAutismCount';
import CadastroRapidoModal from './CadastroRapidoModal';

// Helper simples para idade se não conseguir importar
const getAge = (birthDate?: string) => {
    if (!birthDate) return '-';
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
};

interface SocialWorkerDashboardProps {
    students: Student[];
    currentUser: User;
    onNavigate: (page: string) => void;
    onNavigateToCase?: (id: string) => void;
    onNavigateNew?: () => void;
}

export const SocialWorkerDashboard: React.FC<SocialWorkerDashboardProps> = ({
    students,
    currentUser,
    onNavigate,
    onNavigateToCase,
    onNavigateNew
}) => {

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCadastroRapido, setShowCadastroRapido] = useState(false);

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

    // --- CÁLCULO DE ESTATÍSTICAS ---
    const stats = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthStr = now.toISOString().slice(0, 7);

        let activeCases = 0;
        let pendingSearch = 0;
        let pendingInterview = 0;
        let institutionalReferrals = 0;

        const myCases: Student[] = [];
        const pendingList: Student[] = [];

        // Agenda Stats
        const todayCount = appointments.filter(a => a.date === todayStr).length;
        const monthCount = appointments.filter(a => a.date.startsWith(monthStr)).length;
        const absences = appointments.filter(a => a.status === 'FALTOU').length;

        students.forEach(s => {
            const social = s.clinical?.social_data?.formData;
            const interview = s.clinical?.social_interview;

            // Lógica de "Meus Casos" ou "Casos Ativos da Unidade"
            // Como é assistente social, geralmente vê tudo da sua unidade ou atribuídos.
            // Para simplificar, consideramos "Casos com dados sociais" como relevantes.

            const hasSocialData = social || interview;

            if (hasSocialData) {
                // Casos Ativos (Em Acompanhamento)
                if (social?.statusCaso === 'Em Acompanhamento' || interview?.status === 'Em Análise') {
                    activeCases++;
                    myCases.push(s);
                }

                // Pendências de Busca Ativa
                if (social?.observacoesEncaminhamentos?.statusRegistro === 'PENDENTE') {
                    pendingSearch++;
                    pendingList.push(s);
                }

                // Pendências de Entrevista
                if (interview?.status === 'Pendente') {
                    pendingInterview++;
                    // Evitar duplicar se já estiver na lista pelo outro motivo
                    if (!pendingList.includes(s)) pendingList.push(s);
                }

                // Encaminhamentos
                if (social?.encaminhamentoInstitucional?.prioridade === 'Alta') {
                    institutionalReferrals++;
                }
            }
        });

        // Ordenar casos recentes
        myCases.sort((a, b) => {
            const dateA = new Date(a.clinical?.social_data?.lastUpdate || 0).getTime();
            const dateB = new Date(b.clinical?.social_data?.lastUpdate || 0).getTime();
            return dateB - dateA;
        });

        return {
            activeCases,
            pendingSearch,
            pendingInterview,
            institutionalReferrals,
            myCases: myCases.slice(0, 5), // Top 5 recentes
            pendingList: pendingList.slice(0, 5), // Top 5 pendentes
            todayCount,
            monthCount,
            absences
        };
    }, [students, appointments]);

    const teaAutismCount = useMemo(() => countTeaAutismStudents(students), [students]);

    // Simulação de Atendimentos de Hoje (Já que não temos a prop de appointments aqui, 
    // idealmente viria de uma prop ou fetch, mas vamos simular um estado vazio visualmente 
    // ou instruir o uso da Agenda para ver detalhes)
    // Para a dashboard, vamos focar nos Atalhos e Visão Geral de CASOS.

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-fadeIn pb-20">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-[#1E7F85]/10 rounded-2xl text-[#1E7F85]">
                            <Activity size={32} />
                        </div>
                        Painel Operacional
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 pl-1">
                        Bem-vindo(a), <span className="text-[#1E7F85] font-bold">{currentUser.name}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowCadastroRapido(true)}
                        className="flex items-center gap-2 bg-[#1E7F85] hover:bg-[#145f63] text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md"
                    >
                        <UserPlus size={16} /> Cadastro Rápido
                    </button>
                    <button
                        onClick={() => onNavigate('social-interview')}
                        className="flex items-center gap-2 bg-[#F97316] hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md"
                    >
                        <Plus size={16} /> Nova Entrevista
                    </button>
                </div>
            </div>

            {/* 1. CARDS INFORMATIVOS (TOPO) */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <button
                    type="button"
                    onClick={() => onNavigate('scheduling')}
                    className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-[#1E7F85] transition-all text-left"
                >
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Hoje</p>
                    <h3 className="text-4xl font-black text-slate-800">{stats.todayCount}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Atendimentos</p>
                </button>

                <button
                    type="button"
                    onClick={() => onNavigate('scheduling')}
                    className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all text-left"
                >
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mensal</p>
                    <h3 className="text-4xl font-black text-slate-800">{stats.monthCount}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Produtividade</p>
                </button>

                <button
                    type="button"
                    onClick={() => onNavigate('scheduling')}
                    className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-all text-left"
                >
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Faltas</p>
                    <h3 className="text-4xl font-black text-rose-600">{stats.absences}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Absenteísmo</p>
                </button>

                <button
                    type="button"
                    onClick={() => onNavigate('list')}
                    className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all text-left"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Alunos com TEA/Autismo</p>
                            <h3 className="text-4xl font-black text-slate-800">{teaAutismCount}</h3>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Diagnóstico registrado</p>
                        </div>
                        <div className="rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 p-3 text-white shadow-lg shrink-0">
                            <Puzzle size={22} />
                        </div>
                    </div>
                </button>

                <div className="bg-gradient-to-br from-[#1E7F85] to-[#145f63] p-6 rounded-[2rem] border border-[#1E7F85] shadow-lg text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar size={80} />
                    </div>
                    <p className="text-xs font-black text-white/60 uppercase tracking-widest mb-2">Acesso Rápido</p>
                    <h3 className="text-2xl font-black text-white mb-4">Minha Agenda</h3>
                    <button
                        onClick={() => onNavigate('scheduling')}
                        className="w-full py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-white hover:text-[#1E7F85] transition-all flex items-center justify-center gap-2"
                    >
                        Ver Atendimentos <ArrowRight size={14} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                    type="button"
                    onClick={() => onNavigate('social-service-list')}
                    className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 text-left transition-all hover:border-[#1E7F85] hover:shadow-md"
                >
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Casos Ativos</p>
                        <p className="text-xl font-black text-slate-800">{stats.activeCases}</p>
                    </div>
                </button>
                <button
                    type="button"
                    onClick={() => onNavigate('social-service-hub')}
                    className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 text-left transition-all hover:border-[#1E7F85] hover:shadow-md"
                >
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Busca Ativa</p>
                        <p className="text-xl font-black text-slate-800">{stats.pendingSearch}</p>
                    </div>
                </button>
                <button
                    type="button"
                    onClick={() => onNavigate('social-interview')}
                    className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 text-left transition-all hover:border-[#1E7F85] hover:shadow-md"
                >
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Entrevistas</p>
                        <p className="text-xl font-black text-slate-800">{stats.pendingInterview}</p>
                    </div>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* 2. BLOCO PRINCIPAL - ATALHOS E AÇÕES */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Atalhos */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-700 uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                            <Plus size={18} className="text-[#1E7F85]" /> Novo Atendimento
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={() => onNavigateNew && onNavigateNew()}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#1E7F85] hover:bg-[#1E7F85]/5 hover:shadow-md transition-all group text-left"
                            >
                                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:text-[#1E7F85] transition-colors">
                                    <Search size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">Nova Busca Ativa</h4>
                                    <p className="text-xs text-slate-500 mt-1">Instrumento RPA</p>
                                </div>
                            </button>

                            <button
                                onClick={() => onNavigate('social-interview')}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#1E7F85] hover:bg-[#1E7F85]/5 hover:shadow-md transition-all group text-left"
                            >
                                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:text-[#1E7F85] transition-colors">
                                    <FileEdit size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">Entrevista Social</h4>
                                    <p className="text-xs text-slate-500 mt-1">Contexto Escolar</p>
                                </div>
                            </button>

                            <button
                                onClick={() => onNavigate('list')}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#1E7F85] hover:bg-[#1E7F85]/5 hover:shadow-md transition-all group text-left"
                            >
                                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:text-[#1E7F85] transition-colors">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">Prontuário Digital</h4>
                                    <p className="text-xs text-slate-500 mt-1">Localizar Aluno</p>
                                </div>
                            </button>

                            <button
                                onClick={() => onNavigate('reports')}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#1E7F85] hover:bg-[#1E7F85]/5 hover:shadow-md transition-all group text-left"
                            >
                                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:text-[#1E7F85] transition-colors">
                                    <ClipboardList size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">Meus Relatórios</h4>
                                    <p className="text-xs text-slate-500 mt-1">Acessar relatórios</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Casos Recentes */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-700 uppercase tracking-widest text-sm flex items-center gap-2">
                                <Clock size={18} className="text-amber-500" /> Casos em Acompanhamento Recentes
                            </h3>
                            <button
                                onClick={() => onNavigate('social-service-list')}
                                className="text-[10px] font-bold uppercase tracking-widest text-[#1E7F85] hover:underline"
                            >
                                Ver Todos
                            </button>
                        </div>

                        <div className="space-y-4">
                            {stats.myCases.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">Nenhum caso ativo recente.</p>
                            ) : (
                                stats.myCases.map(student => (
                                    <div key={student.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 font-bold border border-slate-200">
                                                {student.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800">{student.fullName}</h4>
                                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                                                    {getAge(student.birthDate)} anos • {student.school?.schoolName || 'Sem Escola'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onNavigateToCase && onNavigateToCase(student.id)}
                                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:border-[#1E7F85] hover:text-[#1E7F85] transition-all"
                                        >
                                            Ver Caso
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>

                {/* 3. ALERTA E PENDÊNCIAS (LATERAL) */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] h-fit">
                    <h3 className="font-bold text-slate-700 uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                        <Flag size={18} className="text-rose-500" /> Alertas de Pendências
                    </h3>

                    <div className="space-y-4">
                        {stats.pendingList.length === 0 ? (
                            <div className="text-center py-8">
                                <CheckCircle2 size={40} className="mx-auto text-emerald-200 mb-2" />
                                <p className="text-sm text-slate-400 font-medium">Tudo em dia!</p>
                            </div>
                        ) : (
                            stats.pendingList.map(student => (
                                <div key={student.id} className="p-4 bg-rose-50 rounded-2xl border border-rose-100/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="px-2 py-0.5 bg-white text-rose-600 rounded text-[9px] font-black uppercase tracking-widest border border-rose-100">
                                            Ação Necessária
                                        </span>
                                        <span className="text-[10px] text-rose-400 font-bold">
                                            {student.clinical?.social_data?.formData?.observacoesEncaminhamentos?.statusRegistro === 'PENDENTE' ? 'Busca Ativa' : 'Entrevista'}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-800 mb-1">{student.fullName}</h4>
                                    <p className="text-[10px] text-slate-500 mb-3">
                                        {student.school?.schoolName}
                                    </p>
                                    <button
                                        onClick={() => onNavigateToCase && onNavigateToCase(student.id)}
                                        className="w-full py-2 bg-white text-rose-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                    >
                                        Resolver Pendência
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

            {/* ── Cadastro Rápido Modal ── */}
            <CadastroRapidoModal
                isOpen={showCadastroRapido}
                onClose={() => setShowCadastroRapido(false)}
                currentUserId={currentUser.id}
                currentUserName={currentUser.name}
                currentUserRole={'SPECIALIST'}
                currentUserSpecialty={'Serviço Social'}
            />
        </div>
    );
};

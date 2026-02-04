
import React, { useState, useMemo } from 'react';
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
    Flag
} from 'lucide-react';
import { Student, User, Specialty } from '../types';

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

    // --- CÁLCULO DE ESTATÍSTICAS ---
    const stats = useMemo(() => {
        let activeCases = 0;
        let pendingSearch = 0;
        let pendingInterview = 0;
        let institutionalReferrals = 0;

        const myCases: Student[] = [];
        const pendingList: Student[] = [];

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
            pendingList: pendingList.slice(0, 5) // Top 5 pendentes
        };
    }, [students]);

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
                <div className="bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                    <MapPin size={14} className="text-[#1E7F85]" />
                    {currentUser.scope || 'Sede Administrativa'}
                </div>
            </div>

            {/* 1. CARDS INFORMATIVOS (TOPO) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-[#1E7F85]/30 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Users size={80} />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Total Acompanhados</p>
                    <h3 className="text-4xl font-black text-slate-800">{stats.activeCases}</h3>
                    <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-md uppercase">
                        <Activity size={10} /> Em andamento
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <AlertCircle size={80} />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Busca Ativa Pendente</p>
                    <h3 className="text-4xl font-black text-slate-800">{stats.pendingSearch}</h3>
                    <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 w-fit px-2 py-1 rounded-md uppercase">
                        <AlertTriangle size={10} /> Requer Atenção
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <FileText size={80} />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Entrevistas Pendentes</p>
                    <h3 className="text-4xl font-black text-slate-800">{stats.pendingInterview}</h3>
                    <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded-md uppercase">
                        <Clock size={10} /> Aguardando
                    </div>
                </div>

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
                                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#1E7F85] hover:bg-[#1E7F85]/5 hover:shadow-md transition-all group text-left cursor-not-allowed opacity-60"
                            >
                                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:text-[#1E7F85] transition-colors">
                                    <ClipboardList size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">Meus Relatórios</h4>
                                    <p className="text-xs text-slate-500 mt-1">Em breve</p>
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
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm h-fit">
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
        </div>
    );
};

import React from 'react';
import { Search, Heart, ChevronRight, Users, ClipboardList } from 'lucide-react';
import { User, Student } from '../types';

interface SocialServiceHubProps {
    currentUser: User;
    onNavigate: (page: string, keepSelection?: boolean) => void;
    onNavigateToCase?: (id: string) => void;
}

export const SocialServiceHub: React.FC<SocialServiceHubProps> = ({ currentUser, onNavigate }) => {

    // Função auxiliar para navegar para os módulos específicos
    const handleNavigateToBuscaAtiva = () => {
        // Redireciona para a lista de Busca Ativa / Operacional
        onNavigate('social-service-list');
    };

    const handleNavigateToEntrevista = () => {
        // Redireciona para o Hub de Entrevista
        onNavigate('social-interview');
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 animate-fadeIn">
            <div className="max-w-5xl mx-auto space-y-12">

                {/* Header Simples e Elegante */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Serviço Social</h1>
                        <p className="text-slate-500 font-medium mt-1">Selecione o instrumento técnico para prosseguir.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                            {currentUser.name.charAt(0)}
                        </div>
                        <div className="text-xs">
                            <p className="font-bold text-slate-700">{currentUser.name}</p>
                            <p className="text-slate-400 font-medium uppercaser">Assistente Social</p>
                        </div>
                    </div>
                </div>

                {/* Cards de Navegação Principal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* CARD 1: BUSCA ATIVA ESCOLAR */}
                    <div className="group relative bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 hover:border-cyan-200 hover:shadow-2xl hover:shadow-cyan-100/50 transition-all duration-300 flex flex-col items-start overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none transform group-hover:scale-110 duration-500">
                            <Search size={200} />
                        </div>

                        <div className="w-16 h-16 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-6 shadow-sm border border-cyan-100 group-hover:scale-110 transition-transform duration-300">
                            <Search size={32} strokeWidth={2.5} />
                        </div>

                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-3 relative z-10 group-hover:text-cyan-700 transition-colors">
                            Busca Ativa Escolar
                        </h2>

                        <p className="text-slate-500 font-medium leading-relaxed mb-10 relative z-10">
                            Identificação de evasão, visitas domiciliares operacionais e estratégias de retorno ao ambiente escolar.
                        </p>

                        <button
                            onClick={handleNavigateToBuscaAtiva}
                            className="mt-auto w-full py-4 rounded-xl bg-slate-50 text-slate-600 font-bold uppercase tracking-widest border border-slate-200 hover:bg-cyan-600 hover:text-white hover:border-cyan-600 hover:shadow-lg hover:shadow-cyan-200 transition-all flex items-center justify-center gap-3 group-hover:translate-y-0"
                        >
                            Acessar Módulo <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* CARD 2: ENTREVISTA SOCIAL */}
                    <div className="group relative bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 hover:border-rose-200 hover:shadow-2xl hover:shadow-rose-100/50 transition-all duration-300 flex flex-col items-start overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none transform group-hover:scale-110 duration-500">
                            <Heart size={200} />
                        </div>

                        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-6 shadow-sm border border-rose-100 group-hover:scale-110 transition-transform duration-300">
                            <Heart size={32} strokeWidth={2.5} />
                        </div>

                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-3 relative z-10 group-hover:text-rose-600 transition-colors">
                            Entrevista Social
                        </h2>

                        <p className="text-slate-500 font-medium leading-relaxed mb-10 relative z-10">
                            Contexto Escolar. Análise social aprofundada, dinâmica familiar e avaliação técnica detalhada do estudante.
                        </p>

                        <button
                            onClick={handleNavigateToEntrevista}
                            className="mt-auto w-full py-4 rounded-xl bg-slate-50 text-slate-600 font-bold uppercase tracking-widest border border-slate-200 hover:bg-rose-500 hover:text-white hover:border-rose-500 hover:shadow-lg hover:shadow-rose-200 transition-all flex items-center justify-center gap-3"
                        >
                            Acessar Módulo <ChevronRight size={18} />
                        </button>
                    </div>

                </div>

                {/* Orientação Visual */}
                <div className="flex items-center justify-center gap-8 py-8 md:px-20 opacity-70">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                    <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest max-w-md">
                        Use a <span className="text-cyan-600">Busca Ativa</span> para identificação inicial. <br />
                        Utilize a <span className="text-rose-500">Entrevista Social</span> quando o caso exigir análise aprofundada.
                    </p>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                </div>

                {/* Footer Link - Lista de Alunos (Apoio) */}
                <div className="flex justify-center">
                    <button
                        onClick={() => onNavigate('list')}
                        className="text-slate-400 hover:text-cyan-600 font-bold text-sm flex items-center gap-2 transition-colors px-6 py-3 rounded-full hover:bg-white hover:shadow-sm"
                    >
                        <Users size={16} /> Ver Lista Geral de Alunos
                    </button>
                </div>

            </div>
        </div>
    );
};

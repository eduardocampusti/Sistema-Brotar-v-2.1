import React, { useState, useEffect, useMemo } from 'react';
import { Student, Specialty, Session, User, hasPermission } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { SpecialistClinicalHomeDashboard } from './RoleDashboards';
import {
    Brain, Calendar, Users, FileText, History, TrendingUp,
    Shield, FolderLock, LayoutDashboard, Clock,
    Printer, Search, PlusCircle, ArrowRight,
    Download, Lock, Eye, EyeOff, MessageSquare, BookOpen,
    ClipboardList, PieChart as PieIcon, Activity
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line,
    CartesianGrid, AreaChart, Area
} from 'recharts';

const COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

export const PsychologyDashboard: React.FC<{
    currentUser: User,
    onNavigate: (page: string) => void,
    onOpenPatient?: (studentId: string) => void,
}> = ({ currentUser, onNavigate, onOpenPatient }) => {
    const [activeTab, setActiveTab] = useState('resumo');
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const allStudents = await SupabaseService.getStudents();
                setStudents(allStudents);
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

    const renderHeader = () => (
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Painel da Psicóloga</h1>
                <p className="text-slate-500 font-medium">Bem-vinda, {currentUser.name}</p>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onNavigate('psychology/new-session')}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-purple-100"
                >
                    <PlusCircle size={18} /> Nova Ativação (H.15.1.1)
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
            </div>
        </div>
    );

    const renderProntuarios = () => (
        <div className="space-y-4 animate-fadeIn">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <Search className="text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar aluno por nome ou CPF..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium"
                />
            </div>
            <div className="grid grid-cols-1 gap-3">
                {students.slice(0, 5).map(student => (
                    <div key={student.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-purple-200 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-black">
                                {student.fullName.charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">{student.fullName}</h4>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                        <Clock size={12} /> {student.school.grade}
                                    </span>
                                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                        <Shield size={12} /> Prontuário: {student.id.substring(0, 8)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 text-slate-400 hover:text-purple-600 transition-colors">
                                <Eye size={20} />
                            </button>
                            <button className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-slate-200">
                                <Lock size={14} /> PASTA CLÍNICA
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderEvolucoes = () => (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Minhas Evoluções</h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">Repositório histórico de atuação profissional</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold border border-purple-100">Rascunhos</button>
                    <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200">Finalizados</button>
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
                                    <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-purple-600 hover:text-white text-slate-600 rounded-lg text-[10px] font-black transition-all">
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
    );

    const renderPastaClinica = () => (
        <div className="bg-white p-6 md:p-10 rounded-3xl border border-slate-100 shadow-sm animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pasta Clínica Digital</h2>
                    <p className="text-slate-500 font-medium">Visão 360º do Paciente (Eixo Clínico)</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-red-50 text-red-600 px-5 py-2.5 rounded-xl font-bold text-sm border border-red-100 hover:bg-red-100 transition-colors">
                        Alta Técnica / Pausa
                    </button>
                    <button className="bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-slate-200">
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
                            <button className="mt-4 text-xs font-bold text-purple-600 hover:underline">Ver Detalhes</button>
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
                        <button key={doc} className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-purple-50 hover:text-purple-700 font-bold text-sm transition-all border border-transparent hover:border-purple-100">
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
                        <button className="bg-purple-600 text-white p-3 rounded-2xl shadow-lg shadow-purple-200">
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
                                <button key={m} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 text-sm font-medium text-slate-600">
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
                            <div key={i} className="aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-4 text-center group cursor-pointer hover:border-indigo-300 transition-all">
                                <FileText size={24} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Laudo Externo {i}.pdf</p>
                            </div>
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

            <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar mb-8">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all border ${activeTab === item.id
                            ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-100'
                            : 'bg-white text-slate-500 border-slate-100 hover:border-purple-200'
                            }`}
                    >
                        <item.icon size={18} />
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="max-w-7xl mx-auto">
                {renderContent()}
            </div>
        </div>
    );
};

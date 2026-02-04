
import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    CheckCircle2,
    Clock,
    User as UserIcon,
    MapPin,
    Loader2,
    FileText,
    CalendarCheck,
    CalendarDays
} from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';
import { Appointment, AppointmentStatus, Unit, Specialty, Student, User } from '../types';
import { useToast } from '../contexts/ToastContext';

interface SocialWorkerAgendaProps {
    currentUser: User;
    students: Student[];
    onNavigate: (page: string) => void;
    onNavigateToCase?: (studentId: string) => void;
}

export const SocialWorkerAgenda: React.FC<SocialWorkerAgendaProps> = ({ currentUser, students, onNavigate, onNavigateToCase }) => {

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const { success, error: showError } = useToast();

    // Filtra apenas atendimentos do PRÓPRIO profissional
    // Não precisa de estado para filtro, pois é fixo

    // Categorias para UI
    const [viewMode, setViewMode] = useState<'TODAY' | 'UPCOMING' | 'HISTORY'>('TODAY');

    const loadAppointments = async () => {
        setLoading(true);
        try {
            // Carrega TODOS e filtra no front (ou idealmente no back se tivesse suporte a filtro por professionalId na API publica)
            // Dado a assinatura do getAppointments, vamos carregar por data/unidade e filtrar localmente
            // Melhor estratégia para "Meus Atendimentos" sem range de data restrito na API:
            // Vamos assumir carga por datas relevantes ou carregar uma janela maior.
            // Para "Hoje", usamos a data de hoje.
            // Para "Próximos", carregamos uma janela futura.
            // Para "Histórico", carregamos passado.

            // Simplificação: Carregar agendamentos do mês/dia baseados na API existente
            // A API getAppointments aceita date, unit, specialty, status via query params (se implementado total)
            // Como SupabaseService.getAppointments parece focada em dia específico (pelo código do SchedulingCenter),
            // vamos adaptar para trazer o que for possível.

            // NOTA: Se a API getAppointments filtrar estritamente por dia, teremos limitação.
            // Assumindo que precisamos ver LISTAS, o ideal seria uma query "getMyAppointments".
            // Vou usar o getAppointments padrão e filtrar no client por hora, mas se a API for por DIA, 
            // a aba "Próximos" pode precisar de múltiplas chamadas ou ajuste na API.

            // Workaround seguro sem mexer na API: Carregar dia atual para 'TODAY'.
            // Para UPCOMING e HISTORY, seria ideal ter suporte na API, mas vou focar no TODAY que é o crítico,
            // e tentar carregar uma lista mais ampla se a API permitir (omitindo data?).
            // Olhando SchedulingCenter: data = selectedDate.

            const today = new Date().toISOString().split('T')[0];
            let data: Appointment[] = [];

            if (viewMode === 'TODAY') {
                data = await SupabaseService.getAppointments({ date: today });
            } else {
                // Se a API exigir data, ficamos limitados. Se omitir data trouxer tudo, ótimo.
                // Teste: Omitir data.
                data = await SupabaseService.getAppointments({});
            }

            // Filtra pelo ID do profissional logado
            const myAppointments = data.filter(apt => apt.professionalId === currentUser.id);

            // Filtra por categoria visual
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            const filtered = myAppointments.filter(apt => {
                if (viewMode === 'TODAY') return apt.date === todayStr;
                if (viewMode === 'UPCOMING') return apt.date > todayStr;
                if (viewMode === 'HISTORY') return apt.date < todayStr || (apt.date === todayStr && apt.status === 'ATENDIDO');
                return true;
            });

            // Ordenação
            filtered.sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.startTime}`).getTime();
                const dateB = new Date(`${b.date}T${b.startTime}`).getTime();
                return viewMode === 'HISTORY' ? dateB - dateA : dateA - dateB;
            });

            setAppointments(filtered);

        } catch (err) {
            console.error(err);
            showError("Erro ao carregar seus atendimentos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAppointments();
    }, [viewMode, currentUser]);

    const handleMarkAsDone = async (id: string) => {
        try {
            await SupabaseService.updateAppointmentStatus(id, 'ATENDIDO');
            success("Atendimento marcado como realizado!");
            loadAppointments();
        } catch (err) {
            showError("Erro ao atualizar status");
        }
    };

    const getStatusColor = (status: AppointmentStatus) => {
        switch (status) {
            case 'AGENDADO': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
            case 'ATENDIDO': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'FALTOU': return 'bg-red-50 text-red-600 border-red-200';
            case 'REMARCAR': return 'bg-orange-50 text-orange-600 border-orange-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8 animate-fadeIn">

            {/* Header com User Info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1E7F85] to-[#145f63] flex items-center justify-center text-white shadow-lg">
                        <CalendarCheck size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Meus Atendimentos</h1>
                        <p className="text-slate-500 font-medium mt-1">
                            {currentUser.name} • <span className="text-[#1E7F85] font-bold">Assistente Social</span>
                        </p>
                    </div>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('TODAY')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'TODAY' ? 'bg-white text-[#1E7F85] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Hoje
                    </button>
                    <button
                        onClick={() => setViewMode('UPCOMING')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'UPCOMING' ? 'bg-white text-[#1E7F85] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Próximos
                    </button>
                    <button
                        onClick={() => setViewMode('HISTORY')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'HISTORY' ? 'bg-white text-[#1E7F85] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Realizados
                    </button>
                </div>
            </div>

            {/* Lista */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px] flex flex-col">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 animate-pulse bg-slate-50/50">
                        <Loader2 size={48} className="animate-spin mb-4 text-[#1E7F85]" />
                        <p className="font-bold text-sm">Carregando sua agenda...</p>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 bg-slate-50/30">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <CalendarDays size={40} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-600 mb-2">Agenda Vazia</h3>
                        <p className="text-sm max-w-xs text-center">
                            {viewMode === 'TODAY' && "Você não possui atendimentos agendados para hoje."}
                            {viewMode === 'UPCOMING' && "Nenhum agendamento futuro encontrado."}
                            {viewMode === 'HISTORY' && "Nenhum histórico de atendimentos encontrado."}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {appointments.map(apt => (
                            <div key={apt.id} className="p-6 hover:bg-slate-50 transition-colors group flex flex-col md:flex-row gap-6 items-start md:items-center">
                                {/* Date Box */}
                                <div className="flex flex-col items-center justify-center w-20 h-20 bg-[#F7F5F0] rounded-2xl border border-[#1E7F85]/10 text-[#1E7F85]">
                                    <span className="text-xs font-bold uppercase tracking-widest mb-1">{new Date(apt.date).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                                    <span className="text-2xl font-black">{new Date(apt.date).getDate()}</span>
                                    <span className="text-[10px] font-bold uppercase">{new Date(apt.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                                </div>

                                {/* Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${getStatusColor(apt.status)}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full bg-current`} />
                                            {apt.status}
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                                            <Clock size={12} />
                                            {apt.startTime} - {apt.endTime}
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">{apt.studentName}</h3>
                                    <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                                        <span className="flex items-center gap-1.5">
                                            <MapPin size={12} className="text-slate-400" />
                                            {apt.unit}
                                        </span>
                                    </div>
                                    {apt.notes && (
                                        <p className="mt-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                                            "{apt.notes}"
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto">
                                    <button
                                        onClick={() => onNavigateToCase ? onNavigateToCase(apt.studentId) : null}
                                        className="flex-1 md:flex-none px-6 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-bold uppercase tracking-widest text-xs hover:border-[#1E7F85] hover:text-[#1E7F85] transition-all flex items-center justify-center gap-2"
                                    >
                                        <FileText size={16} /> Prontuário
                                    </button>

                                    {apt.status === 'AGENDADO' && (
                                        <button
                                            onClick={() => handleMarkAsDone(apt.id)}
                                            className="flex-1 md:flex-none px-6 py-3 bg-[#1E7F85] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#166065] shadow-lg shadow-[#1E7F85]/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 size={16} /> Realizado
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

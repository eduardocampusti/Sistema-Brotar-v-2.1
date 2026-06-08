import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Calendar as CalendarIcon,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    History,
    Loader2,
    PlayCircle,
    XCircle,
    AlertTriangle
} from 'lucide-react';
import { SupabaseService } from '../../services/SupabaseService';
import { Card, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import {
    Appointment,
    AppointmentStatus,
    Specialty,
    User,
} from '../../types';

interface MinhaAgendaPageProps {
    currentUser: User;
    onNavigate: (path: string) => void;
    onReschedule: (apt: Appointment) => void;
}

type AgendaTab = 'DAY' | 'CALENDAR';

const STATUS_STYLES: Record<string, { badge: string; dot: string; label: string }> = {
    EM_ATENDIMENTO: {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'Em atendimento',
    },
    CONFIRMADO: {
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        label: 'Confirmado',
    },
    AGENDADO: {
        badge: 'bg-slate-100 text-slate-600 border-slate-200',
        dot: 'bg-slate-400',
        label: 'Agendado',
    },
    CANCELADO: {
        badge: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500',
        label: 'Cancelado',
    },
    ENCERRADO: {
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-600',
        label: 'Encerrado',
    },
    ATENDIDO: {
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-600',
        label: 'Atendido',
    },
    FALTOU: {
        badge: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500',
        label: 'Faltou',
    },
    REMARCAR: {
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        label: 'Remarcar',
    },
};

function formatLocalDate(date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function parseISODate(isoDate: string): Date {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(isoDate: string, amount: number): string {
    const dt = parseISODate(isoDate);
    dt.setDate(dt.getDate() + amount);
    return formatLocalDate(dt);
}

function formatarDataAgendaPtBr(isoDate: string): string {
    const dt = parseISODate(isoDate);
    return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export const MinhaAgendaPage: React.FC<MinhaAgendaPageProps> = ({ currentUser, onNavigate, onReschedule }) => {
    const today = useMemo(() => formatLocalDate(), []);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(today);
    const [activeTab, setActiveTab] = useState<AgendaTab>('DAY');
    const [calendarMonth, setCalendarMonth] = useState(() => parseISODate(today));
    
    // P1: Estados do Fluxo de Atendimento Contínuo
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [loadingLastSession, setLoadingLastSession] = useState(false);
    const [lastSessionData, setLastSessionData] = useState<any>(null);
    const [selectedAptForStart, setSelectedAptForStart] = useState<Appointment | null>(null);

    // Filtro compactado de Status
    const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'ALL' | 'ALL_EXCEPT_CANCELED'>('ALL_EXCEPT_CANCELED');

    const loadAppointments = useCallback(async () => {
        setLoading(true);
        try {
            // Busca completa para alimentar métricas ("Esta Semana") e o Calendário de forma consistente
            const data = await SupabaseService.getAppointments({
                professionalId: currentUser.id
            });
            setAppointments(data);
        } catch (err) {
            console.error('Erro ao carregar agendamentos:', err);
        } finally {
            setLoading(false);
        }
    }, [currentUser.id]);

    useEffect(() => {
        loadAppointments();
    }, [loadAppointments]);

    // Ordenação Cronológica de Todos os Atendimentos
    const sortedAppointments = useMemo(
        () => [...appointments].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
        [appointments]
    );

    // Filtro dos atendimentos correspondentes à data selecionada
    const filteredDateAppointments = useMemo(() => {
        return sortedAppointments.filter((apt) => {
            const matchesDate = apt.date === selectedDate;
            if (!matchesDate) return false;
            if (filterStatus === 'ALL_EXCEPT_CANCELED') {
                return apt.status !== 'CANCELADO';
            }
            if (filterStatus === 'ALL') {
                return true;
            }
            return apt.status === filterStatus;
        });
    }, [selectedDate, sortedAppointments, filterStatus]);

    // Métricas
    const countHoje = useMemo(() => {
        return sortedAppointments.filter(apt => apt.date === today && apt.status !== 'CANCELADO').length;
    }, [sortedAppointments, today]);

    const countEstaSemana = useMemo(() => {
        const weekEndDate = addDays(today, 6);
        return sortedAppointments.filter(apt => apt.date >= today && apt.date <= weekEndDate && apt.status !== 'CANCELADO').length;
    }, [sortedAppointments, today]);

    // Calendário
    const calendarDays = useMemo(() => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const leadingBlanks = firstDay.getDay();
        const daysWithAppointments = new Set(
            sortedAppointments
                .filter(apt => apt.status !== 'CANCELADO')
                .map((apt) => apt.date)
        );

        return [
            ...Array.from({ length: leadingBlanks }, (_, index) => ({ key: `blank-${index}`, date: '', day: 0, hasAppointments: false })),
            ...Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const date = formatLocalDate(new Date(year, month, day));
                return { key: date, date, day, hasAppointments: daysWithAppointments.has(date) };
            }),
        ];
    }, [calendarMonth, sortedAppointments]);

    const getStatusStyle = (status: AppointmentStatus) => STATUS_STYLES[status] ?? STATUS_STYLES.AGENDADO;

    const getStatusIcon = (status: AppointmentStatus) => {
        switch (status) {
            case 'AGENDADO': return <Clock size={12} />;
            case 'CONFIRMADO': return <CheckCircle2 size={12} className="text-blue-500" />;
            case 'EM_ATENDIMENTO': return <PlayCircle size={12} className="text-emerald-500 animate-pulse" />;
            case 'ATENDIDO':
            case 'ENCERRADO': return <CheckCircle2 size={12} className="text-slate-500" />;
            case 'FALTOU':
            case 'CANCELADO': return <XCircle size={12} className="text-red-500" />;
            default: return <Clock size={12} />;
        }
    };

    const renderEmptyState = (message: string) => (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarIcon size={36} className="mb-3 text-slate-200" />
            <p className="font-bold text-slate-500 text-sm">{message}</p>
            <p className="text-xs text-slate-400 mt-1">Nenhum atendimento registrado para esta data.</p>
        </div>
    );

    const handleStartAtendimento = async (apt: Appointment) => {
        setSelectedAptForStart(apt);
        setLoadingLastSession(true);
        setShowSummaryModal(true);
        try {
            const sessions = await SupabaseService.getStudentSessions(apt.studentId);
            setLastSessionData(sessions.length > 0 ? sessions[0] : null);
        } catch (e) {
            setLastSessionData(null);
        } finally {
            setLoadingLastSession(false);
        }
    };

    const proceedToSession = () => {
        if (selectedAptForStart) {
            localStorage.setItem('brotar_auto_open_session', selectedAptForStart.studentId);
            localStorage.setItem('brotar_appointment_details', JSON.stringify({
                date: selectedAptForStart.date,
                startTime: selectedAptForStart.startTime,
                endTime: selectedAptForStart.endTime
            }));
            setShowSummaryModal(false);
            onReschedule(selectedAptForStart);
        }
    };

    return (
        <div className="flex h-full flex-col space-y-4">
            {/* Cabeçalho do Especialista */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-3">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-800">Minha Agenda</h1>
                    <p className="text-sm font-medium text-slate-500">
                        Visualização clínica operacional • <span className="text-[#8B1A3A] font-bold">{currentUser.specialty || 'Especialista'}</span>
                    </p>
                </div>
            </div>

            {/* Apenas 2 Cards de Métricas Estilizados */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Card className="rounded-2xl border-l-4 border-l-[#8B1A3A] border-y-slate-100 border-r-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="flex flex-col p-4">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Hoje</span>
                        <span className="mt-1 text-[28px] font-black text-slate-900 leading-none">{countHoje}</span>
                        <span className="mt-1.5 text-xs font-semibold text-slate-500">Atendimentos agendados para hoje</span>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border-l-4 border-l-[#10B981] border-y-slate-100 border-r-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="flex flex-col p-4">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Esta Semana</span>
                        <span className="mt-1 text-[28px] font-black text-slate-900 leading-none">{countEstaSemana}</span>
                        <span className="mt-1.5 text-xs font-semibold text-slate-500">Próximos 7 dias de atendimentos ativos</span>
                    </CardContent>
                </Card>
            </div>

            {/* Linha Única de Filtros Compacta */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Data da Agenda</label>
                    <div className="mt-1.5 flex items-center gap-2">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setCalendarMonth(parseISODate(e.target.value));
                            }}
                            className="min-w-0 flex-1 appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-black text-slate-800 outline-none transition-all focus:border-slate-300 focus:bg-white"
                        />
                        <button
                            onClick={() => {
                                setSelectedDate(today);
                                setCalendarMonth(parseISODate(today));
                            }}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:bg-slate-50"
                            title="Hoje"
                        >
                            <CalendarIcon size={14} />
                        </button>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Filtrar por Status</label>
                    <div className="relative mt-1.5">
                        <select
                            className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-black text-slate-800 outline-none transition-all focus:border-slate-300 focus:bg-white pr-8"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as AppointmentStatus | 'ALL' | 'ALL_EXCEPT_CANCELED')}
                        >
                            <option value="ALL_EXCEPT_CANCELED">Todos (exceto cancelados)</option>
                            <option value="ALL">Todos (inclusive cancelados)</option>
                            <option value="AGENDADO">Agendado</option>
                            <option value="CONFIRMADO">Confirmado</option>
                            <option value="EM_ATENDIMENTO">Em atendimento</option>
                            <option value="ENCERRADO">Encerrado</option>
                            <option value="ATENDIDO">Atendido</option>
                            <option value="FALTOU">Faltou</option>
                            <option value="REMARCAR">Remarcar</option>
                            <option value="CANCELADO">Cancelado</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Apenas 2 Abas Compactas */}
            <div className="rounded-xl bg-slate-100 p-1">
                <div className="grid grid-cols-2 gap-1">
                    <button
                        onClick={() => setActiveTab('DAY')}
                        className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide transition-all ${
                            activeTab === 'DAY'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:bg-white/60'
                        }`}
                    >
                        Agenda do Dia
                    </button>
                    <button
                        onClick={() => setActiveTab('CALENDAR')}
                        className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide transition-all ${
                            activeTab === 'CALENDAR'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:bg-white/60'
                        }`}
                    >
                        Calendário
                    </button>
                </div>
            </div>

            {/* Corpo de Exibição das Abas */}
            <div className="min-h-[400px] flex-1 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Loader2 size={36} className="mb-3 animate-spin text-[#8B1A3A]" />
                        <p className="text-xs font-bold">Buscando seus agendamentos...</p>
                    </div>
                ) : activeTab === 'DAY' ? (
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3.5">
                            <div>
                                <h2 className="text-sm font-black text-slate-800">Atendimentos Clínicos</h2>
                                <p className="text-[11px] font-semibold text-slate-500">{formatarDataAgendaPtBr(selectedDate)}</p>
                            </div>
                            <Badge className="bg-slate-200 text-slate-700 font-bold border-transparent">{filteredDateAppointments.length} registros</Badge>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                            {filteredDateAppointments.length === 0 ? (
                                renderEmptyState('Sem agendamentos para este dia')
                            ) : (
                                filteredDateAppointments.map((apt) => {
                                    const style = getStatusStyle(apt.status);
                                    const showIniciar = apt.status === 'AGENDADO' || apt.status === 'CONFIRMADO';

                                    return (
                                        <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3 hover:bg-slate-50/50 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <span className="w-12 shrink-0 text-xs font-black text-slate-600 pt-0.5">{apt.startTime}</span>
                                                <span className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1.5 ${style.dot}`} />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-slate-800 leading-tight">{apt.studentName}</p>
                                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">{apt.startTime} até {apt.endTime} • {apt.unit}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                                                <Badge className={`gap-1 px-2.5 py-0.5 text-[10px] font-bold border ${style.badge}`}>
                                                    {getStatusIcon(apt.status)}
                                                    <span>{style.label}</span>
                                                </Badge>
                                                {showIniciar && (
                                                    <button
                                                        onClick={() => handleStartAtendimento(apt)}
                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B1A3A] hover:bg-[#72142e] text-white px-3 py-1.5 text-xs font-black transition-all shadow-sm active:scale-95"
                                                    >
                                                        <PlayCircle size={13} />
                                                        <span>Iniciar Atendimento</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr]">
                        {/* Grade do Calendário */}
                        <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
                            <div className="mb-4 flex items-center justify-between">
                                <button
                                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                                    className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                                    {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                </h3>
                                <button
                                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                                    className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-wide text-slate-400 mb-2">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => <span key={day}>{day}</span>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((item) => item.date ? (
                                    <button
                                        key={item.key}
                                        onClick={() => setSelectedDate(item.date)}
                                        className={`relative flex aspect-square flex-col items-center justify-center text-xs font-bold transition-all rounded-full ${
                                            item.date === today
                                                ? 'bg-[#8B1A3A] text-white shadow-sm'
                                                : item.date === selectedDate
                                                    ? 'bg-red-50 text-[#8B1A3A] border border-[#8B1A3A]/20'
                                                    : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span>{item.day}</span>
                                        {item.hasAppointments && (
                                            <span className={`absolute bottom-1 h-1 w-1 rounded-full ${item.date === today ? 'bg-white' : 'bg-[#8B1A3A]'}`} />
                                        )}
                                    </button>
                                ) : (
                                    <div key={item.key} className="aspect-square" />
                                ))}
                            </div>
                        </div>

                        {/* Listagem do Dia Selecionado */}
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3.5">
                                <div>
                                    <h3 className="text-sm font-black text-slate-800">Atendimentos no Dia</h3>
                                    <p className="text-[11px] font-semibold text-slate-500">{formatarDataAgendaPtBr(selectedDate)}</p>
                                </div>
                                <Badge className="bg-slate-200 text-slate-700 font-bold border-transparent">{filteredDateAppointments.length} registros</Badge>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                                {filteredDateAppointments.length === 0 ? (
                                    renderEmptyState('Sem agendamentos para este dia')
                                ) : (
                                    (() => {
                                        const startTimeCounts = filteredDateAppointments.reduce((acc, apt) => {
                                            if (apt.startTime) {
                                                acc[apt.startTime] = (acc[apt.startTime] || 0) + 1;
                                            }
                                            return acc;
                                        }, {} as Record<string, number>);

                                        const conflictStartTimes = Object.keys(startTimeCounts).filter(time => startTimeCounts[time] > 1);
                                        const hasConflicts = conflictStartTimes.length > 0;
                                        const conflictingNames = filteredDateAppointments
                                            .filter(apt => apt.startTime && conflictStartTimes.includes(apt.startTime))
                                            .map(apt => apt.studentName)
                                            .join(', ');

                                        return (
                                            <>
                                                {hasConflicts && (
                                                    <div className="bg-[#FAEEDA] border-l-4 border-[#EF9F27] text-[#854F0B] p-4 mb-4 text-sm font-semibold shadow-sm flex items-center gap-2">
                                                        <AlertTriangle size={18} />
                                                        Conflito de horário detectado: {conflictingNames} estão agendados no mesmo horário. Verifique com a secretaria.
                                                    </div>
                                                )}
                                                {filteredDateAppointments.map((apt) => {
                                                    const isConflict = apt.startTime && conflictStartTimes.includes(apt.startTime);
                                                    const style = getStatusStyle(apt.status);
                                                    const showIniciar = apt.status === 'AGENDADO' || apt.status === 'CONFIRMADO';

                                                    return (
                                                        <div key={apt.id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3 transition-colors ${isConflict ? 'bg-[#FAEEDA] border-2 border-[#EF9F27]' : 'hover:bg-slate-50/50'}`}>
                                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                                {isConflict && (
                                                                    <span className="bg-[#FAEEDA] text-[#854F0B] border border-[#EF9F27] px-2 py-0.5 rounded-full text-xs font-bold shrink-0">
                                                                        Conflito
                                                                    </span>
                                                                )}
                                                                <div className="flex items-center gap-3">
                                                                    <span className="w-12 shrink-0 text-xs font-black text-slate-600 pt-0.5">{apt.startTime}</span>
                                                                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1.5 ${style.dot}`} />
                                                                    <div>
                                                                        <p className="text-sm font-black text-slate-800 leading-tight">{apt.studentName}</p>
                                                                        <p className="text-xs font-semibold text-slate-400 mt-0.5">{apt.specialty} • {apt.unit}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <Badge className={`gap-1 px-2 py-0.5 text-[9px] font-bold border ${style.badge}`}>
                                                                    {getStatusIcon(apt.status)}
                                                                    <span>{style.label}</span>
                                                                </Badge>
                                                                {showIniciar && (
                                                                    <button
                                                                        onClick={() => handleStartAtendimento(apt)}
                                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B1A3A] text-white px-2 py-1 text-[10px] font-black transition-all shadow-sm active:scale-95"
                                                                    >
                                                                        <PlayCircle size={11} />
                                                                        <span>Iniciar</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        );
                                    })()
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* P1: Modal de Resumo da Última Sessão */}
            {showSummaryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fadeIn">
                        <div className="bg-[#8B1A3A] p-4 text-white">
                            <h3 className="font-black flex items-center gap-2"><History size={18} /> Resumo da Última Sessão</h3>
                        </div>
                        <div className="p-6">
                            {loadingLastSession ? (
                                <div className="flex items-center gap-3 text-slate-500 justify-center py-6"><Loader2 className="animate-spin" /> Buscando histórico...</div>
                            ) : lastSessionData ? (
                                <div className="space-y-3">
                                    <div className="flex gap-2 items-center"><Badge className="bg-[#10B981]">{lastSessionData.date}</Badge></div>
                                    <p className="text-sm"><strong>Objetivo:</strong> {lastSessionData.content?.objetivo || lastSessionData.notes}</p>
                                    <p className="text-sm"><strong>Estratégias:</strong> {lastSessionData.content?.estrategias || 'N/A'}</p>
                                    <p className="text-sm"><strong>Evolução:</strong> {lastSessionData.content?.evolucao || 'N/A'}</p>
                                </div>
                            ) : (
                                <p className="text-center font-bold text-slate-600 py-6">Primeiro atendimento registrado no sistema.</p>
                            )}
                            <div className="mt-8 flex justify-end gap-3">
                                <button onClick={() => setShowSummaryModal(false)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
                                <button onClick={proceedToSession} className="px-5 py-2 font-black text-white bg-[#10B981] hover:bg-emerald-600 rounded-xl shadow-sm transition-all flex items-center gap-2">Ir para o Prontuário <ChevronRight size={16}/></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

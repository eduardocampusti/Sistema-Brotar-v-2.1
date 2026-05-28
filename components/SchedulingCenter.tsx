import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Ban,
    Calendar as CalendarIcon,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Loader2,
    MapPin,
    MessageSquare,
    PlayCircle,
    Plus,
    RotateCcw,
    Smartphone,
    Trash2,
    User as UserIcon,
    Users,
    XCircle,
} from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';
import { useAuth } from '@/src/hooks/useAuth';
import { Card, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { ConfirmModal } from './ConfirmModal';
import {
    Appointment,
    AppointmentStatus,
    AuditAction,
    Specialty,
    Student,
    Unit,
    User,
    statusAgendamentoRealizado,
} from '../types';
import { useToast } from '../contexts/ToastContext';

interface SchedulingCenterProps {
    currentUser: User;
    students: Student[];
    onNavigate?: (page: string) => void;
    onReschedule?: (appointment: Appointment) => void;
}

type AgendaTab = 'DAY' | 'PROFESSIONAL' | 'WEEK' | 'CALENDAR';

interface ProfessionalGroup {
    key: string;
    name: string;
    specialty: Specialty;
    unit: Unit;
    appointments: Appointment[];
}

const STATUS_STYLES: Record<string, { badge: string; dot: string; bar: string; label: string }> = {
    EM_ATENDIMENTO: {
        badge: 'bg-[#10B981]/10 text-[#047857] border-[#10B981]/25',
        dot: 'bg-[#10B981]',
        bar: 'bg-[#10B981]',
        label: 'Em atendimento',
    },
    CONFIRMADO: {
        badge: 'bg-[#3B82F6]/10 text-[#1D4ED8] border-[#3B82F6]/25',
        dot: 'bg-[#3B82F6]',
        bar: 'bg-[#3B82F6]',
        label: 'Confirmado',
    },
    AGENDADO: {
        badge: 'bg-[#6B7280]/10 text-[#4B5563] border-[#6B7280]/25',
        dot: 'bg-[#6B7280]',
        bar: 'bg-[#6B7280]',
        label: 'Agendado',
    },
    CANCELADO: {
        badge: 'bg-[#EF4444]/10 text-[#B91C1C] border-[#EF4444]/25',
        dot: 'bg-[#EF4444]',
        bar: 'bg-[#EF4444]',
        label: 'Cancelado',
    },
    ENCERRADO: {
        badge: 'bg-[#374151]/10 text-[#374151] border-[#374151]/25',
        dot: 'bg-[#374151]',
        bar: 'bg-[#374151]',
        label: 'Encerrado',
    },
    ATENDIDO: {
        badge: 'bg-[#374151]/10 text-[#374151] border-[#374151]/25',
        dot: 'bg-[#374151]',
        bar: 'bg-[#374151]',
        label: 'Atendido',
    },
    FALTOU: {
        badge: 'bg-[#EF4444]/10 text-[#B91C1C] border-[#EF4444]/25',
        dot: 'bg-[#EF4444]',
        bar: 'bg-[#EF4444]',
        label: 'Faltou',
    },
    REMARCAR: {
        badge: 'bg-[#F59E0B]/10 text-[#B45309] border-[#F59E0B]/25',
        dot: 'bg-[#F59E0B]',
        bar: 'bg-[#F59E0B]',
        label: 'Remarcar',
    },
};

const SPECIALTY_COLORS = [
    'bg-emerald-100 text-emerald-700',
    'bg-blue-100 text-blue-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
    'bg-indigo-100 text-indigo-700',
    'bg-slate-100 text-slate-700',
];

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

function formatShortDate(isoDate: string): string {
    return parseISODate(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function relativeDayLabel(isoDate: string, today: string): string {
    if (isoDate === today) return 'Hoje';
    if (isoDate === addDays(today, 1)) return 'Amanha';
    return parseISODate(isoDate).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'PR';
}

interface SpecialtyStyle {
    avatar: string;
    bar: string;
}

function getSpecialtyStyle(specialty: string): SpecialtyStyle {
    const spec = String(specialty).toUpperCase();
    if (spec.includes('PSICOPEDAGOGIA')) {
        return { avatar: 'bg-pink-100 text-pink-700', bar: 'bg-pink-500' };
    }
    if (spec.includes('PSICOLOGIA')) {
        return { avatar: 'bg-purple-100 text-purple-700', bar: 'bg-purple-500' };
    }
    if (spec.includes('FONOAUDIOLOGIA') || spec.includes('FONO')) {
        return { avatar: 'bg-cyan-100 text-cyan-700', bar: 'bg-cyan-500' };
    }
    if (spec.includes('OCUPACIONAL') || spec.includes('T.O') || spec.includes('TO')) {
        return { avatar: 'bg-indigo-100 text-indigo-700', bar: 'bg-indigo-500' };
    }
    if (spec.includes('FISIOTERAPIA') || spec.includes('FISIO')) {
        return { avatar: 'bg-green-100 text-green-700', bar: 'bg-green-500' };
    }
    if (spec.includes('NUTRICAO') || spec.includes('NUTRIÇÃO') || spec.includes('NUTRI')) {
        return { avatar: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' };
    }
    if (spec.includes('SERVICO') || spec.includes('SERVIÇO') || spec.includes('SOCIAL')) {
        return { avatar: 'bg-orange-100 text-orange-700', bar: 'bg-orange-500' };
    }
    return { avatar: 'bg-slate-100 text-slate-700', bar: 'bg-slate-500' };
}

function professionalTone(specialty: Specialty): string {
    return getSpecialtyStyle(specialty).avatar;
}

export const SchedulingCenter: React.FC<SchedulingCenterProps> = ({ currentUser, students, onNavigate, onReschedule }) => {
    const { user: authUser } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const podeExcluirAtendimento = authUser?.role === 'ADMIN';
    const today = useMemo(() => formatLocalDate(), []);

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(today);
    const [activeTab, setActiveTab] = useState<AgendaTab>('DAY');
    const [expandedProfessional, setExpandedProfessional] = useState<string | null>(null);
    const [calendarMonth, setCalendarMonth] = useState(() => parseISODate(today));
    const { success, error: showError } = useToast();

    const resolveInitialUnit = (): Unit | 'ALL' => {
        if (currentUser.role === 'ADMIN') return 'ALL';
        const scope = currentUser.scope as string;
        if (!scope || scope === 'GLOBAL') return 'ALL';
        return scope as Unit;
    };

    const [filterUnit, setFilterUnit] = useState<Unit | 'ALL'>(resolveInitialUnit());
    const [filterSpecialty, setFilterSpecialty] = useState<Specialty | 'ALL'>('ALL');
    const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'ALL' | 'ALL_EXCEPT_CANCELED'>(
        currentUser.role === 'SPECIALIST' ? 'ALL_EXCEPT_CANCELED' : 'ALL'
    );
    const [pendingLogicalDelete, setPendingLogicalDelete] = useState<Appointment | null>(null);
    const [motivoExclusao, setMotivoExclusao] = useState('');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const st = location.state as { focusAppointmentDate?: string } | null | undefined;
        const d = st?.focusAppointmentDate;
        if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
        setSelectedDate(d);
        setCalendarMonth(parseISODate(d));
        navigate('.', { replace: true, state: {} });
    }, [location.state, navigate]);

    const isRestrictedProfessional = currentUser.role === 'SPECIALIST';

    const loadAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const data = await SupabaseService.getAppointments({
                unit: filterUnit === 'ALL' ? undefined : filterUnit as Unit,
                specialty: filterSpecialty === 'ALL' ? undefined : filterSpecialty as Specialty,
                status: (filterStatus === 'ALL' || filterStatus === 'ALL_EXCEPT_CANCELED')
                    ? undefined
                    : filterStatus as AppointmentStatus,
                ...(isRestrictedProfessional ? { professionalId: currentUser.id } : {}),
            });
            if (isRestrictedProfessional && filterStatus === 'ALL_EXCEPT_CANCELED') {
                setAppointments(data.filter(a => a.status !== 'CANCELADO'));
            } else {
                setAppointments(data);
            }
        } catch (err) {
            showError('Erro ao carregar agendamentos');
        } finally {
            setLoading(false);
        }
    }, [filterSpecialty, filterStatus, filterUnit, showError, isRestrictedProfessional, currentUser.id]);

    useEffect(() => {
        if (currentUser.role === 'SECRETARIA_COCAL' || (currentUser.role === 'EDUCATION_SECRETARY' && currentUser.scope === 'COCAL')) {
            setFilterUnit('COCAL');
        } else if (currentUser.role === 'SECRETARIA_SEDE' || (currentUser.role === 'EDUCATION_SECRETARY' && currentUser.scope === 'SEDE')) {
            setFilterUnit('SEDE');
        }
    }, [currentUser]);

    useEffect(() => {
        loadAppointments();
    }, [loadAppointments]);

    useEffect(() => {
        const interval = setInterval(() => {
            loadAppointments();
        }, 30000);
        return () => clearInterval(interval);
    }, [loadAppointments]);

    const sortedAppointments = useMemo(
        () => [...appointments].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
        [appointments]
    );

    const selectedDateAppointments = useMemo(
        () => sortedAppointments.filter((apt) => apt.date === selectedDate),
        [selectedDate, sortedAppointments]
    );

    const todayAppointments = useMemo(
        () => sortedAppointments.filter((apt) => apt.date === today),
        [sortedAppointments, today]
    );

    const weekEndDate = useMemo(() => addDays(today, 6), [today]);
    const nextSevenDaysAppointments = useMemo(
        () => sortedAppointments.filter((apt) => apt.date >= today && apt.date <= weekEndDate),
        [sortedAppointments, today, weekEndDate]
    );

    const summaryCards = useMemo(() => ([
        { title: 'Hoje', value: todayAppointments.length, borderClass: 'border-l-[#10B981]', subtext: 'Agendamentos hoje' },
        { title: 'Confirmados', value: sortedAppointments.filter((apt) => apt.status === 'CONFIRMADO').length, borderClass: 'border-l-[#3B82F6]', subtext: 'Pacientes confirmados' },
        { title: 'Próximos 7 dias', value: nextSevenDaysAppointments.length, borderClass: 'border-l-[#64748B]', subtext: 'Próximos 7 dias' },
        {
            title: 'Pendentes',
            value: sortedAppointments.filter((apt) => ['AGENDADO', 'REMARCAR', 'CANCELADO'].includes(apt.status)).length,
            borderClass: 'border-l-[#F59E0B]',
            subtext: 'Aguardando retorno',
        },
    ]), [nextSevenDaysAppointments.length, sortedAppointments, todayAppointments.length]);

    const nextAppointments = useMemo(
        () => sortedAppointments
            .filter((apt) => apt.date > selectedDate && !['CANCELADO', 'FALTOU'].includes(apt.status))
            .slice(0, 5),
        [selectedDate, sortedAppointments]
    );

    const nextAppointmentDate = useMemo(
        () => nextAppointments.length > 0 ? nextAppointments[0].date : null,
        [nextAppointments]
    );

    const professionalsNextDay = useMemo<ProfessionalGroup[]>(() => {
        if (!nextAppointmentDate) return [];
        const groups = new Map<string, ProfessionalGroup>();
        sortedAppointments
            .filter((apt) => apt.date === nextAppointmentDate && !['CANCELADO', 'FALTOU'].includes(apt.status))
            .forEach((apt) => {
                const key = apt.professionalId || `${apt.professionalName}-${apt.specialty}`;
                const current = groups.get(key) ?? { key, name: apt.professionalName, specialty: apt.specialty, unit: apt.unit, appointments: [] };
                current.appointments.push(apt);
                groups.set(key, current);
            });
        return Array.from(groups.values()).sort((a, b) => b.appointments.length - a.appointments.length);
    }, [nextAppointmentDate, sortedAppointments]);

    const professionalsToday = useMemo<ProfessionalGroup[]>(() => {
        const groups = new Map<string, ProfessionalGroup>();
        selectedDateAppointments.forEach((apt) => {
            const key = apt.professionalId || `${apt.professionalName}-${apt.specialty}-${apt.unit}`;
            const current = groups.get(key) ?? {
                key,
                name: apt.professionalName,
                specialty: apt.specialty,
                unit: apt.unit,
                appointments: [],
            };
            current.appointments.push(apt);
            groups.set(key, current);
        });
        return Array.from(groups.values()).sort((a, b) => b.appointments.length - a.appointments.length || a.name.localeCompare(b.name));
    }, [selectedDateAppointments]);

    const maxProfessionalAppointments = Math.max(1, ...professionalsToday.map((item) => item.appointments.length));

    const weekGroups = useMemo(() => {
        return Array.from({ length: 7 }, (_, index) => {
            const date = addDays(today, index);
            return {
                date,
                label: relativeDayLabel(date, today),
                appointments: nextSevenDaysAppointments.filter((apt) => apt.date === date),
            };
        });
    }, [nextSevenDaysAppointments, today]);

    const calendarDays = useMemo(() => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const leadingBlanks = firstDay.getDay();
        const daysWithAppointments = new Set(sortedAppointments.map((apt) => apt.date));

        return [
            ...Array.from({ length: leadingBlanks }, (_, index) => ({ key: `blank-${index}`, date: '', day: 0, hasAppointments: false })),
            ...Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const date = formatLocalDate(new Date(year, month, day));
                return { key: date, date, day, hasAppointments: daysWithAppointments.has(date) };
            }),
        ];
    }, [calendarMonth, sortedAppointments]);

    const handleStatusUpdate = async (id: string, newStatus: AppointmentStatus) => {
        try {
            await SupabaseService.updateAppointmentStatus(id, newStatus);
            success(`Status atualizado para ${newStatus}`);
            loadAppointments();
        } catch (err) {
            showError('Erro ao atualizar status');
        }
    };

    const confirmLogicalDelete = async () => {
        if (!pendingLogicalDelete || authUser?.role !== 'ADMIN' || !authUser.id) return;
        setDeleting(true);
        try {
            const apt = pendingLogicalDelete;
            await SupabaseService.excluirAtendimentoLogico(
                apt.id,
                authUser.id,
                motivoExclusao || undefined,
                authUser.role
            );

            await SupabaseService.logAction(
                currentUser as any,
                AuditAction.DELETE,
                'AGENDAMENTOS',
                `Exclusao logica: ${apt.studentName} (${apt.date} ${apt.startTime})${motivoExclusao.trim() ? ` - Motivo: ${motivoExclusao.trim()}` : ''}`
            );

            success('Atendimento excluido');
            setAppointments((prev) => prev.filter((a) => a.id !== apt.id));
            setPendingLogicalDelete(null);
            setMotivoExclusao('');
        } catch (err) {
            showError('Erro ao excluir atendimento');
        } finally {
            setDeleting(false);
        }
    };

    const getStatusStyle = (status: AppointmentStatus) => STATUS_STYLES[status] ?? STATUS_STYLES.AGENDADO;

    const getStatusIcon = (status: AppointmentStatus) => {
        switch (status) {
            case 'AGENDADO': return <Clock size={14} />;
            case 'CONFIRMADO': return <MessageSquare size={14} />;
            case 'EM_ATENDIMENTO': return <PlayCircle size={14} />;
            case 'ATENDIDO':
            case 'ENCERRADO': return <CheckCircle2 size={14} />;
            case 'FALTOU':
            case 'CANCELADO': return <XCircle size={14} />;
            case 'REMARCAR': return <RotateCcw size={14} />;
            default: return <Clock size={14} />;
        }
    };

    const getConfirmationBadge = (apt: Appointment) => {
        const status = apt.statusConfirmacao;
        const hasPhone = !!apt.telefoneResponsavel;

        if (!hasPhone) {
            return (
                <div className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-orange-500">
                    <Smartphone size={12} />
                    Sem tel. cadastrado
                </div>
            );
        }

        if (!status || status === 'PENDENTE') {
            return (
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <MessageSquare size={12} className="opacity-50" />
                    WhatsApp pendente
                </div>
            );
        }

        if (status === 'CONFIRMADO') {
            return (
                <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-600">
                    <CheckCircle2 size={12} />
                    WhatsApp confirmado
                </div>
            );
        }

        if (status === 'CANCELADO') {
            return (
                <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-red-600">
                    <XCircle size={12} />
                    WhatsApp cancelado
                </div>
            );
        }

        if (status === 'REMARCAR') {
            return (
                <div className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-orange-600">
                    <RotateCcw size={12} />
                    Pediu remarcar
                </div>
            );
        }

        return null;
    };

    const renderAppointmentRow = (apt: Appointment, showDate = false, index = 0) => {
        const style = getStatusStyle(apt.status);

        const getThemeCardColors = () => {
            const role = currentUser.role;
            const specialty = currentUser.specialty as string;
            const scope = currentUser.scope;

            if (role === 'ADMIN')
                return ['bg-white border-slate-300','bg-slate-200 border-slate-300','bg-white border-slate-300','bg-slate-200 border-slate-300','bg-white border-slate-300'];
            if (role === 'ESCOLA')
                return ['bg-white border-emerald-300','bg-emerald-100 border-emerald-300','bg-white border-emerald-300','bg-emerald-100 border-emerald-300','bg-white border-emerald-300'];
            if (role === 'SECRETARIA_COCAL' || scope === 'COCAL')
                return ['bg-white border-orange-300','bg-orange-100 border-orange-300','bg-white border-orange-300','bg-orange-100 border-orange-300','bg-white border-orange-300'];
            if (role === 'SECRETARIA_SEDE' || role === 'EDUCATION_SECRETARY' || role === 'ASSISTANT')
                return ['bg-white border-blue-300','bg-blue-100 border-blue-300','bg-white border-blue-300','bg-blue-100 border-blue-300','bg-white border-blue-300'];
            if (specialty === 'PSYCHOLOGY')
                return ['bg-white border-purple-300','bg-purple-100 border-purple-300','bg-white border-purple-300','bg-purple-100 border-purple-300','bg-white border-purple-300'];
            if (specialty === 'SPEECH_THERAPY')
                return ['bg-white border-cyan-300','bg-cyan-100 border-cyan-300','bg-white border-cyan-300','bg-cyan-100 border-cyan-300','bg-white border-cyan-300'];
            if (specialty === 'OCCUPATIONAL_THERAPY')
                return ['bg-white border-indigo-300','bg-indigo-100 border-indigo-300','bg-white border-indigo-300','bg-indigo-100 border-indigo-300','bg-white border-indigo-300'];
            if (specialty === 'PSYCHOPEDAGOGY')
                return ['bg-white border-[#D9ABFF]','bg-[#FFABAB]/30 border-[#FFABAB]','bg-[#FFDAAB]/30 border-[#FFDAAB]','bg-[#DDFFAB]/30 border-[#DDFFAB]','bg-[#ABE4FF]/30 border-[#ABE4FF]'];
            if (specialty === 'NUTRITION')
                return ['bg-white border-green-300','bg-green-100 border-green-300','bg-white border-green-300','bg-green-100 border-green-300','bg-white border-green-300'];
            if (specialty === 'PHYSIOTHERAPY')
                return ['bg-white border-teal-300','bg-teal-100 border-teal-300','bg-white border-teal-300','bg-teal-100 border-teal-300','bg-white border-teal-300'];
            if (specialty === 'SOCIAL_WORK')
                return ['bg-white border-amber-300','bg-amber-100 border-amber-300','bg-white border-amber-300','bg-amber-100 border-amber-300','bg-white border-amber-300'];
            return ['bg-white border-slate-300','bg-slate-200 border-slate-300','bg-white border-slate-300','bg-slate-200 border-slate-300','bg-white border-slate-300'];
        };

        const cardColors = getThemeCardColors();
        const cardColor = cardColors[index % cardColors.length];

        return (
            <div key={apt.id} className={`mx-3 my-2 rounded-xl border ${cardColor} shadow-sm transition-all hover:shadow-md`}>
                <div className="flex items-start gap-3 px-4 pt-3 pb-1">
                    <span className="w-11 shrink-0 text-[11px] font-bold text-slate-600 pt-0.5">{apt.startTime}</span>
                    <span className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${style.dot}`} />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-medium text-slate-800">{apt.studentName}</span>
                            {showDate && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 shrink-0">
                                    {formatShortDate(apt.date)}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-400">{apt.specialty} • {apt.professionalName} • {apt.unit}</span>
                            <Badge className={`gap-1 px-2 py-0.5 text-[10px] font-medium shrink-0 ${style.badge}`}>
                                {getStatusIcon(apt.status)}
                                <span className="ml-0.5">{style.label}</span>
                            </Badge>
                        </div>
                        {getConfirmationBadge(apt) && (
                            <div className="mt-1">{getConfirmationBadge(apt)}</div>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3 pt-1">
                            {apt.status === 'AGENDADO' && (
                                <button onClick={() => handleStatusUpdate(apt.id, 'CONFIRMADO')} title="Confirmar agendamento"
                                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
                                    <CheckCircle2 size={11} /> Confirmar
                                </button>
                            )}
                            {(apt.status === 'AGENDADO' || apt.status === 'CONFIRMADO') && (
                                <button onClick={() => handleStatusUpdate(apt.id, 'EM_ATENDIMENTO')} title="Iniciar atendimento"
                                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                                    <PlayCircle size={11} /> Iniciar
                                </button>
                            )}
                            {!statusAgendamentoRealizado(apt.status) && !['CANCELADO','FALTOU','REMARCAR'].includes(apt.status) && (
                                <button onClick={() => handleStatusUpdate(apt.id, 'ENCERRADO')} title="Encerrar atendimento"
                                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors">
                                    <CheckCircle2 size={11} /> Encerrar
                                </button>
                            )}
                            {!['CANCELADO','ENCERRADO','ATENDIDO','FALTOU'].includes(apt.status) && (
                                <button onClick={() => { if (onReschedule) onReschedule(apt); else handleStatusUpdate(apt.id, 'REMARCAR'); }} title="Remarcar atendimento"
                                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors">
                                    <RotateCcw size={11} /> Remarcar
                                </button>
                            )}
                            {!['CANCELADO','ENCERRADO','ATENDIDO'].includes(apt.status) && (
                                <button onClick={() => handleStatusUpdate(apt.id, 'FALTOU')} title="Registrar falta do paciente"
                                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
                                    <XCircle size={11} /> Faltou
                                </button>
                            )}
                            {['SECRETARIA_SEDE','SECRETARIA_COCAL','ADMIN','COORDENADOR'].includes(currentUser.role) &&
                                !['CANCELADO','ENCERRADO','ATENDIDO'].includes(apt.status) && (
                                <button onClick={() => handleStatusUpdate(apt.id, 'CANCELADO')} title="Cancelar agendamento"
                                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 transition-colors">
                                    <Ban size={11} /> Cancelar
                                </button>
                            )}
                            {podeExcluirAtendimento && (
                                <button type="button" onClick={() => { setMotivoExclusao(''); setPendingLogicalDelete(apt); }} title="Excluir registro de atendimento"
                                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors">
                                    <Trash2 size={11} /> Excluir
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderEmptyState = (message: string, showNext = false) => (
        <div className="flex flex-col px-5 py-4">
            <div className="flex flex-col items-center py-8 text-center">
                <CalendarIcon size={38} className="mb-3 text-slate-200" />
                <p className="font-bold text-slate-500 text-sm">{message}</p>
                <p className="text-xs text-slate-400 mt-1">Nenhum atendimento registrado para esta data.</p>
            </div>
            {showNext && nextAppointments.length > 0 && (
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-slate-100" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <CalendarIcon size={12} />
                            Próximos agendamentos
                        </span>
                        <div className="h-px flex-1 bg-slate-100" />
                    </div>
                    <div className="rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
                        {nextAppointments.map((apt, i) => renderAppointmentRow(apt, true, i))}
                    </div>
                    <p className="text-center text-[11px] text-slate-400 mt-3">
                        Mostrando os próximos {nextAppointments.length} agendamentos futuros
                    </p>
                </div>
            )}
        </div>
    );

    const filterSelectClass = 'mt-2 w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-black text-slate-800 outline-none transition-all focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100';

    return (
        <div className="flex h-full flex-col space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-800">Central de Agendamentos</h1>
                    <p className="text-sm font-medium text-slate-500">Visao operacional dos atendimentos da rede</p>
                </div>
                <button
                    className="flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-lg shadow-primary-200 transition-all hover:bg-primary-700 active:scale-95"
                    onClick={() => onNavigate && onNavigate('new-appointment')}
                >
                    <Plus size={20} />
                    <span>Novo Agendamento</span>
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {summaryCards.map((card) => {
                    return (
                        <Card key={card.title} className={`rounded-2xl border-y-slate-100 border-r-slate-100 border-l-4 ${card.borderClass} bg-white shadow-sm`}>
                            <CardContent className="flex flex-col p-4">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{card.title}</span>
                                <span className="mt-1 text-[28px] font-medium text-slate-900 leading-none">{card.value}</span>
                                <span className="mt-1 text-[11px] text-slate-500 font-medium">{card.subtext}</span>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {/* UNIDADE */}
                <div className="rounded-2xl border-[0.5px] border-slate-200 bg-white p-4 flex flex-col justify-between shadow-sm">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unidade</label>
                    <div className="relative mt-1">
                        <select
                            className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-800 outline-none transition-all focus:border-slate-300 focus:ring-2 focus:ring-slate-100 pr-8"
                            value={filterUnit}
                            onChange={(e) => setFilterUnit(e.target.value as Unit | 'ALL')}
                            disabled={currentUser.role === 'SECRETARIA_COCAL' || currentUser.role === 'SECRETARIA_SEDE'}
                        >
                            {(currentUser.role === 'ADMIN' || currentUser.role === 'SPECIALIST') && <option value="ALL">Todas as unidades</option>}
                            {(!currentUser.role.includes('COCAL') && !currentUser.scope?.includes('COCAL')) && <option value="SEDE">Sede</option>}
                            {(!currentUser.role.includes('SEDE') && !currentUser.scope?.includes('SEDE')) && <option value="COCAL">Cocal</option>}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                    </div>
                </div>

                {/* ESPECIALIDADE */}
                <div className="rounded-2xl border-[0.5px] border-slate-200 bg-white p-4 flex flex-col justify-between shadow-sm">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Especialidade</label>
                    <div className="relative mt-1">
                        <select
                            className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-800 outline-none transition-all focus:border-slate-300 focus:ring-2 focus:ring-slate-100 pr-8"
                            value={filterSpecialty}
                            onChange={(e) => setFilterSpecialty(e.target.value as Specialty | 'ALL')}
                        >
                            <option value="ALL">Todas as especialidades</option>
                            {Object.values(Specialty).map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                    </div>
                </div>

                {/* STATUS */}
                <div className="rounded-2xl border-[0.5px] border-slate-200 bg-white p-4 flex flex-col justify-between shadow-sm">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</label>
                    <div className="relative mt-1">
                        <select
                            className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-800 outline-none transition-all focus:border-slate-300 focus:ring-2 focus:ring-slate-100 pr-8"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as AppointmentStatus | 'ALL' | 'ALL_EXCEPT_CANCELED')}
                        >
                            <option value={currentUser.role === 'SPECIALIST' ? 'ALL_EXCEPT_CANCELED' : 'ALL'}>
                                {currentUser.role === 'SPECIALIST' ? 'Todos (exceto cancelados)' : 'Todos os status'}
                            </option>
                            {currentUser.role === 'SPECIALIST' && (
                                <option value="ALL">Todos (inclusive cancelados)</option>
                            )}
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

                {/* DATA */}
                <div className="rounded-2xl border-[0.5px] border-slate-200 bg-white p-4 flex flex-col justify-between shadow-sm">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Data</label>
                    <div className="mt-1 flex items-center gap-2">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setCalendarMonth(parseISODate(e.target.value));
                            }}
                            className="min-w-0 flex-1 appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-800 outline-none transition-all focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                        />
                        <button
                            onClick={() => {
                                setSelectedDate(today);
                                setCalendarMonth(parseISODate(today));
                            }}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700"
                            title="Voltar para hoje"
                        >
                            <CalendarIcon size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl bg-slate-100 p-1">
                <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
                    {[
                        { id: 'DAY' as const, label: 'Agenda do dia' },
                        { id: 'PROFESSIONAL' as const, label: 'Por profissional' },
                        { id: 'WEEK' as const, label: 'Proximos 7 dias' },
                        { id: 'CALENDAR' as const, label: 'Calendario' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`rounded-xl border px-3 py-2.5 text-xs font-black uppercase tracking-wide transition-all ${activeTab === tab.id
                                ? 'border-slate-200 bg-white text-slate-900 shadow-sm'
                                : 'border-transparent text-slate-500 hover:bg-white/60 hover:text-slate-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="min-h-[420px] flex-1 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Loader2 size={40} className="mb-4 animate-spin text-primary-500" />
                        <p className="text-sm font-bold">Carregando agenda...</p>
                    </div>
                ) : activeTab === 'DAY' ? (
                    <div className="grid h-full grid-cols-1 lg:grid-cols-2">
                        <div className={`border-b border-slate-100 ${isRestrictedProfessional ? '' : 'lg:border-b-0 lg:border-r'}`}>
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                                <div>
                                    <h2 className="font-black text-slate-800">Agenda do dia</h2>
                                    <p className="text-xs font-semibold text-slate-500">{formatarDataAgendaPtBr(selectedDate)}</p>
                                </div>
                                <Badge variant="secondary">{selectedDateAppointments.length} registros</Badge>
                            </div>
                            <div className="max-h-[680px] overflow-y-auto">
                                {selectedDateAppointments.length === 0
                                    ? renderEmptyState('Nenhum atendimento para esta data', true)
                                    : selectedDateAppointments.map((apt, i) => renderAppointmentRow(apt, false, i))}
                            </div>
                        </div>

                        {!isRestrictedProfessional && <div>
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                                <div>
                                    <h2 className="font-black text-slate-800">Por profissional</h2>
                                    <p className="text-xs font-semibold text-slate-500">
                                        {selectedDateAppointments.length === 0 && nextAppointmentDate
                                            ? `Próximo dia com atendimentos: ${formatarDataAgendaPtBr(nextAppointmentDate)}`
                                            : 'Distribuicao dos atendimentos do dia'}
                                    </p>
                                </div>
                                <Users size={18} className="text-slate-400" />
                            </div>
                            <div className="max-h-[680px] space-y-2 overflow-y-auto p-3">
                                {(selectedDateAppointments.length === 0 ? professionalsNextDay : professionalsToday).length === 0
                                    ? renderEmptyState('Nenhum profissional com atendimento')
                                    : (selectedDateAppointments.length === 0 ? professionalsNextDay : professionalsToday).map((professional, idx) => {
                                        const tone = professionalTone(professional.specialty);
                                        const specStyle = getSpecialtyStyle(professional.specialty);
                                        const progress = Math.max(8, Math.round((professional.appointments.length / maxProfessionalAppointments) * 100));
                                        const isExpanded = expandedProfessional === professional.key;
                                        const cardBg = idx % 2 === 0 
                                            ? 'bg-white border-slate-200' 
                                            : 'bg-blue-50/40 border-blue-100';
                                        return (
                                            <div key={professional.key} className={`rounded-xl ${cardBg} shadow-sm overflow-hidden`}>
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedProfessional(isExpanded ? null : professional.key)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50/30 transition-colors text-left"
                                                >
                                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold uppercase ${tone} border-2 border-white shadow-sm`}>
                                                        {getInitials(professional.name)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-[13px] font-medium text-slate-800">{professional.name}</p>
                                                        <p className="truncate text-[11px] text-slate-500">{professional.specialty} • {professional.unit}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-[13px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">{professional.appointments.length}</span>
                                                        <ChevronRight size={14} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                    </div>
                                                </button>
                                                <div className="px-4 pb-2">
                                                    <div className="h-1 overflow-hidden rounded-full bg-slate-100">
                                                        <div className={`h-full rounded-full ${specStyle.bar}`} style={{ width: `${progress}%` }} />
                                                    </div>
                                                </div>
                                                {isExpanded && (
                                                    <div className="border-t border-slate-100 divide-y divide-slate-50">
                                                        {professional.appointments.map((apt, i) => renderAppointmentRow(apt, true, i))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>}
                    </div>
                ) : activeTab === 'PROFESSIONAL' ? (
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                            <div>
                                <h2 className="font-black text-slate-800">Por profissional</h2>
                                <p className="text-xs font-semibold text-slate-500">Clique para expandir a agenda do dia</p>
                            </div>
                            <Badge variant="secondary">{professionalsToday.length} profissionais</Badge>
                        </div>
                        <div className="max-h-[720px] space-y-3 overflow-y-auto p-4">
                            {professionalsToday.length === 0 ? renderEmptyState('Nenhum atendimento agrupado') : professionalsToday.map((professional) => {
                                const isOpen = expandedProfessional === professional.key;
                                const tone = professionalTone(professional.specialty);
                                return (
                                    <div key={professional.key} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                                        <button type="button" onClick={() => setExpandedProfessional(isOpen ? null : professional.key)} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50">
                                            <div className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase ${tone}`}>{getInitials(professional.name)}</div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold text-slate-800">{professional.name}</p>
                                                <p className="truncate text-xs text-slate-500">{professional.specialty} • {professional.unit}</p>
                                            </div>
                                            <div className="shrink-0 flex items-center gap-2">
                                                <span className="text-[13px] font-bold text-slate-900">{professional.appointments.length} atend.</span>
                                                <ChevronRight size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                                            </div>
                                        </button>
                                        {isOpen && <div className="border-t border-slate-100">{professional.appointments.map((apt, i) => renderAppointmentRow(apt, false, i))}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : activeTab === 'WEEK' ? (
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                            <div>
                                <h2 className="font-black text-slate-800">Proximos 7 dias</h2>
                                <p className="text-xs font-semibold text-slate-500">{formatShortDate(today)} ate {formatShortDate(weekEndDate)}</p>
                            </div>
                            <Badge variant="secondary">{nextSevenDaysAppointments.length} registros</Badge>
                        </div>
                        <div className="max-h-[720px] overflow-y-auto">
                            {weekGroups.map((group) => (
                                <div key={group.date} className="border-b border-slate-100 last:border-b-0">
                                    <div className="sticky top-0 z-10 flex items-center justify-between bg-slate-50 px-5 py-3">
                                        <div>
                                            <p className="text-sm font-black capitalize text-slate-800">{group.label}</p>
                                            <p className="text-xs font-semibold text-slate-500">{formatarDataAgendaPtBr(group.date)}</p>
                                        </div>
                                        <Badge variant="outline">{group.appointments.length}</Badge>
                                    </div>
                                    {group.appointments.length === 0
                                        ? <p className="px-5 py-5 text-sm font-semibold text-slate-400">Sem atendimentos.</p>
                                        : group.appointments.map((apt) => renderAppointmentRow(apt, true))}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr]">
                        <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
                            <div className="mb-4 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                                    className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                                    title="Mes anterior"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <h2 className="text-lg font-black capitalize text-slate-800">
                                    {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                                    className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                                    title="Proximo mes"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => <span key={day} className="py-2">{day}</span>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((item) => item.date ? (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setSelectedDate(item.date)}
                                        className={`relative flex aspect-square flex-col items-center justify-center text-sm font-semibold transition-all ${item.date === today
                                            ? 'bg-[#10B981] text-white rounded-full shadow-sm'
                                            : item.date === selectedDate
                                                ? 'bg-blue-50 text-[#3B82F6] rounded-full border border-blue-100 font-bold'
                                                : 'text-slate-700 hover:bg-slate-50 rounded-full'
                                            }`}
                                    >
                                        <span>{item.day}</span>
                                        {item.hasAppointments && (
                                            <span className={`absolute bottom-1 h-[4px] w-[4px] rounded-full ${item.date === today ? 'bg-white' : 'bg-[#3B82F6]'}`} />
                                        )}
                                    </button>
                                ) : (
                                    <div key={item.key} className="aspect-square" />
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                                <div>
                                    <h2 className="font-black text-slate-800">{formatarDataAgendaPtBr(selectedDate)}</h2>
                                    <p className="text-xs font-semibold text-slate-500">Atendimentos do dia selecionado</p>
                                </div>
                                <Badge variant="secondary">{selectedDateAppointments.length} registros</Badge>
                            </div>
                            <div className="max-h-[680px] overflow-y-auto">
                                {selectedDateAppointments.length === 0
                                    ? renderEmptyState('Nenhum atendimento neste dia')
                                    : selectedDateAppointments.map((apt) => renderAppointmentRow(apt))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={!!pendingLogicalDelete && podeExcluirAtendimento}
                title="Excluir Atendimento"
                type="warning"
                confirmLabel="Sim, excluir"
                cancelLabel="Cancelar"
                confirmButtonClassName="bg-red-500 hover:bg-red-600 focus:ring-red-500 shadow-red-100"
                message={
                    pendingLogicalDelete
                        ? `Tem certeza que deseja excluir o atendimento de ${pendingLogicalDelete.studentName} agendado para ${formatarDataAgendaPtBr(pendingLogicalDelete.date)} as ${pendingLogicalDelete.startTime}?\n\nEsta acao nao podera ser desfeita pela interface.`
                        : ''
                }
                footerExtra={
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="motivo-exclusao-atendimento">
                            Motivo da exclusao (opcional)
                        </label>
                        <textarea
                            id="motivo-exclusao-atendimento"
                            value={motivoExclusao}
                            onChange={(e) => setMotivoExclusao(e.target.value)}
                            placeholder="Descreva o motivo..."
                            rows={3}
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                        />
                    </div>
                }
                isLoading={deleting}
                onCancel={() => {
                    if (deleting) return;
                    setPendingLogicalDelete(null);
                    setMotivoExclusao('');
                }}
                onConfirm={() => void confirmLogicalDelete()}
            />
        </div>
    );
};

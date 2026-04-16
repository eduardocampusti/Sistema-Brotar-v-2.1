import React, { useCallback, useEffect, useState } from 'react';
import {
    Calendar as CalendarIcon,
    CheckCircle,
    CheckCircle2,
    Clock,
    Loader2,
    MessageSquare,
    Play,
    PlayCircle,
    RotateCcw,
    School,
    XCircle,
} from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';
import {
    AgendamentoProfissionalView,
    AppointmentStatus,
    Student,
    User,
    statusAgendamentoRealizado,
} from '../types';
import { useToast } from '../contexts/ToastContext';

export interface AgendaProfissionalProps {
    currentUser: User;
    students: Student[];
    onSelectStudent: (student: Student) => void;
    /**
     * Quando definido (ex.: especialista com ficha no módulo clínico), substitui `onSelectStudent`
     * após “Iniciar atendimento” com sucesso e ao clicar em “Em atendimento” para retomar a ficha.
     */
    onSelectStudentAfterIniciar?: (student: Student) => void;
}

function badgeLabel(status: AppointmentStatus): string {
    if (status === 'EM_ATENDIMENTO') return 'Em atendimento';
    if (statusAgendamentoRealizado(status)) return 'Concluído';
    if (status === 'AGENDADO' || status === 'CONFIRMADO') return 'Agendado';
    if (status === 'FALTOU') return 'Faltou';
    return status.replace(/_/g, ' ');
}

/** Borda esquerda 4px por status (cores solicitadas). */
function statusBorderClass(status: AppointmentStatus): string {
    if (status === 'AGENDADO' || status === 'CONFIRMADO') return 'border-l-[#10B981]';
    if (status === 'EM_ATENDIMENTO') return 'border-l-[#F59E0B]';
    if (statusAgendamentoRealizado(status)) return 'border-l-[#9CA3AF]';
    if (status === 'FALTOU') return 'border-l-[#EF4444]';
    return 'border-l-slate-300';
}

const AVATAR_BG_CLASSES = [
    'bg-primary-600',
    'bg-primary-700',
    'bg-rose-600',
    'bg-orange-600',
    'bg-amber-600',
    'bg-teal-600',
    'bg-cyan-700',
    'bg-slate-600',
    'bg-red-700',
    'bg-emerald-700',
] as const;

function avatarBgClassFromName(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i += 1) {
        h = name.charCodeAt(i) + ((h << 5) - h);
    }
    const idx = Math.abs(h) % AVATAR_BG_CLASSES.length;
    return AVATAR_BG_CLASSES[idx] ?? 'bg-primary-600';
}

function inicialPrimeiroNome(fullName: string): string {
    const part = fullName.trim().split(/\s+/)[0];
    if (!part) return '?';
    const ch = part[0];
    return ch ? ch.toLocaleUpperCase('pt-BR') : '?';
}

function parseSlotDate(dateIso: string, hhmm: string): Date | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
    if (!m) return null;
    const d = new Date(`${dateIso}T${String(m[1]).padStart(2, '0')}:${m[2]}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
}

type TempoLinha = { text: string; className: string; pulse?: boolean } | null;

function tempoRelativoSlot(apt: AgendamentoProfissionalView, now: Date): TempoLinha {
    const start = parseSlotDate(apt.date, apt.startTime);
    const end = parseSlotDate(apt.date, apt.endTime);
    if (!start || !end) return null;

    const msUntilStart = start.getTime() - now.getTime();
    const msUntilEnd = end.getTime() - now.getTime();
    const msSinceEnd = now.getTime() - end.getTime();

    if (msUntilStart > 48 * 60 * 60 * 1000) {
        const dias = Math.round(msUntilStart / (24 * 60 * 60 * 1000));
        return { text: `Em ${dias} dia${dias === 1 ? '' : 's'}`, className: 'text-emerald-600 font-semibold' };
    }

    if (msUntilStart > 0) {
        const min = Math.max(1, Math.ceil(msUntilStart / 60000));
        const urgent = min <= 30;
        return {
            text: `Faltam ${min} min`,
            className: urgent ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold',
        };
    }

    if (msUntilEnd >= 0) {
        return { text: 'Agora', className: 'text-primary-600 font-bold', pulse: true };
    }

    if (msSinceEnd > 48 * 60 * 60 * 1000) return null;

    const minPassados = Math.max(1, Math.floor(msSinceEnd / 60000));
    return { text: `Há ${minPassados} min`, className: 'text-slate-400 font-medium' };
}

function mensagemErroSupabase(e: unknown): string {
    if (e instanceof Error) return e.message;
    if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string') {
        return (e as { message: string }).message;
    }
    return 'Não foi possível concluir a operação.';
}

function badgeClass(status: AppointmentStatus): string {
    switch (status) {
        case 'AGENDADO':
        case 'CONFIRMADO':
            return 'bg-emerald-50 text-emerald-800 border-emerald-200';
        case 'EM_ATENDIMENTO':
            return 'bg-amber-50 text-amber-900 border-amber-200';
        case 'ATENDIDO':
        case 'ENCERRADO':
            return 'bg-slate-100 text-slate-700 border-slate-200';
        case 'FALTOU':
            return 'bg-red-50 text-red-700 border-red-200';
        default:
            return 'bg-slate-50 text-slate-600 border-slate-200';
    }
}

function statusDotClass(status: AppointmentStatus): string {
    if (status === 'AGENDADO' || status === 'CONFIRMADO') return 'bg-[#10B981]';
    if (status === 'EM_ATENDIMENTO') return 'bg-[#F59E0B]';
    if (statusAgendamentoRealizado(status)) return 'bg-[#9CA3AF]';
    if (status === 'FALTOU') return 'bg-[#EF4444]';
    return 'bg-slate-400';
}

function StatusBadgeIcon({ status }: { status: AppointmentStatus }) {
    const cls = 'w-3.5 h-3.5 shrink-0';
    if (status === 'AGENDADO' || status === 'CONFIRMADO') return <Clock className={cls} aria-hidden />;
    if (status === 'EM_ATENDIMENTO') return <Play className={cls} aria-hidden />;
    if (statusAgendamentoRealizado(status)) return <CheckCircle className={cls} aria-hidden />;
    if (status === 'FALTOU') return <XCircle className={cls} aria-hidden />;
    return <Clock className={cls} aria-hidden />;
}

export const AgendaProfissional: React.FC<AgendaProfissionalProps> = ({
    currentUser,
    students,
    onSelectStudent,
    onSelectStudentAfterIniciar,
}) => {
    const [appointments, setAppointments] = useState<AgendamentoProfissionalView[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [viewMode, setViewMode] = useState<'HOJE' | 'PROXIMOS'>('HOJE');
    const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null);
    const [actingId, setActingId] = useState<string | null>(null);
    /** Força re-render do texto “Faltam X min” / “Agora” a cada 60s. */
    const [, setTimeTick] = useState(0);
    const { success, error: showError } = useToast();

    useEffect(() => {
        const id = window.setInterval(() => setTimeTick((n) => n + 1), 60_000);
        return () => window.clearInterval(id);
    }, []);

    const loadAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const opts =
                viewMode === 'HOJE'
                    ? { date: selectedDate }
                    : { fromDate: new Date().toISOString().split('T')[0] };
            const data = await SupabaseService.getAgendamentosDoProfissional(currentUser.id, opts);
            setAppointments(data);
        } catch {
            showError('Erro ao carregar sua agenda');
        } finally {
            setLoading(false);
        }
    }, [currentUser.id, selectedDate, viewMode, showError]);

    useEffect(() => {
        void loadAppointments();
    }, [loadAppointments]);

    useEffect(() => {
        const interval = setInterval(() => void loadAppointments(), 30000);
        return () => clearInterval(interval);
    }, [loadAppointments]);

    const escolaDoAluno = (apt: AgendamentoProfissionalView) => {
        if (apt.studentSchoolName) return apt.studentSchoolName;
        const st = students.find((s) => s.id === apt.studentId);
        return st?.school?.schoolName || 'Não informada';
    };

    const hojeIso = new Date().toISOString().split('T')[0];
    const emptyCopy =
        viewMode === 'HOJE' && selectedDate === hojeIso
            ? 'Nenhum atendimento agendado para hoje.'
            : 'Nenhum atendimento neste período.';

    const handleIniciar = async (apt: AgendamentoProfissionalView) => {
        setActingId(apt.id);
        try {
            // 1) Atualiza status primeiro: com RLS V20, o aluno só liberava leitura após status “válido”
            //    (antes da V22, AGENDADO não contava — lista 0 e getStudentById falhava).
            await SupabaseService.iniciarAtendimento(apt.id, apt.studentId);
            success('Atendimento iniciado');
            await loadAppointments();

            let st: Student | undefined = students.find((s) => s.id === apt.studentId);
            if (!st) {
                const fetched = await SupabaseService.getStudentById(apt.studentId);
                if (fetched) st = fetched;
            }
            if (!st) {
                showError(
                    'Atendimento marcado como em curso, mas o prontuário não abriu. Recarregue a página ou abra o aluno em Alunos / Prontuários.'
                );
                return;
            }
            const openStudent = onSelectStudentAfterIniciar ?? onSelectStudent;
            openStudent(st);
        } catch (e: unknown) {
            console.error('[AgendaProfissional] iniciar atendimento:', e);
            showError(mensagemErroSupabase(e));
        } finally {
            setActingId(null);
        }
    };

    const handleConcluir = async (apt: AgendamentoProfissionalView) => {
        setActingId(apt.id);
        try {
            await SupabaseService.atualizarStatusAgendamento(apt.id, 'ENCERRADO');
            success('Atendimento concluído');
            await loadAppointments();
        } catch (e: unknown) {
            console.error('[AgendaProfissional] concluir:', e);
            showError(mensagemErroSupabase(e));
        } finally {
            setActingId(null);
        }
    };

    /** Volta ao prontuário/ficha sem alterar o status (já está EM_ATENDIMENTO). */
    const handleRetomarAtendimento = async (apt: AgendamentoProfissionalView) => {
        if (apt.status !== 'EM_ATENDIMENTO') return;
        setActingId(apt.id);
        try {
            let st: Student | undefined = students.find((s) => s.id === apt.studentId);
            if (!st) {
                const fetched = await SupabaseService.getStudentById(apt.studentId);
                if (fetched) st = fetched;
            }
            if (!st) {
                showError('Não foi possível localizar o cadastro deste aluno para abrir a ficha.');
                return;
            }
            const openStudent = onSelectStudentAfterIniciar ?? onSelectStudent;
            openStudent(st);
        } catch (e: unknown) {
            console.error('[AgendaProfissional] retomar atendimento:', e);
            showError(mensagemErroSupabase(e));
        } finally {
            setActingId(null);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Minha Agenda</h1>
                    <p className="text-slate-500 text-sm font-medium">Seus atendimentos agendados</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_15px_50px_-12px_rgba(0,0,0,0.08)]">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">
                    Data
                </label>
                <div className="flex items-center gap-2 max-w-md">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        disabled={viewMode === 'PROXIMOS'}
                        className="flex-1 p-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all disabled:opacity-50"
                    />
                    <button
                        type="button"
                        onClick={() => setSelectedDate(hojeIso)}
                        className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all"
                        title="Voltar para hoje"
                    >
                        <CalendarIcon size={20} />
                    </button>
                </div>
                {viewMode === 'PROXIMOS' && (
                    <p className="text-xs text-slate-400 mt-2 font-medium">
                        Em &quot;Próximos&quot;, a lista usa a partir de hoje; o seletor de data volta a valer em &quot;Hoje&quot;.
                    </p>
                )}
            </div>

            <div className="flex-1 overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col">
                <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setViewMode('HOJE')}
                            className={`text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'HOJE' ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Hoje
                        </button>
                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                        <button
                            type="button"
                            onClick={() => setViewMode('PROXIMOS')}
                            className={`text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'PROXIMOS' ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Próximos
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight">
                            {appointments.length} {appointments.length === 1 ? 'item' : 'itens'}
                        </span>
                        <button
                            type="button"
                            onClick={() => void loadAppointments()}
                            title="Atualizar"
                            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition-all"
                        >
                            <RotateCcw size={14} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 sm:p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 animate-pulse">
                            <Loader2 size={40} className="animate-spin mb-4 text-primary-500" />
                            <p className="font-bold text-sm">Carregando agenda...</p>
                        </div>
                    ) : appointments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-slate-400">
                            <CalendarIcon size={48} className="mb-4 opacity-20" />
                            <p className="font-bold text-slate-500">{emptyCopy}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {appointments.map((apt) => {
                                const tempoLinha = tempoRelativoSlot(apt, new Date());
                                return (
                                    <div
                                        key={apt.id}
                                        className={`rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 ${statusBorderClass(apt.status)}`}
                                    >
                                        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                            <div className="flex flex-col sm:flex-row sm:items-start gap-4 flex-1 min-w-0">
                                                <div className="flex flex-col gap-1 shrink-0 sm:min-w-[9.5rem]">
                                                    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 text-lg sm:text-xl font-bold text-primary-600 tabular-nums tracking-tight">
                                                        <span>{apt.startTime}</span>
                                                        <span
                                                            className="text-primary-400 font-black text-xl sm:text-2xl leading-none px-0.5 select-none"
                                                            aria-hidden
                                                        >
                                                            →
                                                        </span>
                                                        <span>{apt.endTime}</span>
                                                    </div>
                                                    {tempoLinha ? (
                                                        <p
                                                            className={`text-xs ${tempoLinha.className} ${
                                                                tempoLinha.pulse
                                                                    ? 'motion-safe:animate-pulse motion-reduce:animate-none'
                                                                    : ''
                                                            }`}
                                                        >
                                                            {tempoLinha.text}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <div className="flex flex-1 min-w-0 gap-3">
                                                    <div
                                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white shadow-inner ${avatarBgClassFromName(apt.studentName)}`}
                                                        aria-hidden
                                                    >
                                                        {inicialPrimeiroNome(apt.studentName)}
                                                    </div>
                                                    <div className="min-w-0 flex-1 space-y-1">
                                                        <h3 className="text-base font-black text-slate-900 leading-tight">
                                                            {apt.studentName}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                            <School size={14} className="text-primary-500 shrink-0" />
                                                            <span className="truncate">{escolaDoAluno(apt)}</span>
                                                        </div>
                                                        {apt.status === 'EM_ATENDIMENTO' ? (
                                                            <button
                                                                type="button"
                                                                disabled={!!actingId}
                                                                title="Voltar à ficha de atendimento deste aluno"
                                                                aria-label="Em atendimento: retomar e abrir a ficha"
                                                                onClick={() => void handleRetomarAtendimento(apt)}
                                                                className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold text-left transition-all ${badgeClass(
                                                                    apt.status
                                                                )} cursor-pointer hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60`}
                                                            >
                                                                <span
                                                                    className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(apt.status)}`}
                                                                    aria-hidden
                                                                />
                                                                <StatusBadgeIcon status={apt.status} />
                                                                <span className="tracking-tight">{badgeLabel(apt.status)}</span>
                                                            </button>
                                                        ) : (
                                                            <div
                                                                className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${badgeClass(apt.status)}`}
                                                            >
                                                                <span
                                                                    className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(apt.status)}`}
                                                                    aria-hidden
                                                                />
                                                                <StatusBadgeIcon status={apt.status} />
                                                                <span className="tracking-tight">{badgeLabel(apt.status)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:items-end gap-2 w-full lg:w-auto shrink-0">
                                                <div className="flex flex-wrap items-center gap-2 justify-end">
                                                    {(apt.status === 'AGENDADO' || apt.status === 'CONFIRMADO') && (
                                                        <button
                                                            type="button"
                                                            disabled={!!actingId}
                                                            onClick={() => void handleIniciar(apt)}
                                                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-md shadow-primary-200 transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {actingId === apt.id ? (
                                                                <Loader2 size={16} className="animate-spin" />
                                                            ) : (
                                                                <PlayCircle size={16} />
                                                            )}
                                                            Iniciar Atendimento
                                                        </button>
                                                    )}
                                                    {apt.status === 'EM_ATENDIMENTO' && (
                                                        <button
                                                            type="button"
                                                            disabled={!!actingId}
                                                            onClick={() => void handleConcluir(apt)}
                                                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {actingId === apt.id ? (
                                                                <Loader2 size={16} className="animate-spin" />
                                                            ) : (
                                                                <CheckCircle2 size={16} />
                                                            )}
                                                            Concluir
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        title={
                                                            apt.notes?.trim()
                                                                ? 'Observações do agendamento'
                                                                : 'Observações (nenhum texto cadastrado)'
                                                        }
                                                        aria-expanded={expandedNotesId === apt.id}
                                                        aria-label="Observações do agendamento"
                                                        onClick={() =>
                                                            setExpandedNotesId((id) => (id === apt.id ? null : apt.id))
                                                        }
                                                        className={`inline-flex cursor-pointer items-center justify-center rounded-xl border p-2.5 transition-colors ${
                                                            apt.notes?.trim()
                                                                ? 'border-primary-200 bg-primary-50/90 text-primary-600 hover:bg-primary-50'
                                                                : 'border-slate-200 bg-white text-slate-500 hover:border-primary-200 hover:text-primary-600'
                                                        }`}
                                                    >
                                                        <MessageSquare size={18} aria-hidden />
                                                    </button>
                                                </div>
                                                {expandedNotesId === apt.id && (
                                                    <div className="max-w-md rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-left text-xs text-slate-600 whitespace-pre-wrap">
                                                        {apt.notes?.trim() ? apt.notes : 'Nenhuma observação registrada.'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

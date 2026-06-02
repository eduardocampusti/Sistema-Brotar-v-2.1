import React from 'react';
import { Save, User, MapPin, Briefcase, CalendarDays, Clock, AlertCircle } from 'lucide-react';

function formatDateBR(ymd: string | undefined): string | undefined {
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined;
    const [y, m, d] = ymd.split('-');
    return `${d}/${m}/${y}`;
}

type RowProps = {
    label: string;
    value?: string;
    pending: string;
    icon: React.ReactNode;
    isLast?: boolean;
};

function SummaryRow({ label, value, pending, icon, isLast }: RowProps) {
    const filled = Boolean(value && value.trim());
    return (
        <div className={`flex items-start gap-3 py-3 sm:py-3.5 ${!isLast ? 'border-b border-dashed border-slate-200' : ''}`}>
            <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${filled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {icon}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-[11px]">{label}</dt>
                <dd className={`text-xs font-semibold leading-snug sm:text-sm ${filled ? 'text-slate-900' : 'text-slate-400'}`}>
                    {filled ? value : pending}
                </dd>
            </div>
        </div>
    );
}

export type AppointmentSummaryCardProps = {
    patientName?: string;
    schoolName?: string;
    specialty?: string;
    professionalName?: string;
    dateYmd?: string;
    startTime?: string;
    endTime?: string;
    loading: boolean;
    confirmDisabled: boolean;
    onConfirm: () => void;
};

export const AppointmentSummaryCard: React.FC<AppointmentSummaryCardProps> = ({
    patientName,
    schoolName,
    specialty,
    professionalName,
    dateYmd,
    startTime,
    endTime,
    loading,
    confirmDisabled,
    onConfirm,
}) => {
    const dateLabel = formatDateBR(dateYmd);
    const timeLabel =
        startTime && endTime ? `${startTime} – ${endTime}` : startTime ? startTime : undefined;

    return (
        <article
            className="flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-200/50 ring-1 ring-slate-200/60"
            aria-labelledby="appointment-summary-heading"
        >
            <div className="relative border-b border-slate-100 bg-gradient-to-b from-emerald-50/50 to-white px-4 py-4 sm:px-5 sm:py-5">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-[#2D6A4F]" />
                <h3
                    id="appointment-summary-heading"
                    className="font-headline text-base font-bold tracking-tight text-slate-900 sm:text-lg"
                >
                    Resumo do Agendamento
                </h3>
                <p className="mt-1 text-xs font-medium text-slate-500">
                    Confira todos os dados antes de confirmar sua solicitação.
                </p>
            </div>

            <dl className="flex flex-1 flex-col px-4 sm:px-5">
                <SummaryRow 
                    label="Paciente" 
                    value={patientName} 
                    pending="Selecione um paciente" 
                    icon={<User size={14} strokeWidth={2.5} />} 
                />
                <SummaryRow 
                    label="Unidade escolar" 
                    value={schoolName} 
                    pending="Selecione a escola" 
                    icon={<MapPin size={14} strokeWidth={2.5} />} 
                />
                <SummaryRow 
                    label="Especialidade" 
                    value={specialty} 
                    pending="Selecione uma especialidade" 
                    icon={<BriefcaseMedical size={14} strokeWidth={2.5} />} 
                />
                <SummaryRow 
                    label="Profissional" 
                    value={professionalName} 
                    pending="Selecione um profissional" 
                    icon={<User size={14} strokeWidth={2.5} />} 
                />
                <SummaryRow 
                    label="Data" 
                    value={dateLabel} 
                    pending="Escolha uma data" 
                    icon={<CalendarDays size={14} strokeWidth={2.5} />} 
                />
                <SummaryRow 
                    label="Horário" 
                    value={timeLabel} 
                    pending="Escolha um horário" 
                    icon={<Clock size={14} strokeWidth={2.5} />} 
                    isLast 
                />
            </dl>

            <div className="bg-slate-50/80 px-4 py-4 sm:px-5">
                {confirmDisabled && (
                    <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200/50">
                        <AlertCircle className="mt-0.5 shrink-0 text-amber-500" size={16} />
                        <p className="text-xs font-medium text-amber-800">
                            Preencha todas as etapas do formulário para liberar a confirmação.
                        </p>
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => void onConfirm()}
                    disabled={confirmDisabled}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[#2D6A4F] px-4 py-3 font-headline text-sm font-bold text-white shadow-md transition-all duration-300 hover:bg-[#1f4a37] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none sm:py-3.5 sm:text-base"
                >
                    {loading ? (
                        <div
                            className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                            aria-hidden
                        />
                    ) : (
                        <>
                            {!confirmDisabled && (
                                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                                    <div className="relative h-full w-8 bg-white/20" />
                                </div>
                            )}
                            <Save size={18} className="shrink-0 transition-transform group-hover:scale-110" aria-hidden />
                            Confirmar Agendamento
                        </>
                    )}
                </button>
            </div>
        </article>
    );
};


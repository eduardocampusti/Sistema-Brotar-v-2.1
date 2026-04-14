import React from 'react';
import { Save } from 'lucide-react';

function formatDateBR(ymd: string | undefined): string | undefined {
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined;
    const [y, m, d] = ymd.split('-');
    return `${d}/${m}/${y}`;
}

type RowProps = {
    label: string;
    value?: string;
    pending: string;
};

function SummaryRow({ label, value, pending }: RowProps) {
    const filled = Boolean(value && value.trim());
    return (
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-[minmax(0,6.25rem)_1fr] sm:items-center sm:gap-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd
                className={`text-xs font-semibold leading-tight sm:text-[13px] sm:leading-snug ${
                    filled ? 'text-slate-900' : 'font-medium text-slate-400'
                }`}
            >
                {filled ? value : pending}
            </dd>
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
            className="flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100"
            aria-labelledby="appointment-summary-heading"
        >
            <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2 sm:px-4">
                <h3
                    id="appointment-summary-heading"
                    className="font-headline text-sm font-bold tracking-tight text-slate-900 sm:text-base"
                >
                    Resumo do Agendamento
                </h3>
                <p className="mt-0.5 text-[11px] leading-tight text-slate-500">Confira os dados antes de confirmar.</p>
            </div>

            <dl className="grid flex-1 grid-cols-1 gap-y-1 px-3 py-2.5 sm:gap-y-1 sm:px-4 sm:py-3">
                <SummaryRow label="Paciente" value={patientName} pending="Selecione um paciente" />
                <SummaryRow label="Unidade escolar" value={schoolName} pending="Selecione a unidade escolar" />
                <SummaryRow label="Especialidade" value={specialty} pending="Selecione uma especialidade" />
                <SummaryRow label="Profissional" value={professionalName} pending="Selecione um profissional" />
                <SummaryRow label="Data" value={dateLabel} pending="Selecione uma data" />
                <SummaryRow label="Horário" value={timeLabel} pending="Selecione um horário" />
            </dl>

            <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-2.5 sm:px-4">
                <button
                    type="button"
                    onClick={() => void onConfirm()}
                    disabled={confirmDisabled}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#2D6A4F] px-4 py-2.5 font-headline text-sm font-bold text-white shadow-md transition-colors duration-200 hover:bg-[#245a43] disabled:cursor-not-allowed disabled:opacity-45 sm:py-3 sm:text-base"
                >
                    {loading ? (
                        <div
                            className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white sm:h-5 sm:w-5"
                            aria-hidden
                        />
                    ) : (
                        <>
                            <Save size={18} className="shrink-0" aria-hidden />
                            Confirmar Agendamento
                        </>
                    )}
                </button>
            </div>
        </article>
    );
};

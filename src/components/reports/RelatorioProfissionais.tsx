import React, { useCallback, useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Loader2 } from 'lucide-react';
import type { PapelTimbradoConfig, School, Student, SupportProfessional, Unit } from '../../../types';
import { isSupportProfessionalActive } from '../../../types';
import { SupabaseService } from '../../../services/SupabaseService';
import { drawLetterhead, drawFooter } from '../../../utils/pdfExport';

type DiagnosisFilterValue = '' | 'tea' | 'other' | 'none';

const normalizeDiagnosisSearch = (value: string): string =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const clinicalLooksLikeTea = (clinical: Student['clinical'] | undefined): boolean => {
    if (!clinical) return false;
    const d = normalizeDiagnosisSearch(clinical.diagnosis || '');
    const cid = (clinical.cid || '').replace(/\s/g, '').toUpperCase();
    const dCompact = (clinical.diagnosis || '').replace(/\s/g, '').toUpperCase();
    if (d.includes('tea')) return true;
    if (d.includes('autismo') || d.includes('autista')) return true;
    if (cid.startsWith('F84')) return true;
    if (/\bF84[.\s]?[01]?\b/i.test(dCompact)) return true;
    return false;
};

const clinicalHasDiagnosisFilled = (clinical: Student['clinical'] | undefined): boolean => {
    if (!clinical) return false;
    return Boolean((clinical.diagnosis || '').trim() || (clinical.cid || '').trim());
};

const matchesDiagnosisFilter = (
    filter: DiagnosisFilterValue,
    clinical: Student['clinical'] | undefined,
    hasStudentId: boolean
): boolean => {
    if (!filter) return true;
    if (!hasStudentId) {
        return filter === 'none';
    }
    const filled = clinicalHasDiagnosisFilled(clinical);
    if (filter === 'none') {
        return !filled;
    }
    if (!filled) return false;
    const tea = clinicalLooksLikeTea(clinical);
    if (filter === 'tea') return tea;
    if (filter === 'other') return !tea;
    return true;
};

const maskCPF = (value: string | undefined | null): string => {
    if (!value) return '—';
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length !== 11) {
        return d.replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2');
    }
    return d
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2');
};

export interface RelatorioProfissionaisProps {
    professionals: SupportProfessional[];
    schools: School[];
    students: Student[];
    /** Mesmo parâmetro opcional de `SupabaseService.getPapelTimbradoConfig(unit)` (ex.: Cocal = id 2 na `letterhead_config`). */
    letterheadUnit?: Unit;
}

export const RelatorioProfissionais: React.FC<RelatorioProfissionaisProps> = ({
    professionals,
    schools,
    students,
    letterheadUnit,
}) => {
    const activeProfessionals = useMemo(
        () => professionals.filter(isSupportProfessionalActive),
        [professionals]
    );

    const [letterhead, setLetterhead] = useState<PapelTimbradoConfig | null>(null);
    const [loadingLetterhead, setLoadingLetterhead] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    const [filterSchoolId, setFilterSchoolId] = useState<string>('');
    const [filterEducation, setFilterEducation] = useState<string>('');
    const [filterWorkload, setFilterWorkload] = useState<string>('');
    const [nameSearch, setNameSearch] = useState('');
    const [filterDiagnosis, setFilterDiagnosis] = useState<DiagnosisFilterValue>('');
    const [studentsByIdForDiagnosis, setStudentsByIdForDiagnosis] = useState<Map<string, Student>>(new Map());
    const [loadingDiagnosisStudents, setLoadingDiagnosisStudents] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const cfg = await SupabaseService.getPapelTimbradoConfig(letterheadUnit);
                if (!cancelled) setLetterhead(cfg);
            } catch (e) {
                console.warn('[RelatorioProfissionais] Timbrado:', e);
            } finally {
                if (!cancelled) setLoadingLetterhead(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [letterheadUnit]);

    useEffect(() => {
        if (!filterDiagnosis) {
            setStudentsByIdForDiagnosis(new Map());
            setLoadingDiagnosisStudents(false);
            return;
        }
        let cancelled = false;
        setLoadingDiagnosisStudents(true);
        void (async () => {
            try {
                const list = await SupabaseService.getStudents(undefined);
                if (cancelled) return;
                const m = new Map<string, Student>();
                list.forEach((s) => m.set(s.id, s));
                setStudentsByIdForDiagnosis(m);
            } catch (e) {
                console.warn('[RelatorioProfissionais] Alunos (clinical_info) para filtro de diagnóstico:', e);
                if (!cancelled) setStudentsByIdForDiagnosis(new Map());
            } finally {
                if (!cancelled) setLoadingDiagnosisStudents(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [filterDiagnosis]);

    const schoolById = useMemo(() => {
        const m = new Map<string, School>();
        schools.forEach((s) => m.set(s.id, s));
        return m;
    }, [schools]);

    const studentById = useMemo(() => {
        const m = new Map<string, Student>();
        students.forEach((s) => m.set(s.id, s));
        return m;
    }, [students]);

    const getSchoolName = useCallback(
        (id: string) => schoolById.get(id)?.name || '—',
        [schoolById]
    );

    const getStudentName = useCallback(
        (id: string) => studentById.get(id)?.fullName || '—',
        [studentById]
    );

    const educationOptions = useMemo(() => {
        const set = new Set<string>();
        activeProfessionals.forEach((p) => {
            const e = (p.education || '').trim();
            if (e) set.add(e);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }, [activeProfessionals]);

    const workloadOptions = useMemo(() => {
        const set = new Set<string>();
        activeProfessionals.forEach((p) => {
            const w = (p.workload || '').trim();
            if (w) set.add(w);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }, [activeProfessionals]);

    const getClinicalForProfessional = useCallback(
        (studentId: string | undefined) => {
            if (!studentId?.trim()) return undefined;
            const fromFetch = studentsByIdForDiagnosis.get(studentId);
            if (fromFetch) return fromFetch.clinical;
            return studentById.get(studentId)?.clinical;
        },
        [studentsByIdForDiagnosis, studentById]
    );

    const filtered = useMemo(() => {
        const q = nameSearch.trim().toLowerCase();
        return activeProfessionals.filter((p) => {
            if (filterSchoolId && p.schoolId !== filterSchoolId) return false;
            if (filterEducation && (p.education || '').trim() !== filterEducation) return false;
            if (filterWorkload && (p.workload || '').trim() !== filterWorkload) return false;
            if (q && !(p.name || '').toLowerCase().includes(q)) return false;
            if (filterDiagnosis) {
                if (loadingDiagnosisStudents) return true;
                const sid = p.studentId;
                const clinical = getClinicalForProfessional(sid);
                if (!matchesDiagnosisFilter(filterDiagnosis, clinical, Boolean(sid?.trim()))) return false;
            }
            return true;
        });
    }, [
        activeProfessionals,
        filterSchoolId,
        filterEducation,
        filterWorkload,
        nameSearch,
        filterDiagnosis,
        loadingDiagnosisStudents,
        getClinicalForProfessional,
    ]);

    const clearFilters = () => {
        setFilterSchoolId('');
        setFilterEducation('');
        setFilterWorkload('');
        setNameSearch('');
        setFilterDiagnosis('');
    };

    const hasFilters = Boolean(
        filterSchoolId || filterEducation || filterWorkload || filterDiagnosis || nameSearch.trim()
    );

    const filterSummaryLines = useMemo(() => {
        const lines: string[] = [];
        const diagnosisLine =
            filterDiagnosis === 'tea'
                ? 'Diagnóstico: TEA / Autismo'
                : filterDiagnosis === 'other'
                  ? 'Diagnóstico: Outras condições'
                  : filterDiagnosis === 'none'
                    ? 'Diagnóstico: Sem diagnóstico informado'
                    : 'Diagnóstico: Todos';
        lines.push(
            `Escola: ${filterSchoolId ? getSchoolName(filterSchoolId) : 'Todas'} | Formação/função: ${filterEducation || 'Todas'} | Carga horária: ${filterWorkload || 'Todas'} | Nome: ${nameSearch.trim() || '(qualquer)'} | ${diagnosisLine}`
        );
        return lines;
    }, [filterSchoolId, filterEducation, filterWorkload, filterDiagnosis, nameSearch, getSchoolName]);

    const handleGeneratePdf = async () => {
        setGeneratingPdf(true);
        try {
            const config = letterhead ?? (await SupabaseService.getPapelTimbradoConfig(letterheadUnit));
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            let y = await drawLetterhead(doc, config);

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text('RELATÓRIO DE PROFISSIONAIS DE APOIO ESCOLAR', pageWidth / 2, y, { align: 'center' });
            y += 8;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(60, 60, 60);
            const summary = filterSummaryLines[0] || '';
            const sumParts = doc.splitTextToSize(`Filtros aplicados: ${summary}`, pageWidth - 30);
            doc.text(sumParts, 15, y);
            y += sumParts.length * 4 + 6;

            const tableRows = filtered.map((p) => [
                p.name || '—',
                maskCPF(p.cpf),
                getSchoolName(p.schoolId),
                getStudentName(p.studentId),
                (p.education || '—').trim() || '—',
                (p.workload || '—').trim() || '—',
            ]);

            autoTable(doc, {
                startY: y,
                head: [['Nome', 'CPF', 'Escola', 'Aluno assistido', 'Função (formação)', 'Carga horária']],
                body: tableRows.length ? tableRows : [['—', '—', '—', '—', '—', 'Nenhum registro']],
                theme: 'striped',
                headStyles: { fillColor: [0, 51, 102], fontSize: 9, halign: 'center' },
                styles: { fontSize: 8, cellPadding: 2.5 },
                margin: { left: 14, right: 14, bottom: 38 },
                columnStyles: {
                    0: { cellWidth: 32 },
                    1: { cellWidth: 28 },
                    2: { cellWidth: 38 },
                    3: { cellWidth: 38 },
                    4: { cellWidth: 28 },
                    5: { cellWidth: 22 },
                },
            });

            const totalPages = doc.getNumberOfPages();

            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                doc.setDrawColor(220);
                doc.line(15, pageHeight - 34, pageWidth - 15, pageHeight - 34);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(80);
                doc.text('Assinatura do coordenador: ________________________________', 15, pageHeight - 28);
                doc.setTextColor(100);
                doc.text(`Página ${p} de ${totalPages}`, pageWidth / 2, pageHeight - 22, { align: 'center' });
            }

            doc.setPage(totalPages);
            await drawFooter(doc, config);

            const d = new Date();
            const dateSlug = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            doc.save(`relatorio-profissionais-apoio-${dateSlug}.pdf`);
        } catch (e) {
            console.error('[RelatorioProfissionais] PDF:', e);
        } finally {
            setGeneratingPdf(false);
        }
    };

    const generatedAt = new Date().toLocaleString('pt-BR');

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-4 sm:px-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Relatório de profissionais de apoio</h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Lista filtrada conforme os critérios abaixo. O PDF usa o mesmo timbrado e jsPDF do restante do
                            sistema.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void handleGeneratePdf()}
                        disabled={generatingPdf}
                        className="inline-flex items-center justify-center gap-2 self-end sm:self-start px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 shadow-sm disabled:opacity-60"
                    >
                        {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                        Gerar PDF
                    </button>
                </div>

                <div className="px-4 py-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 bg-white">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Escola de lotação
                        </label>
                        <select
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                            value={filterSchoolId}
                            onChange={(e) => setFilterSchoolId(e.target.value)}
                        >
                            <option value="">Todas as escolas</option>
                            {schools
                                .filter((s) => s.isActive !== false)
                                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                                .map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Função / formação
                        </label>
                        <select
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                            value={filterEducation}
                            onChange={(e) => setFilterEducation(e.target.value)}
                        >
                            <option value="">Todas</option>
                            {educationOptions.map((e) => (
                                <option key={e} value={e}>
                                    {e}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Carga horária
                        </label>
                        <select
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                            value={filterWorkload}
                            onChange={(e) => setFilterWorkload(e.target.value)}
                        >
                            <option value="">Todas</option>
                            {workloadOptions.map((w) => (
                                <option key={w} value={w}>
                                    {w}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Busca por nome
                        </label>
                        <input
                            type="search"
                            value={nameSearch}
                            onChange={(e) => setNameSearch(e.target.value)}
                            placeholder="Nome do profissional…"
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Diagnóstico do aluno
                        </label>
                        <select
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                            value={filterDiagnosis}
                            onChange={(e) => setFilterDiagnosis(e.target.value as DiagnosisFilterValue)}
                            disabled={loadingDiagnosisStudents}
                        >
                            <option value="">Todos</option>
                            <option value="tea">TEA / Autismo</option>
                            <option value="other">Outras condições</option>
                            <option value="none">Sem diagnóstico informado</option>
                        </select>
                    </div>
                    <div className="md:col-span-2 lg:col-span-3 xl:col-span-5 flex flex-wrap items-end gap-3">
                        {hasFilters ? (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="text-sm font-medium text-slate-600 hover:text-primary-600 underline-offset-2 hover:underline"
                            >
                                Limpar filtros
                            </button>
                        ) : null}
                        <div className="text-sm text-slate-600 ml-auto">
                            <span className="font-semibold text-slate-800">{filtered.length}</span>{' '}
                            {filterDiagnosis && loadingDiagnosisStudents ? (
                                <span className="text-slate-500"> (carregando diagnósticos…)</span>
                            ) : null}
                            {filtered.length === 1 ? 'profissional encontrado' : 'profissionais encontrados'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                    <thead>
                        <tr className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold">Nome</th>
                            <th className="px-4 py-3 font-semibold">CPF</th>
                            <th className="px-4 py-3 font-semibold">Escola</th>
                            <th className="px-4 py-3 font-semibold">Aluno assistido</th>
                            <th className="px-4 py-3 font-semibold">Função</th>
                            <th className="px-4 py-3 font-semibold">Carga horária</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                                    Nenhum profissional corresponde aos filtros.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((p, idx) => (
                                <tr
                                    key={p.id}
                                    className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
                                >
                                    <td className="px-4 py-2.5 font-medium text-slate-900">{p.name}</td>
                                    <td className="px-4 py-2.5 font-mono text-slate-700">{maskCPF(p.cpf)}</td>
                                    <td className="px-4 py-2.5 text-slate-700">{getSchoolName(p.schoolId)}</td>
                                    <td className="px-4 py-2.5 text-slate-700">{getStudentName(p.studentId)}</td>
                                    <td className="px-4 py-2.5 text-slate-700">{(p.education || '—').trim() || '—'}</td>
                                    <td className="px-4 py-2.5 text-slate-700">{(p.workload || '—').trim() || '—'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <p className="text-center text-xs text-slate-500 pb-4">
                {generatedAt} — Sistema Brotar 2.0 — Gestão de Educação Inclusiva
            </p>
        </div>
    );
};

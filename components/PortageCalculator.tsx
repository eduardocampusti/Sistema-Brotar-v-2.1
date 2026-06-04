import React, { useState, useEffect } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { Save, Calculator, AlertTriangle, Info, CheckCircle, XCircle, MinusCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { calculatePortage, PORTAGE_CONSTANTS, AGE_RANGES } from '../utils/PortageLogic';
import { PORTAGE_ITEMS, getItemsByDomainAndRange, calculateScoreFromResponses, ItemResponse } from '../utils/PortageItems';
import { Student, PortageAssessment } from '../types';
import { useToast } from '../contexts/ToastContext';
import { SupabaseService } from '../services/SupabaseService';

interface PortageCalculatorProps {
    student: Student;
    onSave?: (assessment: PortageAssessment) => void;
    currentUser: { name: string };
}

type InputMode = 'DIRECT' | 'CHECKLIST';

const DOMAINS = [
    { key: 'socializacao', label: 'Socialização' },
    { key: 'linguagem',    label: 'Linguagem' },
    { key: 'cognicao',     label: 'Cognição' },
    { key: 'autocuidados', label: 'Autocuidados' },
    { key: 'motor',        label: 'Motor' }
] as const;

const DOMAIN_STYLES: Record<string, { text: string; bg: string; border: string }> = {
    socializacao: { text: '#185FA5', bg: '#E6F1FB', border: '#85B7EB' },
    linguagem:    { text: '#854F0B', bg: '#FAEEDA', border: '#EF9F27' },
    cognicao:     { text: '#3B6D11', bg: '#EAF3DE', border: '#97C459' },
    autocuidados: { text: '#3C3489', bg: '#EEEDFE', border: '#AFA9EC' },
    motor:        { text: '#A32D2D', bg: '#FCEBEB', border: '#F09595' },
};

export const PortageCalculator: React.FC<PortageCalculatorProps> = ({ student, onSave, currentUser }) => {
    const { addToast } = useToast();

    const [inputMode, setInputMode] = useState<InputMode>('DIRECT');
    const [checklistResponses, setChecklistResponses] = useState<Record<string, ItemResponse>>({});
    const [checklistDomain, setChecklistDomain] = useState<typeof DOMAINS[number]['key']>('socializacao');
    const [checklistRange, setChecklistRange] = useState<number>(0);
    const [expandedRanges, setExpandedRanges] = useState<Record<string, boolean>>({});
    const [scores, setScores] = useState<Record<string, number[]>>({
        socializacao: [0, 0, 0, 0, 0, 0],
        linguagem:    [0, 0, 0, 0, 0, 0],
        cognicao:     [0, 0, 0, 0, 0, 0],
        autocuidados: [0, 0, 0, 0, 0, 0],
        motor:        [0, 0, 0, 0, 0, 0]
    });
    const [studentAgeInfo, setStudentAgeInfo] = useState({ years: 0, months: 0 });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (student.birthDate) {
            const birth = new Date(student.birthDate);
            const now = new Date();
            let years = now.getFullYear() - birth.getFullYear();
            let months = now.getMonth() - birth.getMonth();
            if (months < 0) { years--; months += 12; }
            setStudentAgeInfo({ years, months });
        }
    }, [student]);

    useEffect(() => {
        if (inputMode !== 'CHECKLIST') return;
        const newScores = { ...scores };
        DOMAINS.forEach(d => {
            AGE_RANGES.forEach((_, rIndex) => {
                newScores[d.key][rIndex] = calculateScoreFromResponses(checklistResponses, d.key as any, rIndex);
            });
        });
        setScores({ ...newScores });
    }, [checklistResponses, inputMode]);

    const handleChecklistResponse = (itemId: string, resp: ItemResponse) => {
        setChecklistResponses(prev => ({ ...prev, [itemId]: prev[itemId] === resp ? null : resp }));
    };

    const handleScoreChange = (domainKey: string, rangeIndex: number, val: string) => {
        const num = parseFloat(val) || 0;
        if (num < 0) return;
        setScores(prev => ({ ...prev, [domainKey]: prev[domainKey].map((s, i) => i === rangeIndex ? num : s) }));
    };

    const handleSave = async () => {
        if (!result) return;
        setIsSaving(true);
        try {
            const assessment: PortageAssessment = {
                id: crypto.randomUUID(),
                studentId: student.id,
                date: new Date().toISOString(),
                professionalName: currentUser.name,
                studentAgeYears: studentAgeInfo.years,
                studentAgeMonths: studentAgeInfo.months,
                scores: scores as any,
                results: {
                    socializacao: result.domainResults.socializacao,
                    linguagem: result.domainResults.linguagem,
                    cognicao: result.domainResults.cognicao,
                    autocuidados: result.domainResults.autocuidados,
                    motor: result.domainResults.motor,
                    general: result.generalResult
                },
                createdAt: new Date().toISOString()
            };
            await SupabaseService.savePortageAssessment(student.id, assessment);
            if (onSave) onSave(assessment);
            addToast("Avaliação IPO salva com sucesso!", "success");
        } catch (err) {
            console.error(err);
            addToast("Erro ao salvar avaliação.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const radarData = DOMAINS.map(d => ({ subject: d.label, A: result?.domainResults[d.key] || 0, fullMark: 6 }));
    const barData = DOMAINS.map(d => ({
        name: d.label,
        'Idade Real': Math.min(studentAgeInfo.years + (studentAgeInfo.months / 12), 6),
        'Idade Desenv.': result?.domainResults[d.key] || 0
    }));

    const studentAgeInYears = studentAgeInfo.years + studentAgeInfo.months / 12;
    const currentRangeIndex = Math.min(Math.floor(studentAgeInYears), 5);
    const domainPct = result ? DOMAINS.map(d => Math.round((result.domainResults[d.key] / 6) * 100)) : [];
    const weakDomains = result ? DOMAINS.filter((d, i) => domainPct[i] < 80) : [];

    return (
        <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Calculator size={16} className="text-[#10B981]" /> Calculadora IPO — Portage
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-xl bg-[#E6F1FB] text-[#185FA5] border border-[#85B7EB] font-bold">
                            <Calculator size={11} /> {studentAgeInfo.years} anos e {studentAgeInfo.months} meses
                        </span>
                        <span className="text-xs text-slate-400">{student.fullName}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex border border-slate-200 rounded-xl overflow-hidden">
                        <button onClick={() => setInputMode('DIRECT')} className={`px-4 py-2 text-xs font-bold transition-all ${inputMode === 'DIRECT' ? 'bg-[#10B981] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Pontuação direta</button>
                        <button onClick={() => setInputMode('CHECKLIST')} className={`px-4 py-2 text-xs font-bold transition-all border-l border-slate-200 ${inputMode === 'CHECKLIST' ? 'bg-[#10B981] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Checklist</button>
                    </div>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-5 py-2 bg-[#10B981] hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm disabled:opacity-50">
                        <Save size={14} /> {isSaving ? 'Salvando...' : 'Salvar avaliação'}
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-[#E6F1FB] text-[#185FA5] border border-[#85B7EB] font-bold">
                <Info size={13} /> {inputMode === 'CHECKLIST' ? 'Marque cada item. "Com ajuda" vale 0,5 ponto. O score é calculado automaticamente.' : 'Faixa etária atual destacada. Preencha as faixas abaixo da idade cronológica.'}
            </div>

            {inputMode === 'CHECKLIST' && (
                <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                        {DOMAINS.map(d => {
                            const style = DOMAIN_STYLES[d.key];
                            const isActive = checklistDomain === d.key;
                            const total = PORTAGE_ITEMS.filter(i => i.domain === d.key).length;
                            const answered = PORTAGE_ITEMS.filter(i => i.domain === d.key && checklistResponses[i.id] != null).length;
                            return (
                                <button key={d.key} onClick={() => setChecklistDomain(d.key as any)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all"
                                    style={isActive ? { background: style.bg, borderColor: style.border, color: style.text } : { background: 'var(--color-background-secondary)', borderColor: 'var(--color-border-tertiary)', color: 'var(--color-text-secondary)' }}>
                                    {d.label}
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: isActive ? style.border : '#e2e8f0', color: isActive ? '#fff' : '#64748b' }}>{answered}/{total}</span>
                                </button>
                            );
                        })}
                    </div>
                    {AGE_RANGES.map((rangeLabel, rIndex) => {
                        const items = getItemsByDomainAndRange(checklistDomain as any, rIndex);
                        if (items.length === 0) return null;
                        const answered = items.filter(i => checklistResponses[i.id] != null).length;
                        const score = calculateScoreFromResponses(checklistResponses, checklistDomain as any, rIndex);
                        const key = `${checklistDomain}_${rIndex}`;
                        const isExpanded = expandedRanges[key] !== false;
                        const isCurrent = rIndex === currentRangeIndex;
                        const style = DOMAIN_STYLES[checklistDomain];
                        return (
                            <div key={rIndex} className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: isCurrent ? style.border : 'var(--color-border-tertiary)' }}>
                                <button onClick={() => setExpandedRanges(prev => ({ ...prev, [key]: !isExpanded }))}
                                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                                    style={{ background: isCurrent ? `${style.bg}80` : 'var(--color-background-secondary)' }}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold" style={{ color: isCurrent ? style.text : 'var(--color-text-primary)' }}>
                                            {isCurrent && '↳ '}{rangeLabel}{isCurrent && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#8B1A3A', color: '#fff' }}>atual</span>}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: style.bg, color: style.text, border: `0.5px solid ${style.border}` }}>{answered}/{items.length} · {score} pts</span>
                                    </div>
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                {isExpanded && (
                                    <div className="p-3 space-y-1.5">
                                        <div className="flex items-center gap-4 text-[10px] text-slate-400 px-2 mb-2">
                                            <span className="flex items-center gap-1"><CheckCircle size={11} className="text-[#3B6D11]" /> Sim = 1</span>
                                            <span className="flex items-center gap-1"><MinusCircle size={11} className="text-[#854F0B]" /> Com ajuda = 0,5</span>
                                            <span className="flex items-center gap-1"><XCircle size={11} className="text-[#A32D2D]" /> Não = 0</span>
                                        </div>
                                        {items.map(item => {
                                            const resp = checklistResponses[item.id];
                                            return (
                                                <div key={item.id} className="flex items-center gap-3 px-2 py-2 rounded-lg transition-colors"
                                                    style={{ background: resp != null ? `${style.bg}50` : 'transparent' }}>
                                                    <span className="flex-1 text-xs" style={{ color: 'var(--color-text-primary)' }}>{item.text}</span>
                                                    <div className="flex gap-1 shrink-0">
                                                        {(['sim', 'ajuda', 'nao'] as ItemResponse[]).map(r => (
                                                            <button key={r} onClick={() => handleChecklistResponse(item.id, r)}
                                                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all"
                                                                style={resp === r
                                                                    ? r === 'sim' ? { background: '#EAF3DE', color: '#3B6D11', borderColor: '#97C459' }
                                                                    : r === 'ajuda' ? { background: '#FAEEDA', color: '#854F0B', borderColor: '#EF9F27' }
                                                                    : { background: '#FCEBEB', color: '#A32D2D', borderColor: '#F09595' }
                                                                    : { background: 'white', color: '#94a3b8', borderColor: '#e2e8f0' }}>
                                                                {r === 'sim' ? 'Sim' : r === 'ajuda' ? 'C/ajuda' : 'Não'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {inputMode === 'DIRECT' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-[500px] w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-50">Faixa etária</th>
                                {DOMAINS.map(d => (
                                    <th key={d.key} className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: DOMAIN_STYLES[d.key].text }}>{d.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {AGE_RANGES.map((rangeLabel, rIndex) => {
                                const isCurrentRange = rIndex === currentRangeIndex;
                                return (
                                    <tr key={rIndex} className={`border-b border-slate-100 transition-colors ${isCurrentRange ? 'bg-[#fdf8f9]' : 'hover:bg-slate-50/50'}`}>
                                        <td className={`px-4 py-2.5 sticky left-0 font-bold text-xs ${isCurrentRange ? 'text-[#8B1A3A] bg-[#fdf8f9]' : 'text-slate-600 bg-white'}`}>
                                            {isCurrentRange && <span className="mr-1">↳</span>}{rangeLabel}
                                            {isCurrentRange && <span className="ml-1.5 text-[9px] bg-[#8B1A3A] text-white px-1.5 py-0.5 rounded">atual</span>}
                                        </td>
                                        {DOMAINS.map((domain) => {
                                            const max = PORTAGE_CONSTANTS[domain.key as keyof typeof PORTAGE_CONSTANTS][rIndex];
                                            const currentVal = scores[domain.key][rIndex];
                                            const isFilled = currentVal > 0;
                                            const isError = currentVal > max;
                                            const style = DOMAIN_STYLES[domain.key];
                                            return (
                                                <td key={domain.key} className="px-2 py-2">
                                                    <div className="relative">
                                                        <input
                                                            type="number" min="0" max={max} step="0.5"
                                                            value={currentVal === 0 ? '' : currentVal}
                                                            onChange={(e) => handleScoreChange(domain.key, rIndex, e.target.value)}
                                                            placeholder={`máx ${max}`}
                                                            className="w-full text-center py-2 rounded-lg border outline-none text-xs font-bold transition-all focus:ring-1 focus:ring-[#10B981]/30"
                                                            style={isError ? { background: '#FCEBEB', borderColor: '#F09595', color: '#A32D2D' } : isFilled ? { background: style.bg, borderColor: style.border, color: style.text } : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' }}
                                                        />
                                                        {isError && <div className="absolute -top-2 right-0 bg-[#A32D2D] text-white text-[8px] px-1 rounded">máx {max}</div>}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                            <tr className="bg-slate-50 border-t border-slate-200">
                                <td className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-50">Idade desenv.</td>
                                {DOMAINS.map(d => {
                                    const val = result?.domainResults[d.key] || 0;
                                    const style = DOMAIN_STYLES[d.key];
                                    const y = Math.floor(val); const m = Math.round((val - y) * 12);
                                    return <td key={d.key} className="px-2 py-3 text-center"><span className="text-xs font-bold" style={{ color: style.text }}>{y}a {m}m</span></td>;
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {result && (
                <>
                    <div className="grid grid-cols-5 gap-2">
                        {DOMAINS.map((d, i) => {
                            const val = result.domainResults[d.key];
                            const y = Math.floor(val); const m = Math.round((val - y) * 12);
                            const pct = domainPct[i];
                            const style = DOMAIN_STYLES[d.key];
                            return (
                                <div key={d.key} className="rounded-xl p-3 text-center border" style={{ background: style.bg, borderColor: style.border }}>
                                    <div className="text-sm font-bold" style={{ color: style.text }}>{y}a {m}m</div>
                                    <div className="text-[9px] text-slate-500 uppercase tracking-wide mt-0.5">{d.label}</div>
                                    <div className="text-[10px] font-bold mt-1" style={{ color: style.text }}>{pct}%</div>
                                    <div className="h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.6)' }}>
                                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: style.border }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {weakDomains.length > 0 && (
                        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-[#FAEEDA] text-[#854F0B] border border-[#EF9F27] font-bold">
                            <AlertTriangle size={13} />
                            Domínio{weakDomains.length > 1 ? 's' : ''} com menor desempenho: {weakDomains.map(d => d.label).join(', ')}. Considere encaminhamento especializado.
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Perfil de desenvolvimento</div>
                            <div className="h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 6]} tick={{ fontSize: 8 }} />
                                        <Radar name="Aluno" dataKey="A" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Real vs desenvolvimento</div>
                            <div className="h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" domain={[0, 6]} tick={{ fontSize: 9 }} />
                                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9 }} />
                                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                                        <Bar dataKey="Idade Real" fill="#cbd5e1" barSize={10} radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="Idade Desenv." fill="#10B981" barSize={10} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ background: 'linear-gradient(135deg,#0A4A2E,#0F6E56)' }}>
                        <div>
                            <div className="text-xs font-bold text-emerald-200 uppercase tracking-widest mb-1">Índice geral de desenvolvimento</div>
                            <div className="text-2xl font-bold text-white">{result.formattedResults.Geral}</div>
                            <div className="text-xs text-emerald-300 mt-1">Média ponderada dos 5 domínios — guia pedagógico, não diagnóstico clínico</div>
                        </div>
                        <div className="text-center bg-white/10 px-6 py-3 rounded-xl min-w-[120px]">
                            <div className="text-3xl font-bold text-white">{Math.round((result.generalResult / 6) * 100)}%</div>
                            <div className="text-xs text-emerald-200 mt-1">aproveitamento</div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

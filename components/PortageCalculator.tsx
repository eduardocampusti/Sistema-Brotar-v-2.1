import React, { useState, useEffect } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';
import { Save, Calculator, AlertTriangle, FileText, CheckCircle, Info } from 'lucide-react';
import { calculatePortage, PORTAGE_CONSTANTS, AGE_RANGES } from '../utils/PortageLogic';
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
    { key: 'socializacao', label: 'Socialização', color: '#db2777' }, // Pink-600 (Warm/Hot)
    { key: 'linguagem', label: 'Linguagem', color: '#16a34a' },     // Green-600 (Vibrant)
    { key: 'cognicao', label: 'Cognição', color: '#d97706' },       // Amber-600 (Warm)
    { key: 'autocuidados', label: 'Autocuidados', color: '#ea580c' }, // Orange-600 (Warmer)
    { key: 'motor', label: 'Motor', color: '#2563eb' }              // Blue-600 (Strong)
] as const;

export const PortageCalculator: React.FC<PortageCalculatorProps> = ({ student, onSave, currentUser }) => {
    const { addToast } = useToast();

    // State
    const [inputMode, setInputMode] = useState<InputMode>('DIRECT');
    const [scores, setScores] = useState<Record<string, number[]>>({
        socializacao: [0, 0, 0, 0, 0, 0],
        linguagem: [0, 0, 0, 0, 0, 0],
        cognicao: [0, 0, 0, 0, 0, 0],
        autocuidados: [0, 0, 0, 0, 0, 0],
        motor: [0, 0, 0, 0, 0, 0]
    });

    const [studentAgeInfo, setStudentAgeInfo] = useState({ years: 0, months: 0 });
    const [isSaving, setIsSaving] = useState(false);

    // Initialize Age
    useEffect(() => {
        if (student.birthDate) {
            const birth = new Date(student.birthDate);
            const now = new Date();
            let years = now.getFullYear() - birth.getFullYear();
            let months = now.getMonth() - birth.getMonth();
            if (months < 0) {
                years--;
                months += 12;
            }
            setStudentAgeInfo({ years, months });
        }
    }, [student]);

    // Real-time Calculation (Synchronous & Safe via useMemo)
    const result = React.useMemo(() => {
        return calculatePortage(scores as any);
    }, [scores]);

    const handleScoreChange = (domainKey: string, rangeIndex: number, val: string) => {
        const num = parseFloat(val) || 0;
        const max = PORTAGE_CONSTANTS[domainKey as keyof typeof PORTAGE_CONSTANTS][rangeIndex];

        if (num < 0) return; // Prevent negative
        // Note: We don't strictly block > max here to allow "typing", but validation will warn

        setScores(prev => ({
            ...prev,
            [domainKey]: prev[domainKey].map((s, i) => i === rangeIndex ? num : s)
        }));
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
            console.log('Saving Portage:', assessment);

            if (onSave) onSave(assessment);
            addToast("Avaliação IPO salva com sucesso!", "success");
        } catch (err) {
            console.error(err);
            addToast("Erro ao salvar avaliação.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Chart Data Preparation
    const radarData = DOMAINS.map(d => ({
        subject: d.label,
        A: result?.domainResults[d.key] || 0,
        fullMark: 6
    }));

    const barData = DOMAINS.map(d => ({
        name: d.label,
        'Idade Real': Math.min(studentAgeInfo.years + (studentAgeInfo.months / 12), 6), // Cap visual for comparison
        'Idade Desenv.': result?.domainResults[d.key] || 0
    }));

    return (
        <div className="space-y-8 animate-fadeIn">

            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Calculator className="text-pink-600" /> Calculadora IPO - Portage
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Idade Cronológica: <strong>{studentAgeInfo.years} anos e {studentAgeInfo.months} meses</strong>
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setInputMode('DIRECT')}
                        className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${inputMode === 'DIRECT' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500'}`}
                    >
                        Pontuação Direta
                    </button>
                    <button
                        onClick={() => setInputMode('CHECKLIST')} // Placeholder for future feature
                        disabled // Disabling for now as strictly requested "Direct" is main flow, but keeping structure
                        className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-not-allowed opacity-50 ${inputMode === 'CHECKLIST' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-400'}`}
                        title="Em breve: Checklist detalhado"
                    >
                        Checklist (Em breve)
                    </button>
                </div>
            </div>

            {/* Main Grid Input */}
            <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto w-full">
                    <table className="min-w-[500px] w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 sticky left-0 bg-slate-50 z-10">Faixa Etária</th>
                                {DOMAINS.map(d => (
                                    <th key={d.key} className="px-4 py-4 text-center min-w-[120px]" style={{ color: d.color }}>
                                        {d.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {AGE_RANGES.map((rangeLabel, rIndex) => (
                                <tr key={rIndex} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-3 font-bold text-slate-700 sticky left-0 bg-white z-10">
                                        {rangeLabel}
                                    </td>
                                    {DOMAINS.map((domain) => {
                                        const max = PORTAGE_CONSTANTS[domain.key as keyof typeof PORTAGE_CONSTANTS][rIndex];
                                        const currentVal = scores[domain.key][rIndex];
                                        const isError = currentVal > max;

                                        return (
                                            <td key={domain.key} className="px-4 py-2">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={max}
                                                        step="0.5"
                                                        value={currentVal === 0 ? '' : currentVal}
                                                        onChange={(e) => handleScoreChange(domain.key, rIndex, e.target.value)}
                                                        placeholder={`máx ${max}`}
                                                        className={`w-full text-center py-2 rounded-lg border-2 focus:ring-2 outline-none font-black transition-all
                                 ${isError
                                                                ? 'border-red-400 text-red-700 bg-red-100 focus:ring-red-300'
                                                                : 'bg-slate-200 border-slate-400 text-slate-900 focus:border-pink-500 focus:ring-pink-200 focus:bg-white'
                                                            }`}
                                                    />
                                                    {isError && (
                                                        <div className="absolute -top-3 right-0 bg-red-500 text-white text-[9px] px-1 rounded">
                                                            Máx: {max}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            {/* Results Row */}
                            <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-200">
                                <td className="px-6 py-4 text-right uppercase text-xs tracking-wider">Idade de Desenv.</td>
                                {DOMAINS.map(d => (
                                    <td key={d.key} className="px-4 py-4 text-center text-lg">
                                        {result?.domainResults[d.key]} <span className="text-[10px] text-slate-400 font-normal">anos</span>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Results & Charts Section */}
            {result && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Chart 1: Radar */}
                    <div className="bg-slate-300 p-4 sm:p-6 rounded-2xl shadow-md border border-slate-400">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Perfil de Desenvolvimento</h3>
                        <div className="h-[250px] sm:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 6]} />
                                <Radar name="Aluno" dataKey="A" stroke="#be185d" fill="#be185d" fillOpacity={0.6} />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 2: Comparative Bar */}
                    <div className="bg-slate-300 p-6 rounded-2xl shadow-md border border-slate-400 h-[500px]">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Real vs Desenvolvimento</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" domain={[0, 6]} hide />
                                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Legend iconType="circle" />
                                <Bar dataKey="Idade Real" fill="#cbd5e1" barSize={12} radius={[0, 4, 4, 0]} />
                                <Bar dataKey="Idade Desenv." fill="#db2777" barSize={12} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Summary Card */}
                    <div className="lg:col-span-2 bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row justify-between items-center gap-8">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Índice Geral de Desenvolvimento</h2>
                            <p className="text-slate-400 max-w-lg text-sm">
                                Média ponderada baseada nos 5 domínios avaliados. Este índice é um guia pedagógico e não representa diagnóstico clínico fechado.
                            </p>
                        </div>
                        <div className="text-center bg-white/10 p-6 rounded-2xl backdrop-blur-sm min-w-[200px]">
                            <span className="block text-4xl font-extrabold text-primary-400">{result.generalResult}</span>
                            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Anos (Média)</span>
                            <div className="mt-2 text-sm font-medium text-white">{result.formattedResults.Geral}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg hover:shadow-primary-600/30 active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? 'Salvando...' : <><Save size={18} /> Salvar Avaliação</>}
                </button>
            </div>

        </div>
    );
};


import React, { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertTriangle, ArrowRight, Table, Database, Search, PlusCircle, Save, X } from 'lucide-react';
import Papa from 'papaparse';
import { SupabaseService } from '../services/SupabaseService';
import { User, School, Specialty, Student } from '../types';
import { sanitizeNumericString, parseBrazilianDate, normalizeNameJS } from '../utils/csvNormalization';

interface CSVImporterProps {
    type: 'students' | 'support_professionals';
    onComplete?: () => void;
    currentUser: Pick<User, 'name' | 'email' | 'role'>;
}

type Step = 'upload' | 'mapping' | 'validation' | 'importing' | 'result';

export const CSVImporter: React.FC<CSVImporterProps> = ({ type, onComplete, currentUser }) => {
    const [step, setStep] = useState<Step>('upload');
    const [csvData, setCsvData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [validationData, setValidationData] = useState<any[]>([]);
    const [lookups, setLookups] = useState<Record<string, any>>({ schools: {}, students: {} });
    const [isProcessing, setIsProcessing] = useState(false);
    const [importResults, setImportResults] = useState<{ success: number; errors: any[] } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Campos disponíveis por tabela
    const fields = type === 'students'
        ? [
            { key: 'fullName', label: 'Nome Completo', required: true },
            { key: 'birthDate', label: 'Data de Nascimento', required: true },
            { key: 'cpf', label: 'CPF', required: false },
            { key: 'susCard', label: 'Cartão SUS', required: false },
            { key: 'schoolName', label: 'Nome da Escola', required: false },
            { key: 'grade', label: 'Série/Ano', required: false },
            { key: 'shift', label: 'Turno', required: false },
            { key: 'motherName', label: 'Nome da Mãe', required: false },
        ]
        : [
            { key: 'name', label: 'Nome Completo', required: true },
            { key: 'cpf', label: 'CPF', required: true },
            { key: 'phone', label: 'Telefone', required: false },
            { key: 'email', label: 'E-mail', required: false },
            { key: 'schoolName', label: 'Nome da Escola', required: false },
            { key: 'studentName', label: 'Nome do Aluno Vinculado', required: false },
            { key: 'regentTeacher', label: 'Professor Regente', required: false },
            { key: 'workload', label: 'Carga Horária', required: false },
        ];

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setCsvData(results.data);
                setHeaders(results.meta.fields || []);

                // Auto-mapping simples
                const autoMap: Record<string, string> = {};
                const csvHeaders = results.meta.fields || [];

                fields.forEach(field => {
                    const match = csvHeaders.find(h =>
                        h.toLowerCase().includes(field.label.toLowerCase()) ||
                        h.toLowerCase().includes(field.key.toLowerCase()) ||
                        (field.key === 'fullName' && h.toLowerCase().includes('nome'))
                    );
                    if (match) autoMap[match] = field.key;
                });

                setMapping(autoMap);
                setStep('mapping');
            }
        });
    };

    const startValidation = async () => {
        setIsProcessing(true);
        try {
            // 1. Extrair nomes de escolas e alunos para lookup
            const schoolNames = [...new Set(csvData.map(row => {
                const header = Object.keys(mapping).find(h => mapping[h] === 'schoolName');
                return header ? row[header] : null;
            }).filter(Boolean))];

            const studentNames = type === 'support_professionals' ? [...new Set(csvData.map(row => {
                const header = Object.keys(mapping).find(h => mapping[h] === 'studentName');
                return header ? row[header] : null;
            }).filter(Boolean))] : [];

            // 2. Buscar no banco
            const schoolLookups = await SupabaseService.lookupSchoolsByNames(schoolNames);
            const studentLookups = type === 'support_professionals'
                ? await SupabaseService.lookupStudentsByNamesOrCPF(studentNames.map(n => ({ name: n })))
                : {};

            setLookups({ schools: schoolLookups, students: studentLookups });

            // 3. Preparar dados validados
            const validated = csvData.map(row => {
                const item: any = {};
                Object.entries(mapping).forEach(([csvHeader, dbField]) => {
                    let val = row[csvHeader];

                    // Tratamentos de dados solicitados
                    if (dbField === 'fullName' || dbField === 'name' || dbField === 'regentTeacher') {
                        val = normalizeNameJS(val);
                    } else if (dbField === 'birthDate') {
                        val = parseBrazilianDate(val);
                    } else if (dbField === 'cpf' || dbField === 'susCard') {
                        val = sanitizeNumericString(val);
                    }

                    item[dbField] = val;
                });

                // Resolver IDs
                if (item.schoolName) item.schoolId = schoolLookups[item.schoolName] || null;
                if (item.studentName) item.studentId = studentLookups[item.studentName] || null;

                return item;
            });

            setValidationData(validated);
            setStep('validation');
        } catch (error) {
            console.error('Erro na validação:', error);
            alert('Erro ao validar dados. Verifique o console.');
        } finally {
            setIsProcessing(false);
        }
    };

    const executeImport = async () => {
        setIsProcessing(true);
        try {
            let result;
            if (type === 'students') {
                result = await SupabaseService.importStudentsInBulk(validationData, currentUser);
            } else {
                result = await SupabaseService.importProfessionalsInBulk(validationData, currentUser);
            }
            setImportResults(result);
            setStep('result');
        } catch (error) {
            console.error('Erro na importação:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-5xl mx-auto border border-slate-100 min-h-[500px] flex flex-col">
            {/* Header com Progresso */}
            <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">
                        Importação Inteligente de {type === 'students' ? 'Alunos' : 'Profissionais'}
                    </h2>
                    <p className="text-slate-500">Fluxo otimizado com lookup automático de relacionamentos</p>
                </div>
                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4].map((s) => (
                        <div
                            key={s}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                 ${(s === 1 && step === 'upload') || (s === 2 && step === 'mapping') || (s === 3 && step === 'validation') || (s === 4 && (step === 'importing' || step === 'result'))
                                    ? 'bg-teal-600 text-white scale-110 shadow-md'
                                    : 'bg-slate-100 text-slate-400'}`}
                        >
                            {s}
                        </div>
                    ))}
                </div>
            </div>

            {/* Conteúdo dos Passos */}
            <div className="flex-grow flex flex-col justify-center">

                {/* PASSO 1: UPLOAD */}
                {step === 'upload' && (
                    <div className="text-center py-12">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-200 rounded-2xl p-12 cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-all group"
                        >
                            <div className="bg-teal-100 text-teal-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                <Upload size={32} />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">Selecione seu arquivo CSV</h3>
                            <p className="text-slate-500 max-w-xs mx-auto mb-6">Arraste e solte ou clique para buscar o arquivo do Censo ou Planilha de Profissionais</p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".csv"
                                className="hidden"
                            />
                            <button className="bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 shadow-sm transition-colors">
                                Escolher Arquivo
                            </button>
                        </div>
                        <div className="mt-8 grid grid-cols-3 gap-4 text-left">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <FileText className="text-teal-600 mb-2" size={20} />
                                <h4 className="font-semibold text-slate-700 text-sm">UTF-8 Preferencial</h4>
                                <p className="text-xs text-slate-500">Garanta que o arquivo esteja codificado em UTF-8 para evitar erros em acentos.</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <Table className="text-teal-600 mb-2" size={20} />
                                <h4 className="font-semibold text-slate-700 text-sm">Cabeçalhos na 1ª Linha</h4>
                                <p className="text-xs text-slate-500">O sistema utiliza a primeira linha para identificar as colunas.</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <Check className="text-teal-600 mb-2" size={20} />
                                <h4 className="font-semibold text-slate-700 text-sm">Datas DD/MM/AAAA</h4>
                                <p className="text-xs text-slate-500">O importador converte datas brasileiras automaticamente.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* PASSO 2: MAPEAMENTO */}
                {step === 'mapping' && (
                    <div className="animate-in fade-in duration-500">
                        <div className="flex items-center gap-3 mb-6 bg-amber-50 p-4 rounded-lg border border-amber-100">
                            <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                            <p className="text-sm text-amber-800">
                                Correlacione as colunas da sua planilha (esquerda) com os campos do Sistema Brotar (direita).
                                Tentamos mapear automaticamente os campos mais óbvios.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 bg-slate-50/50 p-8 rounded-2xl border border-slate-100">
                            {fields.map(field => (
                                <div key={field.key} className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-slate-600 flex items-center justify-between">
                                        <span>{field.label} {field.required && <span className="text-red-500">*</span>}</span>
                                        <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded uppercase tracking-wider text-slate-500">Campo do Sistema</span>
                                    </label>
                                    <select
                                        value={Object.keys(mapping).find(h => mapping[h] === field.key) || ''}
                                        onChange={(e) => {
                                            const newMapping = { ...mapping };
                                            // Limpa mapeamentos antigos desse campo
                                            Object.keys(newMapping).forEach(h => { if (newMapping[h] === field.key) delete newMapping[h]; });
                                            if (e.target.value) newMapping[e.target.value] = field.key;
                                            setMapping(newMapping);
                                        }}
                                        className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-sm"
                                    >
                                        <option value="">-- Ignorar este campo --</option>
                                        {headers.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 flex justify-end gap-3">
                            <button
                                onClick={() => setStep('upload')}
                                className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={startValidation}
                                disabled={isProcessing}
                                className="bg-teal-600 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-teal-700 shadow-md flex items-center gap-2 group transition-all"
                            >
                                {isProcessing ? 'Processando...' : (
                                    <>
                                        Próximo Passo <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* PASSO 3: VALIDAÇÃO / LOOKUP */}
                {step === 'validation' && (
                    <div className="animate-in slide-in-from-right duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Search size={20} className="text-teal-600" />
                                Conferência e Lookups de Relacionamento
                            </h3>
                            <span className="text-sm bg-teal-100 text-teal-700 px-3 py-1 rounded-full font-medium">
                                {validationData.length} registros prontos
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {/* Card de Escolas */}
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2 mb-4 text-slate-700 font-semibold">
                                    <Database size={18} className="text-teal-500" />
                                    Vínculos de Escolas
                                </div>
                                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    {Object.entries(lookups.schools).length === 0 ? (
                                        <p className="text-sm text-slate-400 italic">Nenhuma escola mapeada ou encontrada.</p>
                                    ) : (
                                        Object.entries(lookups.schools).map(([name, id]) => (
                                            <div key={name} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                                                <span className="text-sm text-slate-600 truncate mr-2" title={name}>{name}</span>
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-600 shrink-0">
                                                    <Check size={14} /> VINCULADO
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {/* TODO: Mostrar escolas NÃO encontradas com opção de criar */}
                                </div>
                            </div>

                            {/* Card de Alunos (para ATs) */}
                            {type === 'support_professionals' && (
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-2 mb-4 text-slate-700 font-semibold">
                                        <Database size={18} className="text-teal-500" />
                                        Vínculos de Alunos
                                    </div>
                                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {Object.entries(lookups.students).length === 0 ? (
                                            <p className="text-sm text-slate-400 italic">Nenhum aluno identificado para vínculo.</p>
                                        ) : (
                                            Object.entries(lookups.students).map(([name, id]) => (
                                                <div key={name} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                                                    <span className="text-sm text-slate-600 truncate mr-2">{name}</span>
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-teal-600 shrink-0">
                                                        <Check size={14} /> VINCULADO
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 flex items-start gap-4">
                            <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-amber-900 mb-1">Deseja prosseguir com a importação em lote?</h4>
                                <p className="text-sm text-amber-800 leading-relaxed">
                                    O sistema irá realizar o <span className="font-bold">UPSERT</span> dos dados. Registros com CPFs já existentes
                                    serão atualizados. Todos os nomes serão normalizados e as datas convertidas.
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button
                                onClick={() => setStep('mapping')}
                                className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Ajustar Mapeamento
                            </button>
                            <button
                                onClick={executeImport}
                                disabled={isProcessing}
                                className="bg-teal-600 text-white px-10 py-3 rounded-lg font-bold hover:bg-teal-700 shadow-lg flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95"
                            >
                                {isProcessing ? 'Importando...' : (
                                    <>
                                        <Save size={20} /> Iniciar Importação Agora
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* PASSO 4: RESULTADO */}
                {step === 'result' && importResults && (
                    <div className="text-center py-8 animate-in zoom-in duration-300">
                        <div className="bg-teal-100 text-teal-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Check size={48} />
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 mb-2">Sucesso na Importação!</h3>
                        <p className="text-slate-500 mb-8">O processamento em lote foi concluído e registrado nos logs do sistema.</p>

                        <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto mb-10">
                            <div className="bg-teal-50 p-6 rounded-2xl border border-teal-100">
                                <div className="text-4xl font-black text-teal-600 mb-1">{importResults.success}</div>
                                <div className="text-sm font-bold text-teal-700/70 uppercase tracking-widest">Processados</div>
                            </div>
                            <div className={`p-6 rounded-2xl border ${importResults.errors.length > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                <div className={`text-4xl font-black ${importResults.errors.length > 0 ? 'text-red-600' : 'text-slate-400'} mb-1`}>
                                    {importResults.errors.length}
                                </div>
                                <div className={`text-sm font-bold uppercase tracking-widest ${importResults.errors.length > 0 ? 'text-red-700/70' : 'text-slate-400'}`}>Falhas</div>
                            </div>
                        </div>

                        {importResults.errors.length > 0 && (
                            <div className="max-w-lg mx-auto bg-red-50 p-4 rounded-lg mb-8 text-left border border-red-100 overflow-y-auto max-h-[150px]">
                                <p className="text-sm font-bold text-red-800 mb-2">Erros técnicos detectados:</p>
                                <ul className="text-xs text-red-700 space-y-1">
                                    {importResults.errors.map((err, idx) => (
                                        <li key={idx}>• Chunk {err.chunk}: {err.message}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => {
                                    setStep('upload');
                                    setCsvData([]);
                                    setMapping({});
                                }}
                                className="px-8 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                            >
                                Nova Importação
                            </button>
                            <button
                                onClick={onComplete}
                                className="bg-slate-800 text-white px-10 py-3 rounded-xl font-bold hover:bg-slate-900 shadow-xl transition-all"
                            >
                                Concluir e Voltar
                            </button>
                        </div>
                    </div>
                )}

            </div>

            {/* Footer / Info */}
            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400 font-medium uppercase tracking-widest">
                <div className="flex items-center gap-4">
                    <span>Sistema Brotar v2.1</span>
                    <span>•</span>
                    <span>Importador Inteligente</span>
                </div>
                <div className="flex items-center gap-1.5 opacity-60">
                    <Database size={10} />
                    Supabase Service Batch Powered
                </div>
            </div>
        </div>
    );
};

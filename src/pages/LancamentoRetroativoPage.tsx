import React, { useState, useEffect, useMemo } from 'react';
import { 
    ArrowLeft, 
    Search, 
    User as UserIcon, 
    Clock, 
    FileText, 
    AlertCircle, 
    Loader2,
    Calendar,
    CheckCircle
} from 'lucide-react';
import { SupabaseService } from '../../services/SupabaseService';
import { useToast } from '../../contexts/ToastContext';
import { User, Appointment, Specialty } from '../../types';

interface LancamentoRetroativoPageProps {
    currentUser: User;
    onNavigate: (path: string) => void;
}

interface StudentSummary {
    studentId: string;
    studentName: string;
    schoolName?: string;
    diagnosis?: string;
    lastSessionDate?: string | null;
}

export const LancamentoRetroativoPage: React.FC<LancamentoRetroativoPageProps> = ({
    currentUser,
    onNavigate,
}) => {
    const { success } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'todos' | 'sem' | 'com'>('todos');
    const [studentsList, setStudentsList] = useState<StudentSummary[]>([]);
    
    // Estados do Formulário e Seleção
    const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [tipoAtendimento, setTipoAtendimento] = useState<'INDIVIDUAL' | 'GRUPO'>('INDIVIDUAL');
    const [unit, setUnit] = useState<'' | 'SEDE' | 'COCAL'>('');
    const [evolucao, setEvolucao] = useState('');
    const [observacoes, setObservacoes] = useState('');

    // Gera a data atual no formato YYYY-MM-DD para bloquear datas futuras na UI
    const todayStr = useMemo(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }, []);

    // Carrega alunos que possuem histórico de agendamento com este profissional
    useEffect(() => {
        let isMounted = true;
        
        async function fetchStudents() {
            setLoading(true);
            try {
                const appointments = await SupabaseService.getAppointments({ 
                    professionalId: currentUser.id 
                });
                
                const allStudents = await SupabaseService.getStudentsForUser(currentUser);

                if (!isMounted) return;

                // Extrai lista única de alunos (deduplicada por studentId)
                const uniqueIds = Array.from(new Set(appointments.map(appt => appt.studentId).filter(Boolean)));
                
                // Busca as sessões para esses alunos
                const sessionsPromises = uniqueIds.map(async id => {
                    try {
                        return await SupabaseService.getStudentSessions(id as string);
                    } catch (e) {
                        return [];
                    }
                });
                const sessionsResults = await Promise.all(sessionsPromises);
                
                const lastSessionMap = new Map<string, string>();
                uniqueIds.forEach((id, index) => {
                    const sessions = sessionsResults[index];
                    if (sessions && sessions.length > 0) {
                        const sorted = sessions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        lastSessionMap.set(id as string, sorted[0].date);
                    }
                });

                const formattedList: StudentSummary[] = uniqueIds.map((id) => {
                    const student = allStudents.find(s => s.id === id);
                    const appt = appointments.find(a => a.studentId === id);
                    
                    return {
                        studentId: id as string,
                        studentName: student?.fullName || appt?.studentName || 'Não identificado',
                        schoolName: student?.school?.schoolName,
                        diagnosis: student?.clinical?.diagnosis,
                        lastSessionDate: lastSessionMap.get(id as string) || null
                    };
                }).sort((a, b) => a.studentName.localeCompare(b.studentName));

                setStudentsList(formattedList);
            } catch (err: any) {
                console.error('Erro ao carregar alunos:', err);
                setErrorMsg('Falha ao carregar a lista de alunos vinculados.');
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchStudents();
        return () => {
            isMounted = false;
        };
    }, [currentUser.id]);

    // Filtra alunos pela busca de texto
    const filteredStudents = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return studentsList.filter((student) => {
            const matchSearch = !query || student.studentName.toLowerCase().includes(query);
            const matchFilter =
                filterStatus === 'todos' ? true :
                filterStatus === 'sem' ? !student.lastSessionDate :
                filterStatus === 'com' ? !!student.lastSessionDate : true;
            return matchSearch && matchFilter;
        });
    }, [studentsList, searchQuery, filterStatus]);

    // Retorna para a seleção de alunos
    const handleBackToGrid = () => {
        setSelectedStudent(null);
        setErrorMsg(null);
    };

    // Salva o registro histórico retroativo
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;
        
        setErrorMsg(null);

        // Validações de campos obrigatórios
        if (!date || !startTime || !endTime || !evolucao || !unit) {
            setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        if (unit !== 'SEDE' && unit !== 'COCAL') {
            setErrorMsg('Unidade de atendimento inválida. Selecione SEDE ou COCAL.');
            return;
        }

        // Validação de tamanho da Evolução
        if (evolucao.trim().length < 20) {
            setErrorMsg('A evolução/anamnese deve conter pelo menos 20 caracteres.');
            return;
        }

        // Validação de data futura
        const inputDate = new Date(`${date}T12:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dateOnlyInput = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
        if (dateOnlyInput > today) {
            setErrorMsg('A data do atendimento não pode ser no futuro.');
            return;
        }

        setSaving(true);
        try {
            // Combina evolução e observações no campo 'notes' conforme especificado
            const combinedNotes = observacoes.trim() 
                ? `Evolução: ${evolucao.trim()}\n\nObservações: ${observacoes.trim()}`
                : `Evolução: ${evolucao.trim()}`;

            const payload = {
                studentId: selectedStudent.studentId,
                studentName: selectedStudent.studentName,
                professionalId: currentUser.id,
                professionalName: currentUser.name,
                specialty: currentUser.specialty || '',
                unit,
                date,
                startTime,
                endTime,
                notes: combinedNotes,
                tipoAtendimento
            };

            await SupabaseService.salvarAtendimentoRetroativo(payload);
            
            success('Registro histórico salvo com sucesso!');
            
            // Limpa o formulário mas mantém o aluno selecionado
            setDate('');
            setStartTime('');
            setEndTime('');
            setEvolucao('');
            setObservacoes('');
            setTipoAtendimento('INDIVIDUAL');
        } catch (err: any) {
            console.error('Erro ao salvar agendamento retroativo:', err);
            setErrorMsg(err.message || 'Falha ao salvar o registro. Verifique as regras de vínculo.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12">
            <div className="max-w-4xl mx-auto px-4 pt-6">
                {/* Cabeçalho */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => onNavigate('dashboard')}
                        className="p-2 rounded-full hover:bg-slate-200 text-slate-600 transition-colors"
                        title="Voltar ao Painel"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">Lançamento Retroativo</h1>
                        <p className="text-sm text-slate-500">Lançamento de sessões e atendimentos históricos a partir de papel.</p>
                    </div>
                </div>

                {errorMsg && !selectedStudent && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3">
                        <AlertCircle size={20} className="shrink-0" />
                        <p className="text-sm font-semibold">{errorMsg}</p>
                    </div>
                )}

                {/* PASSO 1: Seleção do Aluno */}
                {!selectedStudent && (
                    <div className="space-y-4 animate-fadeIn">

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                                <div className="text-xl font-bold text-[#A32D2D]">
                                    {studentsList.filter(s => !s.lastSessionDate).length}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">Sem registro</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                                <div className="text-xl font-bold text-[#10B981]">
                                    {studentsList.filter(s => s.lastSessionDate).length}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">Com registro</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                                <div className="text-xl font-bold text-slate-700">{studentsList.length}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">Total de alunos</div>
                            </div>
                        </div>

                        {/* Busca */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl">
                            <Search size={16} className="text-slate-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Buscar aluno por nome..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                                    <AlertCircle size={14} />
                                </button>
                            )}
                        </div>

                        {/* Filtros ativos */}
                        <div className="flex gap-2 flex-wrap">
                            {([
                                { label: `Todos (${studentsList.length})`, value: 'todos', bg: '#8B1A3A', border: '#8B1A3A', color: '#fff', inactiveBorder: '#e2e8f0', inactiveColor: '#64748b' },
                                { label: `Sem registro (${studentsList.filter(s => !s.lastSessionDate).length})`, value: 'sem', bg: '#FCEBEB', border: '#F09595', color: '#A32D2D', inactiveBorder: '#F09595', inactiveColor: '#A32D2D' },
                                { label: `Com registro (${studentsList.filter(s => s.lastSessionDate).length})`, value: 'com', bg: '#EAF3DE', border: '#97C459', color: '#3B6D11', inactiveBorder: '#97C459', inactiveColor: '#3B6D11' },
                            ] as const).map(f => (
                                <button key={f.value}
                                    onClick={() => setFilterStatus(f.value)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all"
                                    style={filterStatus === f.value
                                        ? { background: f.bg, borderColor: f.border, color: f.color }
                                        : { background: 'white', borderColor: f.inactiveBorder, color: f.inactiveColor }}>
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <Loader2 size={36} className="animate-spin text-[#8B1A3A] mb-3" />
                                <p className="text-sm font-medium">Carregando alunos vinculados...</p>
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                                <AlertCircle size={36} className="mx-auto mb-3 text-slate-300" />
                                <p className="text-sm">Nenhum aluno encontrado.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredStudents.map((student) => {
                                    const hasSession = !!student.lastSessionDate;
                                    const hasDiag = !!student.diagnosis;
                                    const borderColor = hasSession ? '#10B981' : hasDiag ? '#EF9F27' : '#E24B4A';
                                    const dotColor = hasSession ? '#10B981' : hasDiag ? '#EF9F27' : '#E24B4A';
                                    const avatarBg = hasSession ? '#EAF3DE' : hasDiag ? '#FAEEDA' : '#FCEBEB';
                                    const avatarColor = hasSession ? '#3B6D11' : hasDiag ? '#854F0B' : '#A32D2D';
                                    const cardBg = hasSession ? '#F0FBF5' : 'white';
                                    const statusTag = hasSession
                                        ? { label: '✓ Lançado', bg: '#EAF3DE', color: '#3B6D11' }
                                        : hasDiag
                                        ? { label: 'Atenção', bg: '#FAEEDA', color: '#854F0B' }
                                        : { label: 'Pendente', bg: '#FCEBEB', color: '#A32D2D' };
                                    return (
                                        <button
                                            key={student.studentId}
                                            onClick={() => setSelectedStudent(student)}
                                            className="flex flex-col gap-2 p-4 rounded-xl border text-left transition-all group relative overflow-hidden hover:shadow-md"
                                            style={{ background: cardBg, borderLeft: `3px solid ${borderColor}`, borderTop: `0.5px solid ${hasSession ? '#97C459' : '#e2e8f0'}`, borderRight: `0.5px solid ${hasSession ? '#97C459' : '#e2e8f0'}`, borderBottom: `0.5px solid ${hasSession ? '#97C459' : '#e2e8f0'}` }}
                                        >
                                            {/* Badge status */}
                                            <span className="absolute top-2.5 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full"
                                                style={{ background: statusTag.bg, color: statusTag.color }}>
                                                {statusTag.label}
                                            </span>
                                            <div className="flex items-center gap-3 w-full pr-16">
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                                    style={{ background: avatarBg, color: avatarColor }}>
                                                    {student.studentName.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-sm truncate transition-colors"
                                                        style={{ color: hasSession ? '#0A5C38' : 'var(--color-text-primary)' }}>
                                                        {student.studentName}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">Clique para iniciar o lançamento</p>
                                                </div>
                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {student.schoolName && (
                                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#EAF3DE] text-[#3B6D11] border border-[#97C459] flex items-center gap-1">
                                                        <FileText size={9} /> {student.schoolName}
                                                    </span>
                                                )}
                                                {student.diagnosis && (
                                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#FAEEDA] text-[#854F0B] border border-[#EF9F27] flex items-center gap-1">
                                                        <AlertCircle size={9} /> {student.diagnosis}
                                                    </span>
                                                )}
                                                {hasSession ? (
                                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#EAF3DE] text-[#3B6D11] border border-[#97C459] flex items-center gap-1">
                                                        <Calendar size={9} /> Lançado {new Date(student.lastSessionDate!).toLocaleDateString('pt-BR')}
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#FCEBEB] text-[#A32D2D] border border-[#F09595] flex items-center gap-1">
                                                        <Clock size={9} /> Sem sessão registrada
                                                    </span>
                                                )}
                                            </div>
                                            <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[10px] font-bold text-[#8B1A3A]">Iniciar lançamento →</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        <p className="text-center text-[11px] text-slate-400">
                            {filteredStudents.length} de {studentsList.length} alunos
                        </p>
                    </div>
                )}

                {/* PASSO 2: Formulário */}
                {selectedStudent && (
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-fadeIn">
                        {/* Banner do Aluno em Destaque (Vinho #8B1A3A) */}
                        <div className="bg-[#8B1A3A]/5 border-b border-slate-200/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#8B1A3A] text-white flex items-center justify-center font-bold text-lg">
                                    {selectedStudent.studentName.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B1A3A]">Aluno Selecionado</span>
                                    <h2 className="text-xl font-black text-[#8B1A3A] mt-0.5">{selectedStudent.studentName}</h2>
                                </div>
                            </div>
                            <button
                                onClick={handleBackToGrid}
                                className="w-fit flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white rounded-full text-xs font-bold text-slate-600 transition-all hover:bg-slate-50"
                            >
                                <ArrowLeft size={14} /> Selecionar Outro Aluno
                            </button>
                        </div>

                        {/* Formulário de Registro */}
                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            {errorMsg && (
                                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3">
                                    <AlertCircle size={20} className="shrink-0" />
                                    <p className="text-sm font-semibold">{errorMsg}</p>
                                </div>
                            )}

                            {/* Data e Horário */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
                                    <Calendar size={14} /> Data e Horário do Atendimento
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label htmlFor="appt-date" className="text-xs font-bold text-slate-500 pl-1">
                                            Data do Atendimento <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="appt-date"
                                            type="date"
                                            max={todayStr}
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A3A]/25 focus:border-[#8B1A3A] transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="appt-start" className="text-xs font-bold text-slate-500 pl-1">
                                            Hora Início <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="appt-start"
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A3A]/25 focus:border-[#8B1A3A] transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="appt-end" className="text-xs font-bold text-slate-500 pl-1">
                                            Hora Fim <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="appt-end"
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A3A]/25 focus:border-[#8B1A3A] transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tipo de Atendimento (Radio Buttons) */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                                    Modalidade do Atendimento <span className="text-red-500">*</span>
                                </h3>
                                <div className="flex gap-6 pl-1">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                                        <input
                                            type="radio"
                                            name="tipoAtendimento"
                                            value="INDIVIDUAL"
                                            checked={tipoAtendimento === 'INDIVIDUAL'}
                                            onChange={() => setTipoAtendimento('INDIVIDUAL')}
                                            className="w-4 h-4 text-[#8B1A3A] border-slate-300 focus:ring-[#8B1A3A]"
                                        />
                                        Individual
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                                        <input
                                            type="radio"
                                            name="tipoAtendimento"
                                            value="GRUPO"
                                            checked={tipoAtendimento === 'GRUPO'}
                                            onChange={() => setTipoAtendimento('GRUPO')}
                                            className="w-4 h-4 text-[#8B1A3A] border-slate-300 focus:ring-[#8B1A3A]"
                                        />
                                        Grupo
                                    </label>
                                </div>
                            </div>

                            {/* Seleção de Unidade */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                                    Unidade do Atendimento <span className="text-red-500">*</span>
                                </h3>
                                <select
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value as 'SEDE' | 'COCAL')}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A3A]/25 focus:border-[#8B1A3A] transition-all"
                                >
                                    <option value="" disabled>Selecione a Unidade...</option>
                                    <option value="SEDE">SEDE</option>
                                    <option value="COCAL">COCAL (distrito)</option>
                                </select>
                            </div>

                            {/* Evolução / Anamnese */}
                            <div className="space-y-1.5">
                                <label htmlFor="appt-evolution" className="text-xs font-black uppercase tracking-widest text-slate-400">
                                    Evolução / Anamnese <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="appt-evolution"
                                    placeholder="Descreva detalhadamente o atendimento realizado..."
                                    rows={5}
                                    value={evolucao}
                                    onChange={(e) => setEvolucao(e.target.value)}
                                    minLength={20}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A3A]/25 focus:border-[#8B1A3A] transition-all resize-y min-h-[120px]"
                                />
                                <div className="flex justify-between items-center px-1 text-[11px] text-slate-400">
                                    <span>Mínimo 20 caracteres</span>
                                    <span className={evolucao.length >= 20 ? 'text-green-600 font-semibold' : 'text-slate-400'}>
                                        {evolucao.length} caracteres
                                    </span>
                                </div>
                            </div>

                            {/* Observações Opcionais */}
                            <div className="space-y-1.5">
                                <label htmlFor="appt-obs" className="text-xs font-black uppercase tracking-widest text-slate-400">
                                    Observações Adicionais (Opcional)
                                </label>
                                <textarea
                                    id="appt-obs"
                                    placeholder="Inclua aqui outras informações relevantes ou notas da secretaria..."
                                    rows={3}
                                    value={observacoes}
                                    onChange={(e) => setObservacoes(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A3A]/25 focus:border-[#8B1A3A] transition-all resize-y"
                                />
                            </div>

                            {/* Ação de Envio (Botão Vinho #8B1A3A) */}
                            <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full sm:w-auto px-8 py-3 bg-[#8B1A3A] hover:bg-[#72142E] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Salvando Registro Histórico...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={16} />
                                            Salvar Registro Histórico
                                        </>
                                    )}
                                </button>
                                {saving && (
                                    <p className="text-xs text-slate-400 animate-pulse">Enviando dados de forma segura ao banco...</p>
                                )}
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

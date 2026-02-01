
import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    Save,
    X,
    Calendar as CalendarIcon,
    MapPin,
    User as UserIcon,
    Clock,
    Sparkles,
    CheckCircle2,
    Search,
    School as SchoolIcon
} from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';
import { Appointment, Specialty, Student, User, Unit, School } from '../types';
import { useToast } from '../contexts/ToastContext';

interface AppointmentFormProps {
    currentUser: User;
    students: Student[];
    initialData?: Appointment | null;
    onCancel: () => void;
    onSuccess: () => void;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({ currentUser, students, initialData, onCancel, onSuccess }) => {
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [availableProfessionals, setAvailableProfessionals] = useState<User[]>([]);
    const [schools, setSchools] = useState<School[]>([]);

    // Estados de Filtro de Aluna
    const [searchName, setSearchName] = useState(initialData?.studentName || '');
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>('ALL');

    const [newApt, setNewApt] = useState<Partial<Appointment>>({
        unit: initialData?.unit || (currentUser.role === 'ADMIN' ? 'SEDE' : (currentUser.scope as Unit || 'SEDE')),
        status: 'AGENDADO',
        date: new Date().toISOString().split('T')[0],
        specialty: initialData?.specialty,
        professionalId: initialData?.professionalId,
        professionalName: initialData?.professionalName,
        studentId: initialData?.studentId,
        studentName: initialData?.studentName
    });

    // Carregar profissionais quando a especialidade muda
    useEffect(() => {
        if (newApt.specialty) {
            SupabaseService.getProfessionalsBySpecialty(newApt.specialty).then(setAvailableProfessionals);
        } else {
            setAvailableProfessionals([]);
        }
    }, [newApt.specialty]);

    // Carregar escolas no mount
    useEffect(() => {
        SupabaseService.getSchools().then(setSchools);
    }, []);

    // Função auxiliar para normalizar texto (remover acentos)
    const normalizeText = (text: string) => {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    // Lógica de filtragem de alunos
    const filteredStudents = students.filter(s => {
        const normalizedSearch = normalizeText(searchName);
        const nameMatch = normalizeText(s.fullName || '').includes(normalizedSearch);
        const schoolMatch = selectedSchoolId === 'ALL' || s.school?.schoolId === selectedSchoolId;
        return nameMatch && schoolMatch;
    });

    const handleSaveAppointment = async () => {
        if (!newApt.studentId || !newApt.professionalId || !newApt.startTime || !newApt.endTime || !newApt.date || !newApt.specialty) {
            showError("Preencha todos os campos obrigatórios");
            return;
        }

        setLoading(true);
        try {
            // [ATUALIZADO] Verificação de Conflito de Horário (Client-Side filtering for robustness)
            // Busca TODOS os agendamentos do aluno para garantir que não haja erro de filtro de data no banco
            const studentAppointments = await SupabaseService.getAppointments({
                studentId: newApt.studentId
            });

            console.log("Verificando conflitos para aluno:", newApt.studentId);
            console.log("Agendamentos encontrados (Total):", studentAppointments.length);

            const hasConflict = studentAppointments.find(app => {
                // 1. Verificar Data (Comparação de String YYYY-MM-DD)
                if (app.date !== newApt.date) return false;

                // 2. Ignora o próprio agendamento (caso seja edição, embora aqui seja sempre novo)
                if (newApt.id && app.id === newApt.id) return false;

                // 3. Ignora status liberados
                // 'AGENDADO' e 'ATENDIDO' contam como ocupado.
                // 'FALTOU' e 'REMARCAR' liberam a vaga?
                // Se faltou, o horário passou, mas se for futuro, 'FALTOU' não faz sentido. 
                // Se 'REMARCAR', teoricamente o horário está vago?
                // Vamos ser conservadores: Só AGENDADO e ATENDIDO bloqueiam.
                if (app.status !== 'AGENDADO' && app.status !== 'ATENDIDO') return false;

                // 4. Verificação de Sobreposição de Horário
                // (StartA < EndB) e (StartB < EndA)
                const newStart = newApt.startTime!;
                const newEnd = newApt.endTime!;
                const appStart = app.startTime;
                const appEnd = app.endTime;

                const overlap = newStart < appEnd && appStart < newEnd;

                if (overlap) {
                    console.log("Conflito detectado com:", app);
                }

                return overlap;
            });

            if (hasConflict) {
                showError(`Conflito: Já existe agendamento dia ${hasConflict.date.split('-').reverse().join('/')} às ${hasConflict.startTime} (${hasConflict.professionalName}).`);
                setLoading(false);
                return;
            }

            await SupabaseService.saveAppointment(newApt);

            // Se for um reagendamento (existe initialData com ID), atualizar o status do anterior
            if (initialData && initialData.id && newApt.date) {
                try {
                    const dateFormatted = newApt.date.split('-').reverse().join('/');
                    // Tenta atualizar tudo (Status + Notas)
                    await SupabaseService.updateAppointmentFields(initialData.id, {
                        status: 'REMARCAR',
                        notes: `Remarcado para ${dateFormatted}`
                    });
                } catch (err) {
                    console.warn("Falha ao atualizar notas, tentando apenas status...", err);
                    try {
                        // Fallback: Tenta atualizar apenas o status (caso a coluna notes não exista)
                        await SupabaseService.updateAppointmentStatus(initialData.id, 'REMARCAR');
                    } catch (err2) {
                        console.error("Falha fatal ao atualizar status anterior", err2);
                        // Não impede o fluxo, pois o novo já foi criado
                    }
                }
            }

            success("Agendamento realizado com sucesso!");
            onSuccess();
        } catch (err: any) {
            console.error("Erro ao salvar agendamento:", err);
            showError(`Erro ao salvar agendamento: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto py-6 px-4 space-y-8 animate-slideUp">
            {/* Cabeçalho de Navegação */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onCancel}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-all group"
                >
                    <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-slate-200 transition-all">
                        <ChevronLeft size={20} />
                    </div>
                    <span>Voltar para Lista</span>
                </button>
                <div className="text-right">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Novo Agendamento</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">Fluxo de Atendimento</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna Principal: Formulário */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 space-y-8">

                        {/* Seção 1: Onde e Quando */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-400">
                                <MapPin size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Unidade e Data</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 px-1">Unidade de Atendimento</label>
                                    <select
                                        value={newApt.unit}
                                        onChange={(e) => setNewApt({ ...newApt, unit: e.target.value as Unit })}
                                        className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:border-primary-500 focus:bg-white transition-all outline-none"
                                    >
                                        <option value="SEDE">SEDE</option>
                                        <option value="COCAL">COCAL</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 px-1">Data do Atendimento</label>
                                    <input
                                        type="date"
                                        value={newApt.date}
                                        onChange={(e) => setNewApt({ ...newApt, date: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:border-primary-500 focus:bg-white transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seção 2: Especialidade e Profissional */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Sparkles size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Especialista</span>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 px-1">Especialidade Necessária</label>
                                <select
                                    value={newApt.specialty}
                                    onChange={(e) => setNewApt({ ...newApt, specialty: e.target.value as Specialty, professionalId: undefined })}
                                    className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:border-primary-500 focus:bg-white transition-all outline-none"
                                >
                                    <option value="">Selecione uma especialidade...</option>
                                    {Object.values(Specialty).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {newApt.specialty && (
                                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-xs font-bold text-slate-600 px-1">Profissional Disponível</label>
                                    <select
                                        value={newApt.professionalId}
                                        onChange={(e) => {
                                            const prof = availableProfessionals.find(p => p.id === e.target.value);
                                            setNewApt({ ...newApt, professionalId: e.target.value, professionalName: prof?.name });
                                        }}
                                        className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:border-primary-500 focus:bg-white transition-all outline-none"
                                    >
                                        <option value="">Selecione o profissional especialista...</option>
                                        {availableProfessionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Seção 3: Aluno */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-400">
                                <UserIcon size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Paciente (Aluno)</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Busca por Nome */}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-xs font-bold text-slate-600 px-1">Buscar por Nome</label>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Digite o nome do aluno..."
                                            value={searchName}
                                            onChange={(e) => setSearchName(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:border-primary-500 focus:bg-white transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Filtro por Escola */}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-xs font-bold text-slate-600 px-1">Filtrar por Escola</label>
                                    <div className="relative">
                                        <SchoolIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <select
                                            value={selectedSchoolId}
                                            onChange={(e) => setSelectedSchoolId(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:border-primary-500 focus:bg-white transition-all outline-none appearance-none"
                                        >
                                            <option value="ALL">Todas as Escolas</option>
                                            {schools.map(sch => <option key={sch.id} value={sch.id}>{sch.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5 text-left">
                                <label className="text-xs font-bold text-slate-600 px-1">Selecione o Aluno na Lista Filtrada</label>
                                <select
                                    value={newApt.studentId}
                                    onChange={(e) => {
                                        const stu = students.find(s => s.id === e.target.value);
                                        setNewApt({ ...newApt, studentId: e.target.value, studentName: stu?.fullName });
                                    }}
                                    className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:border-primary-500 focus:bg-white transition-all outline-none"
                                >
                                    <option value="">{filteredStudents.length === 0 ? 'Nenhum aluno encontrado' : 'Selecione o aluno conforme cadastro...'}</option>
                                    {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                                </select>
                                {filteredStudents.length > 0 && searchName && (
                                    <p className="text-[10px] text-primary-600 font-bold mt-1 px-1">
                                        Exibindo {filteredStudents.length} de {students.length} alunos
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Seção 4: Horários */}
                        {/* Seção 4: Horários (Smart Selection) */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-slate-400">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Horário</span>
                                </div>
                                {/* Duration Toggles */}
                                <div className="flex gap-1">
                                    {[30, 45, 50, 60].map(dur => (
                                        <button
                                            key={dur}
                                            onClick={() => {
                                                if (newApt.startTime) {
                                                    const [h, m] = newApt.startTime.split(':').map(Number);
                                                    const d = new Date();
                                                    d.setHours(h, m + dur);
                                                    const nextEnd = d.toTimeString().slice(0, 5);
                                                    setNewApt({ ...newApt, endTime: nextEnd });
                                                }
                                            }}
                                            className="px-2 py-1 bg-slate-100 hover:bg-primary-50 text-slate-500 hover:text-primary-600 rounded-lg text-[10px] font-bold transition-all"
                                            title={`Definir duração de ${dur} min`}
                                        >
                                            {dur}m
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preset Start Times */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sugestões de Início (Manhã)</label>
                                <div className="flex flex-wrap gap-2">
                                    {['07:30', '08:00', '08:50', '09:40', '10:00', '10:30', '11:00'].map(time => (
                                        <button
                                            key={time}
                                            onClick={() => {
                                                // Auto-set End Time (Default 50m)
                                                const [h, m] = time.split(':').map(Number);
                                                const d = new Date();
                                                d.setHours(h, m + 50);
                                                const nextEnd = d.toTimeString().slice(0, 5);
                                                setNewApt({ ...newApt, startTime: time, endTime: nextEnd });
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${newApt.startTime === time ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Sugestões de Início (Tarde)</label>
                                <div className="flex flex-wrap gap-2">
                                    {['13:00', '13:30', '14:00', '14:50', '15:00', '15:40', '16:00', '16:30', '17:00'].map(time => (
                                        <button
                                            key={time}
                                            onClick={() => {
                                                // Auto-set End Time (Default 50m)
                                                const [h, m] = time.split(':').map(Number);
                                                const d = new Date();
                                                d.setHours(h, m + 50);
                                                const nextEnd = d.toTimeString().slice(0, 5);
                                                setNewApt({ ...newApt, startTime: time, endTime: nextEnd });
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${newApt.startTime === time ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 px-1">Início</label>
                                    <input
                                        type="time"
                                        value={newApt.startTime}
                                        onChange={(e) => {
                                            const newStart = e.target.value;
                                            // Auto calc +50m only if end is not set or empty, or just strictly auto-calc
                                            if (newStart) {
                                                const [h, m] = newStart.split(':').map(Number);
                                                const d = new Date();
                                                d.setHours(h, m + 50);
                                                const nextEnd = d.toTimeString().slice(0, 5);
                                                setNewApt({ ...newApt, startTime: newStart, endTime: nextEnd });
                                            } else {
                                                setNewApt({ ...newApt, startTime: newStart });
                                            }
                                        }}
                                        className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:border-primary-500 focus:bg-white transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 px-1">Término</label>
                                    <input
                                        type="time"
                                        value={newApt.endTime}
                                        onChange={(e) => setNewApt({ ...newApt, endTime: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:border-primary-500 focus:bg-white transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Coluna Lateral: Resumo e Ações */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[32px] p-8 text-white space-y-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>

                        <h2 className="text-lg font-bold flex items-center gap-2 relative z-10">
                            <CheckCircle2 size={24} className="text-primary-400" />
                            Resumo da Operação
                        </h2>

                        <div className="space-y-4 relative z-10">
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Paciente</p>
                                <p className="text-sm font-bold truncate">{newApt.studentName || 'Não selecionado'}</p>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Profissional / Unidade</p>
                                <p className="text-sm font-bold truncate">{newApt.professionalName || 'Aguardando especialista'}</p>
                                <p className="text-xs opacity-60 mt-0.5">{newApt.unit} | {newApt.date?.split('-').reverse().join('/')}</p>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Horário</p>
                                <p className="text-sm font-bold">{newApt.startTime && newApt.endTime ? `${newApt.startTime} às ${newApt.endTime}` : 'Defina os horários'}</p>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 relative z-10">
                            <button
                                onClick={handleSaveAppointment}
                                disabled={loading}
                                className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Save size={20} className="group-hover:scale-110 transition-transform" />
                                        Confirmar Agendamento
                                    </>
                                )}
                            </button>
                            <button
                                onClick={onCancel}
                                className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all"
                            >
                                Descartar
                            </button>
                        </div>
                    </div>

                    <div className="bg-orange-50 border border-orange-100 rounded-3xl p-6">
                        <h3 className="text-orange-800 text-xs font-black uppercase tracking-widest mb-2">Informação Importante</h3>
                        <p className="text-orange-700/80 text-xs leading-relaxed font-bold">
                            Este agendamento é sincronizado em tempo real com a Central. Verifique conflitos de horários antes de confirmar.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

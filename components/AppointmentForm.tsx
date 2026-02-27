import React, { useState, useEffect, useMemo } from 'react';
import {
    ArrowLeft,
    Save,
    Calendar,
    MapPin,
    User as UserIcon,
    Clock,
    Sparkles,
    CheckCircle2,
    Search,
    MessageCircle
} from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';
import { Appointment, Specialty, Student, User, Unit, School } from '../types';
import { useToast } from '../contexts/ToastContext';
import SearchableSelect from './SearchableSelect';

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

    // Estados de Filtro de Aluno
    const [searchName, setSearchName] = useState(initialData?.studentName || '');
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>('ALL');

    // State for selected duration (default 40min)
    const [duration, setDuration] = useState(40);

    const [newApt, setNewApt] = useState<Partial<Appointment>>({
        unit: initialData?.unit || (currentUser.scope === 'GLOBAL' ? 'SEDE' : (currentUser.scope as Unit || 'SEDE')),
        status: 'AGENDADO',
        date: new Date().toISOString().split('T')[0],
        specialty: initialData?.specialty,
        professionalId: initialData?.professionalId,
        professionalName: initialData?.professionalName,
        studentId: initialData?.studentId,
        studentName: initialData?.studentName
    });

    const [createdAppointment, setCreatedAppointment] = useState<{ student: string, professional: string, date: string, time: string, phone: string, guardian: string } | null>(null);

    // Carregar profissionais quando a especialidade muda
    useEffect(() => {
        if (newApt.specialty) {
            SupabaseService.getProfessionalsBySpecialty(newApt.specialty)
                .then(setAvailableProfessionals)
                .catch(err => {
                    console.error('[AppointmentForm] Erro ao buscar profissionais:', err);
                    showError("Erro ao carregar profissionais.");
                });
        } else {
            setAvailableProfessionals([]);
        }
    }, [newApt.specialty]);

    // Carregar escolas no mount
    useEffect(() => {
        SupabaseService.getSchools()
            .then(setSchools)
            .catch(err => {
                console.error('[AppointmentForm] Erro ao carregar escolas:', err);
            });
    }, []);

    // Função auxiliar para normalizar texto (remover acentos)
    const normalizeText = (text: string) => {
        if (!text) return "";
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    // Lógica de filtragem de alunos - Memoizado para performance
    const filteredStudents = useMemo(() => {
        const studentList = students || [];
        if (studentList.length === 0) return [];

        const filtered = students.filter(s => {
            const normalizedSearch = normalizeText(searchName);
            const nameMatch = !searchName || normalizeText(s.fullName || '').includes(normalizedSearch);
            const schoolMatch = selectedSchoolId === 'ALL' || s.school?.schoolId === selectedSchoolId;
            return nameMatch && schoolMatch;
        });

        console.log('[AppointmentForm] Alunos após filtragem:', filtered.length);
        return filtered;
    }, [students, searchName, selectedSchoolId]);

    const handleSaveAppointment = async () => {
        if (!newApt.studentId || !newApt.professionalId || !newApt.startTime || !newApt.endTime || !newApt.date || !newApt.specialty) {
            showError("Preencha todos os campos obrigatórios");
            return;
        }

        setLoading(true);
        try {
            // Verificação de Conflito de Horário
            const studentAppointments = await SupabaseService.getAppointments({
                studentId: newApt.studentId
            });

            const hasConflict = studentAppointments.find(app => {
                if (app.date !== newApt.date) return false;
                if (initialData?.id && app.id === initialData.id) return false;
                if (app.status !== 'AGENDADO' && app.status !== 'ATENDIDO') return false;

                const newStart = newApt.startTime!;
                const newEnd = newApt.endTime!;
                const appStart = app.startTime;
                const appEnd = app.endTime;

                return newStart < appEnd && appStart < newEnd;
            });

            if (hasConflict) {
                showError(`Conflito: Já existe agendamento dia ${hasConflict.date.split('-').reverse().join('/')} às ${hasConflict.startTime} (${hasConflict.professionalName}).`);
                setLoading(false);
                return;
            }

            // Mapeia para salvar
            const aptToSave = { ...newApt };
            if (initialData?.id) aptToSave.id = initialData.id;

            await SupabaseService.saveAppointment(aptToSave);

            // Reagendamento: Atualiza anterior
            if (initialData && initialData.id && newApt.date) {
                try {
                    const dateFormatted = newApt.date.split('-').reverse().join('/');
                    await SupabaseService.updateAppointmentFields(initialData.id, {
                        status: 'REMARCAR',
                        notes: `Remarcado para ${dateFormatted}`
                    });
                } catch (err) {
                    console.warn("Falha ao atualizar notas do anterior", err);
                }
            }

            // Preparar para envio WhatsApp
            const studentData = students.find(s => s.id === newApt.studentId);
            const guardianName = studentData?.guardians?.[0]?.name || 'Responsável';
            const guardianPhone = studentData?.guardians?.[0]?.phone || '';

            setCreatedAppointment({
                student: newApt.studentName || 'Aluno',
                professional: newApt.professionalName || 'Profissional',
                date: newApt.date.split('-').reverse().join('/'),
                time: newApt.startTime!,
                phone: guardianPhone,
                guardian: guardianName
            });

            success("Agendamento realizado com sucesso!");
        } catch (err: any) {
            console.error("Erro ao salvar agendamento:", err);
            showError(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsAppSend = async () => {
        if (!createdAppointment) return;

        setLoading(true);
        try {
            const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://indshiztdvjgvgnzigqd.supabase.co';
            const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

            const response = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({
                    telefone: createdAppointment.phone.replace(/\D/g, ''),
                    nome: createdAppointment.student,
                    data: createdAppointment.date,
                    hora: createdAppointment.time,
                    professional: createdAppointment.professional
                }),
            });

            const resultText = await response.text();
            let result: any = {};
            try {
                result = resultText ? JSON.parse(resultText) : {};
            } catch {
                // Resposta não-JSON
            }

            if (!response.ok) {
                throw new Error(result.error || `Erro HTTP ${response.status}`);
            }

            success("Confirmação de WhatsApp enviada!");
            onSuccess();
        } catch (err: any) {
            console.error("Erro no envio de WhatsApp:", err);
            showError(`Erro no envio: ${err.message}`);
        } finally {
            setLoading(false);

        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onCancel}
                    className="p-3 bg-white hover:bg-slate-100 text-slate-400 hover:text-primary-500 rounded-2xl shadow-sm transition-all group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Novo Agendamento</h1>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary-500 opacity-60">Fluxo de Atendimento</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
                {/* Coluna do Formulário */}
                <div className="lg:col-span-2 space-y-8 bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Seção 1: Unidade e Data */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-400">
                                <MapPin size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Unidade e Data</span>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 px-1">Unidade de Atendimento</label>
                                <select
                                    value={newApt.unit}
                                    onChange={(e) => setNewApt({ ...newApt, unit: e.target.value as Unit })}
                                    className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:border-primary-500 focus:bg-white transition-all outline-none"
                                >
                                    <option value="SEDE">SEDE</option>
                                    <option value="COCAL">COCAL (DISTRITO)</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 px-1">Data do Atendimento</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="date"
                                        value={newApt.date}
                                        onChange={(e) => setNewApt({ ...newApt, date: e.target.value })}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:border-primary-500 focus:bg-white transition-all outline-none"
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
                            <div className="space-y-1.5 text-left">
                                <label className="text-xs font-bold text-slate-600 px-1">Especialidade Necessária</label>
                                <SearchableSelect
                                    options={Object.values(Specialty).map(s => ({ value: s, label: s }))}
                                    value={newApt.specialty || ''}
                                    onChange={(val) => setNewApt({ ...newApt, specialty: val as Specialty, professionalId: undefined, professionalName: undefined })}
                                    placeholder="Selecione a especialidade..."
                                />
                            </div>

                            {newApt.specialty && (
                                <div className="space-y-1.5 text-left animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-xs font-bold text-slate-600 px-1">Profissional Disponível</label>
                                    <SearchableSelect
                                        options={availableProfessionals.map(p => ({ value: p.id, label: p.name }))}
                                        value={newApt.professionalId || ''}
                                        onChange={(val) => {
                                            const prof = availableProfessionals.find(p => p.id === val);
                                            setNewApt({ ...newApt, professionalId: val, professionalName: prof?.name });
                                        }}
                                        placeholder="Selecione o profissional..."
                                    />
                                </div>
                            )}
                        </div>

                        {/* Seção 3: Aluno */}
                        <div className="md:col-span-2 space-y-4 border-t border-slate-50 pt-8">
                            <div className="flex items-center gap-2 text-slate-400">
                                <UserIcon size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Paciente (Aluno)</span>
                            </div>

                            <div className="space-y-6">
                                {/* Filtro por Escola no Topo */}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-xs font-bold text-slate-600 px-1">Filtrar por Escola</label>
                                    <SearchableSelect
                                        options={[
                                            { value: 'ALL', label: 'Todas as Escolas' },
                                            ...schools.map(sch => ({ value: sch.id, label: sch.name }))
                                        ]}
                                        value={selectedSchoolId}
                                        onChange={setSelectedSchoolId}
                                        placeholder="Buscar escola..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-xs font-bold text-slate-600 px-1">Buscar por Nome</label>
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="text"
                                                placeholder="Digite o nome..."
                                                value={searchName}
                                                onChange={(e) => setSearchName(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:border-primary-500 focus:bg-white transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 text-left">
                                        <label className="text-xs font-bold text-slate-600 px-1">Selecione o Aluno</label>
                                        <SearchableSelect
                                            options={filteredStudents.map(s => ({ value: s.id, label: s.fullName }))}
                                            value={newApt.studentId || ''}
                                            onChange={(val) => {
                                                const stu = students.find(s => s.id === val);
                                                setNewApt({ ...newApt, studentId: val, studentName: stu?.fullName });
                                            }}
                                            placeholder={filteredStudents.length === 0 ? 'Nenhum aluno encontrado' : 'Selecione o aluno...'}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Seção 4: Horários */}
                        <div className="md:col-span-2 space-y-4 border-t border-slate-50 pt-8">
                            <div className="flex items-center justify-between text-slate-400">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Horário do Atendimento</span>
                                </div>
                                <div className="flex gap-1">
                                    {[30, 40, 50, 60].map(dur => (
                                        <button
                                            key={dur}
                                            onClick={() => setDuration(dur)}
                                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${duration === dur ? 'bg-primary-500 text-white shadow-md' : 'bg-slate-100 hover:bg-primary-50 text-slate-500 hover:text-primary-600'}`}
                                        >
                                            {dur}m
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sugestões de Início</label>
                                <div className="flex flex-wrap gap-2">
                                    {['08:00', '08:40', '09:20', '10:00', '13:00', '13:40', '14:20', '15:00', '15:40', '16:20'].map(time => (
                                        <button
                                            key={time}
                                            onClick={() => {
                                                const [h, m] = time.split(':').map(Number);
                                                const d = new Date();
                                                d.setHours(h, m + duration);
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
                                    <label className="text-xs font-bold text-slate-600 px-1">Horário de Início</label>
                                    <input
                                        type="time"
                                        value={newApt.startTime || ''}
                                        onChange={(e) => {
                                            const newStart = e.target.value;
                                            if (newStart) {
                                                const [h, m] = newStart.split(':').map(Number);
                                                const d = new Date();
                                                d.setHours(h, m + duration);
                                                const nextEnd = d.toTimeString().slice(0, 5);
                                                setNewApt({ ...newApt, startTime: newStart, endTime: nextEnd });
                                            } else {
                                                setNewApt({ ...newApt, startTime: newStart });
                                            }
                                        }}
                                        className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:border-primary-500 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 px-1">Horário de Término</label>
                                    <input
                                        type="time"
                                        value={newApt.endTime || ''}
                                        onChange={(e) => setNewApt({ ...newApt, endTime: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:border-primary-500 transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resumo */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[32px] p-8 text-white space-y-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        <h2 className="text-lg font-bold flex items-center gap-2 relative z-10">
                            <CheckCircle2 size={24} className="text-primary-400" />
                            Resumo da Operação
                        </h2>
                        <div className="space-y-4 relative z-10 text-left">
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
                                className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Save size={20} /> Confirmar Agendamento</>}
                            </button>
                            <button onClick={onCancel} className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all">Descartar</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal WhatsApp */}
            {createdAppointment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageCircle size={40} className="text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Agendamento Realizado!</h2>
                        <p className="text-slate-600">Enviar confirmação para <strong>{createdAppointment.guardian}</strong>?</p>
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-left text-sm text-green-800 font-mono">
                            <p>Olá {createdAppointment.guardian}, confirmamos o agendamento de {createdAppointment.student}.</p>
                            <p className="mt-2 text-xs">📅 Data: {createdAppointment.date} | ⏰ Hora: {createdAppointment.time}</p>
                            <p className="font-bold mt-2">Responda CONFIRMAR ou CANCELAR.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={onSuccess} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Pular</button>
                            <button onClick={handleWhatsAppSend} disabled={loading} className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><MessageCircle size={18} /> Enviar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

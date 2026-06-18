import React, { useState, useEffect } from 'react';
import { Student, Specialty, Session, User, SupportProfessional } from '../types';
import { ArrowLeft, Phone, MapPin, Activity, School, Clock, Calendar, FileText, Plus, Save, User as UserIcon, Lock, Paperclip, CreditCard, Download, Edit, Heart, UserCheck } from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';
import { useToast } from '../contexts/ToastContext';

interface StudentProfileProps {
    student: Student;
    onBack: () => void;
    currentUser: User;
    onEdit: (student: Student) => void;
    onNavigate: (page: string, keepSelection?: boolean) => void;
}

export const PatientProfile: React.FC<StudentProfileProps> = ({ student: initialStudent, onBack, currentUser, onEdit, onNavigate }) => {
    const [student, setStudent] = useState<Student>(initialStudent);
    const { success: showToast, error: toastError } = useToast();

    // History / Session State
    const [isAddingSession, setIsAddingSession] = useState(false);
    const [newSession, setNewSession] = useState<Partial<Session>>({
        date: new Date().toISOString().split('T')[0],
        specialty: currentUser.specialty || Specialty.PSYCHOLOGY,
        professionalName: currentUser.name,
        notes: ''
    });

    const canViewClinicalContent = currentUser.role === 'ADMIN' || currentUser.role === 'SPECIALIST';
    // Secretárias podem ver que houve um atendimento (data/prof), mas não as notas.
    const canViewClinicalList = canViewClinicalContent || currentUser.role === 'SECRETARIA_SEDE' || currentUser.role === 'SECRETARIA_COCAL' || currentUser.role === 'EDUCATION_SECRETARY';
    // Recepcionistas podem editar dados do aluno (cadastro), mas não podem acessar prontuário clínico.
    const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'SECRETARIA_SEDE' || currentUser.role === 'SECRETARIA_COCAL' || currentUser.role === 'EDUCATION_SECRETARY' || currentUser.role === 'ASSISTANT' || currentUser.role === 'ESCOLA';

    // ATs Vinculados State
    const [linkedATs, setLinkedATs] = useState<SupportProfessional[]>([]);

    // Prontuário completo (foto, documentos, JSON escolar etc.) + sessões e ATs — a lista costuma vir parcial (compactList).
    useEffect(() => {
        let cancelled = false;

        if (!initialStudent?.id) {
            setStudent(initialStudent);
            setLinkedATs([]);
            return () => { cancelled = true; };
        }

        const id = initialStudent.id;

        (async () => {
            try {
                const [full, sessions, ats] = await Promise.all([
                    SupabaseService.getStudentById(id),
                    SupabaseService.getStudentSessions(id),
                    SupabaseService.getSupportProfessionalsByStudent(id).catch(() => [] as SupportProfessional[]),
                ]);
                if (cancelled) return;
                const base = full ?? initialStudent;
                setStudent({ ...base, history: sessions });
                setLinkedATs(ats);
            } catch (err) {
                console.error('[PatientProfile] Erro ao carregar dados completos do aluno:', err);
                if (cancelled) return;
                setStudent(initialStudent);
                if (!initialStudent.history?.length) {
                    try {
                        const sessions = await SupabaseService.getStudentSessions(id);
                        if (!cancelled) {
                            setStudent((prev) => ({ ...prev, history: sessions }));
                        }
                    } catch (e) {
                        console.error('[PatientProfile] Erro ao carregar sessões (fallback):', e);
                    }
                }
                SupabaseService.getSupportProfessionalsByStudent(id)
                    .then((a) => { if (!cancelled) setLinkedATs(a); })
                    .catch(() => { if (!cancelled) setLinkedATs([]); });
            }
        })();

        return () => { cancelled = true; };
    }, [initialStudent]);

    const handleSaveSession = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newSession.date || !newSession.notes) return;

        const session: Session = {
            id: crypto.randomUUID(),
            date: newSession.date!,
            specialty: newSession.specialty as Specialty,
            professionalName: newSession.professionalName || 'Profissional',
            notes: newSession.notes!
        };

        try {
            await SupabaseService.saveSession(session, student.id, currentUser.id);

            // Atualiza estado local para feedback imediato
            const updatedStudent = {
                ...student,
                history: [session, ...(student.history || [])]
            };
            setStudent(updatedStudent);
            setIsAddingSession(false);
            setNewSession({
                date: new Date().toISOString().split('T')[0],
                specialty: currentUser.specialty || Specialty.PSYCHOLOGY,
                professionalName: currentUser.name,
                notes: ''
            });
            showToast('Evolução clínica registrada com sucesso!');
        } catch (err: any) {
            console.error('Erro ao salvar evolução:', err);
            toastError(err.message || 'Erro ao salvar evolução clínica.');
        }
    };

    const getSpecialtyColor = (specialty: Specialty) => {
        switch (specialty) {
            case Specialty.PSYCHOLOGY: return 'bg-purple-100 text-purple-700 border-purple-200';
            case Specialty.SOCIAL_WORK: return 'bg-blue-100 text-blue-700 border-blue-200';
            case Specialty.PSYCHOPEDAGOGY: return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    // Guard: se o aluno ainda não chegou, não renderiza nada
    if (!student) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-slate-300 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm">Carregando prontuário...</p>
                </div>
            </div>
        );
    }

    // Mock age calculation
    const age = student?.birthDate
        ? new Date().getFullYear() - new Date(student.birthDate).getFullYear()
        : null;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            <div className="flex justify-between items-center">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-primary-600 transition-colors">
                    <ArrowLeft size={18} />
                    Voltar para a lista
                </button>

                {canEdit && (
                    <button
                        onClick={() => onEdit(student)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm text-sm font-medium"
                    >
                        <Edit size={16} /> Editar Dados
                    </button>
                )}
            </div>

            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 items-start">
                <div className="w-24 h-24 flex-shrink-0">
                    {student.photoUrl ? (
                        <img src={student.photoUrl} alt={student.fullName} className="w-24 h-24 rounded-full object-cover bg-slate-100 border-2 border-slate-100" />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200">
                            <UserIcon size={48} className="text-slate-400" />
                        </div>
                    )}
                </div>

                <div className="flex-1 w-full">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">{student.fullName}</h1>
                            {/* Diagnóstico em Vermelho logo abaixo do nome */}
                            {canViewClinicalContent && (
                                <div className="text-sm font-bold text-red-600 mt-1 mb-1">
                                    {student.clinical?.diagnosis} {student.clinical?.cid ? `(CID: ${student.clinical.cid})` : ''}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-3 text-sm text-slate-500 mt-1">
                                <span>{age !== null ? `${age} anos` : '—'}</span>
                                <span>•</span>
                                <span>CPF: {student.cpf}</span>
                                {student.rg && <span>• RG: {student.rg}</span>}
                                {student.socialInfo?.nis && <span>• NIS: {student.socialInfo.nis}</span>}
                                <span>•</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {student.status === 'Active' ? 'Ativo' : 'Pendente'}
                                </span>
                                {student.cadastroStatus === 'PENDENTE' && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-300">
                                        Cadastro Rápido — Pendente
                                    </span>
                                )}
                            </div>
                        </div>
                        {currentUser.role === 'SPECIALIST' && currentUser.specialty && (
                            <div className="flex flex-col md:flex-row gap-2">
                                <button
                                    onClick={() => {
                                        const routes: Record<string, string> = {
                                            [Specialty.PSYCHOLOGY]: 'psychology',
                                            [Specialty.PSYCHOPEDAGOGY]: 'psychopedagogy',
                                            [Specialty.SOCIAL_WORK]: 'social-service',
                                            [Specialty.OCCUPATIONAL_THERAPY]: 'occupational-therapy',
                                            [Specialty.SPEECH_THERAPY]: 'speech-therapy',
                                            [Specialty.PHYSIOTHERAPY]: 'physiotherapy',
                                            [Specialty.NUTRITION]: 'nutrition'
                                        };
                                        const route = routes[currentUser.specialty];
                                        if (route) onNavigate(route, true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md transition-all font-bold"
                                >
                                    <Activity size={20} />
                                    {currentUser.specialty === Specialty.SOCIAL_WORK ? 'Acessar Busca Ativa' : `Acessar Prontuário de ${currentUser.specialty}`}
                                </button>

                                {currentUser.specialty === Specialty.SOCIAL_WORK && (
                                    <button
                                        onClick={() => onNavigate('social-interview', true)}
                                        className="flex items-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 shadow-md transition-all font-bold animate-pulse hover:animate-none"
                                    >
                                        <Heart size={20} />
                                        Entrevista Social
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 mt-6 gap-4">
                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                            <Phone size={18} className="text-slate-400 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium text-slate-700">{student.guardians?.[0]?.name} {student.guardians?.[0]?.relationship ? `(${student.guardians[0].relationship})` : ''}</p>
                                <p className="text-slate-500">{student.guardians?.[0]?.phone}</p>
                                {student.guardians?.[0]?.ethnicity && <p className="text-slate-500 text-xs mt-1">Etnia: {student.guardians[0].ethnicity}</p>}
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                            <MapPin size={18} className="text-slate-400 mt-0.5" />
                            <div className="text-sm">
                                <p className="text-slate-700">{student.address?.city ?? '—'} {student.address?.state ? `- ${student.address.state}` : ''}</p>
                                <p className="text-slate-500">{student.address?.street ?? ''}{student.address?.number ? `, ${student.address.number}` : ''}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Details */}
                <div className="lg:col-span-2 space-y-6">

                    {/* History Section (NEW) */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
                        {!canViewClinicalList && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
                                <div className="bg-white p-4 rounded-full shadow-lg mb-3">
                                    <Lock size={32} className="text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Acesso Restrito</h3>
                                <p className="text-slate-500 max-w-md">Dados clínicos e históricos de atendimento são visíveis apenas para especialistas e administradores autorizados.</p>
                            </div>
                        )}

                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                                <Clock size={20} className="text-primary-500" />
                                Histórico de Atendimentos
                            </h3>
                            {canViewClinicalContent && !isAddingSession && (
                                <button
                                    onClick={() => setIsAddingSession(true)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 hover:text-primary-600 transition-colors shadow-sm"
                                >
                                    <Plus size={16} /> Novo Atendimento
                                </button>
                            )}
                        </div>

                        {isAddingSession && canViewClinicalContent && (
                            <div className="p-6 border-b border-slate-100 bg-blue-50/50 animate-fadeIn">
                                <h4 className="text-sm font-bold text-slate-700 mb-3">Registrar Nova Evolução</h4>
                                <form onSubmit={handleSaveSession} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <label className="block">
                                            <span className="text-xs font-medium text-slate-500">Data</span>
                                            <input type="date" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border text-sm"
                                                value={newSession.date} onChange={e => setNewSession({ ...newSession, date: e.target.value })} />
                                        </label>
                                        <label className="block">
                                            <span className="text-xs font-medium text-slate-500">Especialidade</span>
                                            <select className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border text-sm"
                                                value={newSession.specialty} onChange={e => setNewSession({ ...newSession, specialty: e.target.value as Specialty })}>
                                                {Object.values(Specialty).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </label>
                                        <label className="block">
                                            <span className="text-xs font-medium text-slate-500">Profissional</span>
                                            <input type="text" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border text-sm"
                                                value={newSession.professionalName} onChange={e => setNewSession({ ...newSession, professionalName: e.target.value })} />
                                        </label>
                                    </div>
                                    <label className="block">
                                        <span className="text-xs font-medium text-slate-500">Relatório da Sessão</span>
                                        <textarea required rows={3} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border text-sm"
                                            placeholder="Descreva a evolução do aluno, técnicas utilizadas e observações relevantes..."
                                            value={newSession.notes} onChange={e => setNewSession({ ...newSession, notes: e.target.value })}></textarea>
                                    </label>
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => setIsAddingSession(false)} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded border border-transparent">
                                            Cancelar
                                        </button>
                                        <button type="submit" className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded shadow-sm">
                                            <Save size={14} /> Salvar Evolução
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="p-6 filter">
                            {(!student.history || student.history.length === 0) ? (
                                <div className="text-center py-8 text-slate-400">
                                    <FileText size={48} className="mx-auto mb-2 opacity-20" />
                                    <p>Nenhum atendimento registrado ainda.</p>
                                </div>
                            ) : (
                                <div className="relative border-l-2 border-slate-200 ml-3 space-y-8">
                                    {student.history.map((session, idx) => (
                                        <div key={session.id || idx} className="relative pl-8">
                                            {/* Timeline Dot */}
                                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${session.specialty === Specialty.PSYCHOLOGY ? 'bg-purple-500' :
                                                session.specialty === Specialty.SOCIAL_WORK ? 'bg-blue-500' : 'bg-orange-500'
                                                }`}></div>

                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border ${getSpecialtyColor(session.specialty)}`}>
                                                    {session.specialty}
                                                </span>
                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {new Date(session.date).toLocaleDateString('pt-BR')}
                                                </span>
                                                <span className="text-xs text-slate-500 font-medium">
                                                    • {session.professionalName}
                                                </span>
                                            </div>

                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap italic">
                                                {canViewClinicalContent ? session.notes : "[CONTEÚDO TÉCNICO RESTRITO - PERFIL ADMINISTRATIVO]"}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {canViewClinicalContent && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
                                <Activity size={20} className="text-primary-500" />
                                Dados Clínicos
                            </h3>
                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                                <div>
                                    <dt className="text-xs font-medium text-slate-500 uppercase">Diagnóstico</dt>
                                    <dd className="mt-1 text-sm text-red-600 font-bold">{student.clinical?.diagnosis}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-slate-500 uppercase">CID</dt>
                                    <dd className="mt-1 text-sm text-red-600 font-bold">{student.clinical?.cid || 'Não informado'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-slate-500 uppercase">Peso</dt>
                                    <dd className="mt-1 text-sm text-slate-900">{student.clinical?.weight || 'Não inf.'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-slate-500 uppercase">Altura</dt>
                                    <dd className="mt-1 text-sm text-slate-900">{student.clinical?.height || 'Não inf.'}</dd>
                                </div>
                                {student.clinical?.specialNeeds && student.clinical.specialNeeds.length > 0 && (
                                    <div className="md:col-span-2">
                                        <dt className="text-xs font-medium text-slate-500 uppercase">Necessidades Especiais</dt>
                                        <dd className="mt-1 flex gap-2 flex-wrap">
                                            {student.clinical.specialNeeds.map(need => (
                                                <span key={need} className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs border border-red-100">{need}</span>
                                            ))}
                                        </dd>
                                    </div>
                                )}
                                <div className="md:col-span-2">
                                    <dt className="text-xs font-medium text-slate-500 uppercase">Medicamentos</dt>
                                    <dd className="mt-1 text-sm text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        {student.clinical?.medications || 'Nenhum medicamento em uso.'}
                                    </dd>
                                </div>
                                <div className="md:col-span-2">
                                    <dt className="text-xs font-medium text-slate-500 uppercase">Histórico Terapêutico</dt>
                                    <dd className="mt-1 text-sm text-slate-900">
                                        {student.clinical?.therapiesHistory || 'Sem histórico registrado.'}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    )}
                </div>

                {/* Right Column: School, Documents & Other */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
                            <School size={20} className="text-orange-500" />
                            Escolaridade
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-slate-500">Instituição</p>
                                <p className="font-medium text-slate-800">{student.school?.schoolName ?? student.school?.name ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Ano/Série - Turno</p>
                                <p className="font-medium text-slate-800">{student.school?.grade ?? '—'} - {student.school?.shift || 'Não inf.'}</p>
                            </div>
                            {student.school?.schedule && (
                                <div>
                                    <p className="text-sm text-slate-500">Horário</p>
                                    <p className="font-medium text-slate-800">{student.school.schedule}</p>
                                </div>
                            )}
                            <div className="pt-2 border-t border-slate-100">
                                <p className="text-sm text-slate-500 mb-1">Apoio em Sala de Aula</p>

                                {linkedATs.length > 0 ? (
                                    <div className="flex flex-col gap-2 mt-2">
                                        <span className="inline-flex items-center w-fit px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                            Possui Profissional de Apoio (Sistema)
                                        </span>
                                        <div className="flex flex-col gap-1 mt-1">
                                            {linkedATs.map(at => (
                                                <div key={at.id} className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded border border-green-100">
                                                    <UserCheck size={16} className="text-green-600" />
                                                    <span className="font-medium">{at.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : student.school?.hasSpecialAide ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        Possui Acompanhante Particular/Outros
                                    </span>
                                ) : (
                                    <span className="text-sm text-slate-600">Não possui acompanhante</span>
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Dificuldades</p>
                                <p className="text-sm text-slate-700 italic">"{student.school?.difficulties}"</p>
                            </div>
                        </div>
                    </div>

                    {/* Social Info Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
                            <CreditCard size={20} className="text-green-600" />
                            Dados Sociais
                        </h3>
                        <div className="space-y-4">
                            {student.socialInfo?.nis && (
                                <div>
                                    <p className="text-sm text-slate-500">NIS</p>
                                    <p className="font-mono font-medium text-slate-800">{student.socialInfo.nis}</p>
                                </div>
                            )}
                            <div className="flex gap-2 flex-wrap">
                                {student.socialInfo?.bolsaFamilia && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Bolsa Família
                                    </span>
                                )}
                                {student.socialInfo?.bpc && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        BPC / LOAS
                                    </span>
                                )}
                                {!student.socialInfo?.bolsaFamilia && !student.socialInfo?.bpc && (
                                    <p className="text-sm text-slate-500">Nenhum benefício registrado.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Documents Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
                            <Paperclip size={20} className="text-slate-500" />
                            Documentos ({student.documents?.length || 0})
                        </h3>
                        {!student.documents || student.documents.length === 0 ? (
                            <p className="text-sm text-slate-400">Nenhum documento anexado.</p>
                        ) : (
                            <ul className="space-y-3">
                                {student.documents.map((doc, idx) => (
                                    <li key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <FileText size={20} className="text-primary-500 shrink-0" />
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-medium text-slate-800 truncate">{doc.type}</p>
                                                <p className="text-xs text-slate-500 truncate">{doc.fileName}</p>
                                            </div>
                                        </div>
                                        <a
                                            href={doc.url}
                                            download={doc.fileName}
                                            className="p-1.5 text-slate-400 hover:text-primary-600 rounded hover:bg-white transition-colors"
                                            title="Baixar arquivo"
                                        >
                                            <Download size={16} />
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
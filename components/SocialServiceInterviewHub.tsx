import React, { useState, useEffect } from 'react';
import {
    Heart,
    User as UserIcon,
    BookOpen,
    Users,
    Home,
    Stethoscope,
    Globe,
    Zap,
    ShieldAlert,
    MessageCircle,
    Save,
    ChevronLeft,
    Shield,
    History
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { SupabaseService } from '../services/SupabaseService';
import { Specialty, Student, Session, User } from '../types';

interface SocialInterviewForm {
    identificacao: {
        nomeEstudante: string;
        idade: string;
        serie: string;
        escola: string;
        endereco: string;
        telefones: string;
        responsavel: string;
    };
    historicoEscolar: {
        escolasAnteriores: string;
        repetencia: string;
        dificuldadesAprendizagem: string;
        relacionamentoEscola: string;
        frequenciaEscolar: string;
    };
    situacaoFamiliar: {
        composicaoFamiliar: string;
        rendaMensa: string;
        beneficiosSociais: string;
        dinamicaRelacional: string;
        conflitosFrequentes: string;
    };
    moradiaTerritorio: {
        tipoMoradia: string;
        infraestruturaBasica: string;
        acessibilidade: string;
        percepcaoSeguranca: string;
        areasLazer: string;
    };
    saudeEstudante: {
        doencasCronicas: string;
        medicamentos: string;
        deficiencias: string;
        acompanhamentosAtuais: string;
        historicoInternacoes: string;
    };
    convivenciaFamiliarComunitaria: {
        relacionamentoComunidade: string;
        amigosLazer: string;
        participacaoReligiosaSocial: string;
        redesApoio: string;
    };
    percepcoesPotencialidades: {
        desafiosPercebidos: string;
        sonhosProjetos: string;
        habilidadesDestaque: string;
        interessesPrincipais: string;
    };
    analiseTecnica: {
        parecerSocial: string;
        acoesPropostas: string;
        encaminhamentos: string;
        prioridadeCaso: 'Baixa' | 'Média' | 'Alta' | '';
    };
    reflexaoFinal: {
        observacoesEncerramento: string;
        dataEntrevista: string;
        statusEntrevista: 'PENDENTE' | 'CONCLUÍDO';
    };
}

const initialForm: SocialInterviewForm = {
    identificacao: { nomeEstudante: '', idade: '', serie: '', escola: '', endereco: '', telefones: '', responsavel: '' },
    historicoEscolar: { escolasAnteriores: '', repetencia: '', dificuldadesAprendizagem: '', relacionamentoEscola: '', frequenciaEscolar: '' },
    situacaoFamiliar: { composicaoFamiliar: '', rendaMensa: '', beneficiosSociais: '', dinamicaRelacional: '', conflitosFrequentes: '' },
    moradiaTerritorio: { tipoMoradia: '', infraestruturaBasica: '', acessibilidade: '', percepcaoSeguranca: '', areasLazer: '' },
    saudeEstudante: { doencasCronicas: '', medicamentos: '', deficiencias: '', acompanhamentosAtuais: '', historicoInternacoes: '' },
    convivenciaFamiliarComunitaria: { relacionamentoComunidade: '', amigosLazer: '', participacaoReligiosaSocial: '', redesApoio: '' },
    percepcoesPotencialidades: { desafiosPercebidos: '', sonhosProjetos: '', habilidadesDestaque: '', interessesPrincipais: '' },
    analiseTecnica: { parecerSocial: '', acoesPropostas: '', encaminhamentos: '', prioridadeCaso: '' },
    reflexaoFinal: { observacoesEncerramento: '', dataEntrevista: new Date().toISOString().split('T')[0], statusEntrevista: 'PENDENTE' }
};

interface Props {
    currentUser: User;
    preSelectedStudent?: Student;
    allStudents?: Student[];
    onNavigate: (page: string) => void;
}

const SocialServiceInterviewHub: React.FC<Props> = ({ currentUser, preSelectedStudent, allStudents, onNavigate }) => {
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(preSelectedStudent || null);
    const [formData, setFormData] = useState<SocialInterviewForm>(initialForm);
    const [activeTab, setActiveTab] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const { success: showToast, error: toastError } = useToast();

    // LGPD: Apenas Assistente Social ou Admin
    const isSocialWorker = currentUser.specialty === Specialty.SOCIAL_WORK || currentUser.role === 'ADMIN';

    useEffect(() => {
        if (selectedStudent) {
            const data = selectedStudent.clinical.social_interview;
            if (data && data.formData) {
                setFormData(data.formData);
            } else {
                // Pre-populate identification if new
                setFormData({
                    ...initialForm,
                    identificacao: {
                        ...initialForm.identificacao,
                        nomeEstudante: selectedStudent.fullName,
                        idade: calculateAge(selectedStudent.birthDate).toString(),
                        escola: selectedStudent.school.schoolName,
                        endereco: `${selectedStudent.address.street}, ${selectedStudent.address.number}`,
                        responsavel: selectedStudent.guardians[0]?.name || ''
                    }
                });
            }
        } else {
            setFormData(initialForm);
        }
    }, [selectedStudent]);

    function calculateAge(birthDate?: string) {
        if (!birthDate) return '-';
        const birth = new Date(birthDate);
        if (isNaN(birth.getTime())) return '-';
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    }

    const handleChange = (section: keyof SocialInterviewForm, field: string, value: any) => {
        if (!isSocialWorker) return;
        setFormData(prev => ({
            ...prev,
            [section]: { ...(prev[section] as any), [field]: value }
        }));
    };

    const handleSave = async () => {
        if (!selectedStudent || !isSocialWorker) return;
        setIsLoading(true);

        try {
            const now = new Date().toISOString();
            const updatedStudent = {
                ...selectedStudent,
                clinical: {
                    ...selectedStudent.clinical,
                    social_interview: {
                        formData,
                        lastUpdate: now,
                        professionalName: currentUser.name
                    }
                }
            };

            await SupabaseService.saveStudent(updatedStudent);

            // Registrar no Histórico
            const historyRecord: Session = {
                id: crypto.randomUUID(),
                date: now.split('T')[0],
                specialty: Specialty.SOCIAL_WORK,
                professionalName: currentUser.name,
                notes: `Preenchimento de Entrevista Social - Contexto Escolar (Status: ${formData.reflexaoFinal.statusEntrevista})`,
                serviceType: 'Entrevista Social',
                content: { summary: 'Instrumento Técnico de Avaliação', status: formData.reflexaoFinal.statusEntrevista }
            };
            await SupabaseService.saveSession(historyRecord, selectedStudent.id, currentUser.id);

            showToast('Entrevista Social salva com sucesso!');
        } catch (err: any) {
            console.error('Erro ao salvar entrevista:', err);
            toastError('Erro ao salvar os dados da entrevista.');
        } finally {
            setIsLoading(false);
        }
    };

    const tabs = [
        { id: 1, label: 'Identificação', icon: UserIcon },
        { id: 2, label: 'Histórico Escolar', icon: BookOpen },
        { id: 3, label: 'Família', icon: Users },
        { id: 4, label: 'Moradia', icon: Home },
        { id: 5, label: 'Saúde', icon: Stethoscope },
        { id: 6, label: 'Convivência', icon: Globe },
        { id: 7, label: 'Percepções', icon: Zap },
        { id: 8, label: 'Análise Técnica', icon: ShieldAlert },
        { id: 9, label: 'Reflexão', icon: MessageCircle }
    ];

    const StyledInput = ({ label, value, onChange, placeholder, rows }: any) => (
        <div className="mb-6 group">
            <label className="flex items-center gap-2 text-[12px] font-bold text-[#333333] uppercase tracking-wider mb-2.5 px-1 group-focus-within:text-[#1E7F85] transition-colors">
                {label}
            </label>
            {rows ? (
                <textarea
                    className="w-full rounded-[20px] border-[1.5px] border-[#1E7F85] bg-white p-4 text-[#333333] placeholder:text-slate-300 focus:ring-4 focus:ring-[#1E7F85]/5 focus:border-[#1E7F85] outline-none transition-all min-h-[120px] shadow-sm hover:bg-slate-50/30"
                    rows={rows}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={!isSocialWorker}
                />
            ) : (
                <input
                    className="w-full h-[52px] rounded-full border-[1.5px] border-[#1E7F85] bg-white px-6 text-[#333333] placeholder:text-slate-300 focus:ring-4 focus:ring-[#1E7F85]/5 focus:border-[#1E7F85] outline-none transition-all shadow-sm hover:bg-slate-50/30"
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={!isSocialWorker}
                />
            )}
        </div>
    );

    if (!selectedStudent) {
        return (
            <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-rose-100">
                    <Heart size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Entrevista Social – Contexto Escolar</h2>
                <p className="text-slate-500 mt-2 max-w-sm">Selecione um aluno no prontuário para iniciar este instrumento técnico.</p>
                <button
                    onClick={() => onNavigate('list')}
                    className="mt-8 px-8 py-4 bg-[#1E7F85] text-white rounded-full font-bold uppercase tracking-widest shadow-lg hover:shadow-xl hover:bg-[#165a5e] transition-all"
                >
                    Ir para Alunos
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F7F5F0] py-12 px-4 animate-fadeIn">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-[#1E7F85]/10 overflow-hidden mb-8">
                    <div className="bg-[#1E7F85] p-10 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                                <Heart size={36} className="text-[#F5C474]" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold uppercase tracking-widest">Entrevista Social</h2>
                                <p className="text-[#F7F5F0]/80 text-sm mt-1 font-medium tracking-wide">Contexto Escolar & Análise Técnica</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#F5C474] bg-white/10 px-3 py-1 rounded-full mb-2 border border-white/10">Paciente</span>
                            <span className="text-xl font-bold tracking-tight">{selectedStudent.fullName}</span>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="px-6 py-4 bg-[#F7F5F0]/50 border-b border-[#1E7F85]/10 flex overflow-x-auto no-scrollbar gap-3 sticky top-0 z-20 backdrop-blur-sm">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-6 py-4 rounded-full transition-all duration-300 whitespace-nowrap group ${activeTab === tab.id
                                    ? 'bg-[#1E7F85] text-white shadow-lg scale-[1.02]'
                                    : 'text-[#1E7F85]/60 hover:bg-[#1E7F85]/5 hover:text-[#1E7F85]'
                                    }`}
                            >
                                <tab.icon size={18} className={activeTab === tab.id ? 'text-[#F5C474]' : 'text-[#1E7F85]/40 group-hover:text-[#1E7F85]'} />
                                <span className="text-xs font-bold uppercase tracking-widest">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="p-10 bg-white">
                        {/* Tab Content */}
                        {activeTab === 1 && (
                            <div className="animate-fadeIn">
                                <h4 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-3">
                                    <UserIcon className="text-[#1E7F85]" /> Identificação do Estudante
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                                    <StyledInput label="Nome Completo" value={formData.identificacao.nomeEstudante} onChange={(e: any) => handleChange('identificacao', 'nomeEstudante', e.target.value)} />
                                    <StyledInput label="Idade / Data de Nasc." value={formData.identificacao.idade} onChange={(e: any) => handleChange('identificacao', 'idade', e.target.value)} />
                                    <StyledInput label="Série / Ciclo" value={formData.identificacao.serie} onChange={(e: any) => handleChange('identificacao', 'serie', e.target.value)} />
                                    <StyledInput label="Unidade Escolar" value={formData.identificacao.escola} onChange={(e: any) => handleChange('identificacao', 'escola', e.target.value)} />
                                    <div className="md:col-span-2">
                                        <StyledInput label="Endereço Residencial" value={formData.identificacao.endereco} onChange={(e: any) => handleChange('identificacao', 'endereco', e.target.value)} />
                                    </div>
                                    <StyledInput label="Contatos (Telefone/Whats)" value={formData.identificacao.telefones} onChange={(e: any) => handleChange('identificacao', 'telefones', e.target.value)} />
                                    <StyledInput label="Responsável Principal" value={formData.identificacao.responsavel} onChange={(e: any) => handleChange('identificacao', 'responsavel', e.target.value)} />
                                </div>
                            </div>
                        )}

                        {activeTab === 2 && (
                            <div className="animate-fadeIn">
                                <h4 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-3">
                                    <BookOpen className="text-[#1E7F85]" /> Histórico Escolar
                                </h4>
                                <StyledInput label="Escolas Frequentadas Anteriormente" rows={3} value={formData.historicoEscolar.escolasAnteriores} onChange={(e: any) => handleChange('historicoEscolar', 'escolasAnteriores', e.target.value)} />
                                <StyledInput label="Repetência ou Interrupção (Quais e Por que?)" rows={2} value={formData.historicoEscolar.repetencia} onChange={(e: any) => handleChange('historicoEscolar', 'repetencia', e.target.value)} />
                                <StyledInput label="Dificuldades de Aprendizagem Percebidas" rows={3} value={formData.historicoEscolar.dificuldadesAprendizagem} onChange={(e: any) => handleChange('historicoEscolar', 'dificuldadesAprendizagem', e.target.value)} />
                                <StyledInput label="Relacionamento com a Escola / Professores" rows={2} value={formData.historicoEscolar.relacionamentoEscola} onChange={(e: any) => handleChange('historicoEscolar', 'relacionamentoEscola', e.target.value)} />
                                <StyledInput label="Frequência Escolar Atual" value={formData.historicoEscolar.frequenciaEscolar} onChange={(e: any) => handleChange('historicoEscolar', 'frequenciaEscolar', e.target.value)} />
                            </div>
                        )}

                        {activeTab === 3 && (
                            <div className="animate-fadeIn">
                                <h4 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-3">
                                    <Users className="text-[#1E7F85]" /> Situação Familiar
                                </h4>
                                <StyledInput label="Composição Familiar (Quem reside na casa)" rows={3} value={formData.situacaoFamiliar.composicaoFamiliar} onChange={(e: any) => handleChange('situacaoFamiliar', 'composicaoFamiliar', e.target.value)} />
                                <StyledInput label="Renda Mensal e Fonte de Sustento" value={formData.situacaoFamiliar.rendaMensa} onChange={(e: any) => handleChange('situacaoFamiliar', 'rendaMensa', e.target.value)} />
                                <StyledInput label="Benefícios Sociais (Bolsa Família, BPC, etc.)" value={formData.situacaoFamiliar.beneficiosSociais} onChange={(e: any) => handleChange('situacaoFamiliar', 'beneficiosSociais', e.target.value)} />
                                <StyledInput label="Dinâmica Relacional e Afetiva" rows={3} value={formData.situacaoFamiliar.dinamicaRelacional} onChange={(e: any) => handleChange('situacaoFamiliar', 'dinamicaRelacional', e.target.value)} />
                                <StyledInput label="Conflitos ou Tensões Familiares Frequentes" rows={2} value={formData.situacaoFamiliar.conflitosFrequentes} onChange={(e: any) => handleChange('situacaoFamiliar', 'conflitosFrequentes', e.target.value)} />
                            </div>
                        )}

                        {activeTab === 4 && (
                            <div className="animate-fadeIn">
                                <h4 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-3">
                                    <Home className="text-[#1E7F85]" /> Moradia e Território
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                                    <StyledInput label="Tipo de Moradia (Alugada, própria, cedida)" value={formData.moradiaTerritorio.tipoMoradia} onChange={(e: any) => handleChange('moradiaTerritorio', 'tipoMoradia', e.target.value)} />
                                    <StyledInput label="Infraestrutura Básica (Água, esgoto, energia)" value={formData.moradiaTerritorio.infraestruturaBasica} onChange={(e: any) => handleChange('moradiaTerritorio', 'infraestruturaBasica', e.target.value)} />
                                </div>
                                <StyledInput label="Condições de Acessibilidade no Imóvel" value={formData.moradiaTerritorio.acessibilidade} onChange={(e: any) => handleChange('moradiaTerritorio', 'acessibilidade', e.target.value)} />
                                <StyledInput label="Percepção de Segurança no Território" rows={2} value={formData.moradiaTerritorio.percepcaoSeguranca} onChange={(e: any) => handleChange('moradiaTerritorio', 'percepcaoSeguranca', e.target.value)} />
                                <StyledInput label="Áreas de Lazer e Convivência Próximas" rows={2} value={formData.moradiaTerritorio.areasLazer} onChange={(e: any) => handleChange('moradiaTerritorio', 'areasLazer', e.target.value)} />
                            </div>
                        )}

                        {activeTab === 5 && (
                            <div className="animate-fadeIn">
                                <h4 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-3">
                                    <Stethoscope className="text-[#1E7F85]" /> Saúde do Estudante
                                </h4>
                                <StyledInput label="Doenças Crônicas ou Agudas" rows={2} value={formData.saudeEstudante.doencasCronicas} onChange={(e: any) => handleChange('saudeEstudante', 'doencasCronicas', e.target.value)} />
                                <StyledInput label="Uso de Medicamentos Contínuos" rows={2} value={formData.saudeEstudante.medicamentos} onChange={(e: any) => handleChange('saudeEstudante', 'medicamentos', e.target.value)} />
                                <StyledInput label="Deficiências (Física, Sensorial, Intelectual, etc.)" value={formData.saudeEstudante.deficiencias} onChange={(e: any) => handleChange('saudeEstudante', 'deficiencias', e.target.value)} />
                                <StyledInput label="Acompanhamentos Atuais (Médico, Psi, etc.)" rows={2} value={formData.saudeEstudante.acompanhamentosAtuais} onChange={(e: any) => handleChange('saudeEstudante', 'acompanhamentosAtuais', e.target.value)} />
                                <StyledInput label="Histórico de Internações ou Cirurgias" rows={2} value={formData.saudeEstudante.historicoInternacoes} onChange={(e: any) => handleChange('saudeEstudante', 'historicoInternacoes', e.target.value)} />
                            </div>
                        )}

                        {activeTab === 6 && (
                            <div className="animate-fadeIn">
                                <h4 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-3">
                                    <Globe className="text-[#1E7F85]" /> Convivência Familiar e Comunitária
                                </h4>
                                <StyledInput label="Relacionamento com a Comunidade / Vizinhos" rows={2} value={formData.convivenciaFamiliarComunitaria.relacionamentoComunidade} onChange={(e: any) => handleChange('convivenciaFamiliarComunitaria', 'relacionamentoComunidade', e.target.value)} />
                                <StyledInput label="Amigos e Atividades de Lazer" rows={2} value={formData.convivenciaFamiliarComunitaria.amigosLazer} onChange={(e: any) => handleChange('convivenciaFamiliarComunitaria', 'amigosLazer', e.target.value)} />
                                <StyledInput label="Participação Religiosa ou Social" value={formData.convivenciaFamiliarComunitaria.participacaoReligiosaSocial} onChange={(e: any) => handleChange('convivenciaFamiliarComunitaria', 'participacaoReligiosaSocial', e.target.value)} />
                                <StyledInput label="Redes de Apoio Informal (Parentes, Amigos)" rows={2} value={formData.convivenciaFamiliarComunitaria.redesApoio} onChange={(e: any) => handleChange('convivenciaFamiliarComunitaria', 'redesApoio', e.target.value)} />
                            </div>
                        )}

                        {activeTab === 7 && (
                            <div className="animate-fadeIn">
                                <h4 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-3">
                                    <Zap className="text-[#1E7F85]" /> Percepções e Potencialidades
                                </h4>
                                <StyledInput label="Principais Desafios Percebidos pela Família/Estudante" rows={3} value={formData.percepcoesPotencialidades.desafiosPercebidos} onChange={(e: any) => handleChange('percepcoesPotencialidades', 'desafiosPercebidos', e.target.value)} />
                                <StyledInput label="Sonhos e Projetos de Vida" rows={2} value={formData.percepcoesPotencialidades.sonhosProjetos} onChange={(e: any) => handleChange('percepcoesPotencialidades', 'sonhosProjetos', e.target.value)} />
                                <StyledInput label="Habilidades em Destaque" rows={2} value={formData.percepcoesPotencialidades.habilidadesDestaque} onChange={(e: any) => handleChange('percepcoesPotencialidades', 'habilidadesDestaque', e.target.value)} />
                                <StyledInput label="Interesses Principais (Hobbies, esportes)" value={formData.percepcoesPotencialidades.interessesPrincipais} onChange={(e: any) => handleChange('percepcoesPotencialidades', 'interessesPrincipais', e.target.value)} />
                            </div>
                        )}

                        {activeTab === 8 && (
                            <div className="animate-fadeIn">
                                <h4 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-3">
                                    <ShieldAlert className="text-[#1E7F85]" /> Análise Técnica do Serviço Social
                                </h4>
                                <StyledInput label="Parecer Social e Avaliação Técnica" rows={5} value={formData.analiseTecnica.parecerSocial} onChange={(e: any) => handleChange('analiseTecnica', 'parecerSocial', e.target.value)} />
                                <StyledInput label="Ações Propostas e Intervenções" rows={3} value={formData.analiseTecnica.acoesPropostas} onChange={(e: any) => handleChange('analiseTecnica', 'acoesPropostas', e.target.value)} />
                                <StyledInput label="Encaminhamentos Realizados ou Sugeridos" rows={3} value={formData.analiseTecnica.encaminhamentos} onChange={(e: any) => handleChange('analiseTecnica', 'encaminhamentos', e.target.value)} />
                                <div className="mb-6">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Prioridade do Caso</label>
                                    <div className="flex gap-4">
                                        {['Baixa', 'Média', 'Alta'].map(p => (
                                            <button
                                                key={p}
                                                onClick={() => handleChange('analiseTecnica', 'prioridadeCaso', p)}
                                                className={`px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest border-2 transition-all ${formData.analiseTecnica.prioridadeCaso === p
                                                    ? 'bg-[#1E7F85] border-[#1E7F85] text-white'
                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-[#1E7F85]'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 9 && (
                            <div className="animate-fadeIn">
                                <h4 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-3">
                                    <MessageCircle className="text-[#1E7F85]" /> Reflexão Final e Fechamento
                                </h4>
                                <StyledInput label="Campo de Reflexão Final / Observações de Encerramento" rows={8} value={formData.reflexaoFinal.observacoesEncerramento} onChange={(e: any) => handleChange('reflexaoFinal', 'observacoesEncerramento', e.target.value)} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                                    <StyledInput label="Data da Entrevista" type="date" value={formData.reflexaoFinal.dataEntrevista} onChange={(e: any) => handleChange('reflexaoFinal', 'dataEntrevista', e.target.value)} />
                                    <div className="mb-6">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Status da Entrevista</label>
                                        <select
                                            value={formData.reflexaoFinal.statusEntrevista}
                                            onChange={(e) => handleChange('reflexaoFinal', 'statusEntrevista', e.target.value)}
                                            className="w-full h-14 bg-slate-50 border-2 border-slate-200 rounded-full px-6 text-slate-800 focus:border-[#1E7F85] transition-all outline-none appearance-none font-bold"
                                        >
                                            <option value="PENDENTE">🟡 PENDENTE / EM ANDAMENTO</option>
                                            <option value="CONCLUÍDO">🟢 CONCLUÍDO / ANALISADO</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-slate-100">
                            <div className="flex items-center gap-4 text-slate-400">
                                <Shield size={20} className="text-rose-500" />
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none">Sigilo Profissional</p>
                                    <p className="text-xs font-medium">Acesso restrito ao Serviço Social (LGPD).</p>
                                </div>
                            </div>
                            <div className="flex gap-4 w-full md:w-auto">
                                <button
                                    onClick={() => onNavigate('list')}
                                    className="flex-1 md:flex-none px-8 py-4 bg-slate-100 text-slate-600 rounded-full font-bold uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <ChevronLeft size={18} /> Voltar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isLoading || !isSocialWorker}
                                    className="flex-1 md:flex-none px-12 py-4 bg-emerald-600 text-white rounded-full font-bold uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? 'Salvando...' : <><Save size={18} /> Salvar Entrevista</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Histórico Simplificado */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
                    <h3 className="font-bold text-slate-700 uppercase tracking-[0.2em] text-sm mb-8 flex items-center gap-3">
                        <History size={18} className="text-[#1E7F85]" /> Registro de Intervenções Recentes
                    </h3>
                    <div className="space-y-4">
                        {(selectedStudent.history || [])
                            .filter(h => h.serviceType === 'Entrevista Social')
                            .slice(0, 3)
                            .map(h => (
                                <div key={h.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:border-[#1E7F85]/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#1E7F85]">
                                            <MessageCircle size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700">{h.notes}</p>
                                            <p className="text-xs text-slate-400 font-medium">{new Date(h.date).toLocaleDateString('pt-BR')} • {h.professionalName}</p>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${h.content?.status === 'CONCLUÍDO' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                        }`}>
                                        {h.content?.status || 'REGISTRADO'}
                                    </div>
                                </div>
                            ))
                        }
                        {!(selectedStudent.history || []).some(h => h.serviceType === 'Entrevista Social') && (
                            <p className="text-slate-400 text-sm italic text-center py-4">Nenhum registro anterior de entrevista social para este aluno.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialServiceInterviewHub;

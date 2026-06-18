
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
    SupportProfessional,
    School,
    Student,
    User as UserType,
    AuditAction,
    SupportProfessionalAttachment,
    SupportProfessionalAttachmentCategory,
    Unit,
    isSupportProfessionalActive,
    canViewInactiveSupportProfessionals,
    canUnlinkSupportProfessional,
} from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { formatarNomeBR } from '../utils/formatters';
import { Save, UserCog, X, User, School as SchoolIcon, BookOpen, Link2Off, Edit, Briefcase, GraduationCap, Upload, Search, ChevronDown, CheckCircle, AlertCircle, Download, FileSpreadsheet, Loader2, Fingerprint, Paperclip, ArrowLeft, LayoutList, Calendar, FileBarChart, ListFilter, History, RotateCcw, Users, UserCheck, UserX, UserMinus, Plus } from 'lucide-react';
import { RelatorioProfissionais } from '../src/components/reports';
import { ConfirmModal } from './ConfirmModal';
import { CSVImporter } from './CSVImporter';
import SearchableSelect from './SearchableSelect';

// Componente de Toast Simples
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl transform transition-all animate-slideIn ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
            }`}>
            {type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
            <div>
                <h4 className="font-bold text-lg">{type === 'success' ? 'Sucesso!' : 'Atenção'}</h4>
                <p className="text-white/90">{message}</p>
            </div>
            <button onClick={onClose} className="ml-4 p-1 hover:bg-white/20 rounded-full transition-colors">
                <X size={18} />
            </button>
        </div>
    );
};

// Função auxiliar para normalizar strings (remover acentos, espaços extras e converter para minúsculas)
const normalizeString = (str: string | undefined | null): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize('NFD') // Decompor caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '') // Remover marcas de acento
        .replace(/[^a-z0-9\s]/gi, '') // Remover pontuação como pontos e hífens
        .replace(/\s+/g, ' ') // Substituir múltiplos espaços por um só
        .trim();
};

const formatUnlinkedDatePt = (iso: string | null | undefined): string => {
    if (!iso) return '—';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** Data e hora completas para o histórico de desvinculações. */
const formatUnlinkedDateTimePt = (iso: string | null | undefined): string => {
    if (!iso) return '—';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '—';
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

const startOfLocalDay = (yyyyMmDd: string): Date | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd.trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d, 0, 0, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
};

const endOfLocalDay = (yyyyMmDd: string): Date | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd.trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d, 23, 59, 59, 999);
    return Number.isNaN(dt.getTime()) ? null : dt;
};

const sanitizeCPF = (cpf: string | undefined | null): string => {
    if (!cpf) return '';
    return cpf.replace(/\D/g, '');
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const maskCPF = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

const ATTACHMENT_SLOT_DEFS: {
    category: SupportProfessionalAttachmentCategory;
    label: string;
    hint: string;
}[] = [
    { category: 'rg', label: 'RG', hint: 'Documento de identidade (PDF ou imagem)' },
    { category: 'cpf_documento', label: 'CPF (documento)', hint: 'Comprovante ou cópia do CPF' },
    { category: 'certificado', label: 'Certificado / diploma', hint: 'Formação ou certificação profissional' },
    { category: 'conta_bancaria', label: 'Conta bancária', hint: 'Comprovante de dados bancários' },
    { category: 'historico_escolar', label: 'Histórico escolar', hint: 'Documentação escolar quando aplicável' },
];

interface SupportProfessionalManagementProps {
    currentUser?: UserType;
}

const SUPPORT_PROF_LIST_PATH = '/app/support-professionals';

const EMPTY_ADDRESS: NonNullable<SupportProfessional['address']> = {
    street: '',
    number: '',
    district: '',
    city: '',
    state: '',
    zipCode: '',
};

const UNLINK_MOTIVO_MIN_LEN = 15;

/** Filtro da lista: desvinculados = cadastro desativado (soft delete). */
type SupportProfessionalListStatusFilter = 'all' | 'ativo' | 'desvinculado' | 'sem_vinculo';

export const SupportProfessionalManagement: React.FC<SupportProfessionalManagementProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { profId: editProfId } = useParams<{ profId?: string }>();
    const normalizedPath = location.pathname.replace(/\/$/, '');
    const isNewFormPage = normalizedPath.endsWith('/support-professionals/new');
    const isFormPage = isNewFormPage || Boolean(editProfId);
    const appliedEditRef = useRef<string | null>(null);

    const [professionals, setProfessionals] = useState<SupportProfessional[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [isUnlinking, setIsUnlinking] = useState(false);
    const [isReactivating, setIsReactivating] = useState(false);
    const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
    const [pendingUnlinkId, setPendingUnlinkId] = useState<string | null>(null);
    const [unlinkMotivo, setUnlinkMotivo] = useState('');
    const [professionalsReady, setProfessionalsReady] = useState(false);
    const [showImporter, setShowImporter] = useState(false);
    const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('ALL');
    const [nameSearchTerm, setNameSearchTerm] = useState('');
    const [cpfSearchTerm, setCpfSearchTerm] = useState('');
    const [statusListFilter, setStatusListFilter] = useState<SupportProfessionalListStatusFilter>('all');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const attachmentInputRefs = useRef<Partial<Record<SupportProfessionalAttachmentCategory, HTMLInputElement | null>>>({});
    const [formModalTab, setFormModalTab] = useState<'dados' | 'anexos'>('dados');
    const [pendingAttachmentFiles, setPendingAttachmentFiles] = useState<Partial<Record<SupportProfessionalAttachmentCategory, File>>>({});
    const [savingProfessional, setSavingProfessional] = useState(false);
    const [historySchoolFilter, setHistorySchoolFilter] = useState<string>('ALL');
    const [historyDateFrom, setHistoryDateFrom] = useState<string>('');
    const [historyDateTo, setHistoryDateTo] = useState<string>('');
    type MainListTab = 'lista' | 'relatorios' | 'historico';
    const [mainListTab, setMainListTab] = useState<MainListTab>(() => {
        if (isFormPage) return 'lista';
        const q = new URLSearchParams(location.search);
        if (q.get('tab') === 'relatorios' || q.get('relatorio') === '1') return 'relatorios';
        if (q.get('tab') === 'historico') return 'historico';
        return 'lista';
    });
    const isEscola = currentUser?.role === 'ESCOLA';

    const seesSupportProfInactive = Boolean(currentUser && canViewInactiveSupportProfessionals(currentUser));

    useEffect(() => {
        if (isFormPage) return;
        const q = new URLSearchParams(location.search);
        if (q.get('tab') === 'relatorios' || q.get('relatorio') === '1') {
            setMainListTab('relatorios');
        } else if (q.get('tab') === 'historico') {
            setMainListTab(seesSupportProfInactive ? 'historico' : 'lista');
        }
    }, [location.search, isFormPage, seesSupportProfInactive]);

    const letterheadUnitForRelatorio = useMemo((): Unit | undefined => {
        const q = new URLSearchParams(location.search);
        const unitParam = (q.get('unit') || '').toUpperCase();
        if (unitParam === 'COCAL') return 'COCAL';
        if (unitParam === 'SEDE') return 'SEDE';
        if (currentUser?.role === 'SECRETARIA_SEDE') return 'SEDE';
        if (currentUser?.scope === 'COCAL') return 'COCAL';
        return undefined;
    }, [location.search, currentUser?.role, currentUser?.scope]);

    // Estados para formulário
    const numberInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let maskedValue = value;

        if (name === 'cpf') {
            maskedValue = value
                .replace(/\D/g, '')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                .replace(/(-\d{2})\d+?$/, '$1');
        } else if (name === 'phone') {
            maskedValue = value
                .replace(/\D/g, '')
                .replace(/(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2')
                .replace(/(-\d{4})\d+?$/, '$1');
        }

        setFormData(prev => ({ ...prev, [name]: maskedValue }));
    };

    const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let maskedValue = value;

        if (name === 'zipCode') {
            maskedValue = value
                .replace(/\D/g, '')
                .replace(/(\d{5})(\d)/, '$1-$2')
                .replace(/(-\d{3})\d+?$/, '$1');
        }

        setFormData(prev => ({
            ...prev,
            address: {
                ...EMPTY_ADDRESS,
                ...(prev.address || {}),
                [name]: maskedValue,
            },
        }));
    };

    const [formData, setFormData] = useState<Partial<SupportProfessional>>({
        name: '',
        photoUrl: '',
        cpf: '',
        phone: '',
        email: '',
        education: '',
        contractStartDate: '',
        workload: '',
        address: { ...EMPTY_ADDRESS },
        schoolId: '',
        regentTeacher: '',
        studentId: '',
        attachments: [],
        status: 'ativo',
        unlinkedAt: null,
    });

    const academicOptions = [
        "Ensino Médio Completo",
        "Magistério",
        "Pedagogia",
        "Psicologia",
        "Serviço Social",
        "Fonoaudiologia",
        "Terapia Ocupacional",
        "Fisioterapia",
        "Licenciatura em Educação Especial",
        "Outra"
    ];

    useEffect(() => {
        // Rota deve passar currentUser (App.tsx). Sem perfil, não dispara carga duplicada/errada.
        if (!currentUser) return;
        // Se o usuário for ESCOLA, só carrega os dados quando o schoolId estiver disponível
        if (currentUser.role === 'ESCOLA' && !currentUser.schoolId) {
            return;
        }
        loadData();
    }, [currentUser]);



    // Efeito para busca automática de CEP
    useEffect(() => {
        const fetchCEP = async () => {
            const cep = formData.address?.zipCode?.replace(/\D/g, '') || '';
            if (cep.length === 8) {
                try {
                    const { CEPService } = await import('../services/CEPService');
                    const addressData = await CEPService.fetchAddress(cep);
                    if (addressData) {
                        setFormData(prev => ({
                            ...prev,
                            address: {
                                ...EMPTY_ADDRESS,
                                ...(prev.address || {}),
                                street: addressData.street,
                                district: addressData.district,
                                city: addressData.city,
                                state: addressData.state,
                            },
                        }));
                        // Foco automático no campo Número
                        setTimeout(() => numberInputRef.current?.focus(), 100);
                    }
                } catch (error) {
                    console.error('Erro ao buscar CEP:', error);
                }
            }
        };
        fetchCEP();
    }, [formData.address?.zipCode]);

    const loadData = async () => {
        if (!currentUser) return;
        setProfessionalsReady(false);
        try {
            // Se for escola, busca apenas os profissionais e alunos daquela escola
            const schoolFilter = currentUser.role === 'ESCOLA' ? currentUser.schoolId : undefined;
            
            console.log(`[SupportProf] Carregando dados para role: ${currentUser.role}, filtro_escola: ${schoolFilter || 'Nenhum'}`);
            
            const [profs, schoolsData, studentsData] = await Promise.all([
                SupabaseService.getSupportProfessionals(schoolFilter),
                SupabaseService.getSchools(),
                // Lista compacta: suficiente para vínculo escola/aluno e bem mais leve que select('*')
                SupabaseService.getStudents(undefined, { compactList: true }),
            ]);
            
            setProfessionals(profs);
            setSchools(schoolsData);
            setStudents(studentsData);
            
            console.log(`[SupportProf] Sucesso! ${profs.length} profissionais e ${studentsData.length} alunos carregados.`);
        } catch (error) {
            console.error('ERRO_PROFISSIONAIS:', error);
            showNotification('Erro ao carregar dados.', 'error');
        } finally {
            setProfessionalsReady(true);
        }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validação explícita para feedback ao usuário
        if (!formData.name) {
            showNotification('Por favor, preencha o Nome Completo.', 'error');
            return;
        }
        if (!formData.schoolId) {
            showNotification('Por favor, selecione uma Escola de Lotação.', 'error');
            return;
        }
        // studentId é opcional — profissional pode ser vinculado apenas à escola

        // Validação de Duplicidade por CPF (Apenas se CPF estiver preenchido)
        if (formData.cpf) {
            const cleanCPF = sanitizeCPF(formData.cpf);
            const isDuplicate = professionals.some(p =>
                sanitizeCPF(p.cpf) === cleanCPF && p.id !== formData.id
            );

            if (isDuplicate) {
                showNotification('Atenção: Já existe um profissional cadastrado com este CPF.', 'error');
                return;
            }
        }

        let mergedAttachments: SupportProfessionalAttachment[] = [...(formData.attachments || [])];
        const pendingEntries = Object.entries(pendingAttachmentFiles) as [SupportProfessionalAttachmentCategory, File][];
        setSavingProfessional(true);
        try {
            for (const [cat, file] of pendingEntries) {
                if (!file) continue;
                const uploaded = await SupabaseService.uploadSupportProfessionalAttachmentFile(file, cat);
                mergedAttachments = mergedAttachments.filter(a => a.category !== cat);
                mergedAttachments.push(uploaded);
            }
        } catch (uploadErr: any) {
            console.error(uploadErr);
            showNotification(uploadErr?.message || 'Erro ao enviar anexos.', 'error');
            setSavingProfessional(false);
            return;
        }

        const newProf: SupportProfessional = {
            id: formData.id || '', // Se for novo, manda vazio para cair no INSERT do backend
            name: formData.name,
            photoUrl: formData.photoUrl || '',
            cpf: sanitizeCPF(formData.cpf) || '',
            phone: formData.phone || '',
            email: formData.email || '',
            education: formData.education || '',
            contractStartDate: formData.contractStartDate || '',
            workload: formData.workload || '',
            address: { ...EMPTY_ADDRESS, ...(formData.address || {}) },
            schoolId: formData.schoolId,
            regentTeacher: formData.regentTeacher || '',
            studentId: formData.studentId,
            createdAt: formData.createdAt || new Date().toISOString(),
            attachments: mergedAttachments,
            status: formData.status ?? 'ativo',
            unlinkedAt: formData.unlinkedAt ?? null,
        };

        try {
            await SupabaseService.saveSupportProfessional(newProf);

            // Registro de Auditoria: Profissional Apoio
            const acao = formData.id ? AuditAction.UPDATE : AuditAction.CREATE;
            if (currentUser) {
                await SupabaseService.logAction(currentUser as any, acao, 'PROFISSIONAIS_APOIO', newProf.name);
            }

            await loadData();
            navigate(SUPPORT_PROF_LIST_PATH);
            resetForm();
            setPendingAttachmentFiles({});
            showNotification('Profissional salvo com sucesso!', 'success');
        } catch (err: any) {
            console.error(err);
            showNotification(`Erro ao salvar profissional: ${err.message || 'Erro desconhecido'}`, 'error');
        } finally {
            setSavingProfessional(false);
        }
    };

    const resetForm = () => {
        setFormModalTab('dados');
        setPendingAttachmentFiles({});
        ATTACHMENT_SLOT_DEFS.forEach(({ category }) => {
            const el = attachmentInputRefs.current[category];
            if (el) el.value = '';
        });
        setFormData({
            name: '',
            photoUrl: '',
            cpf: '',
            phone: '',
            email: '',
            education: '',
            contractStartDate: '',
            workload: '',
            address: { ...EMPTY_ADDRESS },
            schoolId: '',
            regentTeacher: '',
            studentId: '',
            attachments: [],
            status: 'ativo',
            unlinkedAt: null,
        });
    };

    const applyProfToForm = useCallback((prof: SupportProfessional) => {
        const address = { ...EMPTY_ADDRESS, ...(prof.address && typeof prof.address === 'object' ? prof.address : {}) };
        const schoolMatch = schools.find(s => s.id === prof.schoolId || s.name === prof.schoolId);
        const studentMatch = students.find(s => s.id === prof.studentId || s.fullName === prof.studentId);

        setFormModalTab('dados');
        setPendingAttachmentFiles({});
        ATTACHMENT_SLOT_DEFS.forEach(({ category }) => {
            const el = attachmentInputRefs.current[category];
            if (el) el.value = '';
        });
        setFormData({
            ...prof,
            address,
            schoolId: schoolMatch?.id || prof.schoolId,
            studentId: studentMatch?.id || prof.studentId,
            attachments: prof.attachments || [],
            status: prof.status ?? 'ativo',
            unlinkedAt: prof.unlinkedAt ?? null,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [schools, students]);

    useEffect(() => {
        if (!isNewFormPage) return;
        appliedEditRef.current = '';
        resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apenas ao entrar na rota "novo"
    }, [isNewFormPage]);

    useEffect(() => {
        if (!editProfId) {
            appliedEditRef.current = '';
            return;
        }
        const prof = professionals.find(p => p.id === editProfId);
        if (!prof) return;
        const loadKey = `${editProfId}|s${schools.length}|st${students.length}`;
        if (appliedEditRef.current === loadKey) return;
        appliedEditRef.current = loadKey;
        applyProfToForm(prof);
    }, [editProfId, professionals, schools.length, students.length, applyProfToForm]);

    /** Evita formulário de edição “vazio” quando o id não existe na lista (RLS, link antigo, etc.). */
    useEffect(() => {
        if (!editProfId || !isFormPage || !professionalsReady) return;
        const found = professionals.some(p => p.id === editProfId);
        if (!found) {
            setNotification({
                message: 'Profissional não encontrado ou sem permissão para editar. Voltando à lista.',
                type: 'error',
            });
            navigate(SUPPORT_PROF_LIST_PATH, { replace: true });
        }
    }, [editProfId, isFormPage, professionals, professionalsReady, navigate]);

    useEffect(() => {
        if (currentUser?.role === 'ESCOLA' && currentUser.schoolId && schools.length > 0) {
            const mySchool = schools.find(s => s.id === currentUser.schoolId);
            
            // Auto-seleção no formulário
            if (!formData.schoolId) {
                setFormData(prev => ({ ...prev, schoolId: currentUser.schoolId! }));
            }
            // Travar o filtro na escola dela
            setSelectedSchoolFilter(currentUser.schoolId);
        }
    }, [currentUser, schools, formData.schoolId]);

    const handleEdit = (prof: SupportProfessional) => {
        navigate(`${SUPPORT_PROF_LIST_PATH}/edit/${prof.id}`);
    };

    const closeUnlinkModal = () => {
        setShowUnlinkConfirm(false);
        setPendingUnlinkId(null);
        setUnlinkMotivo('');
    };

    const handleUnlinkClick = (id: string) => {
        setPendingUnlinkId(id);
        setUnlinkMotivo('');
        setShowUnlinkConfirm(true);
    };

    const handleConfirmUnlink = async () => {
        if (!pendingUnlinkId) return;

        const motivo = unlinkMotivo.trim();
        if (motivo.length < UNLINK_MOTIVO_MIN_LEN) {
            showNotification(`Descreva o motivo do desvinculamento (mínimo ${UNLINK_MOTIVO_MIN_LEN} caracteres).`, 'error');
            return;
        }

        setIsUnlinking(true);
        try {
            const profToUnlink = professionals.find(p => p.id === pendingUnlinkId);
            await SupabaseService.unlinkSupportProfessional(pendingUnlinkId);

            if (currentUser && profToUnlink) {
                const auditMsg = `Desvinculado: ${profToUnlink.name}. Motivo: ${motivo}`;
                await SupabaseService.logAction(currentUser as any, AuditAction.UPDATE, 'PROFISSIONAIS_APOIO', auditMsg);
            }

            await loadData();
            showNotification('Profissional desvinculado (cadastro desativado).', 'success');
            closeUnlinkModal();
        } catch (err) {
            console.error(err);
            showNotification('Erro ao desvincular profissional.', 'error');
        } finally {
            setIsUnlinking(false);
        }
    };

    const handleReactivate = async (prof: SupportProfessional) => {
        setIsReactivating(true);
        try {
            await SupabaseService.reactivateSupportProfessional(prof.id);

            if (currentUser) {
                const auditMsg = `Reativado: ${prof.name}`;
                await SupabaseService.logAction(currentUser as any, AuditAction.UPDATE, 'PROFISSIONAIS_APOIO', auditMsg);
            }

            await loadData();
            showNotification('Profissional reativado! Agora edite o cadastro para vincular escola e aluno.', 'success');
            // Navega para edição para o usuário preencher os vínculos
            navigate(`${SUPPORT_PROF_LIST_PATH}/edit/${prof.id}`);
        } catch (err) {
            console.error(err);
            showNotification('Erro ao reativar profissional.', 'error');
        } finally {
            setIsReactivating(false);
        }
    };

    const handleAddressChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            address: {
                ...EMPTY_ADDRESS,
                ...(prev.address || {}),
                [field]: value,
            },
        }));
    };

    const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePhoto = () => {
        setFormData(prev => ({ ...prev, photoUrl: '' }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Opções de escola para o formulário
    const schoolOptions = useMemo(() => 
        schools.map(s => ({ value: s.id, label: s.name }))
               .sort((a, b) => a.label.localeCompare(b.label))
    , [schools]);

    // Opções de escola para o filtro de listagem
    const schoolFilterOptions = useMemo(() => [
        { value: 'ALL', label: 'Todas as Escolas' },
        ...schoolOptions
    ], [schoolOptions]);

    // Lógica para filtrar alunos baseada na escola selecionada
    const filteredStudents = useMemo(() => {
        // Se já for escola, exibe todos os alunos que vieram (pois o SupabaseService já os filtra)
        // Se for ADMIN, filtra pela escola selecionada no formulário
        if (currentUser?.role === 'ESCOLA') return students;
        
        if (!formData.schoolId) return [];
        return students.filter(s => s.school?.schoolId === formData.schoolId);
    }, [students, formData.schoolId, currentUser]);

    // Opções de alunos para o formulário
    const studentOptions = useMemo(() => 
        filteredStudents.map(s => ({ value: s.id, label: s.fullName }))
                        .sort((a, b) => a.label.localeCompare(b.label))
    , [filteredStudents]);

    // Filtragem + ordenação: ativos no topo, desativados ao final; alfabético dentro de cada grupo
    const filteredProfessionals = useMemo(() => {
        let result = [...professionals];

        if (selectedSchoolFilter !== 'ALL') {
            result = result.filter(p => p.schoolId === selectedSchoolFilter);
        }

        if (nameSearchTerm.trim()) {
            const search = normalizeString(nameSearchTerm);
            result = result.filter(p => normalizeString(p.name).includes(search));
        }

        if (cpfSearchTerm.trim()) {
            const search = sanitizeCPF(cpfSearchTerm);
            result = result.filter(p => sanitizeCPF(p.cpf).includes(search));
        }

        if (statusListFilter === 'ativo') {
            result = result.filter(p => isSupportProfessionalActive(p) && p.studentId);
        } else if (statusListFilter === 'sem_vinculo') {
            result = result.filter(p => isSupportProfessionalActive(p) && !p.studentId);
        } else if (statusListFilter === 'desvinculado') {
            result = result.filter(p => !isSupportProfessionalActive(p));
        }

        result.sort((a, b) => {
            const aActive = isSupportProfessionalActive(a);
            const bActive = isSupportProfessionalActive(b);
            if (aActive !== bActive) {
                return aActive ? -1 : 1;
            }
            return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
        });

        return result;
    }, [professionals, selectedSchoolFilter, nameSearchTerm, cpfSearchTerm, statusListFilter]);

    const hasActiveFilters =
        selectedSchoolFilter !== 'ALL' ||
        nameSearchTerm.trim() !== '' ||
        cpfSearchTerm.trim() !== '' ||
        statusListFilter !== 'all';

    const clearAllFilters = () => {
        setSelectedSchoolFilter('ALL');
        setNameSearchTerm('');
        setCpfSearchTerm('');
        setStatusListFilter('all');
    };

    const clearHistoryFilters = () => {
        setHistorySchoolFilter('ALL');
        setHistoryDateFrom('');
        setHistoryDateTo('');
    };

    const historyFilteredRows = useMemo(() => {
        if (!seesSupportProfInactive) return [];
        let rows = professionals.filter(p => !isSupportProfessionalActive(p));
        if (historySchoolFilter !== 'ALL') {
            rows = rows.filter(p => (p.schoolIdUnlinked || p.schoolId) === historySchoolFilter);
        }
        const fromDt = historyDateFrom ? startOfLocalDay(historyDateFrom) : null;
        const toDt = historyDateTo ? endOfLocalDay(historyDateTo) : null;
        rows = rows.filter(p => {
            if (!p.unlinkedAt) return true;
            const ud = new Date(p.unlinkedAt).getTime();
            if (Number.isNaN(ud)) return true;
            if (fromDt && ud < fromDt.getTime()) return false;
            if (toDt && ud > toDt.getTime()) return false;
            return true;
        });
        rows.sort((a, b) => {
            const ta = a.unlinkedAt ? new Date(a.unlinkedAt).getTime() : 0;
            const tb = b.unlinkedAt ? new Date(b.unlinkedAt).getTime() : 0;
            return tb - ta;
        });
        return rows;
    }, [professionals, historySchoolFilter, historyDateFrom, historyDateTo, seesSupportProfInactive]);

    const hasActiveHistoryFilters =
        historySchoolFilter !== 'ALL' || historyDateFrom.trim() !== '' || historyDateTo.trim() !== '';

    const getSchoolName = (idOrName: string) => {
        if (!idOrName) return 'Desconhecida';
        const school = schools.find(s => s.id === idOrName || s.name === idOrName);
        return school?.name || 'Desconhecida';
    };

    const getStudentName = (idOrName: string) => {
        if (!idOrName) return 'Desconhecido';
        const student = students.find(s => s.id === idOrName || s.fullName === idOrName);
        return student?.fullName || 'Desconhecido';
    };

    const renderStudentAndRegent = (prof: SupportProfessional) => {
        let studentStr = getStudentName(prof.studentId);
        let regentStr = prof.regentTeacher || '-';
        let isUnregistered = false;

        // Limpeza dos textos importados pelo CSV (que guardam o nome do aluno no regente provisoriamente)
        if (studentStr === 'Desconhecido' && regentStr.includes('Aluno não cadastrado:')) {
            const parts = regentStr.split('| Aluno não cadastrado:');
            if (parts.length === 2) {
                regentStr = parts[0].trim() || '-';
                studentStr = parts[1].trim();
                isUnregistered = true;
            } else if (regentStr.startsWith('Aluno não cadastrado:')) {
                studentStr = regentStr.replace('Aluno não cadastrado:', '').trim();
                regentStr = '-';
                isUnregistered = true;
            }
        }

        return { studentStr, regentStr, isUnregistered };
    };

    const handleExportCSV = () => {
        if (filteredProfessionals.length === 0) {
            showNotification('Não há dados para exportar.', 'error');
            return;
        }

        const headers = [
            'Nome Completo', 'CPF', 'Telefone', 'E-mail', 'Formação',
            'Início do Contrato', 'Carga Horária', 'Escola', 'Regente', 'Aluno',
            'Rua', 'Número', 'Bairro', 'Cidade', 'Estado', 'CEP'
        ];

        const csvContent = [
            headers.join(','),
            ...filteredProfessionals.map(p => {
                const schoolName = getSchoolName(p.schoolId);
                const studentName = getStudentName(p.studentId);
                const addr = p.address || { street: '', number: '', district: '', city: '', state: '', zipCode: '' };

                return [
                    `"${p.name || ''}"`,
                    `"${p.cpf || ''}"`,
                    `"${p.phone || ''}"`,
                    `"${p.email || ''}"`,
                    `"${p.education || ''}"`,
                    `"${p.contractStartDate || ''}"`,
                    `"${p.workload || ''}"`,
                    `"${schoolName}"`,
                    `"${p.regentTeacher || ''}"`,
                    `"${studentName}"`,
                    `"${addr.street || ''}"`,
                    `"${addr.number || ''}"`,
                    `"${addr.district || ''}"`,
                    `"${addr.city || ''}"`,
                    `"${addr.state || ''}"`,
                    `"${addr.zipCode || ''}"`
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `profissionais_apoio_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportCSV = () => {
        setShowImporter(true);
    };

    if (isEscola && !currentUser?.schoolId) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-slate-200 mt-6 min-h-[400px]">
                <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-slate-700">Carregando perfil da escola...</h3>
                <p className="text-slate-500">Aguarde enquanto identificamos sua unidade de lotação.</p>
            </div>
        );
    }

    const metrics = useMemo(() => {
        return {
            total: professionals.length,
            ativosVinculados: professionals.filter(p => isSupportProfessionalActive(p) && p.studentId).length,
            ativosSemVinculo: professionals.filter(p => isSupportProfessionalActive(p) && !p.studentId).length,
            desvinculados: professionals.filter(p => !isSupportProfessionalActive(p)).length,
        };
    }, [professionals]);

    return (
        <div
            className={`mx-auto ${!isFormPage ? 'space-y-6' : ''} ${isFormPage ? 'max-w-5xl -mt-2 md:-mt-4 pb-2 md:pb-4' : 'max-w-6xl'}`}
        >
            {notification && (
                <Toast
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}

            <ConfirmModal
                isOpen={showUnlinkConfirm}
                title="Desvincular profissional de apoio?"
                message={
                    'O cadastro será desativado na rede (exclusão lógica): o histórico permanece no sistema, mas o profissional deixa de aparecer para perfis comuns.\n\n' +
                    'Confirme somente se deseja realmente desvincular.'
                }
                confirmLabel="Sim, desvincular"
                cancelLabel="Cancelar"
                onConfirm={handleConfirmUnlink}
                onCancel={closeUnlinkModal}
                type="danger"
                isLoading={isUnlinking}
                confirmDisabled={unlinkMotivo.trim().length < UNLINK_MOTIVO_MIN_LEN}
                footerExtra={
                    <div className="space-y-2">
                        <label htmlFor="unlink-motivo" className="block text-sm font-medium text-slate-700 text-left">
                            Motivo do desvinculamento <span className="text-red-600">*</span>
                        </label>
                        <textarea
                            id="unlink-motivo"
                            rows={4}
                            maxLength={800}
                            value={unlinkMotivo}
                            onChange={e => setUnlinkMotivo(e.target.value)}
                            placeholder="Descreva o motivo (mínimo de caracteres indicado abaixo). Ex.: mudança de município, encerramento de contrato, solicitação da escola…"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        />
                        <p className="text-xs text-slate-500 text-left">
                            {unlinkMotivo.trim().length}/{UNLINK_MOTIVO_MIN_LEN} caracteres (mínimo obrigatório para confirmar)
                        </p>
                    </div>
                }
            />

            {showImporter && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
                    <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto custom-scrollbar relative">
                        <button
                            onClick={() => setShowImporter(false)}
                            className="absolute top-4 right-4 z-10 p-2 bg-white/10 text-white hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <CSVImporter
                            type="support_professionals"
                            currentUser={currentUser || { name: 'Admin', email: '', role: 'ADMIN' }}
                            onComplete={() => {
                                setShowImporter(false);
                                loadData();
                            }}
                        />
                    </div>
                </div>
            )}

            {isFormPage ? (
                <div className="bg-white rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden flex flex-col">
                        <div className="px-4 py-4 sm:px-6 sm:py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-slate-50">
                            <div className="min-w-0">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <UserCog size={22} className="text-primary-600 flex-shrink-0" />
                                    <span className="truncate">{formData.id ? 'Editar profissional de apoio' : 'Ficha de cadastro — profissional de apoio escolar'}</span>
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    {formData.id ? 'Atualize os dados e salve para gravar as alterações.' : 'Preencha os dados completos para admissão na rede.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate(SUPPORT_PROF_LIST_PATH)}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors flex-shrink-0"
                            >
                                <ArrowLeft size={18} className="text-primary-600" />
                                Voltar à lista
                            </button>
                        </div>

                        <div className="flex border-b border-slate-100 overflow-x-auto bg-white z-10" role="tablist" aria-label="Seções do cadastro">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={formModalTab === 'dados'}
                                className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${formModalTab === 'dados'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setFormModalTab('dados')}
                            >
                                <User size={18} />
                                <span className="hidden sm:inline">Dados cadastrais</span>
                                <span className="sm:hidden">Dados</span>
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={formModalTab === 'anexos'}
                                className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${formModalTab === 'anexos'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setFormModalTab('anexos')}
                            >
                                <Paperclip size={18} />
                                <span>Anexos</span>
                                {(() => {
                                    let n = 0;
                                    for (const { category } of ATTACHMENT_SLOT_DEFS) {
                                        if (pendingAttachmentFiles[category]) n++;
                                        else if (formData.attachments?.some(a => a.category === category)) n++;
                                    }
                                    return n > 0 ? (
                                        <span className="text-[10px] font-bold bg-primary-600 text-white px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">{n}</span>
                                    ) : null;
                                })()}
                            </button>
                        </div>

                            <form id="support-professional-form" onSubmit={handleSubmit} className="px-4 py-4 sm:px-6 sm:py-5 md:py-6">
                        {formModalTab === 'dados' && (
                        <div className="animate-fadeIn space-y-6">
                            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="relative group">
                                        <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
                                            {formData.photoUrl ? (
                                                <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <UserCog size={48} className="text-slate-300" />
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full shadow-lg hover:bg-primary-700 transition-colors"
                                            title="Carregar Foto"
                                        >
                                            <Upload size={16} />
                                        </button>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handlePhotoUpload}
                                    />
                                    {formData.photoUrl && (
                                        <button type="button" onClick={handleRemovePhoto} className="text-xs text-red-500 hover:underline">
                                            Remover foto
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 space-y-5">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                                            <span className="w-1 h-4 bg-primary-500 rounded-full" aria-hidden />
                                            Dados pessoais e formação
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
                                            <div className="md:col-span-12">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo *</label>
                                                <input
                                                    required
                                                    type="text"
                                                    name="name"
                                                    className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    onBlur={e => setFormData({ ...formData, name: formatarNomeBR(e.target.value) })}
                                                />
                                            </div>
                                            <div className="md:col-span-12">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Formação acadêmica</label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border bg-white appearance-none pl-10"
                                                        value={formData.education}
                                                        name="education"
                                                        onChange={handleInputChange}
                                                    >
                                                        <option value="">Selecione a formação...</option>
                                                        {academicOptions.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                                </div>
                                            </div>
                                            <div className="md:col-span-4">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                                                <input
                                                    type="text"
                                                    name="cpf"
                                                    placeholder="000.000.000-00"
                                                    className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                    value={formData.cpf}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                            <div className="md:col-span-4">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
                                                <input
                                                    type="text"
                                                    name="phone"
                                                    placeholder="(00) 00000-0000"
                                                    className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                    value={formData.phone}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                            <div className="md:col-span-4">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                                            <span className="w-1 h-4 bg-primary-500 rounded-full" aria-hidden />
                                            Contrato e lotação
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
                                            <div className="md:col-span-4">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Início do contrato</label>
                                                <input
                                                    type="date"
                                                    name="contractStartDate"
                                                    className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                    value={formData.contractStartDate}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                            <div className="md:col-span-4">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Carga horária</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        name="workload"
                                                        placeholder="Ex: 40h"
                                                        className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border pl-10"
                                                        value={formData.workload}
                                                        onChange={handleInputChange}
                                                    />
                                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                                </div>
                                            </div>
                                            <div className="md:col-span-4 md:col-start-1">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Escola de lotação *</label>
                                                <SearchableSelect
                                                    options={schoolOptions}
                                                    value={formData.schoolId}
                                                    disabled={isEscola}
                                                    placeholder="Selecione a unidade escolar..."
                                                    onChange={(val) => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            schoolId: val,
                                                            studentId: ''
                                                        }));
                                                    }}
                                                />
                                            </div>
                                            <div className="md:col-span-8">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Aluno assistido <span className="text-slate-400 font-normal">(opcional)</span></label>
                                                <SearchableSelect
                                                    options={studentOptions}
                                                    value={formData.studentId}
                                                    disabled={!formData.schoolId}
                                                    placeholder={!formData.schoolId ? 'Selecione a escola primeiro...' : 'Opcional — pode ser vinculado depois'}
                                                    onChange={(val) => {
                                                        setFormData(prev => ({ ...prev, studentId: val }));
                                                    }}
                                                />
                                                {formData.schoolId && filteredStudents.length === 0 && (
                                                    <p className="text-xs text-amber-600 mt-1.5">
                                                        Atenção: não há alunos vinculados a esta escola no sistema.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-primary-500 rounded-full" aria-hidden />
                                    Endereço residencial
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">CEP</label>
                                        <input
                                            type="text"
                                            name="zipCode"
                                            placeholder="00000-000"
                                            className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                            value={formData.address?.zipCode}
                                            onChange={handleAddressInputChange}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Logradouro (rua, av., etc.)</label>
                                        <input
                                            type="text"
                                            name="street"
                                            className="w-full rounded-lg border-slate-300 p-2.5 border"
                                            value={formData.address?.street}
                                            onChange={handleAddressInputChange}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Número</label>
                                        <input
                                            ref={numberInputRef}
                                            type="text"
                                            name="number"
                                            className="w-full rounded-lg border-slate-300 p-2.5 border"
                                            value={formData.address?.number}
                                            onChange={handleAddressInputChange}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Bairro</label>
                                        <input
                                            type="text"
                                            name="district"
                                            className="w-full rounded-lg border-slate-300 p-2.5 border"
                                            value={formData.address?.district}
                                            onChange={handleAddressInputChange}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Cidade</label>
                                        <input
                                            type="text"
                                            name="city"
                                            className="w-full rounded-lg border-slate-300 p-2.5 border"
                                            value={formData.address?.city}
                                            onChange={handleAddressInputChange}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">UF</label>
                                        <input
                                            type="text"
                                            name="state"
                                            className="w-full rounded-lg border-slate-300 p-2.5 border"
                                            value={formData.address?.state}
                                            onChange={handleAddressInputChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}

                        {formModalTab === 'anexos' && (
                        <div className="space-y-6 animate-fadeIn">
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Os arquivos são enviados ao armazenamento ao clicar em <strong className="text-slate-800">Salvar profissional</strong> no rodapé. Prefira PDF ou imagem (JPG, PNG).
                            </p>
                            {ATTACHMENT_SLOT_DEFS.map(def => {
                                const saved = formData.attachments?.find(a => a.category === def.category);
                                const pending = pendingAttachmentFiles[def.category];
                                const filled = !!(pending || saved);
                                return (
                                    <div key={def.category} className="flex flex-wrap items-start gap-3 justify-between rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-800">{def.label}</p>
                                            <p className="text-[11px] text-slate-500">{def.hint}</p>
                                            {saved && !pending && (
                                                <a href={saved.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline mt-1 inline-block truncate max-w-full">
                                                    Abrir arquivo: {saved.fileName}
                                                </a>
                                            )}
                                            {pending && (
                                                <p className="text-xs text-amber-800 mt-1">Pronto para envio: {pending.name}</p>
                                            )}
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                                            {filled && (
                                                <span className="inline-flex items-center justify-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
                                                    <CheckCircle size={14} aria-hidden /> Adicionado
                                                </span>
                                            )}
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,image/*,application/pdf"
                                                ref={el => { attachmentInputRefs.current[def.category] = el; }}
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) setPendingAttachmentFiles(prev => ({ ...prev, [def.category]: f }));
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 font-medium inline-flex items-center gap-1 justify-center"
                                                onClick={() => attachmentInputRefs.current[def.category]?.click()}
                                            >
                                                <Paperclip size={14} aria-hidden />
                                                {filled ? 'Substituir' : 'Anexar'}
                                            </button>
                                            {filled && (
                                                <button
                                                    type="button"
                                                    className="text-xs text-red-600 hover:underline px-2 text-left sm:text-center"
                                                    onClick={() => {
                                                        setPendingAttachmentFiles(prev => {
                                                            const n = { ...prev };
                                                            delete n[def.category];
                                                            return n;
                                                        });
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            attachments: (prev.attachments || []).filter(a => a.category !== def.category),
                                                        }));
                                                        const el = attachmentInputRefs.current[def.category];
                                                        if (el) el.value = '';
                                                    }}
                                                >
                                                    Remover
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        )}

                            </form>
                <div className="px-4 py-4 sm:px-6 sm:py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <button
                        type="button"
                        disabled={savingProfessional}
                        onClick={() => navigate(SUPPORT_PROF_LIST_PATH)}
                        className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="support-professional-form"
                        disabled={savingProfessional}
                        className="flex items-center gap-2 px-8 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 shadow-md"
                    >
                        {savingProfessional ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {savingProfessional ? 'Salvando...' : (formData.id ? 'Atualizar profissional' : 'Cadastrar profissional')}
                    </button>
                </div>
            </div>
            ) : (
                <>
                {/* ══════════ CABEÇALHO PREMIUM ══════════ */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1E293B] tracking-tight">Profissionais de Apoio Escolar</h2>
                        <p className="text-slate-500 text-sm mt-0.5">Gestão de acompanhantes terapêuticos e monitores</p>
                    </div>
                    {['ADMIN', 'EDUCATION_SECRETARY', 'ESCOLA', 'SECRETARIA_SEDE'].includes(currentUser?.role?.toUpperCase() ?? '') && (
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <button
                                onClick={handleExportCSV}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium min-h-[44px]"
                                title="Exportar registros ativos para Excel/CSV"
                            >
                                <Download size={16} /> Exportar
                            </button>

                            <button
                                onClick={handleImportCSV}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium min-h-[44px]"
                            >
                                <Upload size={16} /> Importar CSV
                            </button>

                            <button
                                onClick={() => navigate(`${SUPPORT_PROF_LIST_PATH}/new`)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F97316] text-white rounded-lg font-semibold text-sm shadow-[0_4px_14px_rgba(249,115,22,0.35)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.45)] hover:-translate-y-0.5 transition-all duration-200 min-h-[44px]"
                            >
                                <Plus size={17} /> Novo Profissional
                            </button>
                        </div>
                    )}
                </div>

                {/* ══════════ CARDS DE MÉTRICAS ══════════ */}
                <div className="grid gap-3 mt-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                    <button onClick={() => { setStatusListFilter('all'); setMainListTab('lista'); }} className="group text-left bg-[#EAF3DE] border border-[#C0DD97] rounded-2xl p-4 flex flex-col justify-between min-h-[100px] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(59,109,17,0.18)] hover:border-[#97C459] focus-visible:ring-2 focus-visible:ring-green-500">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-white/60 group-hover:bg-white/80 flex items-center justify-center flex-shrink-0">
                                <Users size={16} className="text-[#3B6D11]" />
                            </div>
                            <span className="text-xs font-semibold text-[#3B6D11] uppercase tracking-wider leading-tight">Total cadastrados</span>
                        </div>
                        <div>
                            <div className="text-3xl font-semibold text-[#27500A]">{metrics.total}</div>
                            <div className="text-xs text-[#3B6D11] mt-1">profissionais no sistema</div>
                        </div>
                    </button>
                    <button onClick={() => { setStatusListFilter('ativo'); setMainListTab('lista'); }} className="group text-left bg-[#E6F1FB] border border-[#B5D4F4] rounded-2xl p-4 flex flex-col justify-between min-h-[100px] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(24,95,165,0.18)] hover:border-[#85B7EB] focus-visible:ring-2 focus-visible:ring-blue-500">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-white/60 group-hover:bg-white/80 flex items-center justify-center flex-shrink-0">
                                <UserCheck size={16} className="text-[#185FA5]" />
                            </div>
                            <span className="text-xs font-semibold text-[#185FA5] uppercase tracking-wider leading-tight">Ativos com vínculo</span>
                        </div>
                        <div>
                            <div className="text-3xl font-semibold text-[#0C447C]">{metrics.ativosVinculados}</div>
                            <div className="text-xs text-[#185FA5] mt-1">vinculados a um aluno</div>
                        </div>
                    </button>
                    <button onClick={() => { setStatusListFilter('sem_vinculo'); setMainListTab('lista'); }} className="group text-left bg-[#FAEEDA] border border-[#FAC775] rounded-2xl p-4 flex flex-col justify-between min-h-[100px] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(133,79,11,0.18)] hover:border-[#EF9F27] focus-visible:ring-2 focus-visible:ring-amber-500">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-white/60 group-hover:bg-white/80 flex items-center justify-center flex-shrink-0">
                                <UserX size={16} className="text-[#854F0B]" />
                            </div>
                            <span className="text-xs font-semibold text-[#854F0B] uppercase tracking-wider leading-tight">Sem vínculo de aluno</span>
                        </div>
                        <div>
                            <div className="text-3xl font-semibold text-[#633806]">{metrics.ativosSemVinculo}</div>
                            <div className="text-xs text-[#854F0B] mt-1">só vinculados à escola</div>
                        </div>
                    </button>
                    <button onClick={() => { setStatusListFilter('desvinculado'); setMainListTab('lista'); }} className="group text-left bg-[#FCEBEB] border border-[#F7C1C1] rounded-2xl p-4 flex flex-col justify-between min-h-[100px] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(163,45,45,0.18)] hover:border-[#F09595] focus-visible:ring-2 focus-visible:ring-red-500">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-white/60 group-hover:bg-white/80 flex items-center justify-center flex-shrink-0">
                                <UserMinus size={16} className="text-[#A32D2D]" />
                            </div>
                            <span className="text-xs font-semibold text-[#A32D2D] uppercase tracking-wider leading-tight">Desvinculados</span>
                        </div>
                        <div>
                            <div className="text-3xl font-semibold text-[#791F1F]">{metrics.desvinculados}</div>
                            <div className="text-xs text-[#A32D2D] mt-1">inativos no sistema</div>
                        </div>
                    </button>
                </div>

                {/* ══════════ SEGMENTED CONTROL ABAS ══════════ */}
                <div className="flex items-center justify-between gap-3 flex-wrap mt-6">
                    <div
                        className="bg-slate-100 rounded-xl p-[5px] inline-flex gap-0.5 overflow-x-auto"
                        role="tablist"
                        aria-label="Lista, histórico de desvinculações ou relatórios"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={mainListTab === 'lista'}
                            className={`flex items-center gap-2 px-4 text-sm whitespace-nowrap min-h-[44px] rounded-[9px] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 ${mainListTab === 'lista'
                                ? 'bg-white shadow-md text-[#2563EB] font-medium'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            onClick={() => setMainListTab('lista')}
                        >
                            <LayoutList size={16} />
                            Lista
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ml-0.5 ${mainListTab === 'lista' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
                                {filteredProfessionals.length}
                            </span>
                        </button>
                        {seesSupportProfInactive ? (
                            <button
                                type="button"
                                role="tab"
                                aria-selected={mainListTab === 'historico'}
                                className={`flex items-center gap-2 px-4 text-sm whitespace-nowrap min-h-[44px] rounded-[9px] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 ${mainListTab === 'historico'
                                    ? 'bg-white shadow-md text-[#D97706] font-medium'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                onClick={() => setMainListTab('historico')}
                            >
                                <History size={16} />
                                Histórico
                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ml-0.5 ${mainListTab === 'historico' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
                                    {historyFilteredRows.length}
                                </span>
                            </button>
                        ) : null}
                        <button
                            type="button"
                            role="tab"
                            aria-selected={mainListTab === 'relatorios'}
                            className={`flex items-center gap-2 px-4 text-sm whitespace-nowrap min-h-[44px] rounded-[9px] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 ${mainListTab === 'relatorios'
                                ? 'bg-white shadow-md text-[#059669] font-medium'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            onClick={() => setMainListTab('relatorios')}
                        >
                            <FileBarChart size={16} />
                            Relatórios
                        </button>
                    </div>
                    {mainListTab === 'lista' && (
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-all min-h-[44px]"
                        >
                            <Download size={15} /> Exportar lista
                        </button>
                    )}
                    {mainListTab === 'historico' && (
                        <button
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-all min-h-[44px]"
                        >
                            <Calendar size={15} /> Filtrar período
                        </button>
                    )}
                    {mainListTab === 'relatorios' && (
                        <button
                            className="flex items-center gap-2 px-3 py-2 bg-[#F97316] text-white text-sm font-medium rounded-lg shadow-[0_4px_12px_rgba(249,115,22,0.30)] hover:shadow-[0_6px_16px_rgba(249,115,22,0.40)] hover:-translate-y-0.5 transition-all min-h-[44px]"
                        >
                            <FileBarChart size={15} /> Gerar relatório
                        </button>
                    )}
                </div>

            {mainListTab === 'relatorios' ? (
                <RelatorioProfissionais
                    professionals={professionals}
                    schools={schools}
                    students={students}
                    letterheadUnit={letterheadUnitForRelatorio}
                />
            ) : mainListTab === 'historico' && seesSupportProfInactive ? (
                <div className="space-y-4 pb-10 animate-fadeIn">
                    <div className="flex flex-wrap items-end gap-3 bg-white p-4 rounded-[14px] shadow-sm border border-slate-200">
                        <div className="w-full md:w-72 min-w-[200px]">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                                <SchoolIcon size={12} className="text-[#3B82F6]" />
                                Escola
                            </label>
                            <SearchableSelect
                                options={schoolFilterOptions}
                                value={historySchoolFilter}
                                onChange={setHistorySchoolFilter}
                                disabled={isEscola}
                                placeholder="Todas as escolas..."
                            />
                        </div>
                        <div className="w-full sm:w-auto min-w-[160px]">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                Período — de
                            </label>
                            <input
                                type="date"
                                value={historyDateFrom}
                                onChange={e => setHistoryDateFrom(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[rgba(59,130,246,0.15)] focus:border-[#3B82F6] transition-all min-h-[44px]"
                            />
                        </div>
                        <div className="w-full sm:w-auto min-w-[160px]">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                até
                            </label>
                            <input
                                type="date"
                                value={historyDateTo}
                                onChange={e => setHistoryDateTo(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[rgba(59,130,246,0.15)] focus:border-[#3B82F6] transition-all min-h-[44px]"
                            />
                        </div>
                        <div className="flex items-center gap-2 mb-1 ml-auto">
                            {hasActiveHistoryFilters ? (
                                <button
                                    type="button"
                                    onClick={clearHistoryFilters}
                                    className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider min-h-[44px]"
                                >
                                    <X size={14} /> Limpar filtros
                                </button>
                            ) : null}
                            <div className="bg-[#EFF6FF] px-3 py-1.5 rounded-full border border-[#BFDBFE] text-[11px] font-bold text-[#3B82F6] uppercase tracking-tighter">
                                {historyFilteredRows.length} registro(s)
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[14px] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <th className="px-4 py-3">Nome</th>
                                        <th className="px-4 py-3">Escola de origem</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Data da desvinculação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyFilteredRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-12 text-center text-slate-500">
                                                Nenhum profissional desativado neste filtro.
                                            </td>
                                        </tr>
                                    ) : (
                                        historyFilteredRows.map(prof => (
                                            <tr key={prof.id} onClick={() => navigate(`${SUPPORT_PROF_LIST_PATH}/${prof.id}`)} title="Clique para ver a ficha" className="border-b border-slate-100 last:border-0 hover:bg-slate-100 cursor-pointer">
                                                <td className="px-4 py-3 font-semibold text-slate-900">{prof.name}</td>
                                                <td className="px-4 py-3 text-slate-700">{getSchoolName(prof.schoolIdUnlinked || prof.schoolId)}</td>
                                                <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-mono text-[13px]">
                                                    {formatUnlinkedDateTimePt(prof.unlinkedAt)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <>
            {/* ══════════ BARRA DE FILTROS ══════════ */}
            <div className="bg-white p-4 sm:p-5 rounded-[14px] shadow-sm border border-slate-200 mb-6 animate-fadeIn relative z-20">
                <div className="flex flex-wrap items-end gap-3">
                    {/* Nome */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                            <Search size={12} className="text-[#3B82F6]" />
                            Busca por Nome
                        </label>
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input 
                                type="text"
                                value={nameSearchTerm}
                                onChange={(e) => setNameSearchTerm(e.target.value)}
                                placeholder="Ex: João Silva..."
                                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[rgba(59,130,246,0.15)] focus:border-[#3B82F6] transition-all font-medium min-h-[44px]"
                            />
                        </div>
                    </div>

                    {/* CPF */}
                    <div className="w-full md:w-48">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                            <Fingerprint size={12} className="text-[#3B82F6]" />
                            Busca por CPF
                        </label>
                        <div className="relative">
                            <Fingerprint size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input 
                                type="text"
                                value={cpfSearchTerm}
                                onChange={(e) => setCpfSearchTerm(maskCPF(e.target.value))}
                                placeholder="000.000.000-00"
                                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[rgba(59,130,246,0.15)] focus:border-[#3B82F6] transition-all min-h-[44px]"
                            />
                        </div>
                    </div>

                    {/* Escola */}
                    <div className="w-full md:w-72">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                            <SchoolIcon size={12} className="text-[#3B82F6]" />
                            Unidade Escolar
                        </label>
                        <SearchableSelect
                            options={schoolFilterOptions}
                            value={selectedSchoolFilter}
                            onChange={setSelectedSchoolFilter}
                            disabled={isEscola}
                            placeholder="Todas as escolas..."
                        />
                    </div>

                    {/* Status */}
                    {!isEscola && (
                        <div className="w-full md:w-56">
                            <label
                                htmlFor="support-prof-status-filter"
                                className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5"
                            >
                                <ListFilter size={12} className="text-[#3B82F6]" />
                                Status
                            </label>
                            <div className="relative">
                                <ListFilter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select
                                    id="support-prof-status-filter"
                                    value={statusListFilter}
                                    onChange={e => setStatusListFilter(e.target.value as SupportProfessionalListStatusFilter)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[rgba(59,130,246,0.15)] focus:border-[#3B82F6] transition-all cursor-pointer appearance-none min-h-[44px]"
                                >
                                    <option value="all">Todos os status</option>
                                    <option value="ativo">Apenas Ativos</option>
                                    <option value="desvinculado">Apenas Desvinculados</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    )}
                    
                    {/* Limpeza e Contador */}
                    <div className="flex items-center gap-2 mb-1 ml-auto">
                        {hasActiveFilters && (
                            <button 
                                onClick={clearAllFilters}
                                className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider min-h-[44px]"
                            >
                                <X size={14} /> Limpar
                            </button>
                        )}
                        <div className="bg-blue-600 px-3 py-1 rounded-full text-white font-semibold text-xs">
                             {filteredProfessionals.length} resultados
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════ SKELETON LOADING ══════════ */}
            {!professionalsReady ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[18px] pb-10">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-[14px] border border-slate-200 p-5 animate-pulse">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-11 h-11 rounded-full bg-slate-200"></div>
                                <div className="flex-1">
                                    <div className="h-4 bg-slate-200 rounded-md w-3/4 mb-2"></div>
                                    <div className="h-3 bg-slate-100 rounded-md w-1/2"></div>
                                </div>
                            </div>
                            <div className="border-t border-slate-100 pt-3 space-y-2.5">
                                <div className="h-8 bg-slate-100 rounded-lg"></div>
                                <div className="h-3.5 bg-slate-100 rounded-md w-4/5"></div>
                                <div className="h-3.5 bg-slate-100 rounded-md w-3/5"></div>
                            </div>
                            <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between">
                                <div className="h-6 bg-slate-200 rounded-full w-20"></div>
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
                                    <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (

            /* ══════════ GRADE DE CARDS ══════════ */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[18px] pb-10">
                {filteredProfessionals.length === 0 ? (
                    /* ══════════ EMPTY STATE ══════════ */
                    <div className="col-span-full py-20 bg-white rounded-[14px] border border-dashed border-slate-300 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <Search size={28} className="text-slate-300" />
                        </div>
                        <p className="text-lg font-semibold text-[#1E293B]">Nenhum profissional encontrado</p>
                        <p className="text-sm text-slate-500 mt-1 max-w-sm text-center">
                            Tente ajustar seus filtros de busca ou cadastre um novo profissional de apoio.
                        </p>
                        {hasActiveFilters && (
                            <button
                                onClick={clearAllFilters}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#3B82F6] bg-[#EFF6FF] rounded-lg hover:bg-[#DBEAFE] transition-colors"
                            >
                                <X size={15} /> Limpar todos os filtros
                            </button>
                        )}
                    </div>
                ) : filteredProfessionals.map(prof => {
                    const { studentStr, regentStr, isUnregistered } = renderStudentAndRegent(prof);
                    const inactive = !isSupportProfessionalActive(prof);
                    const gestorSeesInactive =
                        inactive && currentUser && canViewInactiveSupportProfessionals(currentUser);

                    // Avatar de iniciais
                    const initials = (prof.name || '?')
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map(w => w[0])
                        .join('')
                        .toUpperCase();
                    const avatarGradients = [
                        'from-[#3B82F6] to-[#6366F1]',
                        'from-[#F97316] to-[#EF4444]',
                        'from-[#10B981] to-[#14B8A6]',
                        'from-[#8B5CF6] to-[#EC4899]',
                        'from-[#06B6D4] to-[#3B82F6]',
                        'from-[#F59E0B] to-[#F97316]',
                    ];
                    const gradientIndex = (prof.name || '').charCodeAt(0) % avatarGradients.length;
                    const avatarGradient = avatarGradients[gradientIndex];

                    return (
                        <div 
                            key={prof.id} 
                            onClick={() => handleEdit(prof)}
                            className={`rounded-[14px] border p-0 shadow-sm hover:shadow-lg hover:-translate-y-[3px] hover:border-slate-300 transition-all duration-200 group relative cursor-pointer active:scale-[0.98] overflow-hidden ${
                                gestorSeesInactive
                                    ? 'bg-slate-50 border-slate-300 opacity-[0.78]'
                                    : 'bg-white border-slate-200'
                            }`}
                        >
                            {/* ── Inactive Banner ── */}
                            {gestorSeesInactive ? (
                                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wide text-slate-600 flex items-center gap-2">
                                    <span className="flex h-2 w-2 rounded-full bg-slate-400"></span>
                                    Desativado em {formatUnlinkedDatePt(prof.unlinkedAt)}
                                </div>
                            ) : null}

                            {/* ── Card Header: Avatar + Nome + Actions ── */}
                            <div className="flex items-start justify-between px-4 pt-4 pb-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                                        prof.photoUrl ? '' : `bg-gradient-to-br ${avatarGradient}`
                                    }`}>
                                        {prof.photoUrl ? (
                                            <img src={prof.photoUrl} alt={prof.name} className="w-11 h-11 rounded-full object-cover" />
                                        ) : (
                                            <span className="text-white font-bold text-sm tracking-tight">{initials}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className={`font-semibold text-sm leading-tight truncate group-hover:text-[#3B82F6] transition-colors ${gestorSeesInactive ? 'text-slate-600' : 'text-[#1E293B]'}`}>
                                            {prof.name}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {prof.workload && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                                    {prof.workload}
                                                </span>
                                            )}
                                            <span className="text-[11px] text-slate-400 font-mono truncate">
                                                {prof.cpf ? `CPF: ${maskCPF(prof.cpf)}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* ── Kebab / Actions ── */}
                                <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
                                    {['ADMIN', 'EDUCATION_SECRETARY', 'ESCOLA', 'SECRETARIA_SEDE'].includes(currentUser?.role?.toUpperCase() ?? '') && (
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleEdit(prof); }}
                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-[#3B82F6] hover:bg-[#EFF6FF] border border-transparent hover:border-slate-200 rounded-lg transition-all"
                                            title="Editar profissional"
                                        >
                                            <Edit size={15} />
                                        </button>
                                    )}
                                    {currentUser && canUnlinkSupportProfessional(currentUser) && isSupportProfessionalActive(prof) ? (
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleUnlinkClick(prof.id); }}
                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-all"
                                            title="Desvincular profissional"
                                        >
                                            <Link2Off size={15} />
                                        </button>
                                    ) : null}
                                    {currentUser && canUnlinkSupportProfessional(currentUser) && !isSupportProfessionalActive(prof) ? (
                                        <button 
                                            type="button"
                                            disabled={isReactivating}
                                            onClick={(e) => { e.stopPropagation(); handleReactivate(prof); }}
                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-lg transition-all disabled:opacity-50"
                                            title="Reativar profissional"
                                        >
                                            {isReactivating ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            {/* ── Divider ── */}
                            <div className="border-t border-slate-100 mx-4"></div>

                            {/* ── Vínculo Info ── */}
                            <div className="px-4 py-3 space-y-2">
                                {/* Escola */}
                                <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-2 rounded-lg">
                                    <SchoolIcon size={15} className="text-slate-400 flex-shrink-0" />
                                    <span className="text-sm font-semibold text-[#2563EB] truncate">
                                        {prof.schoolId ? getSchoolName(prof.schoolId) : <span className="text-slate-400 font-normal italic">Sem vínculo com escola</span>}
                                    </span>
                                </div>
                                
                                {/* Aluno + Regente */}
                                <div className="space-y-1.5 px-1">
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <User size={14} className={isUnregistered ? 'text-amber-500' : (prof.studentId ? 'text-emerald-500' : 'text-slate-300')} />
                                        <span className="text-[12px] truncate">
                                            <span className="text-slate-500 mr-1">Aluno:</span>
                                            <span className="font-semibold text-slate-700">{prof.studentId ? studentStr : <span className="text-slate-400 font-normal italic">Sem vínculo</span>}</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <BookOpen size={14} className={prof.regentTeacher ? 'text-[#3B82F6]' : 'text-slate-300'} />
                                        <span className="text-[12px] truncate">
                                            <span className="text-slate-500 mr-1">Regente:</span>
                                            <span className="text-slate-700">{prof.regentTeacher ? regentStr : '—'}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* ── Card Footer: Status Badge ── */}
                            <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between">
                                {isSupportProfessionalActive(prof) ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                        Ativo
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                        <span className="flex h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                                        Desvinculado
                                    </span>
                                )}
                                {prof.contractStartDate && (
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        Desde {new Date(prof.contractStartDate + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            )}
                </>
            )}
                </>
            )}
        </div>
    );
};

export default SupportProfessionalManagement;

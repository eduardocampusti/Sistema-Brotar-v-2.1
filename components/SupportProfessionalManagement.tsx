
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { SupportProfessional, School, Student, User as UserType, AuditAction, SupportProfessionalAttachment, SupportProfessionalAttachmentCategory } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { formatarNomeBR } from '../utils/formatters';
import { Save, UserCog, X, User, School as SchoolIcon, BookOpen, Trash2, Edit, Briefcase, GraduationCap, Upload, Search, ChevronDown, CheckCircle, AlertCircle, Download, FileSpreadsheet, Loader2, Fingerprint, Paperclip, ArrowLeft } from 'lucide-react';
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
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [showImporter, setShowImporter] = useState(false);
    const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('ALL');
    const [nameSearchTerm, setNameSearchTerm] = useState('');
    const [cpfSearchTerm, setCpfSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const attachmentInputRefs = useRef<Partial<Record<SupportProfessionalAttachmentCategory, HTMLInputElement | null>>>({});
    const [formModalTab, setFormModalTab] = useState<'dados' | 'anexos'>('dados');
    const [pendingAttachmentFiles, setPendingAttachmentFiles] = useState<Partial<Record<SupportProfessionalAttachmentCategory, File>>>({});
    const [savingProfessional, setSavingProfessional] = useState(false);
    const isEscola = currentUser?.role === 'ESCOLA';

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
                ...prev.address!,
                [name]: maskedValue
            }
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
        address: { street: '', number: '', district: '', city: '', state: '', zipCode: '' },
        schoolId: '',
        regentTeacher: '',
        studentId: '',
        attachments: []
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
                                ...prev.address!,
                                street: addressData.street,
                                district: addressData.district,
                                city: addressData.city,
                                state: addressData.state
                            }
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
        if (!formData.studentId) {
            showNotification('Por favor, selecione um Aluno Assistido.', 'error');
            return;
        }

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
            address: formData.address,
            schoolId: formData.schoolId,
            regentTeacher: formData.regentTeacher || '',
            studentId: formData.studentId,
            createdAt: formData.createdAt || new Date().toISOString(),
            attachments: mergedAttachments,
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
            address: { street: '', number: '', district: '', city: '', state: '', zipCode: '' },
            schoolId: '',
            regentTeacher: '',
            studentId: '',
            attachments: []
        });
    };

    const applyProfToForm = useCallback((prof: SupportProfessional) => {
        const address = prof.address || { street: '', number: '', district: '', city: '', state: '', zipCode: '' };
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
            attachments: prof.attachments || []
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

    const handleDeleteClick = (id: string) => {
        setPendingDeleteId(id);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!pendingDeleteId) return;

        setIsDeleting(true);
        try {
            const profToDelete = professionals.find(p => p.id === pendingDeleteId);
            await SupabaseService.deleteSupportProfessional(pendingDeleteId);

            if (currentUser && profToDelete) {
                await SupabaseService.logAction(currentUser as any, AuditAction.DELETE, 'PROFISSIONAIS_APOIO', profToDelete.name);
            }

            await loadData();
            showNotification('Profissional excluído.', 'success');
        } catch (err) {
            console.error(err);
            showNotification('Erro ao excluir profissional.', 'error');
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
            setPendingDeleteId(null);
        }
    };

    const handleAddressChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            address: {
                ...prev.address!,
                [field]: value
            }
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

    // Filtragem simplificada
    const filteredProfessionals = useMemo(() => {
        let result = professionals;

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

        return result;
    }, [professionals, selectedSchoolFilter, nameSearchTerm, cpfSearchTerm]);

    const hasActiveFilters = selectedSchoolFilter !== 'ALL' || nameSearchTerm.trim() !== '' || cpfSearchTerm.trim() !== '';

    const clearAllFilters = () => {
        setSelectedSchoolFilter('ALL');
        setNameSearchTerm('');
        setCpfSearchTerm('');
    };

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
                isOpen={showDeleteConfirm}
                title="Excluir Profissional"
                message="Tem certeza que deseja excluir este profissional de apoio? Esta ação não pode ser desfeita."
                confirmLabel="Sim, Excluir"
                cancelLabel="Cancelar"
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                type="danger"
                isLoading={isDeleting}
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
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Aluno assistido *</label>
                                                <SearchableSelect
                                                    options={studentOptions}
                                                    value={formData.studentId}
                                                    disabled={!formData.schoolId}
                                                    placeholder={!formData.schoolId ? 'Selecione a escola primeiro...' : 'Selecione o aluno...'}
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
                        {savingProfessional ? 'Salvando...' : (formData.id ? 'Atualizar profissional' : 'Salvar profissional')}
                    </button>
                </div>
                </div>
            ) : (
                <>
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Profissionais de Apoio Escolar</h2>
                    <p className="text-slate-500">Gestão de acompanhantes terapêuticos e monitores</p>
                </div>
                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'EDUCATION_SECRETARY' || currentUser?.role === 'ESCOLA') && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                            title="Exportar registros ativos para Excel/CSV"
                        >
                            <Download size={18} /> Exportar
                        </button>

                        <button
                            onClick={handleImportCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm"
                        >
                            <FileSpreadsheet size={18} /> Importar CSV
                        </button>

                        <button
                            onClick={() => navigate(`${SUPPORT_PROF_LIST_PATH}/new`)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                        >
                            <UserCog size={18} /> Novo Profissional
                        </button>
                    </div>
                )}
            </div>

            {/* BARRA DE BUSCA INTELIGENTE */}
            <div className="flex flex-wrap items-end gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 animate-fadeIn relative z-20">
                {/* Nome */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                        <Search size={12} className="text-primary-500" />
                        Busca por Nome
                    </label>
                    <input 
                        type="text"
                        value={nameSearchTerm}
                        onChange={(e) => setNameSearchTerm(e.target.value)}
                        placeholder="Ex: João Silva..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all font-medium"
                    />
                </div>

                {/* CPF */}
                <div className="w-full md:w-48">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                        <Fingerprint size={12} className="text-primary-500" />
                        Busca por CPF
                    </label>
                    <input 
                        type="text"
                        value={cpfSearchTerm}
                        onChange={(e) => setCpfSearchTerm(maskCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all"
                    />
                </div>

                {/* Escola */}
                <div className="w-full md:w-72">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                        <SchoolIcon size={12} className="text-primary-500" />
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
                
                {/* Limpeza e Contador */}
                <div className="flex items-center gap-2 mb-1 ml-auto">
                    {hasActiveFilters && (
                        <button 
                            onClick={clearAllFilters}
                            className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider"
                        >
                            <X size={14} /> Limpar
                        </button>
                    )}
                    <div className="bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 flex items-center gap-2 shadow-sm">
                         <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                         <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                            {filteredProfessionals.length} resultados
                         </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                {filteredProfessionals.length === 0 ? (
                    <div className="col-span-full py-16 bg-white rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500">
                        <UserCog size={48} className="text-slate-200 mb-3" />
                        <p className="text-lg font-medium">Nenhum profissional de apoio encontrado.</p>
                        <p className="text-sm">Tente ajustar seus filtros ou cadastre um novo profissional.</p>
                    </div>
                ) : filteredProfessionals.map(prof => {
                    const { studentStr, regentStr, isUnregistered } = renderStudentAndRegent(prof);
                    
                    return (
                        <div 
                            key={prof.id} 
                            onClick={() => handleEdit(prof)}
                            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all group relative border-l-4 border-l-primary-500 cursor-pointer active:scale-[0.98]"
                        >
                            {/* Header do Card */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                                        {prof.photoUrl ? (
                                            <img src={prof.photoUrl} alt={prof.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserCog size={22} className="text-slate-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 leading-tight group-hover:text-primary-600 transition-colors uppercase text-sm tracking-tight">{prof.name}</h3>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {prof.workload && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-50 text-primary-700 uppercase tracking-wider">
                                                    {prof.workload}
                                                </span>
                                            )}
                                            <span className="text-[11px] text-slate-400 font-mono italic">CPF: {prof.cpf || '---'}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Ações Elegantes */}
                                <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'EDUCATION_SECRETARY' || currentUser?.role === 'ESCOLA') && (
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleEdit(prof); }}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            title="Editar"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    )}
                                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'EDUCATION_SECRETARY') && (
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(prof.id); }}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Detalhes do Card */}
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <SchoolIcon size={14} className="text-primary-500" />
                                    <span className="truncate flex-1 font-medium">{getSchoolName(prof.schoolId)}</span>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-1.5 px-1 py-0.5">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <User size={14} className={isUnregistered ? "text-amber-500" : "text-emerald-500"} />
                                        <span className="text-[12px] truncate">
                                            <span className="text-slate-400 mr-1">Aluno:</span>
                                            <span className="font-semibold">{studentStr}</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <BookOpen size={14} className="text-blue-500" />
                                        <span className="text-[12px] truncate">
                                            <span className="text-slate-400 mr-1">Regente:</span>
                                            {regentStr}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
                </>
            )}
        </div>
    );
};

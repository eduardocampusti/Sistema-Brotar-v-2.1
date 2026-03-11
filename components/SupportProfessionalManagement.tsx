
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SupportProfessional, School, Student, User as UserType, AuditAction } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { formatarNomeBR } from '../utils/formatters';
import { Save, UserCog, X, Phone, Mail, User, School as SchoolIcon, BookOpen, Trash2, Edit, MapPin, Briefcase, Calendar, GraduationCap, Upload, Search, ChevronDown, CheckCircle, AlertCircle, Download, FileSpreadsheet, Loader2, Fingerprint } from 'lucide-react';
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

interface SupportProfessionalManagementProps {
    currentUser?: UserType;
}

export const SupportProfessionalManagement: React.FC<SupportProfessionalManagementProps> = ({ currentUser }) => {
    const [professionals, setProfessionals] = useState<SupportProfessional[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [showImporter, setShowImporter] = useState(false);
    const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('ALL');
    const [nameSearchTerm, setNameSearchTerm] = useState('');
    const [cpfSearchTerm, setCpfSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isEscola = currentUser?.role === 'ESCOLA';

    // Estados para o autocomplete de escola
    const [schoolSearchTerm, setSchoolSearchTerm] = useState('');
    const [showSchoolSuggestions, setShowSchoolSuggestions] = useState(false);
    const schoolInputRef = useRef<HTMLDivElement>(null);
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
        studentId: ''
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
        // Se o usuário for ESCOLA, só carrega os dados quando o schoolId estiver disponível
        if (currentUser?.role === 'ESCOLA' && !currentUser.schoolId) {
            return;
        }
        loadData();
    }, [currentUser]);

    useEffect(() => {
        // Fechar sugestões ao clicar fora
        const handleClickOutside = (event: MouseEvent) => {
            if (schoolInputRef.current && !schoolInputRef.current.contains(event.target as Node)) {
                setShowSchoolSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        try {
            console.log('[SupportProf] Carregando dados...');
            
            // 🔒 Se o usuário for ESCOLA, filtra server-side pelo UUID real da escola
            // Isso garante que o banco retorne apenas os profissionais da unidade. Se UUID falhar, mandar id inexistente.
            const mySchoolId = currentUser?.role === 'ESCOLA' ? (currentUser?.schoolId || '00000000-0000-0000-0000-000000000000') : undefined;
            
            const profs = await SupabaseService.getSupportProfessionals(mySchoolId);
            console.log('[SupportProf] Profissionais carregados:', profs.length, profs);
            const schoolsData = await SupabaseService.getSchools();
            const studentsData = await SupabaseService.getStudents();
            setProfessionals(profs);
            setSchools(schoolsData);
            setStudents(studentsData);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            showNotification('Erro ao carregar dados.', 'error');
        }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
    };

    // Atualizar o termo de busca quando o schoolId mudar (edição ou reset)
    useEffect(() => {
        if (formData.schoolId) {
            const school = schools.find(s => s.id === formData.schoolId);
            if (school) {
                setSchoolSearchTerm(school.name);
            }
        } else {
            setSchoolSearchTerm('');
        }
    }, [formData.schoolId, schools]);

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
            createdAt: formData.createdAt || new Date().toISOString()
        };

        try {
            await SupabaseService.saveSupportProfessional(newProf);

            // Registro de Auditoria: Profissional Apoio
            const acao = formData.id ? AuditAction.UPDATE : AuditAction.CREATE;
            if (currentUser) {
                await SupabaseService.logAction(currentUser as any, acao, 'PROFISSIONAIS_APOIO', newProf.name);
            }

            await loadData();
            setIsAdding(false);
            resetForm();
            showNotification('Profissional salvo com sucesso!', 'success');
        } catch (err: any) {
            console.error(err);
            showNotification(`Erro ao salvar profissional: ${err.message || 'Erro desconhecido'}`, 'error');
        }
    };

    const resetForm = () => {
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
            studentId: ''
        });
        setSchoolSearchTerm('');
    };

    useEffect(() => {
        if (currentUser?.role === 'ESCOLA' && currentUser.schoolInep && schools.length > 0) {
            const mySchool = schools.find(s => s.inep === currentUser.schoolInep);
            if (mySchool) {
                // Auto-seleção no formulário
                if (!formData.schoolId) {
                    setFormData(prev => ({ ...prev, schoolId: mySchool.id }));
                    setSchoolSearchTerm(mySchool.name);
                }
                // Travar o filtro na escola dela
                setSelectedSchoolFilter(mySchool.id);
            }
        }
    }, [currentUser, schools, formData.schoolId]);

    const handleEdit = (prof: SupportProfessional) => {
        const address = prof.address || { street: '', number: '', district: '', city: '', state: '', zipCode: '' };
        setFormData({ ...prof, address });
        setIsAdding(true);
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

    // Lógica para filtrar escolas
    const filteredSchools = useMemo(() => {
        if (!schoolSearchTerm) return schools;
        return schools.filter(s => s.name.toLowerCase().includes(schoolSearchTerm.toLowerCase()));
    }, [schools, schoolSearchTerm]);

    // Opções de escola para o filtro de listagem
    const schoolFilterOptions = useMemo(() => [
        { value: 'ALL', label: 'Todas as Escolas' },
        ...schools.map(s => ({ value: s.id, label: s.name }))
            .sort((a, b) => a.label.localeCompare(b.label))
    ], [schools]);

    // Lógica para filtrar alunos baseada na escola selecionada
    const filteredStudents = useMemo(() => {
        if (!formData.schoolId) return []; // Retorna vazio se nenhuma escola selecionada
        return students.filter(s => s.school?.schoolId === formData.schoolId);
    }, [students, formData.schoolId]);

    // Filtragem de profissionais por permissão (Escola só vê os dela) e filtro selecionado
    const filteredProfessionals = useMemo(() => {
        let result = professionals;

        // 1. Restrição por Perfil (ESCOLA só vê a sua unidade)
        if (isEscola) {
            const mySchoolId = schools.find(s => s.inep === currentUser?.schoolInep)?.id;
            result = result.filter(p => p.schoolId === mySchoolId);
        } else if (selectedSchoolFilter !== 'ALL') {
            // 2. Filtro Manual de Escola (Para Admin/Secretaria)
            result = result.filter(p => p.schoolId === selectedSchoolFilter);
        }

        // 3. Filtro por Nome (Normalizado)
        if (nameSearchTerm.trim()) {
            const search = normalizeString(nameSearchTerm);
            result = result.filter(p => normalizeString(p.name).includes(search));
        }

        // 4. Filtro por CPF (Sanitizado)
        if (cpfSearchTerm.trim()) {
            const search = sanitizeCPF(cpfSearchTerm);
            result = result.filter(p => sanitizeCPF(p.cpf).includes(search));
        }

        return result;
    }, [professionals, isEscola, currentUser, schools, selectedSchoolFilter, nameSearchTerm, cpfSearchTerm]);

    const hasActiveFilters = selectedSchoolFilter !== 'ALL' || nameSearchTerm.trim() !== '' || cpfSearchTerm.trim() !== '';

    const clearAllFilters = () => {
        if (!isEscola) setSelectedSchoolFilter('ALL');
        setNameSearchTerm('');
        setCpfSearchTerm('');
    };

    const getSchoolName = (id: string) => schools.find(s => s.id === id)?.name || 'Desconhecida';
    const getStudentName = (id: string) => students.find(s => s.id === id)?.fullName || 'Desconhecido';

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
        <div className="max-w-6xl mx-auto space-y-6">
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
                            onClick={() => { setIsAdding(true); resetForm(); }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                        >
                            <UserCog size={18} /> Novo Profissional
                        </button>
                    </div>
                )}
            </div>

            {/* Modal Importador */}
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

            {isAdding && (
                <div className="bg-white rounded-xl shadow-lg border border-primary-100 p-6 animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                            <UserCog size={20} className="text-primary-600" />
                            {formData.id ? 'Editar Profissional' : 'Cadastro de Profissional de Apoio Escolar'}
                        </h3>
                        <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Seção da Foto */}
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

                            {/* Coluna Principal do Formulário */}
                            <div className="flex-1 space-y-6">
                                {/* Dados Pessoais */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Dados Pessoais e Formação</h4>
                                    <div>
                                        <input required type="text" className="w-full rounded-lg border-slate-300 p-2.5 border focus:ring-primary-500"
                                            value={formData.name}
                                            name="name"
                                            onChange={handleInputChange}
                                            onBlur={e => setFormData({ ...formData, name: formatarNomeBR(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Formação Acadêmica</label>
                                        <div className="relative">
                                            <select
                                                className="w-full rounded-lg border-slate-300 p-2.5 border bg-white appearance-none pl-9"
                                                value={formData.education}
                                                name="education"
                                                onChange={handleInputChange}
                                            >
                                                <option value="">Selecione a formação...</option>
                                                {academicOptions.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            <GraduationCap className="absolute left-3 top-3 text-slate-400 pointer-events-none" size={16} />
                                            <ChevronDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={16} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                name="cpf"
                                                placeholder="000.000.000-00"
                                                value={formData.cpf} onChange={handleInputChange} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone/WhatsApp</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                name="phone"
                                                placeholder="(00) 00000-0000"
                                                value={formData.phone} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                                        <input type="email" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                            name="email"
                                            value={formData.email} onChange={handleInputChange} />
                                    </div>
                                </div>

                                {/* Dados Contratuais e Lotação */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Contrato e Lotação</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Início do Contrato</label>
                                            <div className="relative">
                                                <input type="date" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                    name="contractStartDate"
                                                    value={formData.contractStartDate} onChange={handleInputChange} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Carga Horária</label>
                                            <div className="relative">
                                                <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border pl-9"
                                                    name="workload"
                                                    value={formData.workload} onChange={handleInputChange} placeholder="Ex: 40h" />
                                                <Briefcase className="absolute left-3 top-3 text-slate-400" size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Autocomplete de Escola */}
                                    <div className="relative" ref={schoolInputRef}>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Escola de Lotação *</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                required={!formData.schoolId}
                                                className="w-full rounded-lg border-slate-300 p-2.5 border pl-9 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                                placeholder="Digite o nome da escola..."
                                                value={schoolSearchTerm}
                                                onFocus={() => !isEscola && setShowSchoolSuggestions(true)}
                                                disabled={isEscola}
                                                onChange={e => {
                                                    setSchoolSearchTerm(e.target.value);
                                                    setShowSchoolSuggestions(true);
                                                    // Limpar ID se o usuário alterar o texto (para forçar nova seleção)
                                                    if (formData.schoolId) {
                                                        setFormData(prev => ({ ...prev, schoolId: '', studentId: '' }));
                                                    }
                                                }}
                                            />
                                            <Search className="absolute left-3 top-3 text-slate-400" size={16} />

                                            {/* Indicador visual se selecionado validamente */}
                                            {formData.schoolId && (
                                                <div className="absolute right-3 top-3 text-green-500">
                                                    <SchoolIcon size={16} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Lista de Sugestões de Escola */}
                                        {showSchoolSuggestions && filteredSchools.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {filteredSchools.map(school => (
                                                    <button
                                                        key={school.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, schoolId: school.id, studentId: '' }); // Reset student selection too
                                                            setSchoolSearchTerm(school.name);
                                                            setShowSchoolSuggestions(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-sm text-slate-700"
                                                    >
                                                        <SchoolIcon size={14} className="text-slate-400" />
                                                        {school.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {showSchoolSuggestions && filteredSchools.length === 0 && schoolSearchTerm && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center text-slate-500 text-sm">
                                                Nenhuma escola encontrada.
                                            </div>
                                        )}
                                    </div>

                                    {/* Removido campo de Professor Regente (Entrada Manual) conforme solicitação */}

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Aluno Assistido *</label>
                                        <div className="relative">
                                            <select
                                                required
                                                className="w-full rounded-lg border-slate-300 p-2.5 border bg-white appearance-none disabled:bg-slate-100 disabled:text-slate-400"
                                                value={formData.studentId}
                                                name="studentId"
                                                onChange={handleInputChange}
                                                disabled={!formData.schoolId}
                                            >
                                                <option value="">
                                                    {!formData.schoolId
                                                        ? 'Selecione uma escola primeiro...'
                                                        : filteredStudents.length === 0
                                                            ? 'Nenhum aluno nesta escola'
                                                            : 'Selecione um aluno...'
                                                    }
                                                </option>
                                                {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                                            </select>
                                            <User className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={16} />
                                        </div>
                                        {formData.schoolId && filteredStudents.length === 0 && (
                                            <p className="text-xs text-amber-600 mt-1">
                                                Atenção: Não há alunos vinculados a esta escola no sistema.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Endereço */}
                        <div className="pt-4">
                            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                                <MapPin size={16} /> Endereço Residencial
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">CEP</label>
                                    <input type="text" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        name="zipCode"
                                        placeholder="00000-000"
                                        value={formData.address?.zipCode} onChange={handleAddressInputChange} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs text-slate-500 mb-1">Rua / Logradouro</label>
                                    <input type="text" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        name="street"
                                        value={formData.address?.street} onChange={handleAddressInputChange} />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Número</label>
                                    <input type="text" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        ref={numberInputRef}
                                        name="number"
                                        value={formData.address?.number} onChange={handleAddressInputChange} />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Bairro</label>
                                    <input type="text" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        name="district"
                                        value={formData.address?.district} onChange={handleAddressInputChange} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs text-slate-500 mb-1">Cidade</label>
                                    <input type="text" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        name="city"
                                        value={formData.address?.city} onChange={handleAddressInputChange} />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Estado</label>
                                    <input type="text" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        name="state"
                                        value={formData.address?.state} onChange={handleAddressInputChange} />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                            <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-md">
                                <Save size={18} /> Salvar Profissional
                            </button>
                        </div>
                    </form>
                </div>
            )}

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
                        <div key={prof.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all group relative border-l-4 border-l-primary-500">
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
                                            onClick={() => handleEdit(prof)} 
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            title="Editar"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    )}
                                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'EDUCATION_SECRETARY') && (
                                        <button 
                                            onClick={() => handleDeleteClick(prof.id)} 
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
        </div>
    );
};

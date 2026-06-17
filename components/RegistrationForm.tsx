import React, { useState, useRef, useEffect } from 'react';
import { Student, Gender, DocumentType, StudentDocument, School, AuditAction, SupportProfessional } from '../types';
import { Save, X, Activity, User, BookOpen, Users as UsersIcon, Upload, Trash2, FileText, Check, Paperclip, AlertCircle, Download, UserCheck } from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';
import { generateStudentPDF } from '../utils/pdfExport';
import { formatarNomeBR, formatarCPF, formatarTelefoneBR, formatarDataBR, apenasNumeros, dataBRParaISO, dataISOParaBR, calcularIdade, formatarCEP, limparDocumento } from '../utils/formatters';
import SearchableSelect from './SearchableSelect';
import { CEPService } from '../services/CEPService';

interface RegistrationFormProps {
    onSuccess: () => void;
    onCancel: () => void;
    initialData?: Student | null;
    currentUser?: any; // Recebe o usuário logado para verificar permissões
}

function snapshotStudentForMerge(s: Student): Student {
    try {
        return JSON.parse(JSON.stringify(s)) as Student;
    } catch {
        return { ...s };
    }
}

/** Quando o GET completo chega depois do usuário já ter editado, preserva o rascunho e só preenche lacunas do servidor. */
function mergeFullStudentIntoFormDraft(prev: Partial<Student>, full: Student, snap: Student): Student {
    const pick = <K extends keyof Student>(k: K): Student[K] => {
        const p = prev[k];
        const s = snap[k];
        if (p !== s) return p as Student[K];
        return full[k];
    };
    const guardiansTouched =
        JSON.stringify(prev.guardians ?? []) !== JSON.stringify(snap.guardians ?? []);
    const documentsTouched =
        JSON.stringify(prev.documents ?? []) !== JSON.stringify(snap.documents ?? []);

    return {
        ...full,
        fullName: pick('fullName'),
        birthDate: pick('birthDate'),
        cpf: pick('cpf'),
        gender: pick('gender'),
        ethnicity: pick('ethnicity'),
        motherName: pick('motherName'),
        fatherName: pick('fatherName'),
        rg: pick('rg'),
        susCard: pick('susCard'),
        nationality: pick('nationality'),
        birthPlace: pick('birthPlace'),
        unit: pick('unit'),
        status: pick('status'),
        photoUrl: pick('photoUrl'),
        clinical: { ...(full.clinical as object), ...(prev.clinical as object) } as Student['clinical'],
        school: { ...(full.school as object), ...(prev.school as object) } as Student['school'],
        address: { ...(full.address as object), ...(prev.address as object) } as Student['address'],
        socialInfo: { ...(full.socialInfo as object), ...(prev.socialInfo as object) } as Student['socialInfo'],
        guardians: (guardiansTouched ? prev.guardians : full.guardians) as Student['guardians'],
        documents: (documentsTouched ? prev.documents : full.documents) as Student['documents'],
        history: full.history?.length ? full.history : prev.history,
        id: full.id,
        createdAt: (full.createdAt ?? prev.createdAt) as string | undefined,
    } as Student;
}

function applyBirthPlaceToLocalFields(
    birthPlace: string | undefined,
    setBirthCity: (v: string) => void,
    setBirthState: (v: string) => void
) {
    if (birthPlace) {
        const parts = birthPlace.split('/').map((p) => p.trim());
        if (parts.length >= 2) {
            setBirthCity(parts[0]);
            setBirthState(parts[1]);
        } else {
            setBirthCity(birthPlace);
            setBirthState('');
        }
    } else {
        setBirthCity('');
        setBirthState('');
    }
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSuccess, onCancel, initialData, currentUser }) => {
    // Aba Clínica: apenas usuários que NÃO são recepcionistas veem esse bloqueio.
    // Recepcionistas (SEDE/COCAL/Educação) PODEM preencher diagnóstico/CID no cadastro.
    // Especialistas e Admin também têm acesso total.
    // Somente SPECIALIST é bloqueado de editar dados básicos de cadastro, mas isso é controlado em outro lugar.
    const isClinicalBlocked = false; // Todos os perfis com acesso ao formulário podem preencher o clínico básico.

    const [activeTab, setActiveTab] = useState<'personal' | 'clinical' | 'social' | 'school' | 'documents'>('personal');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const [selectedDocType, setSelectedDocType] = useState<DocumentType>('Outros');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [schools, setSchools] = useState<School[]>([]);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
    /** Anexos ainda não enviados ao Storage — `id` alinha com `StudentDocument.id` para remover da fila ao excluir na UI. */
    const [documentFiles, setDocumentFiles] = useState<{ id: string; file: File; type: string }[]>([]);
    const lastStudentIdForPendingFilesRef = useRef<string | null | undefined>(undefined);
    const [isSearchingCEP, setIsSearchingCEP] = useState(false);
    const [cepError, setCepError] = useState<string | null>(null);
    const [linkedATs, setLinkedATs] = useState<SupportProfessional[]>([]); // Novo estado para exibir ATs
    const schoolLinkOptionalRoles = new Set(['SECRETARIA_SEDE', 'SECRETARIA_COCAL', 'SECRETARIA_EDUCACAO', 'EDUCATION_SECRETARY', 'ADMIN']);
    const currentUserRole = String(currentUser?.role || '').toUpperCase();
    const canCreateWithoutSchoolLink = schoolLinkOptionalRoles.has(currentUserRole);

    // Ao trocar de aluno (ou sair de edição → cadastro novo), não manter fila de upload da tela anterior.
    useEffect(() => {
        const sid = initialData?.id ?? null;
        if (sid !== lastStudentIdForPendingFilesRef.current) {
            lastStudentIdForPendingFilesRef.current = sid;
            setDocumentFiles([]);
            setSelectedPhotoFile(null);
        }
    }, [initialData?.id]);

    // Novos estados locais para separar Naturalidade e Estado
    const [birthCity, setBirthCity] = useState('');
    const [birthState, setBirthState] = useState('');

    const handleCloseSuccess = () => {
        setShowSuccessModal(false);
        onSuccess();
    };

    // ... (States remain same) ...
    // Initial State
    const [formData, setFormData] = useState<Partial<Student>>({
        // id não inicializado: undefined para novos alunos (UUID gerado pelo banco no INSERT)
        status: 'Active',
        createdAt: new Date().toISOString(),
        photoUrl: '',
        ethnicity: '',
        rg: '',
        nationality: 'Brasileira',
        birthPlace: '',
        motherName: '',
        fatherName: '',
        address: { street: '', number: '', district: '', city: '', state: '', zipCode: '' },
        guardians: [{ name: '', relationship: '', phone: '', email: '', occupation: '', ethnicity: '', cpf: '', rg: '' }],
        clinical: { diagnosis: '', cid: '', medications: '', allergies: '', therapiesHistory: '', weight: '', height: '', specialNeeds: [] },
        school: { schoolId: '', schoolName: '', grade: '', hasSpecialAide: false, difficulties: '', shift: 'Manhã', teachingType: 'Regular', schedule: '' },
        socialInfo: { nis: '', bolsaFamilia: false, bpc: false },
        documents: []
    });

    // ... (Effects and handlers remain same until Tab rendering) ...
    // Edição: aplica dados já recebidos e, em seguida, hidrata com GET completo sem sobrescrever o que o usuário já digitou
    // (corrida getStudentById vs digitação). Depende só do id para não reexecutar a cada nova referência de objeto no pai.
    useEffect(() => {
        let cancelled = false;

        const applyStudentToForm = (src: Student) => {
            if (cancelled) return;
            const safeData: Student = {
                ...src,
                ethnicity: src.ethnicity || '',
                guardians: (src.guardians && src.guardians.length > 0)
                    ? src.guardians
                    : [{ name: '', relationship: '', phone: '', email: '', occupation: '', ethnicity: '', cpf: '', rg: '' }],
                socialInfo: src.socialInfo || { nis: '', bolsaFamilia: false, bpc: false },
                clinical: src.clinical || { diagnosis: '', medications: '', allergies: '', specialNeeds: [], therapiesHistory: '' },
                school: src.school || { schoolId: '', schoolName: '', grade: '', hasSpecialAide: false, difficulties: '', shift: 'Manhã', teachingType: 'Regular', schedule: '' }
            };

            applyBirthPlaceToLocalFields(safeData.birthPlace, setBirthCity, setBirthState);
            setFormData(safeData);

            if (safeData.id) {
                SupabaseService.getSupportProfessionalsByStudent(safeData.id)
                    .then(ats => { if (!cancelled) setLinkedATs(ats); })
                    .catch(err => console.error("Erro ao buscar ATs vinculados:", err));
            }
        };

        if (!initialData) {
            setBirthCity('');
            setBirthState('');
            setLinkedATs([]);
            return () => { cancelled = true; };
        }

        const snap = snapshotStudentForMerge(initialData as Student);
        applyStudentToForm(initialData as Student);

        if (!initialData.id) {
            return () => { cancelled = true; };
        }

        (async () => {
            try {
                const full = await SupabaseService.getStudentById(initialData.id);
                if (cancelled || !full) return;
                setFormData((prev) => {
                    const merged = mergeFullStudentIntoFormDraft(prev, full, snap);
                    queueMicrotask(() =>
                        applyBirthPlaceToLocalFields(merged.birthPlace, setBirthCity, setBirthState)
                    );
                    return merged;
                });
            } catch (e) {
                console.error('[RegistrationForm] Não foi possível carregar o aluno completo; mantendo dados já aplicados.', e);
            }
        })();

        return () => { cancelled = true; };
    }, [initialData?.id]);

    // Load schools list
    useEffect(() => {
        async function loadSchools() {
            try {
                const schoolsData = await SupabaseService.getSchools();
                // Filtra escolas se o usuário for regional
                const unit = (currentUser?.role === 'SECRETARIA_COCAL' || currentUser?.scope === 'COCAL') ? 'COCAL' :
                    (currentUser?.role === 'SECRETARIA_SEDE' || currentUser?.scope === 'SEDE') ? 'SEDE' : null;

                const filtered = unit ? schoolsData.filter(s => s.district === unit) : schoolsData;
                setSchools(filtered);

                // Auto-preenchimento Inteligente: Se houver apenas uma escola (comum para usuários logados com INEP)
                if (filtered.length === 1 && !initialData) {
                    const singleSchool = filtered[0];
                    console.log('[RegistrationForm] Auto-preenchendo escola única:', singleSchool.name);
                    setFormData(prev => ({
                        ...prev,
                        school: {
                            ...(prev.school || { grade: '', hasSpecialAide: false, difficulties: '', shift: 'Manhã', teachingType: 'Regular', schedule: '' }),
                            schoolId: singleSchool.id,
                            schoolName: singleSchool.name
                        }
                    }));
                }
            } catch (error) {
                console.error("Erro ao carregar escolas:", error);
            }
        }
        loadSchools();
    }, [currentUser, initialData]);

    // Funções auxiliares internas removidas em favor dos utilitários centrais (../utils/formatters)

    const handleInputChange = (section: keyof Student | null, field: string, value: any) => {
        const objectSections = ['address', 'clinical', 'school', 'socialInfo'];
        const nameFields = ['fullName', 'motherName', 'fatherName', 'name'];
        let finalValue = value;

        if (nameFields.includes(field)) {
            finalValue = formatarNomeBR(value);
        }

        if (section && objectSections.includes(section)) {
            setFormData(prev => {
                const currentSection = (prev[section] as any) || {};
                return {
                    ...prev,
                    [section]: {
                        ...currentSection,
                        [field]: finalValue
                    }
                };
            });
        } else if (section === 'guardians') {
            setFormData(prev => {
                const currentGuardians = prev.guardians || [];
                const newGuardians = [...currentGuardians];

                if (newGuardians.length === 0) {
                    newGuardians.push({
                        name: '', relationship: '', phone: '', email: '',
                        occupation: '', ethnicity: '', cpf: '', rg: ''
                    } as any);
                }

                newGuardians[0] = { ...newGuardians[0], [field]: finalValue };
                return { ...prev, guardians: newGuardians };
            });
        } else {
            setFormData(prev => ({ ...prev, [field]: finalValue }));
        }
    };

    const handleCEPChange = async (value: string) => {
        const formattedCEP = formatarCEP(value);
        handleInputChange('address', 'zipCode', formattedCEP);

        const numeros = apenasNumeros(value);
        if (numeros.length === 8) {
            setIsSearchingCEP(true);
            setCepError(null);
            try {
                const data = await CEPService.fetchAddress(numeros);
                if (data) {
                    setFormData(prev => ({
                        ...prev,
                        address: {
                            ...prev.address!,
                            street: data.street,
                            district: data.district,
                            city: data.city,
                            state: data.state
                        }
                    }));
                } else {
                    setCepError('CEP não encontrado');
                }
            } catch (error) {
                console.error("Erro ao buscar CEP:", error);
                setCepError('Erro ao buscar CEP');
            } finally {
                setIsSearchingCEP(false);
            }
        }
    };

    const handleCheckboxChange = (section: 'clinical', field: 'specialNeeds', value: string) => {
        setFormData(prev => {
            const currentList = prev.clinical?.specialNeeds || [];
            const newList = currentList.includes(value)
                ? currentList.filter(item => item !== value)
                : [...currentList, value];
            return {
                ...prev,
                clinical: { ...prev.clinical!, specialNeeds: newList }
            };
        });
    };

    const handleBooleanChange = (section: 'socialInfo' | 'school', field: string, value: boolean) => {
        setFormData(prev => {
            const currentSection = (prev[section] as any) || {};
            return {
                ...prev,
                [section]: {
                    ...currentSection,
                    [field]: value
                }
            };
        });
    };

    const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePhoto = () => {
        setFormData(prev => ({ ...prev, photoUrl: '' }));
        setSelectedPhotoFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>, type?: DocumentType) => {
        const file = event.target.files?.[0];
        const docType = type || selectedDocType;

        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newId = crypto.randomUUID();
                const newDoc: StudentDocument = {
                    id: newId,
                    type: docType,
                    fileName: file.name,
                    url: reader.result as string,
                    uploadedAt: new Date().toISOString()
                };

                setFormData(prev => ({
                    ...prev,
                    documents: [...(prev.documents || []), newDoc]
                }));

                setDocumentFiles(prev => [...prev, { id: newId, file, type: docType }]);
            };
            reader.readAsDataURL(file);
        }
        if (event.target) event.target.value = '';
    };

    const removeDocument = (docId: string) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents?.filter(d => d.id !== docId) || []
        }));
        setDocumentFiles(prev => prev.filter(d => d.id !== docId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSaveError(null);

        try {
            // ── VERIFICAÇÃO DE DUPLICATA ──────────────────────────────────
            const allStudents = await SupabaseService.getStudents();
            const nomeLimpo = (formData.fullName || '').trim().toLowerCase();
            const cpfLimpo = (formData.cpf || '').replace(/\D/g, '');

            const duplicados = allStudents.filter(s => {
                if (s.id && formData.id && s.id === formData.id) return false; // edição do mesmo aluno
                const nomeIgual = s.fullName?.trim().toLowerCase() === nomeLimpo;
                const cpfIgual = cpfLimpo && (s.cpf || '').replace(/\D/g, '') === cpfLimpo;
                return nomeIgual || cpfIgual;
            });

            if (duplicados.length > 0) {
                const dup = duplicados[0];
                const motivo = ((dup.cpf || '').replace(/\D/g, '') === cpfLimpo && cpfLimpo)
                    ? `CPF ${formData.cpf}`
                    : `nome "${dup.fullName}"`;
                const confirmar = window.confirm(
                    `⚠️ ATENÇÃO — Aluno possivelmente já cadastrado!\n\n` +
                    `Foi encontrado um aluno com o mesmo ${motivo} no sistema:\n\n` +
                    `Nome: ${dup.fullName}\n` +
                    `Escola: ${dup.school?.schoolName || 'não informada'}\n` +
                    `Status: ${dup.status === 'Active' ? 'Ativo' : 'Inativo'}\n\n` +
                    `Deseja continuar e criar mesmo assim?\n` +
                    `(Clique em CANCELAR para revisar ou OK para prosseguir)`
                );
                if (!confirmar) {
                    setIsSubmitting(false);
                    return;
                }
            }
            // ─────────────────────────────────────────────────────────────
            // Validação Pré-envio: Garantir school_id
            let finalSchoolId = formData.school?.schoolId || (currentUser?.role === 'ESCOLA' ? currentUser?.schoolId : undefined);
            let finalSchoolName = formData.school?.schoolName;

            if (!finalSchoolId && currentUser?.schoolInep) {
                // Tenta recuperar o ID pela lista de escolas carregada usando o INEP do usuário (Conversão de tipo forçada)
                const schoolByInep = schools.find(s => String(s.inep) === String(currentUser.schoolInep));
                if (schoolByInep) {
                    finalSchoolId = schoolByInep.id;
                    finalSchoolName = schoolByInep.name;
                    console.log('[RegistrationForm] ID da escola recuperado via INEP:', finalSchoolId);
                }
            }

            // Log de Emergência solicitado pelo usuário
            console.log('DEBUG_CADASTRO:', { 
                finalSchoolId, 
                inep: currentUser?.schoolInep, 
                schoolsCount: schools.length,
                formDataSchoolId: formData.school?.schoolId 
            });

            // Perfis administrativos de rede podem criar cadastro inicial incompleto sem vínculo escolar.
            // Perfis escolares continuam exigindo school_id/nome de escola para preservar a regra de vínculo.
            if (!canCreateWithoutSchoolLink && !finalSchoolId && (!finalSchoolName || finalSchoolName.trim() === '')) {
                setSaveError('Impossível salvar: Vínculo escolar não localizado. Verifique se o INEP no seu perfil está correto.');
                setIsSubmitting(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // Unir Naturalidade e Estado antes de salvar
            const combinedBirthPlace = (birthCity && birthState ? `${birthCity} / ${birthState}` : birthCity || birthState || '').trim();

            // Higienização final dos nomes para garantir que espaços extras sejam removidos antes de salvar
            const sanitizedData = {
                ...formData,
                fullName: formData.fullName ? formatarNomeBR(formData.fullName).replace(/\s+/g, ' ').trim() : '',
                motherName: formData.motherName ? formatarNomeBR(formData.motherName).replace(/\s+/g, ' ').trim() : '',
                fatherName: formData.fatherName ? formatarNomeBR(formData.fatherName).replace(/\s+/g, ' ').trim() : '',
                birthPlace: combinedBirthPlace,
                school: {
                    ...(formData.school || {}),
                    schoolId: finalSchoolId,
                    schoolName: finalSchoolName
                },
                guardians: formData.guardians?.map(g => ({
                    ...g,
                    name: g.name ? formatarNomeBR(g.name).replace(/\s+/g, ' ').trim() : ''
                }))
            };

            const submissionData = sanitizedData as Student;

            console.log('[RegistrationForm] Enviando para saveStudent - ID:', submissionData.id, 'CPF:', submissionData.cpf);
            const startTime = Date.now();
            const savedId = await SupabaseService.saveStudent(
                submissionData,
                selectedPhotoFile || undefined,
                documentFiles.map(({ file, type }) => ({ file, type }))
            );
            console.log(`[RegistrationForm] saveStudent concluído em ${Date.now() - startTime}ms. ID salvo:`, savedId);

            // Registro de Auditoria: Estudante
            const acao = initialData ? AuditAction.UPDATE : AuditAction.CREATE;
            await SupabaseService.logAction(currentUser, acao, 'ALUNOS', submissionData.fullName || 'Novo Aluno');

            setDocumentFiles([]);
            setSelectedPhotoFile(null);
            setFormData(prev => ({ ...prev, id: savedId }));

            setIsSubmitting(false);
            setShowSuccessModal(true);
        } catch (err: any) {
            console.error('Erro detalhado ao salvar aluno:', err);
            let errorMessage = err?.message || err?.error_description || 'Erro desconhecido ao salvar.';
            if (typeof err === 'object' && err !== null) {
                try {
                    errorMessage += ` | Detalhes: ${JSON.stringify(err)}`;
                } catch (e) {
                    errorMessage += ` | (Erro não serializável)`;
                }
            }
            setSaveError(`Não foi possível salvar os dados. Detalhe: ${errorMessage}`);
            setIsSubmitting(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleExportPDF = async () => {
        if (!formData.fullName) return;
        const originalText = "Exportar PDF";
        const button = document.getElementById('btn-export-pdf');
        if (button) button.innerText = "Gerando...";
        try {
            await generateStudentPDF(formData as Student);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Erro ao gerar PDF. Verifique o console.");
        } finally {
            if (button) button.innerText = originalText;
        }
    };

    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
        >
            <Icon size={18} />
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    return (
        <>
            <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-140px)] md:h-auto">

                {saveError && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6 mb-0">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700 font-medium">
                                    Ocorreu um erro ao salvar
                                </p>
                                <p className="text-xs text-red-600 mt-1">
                                    {saveError}
                                </p>
                            </div>
                            <div className="ml-auto pl-3">
                                <button
                                    className="-mx-1.5 -my-1.5 bg-red-50 text-red-500 hover:text-red-800 rounded-lg p-1.5 inline-flex h-8 w-8 items-center justify-center transition-colors"
                                    onClick={() => setSaveError(null)}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {initialData ? 'Editar Aluno' : 'Ficha de Cadastro de Aluno'}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {initialData ? 'Atualize os dados do prontuário' : 'Preencha os dados completos para admissão'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {initialData && !isClinicalBlocked && (
                            <button
                                id="btn-export-pdf"
                                type="button"
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors mr-2"
                                title="Baixar Ficha Completa (PDF)"
                            >
                                <Download size={16} /> Exportar PDF
                            </button>
                        )}
                        <button onClick={onCancel} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-slate-100 rounded-full">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex border-b border-slate-100 overflow-x-auto bg-white sticky top-0 z-10">
                    <TabButton id="personal" label="Dados Pessoais" icon={User} />
                    {!isClinicalBlocked && <TabButton id="clinical" label="Clínico/Saúde" icon={Activity} />}
                    <TabButton id="social" label="Familiar/Social" icon={UsersIcon} />
                    <TabButton id="school" label="Dados Escolares" icon={BookOpen} />
                    <TabButton id="documents" label="Documentação" icon={Paperclip} />
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8">

                    {
                        activeTab === 'personal' && (
                            <div className="animate-fadeIn space-y-8">

                                {/* Header com Foto e Dados Básicos */}
                                <div className="flex flex-col md:flex-row gap-8">
                                    {/* Photo Upload */}
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="relative group">
                                            <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
                                                {formData.photoUrl ? (
                                                    <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={48} className="text-slate-300" />
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

                                    {/* Main Inputs */}
                                    <div className="flex-1 space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                            <div className="md:col-span-12">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo do Aluno *</label>
                                                <input required type="text" className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                    value={formData.fullName || ''} onChange={e => handleInputChange(null, 'fullName', e.target.value)} />
                                            </div>

                                            <div className="md:col-span-4">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento *</label>
                                                <input required type="date" className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                    value={formData.birthDate || ''} onChange={e => handleInputChange(null, 'birthDate', e.target.value)} />
                                            </div>

                                            <div className="md:col-span-3">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Idade</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-600 p-2.5 border font-semibold text-center cursor-default"
                                                        value={formData.birthDate ? `${calcularIdade(formData.birthDate)} Anos` : '--'}
                                                    />
                                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                                        <Activity size={16} className="text-slate-300" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Gênero</label>
                                                <select className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                    value={formData.gender || ''} onChange={e => handleInputChange(null, 'gender', e.target.value)}>
                                                    <option value="">Selecione</option>
                                                    {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                                                </select>
                                            </div>
                                            <div className="md:col-span-3">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Cor / Etnia</label>
                                                <select className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                    value={formData.ethnicity || ''} onChange={e => handleInputChange(null, 'ethnicity', e.target.value)}>
                                                    <option value="">Selecione</option>
                                                    <option value="Branca">Branca</option>
                                                    <option value="Preta">Preta</option>
                                                    <option value="Parda">Parda</option>
                                                    <option value="Amarela">Amarela</option>
                                                    <option value="Indígena">Indígena</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Nacionalidade</label>
                                                <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                    value={formData.nationality || ''} onChange={e => handleInputChange(null, 'nationality', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Naturalidade (Cidade)</label>
                                                <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                    value={birthCity} onChange={e => setBirthCity(e.target.value)} placeholder="Ex: São Paulo" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Estado (UF)</label>
                                                <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                    value={birthState} onChange={e => setBirthState(e.target.value.toUpperCase())} maxLength={2} placeholder="Ex: SP" />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Mãe</label>
                                                <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                    value={formData.motherName || ''} onChange={e => handleInputChange(null, 'motherName', e.target.value)} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Pai</label>
                                                <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                    value={formData.fatherName || ''} onChange={e => handleInputChange(null, 'fatherName', e.target.value)} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-slate-100">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Certidão Nasc. / RG</label>
                                                <input type="text" className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                    value={formData.rg || ''} onChange={e => handleInputChange(null, 'rg', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                                                <input
                                                    type="text"
                                                    className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                    value={formData.cpf || ''}
                                                    onChange={e => handleInputChange(null, 'cpf', formatarCPF(e.target.value))}
                                                    placeholder="000.000.000-00"
                                                    maxLength={14}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Cartão SUS</label>
                                                <input type="text" className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                    value={formData.susCard || ''} onChange={e => handleInputChange(null, 'susCard', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                        <div className="w-1 h-4 bg-primary-500 rounded-full"></div> Endereço Residencial
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-xs font-medium text-slate-500">CEP</label>
                                                {isSearchingCEP && <span className="text-[10px] text-primary-600 animate-pulse font-bold italic">Buscando...</span>}
                                                {cepError && <span className="text-[10px] text-red-500 font-bold italic">{cepError}</span>}
                                            </div>
                                            <input
                                                type="text"
                                                className={`w-full rounded-lg p-2.5 border transition-all ${cepError ? 'border-red-300 bg-red-50' : 'border-slate-300 focus:ring-primary-500 focus:border-primary-500'}`}
                                                value={formData.address?.zipCode || ''}
                                                onChange={e => handleCEPChange(e.target.value)}
                                                placeholder="00000-000"
                                                maxLength={9}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Logradouro (Rua, Av, etc)</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.address?.street} onChange={e => handleInputChange('address', 'street', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Número</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.address?.number} onChange={e => handleInputChange('address', 'number', e.target.value)} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Bairro</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.address?.district} onChange={e => handleInputChange('address', 'district', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Cidade</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.address?.city} onChange={e => handleInputChange('address', 'city', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">UF</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.address?.state} onChange={e => handleInputChange('address', 'state', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'clinical' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex gap-3 items-start">
                                    <Activity className="text-red-500 shrink-0 mt-1" size={20} />
                                    <p className="text-sm text-red-800">Preencha com atenção os dados clínicos e de saúde. Estas informações são cruciais para o atendimento.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Diagnóstico Principal *</label>
                                        <input required type="text" className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                            value={formData.clinical?.diagnosis} onChange={e => handleInputChange('clinical', 'diagnosis', e.target.value)} placeholder="Ex: Transtorno do Espectro Autista (TEA)" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">CID (Código Internacional)</label>
                                        <input type="text" className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                            value={formData.clinical?.cid} onChange={e => handleInputChange('clinical', 'cid', e.target.value)} placeholder="Ex: F84.0" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Peso (kg)</label>
                                        <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                            value={formData.clinical?.weight || ''} onChange={e => handleInputChange('clinical', 'weight', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Altura (cm)</label>
                                        <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                            value={formData.clinical?.height || ''} onChange={e => handleInputChange('clinical', 'height', e.target.value)} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Necessidades Especiais (Marque as que se aplicam)</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {['Altas Habilidades', 'Auditiva', 'Física', 'Mental', 'Multi-deficiência', 'Visual', 'Condutas Típicas', 'Outros'].map(need => (
                                            <label key={need} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                                                <input type="checkbox"
                                                    checked={formData.clinical?.specialNeeds?.includes(need)}
                                                    onChange={() => handleCheckboxChange('clinical', 'specialNeeds', need)}
                                                    className="rounded text-primary-600"
                                                />
                                                <span className="text-sm text-slate-700">{need}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Medicamentos em uso</label>
                                        <textarea className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border" rows={4}
                                            value={formData.clinical?.medications} onChange={e => handleInputChange('clinical', 'medications', e.target.value)} placeholder="Liste medicamentos e dosagens..."></textarea>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Alergias</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                value={formData.clinical?.allergies} onChange={e => handleInputChange('clinical', 'allergies', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Histórico de Terapias</label>
                                            <textarea className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border" rows={2}
                                                value={formData.clinical?.therapiesHistory} onChange={e => handleInputChange('clinical', 'therapiesHistory', e.target.value)} placeholder="Já fez fono, fisio, etc?"></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'social' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Dados do Responsável</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Responsável</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.guardians?.[0]?.name || ''} onChange={e => handleInputChange('guardians', 'name', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Parentesco</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.guardians?.[0]?.relationship || ''} onChange={e => handleInputChange('guardians', 'relationship', e.target.value)} placeholder="Mãe, Pai, Avó..." />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">CPF do Responsável</label>
                                            <input
                                                type="text"
                                                className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.guardians?.[0]?.cpf || ''}
                                                onChange={e => handleInputChange('guardians', 'cpf', formatarCPF(e.target.value))}
                                                placeholder="000.000.000-00"
                                                maxLength={14}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">RG do Responsável</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.guardians?.[0]?.rg || ''} onChange={e => handleInputChange('guardians', 'rg', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
                                            <input
                                                type="text"
                                                className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.guardians?.[0]?.phone || ''}
                                                onChange={e => handleInputChange('guardians', 'phone', formatarTelefoneBR(e.target.value))}
                                                placeholder="(00) 00000-0000"
                                                maxLength={15}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Ocupação</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.guardians?.[0]?.occupation || ''} onChange={e => handleInputChange('guardians', 'occupation', e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                    <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-4">Dados Sociais e Benefícios</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-blue-800 mb-1">Número NIS</label>
                                            <input type="text" className="w-full rounded-lg border-blue-200 focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white"
                                                value={formData.socialInfo?.nis || ''} onChange={e => handleInputChange('socialInfo', 'nis', e.target.value)} />
                                        </div>
                                        <div className="flex flex-col justify-center space-y-3">
                                            <span className="text-sm font-medium text-blue-800">Programas Sociais</span>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-blue-200 shadow-sm cursor-pointer hover:bg-blue-50 transition-colors">
                                                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500"
                                                        checked={formData.socialInfo?.bolsaFamilia || false}
                                                        onChange={e => handleBooleanChange('socialInfo', 'bolsaFamilia', e.target.checked)} />
                                                    <span className="text-sm text-blue-900">Bolsa Família</span>
                                                </label>
                                                <label className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-blue-200 shadow-sm cursor-pointer hover:bg-blue-50 transition-colors">
                                                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500"
                                                        checked={formData.socialInfo?.bpc || false}
                                                        onChange={e => handleBooleanChange('socialInfo', 'bpc', e.target.checked)} />
                                                    <span className="text-sm text-blue-900">BPC / LOAS</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'school' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Escola</label>
                                        <SearchableSelect
                                            options={[
                                                ...schools.map(school => ({
                                                    value: school.id,
                                                    label: `${school.name} ${school.inep ? `(INEP: ${school.inep})` : ''}`
                                                })),
                                                { value: 'OUTRA', label: 'Outra (Não Listada / Digitar Nome)' }
                                            ]}
                                            value={schools.length === 1 ? schools[0].id : (formData.school?.schoolId || (formData.school?.schoolName?.trim() ? 'OUTRA' : ''))}
                                            onChange={(selectedId) => {
                                                if (selectedId === 'OUTRA') {
                                                    handleInputChange('school', 'schoolId', '');
                                                    if (!formData.school?.schoolName || schools.some(s => s.name === formData.school?.schoolName)) {
                                                        handleInputChange('school', 'schoolName', ' ' /* Espaço para forçar a exibição do input manual */);
                                                    }
                                                } else {
                                                    const school = schools.find(s => s.id === selectedId);
                                                    if (school) {
                                                        handleInputChange('school', 'schoolId', school.id);
                                                        handleInputChange('school', 'schoolName', school.name);
                                                    } else {
                                                        handleInputChange('school', 'schoolId', '');
                                                        handleInputChange('school', 'schoolName', '');
                                                    }
                                                }
                                            }}
                                            placeholder="Selecione clicando ou digite para buscar..."
                                        />

                                        {(!formData.school?.schoolId && formData.school?.schoolName) && (
                                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mt-3 animate-fadeIn">
                                                <label className="block text-xs font-medium text-slate-700 mb-1">Digite o Nome da Escola Manualmente *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                    value={formData.school?.schoolName.trim() === '' ? '' : formData.school?.schoolName}
                                                    onChange={e => handleInputChange('school', 'schoolName', e.target.value)}
                                                    placeholder="Ex: Escola Municipal Nova Vida"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Série/Ano Escolar</label>
                                        <select
                                            className="w-full rounded-lg border-slate-300 p-2.5 border"
                                            value={formData.school?.grade || ''}
                                            onChange={e => handleInputChange('school', 'grade', e.target.value)}
                                        >
                                            <option value="">Selecione...</option>
                                            <optgroup label="Educação Infantil">
                                                <option value="Berçário I">Berçário I</option>
                                                <option value="Berçário II">Berçário II</option>
                                                <option value="Maternal I">Maternal I</option>
                                                <option value="Maternal II">Maternal II</option>
                                                <option value="Pré I">Pré I</option>
                                                <option value="Pré II">Pré II</option>
                                            </optgroup>
                                            <optgroup label="Ensino Fundamental I">
                                                <option value="1º Ano">1º Ano</option>
                                                <option value="2º Ano">2º Ano</option>
                                                <option value="3º Ano">3º Ano</option>
                                                <option value="4º Ano">4º Ano</option>
                                                <option value="5º Ano">5º Ano</option>
                                            </optgroup>
                                            <optgroup label="Ensino Fundamental II">
                                                <option value="6º Ano">6º Ano</option>
                                                <option value="7º Ano">7º Ano</option>
                                                <option value="8º Ano">8º Ano</option>
                                                <option value="9º Ano">9º Ano</option>
                                            </optgroup>
                                            <optgroup label="Ensino Médio">
                                                <option value="1º Ano Médio">1º Ano Médio</option>
                                                <option value="2º Ano Médio">2º Ano Médio</option>
                                                <option value="3º Ano Médio">3º Ano Médio</option>
                                            </optgroup>
                                            <optgroup label="EJA">
                                                <option value="EJA - Ciclo I">EJA - Ciclo I</option>
                                                <option value="EJA - Ciclo II">EJA - Ciclo II</option>
                                                <option value="EJA - Ensino Médio">EJA - Ensino Médio</option>
                                            </optgroup>
                                            <optgroup label="Outros">
                                                <option value="Classe Especial">Classe Especial</option>
                                                <option value="Aceleração">Aceleração</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Ensino</label>
                                        <select className="w-full rounded-lg border-slate-300 p-2.5 border"
                                            value={formData.school?.teachingType} onChange={e => handleInputChange('school', 'teachingType', e.target.value)}>
                                            <option value="Regular">Regular</option>
                                            <option value="EJA">EJA</option>
                                            <option value="Especial">Especial</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Turno</label>
                                        <select className="w-full rounded-lg border-slate-300 p-2.5 border"
                                            value={formData.school?.shift} onChange={e => handleInputChange('school', 'shift', e.target.value)}>
                                            <option value="Manhã">Manhã</option>
                                            <option value="Tarde">Tarde</option>
                                            <option value="Noite">Noite</option>
                                            <option value="Integral">Integral</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Horário (Das X às Y)</label>
                                        <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                            value={formData.school?.schedule || ''} onChange={e => handleInputChange('school', 'schedule', e.target.value)} placeholder="07:00 às 12:00" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Professora Regente <span className="text-slate-400 font-normal">(opcional)</span></label>
                                        <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                            value={formData.school?.regentTeacher || ''} onChange={e => handleInputChange('school', 'regentTeacher', e.target.value)} placeholder="Nome da professora regente" />
                                    </div>
                                    <div className="flex flex-col pb-3 md:col-span-2 gap-2">
                                        <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border w-full transition-colors ${linkedATs.length > 0 ? 'bg-green-50/50 border-green-200 cursor-default' : 'bg-slate-50 border-slate-200 cursor-pointer hover:bg-slate-100'}`}>
                                            <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500"
                                                checked={linkedATs.length > 0 ? true : !!formData.school?.hasSpecialAide}
                                                disabled={linkedATs.length > 0}
                                                onChange={e => handleInputChange('school', 'hasSpecialAide', e.target.checked)} />
                                            <span className={`text-sm font-medium ${linkedATs.length > 0 ? 'text-green-800' : 'text-slate-700'}`}>
                                                Possui Acompanhante Terapêutico (AT)?
                                            </span>
                                        </label>

                                        {linkedATs.length > 0 && (
                                            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg animate-fadeIn text-green-800">
                                                <UserCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-semibold">Profissional de Apoio Vinculado no Sistema:</p>
                                                    <ul className="text-sm mt-1 space-y-1">
                                                        {linkedATs.map(at => (
                                                            <li key={at.id} className="flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                                {at.name}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Principais Dificuldades Escolares</label>
                                    <textarea className="w-full rounded-lg border-slate-300 p-2.5 border" rows={5}
                                        value={formData.school?.difficulties} onChange={e => handleInputChange('school', 'difficulties', e.target.value)}
                                        placeholder="Ex: Alfabetização, interação social no recreio, compreensão de instruções complexas..."></textarea>
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'documents' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">Upload de Documentos</h3>
                                    <p className="text-sm text-slate-500 mb-6">Anexe fotos ou digitalizações dos documentos obrigatórios.</p>

                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                        {[
                                            { type: 'Laudo Médico', icon: Activity },
                                            { type: 'Receita Médica', icon: FileText },
                                            { type: 'Cartão de Vacina', icon: Check },
                                            { type: 'Cartão SUS', icon: Activity },
                                            { type: 'Certidão de Nascimento', icon: User },
                                            { type: 'PEI', icon: BookOpen },
                                            // Novo item solicitado
                                            { type: 'Autorização de Uso de Imagem', icon: FileText },
                                            { type: 'RG', icon: User },
                                            { type: 'CPF', icon: FileText }
                                        ].map((docItem) => {
                                            // Verifica se já existe documento deste tipo (visual feedback)
                                            const hasFile = formData.documents?.some(d => d.type === docItem.type) ||
                                                documentFiles.some(d => d.type === docItem.type);

                                            return (
                                                <div key={docItem.type} className="relative group">
                                                    <label className={`flex flex-col items-center justify-center p-4 h-32 bg-white border-2 border-dashed rounded-lg cursor-pointer transition-all
                                                    ${hasFile
                                                            ? 'border-green-500 bg-green-50'
                                                            : 'border-slate-300 hover:border-primary-500 hover:bg-primary-50'
                                                        }`}>

                                                        {hasFile ? (
                                                            <Check className="text-green-600 mb-2" size={24} />
                                                        ) : (
                                                            <docItem.icon className="text-slate-400 mb-2 group-hover:text-primary-600" size={24} />
                                                        )}

                                                        <span className={`text-xs font-medium text-center leading-tight ${hasFile ? 'text-green-700' : 'text-slate-600 group-hover:text-primary-700'}`}>
                                                            {docItem.type}
                                                            {hasFile && <span className="block text-[10px] font-normal">(Anexado)</span>}
                                                        </span>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*,application/pdf"
                                                            onChange={(e) => handleDocumentUpload(e, docItem.type as DocumentType)}
                                                        />
                                                    </label>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-slate-200 text-left">
                                        <div className="flex flex-col sm:flex-row gap-4 mb-4 items-end">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Outro Tipo de Documento</label>
                                                <select
                                                    className="border border-slate-300 rounded text-sm p-2 w-full sm:w-48"
                                                    value={selectedDocType}
                                                    onChange={(e) => setSelectedDocType(e.target.value as DocumentType)}
                                                >
                                                    <option value="Outros">Outros Documentos</option>
                                                    <option value="Laudo Médico">Laudo Médico</option>
                                                    <option value="RG">RG</option>
                                                    <option value="CPF">CPF</option>
                                                    <option value="Receita Médica">Receita Médica</option>
                                                    <option value="Receita Médica">Receita Médica</option>
                                                    <option value="Cartão de Vacina">Cartão de Vacina</option>
                                                    <option value="PEI">PEI (Plano de Ensino Indiv.)</option>
                                                </select>
                                            </div>

                                            <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer h-[38px]">
                                                <Upload size={16} /> Carregar Arquivo
                                                <input
                                                    ref={docInputRef}
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) => handleDocumentUpload(e)}
                                                />
                                            </label>
                                        </div>

                                        <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                            <Paperclip size={16} /> Arquivos Anexados ({formData.documents?.length || 0})
                                        </h4>

                                        {(!formData.documents || formData.documents.length === 0) ? (
                                            <p className="text-sm text-slate-400 italic bg-white p-4 rounded border border-slate-100 text-center">Nenhum documento anexado ainda.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {formData.documents.map((doc, idx) => (
                                                    <div key={idx} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-slate-100 rounded text-slate-500">
                                                                <FileText size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-800">{doc.type}</p>
                                                                <p className="text-xs text-slate-500">{doc.fileName} • {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDocument(doc.id)}
                                                            className="text-slate-400 hover:text-red-500 p-2"
                                                            title="Remover documento"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </form >

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 sticky bottom-0 z-10">
                    <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 px-8 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 shadow-md">
                        <Save size={18} />
                        {isSubmitting ? 'Salvando...' : (initialData ? 'Atualizar Aluno' : 'Finalizar Cadastro')}
                    </button>
                </div>
            </div >

            {/* Professional Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 flex flex-col items-center text-center animate-slideUp">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 animate-pulse">
                            <Check size={48} strokeWidth={3} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Sucesso!</h3>
                        <p className="text-slate-600 mb-8 leading-relaxed">
                            A ficha do aluno <br />
                            <strong className="text-slate-900">{formData.fullName}</strong>
                            <br /> foi salva corretamente no sistema.
                        </p>
                        <button
                            onClick={handleCloseSuccess}
                            className="w-full py-3.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-green-600/20"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
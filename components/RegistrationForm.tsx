import React, { useState, useRef, useEffect } from 'react';
import { Student, Gender, DocumentType, StudentDocument, School } from '../types';
import { Save, X, Activity, User, BookOpen, Users as UsersIcon, Upload, Trash2, FileText, Check, Paperclip, AlertCircle, Download } from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';

interface RegistrationFormProps {
    onSuccess: () => void;
    onCancel: () => void;
    initialData?: Student | null;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSuccess, onCancel, initialData }) => {
    const [activeTab, setActiveTab] = useState<'personal' | 'clinical' | 'social' | 'school' | 'documents'>('personal');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const [selectedDocType, setSelectedDocType] = useState<DocumentType>('Outros');
    const [showSuccessModal, setShowSuccessModal] = useState(false); // State for professional feedback modal
    const [schools, setSchools] = useState<School[]>([]); // State for schools list

    const handleCloseSuccess = () => {
        setShowSuccessModal(false);
        onSuccess();
    };

    // Initial State
    const [formData, setFormData] = useState<Partial<Student>>({
        id: crypto.randomUUID(),
        status: 'Active',
        createdAt: new Date().toISOString(),
        photoUrl: '',
        rg: '',
        nationality: 'Brasileira',
        birthPlace: '',
        motherName: '',
        fatherName: '',
        address: { street: '', number: '', district: '', city: '', state: '', zipCode: '' },
        guardians: [{ name: '', relationship: '', phone: '', email: '', occupation: '', ethnicity: '', cpf: '', rg: '' }],
        clinical: { diagnosis: '', cid: '', medications: '', allergies: '', therapiesHistory: '', weight: '', height: '', specialNeeds: [] },
        school: { schoolName: '', grade: '', hasSpecialAide: false, difficulties: '', shift: 'Manhã', teachingType: 'Regular', schedule: '' },
        socialInfo: { nis: '', bolsaFamilia: false, bpc: false },
        documents: []
    });

    // Load initial data if editing
    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    // Load schools list
    useEffect(() => {
        async function loadSchools() {
            try {
                const schoolsData = await SupabaseService.getSchools();
                setSchools(schoolsData);
            } catch (error) {
                console.error("Erro ao carregar escolas:", error);
            }
        }
        loadSchools();
    }, []);

    // Função auxiliar para formatar CPF
    const formatCPF = (value: string) => {
        return value
            .replace(/\D/g, '') // Remove tudo o que não é dígito
            .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto entre o terceiro e o quarto dígitos
            .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto entre o terceiro e o quarto dígitos de novo (para o segundo bloco de números)
            .replace(/(\d{3})(\d{1,2})/, '$1-$2') // Coloca um hífen entre o terceiro e o quarto dígitos
            .replace(/(-\d{2})\d+?$/, '$1'); // Impede que sejam digitados mais de 11 dígitos
    };

    const handleInputChange = (section: keyof Student | null, field: string, value: any) => {
        // Seções que são objetos aninhados
        const objectSections = ['address', 'clinical', 'school', 'socialInfo'];

        if (section && objectSections.includes(section)) {
            setFormData(prev => {
                // Garante que a seção existe (fallback para objeto vazio)
                const currentSection = (prev[section] as any) || {};
                return {
                    ...prev,
                    [section]: {
                        ...currentSection,
                        [field]: value
                    }
                };
            });
        } else if (section === 'guardians') {
            setFormData(prev => {
                const currentGuardians = prev.guardians || [];
                const newGuardians = [...currentGuardians];

                if (newGuardians.length === 0) {
                    // Se não houver responsável, cria o primeiro
                    newGuardians.push({
                        name: '', relationship: '', phone: '', email: '',
                        occupation: '', ethnicity: '', cpf: '', rg: ''
                    } as any);
                }

                // Atualiza o primeiro responsável (índice 0)
                newGuardians[0] = { ...newGuardians[0], [field]: value };

                return { ...prev, guardians: newGuardians };
            });
        } else {
            // Atualização na raiz do objeto (ex: fullName, birthDate)
            setFormData(prev => ({ ...prev, [field]: value }));
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

    const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>, type?: DocumentType) => {
        const file = event.target.files?.[0];
        const docType = type || selectedDocType;

        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newDoc: StudentDocument = {
                    id: crypto.randomUUID(),
                    type: docType,
                    fileName: file.name,
                    url: reader.result as string,
                    uploadedAt: new Date().toISOString()
                };

                setFormData(prev => ({
                    ...prev,
                    documents: [...(prev.documents || []), newDoc]
                }));
            };
            reader.readAsDataURL(file);
        }

        // Reset input
        if (event.target) event.target.value = '';
    };

    const removeDocument = (docId: string) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents?.filter(d => d.id !== docId) || []
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await SupabaseService.saveStudent(formData as Student);
            setIsSubmitting(false);
            setShowSuccessModal(true); // Show success modal instead of closing immediately
        } catch (err) {
            console.error('Erro ao salvar aluno:', err);
            setIsSubmitting(false);
            alert('Erro ao salvar aluno no banco de dados.');
        }
    };

    const handleExportJSON = () => {
        if (!formData.fullName) return;

        const exportData = {
            ...formData,
            exportedAt: new Date().toISOString(),
            systemVersion: "2.0"
        };

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(exportData, null, 2)
        )}`;

        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `ficha_aluno_${formData.fullName.replace(/\s+/g, "_").toLowerCase()}.json`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
            <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-140px)] md:h-auto">
                {/* ... existing content ... */}
                {/* Due to tool limits, I'm replacing the WRAPPER only, but I need to be careful to not lose content. 
                   Actually, replacing the entire return is risky with tool limits.
                   Wait, I can replace just the return start and end if I do it carefully or use specific anchors.
                   But since the file is large, I'll use a safer approach: Replace the wrapper div lines.
                */}
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
                        {initialData && (
                            <button
                                type="button"
                                onClick={handleExportJSON}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors mr-2"
                                title="Exportar dados para JSON (Migração)"
                            >
                                <Download size={16} /> Exportar Ficha
                            </button>
                        )}
                        <button onClick={onCancel} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-slate-100 rounded-full">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex border-b border-slate-100 overflow-x-auto bg-white sticky top-0 z-10">
                    <TabButton id="personal" label="Dados Pessoais" icon={User} />
                    <TabButton id="clinical" label="Clínico/Saúde" icon={Activity} />
                    <TabButton id="social" label="Familiar/Social" icon={UsersIcon} />
                    <TabButton id="school" label="Dados Escolares" icon={BookOpen} />
                    <TabButton id="documents" label="Documentação" icon={Paperclip} />
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8">
                    {/* ... (The content inside form is omitted here to remain within context limits, I am relying on the fact that I am replacing the START and END of the component render in a smart way or I have to be very careful) 
                        Actually, replace_file_content requires EXACT target match.
                        I can't match the middle 500 lines easily.
                        
                        Strategy:
                        1. Replace the top `return (` line to `return (<>`.
                        2. Replace the bottom `</div> );` to `</div> {modal} </> );`.
                    */}

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
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo do Aluno *</label>
                                                <input required type="text" className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                    value={formData.fullName || ''} onChange={e => handleInputChange(null, 'fullName', e.target.value)} />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento *</label>
                                                <input required type="date" className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                    value={formData.birthDate || ''} onChange={e => handleInputChange(null, 'birthDate', e.target.value)} />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Gênero</label>
                                                <select className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 p-2.5 border"
                                                    value={formData.gender || ''} onChange={e => handleInputChange(null, 'gender', e.target.value)}>
                                                    <option value="">Selecione</option>
                                                    {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Nacionalidade</label>
                                                <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                    value={formData.nationality || ''} onChange={e => handleInputChange(null, 'nationality', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Naturalidade / Estado</label>
                                                <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                    value={formData.birthPlace || ''} onChange={e => handleInputChange(null, 'birthPlace', e.target.value)} placeholder="Ex: São Paulo / SP" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Mãe</label>
                                                <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                    value={formData.motherName || ''} onChange={e => handleInputChange(null, 'motherName', e.target.value)} />
                                            </div>
                                            <div>
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
                                                    onChange={e => handleInputChange(null, 'cpf', formatCPF(e.target.value))}
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
                                        <div className="md:col-span-3">
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
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">CEP</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.address?.zipCode} onChange={e => handleInputChange('address', 'zipCode', e.target.value)} />
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
                                                value={formData.guardians?.[0]?.name} onChange={e => handleInputChange('guardians', 'name', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Parentesco</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.guardians?.[0]?.relationship} onChange={e => handleInputChange('guardians', 'relationship', e.target.value)} placeholder="Mãe, Pai, Avó..." />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Cor / Etnia</label>
                                            <select className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.guardians?.[0]?.ethnicity || ''} onChange={e => handleInputChange('guardians', 'ethnicity', e.target.value)}>
                                                <option value="">Selecione</option>
                                                <option value="Branca">Branca</option>
                                                <option value="Preta">Preta</option>
                                                <option value="Parda">Parda</option>
                                                <option value="Amarela">Amarela</option>
                                                <option value="Indígena">Indígena</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">CPF do Responsável</label>
                                            <input
                                                type="text"
                                                className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.guardians?.[0]?.cpf || ''}
                                                onChange={e => handleInputChange('guardians', 'cpf', formatCPF(e.target.value))}
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
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.guardians?.[0]?.phone} onChange={e => handleInputChange('guardians', 'phone', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Ocupação</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.guardians?.[0]?.occupation} onChange={e => handleInputChange('guardians', 'occupation', e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                    <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-4">Dados Sociais e Benefícios</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-blue-800 mb-1">Número NIS</label>
                                            <input type="text" className="w-full rounded-lg border-blue-200 focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white"
                                                value={formData.socialInfo?.nis || ''} onChange={e => setFormData(prev => ({ ...prev, socialInfo: { ...prev.socialInfo!, nis: e.target.value } }))} />
                                        </div>
                                        <div className="flex flex-col justify-center space-y-3">
                                            <span className="text-sm font-medium text-blue-800">Programas Sociais</span>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-blue-200 shadow-sm cursor-pointer hover:bg-blue-50 transition-colors">
                                                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500"
                                                        checked={formData.socialInfo?.bolsaFamilia}
                                                        onChange={e => setFormData(prev => ({ ...prev, socialInfo: { ...prev.socialInfo!, bolsaFamilia: e.target.checked } }))} />
                                                    <span className="text-sm text-blue-900">Bolsa Família</span>
                                                </label>
                                                <label className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-blue-200 shadow-sm cursor-pointer hover:bg-blue-50 transition-colors">
                                                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500"
                                                        checked={formData.socialInfo?.bpc}
                                                        onChange={e => setFormData(prev => ({ ...prev, socialInfo: { ...prev.socialInfo!, bpc: e.target.checked } }))} />
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
                                        <select
                                            className="w-full rounded-lg border-slate-300 p-2.5 border"
                                            value={formData.school?.schoolName || ''}
                                            onChange={e => handleInputChange('school', 'schoolName', e.target.value)}
                                        >
                                            <option value="">Selecione a Escola...</option>
                                            {schools.map(school => (
                                                <option key={school.id} value={school.name}>{school.name}</option>
                                            ))}
                                            <option value="Outra (Não Listada)">Outra (Não Listada)</option>
                                        </select>
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
                                    <div className="flex items-end pb-3 md:col-span-2">
                                        <label className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 w-full cursor-pointer hover:bg-slate-100">
                                            <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500"
                                                checked={formData.school?.hasSpecialAide}
                                                onChange={e => handleInputChange('school', 'hasSpecialAide', e.target.checked)} />
                                            <span className="text-sm font-medium text-slate-700">Possui Acompanhante Terapêutico (AT)?</span>
                                        </label>
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
                                            { type: 'PEI', icon: BookOpen }
                                        ].map((docItem) => (
                                            <div key={docItem.type} className="relative group">
                                                <label className="flex flex-col items-center justify-center p-4 h-32 bg-white border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-all">
                                                    <docItem.icon className="text-slate-400 mb-2 group-hover:text-primary-600" size={24} />
                                                    <span className="text-xs font-medium text-center text-slate-600 group-hover:text-primary-700 leading-tight">{docItem.type}</span>
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*,application/pdf"
                                                        onChange={(e) => handleDocumentUpload(e, docItem.type as DocumentType)}
                                                    />
                                                </label>
                                            </div>
                                        ))}
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
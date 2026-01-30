
import React, { useState, useEffect, useRef } from 'react';
import { SupportProfessional, School, Student } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { Save, UserCog, X, Phone, Mail, User, School as SchoolIcon, BookOpen, Trash2, Edit, MapPin, Briefcase, Calendar, GraduationCap, Upload } from 'lucide-react';

export const SupportProfessionalManagement: React.FC = () => {
    const [professionals, setProfessionals] = useState<SupportProfessional[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const profs = await SupabaseService.getSupportProfessionals();
        const schoolsData = await SupabaseService.getSchools();
        const studentsData = await SupabaseService.getStudents();
        setProfessionals(profs);
        setSchools(schoolsData);
        setStudents(studentsData);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.schoolId || !formData.studentId) return;

        const newProf: SupportProfessional = {
            id: formData.id || crypto.randomUUID(),
            name: formData.name,
            photoUrl: formData.photoUrl || '',
            cpf: formData.cpf || '',
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
            loadData();
            setIsAdding(false);
            resetForm();
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar profissional.');
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
    };

    const handleEdit = (prof: SupportProfessional) => {
        // Garantir que o objeto address exista mesmo se vier vazio do banco antigo
        const address = prof.address || { street: '', number: '', district: '', city: '', state: '', zipCode: '' };
        setFormData({ ...prof, address });
        setIsAdding(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este profissional?')) {
            try {
                await SupabaseService.deleteSupportProfessional(id);
                loadData();
            } catch (err) {
                console.error(err);
                alert('Erro ao excluir.');
            }
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

    const getSchoolName = (id: string) => schools.find(s => s.id === id)?.name || 'Desconhecida';
    const getStudentName = (id: string) => students.find(s => s.id === id)?.fullName || 'Desconhecido';

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Profissionais de Apoio Escolar</h2>
                    <p className="text-slate-500">Gestão de acompanhantes terapêuticos e monitores</p>
                </div>
                <button
                    onClick={() => { setIsAdding(true); resetForm(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                >
                    <UserCog size={18} /> Novo Profissional
                </button>
            </div>

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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
                                        <input required type="text" className="w-full rounded-lg border-slate-300 p-2.5 border focus:ring-primary-500"
                                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Formação Acadêmica</label>
                                        <div className="relative">
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border pl-9"
                                                value={formData.education} onChange={e => setFormData({ ...formData, education: e.target.value })} placeholder="Ex: Pedagogia, Psicologia..." />
                                            <GraduationCap className="absolute left-3 top-3 text-slate-400" size={16} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                                value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                                        <input type="email" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
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
                                                    value={formData.contractStartDate} onChange={e => setFormData({ ...formData, contractStartDate: e.target.value })} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Carga Horária</label>
                                            <div className="relative">
                                                <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border pl-9"
                                                    value={formData.workload} onChange={e => setFormData({ ...formData, workload: e.target.value })} placeholder="Ex: 40h" />
                                                <Briefcase className="absolute left-3 top-3 text-slate-400" size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Escola de Lotação *</label>
                                        <div className="relative">
                                            <select required className="w-full rounded-lg border-slate-300 p-2.5 border bg-white appearance-none"
                                                value={formData.schoolId} onChange={e => setFormData({ ...formData, schoolId: e.target.value })}>
                                                <option value="">Selecione uma escola...</option>
                                                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                            <SchoolIcon className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={16} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Professor Regente</label>
                                        <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 border"
                                            value={formData.regentTeacher} onChange={e => setFormData({ ...formData, regentTeacher: e.target.value })} placeholder="Nome do professor da sala" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Aluno Assistido *</label>
                                        <div className="relative">
                                            <select required className="w-full rounded-lg border-slate-300 p-2.5 border bg-white appearance-none"
                                                value={formData.studentId} onChange={e => setFormData({ ...formData, studentId: e.target.value })}>
                                                <option value="">Selecione um aluno...</option>
                                                {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                                            </select>
                                            <User className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={16} />
                                        </div>
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
                                <div className="md:col-span-2">
                                    <label className="block text-xs text-slate-500 mb-1">Rua / Logradouro</label>
                                    <input type="text" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        value={formData.address?.street} onChange={e => handleAddressChange('street', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Número</label>
                                    <input type="text" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        value={formData.address?.number} onChange={e => handleAddressChange('number', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Bairro</label>
                                    <input type="text" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        value={formData.address?.district} onChange={e => handleAddressChange('district', e.target.value)} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs text-slate-500 mb-1">Cidade</label>
                                    <input type="text" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        value={formData.address?.city} onChange={e => handleAddressChange('city', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Estado</label>
                                    <input type="text" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        value={formData.address?.state} onChange={e => handleAddressChange('state', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">CEP</label>
                                    <input type="text" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        value={formData.address?.zipCode} onChange={e => handleAddressChange('zipCode', e.target.value)} />
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

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Profissional</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Lotação (Escola)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Aluno / Regente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contrato</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {professionals.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <UserCog size={32} className="text-slate-300" />
                                        <p>Nenhum profissional de apoio cadastrado.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : professionals.map(prof => (
                            <tr key={prof.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 flex-shrink-0">
                                            {prof.photoUrl ? (
                                                <img src={prof.photoUrl} alt={prof.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <UserCog size={18} className="text-slate-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900">{prof.name}</div>
                                            <div className="text-xs text-slate-400">CPF: {prof.cpf || '-'}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{prof.education}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        <SchoolIcon size={14} className="text-primary-500" />
                                        {getSchoolName(prof.schoolId)}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-slate-800 flex items-center gap-1">
                                        <User size={14} className="text-green-600" />
                                        {getStudentName(prof.studentId)}
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                        <BookOpen size={12} /> Regente: {prof.regentTeacher}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {prof.contractStartDate && (
                                        <div className="flex items-center gap-1 mb-1" title="Início do Contrato">
                                            <Calendar size={12} /> {new Date(prof.contractStartDate).toLocaleDateString()}
                                        </div>
                                    )}
                                    {prof.workload && (
                                        <div className="flex items-center gap-1" title="Carga Horária">
                                            <Briefcase size={12} /> {prof.workload}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => handleEdit(prof)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors" title="Editar">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(prof.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="Excluir">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

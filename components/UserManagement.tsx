
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, UserRole, Specialty, UserScope } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { useToast } from '../contexts/ToastContext';
import { formatarNomeBR } from '../utils/formatters';
import { Save, UserPlus, Shield, X, MapPin, Phone, Mail, Briefcase, Lock, User as UserIcon, Upload, Globe, Trash2, AlertTriangle, Eye, EyeOff, Search, KeyRound, ChevronDown, ChevronRight, Pin, PinOff } from 'lucide-react';

const ROLE_FILTER_ALL = 'ALL' as const;
type RoleFilterValue = typeof ROLE_FILTER_ALL | UserRole;

function getRoleLabel(role: UserRole): string {
    switch (role) {
        case 'ADMIN': return 'Administrador';
        case 'SPECIALIST': return 'Especialista';
        case 'ASSISTANT': return 'Assistente';
        case 'EDUCATION_SECRETARY': return 'Secretária de Educação';
        case 'SECRETARIA_SEDE': return 'Secretária Sede';
        case 'SECRETARIA_COCAL': return 'Secretária Cocal';
        case 'COORDENADOR': return 'Coordenador';
        case 'ESCOLA': return 'Escola';
        default: return role;
    }
}

function getRoleBadgeStyle(role: UserRole): string {
    switch (role) {
        case 'ADMIN': return 'bg-[#FCEBEB] text-[#A32D2D] border-[#F09595]';
        case 'SPECIALIST': return 'bg-[#EEEDFE] text-[#3C3489] border-[#AFA9EC]';
        case 'EDUCATION_SECRETARY': return 'bg-[#FAEEDA] text-[#854F0B] border-[#EF9F27]';
        case 'SECRETARIA_SEDE': return 'bg-[#FAEEDA] text-[#854F0B] border-[#EF9F27]';
        case 'SECRETARIA_COCAL': return 'bg-[#FAEEDA] text-[#854F0B] border-[#EF9F27]';
        case 'ESCOLA': return 'bg-[#E6F1FB] text-[#185FA5] border-[#85B7EB]';
        case 'COORDENADOR': return 'bg-[#EAF3DE] text-[#3B6D11] border-[#97C459]';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
}

const JOB_TITLES = [
    'Administrador(a)',
    'Assistente Social',
    'Coordenador(a) Pedagógico(a)',
    'Diretor(a) Escolar',
    'Fisioterapeuta',
    'Fonoaudiólogo(a)',
    'Monitor(a)',
    'Psicólogo(a)',
    'Psicopedagogo(a)',
    'Recepcionista',
    'Secretário(a)',
    'Terapeuta Ocupacional',
    'Outro'
];

export const UserManagement: React.FC = () => {
    const { success, error: showError } = useToast(); // Renamed to avoid collision with error state if any, though here it's fine
    const [users, setUsers] = useState<User[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // [NEW] Bloqueio de envio
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [resettingPassword, setResettingPassword] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilterValue>(ROLE_FILTER_ALL);
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
    const [pinnedUsers, setPinnedUsers] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        setExpandedUsers(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const togglePin = (id: string) => {
        setPinnedUsers(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };


    const [formData, setFormData] = useState<Partial<User>>({
        name: '',
        username: '',
        password: '',
        role: 'ASSISTANT',
        isActive: true,
        scope: 'GLOBAL',
        email: '',
        phone: '',
        jobTitle: '',
        photoUrl: '',
        address: { street: '', number: '', district: '', city: '', state: '', zipCode: '' }
    });

    const loadUsers = useCallback(async () => {
        const data = await SupabaseService.getUsers();
        setUsers(data);
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name) {
            showError('O Nome Completo é obrigatório.', 'Campo Obrigatório');
            return;
        }
        if (!formData.username) {
            showError('O Nome de Usuário (Login) é obrigatório.', 'Campo Obrigatório');
            return;
        }
        if (!formData.id && !formData.password) {
            showError('A Senha é obrigatória para novos usuários.', 'Campo Obrigatório');
            return;
        }

        if (isLoading) return;

        setIsLoading(true);
        const isEditing = !!formData.id;
        const normalizedUsername = formData.username?.trim().toLowerCase();

        const newUser: User = {
            id: formData.id || '',
            name: formData.name,
            username: normalizedUsername || '',
            password: formData.password,
            role: formData.role as UserRole,
            isActive: formData.isActive ?? true,
            mustChangePassword: formData.id ? (formData.mustChangePassword ?? false) : true,
            scope: (formData.role === 'ASSISTANT' || formData.role === 'SECRETARIA_COCAL') ? formData.scope : 'GLOBAL',
            specialty: formData.role === 'SPECIALIST' ? formData.specialty : undefined,
            email: formData.email,
            phone: formData.phone,
            jobTitle: formData.jobTitle,
            photoUrl: formData.photoUrl,
            address: formData.address
        };

        try {
            if (isEditing) {
                await SupabaseService.saveUser(newUser);
                if (formData.password?.trim()) {
                    await SupabaseService.setUserPassword(formData.id!, formData.password.trim());
                }
                success('Usuário atualizado com sucesso!', 'Perfil atualizado');
            } else {
                const result = await SupabaseService.createAccountAsAdmin(newUser, formData.password!.trim());
                if (!result.success) {
                    showError(result.error || 'Erro ao criar usuário', 'Falha no cadastro');
                    setIsLoading(false);
                    return;
                }
                success('Usuário criado com sucesso!', 'Novo usuário adicionado');
            }

            await loadUsers();
            setIsAdding(false);
            resetForm();
        } catch (err) {
            console.error(err);
            showError('Erro inesperado.', 'Erro');
        } finally {
            setIsLoading(false);
        }
    }, [formData, isLoading, loadUsers, success, showError]);

    const resetForm = () => {
        setFormData({
            name: '',
            username: '',
            password: '',
            role: 'ASSISTANT',
            isActive: true,
            scope: 'GLOBAL',
            email: '',
            phone: '',
            jobTitle: '',
            photoUrl: '',
            address: { street: '', number: '', district: '', city: '', state: '', zipCode: '' }
        });
    };

    const handleEdit = (user: User) => {
        // Garantir que address exista para evitar erro no value do input
        const address = user.address || { street: '', number: '', district: '', city: '', state: '', zipCode: '' };
        setFormData({ ...user, address });
        setIsAdding(true);
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

    const handleResetPassword = async () => {
        if (!resetPasswordUser || !newPassword.trim()) return;
        if (newPassword.trim().length < 6) { showError('A senha deve ter pelo menos 6 caracteres.', 'Senha fraca'); return; }
        setResettingPassword(true);
        try {
            await SupabaseService.setUserPassword(resetPasswordUser.id!, newPassword.trim());
            // Marca must_change_password = true para forçar troca no próximo login
            await SupabaseService.saveUser({ ...resetPasswordUser, mustChangePassword: true });
            success(`Senha de ${resetPasswordUser.name} redefinida! Ela deverá criar uma nova senha no próximo login.`);
            setResetPasswordUser(null);
            setNewPassword('');
            loadUsers();
        } catch (err) {
            showError('Erro ao redefinir senha. Tente novamente.', 'Erro');
        } finally {
            setResettingPassword(false);
        }
    };

    const toggleStatus = async (user: User) => {
        const updatedUser = { ...user, isActive: !user.isActive };
        try {
            await SupabaseService.saveUser(updatedUser);
            loadUsers();
            success(`Usuário ${updatedUser.isActive ? 'ativado' : 'desativado'} com sucesso.`);
        } catch (err) {
            console.error(err);
            showError('Erro ao atualizar status do usuário.', 'Erro');
        }
    };

    const handleDelete = (user: User) => {
        if (user.username === 'admin') {
            showError('O usuário administrador principal não pode ser excluído.', 'Ação negada');
            return;
        }
        setUserToDelete(user); // Abre o modal
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        try {
            await SupabaseService.deleteUser(userToDelete.id);
            success('Usuário excluído com sucesso!', 'Excluído');
            loadUsers();
        } catch (err: any) {
            console.error(err);
            // Mostra a mensagem real do erro (se existir) ou o fallback genérico
            showError(err.message || 'Erro ao excluir usuário. Verifique se ele possui registros vinculados.', 'Erro na exclusão');
        } finally {
            setUserToDelete(null); // Fecha o modal
        }
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

    const filteredUsers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return users.filter(u => {
            if (roleFilter !== ROLE_FILTER_ALL && u.role !== roleFilter) return false;
            if (!q) return true;
            const haystack = [
                u.name,
                u.email,
                u.username,
                u.phone,
                u.jobTitle,
                getRoleLabel(u.role),
                u.specialty
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [users, searchQuery, roleFilter]);

    const roleFilterOptions: { value: RoleFilterValue; label: string }[] = useMemo(
        () => [
            { value: ROLE_FILTER_ALL, label: 'Todos os perfis' },
            { value: 'ADMIN', label: getRoleLabel('ADMIN') },
            { value: 'SPECIALIST', label: getRoleLabel('SPECIALIST') },
            { value: 'ASSISTANT', label: getRoleLabel('ASSISTANT') },
            { value: 'EDUCATION_SECRETARY', label: getRoleLabel('EDUCATION_SECRETARY') },
            { value: 'SECRETARIA_SEDE', label: getRoleLabel('SECRETARIA_SEDE') },
            { value: 'SECRETARIA_COCAL', label: getRoleLabel('SECRETARIA_COCAL') },
            { value: 'COORDENADOR', label: getRoleLabel('COORDENADOR') },
            { value: 'ESCOLA', label: getRoleLabel('ESCOLA') }
        ],
        []
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Gerenciamento de Usuários</h2>
                    <p className="text-slate-500">Cadastro de profissionais e controle de acesso</p>
                </div>
                <button
                    onClick={() => { setIsAdding(true); resetForm(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                >
                    <UserPlus size={18} /> Novo Usuário
                </button>
            </div>

            {isAdding && (
                <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 overflow-hidden animate-fadeIn">
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                            <UserIcon size={20} className="text-primary-600" />
                            {formData.id ? 'Editar Usuário' : 'Novo Usuário'}
                        </h3>
                        <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-8">
                        {/* Seção 1: Foto, Dados Pessoais e Profissionais */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Identificação e Profissão</h4>
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Foto */}
                                <div className="flex flex-col items-center gap-3">
                                    <div className="relative group">
                                        <div className="w-28 h-28 rounded-full bg-slate-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
                                            {formData.photoUrl ? (
                                                <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <UserIcon size={40} className="text-slate-300" />
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full shadow-lg hover:bg-primary-700 transition-colors"
                                            title="Carregar Foto"
                                        >
                                            <Upload size={14} />
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

                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <div className="lg:col-span-2">
                                        <label className="block">
                                            <span className="text-sm font-medium text-slate-700">Nome Completo *</span>
                                            <input required type="text" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2.5 border"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                onBlur={e => setFormData({ ...formData, name: formatarNomeBR(e.target.value) })}
                                            />
                                        </label>
                                    </div>
                                    <div>
                                        <label className="block">
                                            <span className="text-sm font-medium text-slate-700">Cargo / Profissão</span>
                                            <div className="relative">
                                                <select
                                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2.5 border pl-9 bg-white appearance-none"
                                                    value={formData.jobTitle}
                                                    onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {JOB_TITLES.map(job => <option key={job} value={job}>{job}</option>)}
                                                </select>
                                                <Briefcase className="absolute left-3 top-4 text-slate-400 pointer-events-none" size={16} />
                                            </div>
                                        </label>
                                    </div>
                                    <div>
                                        <label className="block">
                                            <span className="text-sm font-medium text-slate-700">E-mail</span>
                                            <div className="relative">
                                                <input type="email" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2.5 border pl-9"
                                                    value={formData.email} onChange={e => {
                                                        const val = e.target.value;
                                                        // Sincroniza E-mail com Username automaticamente se estiver criando
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            email: val,
                                                            username: val // Mantém sincronizado sempre
                                                        }));
                                                    }} />
                                                <Mail className="absolute left-3 top-4 text-slate-400" size={16} />
                                            </div>
                                        </label>
                                    </div>
                                    <div>
                                        <label className="block">
                                            <span className="text-sm font-medium text-slate-700">WhatsApp / Telefone</span>
                                            <div className="relative">
                                                <input type="text" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2.5 border pl-9"
                                                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                                <Phone className="absolute left-3 top-4 text-slate-400" size={16} />
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Seção 2: Endereço */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Endereço</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div className="md:col-span-4 flex items-center gap-2 text-slate-500 text-sm font-medium mb-1">
                                    <MapPin size={16} /> Endereço Residencial
                                </div>
                                <div className="md:col-span-2">
                                    <input type="text" placeholder="Rua / Logradouro" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        value={formData.address?.street} onChange={e => handleAddressChange('street', e.target.value)} />
                                </div>
                                <div>
                                    <input type="text" placeholder="Número" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        value={formData.address?.number} onChange={e => handleAddressChange('number', e.target.value)} />
                                </div>
                                <div>
                                    <input type="text" placeholder="Bairro" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        value={formData.address?.district} onChange={e => handleAddressChange('district', e.target.value)} />
                                </div>
                                <div className="md:col-span-2">
                                    <input type="text" placeholder="Cidade" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        value={formData.address?.city} onChange={e => handleAddressChange('city', e.target.value)} />
                                </div>
                                <div>
                                    <input type="text" placeholder="UF" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        value={formData.address?.state} onChange={e => handleAddressChange('state', e.target.value)} />
                                </div>
                                <div>
                                    <input type="text" placeholder="CEP" className="w-full rounded-md border-slate-300 p-2 border text-sm"
                                        value={formData.address?.zipCode} onChange={e => handleAddressChange('zipCode', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Seção 3: Acesso ao Sistema */}
                        <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
                            <h4 className="text-sm font-semibold text-blue-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Shield size={16} /> Acesso e Permissões
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                    <label className="block">
                                        <span className="text-sm font-medium text-slate-700">Nome de Usuário (Login) *</span>
                                        <div className="relative">
                                            <input required type="text" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2.5 border pl-9 bg-slate-100 text-slate-500 cursor-not-allowed"
                                                value={formData.username}
                                                readOnly
                                                title="O login é preenchido automaticamente pelo e-mail"
                                                onChange={e => setFormData({ ...formData, username: e.target.value })} />
                                            <UserIcon className="absolute left-3 top-4 text-slate-400" size={16} />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Vinculado ao e-mail informado</p>
                                    </label>
                                </div>
                                <div>
                                    <label className="block">
                                        <span className="text-sm font-medium text-slate-700">Senha de Acesso *</span>
                                        <div className="relative">
                                            <input
                                                required={!formData.id}
                                                type={showPassword ? "text" : "password"}
                                                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2.5 border pl-9 pr-10 bg-white"
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                placeholder={formData.id ? "Manter senha atual" : ""}
                                            />
                                            <Lock className="absolute left-3 top-4 text-slate-400" size={16} />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-4 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </label>
                                </div>
                                <div>
                                    <label className="block">
                                        <span className="text-sm font-medium text-slate-700">Perfil de Acesso *</span>
                                        <select className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2.5 border bg-white"
                                            value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}>
                                            <option value="ASSISTANT">Assistente / Recepção</option>
                                            <option value="SPECIALIST">Especialista (Médico/Terapeuta)</option>
                                            <option value="ADMIN">Administrador</option>
                                            <option value="EDUCATION_SECRETARY">Secretária de Educação</option>
                                        </select>
                                    </label>
                                </div>

                                {(formData.role === 'ASSISTANT' || formData.role === 'SECRETARIA_COCAL') && (
                                    <div className="md:col-span-3 animate-fadeIn bg-white p-3 rounded border border-blue-200">
                                        <label className="block">
                                            <span className="text-sm font-medium text-blue-800 flex items-center gap-2">
                                                <Globe size={16} /> Escopo de Acesso (Unidade)
                                            </span>
                                            <select className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2.5 border bg-slate-50"
                                                value={formData.scope} onChange={e => setFormData({ ...formData, scope: e.target.value as UserScope })}>
                                                <option value="GLOBAL">SEDE (Acesso Total à Rede)</option>
                                                <option value="COCAL">DISTRITO COCAL (Apenas Unidades Cocal)</option>
                                            </select>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {formData.scope === 'GLOBAL'
                                                    ? 'O usuário terá acesso a todas as escolas e alunos do município.'
                                                    : 'O usuário terá acesso restrito apenas aos alunos e escolas da região do Cocal.'}
                                            </p>
                                        </label>
                                    </div>
                                )}

                                {formData.role === 'SPECIALIST' && (
                                    <label className="block md:col-span-3 animate-fadeIn">
                                        <span className="text-sm font-medium text-slate-700">Especialidade Clínica (Para relatórios e dashboard)</span>
                                        <select className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2.5 border bg-white"
                                            value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value as Specialty })}>
                                            <option value="">Selecione a especialidade...</option>
                                            {Object.values(Specialty).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button type="button" onClick={() => setIsAdding(false)} disabled={isLoading} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium disabled:opacity-50">Cancelar</button>
                            <button type="submit" disabled={isLoading} className="flex items-center gap-2 px-8 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-md disabled:opacity-70 disabled:cursor-wait">
                                {isLoading ? <span className="animate-spin">⏳</span> : <Save size={18} />}
                                {isLoading ? 'Salvando...' : 'Salvar Usuário'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                    <div className="flex-1 min-w-[200px] max-w-xl">
                        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Pesquisar</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="search" placeholder="Nome, e-mail, login, telefone ou cargo…"
                                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#8B1A3A] focus:ring-1 focus:ring-[#8B1A3A]/20 transition-all" />
                        </div>
                    </div>
                    <div className="w-full sm:w-auto sm:min-w-[200px]">
                        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Tipo de perfil</label>
                        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as RoleFilterValue)}
                            className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm bg-white outline-none focus:border-[#8B1A3A] transition-all">
                            {roleFilterOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Indicador de pinados */}
                {pinnedUsers.size > 0 && (
                    <div className="px-4 py-2 bg-[#fdf8f9] border-b border-[#e8c4ce] flex items-center gap-2 text-xs text-[#8B1A3A] font-bold">
                        <Pin size={11} /> {pinnedUsers.size} usuário{pinnedUsers.size > 1 ? 's' : ''} fixado{pinnedUsers.size > 1 ? 's' : ''} no topo
                    </div>
                )}

                <p className="px-4 py-2 text-xs text-slate-500 bg-slate-50/80 border-b border-slate-100">
                    {filteredUsers.length === users.length ? `${users.length} usuário(s) cadastrado(s).` : `Mostrando ${filteredUsers.length} de ${users.length} usuário(s).`}
                </p>

                {/* TABELA PREMIUM */}
                <div className="overflow-x-auto">
                    <table className="min-w-full" style={{borderCollapse:'separate',borderSpacing:0}}>
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="w-8 px-3 py-3"></th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Usuário</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Perfil</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">E-mail / Login</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                                    Nenhum usuário encontrado com os filtros selecionados.
                                </td></tr>
                            ) : [...filteredUsers].sort((a,b)=>(pinnedUsers.has(a.id)?0:1)-(pinnedUsers.has(b.id)?0:1)).map((user, idx, arr) => {
                                const pinnedCount = arr.filter(u=>pinnedUsers.has(u.id)).length;
                                const isPinned = pinnedUsers.has(user.id);
                                const isExpanded = expandedUsers.has(user.id);
                                const roleBadge = getRoleBadgeStyle(user.role);
                                const showPinnedDivider = idx === 0 && pinnedList.length > 0;
                                const showAllDivider = idx === pinnedList.length && pinnedList.length > 0;
                                const rowStyle = (() => {
                                  switch(user.role) {
                                    case 'ADMIN': return {borderLeft:'3px solid #8B1A3A', background:'#fdf8f9'};
                                    case 'EDUCATION_SECRETARY': case 'SECRETARIA_SEDE': case 'SECRETARIA_COCAL': return {borderLeft:'3px solid #EF9F27', background:'rgba(250,238,218,0.35)'};
                                    case 'SPECIALIST': return {borderLeft:'3px solid #7F77DD', background:'rgba(238,237,254,0.35)'};
                                    case 'ESCOLA': return {borderLeft:'3px solid #378ADD', background:'rgba(230,241,251,0.35)'};
                                    default: return {borderLeft:'3px solid #e2e8f0', background:'transparent'};
                                  }
                                })();
                                const avatarStyle = (() => {
                                  switch(user.role) {
                                    case 'ADMIN': return {background:'#fdf8f9', color:'#8B1A3A'};
                                    case 'EDUCATION_SECRETARY': case 'SECRETARIA_SEDE': case 'SECRETARIA_COCAL': return {background:'#FAEEDA', color:'#854F0B'};
                                    case 'SPECIALIST': return {background:'#EEEDFE', color:'#3C3489'};
                                    case 'ESCOLA': return {background:'#E6F1FB', color:'#185FA5'};
                                    default: return {background:'#f1f5f9', color:'#64748b'};
                                  }
                                })();
                                return (
                                    <React.Fragment key={user.id}>
                                        {showPinnedDivider && <tr><td colSpan={6} className="px-4 py-1.5 bg-[#fdf8f9] border-b border-[#e8c4ce]"><div className="flex items-center gap-2 text-[9px] font-black text-[#8B1A3A] uppercase tracking-widest">📌 Fixados no topo</div></td></tr>}
                                        {showAllDivider && <tr><td colSpan={6} className="px-4 py-1.5 bg-slate-50 border-b border-slate-100"><div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Todos os usuários</div></td></tr>}
                                        <tr className={`border-b border-slate-100 transition-colors ${isExpanded ? 'border-b-0' : ''}`}
                                            style={isPinned ? {borderLeft:'3px solid #8B1A3A', background:'#fdf8f9'} : rowStyle}>
                                            <td className="px-3 py-3">
                                                <button onClick={() => toggleExpand(user.id)}
                                                    className="w-6 h-6 rounded flex items-center justify-center border text-xs transition-all"
                                                    style={isExpanded ? {background:'#8B1A3A',color:'#fff',borderColor:'#8B1A3A'} : {background:'var(--color-background-secondary)',borderColor:'#e2e8f0',color:'#94a3b8'}}>
                                                    {isExpanded ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 border-white shadow-sm overflow-hidden"
                                                        style={{background: user.isActive ? '#EAF3DE' : '#f1f5f9', color: user.isActive ? '#3B6D11' : '#64748b'}}>
                                                        {user.photoUrl ? <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover"/> : user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                                            {user.name}
                                                            {isPinned && <span className="text-[9px] bg-[#fdf8f9] text-[#8B1A3A] border border-[#e8c4ce] px-1.5 py-0.5 rounded-full font-bold">📌</span>}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">{user.jobTitle || 'Sem cargo definido'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleBadge}`}>
                                                    {getRoleLabel(user.role)}
                                                </span>
                                                {user.specialty && (
                                                    <div className="text-[10px] text-slate-400 mt-0.5">{user.specialty}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs text-slate-700">{user.email || '—'}</div>
                                                <div className="text-[10px] text-slate-400">Login: {user.username}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${user.isActive ? 'bg-[#EAF3DE] text-[#3B6D11] border-[#97C459]' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                    {user.isActive ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => togglePin(user.id)} title={isPinned ? 'Desafixar' : 'Fixar no topo'}
                                                        className="w-7 h-7 rounded-lg border flex items-center justify-center transition-all"
                                                        style={isPinned ? {background:'#fdf8f9',borderColor:'#e8c4ce',color:'#8B1A3A'} : {background:'white',borderColor:'#e2e8f0',color:'#94a3b8'}}>
                                                        {isPinned ? <PinOff size={12}/> : <Pin size={12}/>}
                                                    </button>
                                                    <button onClick={() => { setFormData({...user}); setIsAdding(true); }}
                                                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-[10px] font-bold hover:bg-slate-50 transition-all">
                                                        Editar
                                                    </button>
                                                    <button onClick={() => setResetPasswordUser(user)}
                                                        className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-[#8B1A3A] hover:border-[#e8c4ce] transition-all">
                                                        <KeyRound size={12}/>
                                                    </button>
                                                    <button onClick={() => setUserToDelete(user)}
                                                        className="w-7 h-7 rounded-lg border border-[#F09595] bg-[#FCEBEB] flex items-center justify-center text-[#A32D2D] hover:bg-[#f5d5d5] transition-all">
                                                        <Trash2 size={12}/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* SUB DATA GRID */}
                                        {isExpanded && (
                                            <tr className="border-b border-slate-100">
                                                <td colSpan={6} className="px-0 py-0 bg-slate-50/50">
                                                    <div className="px-4 py-4 pl-16">
                                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Detalhes do usuário · {user.name}</div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                                            <div className="bg-white border border-slate-200 rounded-xl p-3">
                                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Perfil / Papel</div>
                                                                <div className="text-xs font-bold text-slate-700">{getRoleLabel(user.role)}</div>
                                                                {user.specialty && <div className="text-[10px] text-slate-400 mt-0.5">{user.specialty}</div>}
                                                            </div>
                                                            <div className="bg-white border border-slate-200 rounded-xl p-3">
                                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contato</div>
                                                                <div className="text-xs font-bold text-slate-700">{user.phone || '—'}</div>
                                                                <div className="text-[10px] text-slate-400">{user.email || '—'}</div>
                                                            </div>
                                                            <div className="bg-white border border-slate-200 rounded-xl p-3">
                                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Escopo / Unidade</div>
                                                                <div className="text-xs font-bold text-slate-700">{user.scope || 'GLOBAL'}</div>
                                                                <div className="text-[10px] text-slate-400">{user.schoolInep ? `INEP: ${user.schoolInep}` : '—'}</div>
                                                            </div>
                                                            <div className="bg-white border border-slate-200 rounded-xl p-3">
                                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Login</div>
                                                                <div className="text-xs font-bold text-slate-700">{user.username}</div>
                                                                <div className="text-[10px]" style={{color: user.isActive ? '#3B6D11' : '#64748b'}}>{user.isActive ? '● Ativo' : '○ Inativo'}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 flex-wrap">
                                                            <button onClick={() => { setFormData({...user}); setIsAdding(true); }}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1">
                                                                ✏️ Editar cadastro
                                                            </button>
                                                            <button onClick={() => setResetPasswordUser(user)}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#85B7EB] bg-[#E6F1FB] text-[#185FA5] hover:bg-[#d0e8f7] transition-all flex items-center gap-1">
                                                                🔑 Redefinir senha
                                                            </button>
                                                            <button onClick={() => togglePin(user.id)}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#e8c4ce] bg-[#fdf8f9] text-[#8B1A3A] hover:bg-[#f5e8ed] transition-all flex items-center gap-1">
                                                                {isPinned ? '📌 Desafixar' : '📌 Fixar no topo'}
                                                            </button>
                                                            <button onClick={() => setUserToDelete(user)}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#F09595] bg-[#FCEBEB] text-[#A32D2D] hover:bg-[#f5d5d5] transition-all flex items-center gap-1">
                                                                🗑 Excluir usuário
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Modal Redefinir Senha */}
            {resetPasswordUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <KeyRound size={18} className="text-amber-500" />
                                <h3 className="font-bold text-slate-800">Redefinir Senha</h3>
                            </div>
                            <button onClick={() => setResetPasswordUser(null)} className="text-slate-400 hover:text-red-500">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-slate-600">
                                Definindo nova senha para <span className="font-bold text-slate-800">{resetPasswordUser.name}</span>
                            </p>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    placeholder="Nova senha (mínimo 6 caracteres)"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm pr-10 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                    autoFocus
                                />
                                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setResetPasswordUser(null)}
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                                    Cancelar
                                </button>
                                <button onClick={handleResetPassword} disabled={resettingPassword || newPassword.trim().length < 6}
                                    className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    {resettingPassword ? 'Salvando...' : <><KeyRound size={14} /> Redefinir Senha</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Confirmação de Exclusão */}
            {userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scaleIn">
                        <div className="p-6 text-center">
                            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
                                <AlertTriangle className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Confirmar Exclusão</h3>
                            <p className="text-slate-500 mb-6">
                                Tem certeza que deseja excluir o usuário <span className="font-bold text-slate-700">{userToDelete.name}</span>?
                                <br />Esta ação é irreversível e removerá o acesso ao sistema.
                            </p>
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => setUserToDelete(null)}
                                    className="px-5 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md transition-colors flex items-center gap-2"
                                >
                                    <Trash2 size={18} /> Sim, Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Specialty, UserScope } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { useToast } from '../contexts/ToastContext';
import { Save, UserPlus, Shield, X, MapPin, Phone, Mail, Briefcase, Lock, User as UserIcon, Upload, Globe, Trash2, AlertTriangle } from 'lucide-react';

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
    const [userToDelete, setUserToDelete] = useState<User | null>(null); // [NEW] Modal de Exclusão
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ... (rest of the code)


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

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        const data = await SupabaseService.getUsers();
        setUsers(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.username || !formData.password || !formData.name) return;
        if (isLoading) return; // [NEW] Previne duplo clique

        setIsLoading(true); // [NEW] Bloqueia

        // Se tiver ID, é EDIÇÃO. Se não, é CRIAÇÃO.
        const isEditing = !!formData.id;

        // Normalização
        const normalizedUsername = formData.username?.trim().toLowerCase();

        console.log('Submitting User Form:', {
            originalUsername: formData.username,
            normalizedUsername,
            email: formData.email,
            password: formData.password
        });

        const newUser: User = {
            id: formData.id || '',
            name: formData.name,
            username: normalizedUsername || '', // Garante que usa o normalizado
            password: formData.password,
            role: formData.role as UserRole,
            isActive: formData.isActive ?? true,
            scope: formData.role === 'EDUCATION_SECRETARY' ? formData.scope : 'GLOBAL',
            specialty: formData.role === 'SPECIALIST' ? formData.specialty : undefined,
            email: formData.email,
            phone: formData.phone,
            jobTitle: formData.jobTitle,
            photoUrl: formData.photoUrl,
            address: formData.address
        };

        try {
            if (isEditing) {
                // Edição: Apenas atualiza o perfil (não muda senha aqui por segurança/complexidade)
                await SupabaseService.saveUser(newUser);
                success('Usuário atualizado com sucesso!', 'Perfil atualizado');
            } else {
                // Criação: Usa o método seguro de Admin
                const result = await SupabaseService.createAccountAsAdmin(newUser, formData.password!);
                if (!result.success) {
                    showError(result.error || 'Erro ao criar usuário', 'Falha no cadastro');
                    setIsLoading(false);
                    return;
                }

                if (result.warning) {
                    showError(result.warning, 'Atenção: Perfil incompleto');
                } else {
                    success('Usuário criado com sucesso! O login já está ativo.', 'Novo usuário adicionado');
                }
            }

            await loadUsers();
            setIsAdding(false);
            resetForm();
        } catch (err) {
            console.error(err);
            showError('Erro inesperado ao salvar usuário.', 'Erro do sistema');
        } finally {
            setIsLoading(false);
        }
    };

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
                <div className="bg-white rounded-xl shadow-lg border border-primary-100 overflow-hidden animate-fadeIn">
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
                                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
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
                                            <input required={!formData.id} type="text" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2.5 border pl-9 bg-white"
                                                value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                placeholder={formData.id ? "Manter senha atual" : ""} />
                                            <Lock className="absolute left-3 top-4 text-slate-400" size={16} />
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

                                {formData.role === 'EDUCATION_SECRETARY' && (
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
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Profissional</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contato</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Acesso</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden">
                                            {user.photoUrl ? (
                                                <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-slate-500 font-bold">{user.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900">{user.name}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                                <Briefcase size={10} /> {user.jobTitle || 'Sem cargo definido'}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-slate-600">
                                        {user.email && <div className="flex items-center gap-1"><Mail size={12} className="text-slate-400" /> {user.email}</div>}
                                        {user.phone && <div className="flex items-center gap-1 mt-0.5"><Phone size={12} className="text-slate-400" /> {user.phone}</div>}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'SPECIALIST' ? 'bg-blue-100 text-blue-800' :
                                                user.role === 'EDUCATION_SECRETARY' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-slate-100 text-slate-800'
                                            }`}>
                                            {user.role === 'ADMIN' && <Shield size={12} />}
                                            {user.role === 'ADMIN' ? 'Administrador' :
                                                user.role === 'SPECIALIST' ? 'Especialista' :
                                                    user.role === 'EDUCATION_SECRETARY' ? 'Secretária Educ.' :
                                                        'Assistente'}
                                        </span>
                                        <span className="text-xs text-slate-400">Login: {user.username}</span>
                                        {user.role === 'EDUCATION_SECRETARY' && (
                                            <span className={`text-[10px] uppercase font-bold ${user.scope === 'COCAL' ? 'text-orange-600' : 'text-blue-600'}`}>
                                                {user.scope === 'COCAL' ? '• Apenas Cocal' : '• Acesso Sede'}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <button onClick={() => toggleStatus(user)} disabled={user.username === 'admin'} className={`px-2 py-1 rounded text-xs font-bold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {user.isActive ? 'Ativo' : 'Inativo'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleEdit(user)}
                                        className="text-primary-600 hover:text-primary-800 text-sm font-medium mr-3"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user)}
                                        disabled={user.username === 'admin'}
                                        className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Excluir Usuário"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
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

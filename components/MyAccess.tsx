import { User as UserIcon, Shield, Lock as LockIcon, Key, Mail, Phone, MapPin, Briefcase, CheckCircle2 } from 'lucide-react';
import { User } from '../types';

interface MyAccessProps {
    currentUser: User;
}

export const MyAccess: React.FC<MyAccessProps> = ({ currentUser }) => {
    return (
        <div className="max-w-4xl mx-auto animate-fadeIn p-4 md:p-0">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                {/* Profile Header */}
                <div className="h-32 bg-gradient-to-r from-primary-600 to-primary-800 relative">
                    <div className="absolute -bottom-12 left-8 p-1 bg-white rounded-2xl shadow-lg">
                        <div className="w-24 h-24 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-3xl text-primary-600 overflow-hidden uppercase">
                            {currentUser.photoUrl ? (
                                <img src={currentUser.photoUrl} className="w-full h-full object-cover" />
                            ) : (
                                currentUser.name[0]
                            )}
                        </div>
                    </div>
                </div>

                <div className="pt-16 pb-8 px-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{currentUser.name}</h2>
                            <p className="text-slate-500 flex items-center gap-1.5 font-medium mt-1">
                                <Briefcase size={16} className="text-primary-500" />
                                {currentUser.role.replace('_', ' ')} • {currentUser.scope || 'Acesso Global'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-100 text-sm font-bold shadow-sm">
                            <CheckCircle2 size={16} /> Perfil Autenticado
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        {/* Info Section */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <UserIcon size={16} /> Informações de Contato
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-black">E-mail</p>
                                        <p className="text-sm font-bold text-slate-700">{currentUser.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                        <Phone size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-black">Telefone</p>
                                        <p className="text-sm font-bold text-slate-700">{currentUser.phone || 'Não informado'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Security Section */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Shield size={16} /> Nível de Acesso e Permissões
                            </h3>
                            <div className="space-y-3">
                                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-inner">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-600">Gestão Regional ({currentUser.scope})</span>
                                        <LockIcon size={14} className="text-primary-500" />
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-primary-500 h-full w-[100%]"></div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2">Permissão total para visualização de alunos e agendamentos da regional.</p>
                                </div>
                                <button className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
                                    <Key size={14} /> Alterar Minha Senha
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

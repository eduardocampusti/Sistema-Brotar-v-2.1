import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Save, Loader2 } from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';
import { useToast } from '../contexts/ToastContext';

interface ChangePasswordProps {
    onSuccess: () => void;
    userId: string;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({ onSuccess, userId }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { success, error: showError } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 8) {
            showError('A senha deve ter no mínimo 8 caracteres.', 'Senha muito curta');
            return;
        }

        if (newPassword !== confirmPassword) {
            showError('As senhas não coincidem.', 'Erro de confirmação');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await SupabaseService.updatePassword(newPassword);
            if (error) throw error;

            // Atualiza o flag must_change_password para false
            await SupabaseService.updateProfile(userId, { must_change_password: false });

            success('Sua senha foi atualizada com sucesso!', 'Senha Alterada');
            onSuccess();
        } catch (err: any) {
            console.error('Erro ao trocar senha:', err);
            showError(err.message || 'Não foi possível atualizar a senha.', 'Erro técnico');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-md animate-fadeIn p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-primary-100 animate-scaleIn">
                <div className="bg-primary-600 p-6 text-white text-center relative">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-2xl font-bold">Troca de Senha Obrigatória</h2>
                    <p className="text-primary-100 text-sm mt-1">Este é o seu primeiro acesso. Por segurança, você deve definir uma nova senha definitiva.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                        <ShieldCheck className="text-blue-500 shrink-0 mt-0.5" size={18} />
                        <div className="text-xs text-blue-800 leading-relaxed">
                            <p className="font-bold mb-1">Regras de Segurança:</p>
                            <ul className="list-disc ml-4 space-y-0.5">
                                <li>Mínimo de 8 caracteres</li>
                                <li>Será sua senha definitiva de acesso</li>
                                <li>O administrador não terá acesso à sua nova senha</li>
                            </ul>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Nova Senha</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="block w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-600 focus:bg-white transition-all text-slate-800 placeholder-slate-400 font-medium"
                                    placeholder="No mínimo 8 caracteres"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Confirmar Nova Senha</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="block w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-600 focus:bg-white transition-all text-slate-800 placeholder-slate-400 font-medium"
                                    placeholder="Repita a nova senha"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-bold text-lg transition-all transform hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-xl shadow-primary-600/20 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Atualizando...
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                Salvar Nova Senha
                            </>
                        )}
                    </button>
                </form>

                <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Sistema Brotar 2.0 • Proteção de Dados LGPD</p>
                </div>
            </div>
        </div>
    );
};

import React, { useState } from 'react';
import { SupabaseService } from '../services/SupabaseService';
import { User } from '../types';
import { Lock, Check, X, Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react';

interface ForcePasswordChangeProps {
    user: User;
    onSuccess: () => void;
}

export const ForcePasswordChange: React.FC<ForcePasswordChangeProps> = ({ user, onSuccess }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Validations
    const hasMinLength = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    const isValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
    const passwordsMatch = newPassword === confirmPassword && newPassword !== '';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isValid) {
            setError('A senha não atende aos requisitos de segurança.');
            return;
        }

        if (!passwordsMatch) {
            setError('As senhas não coincidem.');
            return;
        }

        setIsLoading(true);

        try {
            const { success, error } = await SupabaseService.completeFirstAccess(newPassword, user.id);

            if (success) {
                // Pequeno delay para feedback visual
                setTimeout(() => {
                    onSuccess();
                }, 1000);
            } else {
                throw error;
            }
        } catch (err: any) {
            console.error('Erro ao atualizar senha:', err);
            setError('Erro ao atualizar senha. Tente novamente ou contate o suporte.');
            setIsLoading(false);
        }
    };

    const RequirementItem = ({ met, text }: { met: boolean, text: string }) => (
        <div className={`flex items-center gap-2 text-xs font-medium transition-colors ${met ? 'text-emerald-600' : 'text-slate-400'}`}>
            {met ? <Check size={14} className="text-emerald-500" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
            {text}
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-slideUp">

                {/* Header */}
                <div className="bg-amber-50 p-6 border-b border-amber-100 flex items-start gap-4">
                    <div className="bg-amber-100 p-2 rounded-lg text-amber-600 shrink-0">
                        <Lock size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-amber-900">Primeiro Acesso</h2>
                        <p className="text-amber-700/80 text-sm mt-1">
                            Para sua segurança, é necessário definir uma nova senha pessoal antes de continuar.
                        </p>
                    </div>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* New Password Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Nova Senha</label>
                            <div className="relative group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className={`block w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:bg-white transition-all font-medium text-slate-800 placeholder:text-slate-400 ${isValid ? 'border-emerald-200 focus:ring-emerald-500' : 'border-slate-200 focus:ring-primary-500'}`}
                                    placeholder="Digite sua nova senha"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {/* Requirements Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 pl-1">
                                <RequirementItem met={hasMinLength} text="Mínimo 8 caracteres" />
                                <RequirementItem met={hasUpper} text="Letra Maiúscula" />
                                <RequirementItem met={hasLower} text="Letra Minúscula" />
                                <RequirementItem met={hasNumber} text="Número" />
                                <RequirementItem met={hasSpecial} text="Caractere Especial (!@#...)" />
                            </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Confirmar Senha</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`block w-full px-4 py-3 bg-slate-50 border ${passwordsMatch && confirmPassword ? 'border-emerald-200 focus:ring-emerald-500' : 'border-slate-200 focus:ring-primary-500'} rounded-xl focus:ring-2 focus:bg-white transition-all font-medium text-slate-800 placeholder:text-slate-400`}
                                placeholder="Repita a nova senha"
                            />
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-3 animate-shake">
                                <AlertTriangle size={16} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!isValid || !passwordsMatch || isLoading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-slate-900/20 transition-all transform hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>Atualizando...</>
                            ) : (
                                <>
                                    <ShieldCheck size={20} />
                                    Definir Senha e Entrar
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

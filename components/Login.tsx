import React, { useState } from 'react';
import { SupabaseService } from '../services/SupabaseService';
import { User, SystemSettings } from '../types';
import { HeartPulse, Lock, User as UserIcon, ArrowRight, Eye, EyeOff, Activity, ShieldCheck, Sparkles, Users } from 'lucide-react';

interface LoginProps {
    onLogin: (user: User) => void;
    onBack?: () => void;
    systemSettings?: SystemSettings;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onBack, systemSettings }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [view, setView] = useState<'login' | 'terms' | 'privacy' | 'forgot-password'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetStatus, setResetStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Detectar erro de recuperação na URL (ex: otp_expired)
    React.useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes('error_code=otp_expired')) {
            setError('O link de recuperação expirou ou já foi utilizado. Por favor, solicite um novo.');
            setView('forgot-password');
        } else if (hash.includes('error=')) {
            setError('Ocorreu um erro com o seu link de acesso. Tente novamente.');
            setView('forgot-password');
        }
    }, []);

    // Default values
    const systemName = systemSettings?.systemName || 'Brotar';
    const LogoComponent = systemSettings?.logoUrl ?
        () => <img src={systemSettings.logoUrl} alt={`Logo do sistema ${systemName}`} className="w-12 h-12 object-contain" /> :
        () => <img src="/logo-oficial.png" alt={`Logo do sistema ${systemName}`} className="h-20 w-auto object-contain" />;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const cleanUsername = username.trim();
            const cleanPassword = password.trim();
            console.log('Tentando autenticar:', cleanUsername);
            const user = await SupabaseService.authenticate(cleanUsername, cleanPassword);
            if (user) {
                onLogin(user);
            } else {
                setError('Login falhou. Verifique se o e-mail e a senha estão corretos.');
            }
        } catch (err: any) {
            console.error('Erro inesperado:', err);
            setError('Erro: ' + (err.message || 'Conexão falhou.'));
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetStatus('idle');
        setIsLoading(true);
        setError('');

        try {
            const { error } = await SupabaseService.resetPassword(resetEmail);
            if (error) throw error;
            setResetStatus('success');
        } catch (err: any) {
            console.error(err);
            setError('Erro ao enviar email: ' + (err.message || 'Tente novamente.'));
            setResetStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    const TermsOfUse = () => (
        <div className="animate-fadeIn space-y-6 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
            <h2 className="text-3xl font-bold text-slate-900">Termos de Uso</h2>
            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                <p>Última atualização: {new Date().toLocaleDateString()}</p>
                <p>Bem-vindo ao <strong>{systemName}</strong>. Ao acessar este sistema, você concorda com os seguintes termos:</p>
                <h3 className="text-lg font-bold text-slate-800 mt-4">1. Acesso e Segurança</h3>
                <p>O acesso é restrito a profissionais autorizados. Suas credenciais são pessoais e intransferíveis. Qualquer atividade realizada sob seu login é de sua exclusiva responsabilidade.</p>
                <h3 className="text-lg font-bold text-slate-800 mt-4">2. Proteção de Dados</h3>
                <p>Este sistema manipula dados sensíveis de pacientes e alunos. É estritamente proibido compartilhar, exportar ou divulgar informações sem autorização expressa, em conformidade com a LGPD (Lei Geral de Proteção de Dados).</p>
                <h3 className="text-lg font-bold text-slate-800 mt-4">3. Uso Apropriado</h3>
                <p>O sistema deve ser utilizado exclusivamente para fins profissionais relacionados à gestão multidisciplinar. O uso para fins pessoais ou ilícitos resultará em suspensão imediata e medidas legais cabíveis.</p>
            </div>
            <button onClick={() => setView('login')} className="text-primary-600 font-bold hover:underline flex items-center gap-2">
                <ArrowRight className="rotate-180" size={16} /> Voltar para Login
            </button>
        </div>
    );

    const PrivacyPolicy = () => (
        <div className="animate-fadeIn space-y-6 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
            <h2 className="text-3xl font-bold text-slate-900">Política de Privacidade</h2>
            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                <h3 className="text-lg font-bold text-slate-800">Compromisso com sua Privacidade</h3>
                <p>O <strong>{systemName}</strong> leva a sério a privacidade dos dados. Esta política descreve como coletamos e protegemos suas informações.</p>
                <h3 className="text-lg font-bold text-slate-800 mt-4">Coleta de Dados</h3>
                <p>Coletamos apenas os dados estritamente necessários para o funcionamento do serviço, incluindo logs de acesso, registros de atendimentos e dados cadastrais de usuários autorizados.</p>
                <h3 className="text-lg font-bold text-slate-800 mt-4">Segurança da Informação</h3>
                <p>Utilizamos criptografia de ponta a ponta e protocolos de segurança avançados para proteger os dados armazenados contra acesso não autorizado, alteração ou destruição.</p>
                <h3 className="text-lg font-bold text-slate-800 mt-4">Seus Direitos</h3>
                <p>Conforme a LGPD, você tem direito a solicitar acesso, correção ou exclusão de seus dados pessoais, salvo quando a retenção for exigida por lei.</p>
            </div>
            <button onClick={() => setView('login')} className="text-primary-600 font-bold hover:underline flex items-center gap-2">
                <ArrowRight className="rotate-180" size={16} /> Voltar para Login
            </button>
        </div>
    );

    const ForgotPassword = () => (
        <div className="animate-fadeIn space-y-6">
            <div className="text-left space-y-2">
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Recuperar Senha</h2>
                <p className="text-slate-500 font-medium text-sm">
                    Digite seu email para receber um link de redefinição de senha.
                </p>
            </div>

            {resetStatus === 'success' ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-4 animate-fadeIn">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h3 className="text-green-800 font-bold text-lg">Email Enviado!</h3>
                        <p className="text-green-700 text-sm mt-1">Verifique sua caixa de entrada (e spam) para redefinir sua senha.</p>
                    </div>
                    <button
                        onClick={() => setView('login')}
                        className="text-green-700 font-bold hover:underline text-sm"
                    >
                        Voltar para o Login
                    </button>
                </div>
            ) : (
                <form onSubmit={handlePasswordReset} className="space-y-6">
                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase ml-1 mb-1 block">Email Cadastrado</label>
                        <input
                            type="email"
                            required
                            className="block w-full px-5 py-4 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all text-slate-800 placeholder-slate-400 font-medium"
                            placeholder="seu@email.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-bold flex items-center gap-2">
                            <ShieldCheck size={16} /> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-slate-500/20 disabled:opacity-50"
                    >
                        {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setView('login')}
                        className="w-full text-center text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        Voltar
                    </button>
                </form>
            )}
        </div>
    );

    return (
        <div className="min-h-screen w-full flex bg-white font-sans text-slate-900">

            {/* LADO ESQUERDO - IMAGEM (Full Height, Rounded inside container or Full Bleed based on ref)
                Reference shows a large image on the left, but with margins?
                Actually, to match the "Soma" look: It's a clean split.
                I'll use a container approach that centers everything but keeps the image distinct.
            */}
            <div className="hidden lg:block lg:w-1/2 relative p-4">
                <div className="relative h-full w-full rounded-3xl overflow-hidden">
                    {systemSettings?.loginBackgroundImage ? (
                        <img
                            src={systemSettings.loginBackgroundImage}
                            alt="Interface do Sistema Brotar - Gestão Multidisciplinar Inteligente"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-900 relative">
                            {/* Fallback Abstract Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900"></div>
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                            {/* Central Hero Text for fallback */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                                <h1 className="text-4xl font-bold text-white mb-4">{systemName}</h1>
                                <p className="text-indigo-200 text-lg">Gestão simplificada e humanizada.</p>
                            </div>
                        </div>
                    )}

                    {/* Logo Overlay (Top Left inside Image) */}
                    <div className="absolute top-8 left-8 z-20 flex items-center gap-3">
                        <div className="bg-white/10 backdrop-blur-md p-2 rounded-lg border border-white/10">
                            <LogoComponent />
                        </div>
                        <span className="text-xl font-bold text-white tracking-wide">{systemName}</span>
                    </div>

                    {/* Gradient Overlay for Text Readability if needed */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none"></div>
                </div>
            </div>

            {/* LADO DIREITO - FORMULÁRIO */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 lg:p-24 bg-white">

                {/* Language/Top Bar placeholder (optional) */}


                <div className="w-full max-w-md mx-auto space-y-10 animate-slideUp">

                    {view === 'login' ? (
                        <>
                            <div className="space-y-3">
                                <h2 className="text-4xl font-medium text-slate-800 tracking-tight">
                                    Entre em sua conta
                                </h2>
                                {onBack && (
                                    <button
                                        onClick={onBack}
                                        className="text-slate-400 hover:text-slate-600 text-sm font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                        <ArrowRight className="rotate-180" size={14} />
                                        Voltar para o início
                                    </button>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">


                                <div>
                                    <input
                                        type="text"
                                        className="block w-full px-5 py-4 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all text-slate-800 placeholder-slate-400 font-medium"
                                        placeholder="Email"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="block w-full px-5 py-4 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all text-slate-800 placeholder-slate-400 font-medium"
                                            placeholder="Senha"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1 text-sm">
                                        <span className="text-slate-500">Esqueceu sua senha?</span>
                                        <button type="button" onClick={() => setView('forgot-password')} className="font-bold text-slate-800 hover:underline underline-offset-2">Recuperar senha</button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-bold flex items-center gap-2">
                                        <ShieldCheck size={16} /> {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-bold text-lg transition-all transform hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-xl shadow-primary-600/20"
                                >
                                    {isLoading ? 'Carregando...' : 'Entrar'}
                                </button>


                            </form>

                            {/* Quick Login - Minimal */}
                            <div className="pt-10">
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4 text-center">Admin Demo</p>
                                <div className="flex justify-center gap-2 flex-wrap opacity-50 hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setUsername('admin@brotar.com'); setPassword('admin123'); }} className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-slate-500 text-xs rounded-full">Preencher Admin</button>
                                    <button onClick={() => { setUsername('sede@edu.com'); setPassword('123456'); }} className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-slate-500 text-xs rounded-full">Preencher Sede</button>
                                </div>
                            </div>

                            <div className="w-full flex justify-center gap-6 text-xs font-bold text-slate-400 mt-8 lg:mt-0">
                                <button onClick={() => setView('terms')} className="hover:text-slate-600">Termos de uso</button>
                                <button onClick={() => setView('privacy')} className="hover:text-slate-600">Política de privacidade</button>
                            </div>
                        </>
                    ) : view === 'terms' ? (
                        <TermsOfUse />
                    ) : view === 'forgot-password' ? (
                        <ForgotPassword />
                    ) : (
                        <PrivacyPolicy />
                    )}

                </div>


            </div>
        </div>
    );
};

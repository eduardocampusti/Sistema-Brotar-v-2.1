import React from 'react';
import {
    ShieldCheck,
    Users,
    Database,
    ArrowRight,
    Globe,
    CheckCircle2,
    Brain,
    Shapes,
    Mic,
    Activity,
    Apple,
    Stethoscope,
    Lock
} from 'lucide-react';

export const LandingPage: React.FC = () => {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Navbar Minimalista */}
            <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-600 rounded-xl shadow-lg shadow-primary-200">
                                <img src="/logo_oficial.png" alt="Logo Brotar" className="w-8 h-8 object-contain" onError={(e) => {
                                    // Fallback para ícone caso a logo não exista
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement?.insertAdjacentHTML('afterbegin', '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart-pulse"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>');
                                }} />
                            </div>
                            <span className="text-2xl font-extrabold tracking-tight text-gray-900">Brotar <span className="text-primary-600">2.0</span></span>
                        </div>
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#sobre" className="text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors">Sobre</a>
                            <a href="#recursos" className="text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors">Recursos</a>
                            <a href="#seguranca" className="text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors">Segurança</a>
                            <a href="/login" className="px-6 py-2.5 bg-primary-600 text-white rounded-full text-sm font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 hover:scale-105 active:scale-95">
                                Acessar Sistema
                            </a>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-24 overflow-hidden bg-gradient-to-b from-white to-slate-50">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-[0.03] pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#grid)" />
                    </svg>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="text-center max-w-4xl mx-auto">
                        <span className="inline-block px-4 py-1.5 mb-6 text-sm font-bold tracking-wider text-primary-700 uppercase bg-primary-50 rounded-full border border-primary-100">
                            Gestão Educacional 2026
                        </span>
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1]">
                            Gestão Integrada da Educação Especial, <span className="text-primary-600 underline decoration-slate-200 underline-offset-8">Inteligente e Segura.</span>
                        </h1>
                        <p className="text-xl text-slate-600 mb-12 leading-relaxed">
                            O Brotar 2.0 é uma plataforma web institucional desenvolvida para organizar, proteger e integrar o acompanhamento multiprofissional da Educação Especial em redes municipais.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <a href="/login" className="w-full sm:w-auto px-8 py-4 bg-primary-600 text-white rounded-2xl text-lg font-bold hover:bg-primary-700 transition-all shadow-xl shadow-primary-200 flex items-center justify-center gap-2 hover:translate-y-[-2px]">
                                Acessar Sistema <ArrowRight size={20} />
                            </a>
                            <button className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl text-lg font-bold hover:bg-slate-50 transition-all">
                                Solicitar Demonstração
                            </button>
                        </div>
                    </div>

                    {/* Dashboard Preview Overlay */}
                    <div className="mt-20 relative px-4 md:px-0">
                        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 transform rotate-1 border-opacity-50">
                            <div className="bg-slate-900 rounded-2xl overflow-hidden aspect-[16/9] flex items-center justify-center relative">
                                <img src="/dashboard-preview.jpg" alt="Preview do Sistema" className="w-full h-full object-cover opacity-80" onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement?.insertAdjacentHTML('afterbegin', '<div class="flex flex-col items-center gap-4"><div class="w-20 h-20 bg-primary-500 rounded-full animate-pulse"></div><div class="h-4 w-48 bg-slate-800 rounded"></div></div>');
                                }} />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-8">
                                    <div className="flex gap-4">
                                        <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 text-xs text-white">LGPD Compliance</div>
                                        <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 text-xs text-white">Multi-profissional</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Floating Elements */}
                        <div className="absolute -top-10 -left-10 hidden lg:block bg-white p-6 rounded-2xl shadow-xl border border-slate-100 animate-bounce transition-all duration-3000">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                    <CheckCircle2 size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase">Segurança</p>
                                    <p className="text-sm font-bold text-slate-800">Dados Protegidos</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sobre o Sistema */}
            <section id="sobre" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Tudo o que sua rede precisa, <span className="text-primary-600">em um só lugar.</span></h2>
                            <p className="text-lg text-slate-600 leading-relaxed mb-8">
                                O Brotar 2.0 centraliza informações, organiza atendimentos e garante segurança na gestão dos dados da Educação Especial, oferecendo uma experiência moderna, estruturada e alinhada à LGPD.
                            </p>
                            <div className="space-y-4">
                                {[
                                    'Centralização de dados sensíveis',
                                    'Integração entre secretarias e especialistas',
                                    'Conformidade total com a LGPD',
                                    'Acesso rápido e interface intuitiva'
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                                            <CheckCircle2 size={16} />
                                        </div>
                                        <span className="font-medium text-slate-700">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-3xl p-12 relative">
                            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-primary-100 rounded-full opacity-50 blur-3xl"></div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                                    <Users className="text-primary-600 mb-4" size={32} />
                                    <p className="font-bold text-slate-900">+1000</p>
                                    <p className="text-xs text-slate-500">Alunos Monitorados</p>
                                </div>
                                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 translate-y-8">
                                    <ShieldCheck className="text-primary-600 mb-4" size={32} />
                                    <p className="font-bold text-slate-900">100%</p>
                                    <p className="text-xs text-slate-500">Segurança LGPD</p>
                                </div>
                                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                                    <Globe className="text-primary-600 mb-4" size={32} />
                                    <p className="font-bold text-slate-900">Nuvem</p>
                                    <p className="text-xs text-slate-500">Acesso Anywhere</p>
                                </div>
                                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 translate-y-8">
                                    <Database className="text-primary-600 mb-4" size={32} />
                                    <p className="font-bold text-slate-900">Real-time</p>
                                    <p className="text-xs text-slate-500">Relatórios Integrados</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Recursos Principais */}
            <section id="recursos" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-4xl font-extrabold text-slate-900 mb-16">Recursos <span className="text-primary-600">Estratégicos</span></h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
                        <ResourcesCard
                            icon={<Users size={24} />}
                            title="Ficha do Aluno Estruturada"
                            desc="Registro completo com organização em 5 abas, facilitando o acompanhamento contínuo e integrado."
                        />
                        <ResourcesCard
                            icon={<Brain size={24} />}
                            title="Módulos Multiprofissionais"
                            desc="Ambientes separados por especialidade: Psicologia, Psicopedagogia, Fisioterapia e muito mais."
                        />
                        <ResourcesCard
                            icon={<Lock size={24} />}
                            title="Segurança e LGPD"
                            desc="Separação rigorosa de dados sensíveis e controle por perfil profissional."
                        />
                        <ResourcesCard
                            icon={<Globe size={24} />}
                            title="Plataforma 100% Web"
                            desc="Acesso seguro via navegador, sem necessidade de instalação local."
                        />
                    </div>
                </div>
            </section>

            {/* Especialidades */}
            <section className="py-24 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h3 className="text-2xl font-bold text-slate-800">Especialidades Atendidas</h3>
                        <p className="text-slate-500">Cada profissional acessa apenas as informações pertinentes à sua atuação.</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-12 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                        <SpecialtyItem icon={<Brain size={32} />} name="Psicologia" />
                        <SpecialtyItem icon={<Users size={32} />} name="Assistência Social" />
                        <SpecialtyItem icon={<Shapes size={32} />} name="Psicopedagogia" />
                        <SpecialtyItem icon={<Activity size={32} />} name="Fisioterapia" />
                        <SpecialtyItem icon={<Mic size={32} />} name="Fonoaudiologia" />
                        <SpecialtyItem icon={<Apple size={32} />} name="Nutrição" />
                    </div>
                </div>
            </section>

            {/* Diferencial Institucional */}
            <section className="py-24 bg-primary-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-primary-600 skew-x-[-20deg] opacity-20 translate-x-1/2"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="max-w-3xl">
                        <h2 className="text-4xl font-extrabold mb-8">Tecnologia com <span className="text-primary-400">responsabilidade pública.</span></h2>
                        <p className="text-xl text-primary-100 leading-relaxed mb-10">
                            O Brotar foi desenvolvido para atender às necessidades reais das redes municipais, respeitando princípios legais, organizacionais e técnicos da gestão pública.
                            <br /><br />
                            Mais do que um sistema, é uma ferramenta estratégica para fortalecer a Educação Especial.
                        </p>
                        <a href="/login" className="inline-flex items-center gap-3 px-8 py-4 bg-white text-primary-900 rounded-2xl font-bold hover:bg-primary-50 transition-all">
                            Começar Agora <ArrowRight size={20} />
                        </a>
                    </div>
                </div>
            </section>

            {/* Segurança */}
            <section id="seguranca" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <circle cx="0" cy="0" r="40" fill="white" />
                                <circle cx="100" cy="100" r="40" fill="white" />
                            </svg>
                        </div>

                        <div className="relative z-10 grid md:grid-cols-2 gap-16 items-center">
                            <div>
                                <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-primary-500/20">
                                    <Lock size={32} className="text-white" />
                                </div>
                                <h2 className="text-4xl font-extrabold text-white mb-6">Proteção de dados como <span className="text-primary-400">prioridade.</span></h2>
                                <div className="space-y-6">
                                    <SecurityItem title="Controle de acesso por perfil profissional" />
                                    <SecurityItem title="Separação lógica de dados sensíveis" />
                                    <SecurityItem title="Estrutura alinhada à LGPD" />
                                    <SecurityItem title="Armazenamento seguro e criptografado" />
                                </div>
                            </div>
                            <div className="flex justify-center">
                                <div className="w-64 h-64 border-8 border-primary-500/20 rounded-full flex items-center justify-center animate-pulse">
                                    <div className="w-48 h-48 border-8 border-primary-500/40 rounded-full flex items-center justify-center">
                                        <div className="w-32 h-32 bg-primary-500 rounded-full flex items-center justify-center shadow-2xl shadow-primary-500/50">
                                            <ShieldCheck size={48} className="text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Chamada Final */}
            <section className="py-24 bg-white text-center">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-5xl font-extrabold text-slate-900 mb-8">Organize. Proteja. Integre.</h2>
                    <p className="text-xl text-slate-600 mb-12">
                        Transforme a gestão da Educação Especial com uma plataforma moderna, segura e pensada para o setor público.
                    </p>
                    <a href="/login" className="inline-flex px-12 py-5 bg-primary-600 text-white rounded-2xl text-xl font-bold hover:bg-primary-700 transition-all shadow-2xl shadow-primary-200">
                        Acessar Sistema
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-50 border-t border-slate-200 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-2">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-1.5 bg-primary-600 rounded-lg">
                                    <img src="/logo_oficial.png" alt="Logo" className="w-6 h-6 object-contain invert" onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement?.insertAdjacentHTML('afterbegin', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart-pulse"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>');
                                    }} />
                                </div>
                                <span className="text-xl font-bold text-slate-900">Brotar 2.0</span>
                            </div>
                            <p className="text-slate-500 max-w-sm">Sistema de Gestão Integrada da Educação Especial. Desenvolvido para redes municipais de ensino.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-6">Links Rápidos</h4>
                            <nav className="flex flex-col gap-4 text-slate-500 text-sm">
                                <a href="#" className="hover:text-primary-600">Termos de Uso</a>
                                <a href="#" className="hover:text-primary-600">Política de Privacidade</a>
                                <a href="#" className="hover:text-primary-600">Suporte</a>
                            </nav>
                        </div>
                        <div className="flex justify-end items-end">
                            <p className="text-slate-400 text-sm">© 2026 – Todos os direitos reservados</p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const ResourcesCard: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 hover:border-primary-200 transition-all hover:shadow-xl group">
        <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary-600 group-hover:text-white transition-all">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-4">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
);

const SecurityItem: React.FC<{ title: string }> = ({ title }) => (
    <div className="flex items-center gap-4 group">
        <div className="w-8 h-8 rounded-full border border-primary-500/30 flex items-center justify-center text-primary-400 group-hover:bg-primary-500 group-hover:text-white transition-all">
            <CheckCircle2 size={16} />
        </div>
        <span className="text-slate-300 font-medium">{title}</span>
    </div>
);

const SpecialtyItem: React.FC<{ icon: React.ReactNode; name: string }> = ({ icon, name }) => (
    <div className="flex flex-col items-center gap-4 group">
        <div className="text-slate-400 group-hover:text-primary-600 transition-colors">
            {icon}
        </div>
        <span className="text-sm font-bold text-slate-400 group-hover:text-slate-800 transition-colors">{name}</span>
    </div>
);

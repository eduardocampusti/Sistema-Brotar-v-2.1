import {
    Shield, Users, FileText, Globe, ChevronRight, CheckCircle,
    Brain, Heart, BookOpen, Dumbbell, Mic, Apple, ArrowRight,
    Lock, Database, Activity, Clock, Star, Menu, X, Building2,
    School, Briefcase, UserCheck, BarChart3, Zap, Phone,
    Info, Code, Smartphone, Mail, Server, User
} from 'lucide-react';
import { FULL_VERSION } from '../utils/version';

interface LandingPageProps {
    onAccessSystem: () => void;
    systemSettings?: any;
}

// Hook para animação de entrada ao scroll
function useIntersectionObserver(threshold = 0.1) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
            { threshold }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [threshold]);

    return { ref, isVisible };
}

// Hook para contador animado
function useCounter(target: number, isVisible: boolean, duration = 2000) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!isVisible) return;
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(Math.floor(start));
        }, 16);
        return () => clearInterval(timer);
    }, [isVisible, target, duration]);

    return count;
}

// Componente de seção animada
function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    const { ref, isVisible } = useIntersectionObserver();
    return (
        <div
            ref={ref}
            className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
        >
            {children}
        </div>
    );
}

// Card de impacto com contador
function ImpactCard({ prefix = '', value, suffix = '', label }: { prefix?: string; value: number; suffix?: string; label: string }) {
    const { ref, isVisible } = useIntersectionObserver();
    const count = useCounter(value, isVisible);
    return (
        <div ref={ref} className="text-center p-8 bg-white rounded-2xl shadow-lg border border-blue-50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="text-4xl md:text-5xl font-black text-blue-800 mb-2">
                {prefix}{isVisible ? count.toLocaleString('pt-BR') : 0}{suffix}
            </div>
            <p className="text-slate-600 font-medium text-sm md:text-base">{label}</p>
        </div>
    );
}

export function LandingPage({ onAccessSystem, systemSettings }: LandingPageProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setMenuOpen(false);
    };

    const navLinks = [
        { label: 'Recursos', id: 'recursos' },
        { label: 'Especialidades', id: 'especialidades' },
        { label: 'Segurança', id: 'seguranca' },
        { label: 'Como Funciona', id: 'como-funciona' },
        { label: 'Sobre', id: 'sobre' },
    ];

    return (
        <div className="min-h-screen bg-white font-sans antialiased" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* FAQ Schema (GEO Optimization) */}
            <script type="application/ld+json">
                {JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    "mainEntity": [
                        {
                            "@type": "Question",
                            "name": "O que é o Sistema Brotar?",
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": "O Sistema Brotar é uma plataforma de gestão integrada para educação especial e atendimentos multidisciplinares, conectando escolas, especialistas e famílias."
                            }
                        },
                        {
                            "@type": "Question",
                            "name": "O sistema é seguro e atende à LGPD?",
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": "Sim, o Sistema Brotar possui controle rigoroso de permissões e criptografia de dados, garantindo total conformidade com a Lei Geral de Proteção de Dados."
                            }
                        }
                    ]
                })}
            </script>

            {/* ═══════════════ NAVBAR ═══════════════ */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-md border-b border-slate-100' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-16' : 'h-24'}`}>
                        {/* Logo */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                {systemSettings?.logoUrl ? (
                                    <img
                                        src={systemSettings.logoUrl}
                                        alt={systemSettings.systemName || "Sistema Brotar"}
                                        className="h-12 w-auto object-contain"
                                    />
                                ) : <button
                                    onClick={() => window.open(window.location.origin + '?login=true', '_blank')}
                                    className="bg-slate-900 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    Saiba mais
                                </button>
                                }
                            </div>
                        </div>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-6">
                            {navLinks.map(link => (
                                <button
                                    key={link.id}
                                    onClick={() => scrollTo(link.id)}
                                    className={`text-sm font-medium transition-colors cursor-pointer hover:text-green-500 ${scrolled ? 'text-slate-600' : 'text-white/90'}`}
                                >
                                    {link.label}
                                </button>
                            ))}
                            <button
                                onClick={() => window.open(window.location.origin + '?login=true', '_blank')}
                                className="ml-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-5 py-2 rounded-full transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer inline-block"
                            >
                                Acessar Sistema
                            </button>
                        </div>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className={`md:hidden cursor-pointer ${scrolled ? 'text-slate-700' : 'text-white'}`}
                        >
                            {menuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {menuOpen && (
                    <div className="md:hidden bg-white border-t border-slate-100 shadow-xl">
                        <div className="px-4 py-4 space-y-3">
                            {navLinks.map(link => (
                                <button
                                    key={link.id}
                                    onClick={() => scrollTo(link.id)}
                                    className="block w-full text-left text-sm font-medium text-slate-600 hover:text-green-600 py-2 cursor-pointer"
                                >
                                    {link.label}
                                </button>
                            ))}
                            <button
                                onClick={() => window.open(window.location.origin + '?login=true', '_blank')}
                                className="w-full bg-green-500 text-white font-semibold py-3 rounded-xl text-sm cursor-pointer text-center block"
                            >
                                Acessar Sistema
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* ═══════════════ HERO ═══════════════ */}
            <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
                {/* Padrão de fundo */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 right-20 w-96 h-96 bg-green-400 rounded-full blur-3xl" />
                    <div className="absolute bottom-20 left-20 w-72 h-72 bg-blue-400 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white rounded-full blur-3xl opacity-5" />
                </div>

                {/* Grade decorativa */}
                <div
                    className="absolute inset-0 opacity-5"
                    style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Conteúdo */}
                        <div className="text-white">
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                <span className="text-sm font-medium text-white/90">Plataforma oficial de gestão da Educação Especial</span>
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6 text-white">
                                Gestão Integrada da{' '}
                                <span className="text-green-400">Educação Especial</span>,{' '}
                                <span className="text-blue-200">simples, segura e eficiente.</span>
                            </h1>

                            <p className="text-blue-100 text-lg md:text-xl leading-relaxed mb-8 max-w-xl">
                                O Brotar organiza atendimentos, centraliza dados sensíveis e conecta escolas, especialistas e famílias em uma única plataforma.
                            </p>

                            {/* Botões */}
                            <div className="flex flex-col sm:flex-row gap-4 mb-10">
                                <button
                                    onClick={() => window.open(window.location.origin + '?login=true', '_blank')}
                                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 cursor-pointer flex items-center justify-center gap-2"
                                >
                                    ACESSAR O SISTEMA <ArrowRight size={20} />
                                </button>
                                <button
                                    onClick={() => scrollTo('como-funciona')}
                                    className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-200 backdrop-blur-sm cursor-pointer text-base"
                                >
                                    Ver Demonstração
                                </button>
                            </div>

                            {/* Selos */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    'Conformidade com LGPD',
                                    'Multiunidade (Sede e Cocal)',
                                    'Prontuário multiprofissional',
                                    'Relatórios em tempo real',
                                ].map(selo => (
                                    <div key={selo} className="flex items-center gap-2 text-sm text-blue-100">
                                        <CheckCircle size={15} className="text-green-400 shrink-0" />
                                        <span>{selo}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Visual — mockup do sistema */}
                        <div className="hidden lg:block">
                            <div className="relative">
                                {/* Janela principal */}
                                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/20">
                                    {/* Barra do browser */}
                                    <div className="bg-slate-100 px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                                        <div className="flex gap-1.5">
                                            <div className="w-3 h-3 rounded-full bg-red-400" />
                                            <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                            <div className="w-3 h-3 rounded-full bg-green-400" />
                                        </div>
                                        <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-slate-400 ml-2">
                                            brotar.edu.br/dashboard
                                        </div>
                                    </div>
                                    {/* Conteúdo simulado */}
                                    <div className="p-6 bg-slate-50">
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-9 h-9 bg-blue-800 rounded-xl flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">B</span>
                                            </div>
                                            <div>
                                                <div className="h-3 bg-blue-800 rounded w-24 mb-1" />
                                                <div className="h-2 bg-slate-200 rounded w-16" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            {[{ v: '1.248', l: 'Alunos', c: 'bg-blue-50 border-blue-100' }, { v: '342', l: 'Atend. Mês', c: 'bg-green-50 border-green-100' }, { v: '98%', l: 'Conformidade', c: 'bg-emerald-50 border-emerald-100' }].map(card => (
                                                <div key={card.l} className={`${card.c} border rounded-xl p-3`}>
                                                    <div className="font-black text-blue-900 text-lg">{card.v}</div>
                                                    <div className="text-xs text-slate-500">{card.l}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="space-y-2">
                                            {['Maria Silva — Psicologia', 'João Oliveira — Fonoaudiologia', 'Ana Costa — Fisioterapia'].map(item => (
                                                <div key={item} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
                                                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <Users size={12} className="text-blue-600" />
                                                    </div>
                                                    <span className="text-xs text-slate-600">{item}</span>
                                                    <div className="ml-auto w-2 h-2 bg-green-400 rounded-full" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Badge flutuante */}
                                <div className="absolute -bottom-4 -left-4 bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5">
                                    <Activity size={12} />
                                    Sistema Online
                                </div>
                                <div className="absolute -top-3 -right-3 bg-white border border-blue-100 shadow-lg rounded-2xl px-3 py-2 text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                                    <Shield size={12} className="text-green-500" />
                                    LGPD Compliant
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wave */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 60" className="w-full" preserveAspectRatio="none">
                        <path d="M0,60 C360,0 1080,0 1440,60 L1440,60 L0,60 Z" fill="white" />
                    </svg>
                </div>
            </section>

            {/* ═══════════════ SEÇÃO — TUDO QUE A GESTÃO PRECISA ═══════════════ */}
            <section className="py-20 bg-white" id="recursos">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <AnimatedSection>
                            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
                                <Zap size={12} />
                                Gestão Unificada
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-5 leading-tight">
                                Tudo que a gestão precisa,{' '}
                                <span className="text-blue-700">em um único ambiente.</span>
                            </h2>
                            <p className="text-slate-600 text-lg leading-relaxed mb-8">
                                O Brotar elimina planilhas, papéis e controles paralelos. A informação nasce na escola, passa pelos especialistas e retorna para a gestão em forma de indicadores, histórico e decisões mais rápidas.
                            </p>
                            <a
                                href="?login=true"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-blue-800 hover:bg-blue-900 text-white font-semibold px-6 py-3 rounded-xl transition-colors cursor-pointer"
                            >
                                Conhecer a plataforma <ChevronRight size={16} />
                            </a>
                        </AnimatedSection>

                        <AnimatedSection>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { icon: Database, label: 'Centralização de dados sensíveis', desc: 'Um repositório seguro para todos os prontuários e relatórios.' },
                                    { icon: Users, label: 'Integração entre secretarias e profissionais', desc: 'Comunicação fluida entre escolas, equipes e gestão.' },
                                    { icon: FileText, label: 'Visão completa da jornada do aluno', desc: 'Histórico unificado desde o encaminhamento até alta.' },
                                    { icon: Clock, label: 'Automação de agendas e atendimentos', desc: 'Elimine conflitos de horário e reduza tempo admin.' },
                                    { icon: BarChart3, label: 'Registro histórico permanente', desc: 'Dados acessíveis a qualquer tempo, com rastreabilidade.' },
                                    { icon: Lock, label: 'Acesso seguro por perfil', desc: 'Cada usuário vê apenas o que precisa ver.' },
                                ].map(item => (
                                    <div key={item.label} className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors group cursor-default">
                                        <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-green-200 transition-colors">
                                            <item.icon size={16} className="text-green-700" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
                                            <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </AnimatedSection>
                    </div>
                </div>
            </section>

            {/* ═══════════════ CARDS DE IMPACTO ═══════════════ */}
            <section className="py-16 bg-gradient-to-br from-blue-900 to-blue-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AnimatedSection>
                        <p className="text-center text-blue-200 text-sm font-semibold uppercase tracking-widest mb-3">Indicadores Reais</p>
                        <h2 className="text-center text-white text-2xl md:text-3xl font-black mb-12">
                            Indicadores inteligentes para decisões reais.
                        </h2>
                    </AnimatedSection>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <ImpactCard value={2100} label="alunos acompanhados" />
                        <ImpactCard value={100} suffix="%" label="rastreabilidade de atendimentos" />
                        <ImpactCard value={0} label="papel no processo" suffix=" papel" />
                        <ImpactCard value={60} suffix="%" label="redução no tempo de resposta" />
                    </div>
                </div>
            </section>

            {/* ═══════════════ RECURSOS ESTRATÉGICOS ═══════════════ */}
            <section className="py-20 bg-slate-50" id="plataforma">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AnimatedSection>
                        <div className="text-center mb-14">
                            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                                <Star size={12} />
                                Recursos Estratégicos
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900">
                                O que o Brotar oferece
                            </h2>
                        </div>
                    </AnimatedSection>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: FileText,
                                title: 'Ficha do Aluno Estruturada',
                                desc: 'Registro completo da vida escolar, social e clínica do estudante, com histórico unificado e acompanhamento contínuo.',
                                color: 'from-blue-500 to-blue-700',
                                bg: 'bg-blue-50',
                            },
                            {
                                icon: Brain,
                                title: 'Módulos Multiprofissionais',
                                desc: 'Ambientes exclusivos por especialidade, preservando sigilo e garantindo colaboração técnica entre equipes.',
                                color: 'from-emerald-500 to-emerald-700',
                                bg: 'bg-emerald-50',
                            },
                            {
                                icon: Shield,
                                title: 'Segurança e LGPD',
                                desc: 'Controle rigoroso de permissões, rastreamento de acessos e proteção total de dados sensíveis.',
                                color: 'from-indigo-500 to-indigo-700',
                                bg: 'bg-indigo-50',
                            },
                            {
                                icon: Globe,
                                title: 'Plataforma 100% Web',
                                desc: 'Acesse de qualquer lugar, sem instalação, com desempenho rápido e interface intuitiva.',
                                color: 'from-amber-500 to-orange-600',
                                bg: 'bg-amber-50',
                            },
                        ].map(card => (
                            <AnimatedSection key={card.title}>
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-5 shadow-lg`}>
                                        <card.icon size={22} className="text-white" />
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-base mb-3">{card.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed flex-1">{card.desc}</p>
                                </div>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ ESPECIALIDADES ═══════════════ */}
            <section className="py-20 bg-white" id="especialidades">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AnimatedSection>
                        <div className="text-center mb-14">
                            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                                <Heart size={12} />
                                Equipe Multiprofissional
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
                                Atendimento integrado por especialistas.
                            </h2>
                            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
                                Cada profissional visualiza apenas as informações necessárias para sua atuação, mantendo a privacidade do aluno e a eficiência da rede.
                            </p>
                        </div>
                    </AnimatedSection>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[
                            { icon: Brain, name: 'Psicologia', color: 'bg-purple-100 text-purple-700' },
                            { icon: Heart, name: 'Assistência Social', color: 'bg-rose-100 text-rose-700' },
                            { icon: BookOpen, name: 'Psicopedagogia', color: 'bg-blue-100 text-blue-700' },
                            { icon: Dumbbell, name: 'Fisioterapia', color: 'bg-orange-100 text-orange-700' },
                            { icon: Mic, name: 'Fonoaudiologia', color: 'bg-cyan-100 text-cyan-700' },
                            { icon: Apple, name: 'Nutrição', color: 'bg-green-100 text-green-700' },
                        ].map(esp => (
                            <AnimatedSection key={esp.name}>
                                <div className="flex flex-col items-center text-center p-5 bg-slate-50 hover:bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300 group cursor-default">
                                    <div className="w-14 h-14 rounded-2xl ${esp.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <esp.icon size={24} />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700">{esp.name}</span>
                                </div>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ SEGURANÇA E LGPD ═══════════════ */}
            <section className="py-20 bg-gradient-to-br from-slate-900 to-blue-950" id="seguranca">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <AnimatedSection>
                            <div className="inline-flex items-center gap-2 bg-white/10 text-green-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-5 border border-white/10">
                                <Lock size={12} />
                                Segurança Pública
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-5 leading-tight">
                                Tecnologia com{' '}
                                <span className="text-green-400">responsabilidade pública.</span>
                            </h2>
                            <p className="text-slate-300 text-lg leading-relaxed mb-8">
                                O Brotar foi desenvolvido para atender às exigências legais da administração pública, garantindo transparência, segurança da informação e continuidade dos serviços.
                            </p>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    'Permissões granulares por perfil e unidade',
                                    'Registro completo de atividades (audit logs)',
                                    'Armazenamento seguro com criptografia',
                                    'Backup contínuo e redundância de dados',
                                    'Controle multi-unidade (Sede e Cocal)',
                                ].map(item => (
                                    <div key={item} className="flex items-center gap-3 text-slate-200 text-sm">
                                        <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                                            <CheckCircle size={12} className="text-green-400" />
                                        </div>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </AnimatedSection>

                        <AnimatedSection>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { icon: Lock, label: 'LGPD', desc: 'Total conformidade com a Lei Geral de Proteção de Dados', color: 'from-green-600 to-green-800' },
                                    { icon: Shield, label: 'LBI', desc: 'Lei Brasileira de Inclusão da Pessoa com Deficiência', color: 'from-blue-600 to-blue-800' },
                                    { icon: BookOpen, label: 'PNE', desc: 'Plano Nacional de Educação — Metas e objetivos alinhados', color: 'from-indigo-600 to-indigo-800' },
                                    { icon: Activity, label: 'PNEE', desc: 'Política Nacional de Educação Especial', color: 'from-emerald-600 to-emerald-800' },
                                ].map(item => (
                                    <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 shadow-lg`}>
                                            <item.icon size={18} className="text-white" />
                                        </div>
                                        <h4 className="text-white font-bold text-sm mb-1">{item.label}</h4>
                                        <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </AnimatedSection>
                    </div>
                </div>
            </section>

            {/* ═══════════════ COMO FUNCIONA ═══════════════ */}
            <section className="py-20 bg-white" id="como-funciona">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AnimatedSection>
                        <div className="text-center mb-14">
                            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                                <Activity size={12} />
                                Fluxo Operacional
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
                                Como funciona na prática
                            </h2>
                            <p className="text-slate-600 max-w-xl mx-auto">
                                Um fluxo pensado para a realidade da rede pública municipal — da identificação da necessidade ao retorno para a família.
                            </p>
                        </div>
                    </AnimatedSection>

                    <div className="relative">
                        {/* Linha conectora (desktop) */}
                        <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-blue-200 via-green-300 to-blue-200" />

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                            {[
                                { step: '1', icon: School, label: 'A escola identifica a necessidade', color: 'bg-blue-700' },
                                { step: '2', icon: Building2, label: 'A secretaria realiza o encaminhamento', color: 'bg-blue-600' },
                                { step: '3', icon: UserCheck, label: 'O especialista realiza o atendimento', color: 'bg-green-600' },
                                { step: '4', icon: BarChart3, label: 'A gestão acompanha em tempo real', color: 'bg-blue-700' },
                                { step: '5', icon: Heart, label: 'A família recebe o retorno', color: 'bg-green-700' },
                            ].map(s => (
                                <AnimatedSection key={s.step}>
                                    <div className="flex flex-col items-center text-center">
                                        <div className={`w-20 h-20 ${s.color} rounded-2xl flex flex-col items-center justify-center shadow-lg mb-4 relative`}>
                                            <s.icon size={28} className="text-white" />
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full border-2 border-slate-200 flex items-center justify-center">
                                                <span className="text-xs font-black text-slate-700">{s.step}</span>
                                            </div>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700 max-w-[130px] leading-snug">{s.label}</p>
                                    </div>
                                </AnimatedSection>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════ PARA QUEM É ═══════════════ */}
            <section className="py-20 bg-slate-50" id="para-quem">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AnimatedSection>
                        <div className="text-center mb-14">
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
                                Para quem é o Brotar
                            </h2>
                            <p className="text-slate-600">Feito para os atores reais da gestão pública municipal</p>
                        </div>
                    </AnimatedSection>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            { icon: Building2, label: 'Secretarias de Educação', color: 'bg-blue-800' },
                            { icon: Briefcase, label: 'Coordenação de Educação Especial', color: 'bg-blue-700' },
                            { icon: School, label: 'Escolas Municipais', color: 'bg-green-700' },
                            { icon: Users, label: 'Equipes Multiprofissionais', color: 'bg-blue-600' },
                            { icon: BarChart3, label: 'Gestores Públicos', color: 'bg-green-600' },
                        ].map(p => (
                            <AnimatedSection key={p.label}>
                                <div className="flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-slate-100 hover:shadow-lg transition-all duration-300 group cursor-default">
                                    <div className={`w-14 h-14 ${p.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md`}>
                                        <p.icon size={24} className="text-white" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700 leading-snug">{p.label}</p>
                                </div>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ CTA FINAL ═══════════════ */}
            <section className="py-24 bg-gradient-to-br from-green-600 to-green-800 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 right-10 w-80 h-80 bg-white rounded-full blur-3xl" />
                    <div className="absolute bottom-10 left-10 w-60 h-60 bg-green-300 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <AnimatedSection>
                        <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-full mb-6 border border-white/20">
                            <Zap size={14} />
                            Pronto para começar?
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-white mb-5 leading-tight">
                            Pronto para modernizar a Educação Especial do seu município?
                        </h2>
                        <p className="text-green-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
                            Saia do papel, ganhe eficiência e tenha controle total dos atendimentos com uma plataforma feita para a realidade da gestão pública.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => window.open(window.location.origin + '?login=true', '_blank')}
                                className="bg-white text-green-600 px-8 py-4 rounded-full font-bold text-xl hover:bg-green-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 cursor-pointer inline-block"
                            >
                                ACESSAR O SISTEMA AGORA
                            </button>
                            <button
                                className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-200 backdrop-blur-sm cursor-pointer text-base"
                            >
                                <Phone size={16} />
                                Falar com Especialista
                            </button>
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* ═══════════════ SOBRE O SISTEMA ═══════════════ */}
            <section className="py-24 bg-white" id="sobre">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AnimatedSection>
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                                <Info size={14} />
                                Identidade e Transparência
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6">
                                Sobre o <span className="text-blue-800">{systemSettings?.systemName || "Sistema Brotar"}</span>
                            </h2>
                            <p className="text-slate-600 max-w-3xl mx-auto text-lg leading-relaxed">
                                Uma plataforma SaaS desenvolvida para integrar a gestão de atendimentos na rede pública, conectando Educação e Saúde com foco no desenvolvimento pleno do aluno.
                            </p>
                        </div>
                    </AnimatedSection>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Seção Instituição */}
                        <div className="lg:col-span-2 grid md:grid-cols-2 gap-8">
                            <AnimatedSection className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-200">
                                    <Building2 size={24} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4">Gestão Municipal</h3>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Prefeitura Municipal de</p>
                                        <p className="text-xl font-black text-slate-800">Brotas de Macaúbas - BA</p>
                                    </div>

                                    <div className="grid gap-4">
                                        <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-slate-100">
                                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><User size={18} /></div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-black">Prefeito Municipal</p>
                                                <p className="font-bold text-slate-700">Antônio Kleber</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-slate-100">
                                            <div className="p-2 bg-green-50 rounded-lg text-green-600"><User size={18} /></div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-black">Secretária de Educação</p>
                                                <p className="font-bold text-slate-700">Gislene Leite Santos</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </AnimatedSection>

                            {/* Seção Desenvolvimento */}
                            <AnimatedSection className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200">
                                    <Code size={24} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4">Desenvolvimento</h3>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border-2 border-white shadow-sm">
                                        CE
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">Carlos Eduardo Campos</p>
                                        <p className="text-xs text-blue-600 font-semibold">CEO • IMPDIGITAL</p>
                                    </div>
                                </div>
                                <div className="space-y-3 mt-auto">
                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                        <Smartphone size={16} className="text-slate-400" />
                                        <span>(77) 99129-0375</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                        <Mail size={16} className="text-slate-400" />
                                        <span>impdigital@gmail.com</span>
                                    </div>
                                </div>
                            </AnimatedSection>
                        </div>

                        {/* Seção Status */}
                        <AnimatedSection className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col h-full shadow-xl relative overflow-hidden lg:col-span-1">
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-900/20">
                                    <Server size={24} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold mb-6">Status da Plataforma</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                        <span className="text-slate-400 text-sm">Servidor</span>
                                        <span className="flex items-center gap-2 text-green-400 font-bold text-sm">
                                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                            Online
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                        <span className="text-slate-400 text-sm">Versão</span>
                                        <span className="text-blue-400 font-bold text-sm text-right">{FULL_VERSION}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400 text-sm">LGPD</span>
                                        <span className="text-green-400 font-bold text-sm flex items-center gap-1">
                                            <Shield size={14} />
                                            Ativo
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -bottom-6 -right-6 opacity-10">
                                <Database size={120} />
                            </div>
                        </AnimatedSection>
                    </div>
                </div>
            </section>

            {/* ═══════════════ RODAPÉ ═══════════════ */}
            <footer className="bg-slate-900 text-slate-400 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-1 md:col-span-1">
                            <div className="flex flex-col items-center md:items-start gap-4">
                                {systemSettings?.logoUrl ? (
                                    <img
                                        src={systemSettings.logoUrl}
                                        alt={systemSettings.systemName || "Sistema Brotar"}
                                        className="h-12 w-auto object-contain"
                                    />
                                ) : (
                                    <img
                                        src="/logo-oficial.png"
                                        alt="Sistema Brotar"
                                        className="h-16 w-auto object-contain brightness-0 invert"
                                    />
                                )}
                                <p className="text-slate-400 text-sm max-w-xs text-center md:text-left mt-2">
                                    Gestão integrada para centros de atendimento multidisciplinar e educação especial.
                                </p>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-white text-sm font-semibold mb-3">Base Legal</h4>
                            <div className="space-y-1.5 text-sm">
                                {['LGPD — Lei 13.709/2018', 'LBI — Lei 13.146/2015', 'PNE — Lei 13.005/2014', 'PNEE — Política Nacional', 'ECA — Lei 8.069/1990'].map(l => (
                                    <div key={l} className="flex items-center gap-2">
                                        <div className="w-1 h-1 bg-green-500 rounded-full" />
                                        {l}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-white text-sm font-semibold mb-3">Certficações</h4>
                            <div className="flex flex-wrap gap-2">
                                {['LGPD Compliant', 'SSL/TLS', 'ISO 27001*', 'Backup Diário'].map(c => (
                                    <span key={c} className="bg-slate-800 border border-slate-700 text-xs px-3 py-1 rounded-full">{c}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs">
                        <p>© {new Date().getFullYear()} Sistema Brotar — Todos os direitos reservados.</p>
                        <p>Desenvolvido para a gestão pública municipal da Educação Especial.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

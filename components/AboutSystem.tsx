import React from 'react';
import { APP_VERSION } from '../src/config/version';
import { TaskWidgetDisclosure } from '../src/components/ui/TaskWidgetDisclosure';
import { AboutDisclosureCard } from '../src/components/ui/AboutDisclosureCard';
import {
    Code, Server, Database, Shield, Smartphone, Mail, Globe,
    CheckCircle, Info, QrCode, Building, User, Cpu, Layers, HeartPulse, ExternalLink,
    History, Sparkles, TrendingUp, ShieldCheck, Wrench, Rocket, ChevronDown, ChevronUp
} from 'lucide-react';

// --- Premium UI Components (Shadcn-like) ---

const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden transition-all duration-500 hover:shadow-premium hover:-translate-y-1.5 ${className}`}>
        {children}
    </div>
);

const Badge: React.FC<{ children: React.ReactNode, variant?: 'default' | 'outline' | 'secondary' | 'success', className?: string }> = ({ children, variant = 'default', className }) => {
    const variants = {
        default: 'bg-primary-600 text-white',
        outline: 'border border-slate-200 text-slate-600 backdrop-blur-sm bg-white/50',
        secondary: 'bg-slate-100 text-slate-700',
        success: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
    };
    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest leading-none flex items-center justify-center gap-1.5 ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};

const Separator: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-full ${className}`} />
);

const detailedReleases = [
  {
    version: "v2.4.24",
    title: "Release v2.4.24",
    date: "5 Jun 2026",
    category: "Melhoria",
    current: true,
    defaultOpen: true,
    summary: "Atualização de manutenção e estabilidade operacional.",
    tasks: [
      {
        id: "maintenance",
        label: "Atualização de manutenção",
        description: "Aplicados ajustes preventivos para manter estabilidade da plataforma.",
        status: "completed" as const
      },
      {
        id: "supabase-stability",
        label: "Revisão de estabilidade do Supabase",
        description: "Validação de conexões, consultas críticas e comportamento em tempo real.",
        status: "completed" as const
      },
      {
        id: "modules-validation",
        label: "Validação dos módulos ativos",
        description: "Checagem dos módulos de Gestão Escolar, Prontuário Digital Clínico, Busca Ativa Inteligente, Agenda Multi-Sincronizada e Dashboards Analíticos.",
        status: "completed" as const
      }
    ]
  },
  {
    version: "v2.4.23",
    title: "Release v2.4.23",
    date: "5 Jun 2026",
    category: "Melhoria",
    current: false,
    defaultOpen: false,
    summary: "Atualização de manutenção.",
    tasks: [
      {
        id: "maintenance",
        label: "Atualização de manutenção",
        description: "Ajustes preventivos e melhorias internas.",
        status: "completed" as const
      }
    ]
  },
  {
    version: "v2.4.22",
    title: "Release v2.4.22",
    date: "5 Jun 2026",
    category: "Melhoria",
    current: false,
    defaultOpen: false,
    summary: "Atualização de manutenção.",
    tasks: [
      {
        id: "maintenance",
        label: "Atualização de manutenção",
        description: "Ajustes de manutenção e estabilidade.",
        status: "completed" as const
      }
    ]
  }
];

const detailedMap = new Map(detailedReleases.map(r => [r.version, r]));

// --- Main Page Component ---

export const AboutSystem: React.FC = () => {
    const currentYear = new Date().getFullYear();
    const [isHistoryExpanded, setIsHistoryExpanded] = React.useState(false);
    const hiddenVersionsCount = Math.max(APP_VERSION.releases.length - 3, 0);

    const mappedReleases = React.useMemo(() => {
        return APP_VERSION.releases.map((log) => {
            const detail = detailedMap.get(log.version);
            if (detail) {
                return detail;
            }
            
            const mappedCategory = 
                log.type === 'feature' ? 'Funcionalidade' :
                log.type === 'fix' ? 'Correção' :
                log.type === 'improvement' ? 'Melhoria' :
                log.type === 'security' ? 'Segurança' : log.type;

            return {
                version: log.version,
                title: log.title,
                date: log.date,
                category: mappedCategory,
                current: false,
                defaultOpen: false,
                summary: '',
                tasks: log.changes?.map((change, idx) => ({
                    id: `${log.version}-task-${idx}`,
                    label: change,
                    status: 'completed' as const
                })) || []
            };
        });
    }, []);

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-fadeIn pb-20 px-4">

            {/* SEO A - HERO (IDENTIDADE DO SISTEMA) */}
            <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white shadow-premium p-6 md:p-10 animate-slideUp">
                {/* Background Decoration */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-500/10 rounded-full blur-[100px] animate-pulse-subtle" />
                <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-[80px]" />
                
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12">
                    <HeartPulse size={400} />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-primary-600 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200" />
                        <div className="relative bg-slate-900/80 p-5 rounded-3xl backdrop-blur-xl border border-white/10 shadow-glow-green">
                            <HeartPulse size={40} className="text-emerald-400 animate-pulse-subtle" />
                        </div>
                    </div>

                    <div className="text-center md:text-left space-y-4">
                        <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                Sistema Brotar
                            </h1>
                            <Badge variant="outline" className="animate-pulse-subtle border-emerald-500/30 text-emerald-400 bg-emerald-500/5 py-1.5 px-4 text-xs">
                                v{APP_VERSION.version}
                            </Badge>
                        </div>
                        
                        <p className="text-emerald-400 font-semibold text-xl tracking-wide uppercase text-[14px]">
                            Gestão Multidisciplinar Educacional e Clínica
                        </p>

                        <div className="pt-4 text-slate-300 max-w-2xl leading-relaxed text-lg font-light">
                            <p>
                                O <strong className="text-white font-semibold">Sistema Brotar</strong> é uma plataforma SaaS de elite, 
                                arquitetada para orquestrar a jornada do aluno entre a <span className="text-emerald-400">Educação</span> e a <span className="text-blue-400">Saúde</span> pública.
                            </p>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-6">
                            <div className="flex flex-col">
                                <span className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Última Atualização</span>
                                <span className="text-sm font-medium text-slate-200">{APP_VERSION.releases[0]?.date}</span>
                            </div>
                            <div className="w-px h-10 bg-white/10 hidden md:block" />
                            <div className="flex flex-col">
                                <span className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Status Global</span>
                                <span className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Operacional
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SEO B - CARDS DE PARCEIROS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* DESENVOLVEDOR */}
                <AboutDisclosureCard
                    title="Arquitetura & Suporte"
                    icon={Code}
                    variant="support"
                    badge={{ text: "IMPDIGITAL", variant: "secondary" }}
                    defaultOpen={true}
                    alwaysVisibleContent={
                        <div className="flex items-center gap-6 py-2">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-indigo-400 rounded-full blur-sm opacity-20" />
                                <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xl border-4 border-white shadow-xl">
                                    CE
                                </div>
                            </div>
                            <div>
                                <h4 className="font-black text-slate-900 text-xl">Carlos Eduardo Campos</h4>
                                <p className="text-sm text-blue-600 font-bold tracking-tight mt-0.5">CEO • IMPDIGITAL Soluções Inteligentes</p>
                            </div>
                        </div>
                    }
                    expandableContent={
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-1 gap-3">
                                <a href="https://wa.me/5577991290375" target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50 transition-all duration-300 border border-slate-100 group">
                                    <div className="p-2 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform"><Smartphone size={20} className="text-slate-400 group-hover:text-emerald-600" /></div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Suporte Direto</p>
                                        <p className="font-bold text-slate-700">(77) 99129-0375</p>
                                    </div>
                                    <ExternalLink size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>

                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="p-2 bg-white rounded-xl shadow-sm"><Mail size={20} className="text-slate-400" /></div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Canal Oficial</p>
                                        <p className="font-bold text-slate-700">impdigital@gmail.com</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <p className="text-xs text-slate-400 italic text-center font-medium bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
                                    "Comprometidos com a excelência técnica e o impacto social através da tecnologia."
                                </p>
                            </div>
                        </div>
                    }
                />

                {/* INSTITUIÇÃO */}
                <AboutDisclosureCard
                    title="Instituição Licenciada"
                    icon={Building}
                    variant="institution"
                    badge={{ text: "Parceiro Ativo", variant: "success" }}
                    defaultOpen={true}
                    alwaysVisibleContent={
                        <div className="text-center py-2 flex-1 flex flex-col justify-center">
                            <h4 className="text-2xl font-black text-slate-900 tracking-tight">Prefeitura Municipal</h4>
                            <h5 className="text-xl font-bold text-orange-600 mt-1">Brotas de Macaúbas - BA</h5>
                            <div className="w-20 h-1.5 bg-gradient-to-r from-orange-400 to-orange-200 mx-auto mt-4 rounded-full" />
                        </div>
                    }
                    expandableContent={
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-5 p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-orange-600"><Layers size={22} /></div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Gestão</p>
                                    <p className="font-bold text-slate-800">Secretaria Municipal de Educação</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-5 p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-orange-600"><User size={22} /></div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Liderança</p>
                                    <p className="font-bold text-slate-800">Gislene Leite Santos</p>
                                </div>
                            </div>

                            <div className="relative mt-2">
                                <div className="absolute left-0 top-0 w-1 h-full bg-orange-200 rounded-full" />
                                <p className="text-[14px] text-slate-500 italic leading-relaxed pl-6 font-medium">
                                    "Tecnologia a serviço da inclusão e do monitoramento preciso do desenvolvimento estudantil."
                                </p>
                            </div>
                        </div>
                    }
                />
            </div>

            {/* SEO C - ESPECIFICAÇÕES TÉCNICAS */}
            <AboutDisclosureCard
                title="Core Tecnológico"
                icon={Cpu}
                variant="tech"
                defaultOpen={true}
                alwaysVisibleContent={
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-2">
                        {[
                            { label: 'Front-end Engine', value: 'React 18 + TypeScript 5', icon: Globe },
                            { label: 'Data Infrastructure', value: 'Supabase Enterprise (Edge)', icon: Database },
                            { label: 'Styling System', value: 'Tailwind CSS (Ultra Custom)', icon: Sparkles },
                            { label: 'Security Layer', value: 'RBAC + JWT + AES-256', icon: ShieldCheck }
                        ].map((item, idx) => (
                            <div key={idx} className="group cursor-default bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-colors">
                                <div className="flex items-center gap-3 mb-1.5">
                                    <item.icon size={16} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
                                </div>
                                <p className="text-slate-800 font-bold text-sm">
                                    {item.value}
                                </p>
                            </div>
                        ))}
                    </div>
                }
                expandableContent={
                    <div className="flex flex-col lg:flex-row gap-8 pt-4">
                        {/* Módulos */}
                        <div className="lg:w-2/3 space-y-6">
                            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Ecossistema de Módulos</h4>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {[
                                        'Gestão Escolar 360', 'Prontuário Digital Clínico', 'Busca Ativa Inteligente', 
                                        'Agenda Multi-Sincronizada', 'Dashboards Analíticos', 'Segurança Bancária'
                                    ].map(tag => (
                                        <span key={tag} className="px-3 py-1.5 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 shadow-sm flex items-center gap-2 hover:border-emerald-300 hover:text-emerald-700 transition-all cursor-default">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" /> {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Métricas e QR Code */}
                        <div className="lg:w-1/3 flex flex-col sm:flex-row lg:flex-col gap-6">
                            <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-center">
                                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-45">
                                    <Shield size={120} />
                                </div>
                                
                                <h4 className="font-black text-sm mb-4 flex items-center gap-3 border-b border-white/10 pb-3">
                                    <Server size={18} className="text-emerald-400" /> System Metrics
                                </h4>
                                
                                <ul className="space-y-4 text-xs">
                                    <li className="flex items-center justify-between">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider">Network</span>
                                        <span className="flex items-center gap-2 text-emerald-400 font-black">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> CLOUD ONLINE
                                        </span>
                                    </li>
                                    <li className="flex items-center justify-between">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider">Database</span>
                                        <span className="text-emerald-400 font-black">PROTECTED</span>
                                    </li>
                                    <li className="flex items-center justify-between">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider">Encryption</span>
                                        <span className="text-blue-400 font-black">SSL/TLS 1.3</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 flex flex-col items-center text-center group cursor-pointer hover:border-emerald-200 transition-colors flex-1">
                                <div className="relative mb-3">
                                    <div className="absolute -inset-2 bg-emerald-500/20 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative bg-white p-2 rounded-2xl shadow-lg border border-slate-100">
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://wa.me/5577991290375`} alt="QR Code Suporte" className="w-24 h-24" />
                                    </div>
                                </div>
                                <h5 className="font-black text-slate-900 text-xs tracking-tight uppercase">Support Quick Connect</h5>
                                <p className="text-[9px] text-slate-500 font-bold mt-1 tracking-widest">TAP OR SCAN FOR WHATSAPP</p>
                            </div>
                        </div>
                    </div>
                }
            />

            {/* SEO F - NOTAS DE LANÇAMENTO */}
            <section className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-8">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-primary-600 rounded-3xl text-white shadow-lg shadow-primary-900/20">
                            <History size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-950 tracking-tighter">Histórico de Inovação</h2>
                            <p className="text-slate-500 font-medium">Cronograma evolutivo e notas técnicas de release</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="px-6 py-2 text-sm border-slate-300">Total: {APP_VERSION.releases.length} Versões</Badge>
                </div>

                <div className="space-y-4">
                    {mappedReleases.map((release, index) => {
                        const isCurrent = index === 0;
                        const isHiddenHistory = index > 2 && !isHistoryExpanded;
                        const useDisclosure = index < 3;

                        return (
                        <div key={release.version} 
                             className={`relative pl-8 md:pl-12 group animate-slideUp transition-all duration-500 ${isHiddenHistory ? 'hidden' : ''}`}
                             style={{ animationDelay: `${index * 150}ms` }}>
                            {/* Timeline Line */}
                            <div className="absolute left-0 top-0 w-px h-full bg-slate-200 group-last:h-12" />
                            {/* Timeline Point */}
                            <div className={`absolute left-[-5px] rounded-full border-2 border-white shadow-sm transition-all duration-500 group-hover:scale-150 ${
                                useDisclosure ? 'top-6' : 'top-4'
                            } ${isCurrent ? 'bg-emerald-500 w-4 h-4 left-[-8px] shadow-emerald-500/30' : 'bg-slate-300 w-2.5 h-2.5'}`} />

                            {useDisclosure ? (
                                <TaskWidgetDisclosure {...release} />
                            ) : (
                                <div className="rounded-[2rem] overflow-hidden transition-all duration-500 bg-white shadow-premium border border-slate-100 hover:border-slate-300">
                                    <div className="bg-slate-50/50 p-4 px-5 border-slate-100 border-b flex flex-wrap justify-between items-center gap-5">
                                        <div className="flex items-center gap-5">
                                            <span className="bg-slate-200 text-slate-600 text-xs px-4 py-1.5 rounded-full font-black tracking-widest flex items-center gap-2">
                                                {release.version}
                                            </span>
                                            <h3 className="font-black text-slate-900 tracking-tight text-sm md:text-base">{release.title}</h3>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="text-xs text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                                                <History size={14} /> {release.date}
                                            </span>
                                            <Badge variant="secondary" 
                                                   className={`${
                                                       release.category === 'Funcionalidade' || release.category === 'feature' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                       release.category === 'Correção' || release.category === 'fix' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                       release.category === 'Melhoria' || release.category === 'improvement' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                       'bg-slate-100 text-slate-700'
                                                   }`}>
                                                {release.category === 'feature' ? 'Funcionalidade' :
                                                 release.category === 'fix' ? 'Correção' :
                                                 release.category === 'improvement' ? 'Melhoria' :
                                                 release.category === 'security' ? 'Segurança' : release.category}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="p-4 px-5">
                                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                            {release.tasks?.map((task, i) => (
                                                <li key={i} className="flex items-start gap-4 text-slate-600 leading-relaxed group/item text-sm">
                                                    <div className="mt-2 w-1.5 h-1.5 rounded-full transition-colors flex-shrink-0 bg-slate-300 group-hover/item:bg-primary-500" />
                                                    <span className="group-hover/item:text-slate-900 transition-colors">{task.label}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )})}
                </div>

                {hiddenVersionsCount > 0 && (
                    <div className="flex justify-center pt-4">
                        <button
                            type="button"
                            onClick={() => setIsHistoryExpanded((expanded) => !expanded)}
                            className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black uppercase tracking-widest text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-lg"
                        >
                            {isHistoryExpanded ? (
                                <>
                                    Ocultar histórico
                                    <ChevronUp size={18} />
                                </>
                            ) : (
                                <>
                                    Ver histórico completo ({APP_VERSION.releases.length} versões)
                                    <ChevronDown size={18} />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </section>

            {/* FOOTER */}
            <footer className="pt-8 border-t border-slate-200 text-center space-y-4">
                <div className="flex justify-center items-center gap-4 mb-4">
                    <div className="w-12 h-px bg-slate-200" />
                    <HeartPulse className="text-primary-600 opacity-30" size={24} />
                    <div className="w-12 h-px bg-slate-200" />
                </div>
                <p className="text-slate-950 font-black text-sm uppercase tracking-[0.2em]">
                    © {currentYear} IMPDIGITAL Soluções Inteligentes
                </p>
                <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-8 text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                    <span className="hover:text-primary-600 transition-colors cursor-default">Licença Corporativa: Brotas de Macaúbas</span>
                    <span className="hidden md:block text-slate-200"></span>
                    <span className="hover:text-primary-600 transition-colors cursor-default">Infraestrutura: Supabase Cloud Enterprise</span>
                    <span className="hidden md:block text-slate-200"></span>
                    <span className="hover:text-primary-600 transition-colors cursor-default">Aviso: Sigilo Profissional Garantido (LGPD)</span>
                </div>
            </footer>

        </div>
    );
};


import React from 'react';
import {
    Code, Server, Database, Shield, Smartphone, Mail, Globe,
    CheckCircle, Info, QrCode, Building, User, Cpu, Layers, HeartPulse, ExternalLink
} from 'lucide-react';

export const AboutSystem: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-12">

            {/* SEÇÃO A - IDENTIDADE DO SISTEMA */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl p-8 md:p-12">
                <div className="absolute top-0 right-0 p-12 opacity-5">
                    <HeartPulse size={300} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/20 shadow-glow">
                        <HeartPulse size={48} className="text-primary-400" />
                    </div>
                    <div className="text-center md:text-left">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Sistema Brotar</h1>
                        <p className="text-primary-200 font-medium text-lg mb-4">Gestão Multidisciplinar Educacional e Clínica</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-slate-300">
                            <span className="bg-white/10 px-3 py-1 rounded-full border border-white/10">Versão 2.1 (Supabase)</span>
                            <span className="bg-white/10 px-3 py-1 rounded-full border border-white/10">Atualizado: {new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="mt-6 text-slate-300 max-w-2xl leading-relaxed space-y-4">
                            <p>
                                O <strong>Sistema Brotar</strong> é uma plataforma SaaS (Software as a Service)
                                desenvolvida para integrar a gestão de atendimentos na rede pública, conectando
                                **Educação** e **Saúde**.
                            </p>
                            <p>
                                Nosso foco é otimizar o acompanhamento do **Plano Educacional Individualizado (PEI)**
                                e centralizar prontuários de especialidades como Psicologia, Fonoaudiologia e
                                Terapia Ocupacional, garantindo uma visão 360º do desenvolvimento do aluno.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* SEÇÃO B - DESENVOLVEDOR */}
                <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden flex flex-col">
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Code size={20} className="text-blue-600" /> Desenvolvimento & Suporte
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IMPDIGITAL</span>
                    </div>
                    <div className="p-6 flex-1 flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl border-2 border-white shadow-md">
                                CE
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-lg">Carlos Eduardo Campos</h4>
                                <p className="text-sm text-blue-600 font-medium">CEO • IMPDIGITAL Soluções Inteligentes</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <a href="https://wa.me/5577991290375" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-green-50 hover:text-green-700 transition-colors group cursor-pointer border border-slate-100">
                                <Smartphone size={20} className="text-slate-400 group-hover:text-green-600" />
                                <div className="flex-1">
                                    <p className="text-xs text-slate-500 uppercase font-bold">WhatsApp / Suporte</p>
                                    <p className="font-medium text-slate-700">(77) 99129-0375</p>
                                </div>
                                <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>

                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <Mail size={20} className="text-slate-400" />
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">E-mail</p>
                                    <p className="font-medium text-slate-700">impdigital@gmail.com</p>
                                </div>
                            </div>

                            <a href="https://instagram.com/eduardocampuss" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-pink-50 hover:text-pink-700 transition-colors group cursor-pointer border border-slate-100">
                                <Globe size={20} className="text-slate-400 group-hover:text-pink-600" />
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Instagram</p>
                                    <p className="font-medium text-slate-700">@eduardocampuss</p>
                                </div>
                                <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-100">
                            <p className="text-xs text-slate-500 italic text-center">
                                "Desenvolvimento, manutenção, atualizações e suporte técnico especializado."
                            </p>
                        </div>
                    </div>
                </div>

                {/* SEÇÃO D - INSTITUIÇÃO */}
                <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden flex flex-col">
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Building size={20} className="text-orange-600" /> Instituição Licenciada
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cliente</span>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                        <div className="text-center mb-6">
                            <h4 className="text-xl font-extrabold text-slate-800">Prefeitura Municipal</h4>
                            <h5 className="text-lg font-medium text-orange-600">Brotas de Macaúbas - BA</h5>
                            <div className="w-16 h-1 bg-orange-200 mx-auto mt-3 rounded-full"></div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><Layers size={18} /></div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Secretaria</p>
                                    <p className="font-medium text-slate-700">Secretaria Municipal de Educação</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><User size={18} /></div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Secretária de Educação</p>
                                    <p className="font-medium text-slate-700">Gislene Leite Santos</p>
                                </div>
                            </div>

                            <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 mt-2">
                                <p className="text-sm text-slate-600 italic leading-relaxed text-center">
                                    "Organizar e monitorar atendimentos multidisciplinares, fortalecer a rede de apoio às escolas e garantir eficiência no acompanhamento dos estudantes."
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SEÇÃO C - TECNOLOGIAS E EXTRAS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-slate-100 p-8">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Cpu size={22} className="text-primary-600" /> Especificações Técnicas
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-8">
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-sm text-slate-500">Front-end</span>
                            <span className="text-sm font-medium text-slate-700">React + TypeScript</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-sm text-slate-500">Persistência</span>
                            <span className="text-sm font-medium text-slate-700">Supabase Cloud (PostgreSQL)</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-sm text-slate-500">Estilização</span>
                            <span className="text-sm font-medium text-slate-700">Tailwind CSS (Premium)</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-sm text-slate-500">Backup</span>
                            <span className="text-sm font-medium text-slate-700">JSON Granular + Snapshots</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                        <h4 className="text-sm font-bold text-slate-700 mb-3">Módulos Integrados</h4>
                        <div className="flex flex-wrap gap-2">
                            {['Gestão Escolar', 'Prontuário Clínico', 'Busca Ativa Social', 'Agenda Multiprofissional', 'Painéis de Gestão', 'Controle de Acesso RBAC'].map(tag => (
                                <span key={tag} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 shadow-sm flex items-center gap-1">
                                    <CheckCircle size={10} className="text-green-500" /> {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* STATUS E QR CODE */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10">
                            <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Server size={18} className="text-green-400" /> Status do Sistema
                            </h4>
                            <ul className="space-y-3">
                                <li className="flex items-center justify-between text-sm">
                                    <span className="text-slate-300">Servidor</span>
                                    <span className="flex items-center gap-1.5 text-green-400 font-bold"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Online</span>
                                </li>
                                <li className="flex items-center justify-between text-sm">
                                    <span className="text-slate-300">Banco de Dados</span>
                                    <span className="flex items-center gap-1.5 text-green-400 font-bold">Conectado</span>
                                </li>
                                <li className="flex items-center justify-between text-sm">
                                    <span className="text-slate-300">Versão</span>
                                    <span className="flex items-center gap-1.5 text-blue-400 font-bold">v2.1 Stable (Supabase)</span>
                                </li>
                            </ul>
                        </div>
                        {/* Background decoration */}
                        <div className="absolute -bottom-10 -right-10 opacity-10">
                            <Shield size={100} />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 flex flex-col items-center text-center">
                        <div className="bg-white p-2 rounded-xl shadow-md border border-slate-100 mb-3">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://wa.me/5577991290375" alt="QR Code Suporte" className="w-24 h-24" />
                        </div>
                        <h5 className="font-bold text-slate-800 text-sm">Suporte Rápido</h5>
                        <p className="text-xs text-slate-500 mt-1">Escaneie para falar no WhatsApp</p>
                    </div>
                </div>
            </div>

            {/* SEÇÃO E - RODAPÉ LEGAL */}
            <div className="border-t border-slate-200 pt-8 text-center space-y-2">
                <p className="text-sm font-bold text-slate-600">
                    © {currentYear} IMPDIGITAL Soluções Inteligentes. Todos os direitos reservados.
                </p>
                <div className="flex justify-center gap-2 text-xs text-slate-400">
                    <span>Licença Exclusiva: Prefeitura de Brotas de Macaúbas</span>
                    <span>•</span>
                    <span>Aviso Legal: Dados clínicos protegidos por sigilo profissional.</span>
                </div>
            </div>

        </div>
    );
};

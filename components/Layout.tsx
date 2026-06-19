import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Search,
  Calendar,
  Settings,
  FileText,
  UserPlus,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  School,
  UserCog,
  Shield,
  FileCheck,
  Key,
  Database,
  HeartPulse, // Retained from original
  ShieldCheck, // Retained from original
  Brain, // Retained from original
  Shapes, // Retained from original
  Heart, // Retained from original
  Activity, // Retained from original
  Mic, // Retained from original
  Puzzle, // Retained from original
  Sparkles, // Retained from original
  Info, // Retained from original
  Palette, // Retained from original
  Scroll, // Retained from original
  ShieldAlert, // Novo ícone de auditoria
  Apple, // Retained from original
  BarChart2,
  Clock,
  Tag,
  CalendarDays,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { User, Specialty, SystemSettings, hasPermission, canViewSystemAuditLogs } from '../types';
import { APP_VERSION } from '../src/config/version';
import { isPerfilRestritoProntuario } from '@/src/config/perfilRestrito';
import { NotificationBell } from './NotificationBell';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
  onLogout: () => void;
  systemSettings?: SystemSettings;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentUser, onLogout, systemSettings }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const activePage = location.pathname.split('/').pop() || 'dashboard';

  const onNavigate = (page: string, state?: any) => {
    if (page.startsWith('http')) {
      window.open(page, '_blank');
      return;
    }
    navigate(`/app/${page}`, { state });
    setIsMobileMenuOpen(false);
  };

  // Defaults if not provided
  const systemName = systemSettings?.systemName || 'Brotar';
  const LogoComponent = systemSettings?.logoUrl ?
    () => <img src={systemSettings.logoUrl} alt="Logo" className="w-10 h-10 object-contain" /> :
    () => <img src="/logo-oficial.png" alt="Logo Brotar" className="w-12 h-12 object-contain brightness-0 invert" />;
  const LogoComponentMobile = systemSettings?.logoUrl ?
    () => <img src={systemSettings.logoUrl} alt="Logo" className="w-10 h-10 object-contain" /> :
    () => <img src="/logo-oficial.png" alt="Logo Brotar" className="w-12 h-12 object-contain" />;

  // --- Theme Logic Based on Role/Specialty ---
  const getThemeClasses = () => {
    if (currentUser.role === 'ADMIN') return {
      sidebar: 'bg-gradient-to-b from-slate-900 to-slate-800 text-white',
      active: 'bg-white/10 text-white shadow-glow',
      hover: 'hover:bg-white/5 text-slate-300',
      accent: 'text-slate-100'
    };
    if (currentUser.role === 'ESCOLA') return {
      sidebar: 'bg-gradient-to-b from-emerald-900 to-teal-800 text-white',
      active: 'bg-white/20 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]',
      hover: 'hover:bg-white/10 text-emerald-100',
      accent: 'text-emerald-200'
    };
    if (currentUser.role === 'EDUCATION_SECRETARY' || currentUser.role === 'SECRETARIA_SEDE' || currentUser.role === 'SECRETARIA_COCAL' || currentUser.role === 'ASSISTANT') {
      if (currentUser.scope === 'COCAL' || currentUser.role === 'SECRETARIA_COCAL') {
        return { sidebar: 'bg-gradient-to-b from-orange-950 to-orange-900 text-white', active: 'bg-white/20 text-white shadow-[0_0_15px_rgba(251,146,60,0.4)]', hover: 'hover:bg-white/10 text-orange-100', accent: 'text-orange-200' };
      }
      return { sidebar: 'bg-gradient-to-b from-blue-950 to-blue-900 text-white', active: 'bg-white/20 text-white shadow-[0_0_15px_rgba(96,165,250,0.4)]', hover: 'hover:bg-white/10 text-blue-100', accent: 'text-blue-200' };
    }

    switch (currentUser.specialty) {
      case Specialty.PSYCHOLOGY: return { sidebar: 'bg-gradient-to-br from-purple-900 to-indigo-900 text-white', active: 'bg-white/20 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]', hover: 'hover:bg-white/10 text-purple-100', accent: 'text-purple-200' };
      case Specialty.SPEECH_THERAPY: return { sidebar: 'bg-gradient-to-br from-cyan-900 to-blue-900 text-white', active: 'bg-white/20 text-white shadow-[0_0_15px_rgba(34,211,238,0.5)]', hover: 'hover:bg-white/10 text-cyan-100', accent: 'text-cyan-200' };
      case Specialty.OCCUPATIONAL_THERAPY: return { sidebar: 'bg-gradient-to-br from-indigo-900 to-violet-900 text-white', active: 'bg-white/20 text-white shadow-[0_0_15px_rgba(129,140,248,0.5)]', hover: 'hover:bg-white/10 text-indigo-100', accent: 'text-indigo-200' };
      case Specialty.PSYCHOPEDAGOGY: return { sidebar: 'text-white', sidebarStyle: { background: 'linear-gradient(to bottom right, #9F5FC0, #D9ABFF)' }, active: 'bg-white/20 text-white shadow-[0_0_15px_rgba(217,171,255,0.5)]', hover: 'hover:bg-white/10 text-purple-100', accent: 'text-purple-100' };
      case Specialty.NUTRITION: return { sidebar: 'bg-gradient-to-br from-green-900 to-emerald-900 text-white', active: 'bg-white/20 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]', hover: 'hover:bg-white/10 text-green-100', accent: 'text-green-200' };
      default: return { sidebar: 'bg-gradient-to-b from-primary-900 to-primary-800 text-white', active: 'bg-white/20 text-white', hover: 'hover:bg-white/10 text-primary-100', accent: 'text-primary-100' };
    }
  };

  const theme = getThemeClasses();

  const isPsychology = currentUser.role === 'SPECIALIST' && currentUser.specialty === Specialty.PSYCHOLOGY;

  const getPsychologyMenuGroups = () => {
    const principal = [
      { id: 'dashboard', label: 'Início', icon: <LayoutDashboard size={20} />, state: { tab: 'resumo' } },
    ];
    const atendimentoClinico = [
      { id: 'scheduling', label: 'Agenda', icon: <Calendar size={20} /> },
      { id: 'list', label: 'Meus Pacientes', icon: <Users size={20} /> },
      { id: 'dashboard', label: 'Atendimentos (Evoluções)', icon: <Activity size={20} />, state: { tab: 'evolucoes' } },
      { id: 'psychology', label: 'Prontuários', icon: <Brain size={20} /> },
    ];
    const documentos = [
      { id: 'documents', label: 'Documentos & Laudos', icon: <FileText size={20} /> },
      { id: 'dashboard', label: 'Documentos IA', icon: <Sparkles size={20} />, state: { tab: 'documentos' } },
    ];
    const gestaoDados = [
      { id: 'relatorio-tea', label: 'Painel ANEE', icon: <Puzzle size={20} /> },
      { id: 'dashboard', label: 'Analytics', icon: <BarChart2 size={20} />, state: { tab: 'relatorios' } },
    ];
    const rodape = [
      { id: 'vault', label: 'Cofre', icon: <Shield size={20} /> },
      { id: 'my-access', label: 'Acessos', icon: <Key size={20} /> },
    ];
    return { principal, atendimentoClinico, documentos, gestaoDados, rodape };
  };

  // --- MENU BUILDERS ---

  // 1. Definição dos Módulos Clínicos (Comum a Admin e Especialistas)
  const getAllClinicalItems = () => [
    { id: 'psychology', label: 'Psicologia', icon: <Brain size={20} />, specialty: Specialty.PSYCHOLOGY },
    { id: 'social-service-hub', label: 'Serviço Social', icon: <Search size={20} />, specialty: Specialty.SOCIAL_WORK },
    { id: 'psychopedagogy', label: 'Psicopedagogia', icon: <Shapes size={20} />, specialty: Specialty.PSYCHOPEDAGOGY },
    { id: 'occupational-therapy', label: 'Terapia Ocupacional', icon: <Puzzle size={20} />, specialty: Specialty.OCCUPATIONAL_THERAPY },
    { id: 'speech-therapy', label: 'Fonoaudiologia', icon: <Mic size={20} />, specialty: Specialty.SPEECH_THERAPY },
    { id: 'physiotherapy', label: 'Fisioterapia', icon: <Activity size={20} />, specialty: Specialty.PHYSIOTHERAPY },
    { id: 'nutricion/dashboard', label: 'Nutrição', icon: <Apple size={20} />, specialty: Specialty.NUTRITION },
  ];

  // 2. Menu Estruturado para ADMINISTRADOR
  const getAdminMenuGroups = () => {
    // Grupo 1: Navegação Principal
    const main = [
      { id: 'dashboard', label: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
      { id: 'scheduling', label: 'Central de Agendamentos', icon: <Calendar size={20} /> },
      { id: 'list', label: 'Alunos / Prontuários', icon: <Users size={20} /> },
      { id: 'documents', label: 'Documentos', icon: <FileText size={20} /> },
      { id: 'schools', label: 'Unidades Escolares', icon: <School size={20} /> },
      { id: 'relatorio-tea', label: 'Relatório TEA', icon: <Puzzle size={20} /> },
    ];

    // Grupo 2: Administração
    const administration = [
      { id: 'support-professionals', label: 'Profissionais de Apoio', icon: <UserCog size={20} /> },
      { id: 'admin', label: 'Gestão de Usuários', icon: <ShieldCheck size={20} /> },
      ...(canViewSystemAuditLogs(currentUser)
        ? [{ id: 'audit-logs', label: 'Auditoria do Sistema', icon: <ShieldAlert size={20} /> } as const]
        : []),
    ];

    // Grupo 3: Configurações
    const settings = [
      { id: 'settings', label: 'Identidade Visual', icon: <Palette size={20} /> },
      { id: 'letterhead-config', label: 'Papel Timbrado', icon: <Scroll size={20} /> },
    ];
    if (hasPermission(currentUser, 'can_access_security_data')) {
      settings.push({ id: 'backup', label: 'Segurança de Dados', icon: <Database size={20} /> });
    }

    // Grupo 4: Módulos Clínicos
    const clinical = getAllClinicalItems();

    return { main, administration, settings, clinical };
  };

  // 3. Menu Linear para OUTROS PERFIS
  const getStandardMenuItems = () => {
    const items = [
      {
        id: 'dashboard',
        label: 'Visão Geral',
        icon: <LayoutDashboard size={20} />
      },
      ...(currentUser.role === 'SPECIALIST'
        ? [{
            id: 'relatorio-tea',
            label: 'Painel ANEE',
            sub: 'Dados gerais da rede',
            icon: <Puzzle size={20} />
          }]
        : []),
      // Relatórios Gerenciais (apenas para Secretaria de Educação e ADMIN)
      ...(currentUser.role === 'EDUCATION_SECRETARY' || currentUser.role === 'ADMIN'
        ? [{
            id: 'relatorios-gerenciais',
            label: 'Relatórios Gerenciais',
            icon: <BarChart2 size={20} />,
          }]
        : []),
      // Relatório Anual TCM — exclusivo EDUCATION_SECRETARY
      ...(currentUser.role === 'EDUCATION_SECRETARY'
        ? [{
            id: 'relatorio-anual-tcm',
            label: 'Relatório Anual TCM',
            sub: 'Prestação de contas TCM/BA',
            icon: <Building2 size={20} />,
          }]
        : []),
      // Central de Agendamentos / Minha Agenda
      ...(currentUser.role !== 'EDUCATION_SECRETARY' && currentUser.role !== 'ADMIN'
        ? [{
            id: 'scheduling',
            label:
              currentUser.specialty === Specialty.SOCIAL_WORK
                ? 'Meus Atendimentos'
                : isPerfilRestritoProntuario(currentUser)
                  ? 'Minha Agenda'
                  : 'Central de Agendamentos',
            sub: isPerfilRestritoProntuario(currentUser) ? 'Seus atendimentos do dia' : 'Visão operacional da rede',
            icon: <Calendar size={20} />,
          }]
        : []),
      {
        id: 'list',
        label: 'Alunos / Prontuários',
        sub: isPerfilRestritoProntuario(currentUser) ? 'Acesse os prontuários' : undefined,
        icon: <Users size={20} />
      },
    ];

    const isInternalRole = currentUser.role === 'EDUCATION_SECRETARY' ||
      currentUser.role === 'SECRETARIA_SEDE' ||
      currentUser.role === 'SECRETARIA_COCAL' ||
      currentUser.role === 'ASSISTANT' ||
      currentUser.role === 'ADMIN' ||
      currentUser.role === 'COORDENADOR';

    // Seção de Gestão Escolar (Escolas e Profissionais)
    if (isInternalRole) {
      items.push({ id: 'schools', label: 'Unidades Escolares', icon: <School size={20} /> });

      // Relatório TEA (para os 4 perfis autorizados - ADMIN já tem menu próprio, aqui para os outros)
      if (['EDUCATION_SECRETARY', 'COORDENADOR', 'SECRETARIA_SEDE', 'SECRETARIA_COCAL', 'ASSISTANT'].includes(currentUser.role)) {
        items.push({
          id: 'relatorio-tea',
          label: 'Relatório TEA',
          icon: <Puzzle size={20} />,
        });
      }

      // Administradores, Secretárias e Assistentes (Recepção) veem profissionais de apoio
      items.push({ id: 'support-professionals', label: 'Profissionais de Apoio', icon: <UserCog size={20} /> });
    }

    // Seção do Cofre e Documentos (Novo fluxo)
    if (isInternalRole) {
      items.push(
        { id: 'vault', label: 'Cofre Documentos', icon: <Shield size={20} /> },
        { id: 'documents', label: 'Documentos Oficiais', icon: <FileCheck size={20} /> },
        ...(canViewSystemAuditLogs(currentUser)
          ? [{ id: 'audit-logs', label: 'Auditoria do Sistema', icon: <ShieldAlert size={20} /> } as const]
          : []),
        { id: 'my-access', label: 'Meus Acessos', icon: <Key size={20} /> },
        { id: 'about', label: 'Sobre o Sistema', icon: <Info size={20} /> }
      );
    }

    return items;
  };

  const getStandardSpecialtyItems = () => {
    const all = getAllClinicalItems();
    if (currentUser.role === 'SPECIALIST' && currentUser.specialty) {
      return all.filter(item => item.specialty === currentUser.specialty);
    }
    return [];
  };

  // Menu restrito para role ESCOLA
  const getEscolaMenuItems = () => [
    { id: 'dashboard', label: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
    { id: 'list', label: 'Alunos / Prontuários', icon: <Users size={20} /> },
    { id: 'support-professionals', label: 'Profissionais de Apoio', icon: <UserCog size={20} /> },
  ];

  // Decide which menu structure to use
  const isAdmin = currentUser.role === 'ADMIN';
  const isEscola = currentUser.role === 'ESCOLA';
  const adminMenuGroups = isAdmin ? getAdminMenuGroups() : null;
  const standardMenuItems = (!isAdmin && !isEscola) ? getStandardMenuItems() : [];
  const standardSpecialtyItems = (!isAdmin && !isEscola) ? getStandardSpecialtyItems() : [];
  const escolaMenuItems = isEscola ? getEscolaMenuItems() : [];

  const getStandardExtraItems = () => {
    if (currentUser.role !== 'SPECIALIST') return [];
    return [
      { id: 'retroativo', label: 'Lançamentos Históricos', sub: 'Lançamento retroativo papel', icon: <Clock size={18} /> },
      { id: 'documents', label: 'Documentos', sub: 'Relatórios e laudos', icon: <FileText size={18} /> },
    ];
  };

  const isItemActive = (itemId: string, itemState?: any) => {
    if (itemId === 'dashboard') {
      const activeTabFromState = location.state?.tab || 'resumo';
      const itemTab = itemState?.tab || 'resumo';
      return activePage === 'dashboard' && activeTabFromState === itemTab;
    }
    if (activePage === itemId) return true;
    // Highlight list menu when editing/registering
    if (itemId === 'list' && (activePage === 'register' || activePage === 'profile' || activePage === 'edit-student')) return true;
    // Highlight nutrição menu for all /nutricion/* sub-routes
    if (itemId === 'nutricion/dashboard' && location.pathname.includes('/nutricion/')) return true;
    return false;
  };

  const getRoleLabel = () => {
    switch (currentUser.role) {
      case 'ADMIN': return 'Administração';
      case 'EDUCATION_SECRETARY':
        return 'Secretário(a) de Educação';
      case 'SECRETARIA_SEDE':
        return 'Secretária Sede';
      case 'SECRETARIA_COCAL':
        return 'Secretária Cocal';
      case 'COORDENADOR':
        return 'Coordenador(a)';
      case 'SPECIALIST': return currentUser.specialty || 'Especialista';
      case 'ESCOLA': return 'Escola';
      default: return 'Recepção';
    }
  };

  const MenuButton: React.FC<{ item: any }> = ({ item }) => {
    const active = isItemActive(item.id, item.state) || (item.specialty && activePage.startsWith(item.id));
    return (
      <button
        onClick={() => onNavigate(item.id, item.state)}
        aria-current={active ? 'page' : undefined}
        className={`w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${isCollapsed ? "justify-center py-1.5" : "px-4 py-3.5"} ${active ? theme.active : theme.hover}`}
      >
        {active && !isCollapsed && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full"></div>}
        {isCollapsed ? (
          <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center transition-all ${active ? 'bg-white/20' : 'bg-transparent group-hover:bg-white/10'}`}>
            <span className={`${active ? 'text-white' : 'text-white/50 group-hover:text-white/80'} transition-colors`}>{item.icon}</span>
          </div>
        ) : (
          <span className={`relative z-10 flex-shrink-0 ${active ? "scale-110" : "group-hover:scale-110"} transition-transform duration-200`}>
            {item.icon}
          </span>
        )}
        {!isCollapsed && <span className="relative z-10 truncate">{item.label}</span>}
        {isCollapsed && (
          <div className="absolute left-[56px] top-1/2 -translate-y-1/2 hidden group-hover:block z-50">
            <div className="bg-slate-800 text-white text-[11px] font-medium px-2.5 py-1 rounded-md whitespace-nowrap shadow-lg">{item.label}</div>
          </div>
        )}
      </button>
    );
  };

  const MenuCardButton: React.FC<{ item: any }> = ({ item }) => {
    const isActive = isItemActive(item.id, item.state) || (item.specialty && activePage.startsWith(item.id));
    return (
      <button
        onClick={() => onNavigate(item.id, item.state)}
        aria-current={isActive ? 'page' : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
          isActive
            ? 'bg-white/20 border-white/30 shadow-sm'
            : 'bg-white/8 border-white/10 hover:bg-white/15 hover:border-white/20'
        }`}
        style={isActive ? {} : {background: 'rgba(255,255,255,0.06)'}}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-white/25' : 'bg-white/12'}`}
          style={{background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'}}>
          <span className="text-white">{item.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] leading-tight truncate ${isActive ? 'font-semibold text-white' : 'font-medium text-white/85'}`}>
            {item.label}
          </p>
          {item.sub && (
            <p className="text-[10px] text-white/55 mt-0.5 truncate">{item.sub}</p>
          )}
        </div>
        {item.badge && (
          <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-white/90 text-[10px] font-bold flex items-center justify-center" style={{color: '#9F5FC0'}}>
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const MenuButtonMobile: React.FC<{ item: any }> = ({ item }) => {
    const active = isItemActive(item.id, item.state) || (item.specialty && activePage.startsWith(item.id));
    return (
      <button
        onClick={() => {
          onNavigate(item.id, item.state);
          setIsMobileMenuOpen(false);
        }}
        aria-current={active ? 'page' : undefined}
        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
          active ? theme.active : theme.hover
        }`}
      >
        {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full"></div>}
        <span className={`relative z-10 ${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-200`}>
          {item.icon}
        </span>
        <span className="relative z-10">{item.label}</span>
      </button>
    );
  };

  const SectionHeader = ({ title, icon: Icon }: { title: string, icon?: any }) => (
    isCollapsed ? (
      <div className="my-2 mx-2 border-t border-white/10" />
    ) : (
      <div className="px-4 mt-6 mb-2 flex items-center gap-2 opacity-50">
        {Icon && <Icon size={12} />}
        <p className="text-[10px] font-bold uppercase tracking-widest">{title}</p>
      </div>
    )
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans selection:bg-primary-500 selection:text-white">
      {/* Sidebar - Desktop */}
      <aside className={`hidden lg:flex flex-col fixed h-full z-30 shadow-2xl ${theme.sidebar} ${isCollapsed ? "w-[72px]" : "w-72"} transition-all duration-300`} style={(theme as any).sidebarStyle || {}}>
        <div className="px-5 pt-5 pb-4 relative" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.20)', border: '1.5px solid rgba(255,255,255,0.35)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.20)' }}>
              <LogoComponent />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: '3px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 400, letterSpacing: '0.5px' }}>Sistema</span>
                  <span style={{ color: 'white', fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1 }}>Brotar</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles size={10} style={{ color: 'rgba(253,224,71,0.90)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.60)', fontSize: '10px', fontStyle: 'italic' }}>Gestão Premium</span>
                </div>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex items-center justify-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></div>
              <span className="text-[10px] tracking-wide font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{APP_VERSION.version}</span>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>•</span>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.60)' }}>Release estável</span>
            </div>
          )}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-4 top-6 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-50 hover:scale-110 group" style={{ background: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.30), 0 1px 4px rgba(0,0,0,0.12)', border: '2px solid #e2e8f0' }} title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}>
            {isCollapsed ? <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-800" /> : <ChevronLeft size={14} className="text-slate-600 group-hover:text-slate-800" />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar pb-6">

          {/* RENDERIZAÇÃO DO MENU */}
          {isAdmin && adminMenuGroups ? (
            <>
              <SectionHeader title="Navegação Principal" />
              {adminMenuGroups.main.map(item => <MenuButton key={item.id} item={item} />)}

              <SectionHeader title="Administração" />
              {adminMenuGroups.administration.map(item => <MenuButton key={item.id} item={item} />)}

              <SectionHeader title="Configurações" />
              {adminMenuGroups.settings.map(item => <MenuButton key={item.id} item={item} />)}

              <div className="my-4 border-t border-white/10 mx-2"></div>
              <SectionHeader title="Módulos Clínicos" icon={Sparkles} />
              {adminMenuGroups.clinical.map(item => <MenuButton key={item.id} item={item} />)}


            </>
          ) : isEscola ? (
            <>
              <div className="mx-2 mb-4 mt-2 p-4 bg-white/10 rounded-xl border border-white/20 shadow-inner">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200 opacity-70 mb-2">Unidade Logada</p>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                    <School size={16} className="text-emerald-100" />
                  </div>
                  <p className="text-sm font-black text-white leading-tight uppercase tracking-tight truncate" title={currentUser.name}>
                    {currentUser.name}
                  </p>
                </div>
                {currentUser.schoolInep && (
                  <p className="text-[10px] text-emerald-200/60 mt-2 font-mono ml-8">INEP: {currentUser.schoolInep}</p>
                )}
              </div>
              <SectionHeader title="Gestão da Unidade" />
              {escolaMenuItems.map(item => <MenuButton key={item.id} item={item} />)}
            </>
          ) : isPsychology ? (
            <>
              {(() => {
                const groups = getPsychologyMenuGroups();
                return (
                  <>
                    <SectionHeader title="Principal" />
                    {groups.principal.map(item => <MenuCardButton key={item.label} item={item} />)}

                    <SectionHeader title="Atendimento Clínico" />
                    {groups.atendimentoClinico.map(item => <MenuCardButton key={item.label} item={item} />)}

                    <SectionHeader title="Documentos" />
                    {groups.documentos.map(item => <MenuCardButton key={item.label} item={item} />)}

                    <SectionHeader title="Gestão & Dados" />
                    {groups.gestaoDados.map(item => <MenuCardButton key={item.label} item={item} />)}

                    <SectionHeader title="Segurança" />
                    {groups.rodape.map(item => <MenuCardButton key={item.label} item={item} />)}
                  </>
                );
              })()}
            </>
          ) : (
            <>
              <SectionHeader title="Navegação Principal" />
              {standardMenuItems.map(item =>
                currentUser.role === 'SPECIALIST'
                  ? <MenuCardButton key={item.id} item={item} />
                  : <MenuButton key={item.id} item={item} />
              )}

              {standardSpecialtyItems.length > 0 && (
                <>
                  <div className="my-4 border-t border-white/10 mx-2"></div>
                  <SectionHeader title="Módulos Clínicos" icon={Sparkles} />
                  {standardSpecialtyItems.map(item =>
                    currentUser.role === 'SPECIALIST'
                      ? <MenuCardButton key={item.id} item={item} />
                      : <MenuButton key={item.id} item={item} />
                  )}
                  {currentUser.role === 'SPECIALIST' && getStandardExtraItems().length > 0 && (
                    <>
                      <div className="my-4 border-t border-white/10 mx-2"></div>
                      <SectionHeader title="Módulos Clínicos" />
                      {getStandardExtraItems().map(item => <MenuCardButton key={item.id} item={item} />)}
                    </>
                  )}
                </>
              )}
            </>
          )}

        </nav>

        <div className={isCollapsed ? "px-2 py-3 mt-auto" : "p-4 mt-auto"}>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(30,0,60,0.55)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 4px 16px rgba(0,0,0,0.50), 0 1px 4px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            
            {/* Avatar + Nome + Role */}
            <div className={isCollapsed ? "flex justify-center py-3" : "flex items-center gap-3 p-4"} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.28)' }}>
                {currentUser.photoUrl ? (
                  <img src={currentUser.photoUrl} alt={`Foto de ${currentUser.name}`} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-black">{currentUser.username.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden flex-1">
                  <p className="text-white text-[13px] font-bold truncate leading-tight">{currentUser.name.split(' ')[0]}</p>
                  <p className="text-[9px] uppercase font-semibold tracking-wider mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.50)' }}>{getRoleLabel()}</p>
                </div>
              )}
            </div>

            {/* Versão + Data em destaque */}
            {!isCollapsed && (<div className="px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Tag size={11} style={{ color: 'rgba(255,255,255,0.55)' }} />
                  <span className="text-[10px] font-bold tracking-wide" style={{ color: 'rgba(255,255,255,0.80)' }}>{APP_VERSION.version}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CalendarDays size={11} style={{ color: 'rgba(255,255,255,0.45)' }} />
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{APP_VERSION.display.split('•')[1]?.trim() || APP_VERSION.display}</span>
                </div>
              </div>
            </div>)}

            {/* Botões Sobre + Sair */}
            {isCollapsed ? (
              <div className="flex flex-col">
                <button onClick={() => onNavigate('about')} title="Sobre" className="flex items-center justify-center py-2.5 w-full transition-all hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.65)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <Info size={15} />
                </button>
                <button onClick={onLogout} title="Sair" className="flex items-center justify-center py-2.5 w-full text-red-300/70 hover:text-red-200 hover:bg-red-500/15 transition-all">
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-0">
                <button onClick={() => onNavigate('about')} className="flex items-center justify-center gap-1.5 text-[11px] font-semibold py-3 transition-all hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.65)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                  <Info size={13} /> Sobre
                </button>
                <button onClick={onLogout} className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-red-300/70 hover:text-red-200 hover:bg-red-500/15 py-3 transition-all">
                  <LogOut size={13} /> Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 flex justify-between items-center px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-slate-50 border border-slate-100 rounded-xl shadow-sm flex items-center justify-center">
            <LogoComponentMobile />
          </div>
          <span className="font-extrabold text-slate-800 text-lg tracking-tight">{systemName}</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell currentUser={currentUser} />
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600 p-2 rounded-lg hover:bg-slate-100">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Mobile Sidebar - Menu móvel de alta fidelidade e idêntico ao desktop */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 w-72 ${theme.sidebar} z-50 transform transition-transform duration-300 shadow-2xl flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`} style={(theme as any).sidebarStyle || {}}>
        <div className="px-5 pt-6 pb-4 relative" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.20)', border: '1.5px solid rgba(255,255,255,0.35)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.20)' }}>
              <LogoComponent />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: '3px' }}>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 400, letterSpacing: '0.5px' }}>Sistema</span>
                <span style={{ color: 'white', fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1 }}>Brotar</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Sparkles size={10} style={{ color: 'rgba(253,224,71,0.90)' }} />
                <span style={{ color: 'rgba(255,255,255,0.60)', fontSize: '10px', fontStyle: 'italic' }}>Gestão Premium</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></div>
            <span className="text-[10px] tracking-wide font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{APP_VERSION.version}</span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>•</span>
            <span className="text-white/45 text-[10px]">Release estável</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar py-6">
          {/* RENDERIZAÇÃO DO MENU MOBILE COM PERMISSÕES IDÊNTICAS AO DESKTOP */}
          {isAdmin && adminMenuGroups ? (
            <>
              <SectionHeader title="Navegação Principal" />
              {adminMenuGroups.main.map(item => <MenuButtonMobile key={item.id} item={item} />)}

              <SectionHeader title="Administração" />
              {adminMenuGroups.administration.map(item => <MenuButtonMobile key={item.id} item={item} />)}

              <SectionHeader title="Configurações" />
              {adminMenuGroups.settings.map(item => <MenuButtonMobile key={item.id} item={item} />)}

              <div className="my-4 border-t border-white/10 mx-2"></div>
              <SectionHeader title="Módulos Clínicos" icon={Sparkles} />
              {adminMenuGroups.clinical.map(item => <MenuButtonMobile key={item.id} item={item} />)}
            </>
          ) : isEscola ? (
            <>
              <div className="mx-2 mb-4 p-4 bg-white/10 rounded-xl border border-white/20 shadow-inner">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200 opacity-70 mb-2">Unidade Logada</p>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                    <School size={16} className="text-emerald-100" />
                  </div>
                  <p className="text-sm font-black text-white leading-tight uppercase tracking-tight truncate" title={currentUser.name}>
                    {currentUser.name}
                  </p>
                </div>
                {currentUser.schoolInep && (
                  <p className="text-[10px] text-emerald-200/60 mt-2 font-mono ml-8">INEP: {currentUser.schoolInep}</p>
                )}
              </div>
              <SectionHeader title="Gestão da Unidade" />
              {escolaMenuItems.map(item => <MenuButtonMobile key={item.id} item={item} />)}
            </>
          ) : isPsychology ? (
            <>
              {(() => {
                const groups = getPsychologyMenuGroups();
                return (
                  <>
                    <SectionHeader title="Principal" />
                    {groups.principal.map(item => <MenuButtonMobile key={item.label} item={item} />)}

                    <SectionHeader title="Atendimento Clínico" />
                    {groups.atendimentoClinico.map(item => <MenuButtonMobile key={item.label} item={item} />)}

                    <SectionHeader title="Documentos" />
                    {groups.documentos.map(item => <MenuButtonMobile key={item.label} item={item} />)}

                    <SectionHeader title="Gestão & Dados" />
                    {groups.gestaoDados.map(item => <MenuButtonMobile key={item.label} item={item} />)}

                    <SectionHeader title="Segurança" />
                    {groups.rodape.map(item => <MenuButtonMobile key={item.label} item={item} />)}
                  </>
                );
              })()}
            </>
          ) : (
            <>
              <SectionHeader title="Navegação Principal" />
              {standardMenuItems.map(item => <MenuButtonMobile key={item.id} item={item} />)}

              {standardSpecialtyItems.length > 0 && (
                <>
                  <div className="my-6 border-t border-white/10 mx-2"></div>
                  <SectionHeader title="Módulos Clínicos" icon={Sparkles} />
                  {standardSpecialtyItems.map(item => <MenuButtonMobile key={item.id} item={item} />)}
                  {currentUser.role === 'SPECIALIST' && getStandardExtraItems().length > 0 && (
                    <>
                      <div className="my-4 border-t border-white/10 mx-2"></div>
                      <SectionHeader title="Módulos Clínicos" />
                      {getStandardExtraItems().map(item => <MenuCardButton key={item.id} item={item} />)}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </nav>

        <div className="p-4 mt-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(30,0,60,0.55)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 4px 16px rgba(0,0,0,0.50), 0 1px 4px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            
            {/* Avatar + Nome + Role */}
            <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.28)' }}>
                {currentUser.photoUrl ? (
                  <img src={currentUser.photoUrl} alt={`Foto de ${currentUser.name}`} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-black">{currentUser.username.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-white text-[13px] font-bold truncate leading-tight">{currentUser.name.split(' ')[0]}</p>
                <p className="text-[9px] uppercase font-semibold tracking-wider mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.50)' }}>{getRoleLabel()}</p>
              </div>
            </div>

            {/* Versão + Data em destaque */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Tag size={11} style={{ color: 'rgba(255,255,255,0.55)' }} />
                  <span className="text-[10px] font-bold tracking-wide" style={{ color: 'rgba(255,255,255,0.80)' }}>{APP_VERSION.version}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CalendarDays size={11} style={{ color: 'rgba(255,255,255,0.45)' }} />
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{APP_VERSION.display.split('•')[1]?.trim() || APP_VERSION.display}</span>
                </div>
              </div>
            </div>

            {/* Botões Sobre + Sair */}
            <div className="grid grid-cols-2 gap-0">
              <button
                onClick={() => { onNavigate('about'); setIsMobileMenuOpen(false); }}
                className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-white/60 hover:text-white hover:bg-white/10 py-3 transition-all border-r border-white/8"
              >
                <Info size={13} /> Sobre
              </button>
              <button
                onClick={onLogout}
                className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-red-300/70 hover:text-red-200 hover:bg-red-500/15 py-3 transition-all"
              >
                <LogOut size={13} /> Sair
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 ${isCollapsed ? "lg:ml-[72px]" : "lg:ml-72"} p-4 lg:p-8 mt-16 lg:mt-0 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto animate-slideUp">
          {children}
        </div>
      </main>
    </div>
  );
};
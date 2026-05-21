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

  const activePage = location.pathname.split('/').pop() || 'dashboard';

  const onNavigate = (page: string) => {
    if (page.startsWith('http')) {
      window.open(page, '_blank');
      return;
    }
    navigate(`/app/${page}`);
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

  // --- MENU BUILDERS ---

  // 1. Definição dos Módulos Clínicos (Comum a Admin e Especialistas)
  const getAllClinicalItems = () => [
    { id: 'psychology', label: 'Psicologia', icon: <Brain size={20} />, specialty: Specialty.PSYCHOLOGY },
    { id: 'social-service-hub', label: 'Serviço Social', icon: <Search size={20} />, specialty: Specialty.SOCIAL_WORK },
    { id: 'psychopedagogy', label: 'Psicopedagogia', icon: <Shapes size={20} />, specialty: Specialty.PSYCHOPEDAGOGY },
    { id: 'occupational-therapy', label: 'Terapia Ocupacional', icon: <Puzzle size={20} />, specialty: Specialty.OCCUPATIONAL_THERAPY },
    { id: 'speech-therapy', label: 'Fonoaudiologia', icon: <Mic size={20} />, specialty: Specialty.SPEECH_THERAPY },
    { id: 'physiotherapy', label: 'Fisioterapia', icon: <Activity size={20} />, specialty: Specialty.PHYSIOTHERAPY },
    { id: 'nutrition', label: 'Nutrição', icon: <Apple size={20} />, specialty: Specialty.NUTRITION },
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
      // Relatórios Gerenciais (apenas para Secretaria de Educação e ADMIN)
      ...(currentUser.role === 'EDUCATION_SECRETARY' || currentUser.role === 'ADMIN'
        ? [{
            id: 'relatorios-gerenciais',
            label: 'Relatórios Gerenciais',
            icon: <BarChart2 size={20} />,
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
            icon: <Calendar size={20} />,
          }]
        : []),
      {
        id: 'list',
        label: 'Alunos / Prontuários',
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
    } else if (currentUser.role === 'SPECIALIST') {
      // Especialistas veem o menu de documentos padrão
      items.push({ id: 'documents', label: 'Documentos', icon: <FileText size={20} /> });
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

  const isItemActive = (itemId: string) => {
    if (activePage === itemId) return true;
    // Highlight list menu when editing/registering
    if (itemId === 'list' && (activePage === 'register' || activePage === 'profile' || activePage === 'edit-student')) return true;
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

  const MenuButton: React.FC<{ item: any }> = ({ item }) => (
    <button
      onClick={() => onNavigate(item.id)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${isItemActive(item.id) || (item.specialty && activePage.startsWith(item.id)) ? theme.active : theme.hover
        }`}
    >
      {(isItemActive(item.id) || (item.specialty && activePage.startsWith(item.id))) && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full"></div>}
      <span className={`relative z-10 ${(isItemActive(item.id) || (item.specialty && activePage.startsWith(item.id))) ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-200`}>
        {item.icon}
      </span>
      <span className="relative z-10">{item.label}</span>
    </button>
  );

  const MenuButtonMobile: React.FC<{ item: any }> = ({ item }) => (
    <button
      onClick={() => {
        onNavigate(item.id);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${isItemActive(item.id) || (item.specialty && activePage.startsWith(item.id)) ? theme.active : theme.hover
        }`}
    >
      {(isItemActive(item.id) || (item.specialty && activePage.startsWith(item.id))) && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full"></div>}
      <span className={`relative z-10 ${(isItemActive(item.id) || (item.specialty && activePage.startsWith(item.id))) ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-200`}>
        {item.icon}
      </span>
      <span className="relative z-10">{item.label}</span>
    </button>
  );

  const SectionHeader = ({ title, icon: Icon }: { title: string, icon?: any }) => (
    <div className="px-4 mt-6 mb-2 flex items-center gap-2 opacity-50">
      {Icon && <Icon size={12} />}
      <p className="text-[10px] font-bold uppercase tracking-widest">{title}</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#EEF2F8] font-sans selection:bg-primary-500 selection:text-white">
      {/* Sidebar - Desktop */}
      <aside className={`hidden lg:flex flex-col w-72 fixed h-full z-30 transition-all duration-300 shadow-2xl ${theme.sidebar}`} style={(theme as any).sidebarStyle || {}}>
        <div className="p-8 flex items-center gap-3">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-lg flex items-center justify-center">
            <LogoComponent />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold tracking-tight text-white leading-none">Brotar</h2>
              <span className="bg-white/15 text-white/70 font-mono text-[9px] px-1.5 py-0.5 rounded-md tracking-wider border border-white/20 leading-none">
                {APP_VERSION.version}
              </span>
            </div>
            <p className={`text-xs font-medium opacity-70 mt-1 ${theme.accent}`}>Gestão Premium</p>
          </div>
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
          ) : (
            <>
              <SectionHeader title="Navegação Principal" />
              {standardMenuItems.map(item => <MenuButton key={item.id} item={item} />)}

              {standardSpecialtyItems.length > 0 && (
                <>
                  <div className="my-6 border-t border-white/10 mx-2"></div>
                  <SectionHeader title="Módulos Clínicos" icon={Sparkles} />
                  {standardSpecialtyItems.map(item => <MenuButton key={item.id} item={item} />)}
                </>
              )}
            </>
          )}

        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-sm font-bold shadow-inner">
                {currentUser.photoUrl ? (
                  <img src={currentUser.photoUrl} alt={`Foto de perfil de ${currentUser.name}`} className="w-full h-full rounded-full object-cover" />
                ) : (
                  currentUser.username.substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{currentUser.name.split(' ')[0]}</p>
                <p className="text-[10px] uppercase font-semibold opacity-70 truncate bg-white/10 px-1.5 py-0.5 rounded inline-block mt-0.5">
                  {getRoleLabel()}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate('about')}
                className="flex items-center justify-center gap-2 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 py-2 rounded-lg transition-all border border-white/5 hover:border-white/20"
                title="Sobre o Sistema"
              >
                <Info size={14} /> Sobre
              </button>
              <button
                onClick={onLogout}
                className="flex items-center justify-center gap-2 text-xs font-semibold text-red-200 hover:text-white hover:bg-red-500/20 py-2 rounded-lg transition-all border border-transparent hover:border-red-500/30"
                title="Encerrar Sessão"
              >
                <LogOut size={14} /> Sair
              </button>
            </div>
            <p className="text-[10px] text-center text-white/30 font-mono mt-4 tracking-wider uppercase">
              {APP_VERSION.display}
            </p>
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
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 flex items-center justify-center">
              <LogoComponent />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight text-white leading-none">Brotar</h2>
                <span className="bg-white/15 text-white/70 font-mono text-[9px] px-1.5 py-0.5 rounded-md border border-white/20 leading-none">
                  {APP_VERSION.version}
                </span>
              </div>
              <p className={`text-[10px] font-medium opacity-70 mt-1 ${theme.accent}`}>Gestão Premium</p>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
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
          ) : (
            <>
              <SectionHeader title="Navegação Principal" />
              {standardMenuItems.map(item => <MenuButtonMobile key={item.id} item={item} />)}

              {standardSpecialtyItems.length > 0 && (
                <>
                  <div className="my-6 border-t border-white/10 mx-2"></div>
                  <SectionHeader title="Módulos Clínicos" icon={Sparkles} />
                  {standardSpecialtyItems.map(item => <MenuButtonMobile key={item.id} item={item} />)}
                </>
              )}
            </>
          )}
        </nav>

        <div className="p-4 mt-auto border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-sm font-bold shadow-inner">
                {currentUser.photoUrl ? (
                  <img src={currentUser.photoUrl} alt={`Foto de perfil de ${currentUser.name}`} className="w-full h-full rounded-full object-cover" />
                ) : (
                  currentUser.username.substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{currentUser.name.split(' ')[0]}</p>
                <p className="text-[10px] uppercase font-semibold opacity-70 truncate bg-white/10 px-1.5 py-0.5 rounded inline-block mt-0.5">
                  {getRoleLabel()}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { onNavigate('about'); setIsMobileMenuOpen(false); }}
                className="flex items-center justify-center gap-2 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 py-2 rounded-lg transition-all border border-white/5 hover:border-white/20"
                title="Sobre o Sistema"
              >
                <Info size={14} /> Sobre
              </button>
              <button
                onClick={onLogout}
                className="flex items-center justify-center gap-2 text-xs font-semibold text-red-200 hover:text-white hover:bg-red-500/20 py-2 rounded-lg transition-all border border-transparent hover:border-red-500/30"
                title="Encerrar Sessão"
              >
                <LogOut size={14} /> Sair
              </button>
            </div>
            <p className="text-[10px] text-center text-white/30 font-mono mt-4 tracking-wider uppercase">
              {APP_VERSION.display}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-72 p-4 lg:p-8 mt-16 lg:mt-0 transition-all duration-300">
        <div className="max-w-7xl mx-auto animate-slideUp">
          {children}
        </div>
      </main>
    </div>
  );
};
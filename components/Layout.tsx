import React from 'react';
import { LayoutDashboard, Users, HeartPulse, ShieldCheck, LogOut, Brain, Shapes, Heart, Activity, Mic, Puzzle, School, UserCog, Calendar, Database, Menu, X, Sparkles, Settings, Info, Palette, FileText, Scroll, Apple } from 'lucide-react';
import { User, Specialty, SystemSettings, hasPermission } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  currentUser: User;
  onLogout: () => void;
  systemSettings?: SystemSettings; // Optional to not break tests if not passed immediately
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate, currentUser, onLogout, systemSettings }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Defaults if not provided
  const systemName = systemSettings?.systemName || 'Brotar';
  const LogoComponent = systemSettings?.logoUrl ?
    () => <img src={systemSettings.logoUrl} alt="Logo" className="w-7 h-7 object-contain" /> :
    () => <HeartPulse size={28} className="text-white" />;

  // --- Theme Logic Based on Role/Specialty ---
  const getThemeClasses = () => {
    if (currentUser.role === 'ADMIN') return {
      sidebar: 'bg-gradient-to-b from-slate-900 to-slate-800 text-white',
      active: 'bg-white/10 text-white shadow-glow',
      hover: 'hover:bg-white/5 text-slate-300',
      accent: 'text-slate-100'
    };
    if (currentUser.role === 'EDUCATION_SECRETARY') {
      return currentUser.scope === 'COCAL'
        ? { sidebar: 'bg-gradient-to-b from-orange-900 to-orange-800 text-white', active: 'bg-white/20 text-white', hover: 'hover:bg-white/10 text-orange-100', accent: 'text-orange-50' }
        : { sidebar: 'bg-gradient-to-b from-blue-900 to-blue-800 text-white', active: 'bg-white/20 text-white', hover: 'hover:bg-white/10 text-blue-100', accent: 'text-blue-50' };
    }

    switch (currentUser.specialty) {
      case Specialty.PSYCHOLOGY: return { sidebar: 'bg-gradient-to-br from-purple-900 to-indigo-900 text-white', active: 'bg-white/20 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]', hover: 'hover:bg-white/10 text-purple-100', accent: 'text-purple-200' };
      case Specialty.SPEECH_THERAPY: return { sidebar: 'bg-gradient-to-br from-cyan-900 to-blue-900 text-white', active: 'bg-white/20 text-white shadow-[0_0_15px_rgba(34,211,238,0.5)]', hover: 'hover:bg-white/10 text-cyan-100', accent: 'text-cyan-200' };
      case Specialty.OCCUPATIONAL_THERAPY: return { sidebar: 'bg-gradient-to-br from-indigo-900 to-violet-900 text-white', active: 'bg-white/20 text-white shadow-[0_0_15px_rgba(129,140,248,0.5)]', hover: 'hover:bg-white/10 text-indigo-100', accent: 'text-indigo-200' };
      case Specialty.PSYCHOPEDAGOGY: return { sidebar: 'bg-gradient-to-br from-pink-900 to-rose-900 text-white', active: 'bg-white/20 text-white shadow-[0_0_15px_rgba(244,114,182,0.5)]', hover: 'hover:bg-white/10 text-pink-100', accent: 'text-pink-200' };
      case Specialty.NUTRITION: return { sidebar: 'bg-gradient-to-br from-green-900 to-emerald-900 text-white', active: 'bg-white/20 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]', hover: 'hover:bg-white/10 text-green-100', accent: 'text-green-200' };
      default: return { sidebar: 'bg-gradient-to-b from-primary-900 to-primary-800 text-white', active: 'bg-white/20 text-white', hover: 'hover:bg-white/10 text-primary-100', accent: 'text-primary-100' };
    }
  };

  const theme = getThemeClasses();

  // --- MENU BUILDERS ---

  // 1. Definição dos Módulos Clínicos (Comum a Admin e Especialistas)
  const getAllClinicalItems = () => [
    { id: 'psychology', label: 'Psicologia', icon: <Brain size={20} />, specialty: Specialty.PSYCHOLOGY },
    { id: 'social-service', label: 'Serviço Social', icon: <Heart size={20} />, specialty: Specialty.SOCIAL_WORK },
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
    ];

    // Grupo 2: Administração
    const administration = [
      { id: 'support-professionals', label: 'Profissionais de Apoio', icon: <UserCog size={20} /> },
      { id: 'admin', label: 'Gestão de Usuários', icon: <ShieldCheck size={20} /> },
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

  // 3. Menu Linear para OUTROS PERFIS (Legacy logic preserved)
  const getStandardMenuItems = () => {
    const items = [
      { id: 'dashboard', label: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
      { id: 'scheduling', label: 'Central de Agendamentos', icon: <Calendar size={20} /> },
      { id: 'list', label: 'Alunos / Prontuários', icon: <Users size={20} /> },
    ];

    // Apenas Admin, Especialistas e Secretárias veem o menu de documentos
    if (currentUser.role !== 'ASSISTANT') {
      items.push({ id: 'documents', label: 'Documentos', icon: <FileText size={20} /> });
    }

    if (currentUser.role === 'EDUCATION_SECRETARY') {
      items.push(
        { id: 'schools', label: 'Unidades Escolares', icon: <School size={20} /> },
        { id: 'support-professionals', label: 'Profissionais de Apoio', icon: <UserCog size={20} /> }
      );
    }

    // Adiciona o item Sobre

    return items;
  };

  const getStandardSpecialtyItems = () => {
    const all = getAllClinicalItems();
    if (currentUser.role === 'SPECIALIST' && currentUser.specialty) {
      return all.filter(item => item.specialty === currentUser.specialty);
    }
    return [];
  };

  // Decide which menu structure to use
  const isAdmin = currentUser.role === 'ADMIN';
  const adminMenuGroups = isAdmin ? getAdminMenuGroups() : null;
  const standardMenuItems = !isAdmin ? getStandardMenuItems() : [];
  const standardSpecialtyItems = !isAdmin ? getStandardSpecialtyItems() : [];

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
        return currentUser.scope === 'COCAL' ? 'Sec. Distrital Cocal' : 'Secretaria Sede';
      case 'SPECIALIST': return currentUser.specialty || 'Especialista';
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

  const SectionHeader = ({ title, icon: Icon }: { title: string, icon?: any }) => (
    <div className="px-4 mt-6 mb-2 flex items-center gap-2 opacity-50">
      {Icon && <Icon size={12} />}
      <p className="text-[10px] font-bold uppercase tracking-widest">{title}</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans selection:bg-primary-500 selection:text-white">
      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col w-72 fixed h-full z-30 transition-all duration-300 shadow-2xl ${theme.sidebar}`}>
        <div className="p-8 flex items-center gap-3">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-lg flex items-center justify-center">
            <LogoComponent />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-white leading-none">{systemName}</h2>
            <p className={`text-xs font-medium opacity-70 mt-1 ${theme.accent}`}>Gestão Premium</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar pb-6">

          {/* RENDERIZAÇÃO DO MENU - MODO ADMIN OU MODO PADRÃO */}
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
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 flex justify-between items-center px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg text-white shadow-lg flex items-center justify-center">
            <LogoComponent />
          </div>
          <span className="font-extrabold text-slate-800 text-lg tracking-tight">{systemName}</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600 p-2 rounded-lg hover:bg-slate-100">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Mobile Sidebar - Simplificado para não complicar a lógica de grupos no mobile, mantendo lista linear */}
      <aside className={`md:hidden fixed inset-y-0 left-0 w-64 ${theme.sidebar} z-50 transform transition-transform duration-300 shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <h2 className="text-xl font-bold text-white mb-6">Menu</h2>
          <nav className="space-y-2 flex-1 overflow-y-auto">
            {/* Fallback para menu mobile simples: renderiza tudo linearmente */}
            {isAdmin && adminMenuGroups ? (
              <>
                {adminMenuGroups.main.map(item => (
                  <button key={item.id} onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left hover:bg-white/10 text-white/90">
                    {item.icon} {item.label}
                  </button>
                ))}
                <div className="border-t border-white/10 my-2"></div>
                {adminMenuGroups.administration.map(item => (
                  <button key={item.id} onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left hover:bg-white/10 text-white/90">
                    {item.icon} {item.label}
                  </button>
                ))}
                <div className="border-t border-white/10 my-2"></div>
                {adminMenuGroups.settings.map(item => (
                  <button key={item.id} onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left hover:bg-white/10 text-white/90">
                    {item.icon} {item.label}
                  </button>
                ))}
              </>
            ) : (
              standardMenuItems.map((item) => (
                <button key={item.id} onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left hover:bg-white/10 text-white/90">
                  {item.icon} {item.label}
                </button>
              ))
            )}
          </nav>
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { onNavigate('about'); setIsMobileMenuOpen(false); }}
                className="flex items-center justify-center gap-2 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 py-2.5 rounded-lg transition-all border border-white/5"
              >
                <Info size={14} /> Sobre
              </button>
              <button
                onClick={onLogout}
                className="flex items-center justify-center gap-2 text-xs font-semibold text-red-200 hover:text-white hover:bg-red-500/20 py-2.5 rounded-lg transition-all border border-transparent hover:border-red-500/30"
              >
                <LogOut size={14} /> Sair
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 p-4 md:p-8 mt-16 md:mt-0 transition-all duration-300">
        <div className="max-w-7xl mx-auto animate-slideUp">
          {children}
        </div>
      </main>
    </div>
  );
};
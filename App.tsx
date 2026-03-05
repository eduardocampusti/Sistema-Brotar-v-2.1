
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { SupabaseService } from './services/SupabaseService';
import { supabase } from './services/supabaseClient';
import { useToast } from './contexts/ToastContext';
import { Student, User, Specialty, SystemSettings, hasPermission, Appointment, AuditAction } from './types';
import { Loader2 } from 'lucide-react';
import { NotificationProvider } from './contexts/NotificationContext';
import { NotificationBell } from './components/NotificationBell';
import { MessagingSystem } from './components/MessagingSystem';

// --- Lazy Loaded Components ---
const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const RegistrationForm = React.lazy(() => import('./components/RegistrationForm').then(m => ({ default: m.RegistrationForm })));
const PatientList = React.lazy(() => import('./components/PatientList').then(m => ({ default: m.PatientList })));
const PatientProfile = React.lazy(() => import('./components/PatientProfile').then(m => ({ default: m.PatientProfile })));
const UserManagement = React.lazy(() => import('./components/UserManagement').then(m => ({ default: m.UserManagement })));
const SchoolManagement = React.lazy(() => import('./components/SchoolManagement').then(m => ({ default: m.SchoolManagement })));
const SupportProfessionalManagement = React.lazy(() => import('./components/SupportProfessionalManagement').then(m => ({ default: m.SupportProfessionalManagement })));
const Agenda = React.lazy(() => import('./components/Agenda').then(m => ({ default: m.Agenda })));
const BackupSystem = React.lazy(() => import('./components/BackupSystem').then(m => ({ default: m.BackupSystem })));
const SystemSettingsPanel = React.lazy(() => import('./components/SystemSettings').then(m => ({ default: m.SystemSettingsPanel })));
const PapelTimbradoConfigPanel = React.lazy(() => import('./components/PapelTimbradoConfig').then(m => ({ default: m.PapelTimbradoConfigPanel })));
const AboutSystem = React.lazy(() => import('./components/AboutSystem').then(m => ({ default: m.AboutSystem })));
const DocumentGenerator = React.lazy(() => import('./components/DocumentGenerator').then(m => ({ default: m.DocumentGenerator })));
const SchedulingCenter = React.lazy(() => import('./components/SchedulingCenter').then(m => ({ default: m.SchedulingCenter })));
const AppointmentForm = React.lazy(() => import('./components/AppointmentForm').then(m => ({ default: m.AppointmentForm })));
const DocumentVault = React.lazy(() => import('./components/DocumentVault').then(m => ({ default: m.DocumentVault })));
const MyAccess = React.lazy(() => import('./components/MyAccess').then(m => ({ default: m.MyAccess })));
const ChangePassword = React.lazy(() => import('./components/ChangePassword').then(m => ({ default: m.ChangePassword })));
const AuditLogs = React.lazy(() => import('./components/AuditLogs').then(m => ({ default: m.AuditLogs })));

// --- Lazy Clinical Pages (Named Exports) ---
const PsychologyDashboardPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.PsychologyDashboardPage })));
const PsychologySessionFormPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.PsychologySessionFormPage })));
const PsychopedagogyDashboardPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.PsychopedagogyDashboardPage })));
const PsychopedagogySessionFormPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.PsychopedagogySessionFormPage })));
const SocialServiceDashboardPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.SocialServiceDashboardPage })));
const SocialServiceOperationalPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.SocialServiceOperationalPage })));
const SocialServiceInterviewHub = React.lazy(() => import('./components/SocialServiceInterviewHub'));
const SocialServiceHubComp = React.lazy(() => import('./components/SocialServiceHub').then(m => ({ default: m.SocialServiceHub })));
const SocialWorkerAgenda = React.lazy(() => import('./components/SocialWorkerAgenda').then(m => ({ default: m.SocialWorkerAgenda })));
const SocialWorkerDashboard = React.lazy(() => import('./components/SocialWorkerDashboard').then(m => ({ default: m.SocialWorkerDashboard })));
const SocialServiceSessionFormPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.SocialServiceSessionFormPage })));
const OccupationalTherapyDashboardPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.OccupationalTherapyDashboardPage })));
const OccupationalTherapySessionFormPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.OccupationalTherapySessionFormPage })));
const SpeechTherapyDashboardPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.SpeechTherapyDashboardPage })));
const SpeechTherapySessionFormPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.SpeechTherapySessionFormPage })));
const PhysiotherapyDashboardPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.PhysiotherapyDashboardPage })));
const PhysiotherapySessionFormPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.PhysiotherapySessionFormPage })));
const NutritionDashboardPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.NutritionDashboardPage })));
const NutritionSessionFormPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.NutritionSessionFormPage })));

// --- Lazy Role Dashboards (Named Exports) ---
const AdminDashboard = React.lazy(() => import('./components/RoleDashboards').then(m => ({ default: m.AdminDashboard })));
const EducationSecretaryDashboard = React.lazy(() => import('./components/RoleDashboards').then(m => ({ default: m.EducationSecretaryDashboard })));
const PsychologyDashboard = React.lazy(() => import('./components/PsychologyDashboard').then(m => ({ default: m.PsychologyDashboard })));
const PsychopedagogyDashboard = React.lazy(() => import('./components/RoleDashboards').then(m => ({ default: m.PsychopedagogyDashboard })));
const SocialServiceDashboard = React.lazy(() => import('./components/RoleDashboards').then(m => ({ default: m.SocialServiceDashboard })));
const OccupationalTherapyDashboard = React.lazy(() => import('./components/RoleDashboards').then(m => ({ default: m.OccupationalTherapyDashboard })));
const SpeechTherapyDashboard = React.lazy(() => import('./components/RoleDashboards').then(m => ({ default: m.SpeechTherapyDashboard })));
const NutritionDashboard = React.lazy(() => import('./components/RoleDashboards').then(m => ({ default: m.NutritionDashboard })));
const SchoolDashboard = React.lazy(() => import('./components/RoleDashboards').then(m => ({ default: m.SchoolDashboard })));
const SecretaryDashboard = React.lazy(() => import('./components/RoleDashboards').then(m => ({ default: m.SecretaryDashboard })));

// Loading Component
const PageLoading = () => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400 animate-pulse">
    <Loader2 size={48} className="animate-spin mb-4 text-primary-500" />
    <p className="font-medium text-sm">Carregando módulo...</p>
  </div>
);

// Função auxiliar SEGURA para converter HEX para RGB
const hexToRgb = (hex: string) => {
  if (!hex || typeof hex !== 'string') return '20, 184, 166'; // Fallback Teal 500

  // Remove o # se existir
  const cleanHex = hex.replace('#', '').trim();

  // Suporte para Hex de 3 dígitos (ex: #FFF)
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `${r}, ${g}, ${b}`;
  }

  // Suporte para Hex de 6 dígitos (ex: #FFFFFF)
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  return '20, 184, 166'; // Fallback seguro
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>(() => {
    // Tenta restaurar a página do Hash ou LocalStorage
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== 'dashboard') return hash;
    return localStorage.getItem('brotar_current_page') || 'dashboard';
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [rescheduleData, setRescheduleData] = useState<Appointment | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    return hash.includes('type=recovery') || search.includes('recovery=true');
  });
  const [showLogin, setShowLogin] = useState(() => {
    // Persiste o estado do modal de login
    const storedShowLogin = localStorage.getItem('brotar_show_login') === 'true';
    return storedShowLogin ||
      new URLSearchParams(window.location.search).get('login') === 'true' ||
      new URLSearchParams(window.location.search).get('recovery') === 'true' ||
      window.location.hash.includes('type=recovery');
  });

  // Trava de idempotência para evitar loop de processamento da mesma sessão
  const processedSessionId = React.useRef<string | null>(null);

  const { error: showError } = useToast();

  // Initialize settings directly from storage
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => SupabaseService.getSystemSettingsSync());

  // Function to apply theme variables to DOM safely
  const applyTheme = () => {
    try {
      const activeTheme = SupabaseService.getActiveTheme();
      const root = document.documentElement;

      if (!activeTheme || !activeTheme.colors) {
        console.warn("Tema inválido detectado, aplicando fallback.");
        return;
      }

      // Set dynamic colors
      Object.entries(activeTheme.colors).forEach(([shade, value]) => {
        if (value) {
          root.style.setProperty(`--color-primary-${shade}`, value as string);
        }
      });

      // Set RGB for opacity utilities using the '500' shade as base
      // Garante que existe a cor 500, senão usa uma cor segura
      const primary500 = activeTheme.colors[500] || '#14b8a6';
      root.style.setProperty('--color-primary-500-rgb', hexToRgb(primary500));

    } catch (error) {
      console.error("Erro crítico ao aplicar tema:", error);
      // Não revertemos drasticamente para evitar loop, apenas logamos. 
      // O CSS padrão (fallback) do index.html segurará o layout.
    }
  };

  // useLayoutEffect runs synchronously before the browser paints
  // This ensures colors are correct BEFORE the user sees the page
  useLayoutEffect(() => {
    applyTheme();
    if (systemSettings.systemName) {
      document.title = `${systemSettings.systemName} - Gestão Multidisciplinar`;
    }
  }, [systemSettings]);

  // Sincroniza estado de navegação com URL e LocalStorage
  useEffect(() => {
    if (user && !user.mustChangePassword) {
      if (window.location.hash !== `#${currentPage}`) {
        window.location.hash = currentPage;
      }
      localStorage.setItem('brotar_current_page', currentPage);
    }
  }, [currentPage, user]);

  // Sincroniza showLogin com LocalStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem('brotar_show_login', showLogin.toString());
    } else {
      localStorage.removeItem('brotar_show_login');
    }
  }, [showLogin, user]);

  // Listener para o botão voltar do navegador (PopState)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash !== currentPage) {
        setCurrentPage(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentPage]);

  // Load students and handle auth session
  useEffect(() => {
    // Limpeza de parâmetros de URL para evitar loops de renderização
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'true') {
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }

    // Timeout de segurança GLOBAL: se após 5 segundos ainda estiver carregando, libera a tela
    const safetyTimeout = setTimeout(() => {
      setIsAuthLoading(prev => {
        if (prev) console.warn('[App] Destravando loading via Timeout de Segurança.');
        return false;
      });
    }, 5000);

    async function loadInitialData() {
      try {
        console.log('[App] 1. Carregando configurações...');
        const settings = await SupabaseService.getSystemSettings();
        setSystemSettings(settings);

        console.log('[App] 2. Verificando sessão inicial...');
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const sessionId = session.access_token || session.user.id;
          console.log('[App] 2a. Sessão detectada no boot. Carregando perfil...', sessionId.substring(0, 10));

          if (isRecoveryMode) {
            console.log('[App] Modo Recuperação Detectado.');
            const userData = await SupabaseService.getUserProfile(session.user.id);
            if (userData) {
              processedSessionId.current = sessionId;
              setUser({ ...userData, mustChangePassword: true });
              setCurrentPage('my-access');
              setShowLogin(false);
            }
          } else {
            // Carregamento proativo do perfil para evitar LandingPage frame
            const userData = await SupabaseService.getUserProfile(session.user.id);
            if (userData) {
              console.log('[App] Perfil carregado com sucesso no boot.');
              processedSessionId.current = sessionId;
              setUser(userData);
            }
          }
        }
      } catch (err) {
        console.error('[App] Erro crítico no boot:', err);
      } finally {
        setIsAuthLoading(false);
      }
    }

    loadInitialData();

    // Listener prioritário de Auth
    const { data: { subscription } } = SupabaseService.onAuthStateChange(async (event, session) => {
      const sessionId = session?.access_token || session?.user?.id || 'no-session';

      console.log(`[App-Auth] Evento: ${event} | SessionID: ${sessionId.substring(0, 10)}...`);

      // Se já processamos esta sessão no loadInitialData e o evento é inicial/redundante, ignora
      if (processedSessionId.current === sessionId && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        console.log('[App-Auth] Ignorando evento já processado ou inicial:', event);
        setIsAuthLoading(false);
        return;
      }

      try {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
          if (session?.user) {
            const userData = await SupabaseService.getUserProfile(session.user.id);
            const finalUser = userData || {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || 'Usuário',
              username: session.user.email?.split('@')[0] || 'user',
              role: (session.user.user_metadata?.role as any) || 'SPECIALIST',
              isActive: true
            };
            setUser({ ...finalUser, mustChangePassword: true });
            setShowLogin(false);
            setIsAuthLoading(false);
            setCurrentPage('my-access');
          }
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (session?.user && !isRecoveryMode) {
            const userData = await SupabaseService.getUserProfile(session.user.id);
            if (userData) {
              processedSessionId.current = sessionId;
              setUser(userData);
            }
          }
          setIsAuthLoading(false);
        } else if (event === 'SIGNED_OUT') {
          processedSessionId.current = null;
          setUser(null);
          setCurrentPage('dashboard');
          setIsRecoveryMode(false);
          setIsAuthLoading(false);
          localStorage.removeItem('brotar_current_page');
          localStorage.removeItem('brotar_show_login');
          window.location.hash = '';
        }
      } catch (err) {
        console.error('[App-Auth] Erro no listener:', err);
      } finally {
        setIsAuthLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Carrega dados pesados apenas após o login
  useEffect(() => {
    if (user && !user.mustChangePassword) {
      console.log('[App] Carregando dados iniciais para:', user.email);
      SupabaseService.getStudents()
        .then(data => {
          console.log('[App] Alunos carregados:', data.length);
          setStudents(data);
        })
        .catch(err => {
          if (err.name === 'AbortError') {
            console.warn('[App] Busca de alunos abortada (comum no Hot Reload ou boot rápido).');
          } else {
            console.error('[App] Erro ao carregar alunos:', err);
          }
        });
    }
  }, [user?.id]); // Usar ID para estabilidade

  const refreshData = async () => {
    setStudents(await SupabaseService.getStudents());
  };

  const handleNavigate = (page: string, keepSelection = false) => {
    setCurrentPage(page);
    if (page !== 'profile' && page !== 'edit-student' && !keepSelection) {
      setSelectedStudent(null);
    }
  };

  const handleRegisterSuccess = async () => {
    await refreshData();
    if (currentPage === 'edit-student' && selectedStudent) {
      const updatedStudents = await SupabaseService.getStudents();
      const updated = updatedStudents.find(s => s.id === selectedStudent.id);
      if (updated) setSelectedStudent(updated);
      setCurrentPage('profile');
    } else {
      setCurrentPage('list');
    }
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setCurrentPage('profile');
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setCurrentPage('edit-student');
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      await SupabaseService.deleteStudent(id);
      await refreshData();
    } catch (err) {
      showError('Erro ao excluir aluno. Verifique se existem dependências.', 'Erro na exclusão');
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.removeItem('brotar_show_login');
    // Mantém a página atual se ela existir, senão vai para dashboard
    const storedPage = localStorage.getItem('brotar_current_page');
    if (!storedPage || storedPage === 'dashboard') {
      setCurrentPage('dashboard');
    }
  };

  const handleLogout = async () => {
    if (user) {
      await SupabaseService.logAction(user, AuditAction.LOGOUT, 'SISTEMA', 'Logout realizado');
    }
    await supabase.auth.signOut();
    setUser(null);
    setCurrentPage('dashboard');
    localStorage.removeItem('brotar_current_page');
    localStorage.removeItem('brotar_show_login');
    window.location.hash = '';
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white space-y-4">
        <Loader2 size={48} className="animate-spin text-primary-600" />
        <p className="text-slate-500 font-medium">
          {isRecoveryMode ? 'Validando link de recuperação...' : 'Iniciando sistema...'}
        </p>
      </div>
    );
  }

  // Debug Panel (Hidden by default, shown if ?debug=true)
  const isDebug = window.location.search.includes('debug=true');

  if (!user) {
    // Se o usuário já acessou o sistema antes ou está tentando entrar, mostra o login direto
    const shouldShowLogin = showLogin || localStorage.getItem('brotar_visited') === 'true';

    if (shouldShowLogin) {
      return (
        <>
          <Login
            onLogin={(u) => {
              localStorage.setItem('brotar_visited', 'true');
              handleLogin(u);
            }}
            onBack={() => {
              localStorage.removeItem('brotar_visited');
              setShowLogin(false);
            }}
            systemSettings={systemSettings}
          />
          {isDebug && <div className="fixed bottom-0 right-0 p-2 bg-black/80 text-white text-[10px] z-[9999]">No User | Debug Mode Active</div>}
        </>
      );
    }
    return <LandingPage onAccessSystem={() => {
      localStorage.setItem('brotar_visited', 'true');
      setShowLogin(true);
    }} systemSettings={systemSettings} />;
  }

  // Bloqueio para troca obrigatória de senha
  if (user.mustChangePassword) {
    return (
      <React.Suspense fallback={<PageLoading />}>
        <ChangePassword
          userId={user.id}
          onSuccess={async () => {
            // Recarrega o usuário do banco para atualizar o flag localmente
            const updatedUser = await SupabaseService.authenticate(user.username, '');
            // Nota: O authenticate sem senha deve funcionar se a sessão persistir no SupabaseService, 
            // mas como acabamos de trocar a senha, o ideal é atualizar o estado local manualmente.
            setUser({ ...user, mustChangePassword: false });
          }}
        />
      </React.Suspense>
    );
  }

  const renderContent = () => {
    const isEscola = user.role === 'ESCOLA';

    // Guard global: páginas bloqueadas para ESCOLA
    const ESCOLA_BLOCKED_PAGES = [
      'scheduling', 'new-appointment', 'agenda',
      'documents', 'vault', 'my-access',
      'admin', 'settings', 'letterhead-config', 'backup', 'about', 'audit-logs',
      'psychology', 'psychopedagogy', 'social-service-hub',
      'social-service-list', 'social-interview',
      'occupational-therapy', 'speech-therapy',
      'physiotherapy', 'nutrition',
    ];
    const isBlockedForEscola = isEscola && (
      ESCOLA_BLOCKED_PAGES.includes(currentPage) ||
      currentPage.includes('/new-session')
    );
    if (isBlockedForEscola) {
      return <PatientList students={students} onSelectStudent={handleSelectStudent} onDelete={handleDeleteStudent} onRegister={() => setCurrentPage('register')} onEdit={handleEditStudent} currentUser={user} />;
    }

    // Rotas de perfil e edição
    if (currentPage === 'profile' && selectedStudent) {
      return <PatientProfile student={selectedStudent} onBack={() => setCurrentPage('list')} currentUser={user} onEdit={handleEditStudent} onNavigate={handleNavigate} />;
    }
    if (currentPage === 'edit-student' && selectedStudent) {
      return <RegistrationForm initialData={selectedStudent} onSuccess={handleRegisterSuccess} onCancel={() => setCurrentPage('profile')} currentUser={user} />;
    }

    // Rotas Clínicas
    const commonProps = {
      onNavigateNew: () => { }, // Dashboards main page usually doesn't use this directly or overrides it
      currentUser: user,
      preSelectedStudent: selectedStudent || undefined
    };

    if (currentPage === 'psychology') return <PsychologyDashboard onNavigate={handleNavigate} {...commonProps} />;
    if (currentPage === 'psychopedagogy') return <PsychopedagogyDashboardPage onNavigateNew={() => handleNavigate('psychopedagogy/new-session')} {...commonProps} />;
    if (currentPage === 'social-service-hub') return <SocialServiceHubComp {...commonProps} onNavigate={handleNavigate} />;
    if (currentPage === 'social-service-list') return <SocialServiceOperationalPage onNavigateNew={() => handleNavigate('social-service/new-session')} {...commonProps} allStudents={students} />;
    if (currentPage === 'social-interview') return <SocialServiceInterviewHub {...commonProps} allStudents={students} onNavigate={handleNavigate} />;
    if (currentPage === 'occupational-therapy') return <OccupationalTherapyDashboardPage onNavigateNew={() => handleNavigate('occupational-therapy/new-session')} {...commonProps} />;
    if (currentPage === 'speech-therapy') return <SpeechTherapyDashboardPage onNavigateNew={() => handleNavigate('speech-therapy/new-session')} {...commonProps} />;
    if (currentPage === 'physiotherapy') return <PhysiotherapyDashboardPage onNavigateNew={() => handleNavigate('physiotherapy/new-session')} {...commonProps} />;
    if (currentPage === 'nutrition') return <NutritionDashboardPage onNavigateNew={() => handleNavigate('nutrition/new-session')} {...commonProps} />;

    // Rotas de Nova Sessão
    if (currentPage.includes('/new-session')) {
      const basePage = currentPage.split('/')[0];
      const props = { onCancel: () => handleNavigate(basePage), currentUser: user, preSelectedStudent: selectedStudent || undefined };
      if (basePage === 'psychology') return <PsychologySessionFormPage {...props} />;
      if (basePage === 'psychopedagogy') return <PsychopedagogySessionFormPage {...props} />;
      if (basePage === 'social-service') return <SocialServiceSessionFormPage {...props} />;
      if (basePage === 'occupational-therapy') return <OccupationalTherapySessionFormPage {...props} />;
      if (basePage === 'speech-therapy') return <SpeechTherapySessionFormPage {...props} />;
      if (basePage === 'physiotherapy') return <PhysiotherapySessionFormPage {...props} />;
      if (basePage === 'nutrition') return <NutritionSessionFormPage {...props} />;
    }

    switch (currentPage) {
      case 'dashboard':
        if (user.role === 'ADMIN') return <AdminDashboard students={students} currentUser={user} onNavigate={handleNavigate} />;
        if (user.role === 'EDUCATION_SECRETARY') return <EducationSecretaryDashboard students={students} currentUser={user} onNavigate={handleNavigate} />;
        if (user.role === 'SECRETARIA_SEDE' || user.role === 'SECRETARIA_COCAL') return <SecretaryDashboard students={students} currentUser={user} onNavigate={handleNavigate} />;
        if (user.role === 'ESCOLA') return <SchoolDashboard students={students} currentUser={user} onNavigate={handleNavigate} />;
        if (user.role === 'SPECIALIST') {
          switch (user.specialty) {
            case Specialty.PSYCHOLOGY: return <PsychologyDashboard onNavigate={handleNavigate} {...commonProps} />;
            case Specialty.SOCIAL_WORK: return <SocialWorkerDashboard
              students={students}
              currentUser={user}
              onNavigate={handleNavigate}
              onNavigateNew={() => handleNavigate('social-service-hub')}
              onNavigateToCase={(id) => {
                const student = students.find(s => s.id === id);
                if (student) {
                  setSelectedStudent(student);
                  // Lógica inteligente de redirecionamento baseada no estado do caso
                  if (student.clinical?.social_interview?.status === 'Pendente' || student.clinical?.social_interview?.status === 'Em Análise') {
                    handleNavigate('social-interview', true);
                  } else if (student.clinical?.social_data?.formData?.statusCaso) {
                    handleNavigate('social-service-list', true); // Vai para ficha de acompanhamento
                  } else {
                    handleNavigate('profile');
                  }
                }
              }}
            />;
            case Specialty.PSYCHOPEDAGOGY: return <PsychopedagogyDashboard students={students} currentUser={user} onNavigate={handleNavigate} />;
            case Specialty.OCCUPATIONAL_THERAPY: return <OccupationalTherapyDashboardPage onNavigateNew={() => handleNavigate('occupational-therapy/new-session')} {...commonProps} />;
            case Specialty.SPEECH_THERAPY: return <SpeechTherapyDashboardPage onNavigateNew={() => handleNavigate('speech-therapy/new-session')} {...commonProps} />;
            case Specialty.PHYSIOTHERAPY: return <PhysiotherapyDashboardPage onNavigateNew={() => handleNavigate('physiotherapy/new-session')} {...commonProps} />;
            case Specialty.NUTRITION: return <NutritionDashboardPage onNavigateNew={() => handleNavigate('nutrition/new-session')} {...commonProps} />;
            default: return <Dashboard students={students} currentUser={user} />;
          }
        }
        return <Dashboard students={students} currentUser={user} />;

      case 'scheduling':
        if (user.specialty === Specialty.SOCIAL_WORK) {
          return (
            <SocialWorkerAgenda
              currentUser={user}
              students={students}
              onNavigate={handleNavigate}
              onNavigateToCase={(id) => {
                setSelectedStudent(students.find(s => s.id === id) || null);
                handleNavigate('profile');
              }}
            />
          );
        }
        return (
          <SchedulingCenter
            students={students}
            currentUser={user}
            onNavigate={handleNavigate}
            onReschedule={(apt) => {
              setRescheduleData(apt);
              setCurrentPage('new-appointment');
            }}
          />
        );
      case 'new-appointment': return (
        <AppointmentForm
          students={students}
          currentUser={user}
          initialData={rescheduleData}
          onCancel={() => {
            setRescheduleData(null);
            handleNavigate('scheduling');
          }}
          onSuccess={() => {
            setRescheduleData(null);
            handleNavigate('scheduling');
          }}
        />
      );
      case 'agenda': return <Agenda students={students} currentUser={user} onNavigate={handleNavigate} />;
      case 'list': return <PatientList students={students} onSelectStudent={handleSelectStudent} onDelete={handleDeleteStudent} onRegister={() => setCurrentPage('register')} onEdit={handleEditStudent} currentUser={user} />;
      case 'register': return <RegistrationForm onSuccess={handleRegisterSuccess} onCancel={() => setCurrentPage('list')} currentUser={user} />;
      case 'admin': return user.role === 'ADMIN' ? <UserManagement /> : <Dashboard students={students} />;
      case 'audit-logs': return user.role === 'ADMIN' ? <AuditLogs currentUser={user} /> : <Dashboard students={students} />;

      // ROTAS PROTEGIDAS POR PERMISSÃO
      case 'backup':
        return hasPermission(user, 'can_access_security_data')
          ? <BackupSystem currentUser={user} />
          : <Dashboard students={students} currentUser={user} />;

      case 'settings': return user.role === 'ADMIN' ? <SystemSettingsPanel /> : <Dashboard students={students} />;
      case 'letterhead-config': return user.role === 'ADMIN' ? <PapelTimbradoConfigPanel /> : <Dashboard students={students} />;
      case 'schools': return (user.role === 'ADMIN' || user.role === 'EDUCATION_SECRETARY' || user.role === 'ASSISTANT' || user.role === 'SECRETARIA_SEDE' || user.role === 'SECRETARIA_COCAL') ? <SchoolManagement /> : <Dashboard students={students} />;
      case 'support-professionals': return (user.role === 'ADMIN' || user.role === 'EDUCATION_SECRETARY' || user.role === 'ASSISTANT' || user.role === 'SECRETARIA_SEDE' || user.role === 'SECRETARIA_COCAL' || user.role === 'ESCOLA') ? <SupportProfessionalManagement currentUser={user} /> : <Dashboard students={students} />;
      case 'about': return <AboutSystem />;
      case 'documents': return <DocumentGenerator currentUser={user} />;
      case 'vault': return <DocumentVault
        currentUser={user}
        students={students}
        onModelSelect={(model) => {
          handleNavigate('documents');
        }}
      />;
      case 'my-access': return <MyAccess currentUser={user} />;
      default: return <Dashboard students={students} currentUser={user} />;
    }
  };

  return (
    <NotificationProvider currentUser={user}>
      <Layout
        activePage={currentPage}
        onNavigate={handleNavigate}
        currentUser={user}
        onLogout={handleLogout}
        systemSettings={systemSettings}
      >
        {/* Header Controls */}
        {user && (
          <div className="flex justify-end items-center gap-3 mb-6 px-4 md:px-0">
            <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
              <MessagingSystem currentUser={user} />
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
              <NotificationBell currentUser={user} />
            </div>
          </div>
        )}

        <React.Suspense fallback={<PageLoading />}>
          {renderContent()}
        </React.Suspense>
      </Layout>
    </NotificationProvider>
  );
}

export default App;
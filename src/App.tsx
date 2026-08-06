import React, { useState, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { SupabaseService } from '../services/SupabaseService';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../contexts/ToastContext';
import { AuthProvider } from '../contexts/AuthContext';
import { Student, User, Specialty, SystemSettings, Appointment, School, canViewSystemAuditLogs } from '../types';
import { Loader2 } from 'lucide-react';
import { NotificationProvider } from '../contexts/NotificationContext';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { BirthdayEffect } from '../components/BirthdayEffect';

// --- Layouts and Pages (inside src/) ---
import { PublicLayout } from './layouts/PublicLayout';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { LandingPage } from './pages/landing/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';

// --- Lazy Loaded Components (Authenticated Area - in root components/) ---
const Dashboard = React.lazy(() => import('../components/Dashboard').then(m => ({ default: m.Dashboard })));
const RelatorioAnualTCM = React.lazy(() => import('../components/RelatorioAnualTCM').then(m => ({ default: m.RelatorioAnualTCM })));
const RegistrationForm = React.lazy(() => import('../components/RegistrationForm').then(m => ({ default: m.RegistrationForm })));
const PatientList = React.lazy(() => import('../components/PatientList').then(m => ({ default: m.PatientList })));
const PatientProfile = React.lazy(() => import('../components/PatientProfile').then(m => ({ default: m.PatientProfile })));
const UserManagement = React.lazy(() => import('../components/UserManagement').then(m => ({ default: m.UserManagement })));
const SchoolManagement = React.lazy(() => import('../components/SchoolManagement').then(m => ({ default: m.SchoolManagement })));
const SupportProfessionalManagement = React.lazy(() => import('../components/SupportProfessionalManagement').then(m => ({ default: m.SupportProfessionalManagement })));
const Agenda = React.lazy(() => import('../components/Agenda').then(m => ({ default: m.Agenda })));
const BackupSystem = React.lazy(() => import('../components/BackupSystem').then(m => ({ default: m.BackupSystem })));
const SystemSettingsPanel = React.lazy(() => import('../components/SystemSettings').then(m => ({ default: m.SystemSettingsPanel })));
const PapelTimbradoConfigPanel = React.lazy(() => import('../components/PapelTimbradoConfig').then(m => ({ default: m.PapelTimbradoConfigPanel })));
const AboutSystem = React.lazy(() => import('../components/AboutSystem').then(m => ({ default: m.AboutSystem })));
const DocumentGenerator = React.lazy(() => import('../components/DocumentGenerator').then(m => ({ default: m.DocumentGenerator })));
const SchedulingRoutePage = React.lazy(() => import('../components/SchedulingRoutePage').then(m => ({ default: m.SchedulingRoutePage })));
const AppointmentForm = React.lazy(() => import('../components/AppointmentForm').then(m => ({ default: m.AppointmentForm })));
const DocumentVault = React.lazy(() => import('../components/DocumentVault').then(m => ({ default: m.DocumentVault })));
const MyAccess = React.lazy(() => import('../components/MyAccess').then(m => ({ default: m.MyAccess })));
const AuditLogs = React.lazy(() => import('../components/AuditLogs').then(m => ({ default: m.AuditLogs })));
const ChangePassword = React.lazy(() => import('../components/ChangePassword').then(m => ({ default: m.ChangePassword })));
const RelatoriosGerenciais = React.lazy(() => import('../components/RelatoriosGerenciais').then(m => ({ default: m.RelatoriosGerenciais })));
const RelatorioTEAPage = React.lazy(() => import('./pages/RelatorioTEAPage'));
const LancamentoRetroativoPage = React.lazy(() => 
  import('./pages/LancamentoRetroativoPage').then(m => ({ 
    default: m.LancamentoRetroativoPage 
  }))
);

// Clinical Pages
const PsychologyDashboardPage = React.lazy(() => import('../components/ClinicalPages').then(m => ({ default: m.PsychologyDashboardPage })));
const PsychologySessionFormPage = React.lazy(() => import('../components/ClinicalPages').then(m => ({ default: m.PsychologySessionFormPage })));
const PsychopedagogyDashboardPage = React.lazy(() => import('../components/ClinicalPages').then(m => ({ default: m.PsychopedagogyDashboardPage })));
const PsychopedagogySessionFormPage = React.lazy(() => import('../components/ClinicalPages').then(m => ({ default: m.PsychopedagogySessionFormPage })));
const SocialServiceOperationalPage = React.lazy(() => import('../components/ClinicalPages').then(m => ({ default: m.SocialServiceOperationalPage })));
const SocialServiceInterviewHub = React.lazy(() => import('../components/SocialServiceInterviewHub'));
const SocialServiceHubComp = React.lazy(() => import('../components/SocialServiceHub').then(m => ({ default: m.SocialServiceHub })));
const SocialWorkerDashboard = React.lazy(() => import('../components/SocialWorkerDashboard').then(m => ({ default: m.SocialWorkerDashboard })));
const SocialServiceSessionFormPage = React.lazy(() => import('../components/ClinicalPages').then(m => ({ default: m.SocialServiceSessionFormPage })));
const OccupationalTherapyDashboardPage = React.lazy(() => import('../components/ClinicalPages').then(m => ({ default: m.OccupationalTherapyDashboardPage })));
const OccupationalTherapySessionFormPage = React.lazy(() => import('../components/ClinicalPages').then(m => ({ default: m.OccupationalTherapySessionFormPage })));
const SpeechTherapyDashboardPage = React.lazy(() => import('../components/ClinicalPages').then(m => ({ default: m.SpeechTherapyDashboardPage })));
const SpeechTherapySessionFormPage = React.lazy(() => import('../components/ClinicalPages').then(m => ({ default: m.SpeechTherapySessionFormPage })));
const PhysiotherapyDashboardPage = React.lazy(() => import('../components/ClinicalPages').then(m => ({ default: m.PhysiotherapyDashboardPage })));
const PhysiotherapySessionFormPage = React.lazy(() => import('../components/ClinicalPages').then(m => ({ default: m.PhysiotherapySessionFormPage })));
const NutritionClinicalPortal = React.lazy(() => import('../components/NutritionClinicalPortal'));
// Módulo Nutricionista Escolar — Fase 3
const NutricaoDashboard = React.lazy(() => import('../components/NutritionDashboard'));
const NutricaoAvaliacao = React.lazy(() => import('../components/NutritionAssessment'));
const NutricaoNAE = React.lazy(() => import('../components/NutritionNAEModule'));
const NutricaoEAN = React.lazy(() => import('../components/NutritionEANModule'));
const NutricaoRelatorios = React.lazy(() => import('../components/NutritionReportsModule'));

// Dashboards
const AdminDashboard = React.lazy(() => import('../components/RoleDashboards').then(m => ({ default: m.AdminDashboard })));
const SchoolDashboard = React.lazy(() => import('../components/RoleDashboards').then(m => ({ default: m.SchoolDashboard })));
const EducationSecretaryDashboard = React.lazy(() => import('../components/RoleDashboards').then(m => ({ default: m.EducationSecretaryDashboard })));
const PsychologyDashboard = React.lazy(() => import('../components/PsychologyDashboard').then(m => ({ default: m.PsychologyDashboard })));
const PsychopedagogyDashboard = React.lazy(() => import('../components/RoleDashboards').then(m => ({ default: m.PsychopedagogyDashboard })));
const AssistantDashboard = React.lazy(() => import('../components/RoleDashboards').then(m => ({ default: m.AssistantDashboard })));
const SecretariaSedeDashboard = React.lazy(() => import('../components/RoleDashboards').then(m => ({ default: m.SecretariaSedeDashboard })));
const SecretariaCocalDashboard = React.lazy(() => import('../components/RoleDashboards').then(m => ({ default: m.SecretariaCocalDashboard })));
const NutritionSpecialistDashboard = React.lazy(() => import('../components/RoleDashboards').then(m => ({ default: m.NutritionDashboard })));


// Loading Component
const PageLoading = () => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400 animate-pulse">
    <Loader2 size={48} className="animate-spin mb-4 text-primary-500" />
    <p className="font-medium text-sm">Carregando módulo...</p>
  </div>
);

// Aux Function
const hexToRgb = (hex: string) => {
  if (!hex || typeof hex !== 'string') return '20, 184, 166';
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `${r}, ${g}, ${b}`;
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return '20, 184, 166';
};

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [rescheduleData, setRescheduleData] = useState<Appointment | null>(null);
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => SupabaseService.getSystemSettingsSync());

  const applyTheme = () => {
    try {
      const activeTheme = SupabaseService.getActiveTheme();
      const root = document.documentElement;
      if (!activeTheme || !activeTheme.colors) return;
      Object.entries(activeTheme.colors).forEach(([shade, value]) => {
        if (value) root.style.setProperty(`--color-primary-${shade}`, value as string);
      });
      const primary500 = activeTheme.colors[500] || '#14b8a6';
      root.style.setProperty('--color-primary-500-rgb', hexToRgb(primary500));
    } catch (error) {
      console.error("Erro crítico ao aplicar tema:", error);
    }
  };

  useLayoutEffect(() => {
    applyTheme();
    if (systemSettings.systemName) {
      document.title = `${systemSettings.systemName} - Gestão Multidisciplinar`;
    }
  }, [systemSettings]);

  useEffect(() => {
    let cancelled = false;

    async function bootSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (session?.user) {
          try {
            const currentProfile = await SupabaseService.getUserProfile(session.user.id);
            if (!cancelled && currentProfile) {
              setUser(currentProfile);
            }
          } catch (e) {
            console.error('[App] Erro ao carregar perfil:', e);
          }
        }
      } catch (err) {
        console.error('[App] Erro ao recuperar sessão:', err);
      } finally {
        if (!cancelled) {
          setIsLoadingSession(false);
        }
      }
    }

    async function loadSecondaryData() {
      try {
        const settings = await SupabaseService.getSystemSettings();
        if (!cancelled) setSystemSettings(settings);

        const schoolsData = await SupabaseService.getSchools();
        if (!cancelled) setSchools(schoolsData);
        // Alunos: não carregar aqui — ver efeito [sessão + user] abaixo.
        // Se getStudents correr antes do login (ex.: /login), a lista ficava vazia para sempre
        // porque este useEffect só executa uma vez (deps []).
      } catch (err) {
        console.error('Erro ao carregar dados iniciais (escolas/config/alunos):', err);
      }
    }

    void bootSession().then(() => {
      if (!cancelled) void loadSecondaryData();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Carrega alunos sempre que existir sessão Supabase (inclui após login sem F5).
  useEffect(() => {
    if (isLoadingSession) return;
    let cancelled = false;

    async function loadStudentsWhenAuthenticated() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if (!cancelled) setStudents([]);
        return;
      }
      try {
        const perfil =
          user ?? (await SupabaseService.getUserProfile(session.user.id));
        if (!perfil) {
          if (!cancelled) setStudents([]);
          return;
        }
        const studentsData = await SupabaseService.getAlunosPorPerfil(
          perfil,
          perfil.id,
          { compactList: true, listScope: 'todos' }
        );
        if (!cancelled) {
          console.log('[DEBUG] Total alunos retornados:', studentsData?.length);
          setStudents(studentsData);
        }
      } catch (err) {
        console.error('[ERRO getStudents]', err);
        if (!cancelled) setStudents([]);
      }
    }

    void loadStudentsWhenAuthenticated();
    return () => {
      cancelled = true;
    };
  }, [isLoadingSession, user?.id]);

  const refreshData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const perfil = await SupabaseService.getUserProfile(session.user.id);
      if (!perfil) return;
      const students = await SupabaseService.getAlunosPorPerfil(perfil, perfil.id, {
        listScope: 'todos',
      });
      console.log('[DEBUG] Total alunos retornados (refresh):', students?.length);
      setStudents(students);
      // Mantém o aluno selecionado alinhado à lista (evita perfil/edição com cópia antiga após salvar).
      setSelectedStudent((prev) => {
        if (!prev?.id) return prev;
        const atualizado = students.find((s) => s.id === prev.id);
        return atualizado ?? prev;
      });
    } catch (err) {
      console.error('[ERRO getStudents]', err);
    }
  };

  const handleNavigate = (page: string, options?: { state?: Record<string, unknown> } | boolean) => {
    // PatientProfile chama onNavigate(rota, true): repassa aluno selecionado ao módulo clínico correto.
    if (options === true && selectedStudent?.id && user?.role === 'SPECIALIST' && user.specialty) {
      const routeForSpec: Partial<Record<Specialty, string>> = {
        [Specialty.PSYCHOPEDAGOGY]: 'psychopedagogy',
        [Specialty.PSYCHOLOGY]: 'psychology',
        [Specialty.SPEECH_THERAPY]: 'speech-therapy',
        [Specialty.OCCUPATIONAL_THERAPY]: 'occupational-therapy',
        [Specialty.PHYSIOTHERAPY]: 'physiotherapy',
        [Specialty.NUTRITION]: 'nutrition',
      };
      const expected = routeForSpec[user.specialty];
      if (expected && page === expected) {
        const openTab = user.specialty === Specialty.PSYCHOPEDAGOGY ? 'anamnesis' : 'sessions';
        if (user.specialty === Specialty.PSYCHOLOGY) {
          navigate(`/app/${page}?patient=${selectedStudent.id}&ficha=sessions`);
          return;
        }
        navigate(`/app/${page}`, { state: { openStudentId: selectedStudent.id, openTab } });
        return;
      }
    }
    if (options && typeof options === 'object' && options.state !== undefined) {
      navigate(`/app/${page}`, { state: options.state });
      return;
    }
    navigate(`/app/${page}`);
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    navigate('/app/dashboard', { replace: true });
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  // Logout automático por inatividade
  const sessionTimeoutModal = useSessionTimeout(user?.role, handleLogout);

  // Helper for Student Selection in Profile
  const handleSelectStudent = async (student: Student) => {
    try {
      setSelectedStudent(student);
      navigate('/app/profile');
    } catch (e) {
      console.error('[App] handleSelectStudent:', e);
      showError('Não foi possível preparar o acesso ao prontuário. Tente novamente.');
    }
  };

  // Verificação de configuração do Supabase (Trava de Segurança)
  if (!SupabaseService.isConfigValid()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-rose-50 p-6 text-center">
        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-rose-900 mb-2">Erro de Configuração</h1>
        <p className="text-rose-700 font-bold text-lg mb-4">Configuração de Banco de Dados ausente no Servidor</p>
        <div className="max-w-md bg-white p-4 rounded-2xl border border-rose-200 shadow-sm text-left">
          <p className="text-sm text-rose-600 leading-relaxed font-medium">
            O sistema não conseguiu localizar as variáveis de ambiente necessárias para conectar ao banco de dados. 
            Verifique as chaves <b>VITE_SUPABASE_URL</b> e <b>VITE_SUPABASE_ANON_KEY</b> no servidor de hospedagem.
          </p>
        </div>
      </div>
    );
  }

  if (user?.mustChangePassword) {
    return (
      <React.Suspense fallback={<PageLoading />}>
        <ChangePassword
          userId={user.id}
          onSuccess={async () => setUser({ ...user, mustChangePassword: false })}
        />
      </React.Suspense>
    );
  }

  return (
    <AuthProvider user={user}>
    <NotificationProvider currentUser={user}>
      {sessionTimeoutModal}
      {user && <BirthdayEffect currentUser={user} students={students} />}
      <Routes>
        {/* Rotas Públicas */}
        <Route element={<PublicLayout><Outlet /></PublicLayout>}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} systemSettings={systemSettings} />} />
        </Route>

        {/* Rotas Privadas */}
        <Route path="/app" element={
          <ProtectedRoute user={user} isLoading={isLoadingSession}>
            <AppLayout user={user!} onLogout={handleLogout} systemSettings={systemSettings} />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={
            <React.Suspense fallback={<PageLoading />}>
              {user?.role === 'ADMIN' && <AdminDashboard students={students} currentUser={user} onNavigate={handleNavigate} />}
              {user?.role === 'ESCOLA' && <SchoolDashboard students={students} currentUser={user} onNavigate={handleNavigate} />}
              {user?.role === 'EDUCATION_SECRETARY' && <EducationSecretaryDashboard students={students} currentUser={user} onNavigate={handleNavigate} />}
              {user?.role === 'SECRETARIA_SEDE' && (
                <SecretariaSedeDashboard students={students} currentUser={user} onNavigate={handleNavigate} />
              )}
              {user?.role === 'SECRETARIA_COCAL' && (
                <SecretariaCocalDashboard students={students} currentUser={user} onNavigate={handleNavigate} />
              )}
              {user?.role === 'ASSISTANT' && (
                <AssistantDashboard
                  students={students}
                  currentUser={user}
                  onNavigate={handleNavigate}
                  onOpenPatient={id => {
                    const st = students.find(s => s.id === id);
                    if (st) handleSelectStudent(st);
                  }}
                />
              )}
              {user?.role === 'SPECIALIST' && user.specialty === Specialty.PSYCHOLOGY && (
                <PsychologyDashboard
                  onNavigate={handleNavigate}
                  currentUser={user}
                  onOpenPatient={(id) => {
                    const st = students.find(s => s.id === id);
                    if (st) handleSelectStudent(st);
                  }}
                />
              )}
              {user?.role === 'SPECIALIST' && user.specialty === Specialty.SOCIAL_WORK && <SocialWorkerDashboard students={students} currentUser={user} onNavigate={handleNavigate} onNavigateNew={() => handleNavigate('social-service-hub')} onNavigateToCase={(id) => handleSelectStudent(students.find(s => s.id === id)!)} />}
              {user?.role === 'SPECIALIST' && user.specialty === Specialty.PSYCHOPEDAGOGY && (
                <PsychopedagogyDashboard
                  students={students}
                  currentUser={user}
                  onNavigate={handleNavigate}
                  onOpenPatient={(id) => {
                    const st = students.find(s => s.id === id);
                    if (st) handleSelectStudent(st);
                  }}
                />
              )}
              {user?.role === 'SPECIALIST' && user.specialty === Specialty.NUTRITION && (
                <NutritionSpecialistDashboard
                  students={students}
                  currentUser={user}
                  onNavigate={handleNavigate}
                  onOpenPatient={(id) => {
                    const st = students.find(s => s.id === id);
                    if (st) handleSelectStudent(st);
                  }}
                />
              )}
              {(!user?.role || (user.role === 'SPECIALIST' && ![Specialty.PSYCHOLOGY, Specialty.SOCIAL_WORK, Specialty.PSYCHOPEDAGOGY, Specialty.NUTRITION].includes(user.specialty!))) && (
                <Dashboard
                  students={students}
                  currentUser={user ?? undefined}
                  onNavigate={user ? handleNavigate : undefined}
                  onOpenPatient={
                    user
                      ? (id) => {
                          const st = students.find(s => s.id === id);
                          if (st) handleSelectStudent(st);
                        }
                      : undefined
                  }
                />
              )}
            </React.Suspense>
          } />

          <Route path="list" element={<React.Suspense fallback={<PageLoading />}><PatientList students={students} schools={schools} onSelectStudent={handleSelectStudent} onRefresh={refreshData} onDelete={refreshData} onRegister={() => handleNavigate('register')} onEdit={(s) => { setSelectedStudent(s); handleNavigate('edit-student'); }} currentUser={user!} /></React.Suspense>} />
          <Route path="register" element={<React.Suspense fallback={<PageLoading />}><RegistrationForm onSuccess={refreshData} onCancel={() => handleNavigate('list')} currentUser={user!} /></React.Suspense>} />
          <Route path="profile" element={<React.Suspense fallback={<PageLoading />}><PatientProfile student={selectedStudent!} onBack={() => handleNavigate('list')} currentUser={user!} onEdit={(s) => { setSelectedStudent(s); handleNavigate('edit-student'); }} onNavigate={handleNavigate} /></React.Suspense>} />
          <Route path="edit-student" element={<React.Suspense fallback={<PageLoading />}><RegistrationForm initialData={selectedStudent!} onSuccess={refreshData} onCancel={() => handleNavigate('profile')} currentUser={user!} /></React.Suspense>} />

          <Route path="psychology" element={<React.Suspense fallback={<PageLoading />}><PsychologyDashboardPage onNavigateNew={() => handleNavigate('psychology/new-session')} currentUser={user!} preSelectedStudent={selectedStudent ?? undefined} /></React.Suspense>} />
          <Route path="psychology/new-session" element={<React.Suspense fallback={<PageLoading />}><PsychologySessionFormPage onCancel={() => handleNavigate('psychology')} currentUser={user!} /></React.Suspense>} />

          {/* Serviço Social */}
          <Route path="social-service-hub" element={<React.Suspense fallback={<PageLoading />}><SocialServiceHubComp currentUser={user!} onNavigate={handleNavigate} /></React.Suspense>} />
          <Route path="social-service-list" element={<React.Suspense fallback={<PageLoading />}><SocialServiceOperationalPage onNavigateNew={() => handleNavigate('social-service/new-session')} currentUser={user!} allStudents={students} /></React.Suspense>} />
          <Route path="social-interview" element={<React.Suspense fallback={<PageLoading />}><SocialServiceInterviewHub currentUser={user!} allStudents={students} onNavigate={handleNavigate} /></React.Suspense>} />
          <Route path="social-service/new-session" element={<React.Suspense fallback={<PageLoading />}><SocialServiceSessionFormPage onCancel={() => handleNavigate('social-service-list')} currentUser={user!} /></React.Suspense>} />

          {/* Outras Especialidades */}
          <Route path="psychopedagogy" element={<React.Suspense fallback={<PageLoading />}><PsychopedagogyDashboardPage onNavigateNew={() => handleNavigate('psychopedagogy/new-session')} onNavigate={handleNavigate} currentUser={user!} /></React.Suspense>} />
          <Route path="psychopedagogy/new-session" element={<React.Suspense fallback={<PageLoading />}><PsychopedagogySessionFormPage onCancel={() => handleNavigate('psychopedagogy')} currentUser={user!} /></React.Suspense>} />

          <Route path="occupational-therapy" element={<React.Suspense fallback={<PageLoading />}><OccupationalTherapyDashboardPage onNavigateNew={() => handleNavigate('occupational-therapy/new-session')} currentUser={user!} /></React.Suspense>} />
          <Route path="occupational-therapy/new-session" element={<React.Suspense fallback={<PageLoading />}><OccupationalTherapySessionFormPage onCancel={() => handleNavigate('occupational-therapy')} currentUser={user!} /></React.Suspense>} />

          <Route path="speech-therapy" element={<React.Suspense fallback={<PageLoading />}><SpeechTherapyDashboardPage onNavigateNew={() => handleNavigate('speech-therapy/new-session')} currentUser={user!} /></React.Suspense>} />
          <Route path="speech-therapy/new-session" element={<React.Suspense fallback={<PageLoading />}><SpeechTherapySessionFormPage onCancel={() => handleNavigate('speech-therapy')} currentUser={user!} /></React.Suspense>} />

          <Route path="physiotherapy" element={<React.Suspense fallback={<PageLoading />}><PhysiotherapyDashboardPage onNavigateNew={() => handleNavigate('physiotherapy/new-session')} currentUser={user!} /></React.Suspense>} />
          <Route path="physiotherapy/new-session" element={<React.Suspense fallback={<PageLoading />}><PhysiotherapySessionFormPage onCancel={() => handleNavigate('physiotherapy')} currentUser={user!} /></React.Suspense>} />

          <Route path="nutrition" element={<React.Suspense fallback={<PageLoading />}><NutritionClinicalPortal currentUser={user!} onNavigate={handleNavigate} /></React.Suspense>} />
          {/* ── Módulo Nutricionista Escolar — Fase 3 ── */}
          <Route path="nutricion/dashboard" element={<React.Suspense fallback={<PageLoading />}><NutricaoDashboard /></React.Suspense>} />
          <Route path="nutricion/avaliacao" element={<React.Suspense fallback={<PageLoading />}><NutricaoAvaliacao /></React.Suspense>} />
          <Route path="nutricion/avaliacao/:id" element={<React.Suspense fallback={<PageLoading />}><NutricaoAvaliacao /></React.Suspense>} />
          <Route path="nutricion/nae" element={<React.Suspense fallback={<PageLoading />}><NutricaoNAE /></React.Suspense>} />
          <Route path="nutricion/ean" element={<React.Suspense fallback={<PageLoading />}><NutricaoEAN /></React.Suspense>} />
          <Route path="nutricion/relatorios" element={<React.Suspense fallback={<PageLoading />}><NutricaoRelatorios /></React.Suspense>} />
          <Route path="retroativo" element={
            <React.Suspense fallback={<PageLoading />}>
              <LancamentoRetroativoPage 
                currentUser={user!} 
                onNavigate={handleNavigate} 
              />
            </React.Suspense>
          } />

          <Route path="scheduling" element={<React.Suspense fallback={<PageLoading />}>
            <SchedulingRoutePage
              students={students}
              onNavigate={handleNavigate}
              onReschedule={(apt) => { setRescheduleData(apt); handleNavigate('new-appointment'); }}
              onSelectStudent={handleSelectStudent}
            />
          </React.Suspense>} />

          <Route path="relatorios-gerenciais" element={<React.Suspense fallback={<PageLoading />}><RelatoriosGerenciais currentUser={user!} students={students} /></React.Suspense>} />
          <Route path="relatorio-tea" element={<React.Suspense fallback={<PageLoading />}><RelatorioTEAPage currentUser={user!} restricted={user?.role === 'SPECIALIST'} /></React.Suspense>} />


          <Route
            path="new-appointment"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <AppointmentForm
                  students={students}
                  currentUser={user!}
                  initialData={rescheduleData}
                  onCancel={() => handleNavigate('scheduling')}
                  onSuccess={(payload) =>
                    payload?.date
                      ? handleNavigate('scheduling', { state: { focusAppointmentDate: payload.date } })
                      : handleNavigate('scheduling')
                  }
                />
              </React.Suspense>
            }
          />

          <Route path="documents" element={<React.Suspense fallback={<PageLoading />}><DocumentGenerator currentUser={user!} /></React.Suspense>} />
          <Route path="relatorio-anual-tcm" element={<React.Suspense fallback={<PageLoading />}><RelatorioAnualTCM currentUser={user!} /></React.Suspense>} />
          <Route path="vault" element={<React.Suspense fallback={<PageLoading />}><DocumentVault currentUser={user!} students={students} onModelSelect={() => handleNavigate('documents')} onUpdate={refreshData} /></React.Suspense>} />
          <Route path="schools" element={<React.Suspense fallback={<PageLoading />}><SchoolManagement /></React.Suspense>} />
          <Route path="reports" element={<Navigate to="/app/support-professionals?tab=relatorios" replace />} />
          <Route path="support-professionals/new" element={<React.Suspense fallback={<PageLoading />}><SupportProfessionalManagement currentUser={user!} /></React.Suspense>} />
          <Route path="support-professionals/edit/:profId" element={<React.Suspense fallback={<PageLoading />}><SupportProfessionalManagement currentUser={user!} /></React.Suspense>} />
          <Route path="support-professionals" element={<React.Suspense fallback={<PageLoading />}><SupportProfessionalManagement currentUser={user!} /></React.Suspense>} />
          <Route
            path="admin"
            element={
              user?.role === 'ADMIN' ? (
                <React.Suspense fallback={<PageLoading />}><UserManagement /></React.Suspense>
              ) : (
                // Guarda de interface; a autorização efetiva permanece nas policies RLS.
                <Navigate to="/app" replace />
              )
            }
          />
          <Route path="settings" element={<React.Suspense fallback={<PageLoading />}><SystemSettingsPanel /></React.Suspense>} />
          <Route path="letterhead-config" element={<React.Suspense fallback={<PageLoading />}><PapelTimbradoConfigPanel /></React.Suspense>} />
          <Route path="backup" element={<React.Suspense fallback={<PageLoading />}><BackupSystem currentUser={user!} /></React.Suspense>} />
          <Route path="about" element={<React.Suspense fallback={<PageLoading />}><AboutSystem /></React.Suspense>} />
          <Route path="my-access" element={<React.Suspense fallback={<PageLoading />}><MyAccess currentUser={user!} /></React.Suspense>} />
          <Route
            path="audit-logs"
            element={
              user && canViewSystemAuditLogs(user) ? (
                <React.Suspense fallback={<PageLoading />}>
                  <AuditLogs currentUser={user} />
                </React.Suspense>
              ) : (
                <Navigate to="/app" replace />
              )
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </NotificationProvider>
    </AuthProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

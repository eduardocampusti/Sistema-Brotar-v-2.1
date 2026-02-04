

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { SupabaseService } from './services/SupabaseService';
import { useToast } from './contexts/ToastContext';
import { Student, User, Specialty, SystemSettings, hasPermission, Appointment } from './types';
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

// --- Lazy Clinical Pages (Named Exports) ---
const PsychologyDashboardPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.PsychologyDashboardPage })));
const PsychologySessionFormPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.PsychologySessionFormPage })));
const PsychopedagogyDashboardPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.PsychopedagogyDashboardPage })));
const PsychopedagogySessionFormPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.PsychopedagogySessionFormPage })));
const SocialServiceDashboardPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.SocialServiceDashboardPage })));
const SocialServiceOperationalPage = React.lazy(() => import('./components/ClinicalPages').then(m => ({ default: m.SocialServiceOperationalPage })));
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
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [rescheduleData, setRescheduleData] = useState<Appointment | null>(null);
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

  // Load students on mount
  useEffect(() => {
    async function loadData() {
      // Carrega configurações primeiro para evitar flash de conteúdo
      const settings = await SupabaseService.getSystemSettings();
      setSystemSettings(settings);

      const data = await SupabaseService.getStudents();
      setStudents(data);
    }
    loadData();
  }, []);

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
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('dashboard');
  };

  if (!user) {
    return <Login onLogin={handleLogin} systemSettings={systemSettings} />;
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
    if (currentPage === 'social-service') return <SocialServiceOperationalPage onNavigateNew={() => handleNavigate('social-service/new-session')} {...commonProps} allStudents={students} />;
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
        if (user.role === 'EDUCATION_SECRETARY' || user.role === 'SECRETARIA_SEDE' || user.role === 'SECRETARIA_COCAL') return <EducationSecretaryDashboard students={students} currentUser={user} onNavigate={handleNavigate} />;
        if (user.role === 'SPECIALIST') {
          switch (user.specialty) {
            case Specialty.PSYCHOLOGY: return <PsychologyDashboard onNavigate={handleNavigate} {...commonProps} />;
            case Specialty.SOCIAL_WORK: return <SocialServiceDashboardPage
              onNavigateNew={() => handleNavigate('social-service/new-session')}
              onNavigateToCase={(id) => {
                const student = students.find(s => s.id === id);
                if (student) {
                  setSelectedStudent(student);
                  handleNavigate('social-service/new-session');
                }
              }}
              {...commonProps}
              allStudents={students}
            />;
            case Specialty.PSYCHOPEDAGOGY: return <PsychopedagogyDashboard students={students} currentUser={user} onNavigate={handleNavigate} />;
            case Specialty.OCCUPATIONAL_THERAPY: return <OccupationalTherapyDashboardPage onNavigateNew={() => handleNavigate('occupational-therapy/new-session')} {...commonProps} />;
            case Specialty.SPEECH_THERAPY: return <SpeechTherapyDashboardPage onNavigateNew={() => handleNavigate('speech-therapy/new-session')} {...commonProps} />;
            case Specialty.PHYSIOTHERAPY: return <PhysiotherapyDashboardPage onNavigateNew={() => handleNavigate('physiotherapy/new-session')} {...commonProps} />;
            case Specialty.NUTRITION: return <NutritionDashboardPage onNavigateNew={() => handleNavigate('nutrition/new-session')} {...commonProps} />;
            default: return <Dashboard students={students} />;
          }
        }
        return <Dashboard students={students} />;

      case 'scheduling': return (
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

      // ROTAS PROTEGIDAS POR PERMISSÃO
      case 'backup':
        return hasPermission(user, 'can_access_security_data')
          ? <BackupSystem currentUser={user} />
          : <Dashboard students={students} />; // Redireciona para dashboard se não tiver permissão

      case 'settings': return user.role === 'ADMIN' ? <SystemSettingsPanel /> : <Dashboard students={students} />;
      case 'letterhead-config': return user.role === 'ADMIN' ? <PapelTimbradoConfigPanel /> : <Dashboard students={students} />;
      case 'schools': return (user.role === 'ADMIN' || user.role === 'EDUCATION_SECRETARY' || user.role === 'ASSISTANT' || user.role === 'SECRETARIA_SEDE' || user.role === 'SECRETARIA_COCAL') ? <SchoolManagement /> : <Dashboard students={students} />;
      case 'support-professionals': return (user.role === 'ADMIN' || user.role === 'EDUCATION_SECRETARY' || user.role === 'ASSISTANT' || user.role === 'SECRETARIA_SEDE' || user.role === 'SECRETARIA_COCAL') ? <SupportProfessionalManagement /> : <Dashboard students={students} />;
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
      default: return <Dashboard students={students} />;
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


import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { RegistrationForm } from './components/RegistrationForm';
import { PatientList } from './components/PatientList';
import { PatientProfile } from './components/PatientProfile';
import { UserManagement } from './components/UserManagement';
import { SchoolManagement } from './components/SchoolManagement';
import { SupportProfessionalManagement } from './components/SupportProfessionalManagement';
import { Agenda } from './components/Agenda';
import { BackupSystem } from './components/BackupSystem';
import { SystemSettingsPanel } from './components/SystemSettings';
import { PapelTimbradoConfigPanel } from './components/PapelTimbradoConfig';
import { AboutSystem } from './components/AboutSystem';
import { DocumentGenerator } from './components/DocumentGenerator'; // New Import
import { SupabaseService } from './services/SupabaseService';
import { useToast } from './contexts/ToastContext';
import { Student, User, Specialty, SystemSettings, hasPermission } from './types';
import {
  PsychologyDashboardPage, PsychologySessionFormPage,
  PsychopedagogyDashboardPage, PsychopedagogySessionFormPage,
  SocialServiceDashboardPage, SocialServiceSessionFormPage,
  OccupationalTherapyDashboardPage, OccupationalTherapySessionFormPage,
  SpeechTherapyDashboardPage, SpeechTherapySessionFormPage,
  PhysiotherapyDashboardPage, PhysiotherapySessionFormPage,
  NutritionDashboardPage, NutritionSessionFormPage
} from './components/ClinicalPages';
import {
  AdminDashboard,
  EducationSecretaryDashboard,
  PsychologyDashboard,
  SocialServiceDashboard,
  OccupationalTherapyDashboard,
  PsychopedagogyDashboard,
  SpeechTherapyDashboard
} from './components/RoleDashboards';

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

  const renderContent = () => {
    // Rotas de perfil e edição
    if (currentPage === 'profile' && selectedStudent) {
      return <PatientProfile student={selectedStudent} onBack={() => setCurrentPage('list')} currentUser={user} onEdit={handleEditStudent} onNavigate={handleNavigate} />;
    }
    if (currentPage === 'edit-student' && selectedStudent) {
      return <RegistrationForm initialData={selectedStudent} onSuccess={handleRegisterSuccess} onCancel={() => setCurrentPage('profile')} />;
    }

    // Rotas Clínicas
    const commonProps = {
      onNavigateNew: () => { }, // Dashboards main page usually doesn't use this directly or overrides it
      currentUser: user,
      preSelectedStudent: selectedStudent || undefined
    };

    if (currentPage === 'psychology') return <PsychologyDashboardPage onNavigateNew={() => handleNavigate('psychology/new-session')} {...commonProps} />;
    if (currentPage === 'psychopedagogy') return <PsychopedagogyDashboardPage onNavigateNew={() => handleNavigate('psychopedagogy/new-session')} {...commonProps} />;
    if (currentPage === 'social-service') return <SocialServiceDashboardPage onNavigateNew={() => handleNavigate('social-service/new-session')} {...commonProps} />;
    if (currentPage === 'occupational-therapy') return <OccupationalTherapyDashboardPage onNavigateNew={() => handleNavigate('occupational-therapy/new-session')} {...commonProps} />;
    if (currentPage === 'speech-therapy') return <SpeechTherapyDashboardPage onNavigateNew={() => handleNavigate('speech-therapy/new-session')} {...commonProps} />;
    if (currentPage === 'physiotherapy') return <PhysiotherapyDashboardPage onNavigateNew={() => handleNavigate('physiotherapy/new-session')} {...commonProps} />;
    if (currentPage === 'nutrition') return <NutritionDashboardPage onNavigateNew={() => handleNavigate('nutrition/new-session')} {...commonProps} />;

    // Rotas de Nova Sessão
    if (currentPage.includes('/new-session')) {
      const basePage = currentPage.split('/')[0];
      const props = { onCancel: () => handleNavigate(basePage), currentUser: user };
      if (basePage === 'psychology') return <PsychologySessionFormPage {...props} />;
      if (basePage === 'psychopedagogy') return <PsychopedagogySessionFormPage {...props} />;
      if (basePage === 'social-service') return <SocialServiceSessionFormPage {...props} />;
      if (basePage === 'occupational-therapy') return <OccupationalTherapySessionFormPage {...props} />;
      if (basePage === 'speech-therapy') return <SpeechTherapySessionFormPage {...props} />;
      if (basePage === 'physiotherapy') return <PhysiotherapySessionFormPage {...props} />;
    }

    switch (currentPage) {
      case 'dashboard':
        if (user.role === 'ADMIN') return <AdminDashboard students={students} currentUser={user} onNavigate={handleNavigate} />;
        if (user.role === 'EDUCATION_SECRETARY') return <EducationSecretaryDashboard students={students} currentUser={user} onNavigate={handleNavigate} />;
        if (user.role === 'SPECIALIST') {
          switch (user.specialty) {
            case Specialty.PSYCHOLOGY: return <PsychologyDashboard students={students} currentUser={user} onNavigate={handleNavigate} />;
            case Specialty.SOCIAL_WORK: return <SocialServiceDashboard students={students} currentUser={user} onNavigate={handleNavigate} />;
            case Specialty.PSYCHOPEDAGOGY: return <PsychopedagogyDashboard students={students} currentUser={user} onNavigate={handleNavigate} />;
            case Specialty.OCCUPATIONAL_THERAPY: return <OccupationalTherapyDashboard students={students} currentUser={user} onNavigate={handleNavigate} />;
            case Specialty.SPEECH_THERAPY: return <SpeechTherapyDashboard students={students} currentUser={user} onNavigate={handleNavigate} />;
            default: return <Dashboard students={students} />;
          }
        }
        return <Dashboard students={students} />;

      case 'agenda': return <Agenda students={students} currentUser={user} onNavigate={handleNavigate} />;
      case 'list': return <PatientList students={students} onSelectStudent={handleSelectStudent} onDelete={handleDeleteStudent} onRegister={() => setCurrentPage('register')} onEdit={handleEditStudent} currentUser={user} />;
      case 'register': return <RegistrationForm onSuccess={handleRegisterSuccess} onCancel={() => setCurrentPage('list')} />;
      case 'admin': return user.role === 'ADMIN' ? <UserManagement /> : <Dashboard students={students} />;

      // ROTAS PROTEGIDAS POR PERMISSÃO
      case 'backup':
        return hasPermission(user, 'can_access_security_data')
          ? <BackupSystem currentUser={user} />
          : <Dashboard students={students} />; // Redireciona para dashboard se não tiver permissão

      case 'settings': return user.role === 'ADMIN' ? <SystemSettingsPanel /> : <Dashboard students={students} />;
      case 'letterhead-config': return user.role === 'ADMIN' ? <PapelTimbradoConfigPanel /> : <Dashboard students={students} />;
      case 'schools': return (user.role === 'ADMIN' || user.role === 'EDUCATION_SECRETARY') ? <SchoolManagement /> : <Dashboard students={students} />;
      case 'support-professionals': return (user.role === 'ADMIN' || user.role === 'EDUCATION_SECRETARY') ? <SupportProfessionalManagement /> : <Dashboard students={students} />;
      case 'about': return <AboutSystem />;
      case 'documents': return <DocumentGenerator currentUser={user} />;
      default: return <Dashboard students={students} />;
    }
  };

  return (
    <Layout
      activePage={currentPage}
      onNavigate={handleNavigate}
      currentUser={user}
      onLogout={handleLogout}
      systemSettings={systemSettings}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;


export enum Gender {
  MALE = 'Masculino',
  FEMALE = 'Feminino',
  OTHER = 'Outro'
}

export enum Specialty {
  PSYCHOLOGY = 'Psicologia',
  SOCIAL_WORK = 'Serviço Social',
  PSYCHOPEDAGOGY = 'Psicopedagogia',
  OCCUPATIONAL_THERAPY = 'Terapia Ocupacional',
  SPEECH_THERAPY = 'Fonoaudiologia',
  PHYSIOTHERAPY = 'Fisioterapia',
  NUTRITION = 'Nutrição'
}

export type UserRole = 'ADMIN' | 'SPECIALIST' | 'ASSISTANT' | 'EDUCATION_SECRETARY' | 'SECRETARIA_SEDE' | 'SECRETARIA_COCAL' | 'COORDENADOR' | 'ESCOLA';
export type UserScope = 'GLOBAL' | 'SEDE' | 'COCAL'; // Escopo de acesso (Sede ou Distrito)

// --- PERMISSION SYSTEM ---
export type Permission = 'can_access_security_data' | 'can_access_backup_restore';

export const hasPermission = (user: User, permission: Permission): boolean => {
  // Regra Centralizada de Permissões
  // Somente ADMIN tem acesso a dados de segurança e backups
  if (permission === 'can_access_security_data' || permission === 'can_access_backup_restore') {
    return user.role === 'ADMIN';
  }
  return false;
};

/** Módulo "Auditoria do Sistema": exclusivo Administrador (ADMIN) e Secretário(a) de Educação. */
export const canViewSystemAuditLogs = (user: Pick<User, 'role'>): boolean =>
  user.role === 'ADMIN' || user.role === 'EDUCATION_SECRETARY';

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string; // Opcional na listagem por segurança
  role: UserRole;
  isActive: boolean;
  mustChangePassword?: boolean; // Flag para forçar troca de senha

  // Novos Campos
  scope?: UserScope; // Define se vê tudo (Sede) ou apenas regional (Cocal)
  schoolInep?: string; // INEP da escola (apenas para role ESCOLA)
  schoolId?: string;   // UUID real da tabela schools (resolvido via lookup por INEP no login)
  photoUrl?: string; // Foto de perfil
  signatureUrl?: string; // Assinatura digital/Carimbo
  email?: string;
  phone?: string;
  jobTitle?: string; // Cargo ou Profissão
  specialty?: Specialty; // Se for especialista clínico
  address?: Address;
}

export interface Address {
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface School {
  id: string;
  name: string;
  inep: string;
  director?: string;
  phone?: string;
  address?: Address;
  isActive: boolean;
  district?: string; // Bairro ou Distrito Administrativo

  // Conectividade
  hasInternet?: boolean;
  internetType?: string;
  internetProviderContact?: string;
  internetProviders?: Record<string, { company: string, contact: string }>;
}

/** Chaves fixas dos anexos na ficha do profissional de apoio (persistidas em JSONB). */
export type SupportProfessionalAttachmentCategory =
  | 'rg'
  | 'cpf_documento'
  | 'certificado'
  | 'conta_bancaria'
  | 'historico_escolar';

export interface SupportProfessionalAttachment {
  category: SupportProfessionalAttachmentCategory;
  fileName: string;
  url: string;
  uploadedAt: string;
}

export interface SupportProfessional {
  id: string;
  name: string;
  photoUrl?: string; // Foto do profissional
  cpf: string;
  phone: string;
  email: string;

  // Dados Contratuais e Formação
  education?: string; // Formação
  contractStartDate?: string; // Início de contrato
  workload?: string; // Carga horária

  address?: Address; // Endereço completo

  /** Documentos (RG, CPF escaneado, etc.): metadados após upload no Storage */
  attachments?: SupportProfessionalAttachment[];

  schoolId: string; // Vínculo com a escola
  regentTeacher: string; // Professor Regente
  studentId: string; // Vínculo com o aluno
  createdAt: string;
}

export interface Guardian {
  name: string;
  cpf?: string;
  rg?: string;
  issuingBody?: string; // Órgão Expedidor
  ethnicity?: string; // Cor/Etnia
  relationship: string;
  phone: string;
  email: string;
  occupation: string;
}

export interface ClinicalInfo {
  diagnosis: string;
  cid?: string; // Código Internacional de Doenças
  medications: string;
  allergies: string;
  bloodType?: string;
  weight?: string;
  height?: string;
  specialNeeds: string[]; // Altas Habilidades, Auditiva, Física, Mental, etc.
  therapiesHistory: string; // Histórico de terapias anteriores

  // Dados Específicos por Especialidade (JSONB)
  pp_data?: any; // Psicopedagogia
  psych_data?: any; // Psicologia
  social_data?: any; // Serviço Social (Busca Ativa)
  social_interview?: any; // Serviço Social (Entrevista Contexto Escolar)
  ot_data?: any; // Terapia Ocupacional
  st_data?: any; // Fonoaudiologia
  pt_data?: any; // Fisioterapia
  nutrition_data?: any; // Nutrição
}

export interface SchoolInfo {
  schoolId?: string; // ID relacional da tabela schools
  schoolName: string; // Pode ser vinculado ao ID da School no futuro
  grade: string;
  shift?: 'Manhã' | 'Tarde' | 'Noite' | 'Integral';
  schedule?: string; // Horário: Das X às Y
  teachingType?: 'Regular' | 'EJA' | 'Especial';
  hasSpecialAide: boolean; // Se tem acompanhante terapêutico/monitor
  difficulties: string;
  district?: string; // Bairro ou Distrito Administrativo
}

export interface Session {
  id: string;
  date: string;
  specialty: Specialty;
  professionalName: string;
  notes: string;
  // Campos futuros podem ser adicionados aqui via JSON stringify no notes ou novos campos
  startTime?: string;
  endTime?: string;
  serviceType?: string;
  privateNotes?: string;
  content?: any; // JSON completo da sessão (estruturado por especialidade)
}

export type AppointmentStatus =
  | 'AGENDADO'
  | 'CONFIRMADO'
  | 'EM_ATENDIMENTO'
  | 'ENCERRADO'
  | 'ATENDIDO'
  | 'FALTOU'
  | 'REMARCAR'
  | 'CANCELADO';

/** Atendimento concluído (legado `ATENDIDO` + novo `ENCERRADO`). */
export function statusAgendamentoRealizado(status: AppointmentStatus): boolean {
  return status === 'ATENDIDO' || status === 'ENCERRADO';
}

/** Status que ainda ocupam o horário na checagem de conflito ao agendar. */
export function statusAgendamentoOcupandoHorarioConflito(status: AppointmentStatus): boolean {
  return (
    status === 'AGENDADO' ||
    status === 'CONFIRMADO' ||
    status === 'EM_ATENDIMENTO' ||
    status === 'REMARCAR'
  );
}

export type Unit = 'SEDE' | 'COCAL';

export interface Appointment {
  id: string;
  studentId: string;
  studentName: string;
  professionalId: string;
  professionalName: string;
  specialty: Specialty;
  unit: Unit;
  date: string; // ISO Date YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: AppointmentStatus;
  statusConfirmacao?: string;
  telefoneResponsavel?: string;
  notes?: string;
  createdAt: string;
  /** Confirmado com aviso de conflito de agenda do aluno (outro profissional). */
  conflitoHorarioAluno?: boolean;
}

/** Agenda do profissional: agendamento + escola do aluno (join opcional no serviço). */
export type AgendamentoProfissionalView = Appointment & {
  studentSchoolName?: string;
};

export type DocumentType = 'Laudo Médico' | 'Receita Médica' | 'Cartão de Vacina' | 'Cartão SUS' | 'Certidão de Nascimento' | 'PEI' | 'RG' | 'CPF' | 'Autorização de Uso de Imagem' | 'Outros';

export interface StudentDocument {
  id: string;
  type: DocumentType;
  fileName: string;
  url: string; // Base64 string for local storage demo
  uploadedAt: string;
}

export interface SavedDocument {
  id: string;
  studentId: string;
  studentName: string;
  docType: string;
  code: string;
  content: string;
  createdAt: string; // ISO String
  professionalName: string;
}

export interface SocialInfo {
  nis?: string;
  bolsaFamilia: boolean;
  bpc: boolean;
}

export interface Student {
  id: string;
  fullName: string;
  birthDate: string;
  gender: Gender;
  ethnicity?: string;
  photoUrl?: string; // Optional URL for placeholder

  // Dados Pessoais Expandidos
  cpf: string;
  rg?: string;
  birthCertificate?: string;
  susCard: string;
  motherName?: string;
  fatherName?: string;
  nationality?: string;
  birthPlace?: string; // Naturalidade/Estado

  address: Address;
  guardians: Guardian[];

  clinical: ClinicalInfo;
  school: SchoolInfo;
  unit?: Unit; // Campo relacional de unidade (Sede/Cocal)

  // Novos campos baseados no PDF
  socialInfo?: SocialInfo;
  documents: StudentDocument[]; // Upload de arquivos

  history: Session[]; // Histórico de atendimentos

  status: 'Active' | 'Inactive' | 'Pending';
  createdAt: string;
}

export interface DashboardStats {
  totalStudents: number;
  newThisMonth: number;
  bySpecialtyDemand: { name: string; value: number }[];
}

// --- PORTAGE IPO TYPES ---
export interface PortageAssessment {
  id: string;
  studentId: string;
  date: string;
  professionalName: string;
  studentAgeYears: number;
  studentAgeMonths: number;
  scores: {
    socializacao: number[]; // 6 values
    linguagem: number[];
    cognicao: number[];
    autocuidados: number[];
    motor: number[];
  };
  results: {
    socializacao: number;
    linguagem: number;
    cognicao: number;
    autocuidados: number;
    motor: number;
    general: number;
  };
  createdAt: string;
}

// --- SYSTEM SETTINGS TYPES ---

export interface SystemMessage {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  title: string;
  content: string;
  type: 'ALERT' | 'MESSAGE';
  priority: 'normal' | 'urgent';
  is_read: boolean;
  read_at?: string;
  created_at: string;
  sender?: {
    full_name: string;
    role: string;
  };
  recipient?: {
    full_name: string;
    role: string;
  };
}

export interface ThemePalette {
  id: string;
  name: string;
  colors: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
}

export interface SystemSettings {
  systemName: string;
  logoUrl?: string; // Base64 or URL
  loginBackgroundImage?: string; // Base64 ou URL para o fundo do login
  showLoginInfo?: boolean; // Se false, esconde cards e logo (modo banner)
  activeThemeId: string;
}

export interface PapelTimbradoConfig {
  logoUrl: string | null;
  tituloLinha1: string;
  tituloLinha2: string;
  tituloLinha3: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  rodapeTexto: string;
  rodapeImg: string | null;

  // Flags de Visibilidade
  showLogo: boolean;
  showTitulos: boolean;
  showContato: boolean;
}

// --- AUDIT SYSTEM ---
export enum AuditAction {
  LOGIN = 'LOGIN',
  CREATE = 'CRIAR',
  UPDATE = 'EDITAR',
  DELETE = 'EXCLUIR',
  CANCEL = 'CANCELAR',
  LOGOUT = 'LOGOUT'
}

export interface AuditLog {
  id: string;
  user: string; // Nome ou email
  role: string;  // Role do usuário (ex: ADMIN, ESCOLA, PSICOLOGIA)
  action: AuditAction | string;
  module: string;  // Ex: 'ALUNOS', 'AGENTAMENTOS', 'PROFISSIONAIS'
  affected_record: string; // Nome do aluno, ou ID do apontamento
  timestamp: string; // Timestamp ISO
}
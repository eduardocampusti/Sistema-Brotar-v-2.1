

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
  birthDate?: string; // Data de nascimento (YYYY-MM-DD) para aniversário
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

/** Situação do cadastro na rede (exclusão lógica). */
export type SupportProfessionalStatus = 'ativo' | 'desativado';

/** True se o cadastro não está explicitamente desativado (legado / valores vazios = ativo). */
export function isSupportProfessionalActive(p: { status?: SupportProfessionalStatus | string | null }): boolean {
  const s = String(p.status ?? '').trim().toLowerCase();
  if (s === 'desativado') return false;
  return true;
}

/** Perfis de gestão que podem desvincular (soft delete) e ver cadastros desativados (RLS + UI). */
const SUPPORT_PROFESSIONAL_SOFT_DELETE_MANAGEMENT_ROLES: ReadonlySet<string> = new Set([
  'ADMIN',
  'ASSISTANT',
  'SECRETARIA_SEDE',
  'SECRETARIA_COCAL',
  'EDUCATION_SECRETARY',
]);

function isSupportProfessionalSoftDeleteManagerRole(
  user: Pick<User, 'role'> | { role?: string }
): boolean {
  const r = String(user?.role ?? '').trim().toUpperCase();
  return SUPPORT_PROFESSIONAL_SOFT_DELETE_MANAGEMENT_ROLES.has(r);
}

/** Perfis que enxergam profissionais desativados no SELECT (RLS alinhado a V31). */
export function canViewInactiveSupportProfessionals(user: Pick<User, 'role'> | { role?: string }): boolean {
  return isSupportProfessionalSoftDeleteManagerRole(user);
}

/** Quem pode desvincular: exclusivamente gestão de rede (não perfil ESCOLA nem outros). */
export function canUnlinkSupportProfessional(user: Pick<User, 'role'> | { role?: string }): boolean {
  return isSupportProfessionalSoftDeleteManagerRole(user);
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
  status?: SupportProfessionalStatus;
  /** ISO: momento do desvinculamento (soft delete). */
  unlinkedAt?: string | null;
  /** Dados do vínculo original preservados antes da desvinculação (V34). */
  schoolIdUnlinked?: string | null;
  studentIdUnlinked?: string | null;
  regentTeacherUnlinked?: string | null;
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
  laudo?: boolean; // Confirmado com laudo médico
  suspicion?: boolean; // Suspeita clínica (sem laudo)

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

export type Unit = 'SEDE' | 'COCAL' | 'NAO_VINCULADO';

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
// --- TEA REPORTING ---
export interface RelatorioTEAData {
  resumo: {
    totalTEA: number;
    comLaudo: number;
    suspeitos: number;
    totalGeralAlunos: number;
  };
  porEscola: {
    escola: string;
    confirmados: number;
    suspeitos: number;
    total: number;
  }[];
  porFaixaEtaria: {
    faixa: string;
    confirmados: number;
    suspeitos: number;
  }[];
  detalhesAlunos: {
    id: string;
    nome: string;
    escola: string;
    unit: string;
    idade: number;
    status: 'Confirmado' | 'Suspeito';
    cid?: string;
  }[];
}

// ─── NUTRIÇÃO ────────────────────────────────────────────────────────────────

export interface NutritionAssessment {
  id: string;
  student_id: string;
  professional_id: string;
  assessment_date: string;
  status: 'RASCUNHO' | 'FINALIZADA';
  turno?: string;
  email_responsavel?: string;
  historico_familiar?: string[];
  historico_familiar_obs?: string;
  peso_kg?: number;
  altura_m?: number;
  imc?: number;
  imc_classificacao?: string;
  circunferencia_cintura_cm?: number;
  circunferencia_braco_cm?: number;
  condicoes_saude?: string[];
  medicamentos?: string;
  tem_tea?: boolean;
  tem_nae?: boolean;
  sono_horario_dorme?: string;
  sono_horario_acorda?: string;
  sono_qualidade?: string;
  sono_ronca?: boolean;
  sono_acorda_noite?: string;
  sono_classificacao?: string;
  refeicoes_por_dia?: number;
  r24h_cafe?: string;
  r24h_lanche_manha?: string;
  r24h_almoco?: string;
  r24h_lanche_tarde?: string;
  r24h_jantar?: string;
  consumo_frutas?: string;
  consumo_verduras?: string;
  consumo_legumes?: string;
  consumo_feijao?: string;
  consumo_leite?: string;
  consumo_agua_litros?: number;
  consumo_refrigerante?: string;
  consumo_salgadinho?: string;
  consumo_bolacha?: string;
  consumo_fastfood?: string;
  consumo_doces?: string;
  indicador_qualidade_alimentar?: number;
  come_sozinho?: string;
  aceita_novos_alimentos?: string;
  recusa_alimentos?: boolean;
  seletividade_alimentar?: string;
  dificuldade_mastigacao?: boolean;
  dificuldade_degluticao?: boolean;
  avaliacao_comportamento?: string;
  consome_pnae?: string;
  motivo_nao_consome_pnae?: string;
  preparacoes_favoritas?: string;
  preparacoes_rejeitadas?: string;
  pratica_atividade_fisica?: boolean;
  atividade_fisica_tipo?: string;
  atividade_fisica_frequencia?: string;
  tempo_tela?: string;
  dificuldade_aquisicao_alimentos?: boolean;
  recebe_beneficio_social?: boolean;
  faltou_alimento_em_casa?: boolean;
  crianca_deixa_refeicoes?: boolean;
  classificacao_ebia?: string;
  tea_texturas_aceitas?: string[];
  tea_temperatura_preferida?: string;
  tea_neofobia?: string;
  tea_rituais?: string[];
  tea_obs?: string;
  diagnostico_nutricional?: string;
  condutas?: string[];
  orientacoes?: string;
  proxima_avaliacao?: string;
  gemini_orientacao?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NutritionAnthropometryHistory {
  id: string;
  student_id: string;
  professional_id: string;
  data_medicao: string;
  peso_kg?: number;
  altura_m?: number;
  imc?: number;
  imc_classificacao?: string;
  circunferencia_cintura_cm?: number;
  circunferencia_braco_cm?: number;
  created_at?: string;
}

export interface NutritionNAE {
  id: string;
  student_id: string;
  professional_id: string;
  tipo: string;
  gravidade: 'LEVE' | 'MODERADA' | 'GRAVE';
  alimentos_proibidos?: string;
  alimentos_permitidos?: string;
  contaminacao_cruzada?: boolean;
  utensilios_exclusivos?: boolean;
  alimentacao_de_casa?: boolean;
  monitoramento_individual?: boolean;
  laudo_presente?: boolean;
  laudo_data?: string;
  laudo_medico?: string;
  laudo_crm?: string;
  laudo_obs?: string;
  laudo_validade?: string;
  plano_alimentar_escola?: string;
  status?: 'ATIVO' | 'INATIVO';
  created_at?: string;
  updated_at?: string;
}

export interface NutritionEanActivity {
  id: string;
  professional_id: string;
  tipo: 'OFICINA' | 'PALESTRA' | 'PROJETO' | 'CAMPANHA' | 'HORTA' | 'SEMANA_ALIMENTACAO' | 'OUTRO';
  titulo: string;
  data_atividade: string;
  escola_id?: string;
  publico?: string;
  num_participantes?: number;
  resultados?: string;
  observacoes?: string;
  created_at?: string;
}

export interface NutritionEvolution {
  id: string;
  assessment_id?: string;
  student_id: string;
  professional_id: string;
  data_retorno: string;
  novos_alimentos_aceitos?: string;
  alimentos_recusados?: string;
  comportamento_refeicoes?: string;
  reducao_pressao_alimentar?: boolean;
  mudancas_familia?: string;
  uso_telas_refeicoes?: boolean;
  aceitacao_alimentar?: number;
  consumo_frutas_score?: number;
  consumo_verduras_score?: number;
  hidratacao_score?: number;
  participacao_pnae_score?: number;
  orientacoes_realizadas?: string;
  objetivos_proximo_retorno?: string;
  observacoes_gerais?: string;
  created_at?: string;
}

export interface NutritionAlerta {
  tipo: 'LAUDO_VENCIDO' | 'LAUDO_VENCENDO' | 'IMC_CRITICO' | 'SEM_AVALIACAO' | 'QUEDA_PESO' | 'AUMENTO_PESO';
  severidade: 'CRITICO' | 'ATENCAO';
  student_id: string;
  studentName: string;
  mensagem: string;
}

export interface NutritionDashboardStats {
  totalAlunos: number;
  avaliados: number;
  pendentes: number;
  perfilNutricional: {
    baixoPeso: number;
    eutrofia: number;
    sobrepeso: number;
    obesidade: number;
    obesidadeGrave: number;
  };
  naeAtivos: number;
  laudosVencendo: number;
  alertas: NutritionAlerta[];
}

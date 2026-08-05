

import { Student, Gender, Specialty, User, School, SupportProfessional, SystemSettings, ThemePalette, SavedDocument, PapelTimbradoConfig } from '../types';

const STORAGE_KEY = 'nexus_care_students_v1';
const USERS_KEY = 'nexus_care_users_v1';
const SCHOOLS_KEY = 'nexus_care_schools_v1';
const SUPPORT_PROFS_KEY = 'nexus_care_support_profs_v1';
const SETTINGS_KEY = 'nexus_care_settings_v1';
const DOCUMENTS_KEY = 'nexus_care_generated_docs_v1';
const PAPEL_TIMBRADO_KEY = 'brotar_papel_timbrado';

const DEFAULT_PAPEL_TIMBRADO: PapelTimbradoConfig = {
  logoUrl: null,
  tituloLinha1: "PREFEITURA MUNICIPAL DE BROTAS DE MACAÚBAS",
  tituloLinha2: "SECRETARIA MUNICIPAL DE EDUCAÇÃO",
  tituloLinha3: "CENTRO MULTIDISCIPLINAR DE ATENDIMENTO EDUCACIONAL",
  cnpj: "",
  endereco: "",
  telefone: "",
  rodapeTexto: "",
  rodapeImg: null,
  showLogo: true,
  showTitulos: true,
  showContato: true
};

// Pre-defined Themes
export const PRESET_THEMES: ThemePalette[] = [
  {
    id: 'teal-default',
    name: 'Brotar Original (Teal)',
    colors: {
      50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf',
      500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a', 950: '#042f2e'
    }
  },
  {
    id: 'ocean-blue',
    name: 'Oceano Azul',
    colors: {
      50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8',
      500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e', 950: '#082f49'
    }
  },
  {
    id: 'royal-purple',
    name: 'Roxo Real',
    colors: {
      50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc',
      500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87', 950: '#3b0764'
    }
  },
  {
    id: 'forest-green',
    name: 'Floresta Verde',
    colors: {
      50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80',
      500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16'
    }
  },
  {
    id: 'cherry-red',
    name: 'Cereja Intensa',
    colors: {
      50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171',
      500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a'
    }
  },
  {
    id: 'slate-corporate',
    name: 'Corporativo (Slate)',
    colors: {
      50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8',
      500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617'
    }
  }
];

const DEFAULT_SETTINGS: SystemSettings = {
  systemName: 'Brotar',
  activeThemeId: 'teal-default',
  logoUrl: '' // Empty means default icon
};

// Seed data to show initially if empty
const SEED_DATA: Student[] = [
  {
    id: '1',
    fullName: 'Lucas Oliveira',
    birthDate: '2015-05-12',
    gender: Gender.MALE,
    cpf: '123.456.789-00',
    rg: '12.345.678-9',
    susCard: '700000000000001',
    nationality: 'Brasileira',
    birthPlace: 'São Paulo/SP',
    motherName: 'Maria Oliveira',
    status: 'Active',
    createdAt: new Date().toISOString(),
    photoUrl: 'https://picsum.photos/200/200',
    address: {
      street: 'Rua das Flores',
      number: '123',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01000-000'
    },
    guardians: [{
      name: 'Maria Oliveira',
      relationship: 'Mãe',
      phone: '(11) 99999-9999',
      email: 'maria@email.com',
      occupation: 'Professora',
      ethnicity: 'Branca',
      cpf: '111.111.111-11',
      rg: '22.222.222-2'
    }],
    clinical: {
      diagnosis: 'Transtorno do Espectro Autista (TEA) Nível 1',
      cid: 'F84.0',
      medications: 'Risperidona 1mg',
      allergies: 'Dipirona',
      therapiesHistory: 'Fonoaudiologia por 2 anos',
      weight: '32kg',
      height: '135cm',
      specialNeeds: ['Mental']
    },
    school: {
      schoolName: 'Escola Municipal Caminho do Saber',
      grade: '3º Ano Fundamental',
      hasSpecialAide: true,
      difficulties: 'Interação social e ruídos altos',
      shift: 'Manhã',
      teachingType: 'Regular',
      schedule: '07:00 às 12:00',
      district: 'Centro' // Sede sees this
    },
    socialInfo: {
        nis: '12345678900',
        bolsaFamilia: false,
        bpc: true
    },
    documents: [],
    history: [
      {
        id: 'h1',
        date: '2023-10-15',
        specialty: Specialty.PSYCHOLOGY,
        professionalName: 'Dra. Sofia Lima',
        notes: 'Aluno apresentou boa interação lúdica. Trabalhamos reconhecimento de emoções através de cartões. Manteve contato visual por períodos mais longos.'
      },
      {
        id: 'h2',
        date: '2023-10-20',
        specialty: Specialty.PSYCHOPEDAGOGY,
        professionalName: 'Psicoped. Júlia',
        notes: 'Realizada atividade de sequenciamento lógico. Lucas demonstrou facilidade com padrões visuais, mas resistência em tarefas de escrita manual.'
      }
    ]
  },
  {
    id: '2',
    fullName: 'Ana Clara Santos',
    birthDate: '2016-08-20',
    gender: Gender.FEMALE,
    cpf: '987.654.321-11',
    rg: '22.222.222-2',
    susCard: '700000000000002',
    nationality: 'Brasileira',
    birthPlace: 'Osasco/SP',
    motherName: 'Juliana Santos',
    fatherName: 'João Santos',
    status: 'Pending',
    createdAt: new Date().toISOString(),
    photoUrl: 'https://picsum.photos/201/201',
    address: {
      street: 'Av. Cocal',
      number: '1000',
      district: 'Cocal',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100'
    },
    guardians: [{
      name: 'João Santos',
      relationship: 'Pai',
      phone: '(11) 98888-8888',
      email: 'joao@email.com',
      occupation: 'Engenheiro',
      ethnicity: 'Parda',
      cpf: '333.333.333-33',
      rg: '44.444.444-4'
    }],
    clinical: {
      diagnosis: 'TDAH',
      medications: 'Ritalina',
      allergies: 'Nenhuma',
      specialNeeds: [],
      therapiesHistory: 'Psicologia',
      cid: 'F90',
      weight: '35kg',
      height: '140cm'
    },
    school: {
      schoolName: 'Escola Municipal Cocal', // Escola específica do distrito
      grade: '2º Ano',
      hasSpecialAide: false,
      difficulties: 'Concentração',
      shift: 'Tarde',
      teachingType: 'Regular',
      schedule: '13:00 às 17:30',
      district: 'Cocal' // Critical for filtering
    },
    documents: [],
    history: []
  }
];

// Seed Users for Testing
const SEED_USERS: User[] = [
    { 
        id: 'admin', 
        name: 'Administrador Geral', 
        username: 'admin', 
        role: 'ADMIN', 
        isActive: true,
        scope: 'GLOBAL',
        jobTitle: 'Gestor do Sistema',
        email: 'admin@brotar.com',
        phone: '(11) 99999-0000',
        address: { street: '', number: '', district: '', city: '', state: '', zipCode: '' },
        photoUrl: ''
    },
    { 
        id: 'sede', 
        name: 'Secretária Sede', 
        username: 'sede', 
        role: 'EDUCATION_SECRETARY', 
        isActive: true,
        scope: 'GLOBAL', // Acesso total
        jobTitle: 'Secretária de Educação',
        email: 'sede@edu.com',
        phone: '(11) 3333-5555',
        address: { street: 'Rua da Sede', number: '1', district: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '' },
        photoUrl: ''
    },
    { 
        id: 'cocal', 
        name: 'Secretária Cocal', 
        username: 'cocal', 
        role: 'EDUCATION_SECRETARY', 
        isActive: true,
        scope: 'COCAL', // Acesso restrito
        jobTitle: 'Secretária Distrital',
        email: 'cocal@edu.com',
        phone: '(11) 3333-7777',
        address: { street: 'Rua do Cocal', number: '500', district: 'Cocal', city: 'São Paulo', state: 'SP', zipCode: '' },
        photoUrl: ''
    },
    { 
        id: 'psi', 
        name: 'Dra. Sofia Lima', 
        username: 'psi', 
        role: 'SPECIALIST', 
        specialty: Specialty.PSYCHOLOGY,
        isActive: true,
        jobTitle: 'Psicóloga',
        email: 'sofia.psi@brotar.com',
        phone: '(11) 98888-1111',
        address: { street: '', number: '', district: '', city: '', state: '', zipCode: '' },
        photoUrl: ''
    },
    { 
        id: 'pp', 
        name: 'Psicoped. Júlia', 
        username: 'pp', 
        role: 'SPECIALIST', 
        specialty: Specialty.PSYCHOPEDAGOGY,
        isActive: true,
        jobTitle: 'Psicopedagoga',
        email: 'julia.pp@brotar.com',
        phone: '(11) 98888-3333',
        address: { street: '', number: '', district: '', city: '', state: '', zipCode: '' },
        photoUrl: ''
    },
    { 
        id: 'fono', 
        name: 'Fono. Beatriz', 
        username: 'fono', 
        role: 'SPECIALIST', 
        specialty: Specialty.SPEECH_THERAPY,
        isActive: true,
        jobTitle: 'Fonoaudióloga',
        email: 'beatriz.fono@brotar.com',
        phone: '(11) 98888-4444',
        address: { street: '', number: '', district: '', city: '', state: '', zipCode: '' },
        photoUrl: ''
    },
    { 
        id: 'to', 
        name: 'T.O. Roberto', 
        username: 'to', 
        role: 'SPECIALIST', 
        specialty: Specialty.OCCUPATIONAL_THERAPY,
        isActive: true,
        jobTitle: 'Terapeuta Ocupacional',
        email: 'roberto.to@brotar.com',
        phone: '(11) 98888-5555',
        address: { street: '', number: '', district: '', city: '', state: '', zipCode: '' },
        photoUrl: ''
    },
    { 
        id: 'social', 
        name: 'Assist. Social Maria', 
        username: 'social', 
        role: 'SPECIALIST', 
        specialty: Specialty.SOCIAL_WORK,
        isActive: true,
        jobTitle: 'Assistente Social',
        email: 'maria.as@brotar.com',
        phone: '(11) 98888-2222',
        address: { street: '', number: '', district: '', city: '', state: '', zipCode: '' },
        photoUrl: ''
    },
    { 
        id: 'recepcao', 
        name: 'Recepção', 
        username: 'recepcao', 
        role: 'ASSISTANT', 
        isActive: true,
        jobTitle: 'Recepcionista',
        email: 'contato@brotar.com',
        phone: '(11) 3333-4444',
        address: { street: '', number: '', district: '', city: '', state: '', zipCode: '' },
        photoUrl: ''
    }
];

// Seed Schools to ensure filter works
const SEED_SCHOOLS: School[] = [
    {
        id: 'sch1',
        name: 'Escola Municipal Caminho do Saber',
        inep: '11122233',
        director: 'Profa. Helena',
        isActive: true,
        district: 'Centro',
        address: { street: 'Rua A', number: '1', district: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '00000-000' }
    },
    {
        id: 'sch2',
        name: 'Escola Municipal Cocal',
        inep: '99988877',
        director: 'Prof. Carlos',
        isActive: true,
        district: 'Cocal', // Distrito específico para testar o filtro
        address: { street: 'Rua do Cocal', number: '100', district: 'Cocal', city: 'São Paulo', state: 'SP', zipCode: '00000-000' }
    }
];

export class StorageService {
  // --- Students ---
  static getStudents(): Student[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
      return SEED_DATA;
    }
    return JSON.parse(data);
  }

  static saveStudent(student: Student): void {
    const students = this.getStudents();
    const index = students.findIndex(p => p.id === student.id);
    
    if (index >= 0) {
      students[index] = student;
    } else {
      students.push(student);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  }

  static deleteStudent(id: string): void {
    const students = this.getStudents().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  }

  // --- Users ---
  static getUsers(): User[] {
    const data = localStorage.getItem(USERS_KEY);
    if (!data) {
        localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
        return SEED_USERS;
    }
    
    const users = JSON.parse(data);
    let hasChanges = false;
    // Merge new seed users if they don't exist
    SEED_USERS.forEach(seedUser => {
        if (!users.some((u: User) => u.username === seedUser.username)) {
            users.push(seedUser);
            hasChanges = true;
        }
    });
    
    if (hasChanges) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    return users;
  }

  static saveUser(user: User): void {
      const users = this.getUsers();
      const index = users.findIndex(u => u.id === user.id);
      if (index >= 0) {
          users[index] = user;
      } else {
          users.push(user);
      }
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  static authenticate(username: string, password: string): User | null {
      void username;
      void password;
      return null;
  }

  // --- Schools ---
  static getSchools(): School[] {
    const data = localStorage.getItem(SCHOOLS_KEY);
    if (!data) {
        localStorage.setItem(SCHOOLS_KEY, JSON.stringify(SEED_SCHOOLS));
        return SEED_SCHOOLS;
    }
    return JSON.parse(data);
  }

  static saveSchool(school: School): void {
    const schools = this.getSchools();
    const index = schools.findIndex(s => s.id === school.id);
    if (index >= 0) {
        schools[index] = school;
    } else {
        schools.push(school);
    }
    localStorage.setItem(SCHOOLS_KEY, JSON.stringify(schools));
  }

  // --- Support Professionals ---
  static getSupportProfessionals(): SupportProfessional[] {
    const data = localStorage.getItem(SUPPORT_PROFS_KEY);
    return data ? JSON.parse(data) : [];
  }

  static saveSupportProfessional(prof: SupportProfessional): void {
    const profs = this.getSupportProfessionals();
    const index = profs.findIndex(p => p.id === prof.id);
    if (index >= 0) {
      profs[index] = prof;
    } else {
      profs.push(prof);
    }
    localStorage.setItem(SUPPORT_PROFS_KEY, JSON.stringify(profs));
  }

  static deleteSupportProfessional(id: string): void {
    const profs = this.getSupportProfessionals().filter(p => p.id !== id);
    localStorage.setItem(SUPPORT_PROFS_KEY, JSON.stringify(profs));
  }

  // --- Generated Documents (History) ---
  static getDocuments(studentId?: string): SavedDocument[] {
    const data = localStorage.getItem(DOCUMENTS_KEY);
    let docs: SavedDocument[] = data ? JSON.parse(data) : [];
    
    // Filtro opcional por aluno
    if (studentId) {
        docs = docs.filter(d => d.studentId === studentId);
    }
    
    // Ordenar por data decrescente
    return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static saveDocument(doc: SavedDocument): void {
    const docs = this.getDocuments(); // Pega todos sem filtrar
    docs.unshift(doc); // Adiciona no início
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
  }

  static deleteDocument(id: string): void {
    const docs = this.getDocuments().filter(d => d.id !== id);
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
  }

  // --- System Settings ---
  static getSystemSettings(): SystemSettings {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return DEFAULT_SETTINGS;
    return JSON.parse(data);
  }

  static saveSystemSettings(settings: SystemSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  static getActiveTheme(): ThemePalette {
    const settings = this.getSystemSettings();
    return PRESET_THEMES.find(t => t.id === settings.activeThemeId) || PRESET_THEMES[0];
  }

  // --- Papel Timbrado ---
  static getPapelTimbradoConfig(): PapelTimbradoConfig {
    try {
      const data = localStorage.getItem(PAPEL_TIMBRADO_KEY);
      if (!data) return DEFAULT_PAPEL_TIMBRADO;
      const parsed = JSON.parse(data);
      // Mescla com defaults para garantir que todos os campos existam mesmo se o JSON for antigo
      // Tenta mapear campos antigos (titulo1) para novos (tituloLinha1)
      return { 
          ...DEFAULT_PAPEL_TIMBRADO, 
          ...parsed,
          tituloLinha1: parsed.tituloLinha1 || parsed.titulo1 || DEFAULT_PAPEL_TIMBRADO.tituloLinha1,
          tituloLinha2: parsed.tituloLinha2 || parsed.titulo2 || DEFAULT_PAPEL_TIMBRADO.tituloLinha2,
          tituloLinha3: parsed.tituloLinha3 || parsed.titulo3 || DEFAULT_PAPEL_TIMBRADO.tituloLinha3,
          rodapeTexto: parsed.rodapeTexto || parsed.rodape || DEFAULT_PAPEL_TIMBRADO.rodapeTexto,
          showLogo: parsed.showLogo ?? DEFAULT_PAPEL_TIMBRADO.showLogo,
          showTitulos: parsed.showTitulos ?? DEFAULT_PAPEL_TIMBRADO.showTitulos,
          showContato: parsed.showContato ?? DEFAULT_PAPEL_TIMBRADO.showContato
      };
    } catch {
      return DEFAULT_PAPEL_TIMBRADO;
    }
  }

  static savePapelTimbradoConfig(config: PapelTimbradoConfig): void {
    localStorage.setItem(PAPEL_TIMBRADO_KEY, JSON.stringify(config));
  }
}
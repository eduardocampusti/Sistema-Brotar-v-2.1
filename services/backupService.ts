
import { Student, User, School, SupportProfessional } from '../types';
import { SupabaseService } from './SupabaseService';

const SNAPSHOTS_KEY = 'nexus_care_backup_snapshots_v1';

// Interfaces para o arquivo de Backup
export interface BackupMetadata {
  system: string;
  version: string;
  exportedAt: string;
  exportedBy: string;
  type: 'MANUAL_FILE' | 'LOCAL_SNAPSHOT';
  recordCounts: {
    students: number;
    users: number;
    schools: number;
    supportProfessionals: number;
  };
}

export interface BackupData {
  id?: string; // ID único para snapshots locais
  label?: string; // Nome amigável para o snapshot
  metadata: BackupMetadata;
  modules: {
    students?: Student[];
    users?: User[];
    schools?: School[];
    supportProfessionals?: SupportProfessional[];
  };
}

export const BackupService = {
  /**
   * Gera o objeto de backup completo com todos os dados atuais do sistema (via Supabase).
   */
  generateBackupData: async (currentUser: User, type: 'MANUAL_FILE' | 'LOCAL_SNAPSHOT' = 'MANUAL_FILE', label?: string): Promise<BackupData> => {
    const [students, users, schools, supportProfessionals] = await Promise.all([
      SupabaseService.getStudents(),
      SupabaseService.getUsers(),
      SupabaseService.getSchools(),
      SupabaseService.getSupportProfessionals()
    ]);

    const backup: BackupData = {
      id: type === 'LOCAL_SNAPSHOT' ? crypto.randomUUID() : undefined,
      label: label || `Backup ${new Date().toLocaleDateString()}`,
      metadata: {
        system: 'Brotar - Sistema Multidisciplinar',
        version: '2.1 (Supabase)',
        exportedAt: new Date().toISOString(),
        exportedBy: `${currentUser.name} (${currentUser.username})`,
        type: type,
        recordCounts: {
          students: students.length,
          users: users.length,
          schools: schools.length,
          supportProfessionals: supportProfessionals.length
        }
      },
      modules: {
        students,
        users,
        schools,
        supportProfessionals
      }
    };

    return backup;
  },

  /**
   * Dispara o download do arquivo JSON pelo navegador
   */
  downloadBackupFile: (data: BackupData) => {
    // Sanitiza o nome do arquivo
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `brotar_backup_${dateStr}.json`;

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Valida se o arquivo JSON tem a estrutura correta do sistema Brotar
   */
  validateBackupFile: async (file: File): Promise<BackupData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const json = JSON.parse(content);

          // Validação básica de estrutura e assinatura
          if (!json.metadata || !json.metadata.system || !json.metadata.system.includes('Brotar')) {
            reject(new Error('Arquivo inválido: Assinatura do sistema não encontrada.'));
            return;
          }

          if (!json.modules) {
            reject(new Error('Arquivo inválido: Módulos de dados não encontrados.'));
            return;
          }

          resolve(json as BackupData);
        } catch (error) {
          reject(new Error('Erro ao processar arquivo. Verifique se é um JSON válido.'));
        }
      };

      reader.onerror = () => reject(new Error('Erro de leitura do arquivo.'));
      reader.readAsText(file);
    });
  },

  /**
   * Restaura os módulos selecionados para o Supabase (Lógica de Upsert).
   */
  restoreModules: async (data: BackupData, modulesToRestore: string[]) => {
    try {
      // Nota: Restauração para o banco é uma operação delicada e lenta por ser registro a registro
      // Idealmente isto seria um comando administrativo ou dump SQL, mas via API faremos sequencial.

      if (modulesToRestore.includes('schools') && data.modules.schools) {
        for (const school of data.modules.schools) {
          await SupabaseService.saveSchool(school);
        }
      }

      if (modulesToRestore.includes('supportProfessionals') && data.modules.supportProfessionals) {
        for (const prof of data.modules.supportProfessionals) {
          await SupabaseService.saveSupportProfessional(prof);
        }
      }

      if (modulesToRestore.includes('students') && data.modules.students) {
        for (const student of data.modules.students) {
          await SupabaseService.saveStudent(student);
        }
      }

      // Usuários são pulados por segurança (precisam de Auth signup)
      if (modulesToRestore.includes('users')) {
        console.warn("Restauração de usuários ignorada: use o painel de gerenciamento para novos convites.");
      }

      return true;
    } catch (e) {
      console.error("Erro ao restaurar módulos no Supabase:", e);
      throw new Error("Falha ao escrever dados no banco de dados remoto.");
    }
  },

  // --- SNAPSHOTS LOCAIS ---

  /**
   * Salva um snapshot no LocalStorage com tratamento rigoroso de cota.
   */
  createLocalSnapshot: async (currentUser: User, label: string) => {
    try {
      // 1. Gera os dados atuais (do Supabase)
      const snapshot = await BackupService.generateBackupData(currentUser, 'LOCAL_SNAPSHOT', label);

      // 2. Busca snapshots existentes
      const existingSnapshots = BackupService.getLocalSnapshots();

      // 3. Adiciona o novo no início e mantém no máximo 3 (Reduzido de 5 para evitar QuotaExceeded devido a fotos em base64)
      const newSnapshots = [snapshot, ...existingSnapshots].slice(0, 3);

      // 4. Tenta salvar
      const serializedData = JSON.stringify(newSnapshots);
      localStorage.setItem(SNAPSHOTS_KEY, serializedData);

      return true;

    } catch (e: any) {
      console.error('Erro ao salvar snapshot:', e);

      // Tratamento específico para armazenamento cheio
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        throw new Error('Armazenamento cheio! Exclua snapshots antigos ou remova anexos pesados (fotos/docs) antes de salvar.');
      }

      throw new Error('Erro desconhecido ao salvar backup local.');
    }
  },

  /**
   * Recupera a lista de snapshots. Retorna array vazio se não houver ou der erro.
   */
  getLocalSnapshots: (): BackupData[] => {
    try {
      const data = localStorage.getItem(SNAPSHOTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Erro ao ler snapshots:", e);
      return [];
    }
  },

  /**
   * Remove um snapshot específico pelo ID.
   */
  deleteSnapshot: (id: string) => {
    try {
      const existing = BackupService.getLocalSnapshots();
      const filtered = existing.filter(s => s.id !== id);
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(filtered));
    } catch (e) {
      throw new Error("Erro ao excluir snapshot.");
    }
  },

  /**
   * Retorna a data do backup mais recente para fins de status.
   */
  getLastBackupDate: (): Date | null => {
    const snapshots = BackupService.getLocalSnapshots();
    if (snapshots.length > 0) {
      return new Date(snapshots[0].metadata.exportedAt);
    }
    return null;
  },

  /**
   * Utilitário para estimar o uso de armazenamento (apenas informativo)
   */
  getStorageUsageEstimate: (): number => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += (localStorage[key].length * 2); // Aproximação (UTF-16 chars são 2 bytes)
      }
    }
    return total; // Retorna em bytes
  }
};

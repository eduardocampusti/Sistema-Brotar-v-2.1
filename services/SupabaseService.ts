import { supabase } from './supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { Student, User, School, SupportProfessional, SystemSettings, PapelTimbradoConfig, SavedDocument, Session, Specialty, UserRole, PortageAssessment, Appointment, AppointmentStatus, Unit, AuditAction, AuditLog } from '../types';

// Mapeamento de campos snake_case do banco para camelCase do frontend
const sanitizeCPF = (cpf: string | undefined | null): string => {
    if (!cpf) return '';
    return cpf.replace(/\D/g, '');
};

const mapStudentFromDB = (dbStudent: any, sessions: any[] = []): Student => {
    // Fallback seguro para capturar nome e distrito da escola
    const getSchoolName = (schoolsProp: any) => {
        if (!schoolsProp) return 'Não vinculada';
        if (Array.isArray(schoolsProp)) return schoolsProp[0]?.name || 'Não vinculada';
        return schoolsProp.name || 'Não vinculada';
    };

    const getSchoolDistrict = (schoolsProp: any) => {
        if (!schoolsProp) return 'Sede';
        if (Array.isArray(schoolsProp)) return schoolsProp[0]?.district || 'Sede';
        return schoolsProp.district || 'Sede';
    };

    return {
        id: dbStudent.id,
        fullName: dbStudent.full_name,
        birthDate: dbStudent.birth_date,
        gender: (dbStudent.clinical_info?.gender || 'Outro') as any, // Fallback se não tiver na coluna
        photoUrl: dbStudent.photo_url || dbStudent.clinical_info?.photoUrl,
        cpf: dbStudent.cpf || '',
        rg: dbStudent.clinical_info?.rg,
        susCard: dbStudent.sus_card,
        motherName: dbStudent.clinical_info?.motherName,
        fatherName: dbStudent.clinical_info?.fatherName,
        nationality: dbStudent.clinical_info?.nationality,
        birthPlace: dbStudent.clinical_info?.birthPlace,
        ethnicity: dbStudent.ethnicity || undefined,
        address: dbStudent.address || {},
        guardians: dbStudent.guardians || [],
        clinical: dbStudent.clinical_info || {
            diagnosis: '', medications: '', allergies: '', specialNeeds: [], therapiesHistory: ''
        },
        school: {
            schoolId: dbStudent.school_id, 
            schoolName: getSchoolName(dbStudent.schools),
            grade: dbStudent.grade,
            shift: dbStudent.shift as any,
            district: getSchoolDistrict(dbStudent.schools),
            hasSpecialAide: false,
            difficulties: ''
        },
        socialInfo: dbStudent.social_info,
        documents: dbStudent.documents || [],
        unit: dbStudent.unit, // Mapeamento da unidade (Sede/Cocal)
        history: (sessions || []).map(s => ({
            id: s.id,
            date: s.date,
            specialty: s.specialty,
            professionalName: 'Profissional', // Join com profile seria ideal
            notes: s.content?.summary || s.content?.objetivo || s.content?.resumo || 'Atendimento realizado',
            content: s.content, // Mapeia o JSON completo
        })),
        status: dbStudent.status,
        createdAt: dbStudent.created_at
    };
};


// Função utilitária para retry em caso de AbortError ou falha de rede e monitoramento de performance
const safeCall = async <T>(fn: () => Promise<T>, retries = 2, interval = 300, contextName = 'Operação'): Promise<T> => {
    try {
        const start = performance.now();
        const result = await fn();
        const duration = performance.now() - start;
        if (duration > 1500) { // Loga se demorar mais que 1.5s
            console.warn(`[SupabaseService] LENTIDÃO DETECTADA: ${contextName} demorou ${duration.toFixed(0)}ms`);
        }
        return result;
    } catch (error: any) {
        if (retries > 0 && (error.name === 'AbortError' || error.message?.includes('AbortError') || !navigator.onLine || error.message?.includes('Failed to fetch'))) {
            console.warn(`[SupabaseService] Retentativa ativada em ${contextName}. Falha de rede. (${retries} restantes)`);
            await new Promise(resolve => setTimeout(resolve, interval));
            return safeCall(fn, retries - 1, interval, contextName);
        }
        throw error;
    }
};

export class SupabaseService {
    // Cache de perfil para evitar requisições redundantes durante o mesmo ciclo de vida
    private static userProfileCache: Map<string, User> = new Map();
    // Mapeamento centralizado de especialidades para o banco de dados
    private static readonly SPECIALTY_MAP: Record<string, string> = {
        'Psicologia': 'PSICOLOGIA',
        'Fonoaudiologia': 'FONOAUDIOLOGIA',
        'Psicopedagogia': 'PSICOPEDAGOGIA',
        'Terapia Ocupacional': 'TERAPIA_OCUPACIONAL',
        'Serviço Social': 'SERVICO_SOCIAL',
        'Fisioterapia': 'FISIOTERAPIA',
        'Enfermagem': 'ENFERMAGEM',
        'Nutrição': 'NUTRICAO'
    };

    private static readonly REVERSE_SPECIALTY_MAP: Record<string, Specialty> = {
        'PSICOLOGIA': Specialty.PSYCHOLOGY,
        'FONOAUDIOLOGIA': Specialty.SPEECH_THERAPY,
        'PSICOPEDAGOGIA': Specialty.PSYCHOPEDAGOGY,
        'TERAPIA_OCUPACIONAL': Specialty.OCCUPATIONAL_THERAPY,
        'SERVICO_SOCIAL': Specialty.SOCIAL_WORK,
        'FISIOTERAPIA': Specialty.PHYSIOTHERAPY,
        'ENFERMAGEM': 'Enfermagem' as any,
        'NUTRICAO': Specialty.NUTRITION
    };

    // Cache genérico com TTL para reduzir latência em consultas frequentes
    private static dataCache: Map<string, { data: any, timestamp: number }> = new Map();
    private static readonly DEFAULT_TTL = 30 * 1000; // 30 segundos (reduzido para maior precisão)

    private static setInCache(key: string, data: any): void {
        this.dataCache.set(key, { data, timestamp: Date.now() });
    }

    private static getFromCache<T>(key: string): T | null {
        const cached = this.dataCache.get(key);
        if (!cached) return null;

        const isExpired = Date.now() - cached.timestamp > this.DEFAULT_TTL;
        if (isExpired) {
            this.dataCache.delete(key);
            return null;
        }

        return cached.data as T;
    }

    private static invalidateCache(keyPrefix?: string): void {
        if (!keyPrefix) {
            this.dataCache.clear();
            return;
        }
        for (const key of this.dataCache.keys()) {
            if (key.startsWith(keyPrefix)) {
                this.dataCache.delete(key);
            }
        }
    }

    private static mapSpecialtyFromDB(dbValue?: string): Specialty | undefined {
        if (!dbValue) return undefined;
        return this.REVERSE_SPECIALTY_MAP[dbValue] || (dbValue as any);
    }

    // --- Auditoria ---
    static async getAuditLogs(filters?: { user?: string, date?: string, action?: string, module?: string }): Promise<AuditLog[]> {
        try {
            let query = supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });

            if (filters) {
                if (filters.user) query = query.ilike('user', `%${filters.user}%`);
                if (filters.date) {
                    const dateObj = new Date(filters.date + 'T00:00:00'); // Garante que a data é tratada no fuso local aproximado
                    const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
                    const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);
                    query = query.gte('timestamp', startOfDay.toISOString()).lte('timestamp', endOfDay.toISOString());
                }
                if (filters.action) query = query.eq('action', filters.action);
                if (filters.module) query = query.eq('module', filters.module);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as AuditLog[];
        } catch (error) {
            console.error('[SupabaseService] Erro ao buscar logs de auditoria:', error);
            throw error;
        }
    }

    static async logAction(
        currentUser: Pick<User, 'name' | 'email' | 'role'> | null,
        action: AuditAction | string,
        module: string,
        affectedRecord: string
    ): Promise<void> {
        try {
            if (!currentUser) return;
            const nomeStr = currentUser.name || currentUser.email || 'Sistema';

            const { error } = await supabase.from('audit_logs').insert({
                user: nomeStr,
                role: currentUser.role,
                action,
                module,
                affected_record: affectedRecord
            });

            if (error) {
                console.warn('[SupabaseService] Erro silencioso ao registrar log:', error.message);
            }
        } catch (error) {
            console.warn('[SupabaseService] Falha na auditoria:', error);
        }
    }

    // --- Auth ---
    static async authenticate(email: string, password: string): Promise<User | null> {
        const cleanEmail = email.trim();
        // Se for puramente numérico, é um INEP (Escola). Caso contrário, usa o email como está.
        // Se não houver @, tentamos os sufixos padrão como fallback.
        let finalEmail = cleanEmail;
        if (!cleanEmail.includes('@')) {
            const suffix = /^\d+$/.test(cleanEmail) ? '@escola.brotar' : '@brotar.com'; // Restaurado para @brotar.com
            finalEmail = `${cleanEmail}${suffix}`;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: finalEmail,
            password
        });

        if (error || !data.user) {
            console.error('Erro de Login:', error);
            return null;
        }

        // Busca perfil expandido
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        const userData = profileError || !profile ? null : profile;

        // Se o perfil não existir, usamos um fallback seguro baseado no metadata do Auth
        const user: User = {
            id: userData?.id || data.user.id,
            name: userData?.full_name || data.user.user_metadata?.full_name || finalEmail.split('@')[0],
            username: email, // Usa o que o usuário digitou
            role: userData?.role || (data.user.user_metadata?.role as UserRole) || 'SPECIALIST',
            isActive: userData?.is_active ?? true,
            specialty: this.mapSpecialtyFromDB(userData?.specialty),
            email: userData?.email || finalEmail,
            photoUrl: userData?.photo_url,
            scope: userData?.scope,
            schoolInep: userData?.school_inep || undefined,
            mustChangePassword: userData?.must_change_password
        };

        // Salva no cache
        this.userProfileCache.set(user.id, user);

        return user;
    }

    // Limpa o cache (usado no logout)
    static clearProfileCache() {
        this.userProfileCache.clear();
    }

    /**
     * Busca o perfil do usuário pelo ID sem precisar autenticar (útil para sessões já ativas como Recovery)
     */
    static async getUserProfile(userId: string): Promise<User | null> {
        // Verifica cache primeiro - DESATIVADO TEMPORARIAMENTE para garantir leitura em tempo real
        // if (this.userProfileCache.has(userId)) {
        //     return this.userProfileCache.get(userId) || null;
        // }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            console.warn(`[SupabaseService] Perfil não encontrado no banco (ID: ${userId}). Motivo: ${profileError?.message || 'Dados vazios'}. Tentando recuperação via Metadados JWT...`);

            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user && session.user.id === userId) {
                console.log('[SupabaseService] Fallback de perfil bem-sucedido via JWT.');
                return {
                    id: session.user.id,
                    name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário',
                    username: session.user.email?.split('@')[0] || 'user',
                    role: (session.user.user_metadata?.role as UserRole) || 'ASSISTANT',
                    scope: session.user.user_metadata?.scope as any || 'GLOBAL',
                    isActive: true,
                    mustChangePassword: false,
                    email: session.user.email || undefined
                };
            }
            console.error('[SupabaseService] Falha crítica: Perfil ausente no banco e sem sessão JWT ativa.');
            return null;
        }

        const user: User = {
            id: profile.id,
            name: profile.full_name,
            username: profile.username || (profile.email ? profile.email.split('@')[0] : 'user'),
            role: profile.role,
            isActive: profile.is_active,
            specialty: this.mapSpecialtyFromDB(profile.specialty),
            email: profile.email,
            photoUrl: profile.photo_url,
            scope: profile.scope,
            schoolInep: profile.school_inep || undefined,
            mustChangePassword: profile.must_change_password
        };

        // Salva no cache
        this.userProfileCache.set(user.id, user);

        return user;
    }

    static async signUp(email: string, password: string, fullName: string, role: UserRole = 'ADMIN'): Promise<{ user: any, error: any }> {
        const finalEmail = email.includes('@') ? email : `${email}@brotar.com`;

        const { data, error } = await supabase.auth.signUp({
            email: finalEmail,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role
                }
            }
        });

        if (error) return { user: null, error };

        // O trigger no banco (se configurado) criará o profile. 
        // Se não houver trigger, criamos aqui manualmente se a policy permitir.
        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: data.user.id,
                    full_name: fullName,
                    role: role,
                    is_active: true,
                    username: email // Tenta salvar o original
                });

            if (profileError) console.warn('Erro ao criar perfil após signup:', profileError);
        }

        return { user: data.user, error: null };
    }

    static async logout() {
        await supabase.auth.signOut();
    }

    static onAuthStateChange(callback: (event: any, session: any) => void) {
        return supabase.auth.onAuthStateChange(callback);
    }

    static async updatePassword(newPassword: string) {
        return await supabase.auth.updateUser({ password: newPassword });
    }

    static async updateProfile(userId: string, data: any) {
        return await supabase.from('profiles').update(data).eq('id', userId);
    }

    static async resetPassword(email: string) {
        const finalEmail = email.includes('@') ? email : `${email}@brotar.com`;

        // Em produção, queremos que o link redirecione para a URL do site atual
        // O Supabase usa o window.location.origin se for passado, 
        // mas ele DEVE estar configurado no dashboard como Redirect URL ou Site URL.
        const redirectTo = `${window.location.origin}${window.location.pathname.startsWith('/') ? '' : '/'}?recovery=true`;

        console.log('[SupabaseService] Enviando reset para:', finalEmail, 'com redirectTo:', redirectTo);

        return await supabase.auth.resetPasswordForEmail(finalEmail, {
            redirectTo: redirectTo,
        });
    }

    // --- Admin User Creation (Safe Mode) ---
    /**
     * Cria um usuário (Auth + Profile) sem deslogar o admin atual.
     * Usa uma instância isolada do cliente Supabase.
     */
    static async createAccountAsAdmin(newUser: User, passwordRaw: string): Promise<{ success: boolean, error?: string, warning?: string }> {
        try {
            // 1. Cria um cliente temporário que NÃO persiste sessão (não afeta o Admin logado)
            // Extrai as chaves do cliente global para evitar usar import.meta.env que dá erro de lint
            const supabaseUrl = (supabase as any).supabaseUrl;
            const supabaseAnonKey = (supabase as any).supabaseKey;

            if (!supabaseUrl || !supabaseAnonKey) {
                console.error('[SupabaseService] URL ou Key ausentes no cliente global!');
                return { success: false, error: 'Erro de configuração do Supabase (URL/Key ausentes).' };
            }

            const tempClient = createClient(
                supabaseUrl,
                supabaseAnonKey,
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                        detectSessionInUrl: false
                    }
                }
            );

            // Normaliza username para email
            const authEmail = newUser.username.includes('@')
                ? newUser.username
                : `${newUser.username}@brotar.com`;

            // 2. Cria o usuário no Auth
            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: authEmail,
                password: passwordRaw,
                options: {
                    data: {
                        full_name: newUser.name,
                        role: newUser.role
                    }
                }
            });

            if (authError) {
                // Se já existe, tentamos "recuperar" o perfil se a senha bater (caso de orfão)
                if (authError.message.includes('already registered')) {
                    const { data: loginData, error: loginError } = await tempClient.auth.signInWithPassword({
                        email: authEmail,
                        password: passwordRaw
                    });

                    if (!loginError && loginData.user) {
                        // Sucesso! O usuário existe e a senha bate. Vamos recriar o perfil.
                        // Prossegue para o passo 3 usando loginData.user.id
                        // sobrescrevendo authData para continuar o fluxo abaixo
                        authData.user = loginData.user;
                    } else {
                        // Senha não bate ou outro erro
                        return { success: false, error: 'Este e-mail já está cadastrado (e a senha não confere para recuperação).' };
                    }
                } else {
                    // Outros erros reais
                    if (authError.message.includes('Password')) return { success: false, error: 'A senha é muito fraca (mínimo 6 caracteres).' };
                    return { success: false, error: authError.message };
                }
            } else {
                // Caso normal (criou novo)
                if (!authData.user) return { success: false, error: 'Erro desconhecido ao criar usuário.' };
            }

            // 3. O Profile deve ser criado automaticamente pelo Trigger ou manualmente aqui.
            // Para garantir, fazemos um upsert manual no Profile usando o cliente PRINCIPAL (Admin) 
            // pois o tempClient pode não ter permissão de INSERT em profiles dependendo do RLS, mas o Admin tem.
            // O ID deve ser o mesmo gerado na auth.

            // Mapeamento manual para garantir compatibilidade com o Enum do Banco
            const specialtyMap: Record<string, string> = {
                'Psicologia': 'PSICOLOGIA',
                'Fonoaudiologia': 'FONOAUDIOLOGIA',
                'Psicopedagogia': 'PSICOPEDAGOGIA',
                'Terapia Ocupacional': 'TERAPIA_OCUPACIONAL',
                'Serviço Social': 'SERVICO_SOCIAL',
                'Fisioterapia': 'FISIOTERAPIA',
                'Enfermagem': 'ENFERMAGEM',
                'Nutrição': 'NUTRICAO'
            };

            const dbSpecialty = newUser.specialty ? (specialtyMap[newUser.specialty] || null) : null;

            const profilePayload = {
                id: authData.user.id,
                full_name: newUser.name,
                username: newUser.username,
                role: newUser.role,
                specialty: dbSpecialty, // Usa o valor mapeado
                is_active: newUser.isActive,
                scope: newUser.scope,
                job_title: newUser.jobTitle,
                phone: newUser.phone,
                email: newUser.email || authEmail,
                photo_url: newUser.photoUrl,
                address: newUser.address,
                school_inep: newUser.schoolInep
            };

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert(profilePayload);

            if (profileError) {
                console.error('Usuário Auth criado, mas erro ao salvar detalhes do perfil:', profileError);
                return {
                    success: true,
                    warning: 'Usuário criado, mas o perfil não foi salvo corretamente no banco de dados. Erro: ' + profileError.message
                };
            }

            return { success: true };

        } catch (error: any) {
            console.error('Erro crítico na criação de usuário:', error);
            return { success: false, error: error.message || 'Erro interno.' };
        }
    }

    static async getStudents(unit?: Unit): Promise<Student[]> {
        const cacheKey = `students_${unit || 'all'}`;
        const cached = this.getFromCache<Student[]>(cacheKey);
        if (cached) return cached;

        return safeCall(async () => {
            console.log(`[SupabaseService] Buscando alunos (${unit || 'Global'}) com Projeção Estrita...`);
            
            // Otimização Definitiva: Apenas os campos necessários para a listagem.
            let query = supabase
                .from('students')
                .select('id, full_name, birth_date, cpf, school_id, photo_url, status, unit')
                .order('full_name');

            // Filtragem no Lado do Servidor (Server-Side) por Unidade
            if (unit) {
                query = query.eq('unit', unit);
            }

            const { data, error } = await query;
            if (error) throw error;

            const students = (data || []).map(s => mapStudentFromDB(s));
            this.setInCache(cacheKey, students);
            return students;
        }, 0, 300, 'getStudents'); // Retries: 0 para listagem
    }

    static async getStudentSessions(studentId: string): Promise<Session[]> {
        const { data, error } = await supabase
            .from('clinical_sessions')
            .select('*')
            .eq('student_id', studentId)
            .order('date', { ascending: false });

        if (error) {
            console.error('[SupabaseService] Erro ao buscar sessões:', error);
            return [];
        }

        return data.map((s: any) => ({
            id: s.id,
            date: s.date,
            specialty: s.specialty,
            professionalName: 'Profissional',
            notes: s.content?.summary || s.content?.objetivo || s.content?.resumo || 'Atendimento realizado',
            content: s.content,
        }));
    }

    static async saveStudent(student: Student, photoFile?: File, documentFiles?: { file: File, type: string }[]): Promise<string> {
        // [DEBUG] Log user context for RLS
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[SupabaseService] Tentando salvar como usuário:', session?.user?.id);

        let finalPhotoUrl = student.photoUrl;

        // 1. Upload da foto se houver
        if (photoFile) {
            try {
                const fileName = `student_${Date.now()}_${photoFile.name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('students-photos')
                    .upload(fileName, photoFile);

                if (uploadError) {
                    console.error("ERRO UPLOAD FOTO:", uploadError);
                    throw new Error(`Falha no upload da foto: ${uploadError.message}`);
                }
                if (uploadData) {
                    const { data: publicUrlData } = supabase.storage
                        .from('students-photos')
                        .getPublicUrl(uploadData.path);
                    finalPhotoUrl = publicUrlData.publicUrl;
                }
            } catch (error: any) {
                console.error("Erro no upload da foto:", error);
            }
        }

        const sanitizeField = (value: string | undefined | null) => {
            if (!value || typeof value !== 'string') return null;
            const cleaned = value.trim();
            return cleaned === '' ? null : cleaned;
        };

        // dbPayload obrigatório com school_id para permitir atualização de vínculo via upsert
        const dbPayload: any = {
            full_name: student.fullName,
            birth_date: student.birthDate,
            cpf: sanitizeCPF(student.cpf) || null,
            sus_card: sanitizeField(student.susCard),
            grade: student.school.grade,
            shift: student.school.shift,
            school_id: sanitizeField(student.school.schoolId) || null, // Vínculo da escola obrigatório
            ethnicity: sanitizeField(student.ethnicity),
            address: student.address,
            guardians: student.guardians,
            photo_url: finalPhotoUrl,
            documents: student.documents || [],
            clinical_info: {
                ...student.clinical,
                gender: student.gender,
                rg: sanitizeField(student.rg),
                fatherName: student.fatherName,
                motherName: student.motherName,
                nationality: student.nationality,
                birthPlace: student.birthPlace
            },
            social_info: student.socialInfo || {},
            status: student.status
        };

        // 2. Upload de Documentos
        if (documentFiles && documentFiles.length > 0) {
            const uploadedDocs = [];
            for (const docItem of documentFiles) {
                try {
                    const saneFileName = docItem.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const filePath = `docs/${Date.now()}_${saneFileName}`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('student-documents')
                        .upload(filePath, docItem.file);

                    if (uploadError) throw uploadError;

                    const { data: publicUrlData } = supabase.storage
                        .from('student-documents')
                        .getPublicUrl(filePath);

                    uploadedDocs.push({
                        id: crypto.randomUUID(),
                        type: docItem.type,
                        fileName: docItem.file.name,
                        url: publicUrlData.publicUrl,
                        uploadedAt: new Date().toISOString()
                    });
                } catch (docErr) {
                    console.error(`Erro ao enviar documento:`, docErr);
                }
            }
            dbPayload.documents = [...(student.documents || []), ...uploadedDocs];
        }

        if (student.id && student.id.length > 5) {
            dbPayload.id = student.id;
        }

        console.log(`[SupabaseService] Realizando upsert do aluno com conflito no CPF...`);
        // Salvamento atômico exclusivo via Upsert com onConflict no CPF
        const { data, error } = await supabase
            .from('students')
            .upsert(dbPayload, { onConflict: 'cpf' })
            .select('id')
            .single();

        if (error) {
            console.error('Erro ao salvar aluno (Upsert):', error);
            // Mensagem clara para o usuário sobre a impossibilidade de salvar ou erro de RLS
            if (error.code === '42501' || error.message.includes('RLS') || error.message.includes('permission denied')) {
                 throw new Error('Acesso negado: Não foi possível salvar ou transferir o registro. Verifique as permissões da escola ou se o CPF pertence a outra unidade restrita.');
            }
            throw new Error(`Erro ao salvar dados: ${error.message}`);
        }

        if (!data) throw new Error('Erro ao salvar aluno: Operação não retornou dados.');

        return data.id;
    }

    static async deleteStudent(id: string): Promise<void> {
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) throw error;
        
        // Invalida o cache
        this.invalidateCache('students_');
    }

    // --- Intelligent Import & Lookup ---

    /**
     * Busca IDs de escolas por nomes (lookup inteligente)
     */
    static async lookupSchoolsByNames(names: string[]): Promise<Record<string, string>> {
        if (names.length === 0) return {};
        const uniqueNames = [...new Set(names.filter(Boolean))];

        const { data, error } = await supabase
            .from('schools')
            .select('id, name')
            .in('name', uniqueNames);

        if (error) {
            console.error('[SupabaseService] Erro no lookup de escolas:', error);
            return {};
        }

        return (data || []).reduce((acc: any, school: any) => {
            acc[school.name] = school.id;
            return acc;
        }, {});
    }

    /**
     * Busca IDs de alunos por nomes ou CPFs (lookup inteligente para ATs)
     */
    static async lookupStudentsByNamesOrCPF(identifiers: { name?: string, cpf?: string }[]): Promise<Record<string, string>> {
        if (identifiers.length === 0) return {};

        const names = identifiers.map(i => i.name).filter(Boolean) as string[];
        const cpfs = identifiers.map(i => sanitizeCPF(i.cpf)).filter(Boolean) as string[];

        let query = supabase.from('students').select('id, full_name, cpf');

        if (names.length > 0 && cpfs.length > 0) {
            query = query.or(`full_name.in.(${names.map(n => `"${n}"`).join(',')}),cpf.in.(${cpfs.join(',')})`);
        } else if (names.length > 0) {
            query = query.in('full_name', names);
        } else if (cpfs.length > 0) {
            query = query.in('cpf', cpfs);
        } else {
            return {};
        }

        const { data, error } = await query;
        if (error) {
            console.error('[SupabaseService] Erro no lookup de alunos:', error);
            return {};
        }

        const map: Record<string, string> = {};
        (data || []).forEach((s: any) => {
            if (s.full_name) map[s.full_name] = s.id;
            if (s.cpf) map[s.cpf] = s.id;
        });
        return map;
    }

    /**
     * Importação massiva de Alunos com Auditoria
     */
    static async importStudentsInBulk(students: any[], currentUser: Pick<User, 'name' | 'email' | 'role'>): Promise<{ success: number, errors: any[] }> {
        const results = { success: 0, errors: [] as any[] };

        // Chunk sizes for performance and safety
        const CHUNK_SIZE = 100;
        for (let i = 0; i < students.length; i += CHUNK_SIZE) {
            const chunk = students.slice(i, i + CHUNK_SIZE);
            const payloads = chunk.map(s => ({
                full_name: s.fullName,
                birth_date: s.birthDate,
                cpf: sanitizeCPF(s.cpf) || null,
                sus_card: sanitizeCPF(s.susCard) || null,
                school_id: s.schoolId || null,
                grade: s.grade || '',
                shift: s.shift || 'Manhã',
                status: 'Active',
                clinical_info: s.clinical || {},
                address: s.address || {},
                guardians: s.guardians || []
            }));

            const { data, error } = await supabase.from('students').upsert(payloads, { onConflict: 'cpf' }).select('id, full_name');

            if (error) {
                console.error('[SupabaseService] Erro no chunk de importação:', error);
                results.errors.push({ chunk: i / CHUNK_SIZE, message: error.message });
            } else {
                results.success += (data?.length || 0);
                // Log audit individual (ou resumo se for muito grande)
                if (data && data.length > 0) {
                    await this.logAction(currentUser, AuditAction.CREATE, 'ALUNOS', `Importação massiva: ${data.length} alunos`);
                }
            }
        }

        this.invalidateCache('students_'); // Invalida cache de alunos após importação
        return results;
    }

    /**
     * Importação massiva de Profissionais de Apoio com Auditoria
     * 
     * CORREÇÃO: Separa profissionais com e sem CPF para evitar o erro do Postgres
     * ao tentar `upsert` com `onConflict: 'cpf'` em registros com CPF nulo.
     * NULL != NULL no Postgres, então o upsert por cpf nulo é inválido.
     */
    static async importProfessionalsInBulk(professionals: any[], currentUser: Pick<User, 'name' | 'email' | 'role'>): Promise<{ success: number, errors: any[] }> {
        const results = { success: 0, errors: [] as any[] };

        // Normalização dos tipos antes de enviar
        const profPayloads = professionals.map(p => ({
            name: p.name || '',
            cpf: p.cpf || '',
            phone: p.phone || '',
            email: p.email || '',
            education: p.education || '',
            contractStartDate: p.contractStartDate || '',
            workload: p.workload || '',
            address: p.address || {},
            schoolId: p.schoolId || null,
            studentId: p.studentId || null,
            regentTeacher: p.regentTeacher || ''
        }));

        try {
            await this.upsertSupportProfessionals(profPayloads);
            results.success = profPayloads.length;
            
            await this.logAction(currentUser, AuditAction.CREATE, 'PROFISSIONAIS', `Importação massiva: ${results.success} profissionais de apoio processados via upsert único.`);
        } catch (err: any) {
            console.error('[SupabaseService] Erro na importação massiva:', err.message);
            results.errors.push({ chunk: 0, message: err.message });
        }

        return results;
    }

    // --- Clinical Sessions (Evoluções) ---
    static async saveSession(session: Session, studentId: string, professionalId: string): Promise<void> {
        await supabase.from('clinical_sessions').insert({
            student_id: studentId,
            professional_id: professionalId,
            specialty: session.specialty,
            date: session.date,
            content: session.content || { summary: session.notes }, // Usa o content completo se existir
            private_notes: session.privateNotes
        });
    }

    static async deleteSession(sessionId: string): Promise<void> {
        const { error } = await supabase.from('clinical_sessions').delete().eq('id', sessionId);
        if (error) throw error;
    }

    // --- Falta implementar tabelas secundárias (Escolas, etc) ---
    // Mantendo compatibilidade básica
    // --- Schools ---
    static async getSchools(): Promise<School[]> {
        const cacheKey = 'schools_list';
        const cached = this.getFromCache<School[]>(cacheKey);
        if (cached) return cached;

        try {
            // Projeção Estrita: Apenas campos necessários para a lista de escolas.
            const { data, error } = await supabase
                .from('schools')
                .select('id, name, inep, director, phone, district, is_active')
                .order('name');

            if (error) throw error;

            const schools = (data || []).map((s: any) => ({
                id: s.id || '',
                name: s.name || 'Escola sem Nome',
                inep: s.inep || '',
                director: s.director || '',
                phone: s.phone || '',
                district: s.district || s.address?.district || 'Sede',
                isActive: s.is_active === true
            }));

            this.setInCache(cacheKey, schools);
            return schools;
        } catch (err) {
            console.error('[SupabaseService] Erro fatal em getSchools:', err);
            return [];
        }
    }

    static async saveSchool(school: School): Promise<void> {
        const payload: any = {
            name: school.name,
            inep: school.inep,
            director: school.director,
            phone: school.phone,
            district: school.district,
            is_active: school.isActive,
            address: school.address,
            has_internet: school.hasInternet,
            internet_type: school.internetType
        };

        if (school.id) {
            payload.id = school.id;
        }

        const { error } = await supabase.from('schools').upsert(payload);
        if (error) {
            console.error('Erro ao salvar escola:', error);
            throw error;
        }

        // Invalida cache de escolas
        this.invalidateCache('schools_list');
        this.invalidateCache('students_'); // Pode afetar nomes de escolas nos alunos

        // Tentar criar acesso Auth para a Escola
        try {
            const schoolUser: User = {
                id: school.id || '',
                name: school.name,
                username: school.inep, // O email real será {inep}@escola.brotar no backend/createAccountAsAdmin
                role: 'ESCOLA',
                isActive: school.isActive,
                scope: 'GLOBAL',
                schoolInep: school.inep
            };
            // A senha padrão é 123456
            await SupabaseService.createAccountAsAdmin(schoolUser, '123456');
        } catch (e) {
            console.warn('Erro ao tentar criar conta de acesso para a escola (pode já existir):', e);
        }
    }

    // --- Users (Profiles) ---
    static async getUsers(unit?: Unit): Promise<User[]> {
        let query = supabase.from('profiles').select('*');

        if (unit) {
            // Inclui usuários do escopo específico E usuários GLOBAIS (essencial para especialistas)
            query = query.or(`scope.eq.${unit},scope.eq.GLOBAL`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Erro ao buscar usuários:', error);
            return [];
        }
        const specialtyReverseMap: Record<string, Specialty> = {
            'PSICOLOGIA': Specialty.PSYCHOLOGY,
            'FONOAUDIOLOGIA': Specialty.SPEECH_THERAPY,
            'PSICOPEDAGOGIA': Specialty.PSYCHOPEDAGOGY,
            'TERAPIA_OCUPACIONAL': Specialty.OCCUPATIONAL_THERAPY,
            'SERVICO_SOCIAL': Specialty.SOCIAL_WORK,
            'FISIOTERAPIA': Specialty.PHYSIOTHERAPY,
            'ENFERMAGEM': 'Enfermagem' as any,
            'NUTRICAO': Specialty.NUTRITION
        };

        return (data || []).map((p: any) => ({
            id: p.id,
            name: p.full_name,
            username: p.username || p.email,
            email: p.email,
            role: p.role,
            specialty: p.specialty ? (specialtyReverseMap[p.specialty] || p.specialty) : undefined,
            isActive: p.is_active,
            scope: p.scope || 'GLOBAL',
            jobTitle: p.job_title,
            phone: p.phone,
            photoUrl: p.photo_url,
            address: p.address || {},
            mustChangePassword: p.must_change_password,
            password: ''
        }));
    }

    static async saveUser(user: User): Promise<void> {
        // NOTA: Criar usuário no Auth requer admin API ou fluxo de signup.
        // Aqui atualizamos apenas o PERFIL.

        const specialtyMap: Record<string, string> = {
            'Psicologia': 'PSICOLOGIA',
            'Fonoaudiologia': 'FONOAUDIOLOGIA',
            'Psicopedagogia': 'PSICOPEDAGOGIA',
            'Terapia Ocupacional': 'TERAPIA_OCUPACIONAL',
            'Serviço Social': 'SERVICO_SOCIAL',
            'Fisioterapia': 'FISIOTERAPIA',
            'Enfermagem': 'ENFERMAGEM',
            'Nutrição': 'NUTRICAO'
        };

        const dbSpecialty = user.specialty ? (specialtyMap[user.specialty] || user.specialty) : null;

        const payload = {
            full_name: user.name,
            username: user.username,
            role: user.role,
            specialty: dbSpecialty,
            is_active: user.isActive,
            scope: user.scope,
            job_title: user.jobTitle,
            phone: user.phone,
            email: user.email,
            photo_url: user.photoUrl,
            address: user.address
        };

        // Sanitização: remove chaves undefined
        Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);

        let error;
        if (user.id && user.id.length > 5) {
            const { error: updateError } = await supabase.from('profiles').update(payload).eq('id', user.id);
            error = updateError;
        } else {
            console.warn('Criação de usuário via SupabaseService requer auth.signUp.');
            const { error: insertError } = await supabase.from('profiles').insert(payload);
            error = insertError;
        }

        if (error) {
            console.error('Erro ao salvar usuário (Perfil):', error);
            throw new Error(`Erro ao salvar perfil: ${error.message}`);
        }
    }

    static async deleteUser(id: string): Promise<void> {
        // Tenta usar a RPC completa primeiro (remove Auth + Profile)
        const { error: rpcError } = await supabase.rpc('delete_user_complete', { target_user_id: id });
        if (rpcError) {
            console.warn('Erro na RPC de exclusão (talvez função não exista), tentando método legado:', rpcError);

            // Fallback: Exclusão apenas do usuário (não remove Auth, mas remove da lista visual)
            const { error, data } = await supabase.from('profiles').delete().eq('id', id).select();

            if (error) {
                console.error('Erro ao excluir perfil de usuário:', error);
                throw error;
            }

            // [FIX] Verifica se algo foi realmente deletado
            if (!data || data.length === 0) {
                console.error('Exclusão silenciada (RLS ou RPC ausente).');
                throw new Error(
                    `ERRO DE PERMISSÃO / FALHA TÉCNICA:\n\n` +
                    `Supabase RPC Error: ${rpcError.message} (Code: ${rpcError.code})\n\n` +
                    `Causa provável: A função "delete_user_complete" não existe ou você não tem permissão para executá-la.\n` +
                    `Por favor, execute o script SQL enviado (incluindo os GRANTs) no SQL Editor.`
                );
            }
        }
    }

    static async setUserPassword(userId: string, newPassword: string): Promise<{ success: boolean, error?: string }> {
        const { data, error } = await supabase.rpc('set_user_password', {
            target_user_id: userId,
            new_password: newPassword
        });

        if (error) {
            console.error('Erro ao executar RPC set_user_password:', error);
            return { success: false, error: error.message };
        }

        return data as { success: boolean, error?: string };
    }

    // --- System Settings ---
    static async getSystemSettings(): Promise<SystemSettings> {
        const cacheKey = 'system_settings';
        const cached = this.getFromCache<SystemSettings>(cacheKey);
        if (cached) return cached;

        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('*')
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 means "no rows found"

            const settings = {
                systemName: data?.system_name || 'Sistema Brotar',
                logoUrl: data?.logo_url || null,
                loginBackgroundImage: data?.login_background_image || null,
                showLoginInfo: data?.show_login_info ?? true,
                activeThemeId: data?.active_theme_id || 'default'
            };

            this.setInCache(cacheKey, settings);
            return settings;
        } catch (error) {
            console.error('Erro ao buscar configurações:', error);
            return {
                systemName: 'Sistema Brotar',
                activeThemeId: 'default'
            };
        }
    }

    static async saveSystemSettings(settings: SystemSettings): Promise<void> {
        const payload = {
            id: 'settings', // ID único para garantir que sempre atualizamos o mesmo registro
            system_name: settings.systemName,
            active_theme_id: settings.activeThemeId,
            logo_url: settings.logoUrl,
            login_background_image: settings.loginBackgroundImage,
            show_login_info: settings.showLoginInfo
        };

        // Cache local para carregamento instantâneo
        try {
            localStorage.setItem('brotar_system_settings', JSON.stringify(payload));
        } catch (e) {
            console.warn('Cache local cheio ou indisponível. A imagem será salva apenas no servidor.', e);
            // Podemos tentar limpar cache antigo se necessário, ou apenas ignorar
        }

        // Assumindo que existe apenas um registro de settings (id 1 ou similar)
        // Ou fazemos upsert baseado em uma chave fixa se a tabela for singleton
        const { error } = await supabase.from('system_settings').upsert({ id: 1, ...payload });
        if (error) throw error;
    }

    // Para compatibilidade síncrona inicial no App.tsx
    static getSystemSettingsSync(): SystemSettings {
        try {
            const cached = localStorage.getItem('brotar_system_settings');
            if (cached) {
                const data = JSON.parse(cached);
                return {
                    systemName: data.system_name || 'Brotar 2.0',
                    activeThemeId: data.active_theme_id || 'teal-default',
                    logoUrl: data.logo_url || '',
                    loginBackgroundImage: data.login_background_image || '',
                    showLoginInfo: data.show_login_info ?? true
                };
            }
        } catch (e) {
            console.warn('Erro ao ler cache de settings:', e);
        }
        return { systemName: 'Brotar 2.0', activeThemeId: 'teal-default', logoUrl: '' };
    }

    // --- Papel Timbrado ---
    static async getPapelTimbradoConfig(unit?: Unit): Promise<PapelTimbradoConfig> {
        // Mapeamento de ID por Unidade
        const unitId = unit === 'COCAL' ? 2 : 1;

        const { data, error } = await supabase
            .from('letterhead_config')
            .select('*')
            .eq('id', unitId)
            .single();

        if (error || !data) {
            console.error(`Falha ao buscar cabeçalho para unidade ${unit || 'SEDE'}. Usando padrão.`, error);
            return {
                tituloLinha1: "PREFEITURA MUNICIPAL DE BROTAS DE MACAÚBAS",
                tituloLinha2: "SECRETARIA MUNICIPAL DE EDUCAÇÃO",
                tituloLinha3: unit === 'COCAL' ? "UNIDADE DISTRITAL DE COCAL" : "CENTRO MULTIDISCIPLINAR DE ATENDIMENTO EDUCACIONAL",
                cnpj: "", endereco: "", telefone: "", rodapeTexto: "",
                logoUrl: "", rodapeImg: "",
                showLogo: true, showTitulos: true, showContato: true
            };
        }

        return {
            logoUrl: data.logo_url,
            tituloLinha1: data.title_l1,
            tituloLinha2: data.title_l2,
            tituloLinha3: data.title_l3,
            cnpj: data.cnpj,
            endereco: data.address,
            telefone: data.phone,
            rodapeTexto: data.footer_text,
            rodapeImg: data.footer_img,
            showLogo: data.show_logo,
            showTitulos: data.show_titles,
            showContato: data.show_contact
        };
    }

    static async savePapelTimbradoConfig(config: PapelTimbradoConfig, unit?: Unit): Promise<void> {
        const unitId = unit === 'COCAL' ? 2 : 1;
        const payload = {
            title_l1: config.tituloLinha1,
            title_l2: config.tituloLinha2,
            title_l3: config.tituloLinha3,
            cnpj: config.cnpj,
            address: config.endereco,
            phone: config.telefone,
            footer_text: config.rodapeTexto,
            footer_img: config.rodapeImg,
            logo_url: config.logoUrl,
            show_logo: config.showLogo,
            show_titles: config.showTitulos,
            show_contact: config.showContato
        };

        const { error } = await supabase.from('letterhead_config').upsert({ id: unitId, ...payload });
        if (error) {
            console.error('Erro ao salvar config papel timbrado:', error);
            throw error;
        }
    }

    // --- Notificações / Avisos ---
    // --- Notificações / Avisos ---
    static async getNotifications(userId: string): Promise<any[]> {
        // --- LIMPEZA AUTOMÁTICA REMOVIDA DA QUERY SÍNCRONA (Aumentava latência do login) ---
        // A limpeza deve ocorrer via Cron Job ou Worker em background, não no fetch do usuário.

        // Busca mensagens onde o usuário é o destinatário
        const { data, error } = await supabase
            .from('system_messages')
            .select(`
                *,
                sender:profiles!fk_sender (full_name, role)
            `)
            .eq('recipient_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar notificações:', error);
            return [];
        }
        return data || [];
    }

    static async getSentMessages(userId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('system_messages')
            .select(`
                *,
                recipient:profiles!fk_recipient (full_name, role)
            `)
            .eq('sender_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar mensagens enviadas:', error);
            return [];
        }
        return data || [];
    }

    static async markAsRead(messageId: string): Promise<void> {
        const { error } = await supabase
            .from('system_messages')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', messageId);

        if (error) {
            console.error('Erro ao marcar mensagem como lida no Supabase:', error);
            throw error;
        }
    }

    static async deleteSystemMessage(messageId: string): Promise<void> {
        const { error } = await supabase
            .from('system_messages')
            .delete()
            .eq('id', messageId);

        if (error) {
            console.error('Erro ao excluir mensagem no Supabase:', error);
            throw error;
        }
    }

    static async sendSystemMessage(senderId: string, recipientId: string, title: string, content: string, priority: 'normal' | 'urgent' = 'normal', type: 'ALERT' | 'MESSAGE' = 'ALERT'): Promise<void> {
        const { error } = await supabase
            .from('system_messages')
            .insert({
                sender_id: senderId,
                recipient_id: recipientId,
                title,
                content,
                priority,
                type
            });

        if (error) {
            console.error('Erro ao enviar mensagem:', error);
            throw error;
        }
    }

    /**
     * Envia um alerta automático do sistema para um usuário.
     * Usado para notificações de agendamentos, novos cadastros, etc.
     */
    static async sendSystemAlert(recipientId: string, title: string, content: string, priority: 'normal' | 'urgent' = 'normal'): Promise<void> {
        // O ID do remetente 'Sistema' é o do Admin principal ou um UUID fixo se houver.
        // Aqui usamos o ID do usuário que gerou a ação (se logado) ou um reservado do sistema.
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        return this.sendSystemMessage(user.id, recipientId, title, content, priority, 'ALERT');
    }

    // --- IPO Portage ---
    static async savePortageAssessment(studentId: string, assessment: PortageAssessment): Promise<void> {
        // Busca dados atuais para garantir que não sobrescrevemos outros campos do clinical_info
        const { data: student, error } = await supabase
            .from('students')
            .select('clinical_info')
            .eq('id', studentId)
            .single();

        if (error || !student) throw new Error("Erro ao buscar aluno para salvar avaliação Portage.");

        const clinicalInfo = student.clinical_info || {};
        const ppData = clinicalInfo.pp_data || {};
        const currentHistory = Array.isArray(ppData.ipoHistory) ? ppData.ipoHistory : [];

        // Adiciona a nova avaliação ao histórico
        const updatedHistory = [assessment, ...currentHistory];

        const { error: updateError } = await supabase
            .from('students')
            .update({
                clinical_info: {
                    ...clinicalInfo,
                    pp_data: {
                        ...ppData,
                        ipoHistory: updatedHistory
                    }
                }
            })
            .eq('id', studentId);

        if (updateError) throw updateError;
    }

    // --- Scheduling Center (Agendamentos) ---
    static async getAppointments(filters: { date?: string, fromDate?: string, unit?: Unit, specialty?: Specialty, status?: AppointmentStatus, studentId?: string, professionalId?: string }): Promise<Appointment[]> {
        let query = supabase.from('appointments').select('*');

        if (filters.date) {
            query = query.eq('date', filters.date);
        } else if (filters.fromDate) {
            query = query.gte('date', filters.fromDate);
        }
        if (filters.unit) query = query.eq('unit', filters.unit);
        if (filters.studentId) query = query.eq('student_id', filters.studentId);
        if (filters.professionalId) query = query.eq('professional_id', filters.professionalId);
        if (filters.specialty) {
            const dbSpecialty = this.SPECIALTY_MAP[filters.specialty] || filters.specialty;
            query = query.eq('specialty', dbSpecialty);
        }
        if (filters.status) query = query.eq('status', filters.status);

        const { data, error } = await query.order('start_time', { ascending: true });

        if (error) {
            console.error('Erro ao buscar agendamentos:', error);
            return [];
        }

        return (data || []).map((a: any) => ({
            id: a.id,
            studentId: a.student_id,
            studentName: a.student_name,
            professionalId: a.professional_id,
            professionalName: a.professional_name,
            specialty: a.specialty ? (this.REVERSE_SPECIALTY_MAP[a.specialty] || a.specialty) : undefined,
            unit: a.unit,
            date: a.date,
            startTime: a.start_time,
            endTime: a.end_time,
            status: a.status,
            statusConfirmacao: a.status_confirmacao,
            telefoneResponsavel: a.telefone_responsavel,
            notes: a.notes,
            createdAt: a.created_at
        }));
    }

    static async saveAppointment(appointment: Partial<Appointment>): Promise<string> {
        const payload: any = {
            student_id: appointment.studentId,
            student_name: appointment.studentName,
            professional_id: appointment.professionalId,
            professional_name: appointment.professionalName,
            specialty: appointment.specialty ? (this.SPECIALTY_MAP[appointment.specialty] || appointment.specialty) : undefined,
            unit: appointment.unit,
            date: appointment.date,
            start_time: appointment.startTime,
            end_time: appointment.endTime,
            status: appointment.status || 'AGENDADO',
            telefone_responsavel: appointment.telefoneResponsavel,
            notes: appointment.notes
        };

        if (appointment.id) payload.id = appointment.id;

        const { data, error } = await supabase
            .from('appointments')
            .upsert(payload)
            .select('id')
            .single();

        if (error) {
            console.error('Erro detalhado ao salvar agendamento:', error);
            throw error;
        }

        if (!data) {
            throw new Error("Erro ao salvar agendamento: Nenhum ID retornado.");
        }

        const savedId = data.id;

        // --- Alerta Automático (Sino) ---
        // Se for um novo agendamento (não tem ID no momento da criação ou é um upsert que queremos notificar)
        if (!appointment.id && appointment.professionalId) {
            try {
                const dateFmt = new Date(appointment.date!).toLocaleDateString('pt-BR');
                await this.sendSystemAlert(
                    appointment.professionalId,
                    'Novo Agendamento',
                    `Você tem um novo agendamento para o aluno ${appointment.studentName} no dia ${dateFmt} às ${appointment.startTime}.`,
                    'normal'
                );
            } catch (alertError) {
                console.warn('Falha silenciosa ao enviar alerta de agendamento:', alertError);
            }
        }

        return savedId;
    }

    static async deleteAppointment(id: string): Promise<void> {
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        if (error) {
            console.error('Erro ao excluir agendamento:', error);
            throw error;
        }
    }

    static async updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
        const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
        if (error) {
            console.error('Erro ao atualizar status do agendamento:', error);
            throw error;
        }
    }

    static async updateAppointmentFields(id: string, updates: { status?: string, notes?: string }): Promise<void> {
        const { error } = await supabase.from('appointments').update(updates).eq('id', id);
        if (error) {
            console.error('Erro ao atualizar campos do agendamento:', error);
            throw error;
        }
    }

    static async getProfessionalsBySpecialty(specialty: Specialty): Promise<User[]> {
        const dbSpecialty = this.SPECIALTY_MAP[specialty] || specialty;
        console.log('[SupabaseService] Buscando profissionais para especialidade:', { specialty, dbSpecialty });

        try {
            // Busca simplificada: pega todos os especialistas e filtra no código para evitar erros de sintaxe .or()
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'SPECIALIST');

            if (error) {
                console.error('[SupabaseService] Erro ao buscar perfis de especialistas:', error);
                throw error;
            }

            const allProfessionals = data || [];
            console.log(`[SupabaseService] Total de especialistas (role=SPECIALIST) encontrados: ${allProfessionals.length}`);

            let filtered = allProfessionals.filter((p: any) => {
                const pSpec = (p.specialty || '').toUpperCase();
                const targetStandard = dbSpecialty.toString().toUpperCase();
                const targetOriginal = specialty.toString().toUpperCase();
                const pJob = (p.job_title || '').toUpperCase();

                const isMatch = pSpec === targetStandard ||
                    pSpec === targetOriginal ||
                    pJob.includes(targetStandard) ||
                    pJob.includes(targetOriginal);

                if (isMatch) {
                    console.log(`[SupabaseService] Match confirmado para: ${p.full_name} (${pSpec} / ${pJob})`);
                }

                return isMatch;
            });

            // Se o filtro específico falhou mas existem especialistas, retorna avisando ou retorna todos como fallback?
            // Melhor retornar todos como fallback se o filtro por especialidade estiver vindo vazio mas houver especialistas.
            if (filtered.length === 0 && allProfessionals.length > 0) {
                console.warn(`[SupabaseService] Nenhum especialista encontrado para "${specialty}". Retornando todos os especialistas como fallback.`);
                filtered = allProfessionals;
            }

            console.log(`[App-Auth] Filtro concluído. Profissionais retornados: ${filtered.length}`);
            return filtered.map((p: any) => this.mapProfileToUser(p));

        } catch (error) {
            console.error('[SupabaseService] Erro fatal em getProfessionalsBySpecialty:', error);
            return [];
        }
    }

    // Método auxiliar para evitar duplicação de lógica de mapeamento
    private static mapProfileToUser(p: any): User {
        return {
            id: p.id,
            name: p.full_name,
            username: p.username || p.email,
            email: p.email,
            role: p.role,
            specialty: p.specialty ? (this.REVERSE_SPECIALTY_MAP[p.specialty] || this.REVERSE_SPECIALTY_MAP[p.specialty.toUpperCase()] || p.specialty) : undefined,
            isActive: p.is_active,
            scope: p.scope || 'GLOBAL',
            jobTitle: p.job_title,
            phone: p.phone,
            photoUrl: p.photo_url,
            address: p.address || {},
            password: ''
        };
    }

    static async getStudentsByUnit(unit: Unit): Promise<Student[]> {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('address->district', unit === 'COCAL' ? 'COCAL' : 'SEDE'); // Lógica simplificada baseada no endereço

        if (error) return [];
        return data as Student[];
    }

    // --- Generated Documents ---
    static async getDocuments(studentId?: string): Promise<SavedDocument[]> {
        let query = supabase.from('generated_documents').select('*');
        if (studentId) query = query.eq('student_id', studentId);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) return [];

        return data.map((d: any) => ({
            id: d.id,
            studentId: d.student_id,
            studentName: d.student_name,
            docType: d.doc_type,
            code: d.document_code,
            content: d.content,
            createdAt: d.created_at,
            professionalName: d.professional_name
        }));
    }

    static async saveDocument(doc: SavedDocument): Promise<void> {
        await supabase.from('generated_documents').insert({
            student_id: doc.studentId,
            student_name: doc.studentName,
            doc_type: doc.docType,
            document_code: doc.code,
            content: doc.content,
            professional_name: doc.professionalName
        });
    }

    static async deleteDocument(id: string): Promise<void> {
        await supabase.from('generated_documents').delete().eq('id', id);
    }

    // --- Support Professionals ---
    static async getSupportProfessionalsByStudent(studentId: string): Promise<SupportProfessional[]> {
        return safeCall(async () => {
            const { data, error } = await supabase
                .from('support_professionals')
                .select(`
                    id, name, cpf, phone, email, education,
                    contract_start_date, workload, address, school_id,
                    regent_teacher, student_id, created_at
                `)
                .eq('student_id', studentId)
                .order('name');

            if (error) {
                console.error(`Erro ao buscar ATs para o aluno ${studentId}:`, error);
                throw error;
            }

            return data.map((p: any) => ({
                id: p.id,
                name: p.name,
                cpf: p.cpf,
                phone: p.phone,
                email: p.email,
                education: p.education,
                contractStartDate: p.contract_start_date,
                workload: p.workload,
                address: p.address,
                schoolId: p.school_id,
                regentTeacher: p.regent_teacher,
                studentId: p.student_id,
                createdAt: p.created_at
            }));
        }, 2, 300, `getSupportProfessionalsByStudent(${studentId})`);
    }

    static async getSupportProfessionals(unit?: Unit): Promise<SupportProfessional[]> {
        return safeCall(async () => {
            console.log(`[SupabaseService] Buscando profissionais de apoio (${unit || 'Global'}) com Projeção Estrita...`);
            
            // Colunas Específicas conforme solicitado: id, name, cpf, phone, photo_url, education, school_id, student_id, regent_teacher, contract_start_date, workload
            let query = supabase
                .from('support_professionals')
                .select('id, name, cpf, phone, photo_url, education, school_id, student_id, regent_teacher, contract_start_date, workload')
                .order('name');
            
            const { data, error } = await query;
            if (error) {
                console.error('Erro ao buscar profissionais de apoio:', error);
                throw error;
            }

            return (data || []).map((p: any) => ({
                id: p.id,
                name: p.name || 'Sem nome',
                cpf: p.cpf || '',
                phone: p.phone || '',
                photoUrl: p.photo_url || '',
                education: p.education || '',
                schoolId: p.school_id || '',
                studentId: p.student_id || '',
                regentTeacher: p.regent_teacher || '-',
                contractStartDate: p.contract_start_date || '',
                workload: p.workload || '',
                // Fallbacks para campos da interface que não estão na consulta otimizada
                email: p.email || '',
                address: p.address || {},
                createdAt: p.created_at || new Date().toISOString()
            }));
        }, 0, 300, 'getSupportProfessionals');
    }

    static async saveSupportProfessional(prof: SupportProfessional): Promise<void> {
        return this.upsertSupportProfessionals([prof]);
    }

    static async upsertSupportProfessionals(professionals: Partial<SupportProfessional>[]): Promise<void> {
        if (professionals.length === 0) return;

        const toNull = (value: any) => (value === '' || value === undefined ? null : value);

        const payloads = professionals.map(prof => {
            const payload: any = {
                name: prof.name,
                cpf: sanitizeCPF(prof.cpf) || null,
                phone: prof.phone,
                email: prof.email,
                education: prof.education,
                contract_start_date: toNull(prof.contractStartDate),
                workload: prof.workload,
                address: prof.address,
                school_id: toNull(prof.schoolId),
                regent_teacher: prof.regentTeacher,
                student_id: toNull(prof.studentId)
            };

            if (prof.id && prof.id.length > 10) {
                payload.id = prof.id;
            }

            // Sanitização final: remove chaves undefined
            Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
            return payload;
        });

        console.log(`[SupabaseService] Realizando bulk upsert de ${payloads.length} profissionais...`);

        return safeCall(async () => {
            const { error } = await supabase
                .from('support_professionals')
                .upsert(payloads, { onConflict: 'cpf' });

            if (error) {
                console.error('Erro no UPSERT de profissionais:', error);
                // Tratamento amigável solicitado
                if (error.code === '42501' || error.message.includes('RLS') || error.message.includes('permission denied')) {
                     throw new Error('Acesso negado: Este Profissional já está vinculado a outra unidade. Solicite a transferência.');
                }
                throw new Error(`Erro Banco de Dados (Upsert): ${error.message}`);
            }
        });
    }

    static async deleteSupportProfessional(id: string): Promise<void> {
        const { error } = await supabase.from('support_professionals').delete().eq('id', id);
        if (error) throw error;
    }

    static getActiveTheme() {
        // Usa a versão síncrona (cache local) para garantir performance e evitar flicker
        const settings = this.getSystemSettingsSync();

        // Definição local dos temas para evitar problemas de importação/dependência circular
        const PRESET_THEMES_LOCAL = [
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

        // Recupera ID do settings
        const activeId = settings.activeThemeId || 'teal-default';
        const found = PRESET_THEMES_LOCAL.find(t => t.id === activeId);

        // Se não encontrar, retorna o primeiro (Teal)
        return found || PRESET_THEMES_LOCAL[0];
    }
    // --- WhatsApp Notifications ---
    /**
     * Envia notificação de WhatsApp via Supabase Edge Function
     */
    static async sendWhatsAppNotification(details: {
        student: string,
        professional: string,
        date: string,
        time: string,
        phone: string,
        appointmentId: string
    }) {
        console.log('[SupabaseService] Enviando WhatsApp chamando Edge Function diretamente...', details);

        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-send`;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${anonKey}`,
                    'apikey': anonKey
                },
                body: JSON.stringify({
                    telefone: details.phone.replace(/\D/g, ''),
                    nome: details.student,
                    data: details.date,
                    hora: details.time,
                    professional: details.professional,
                    appointmentId: details.appointmentId
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[SupabaseService] Erro na Edge Function:', response.status, errorData);
                throw new Error(errorData.error || `Erro do servidor: ${response.status}`);
            }

            const data = await response.json();
            console.log('[SupabaseService] Sucesso no envio:', data);
            return data;
        } catch (err: any) {
            console.error('[SupabaseService] Falha técnica no envio de WhatsApp:', err);
            // Captura o erro "Failed to fetch" (CORS/Rede) e dá um nome amigável
            if (err.message === 'Failed to fetch') {
                throw new Error('Erro de conexão: Verifique sua internet ou se o Supabase está bloqueado no navegador.');
            }
            throw err;
        }
    }
}

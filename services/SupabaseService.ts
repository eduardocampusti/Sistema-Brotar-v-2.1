import { supabase } from './supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { Student, User, School, SupportProfessional, SupportProfessionalAttachment, SupportProfessionalAttachmentCategory, SystemSettings, PapelTimbradoConfig, SavedDocument, Session, Specialty, UserRole, PortageAssessment, Appointment, AppointmentStatus, Unit, AuditAction, AuditLog, AgendamentoProfissionalView, statusAgendamentoOcupandoHorarioConflito, RelatorioTEAData, NutritionAssessment, NutritionAnthropometryHistory, NutritionNAE, NutritionEanActivity, NutritionEvolution, NutritionDashboardStats, NutritionAlerta } from '../types';
import { categorizeSecretaryDiagnosis } from '../utils/teaAutismCount';
import { isPerfilRestritoProntuario, STATUS_AGENDAMENTO_VINCULO_PRONTUARIO } from '@/src/config/perfilRestrito';

/** Retry em timeout (57014 / statement timeout) para plano Supabase com limite rígido. */
async function withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    delayMs = 1500
): Promise<T> {
    // Margem abaixo do limite típico do PostgREST/instância; consultas pesadas ainda devem ser aliviadas (select, índices, V12/V13).
    const CLIENT_TIMEOUT_MS = 12000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        try {
            // Corrida: a query deve responder em até CLIENT_TIMEOUT_MS ou lança timeout no cliente
            const result = await Promise.race([
                fn(),
                new Promise<never>((_, reject) => {
                    timeoutId = setTimeout(
                        () => reject({ code: '57014', message: 'client timeout' }),
                        CLIENT_TIMEOUT_MS
                    );
                }),
            ]);
            clearTimeout(timeoutId);
            return result as T;
        } catch (error: any) {
            clearTimeout(timeoutId);
            const isTimeout =
                error?.code === '57014' ||
                error?.message?.includes('timeout');
            console.warn(
                `[withRetry] Tentativa ${attempt}/${maxAttempts} | code: ${error?.code}`
            );
            if (!isTimeout || attempt === maxAttempts) throw error;
            await new Promise(res => setTimeout(res, delayMs * attempt));
        }
    }
    throw new Error('withRetry: máximo de tentativas atingido');
}

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
        fullName: dbStudent.full_name || dbStudent.name || 'Sem nome',
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
            schoolName: getSchoolName(dbStudent.schools) || dbStudent.educational_info?.schoolName || 'Não vinculada',
            grade: dbStudent.educational_info?.grade || dbStudent.grade,
            shift: dbStudent.educational_info?.shift || dbStudent.shift as any,
            schedule: dbStudent.educational_info?.schedule || '',
            teachingType: dbStudent.educational_info?.teachingType || 'Regular',
            district: getSchoolDistrict(dbStudent.schools),
            hasSpecialAide: dbStudent.educational_info?.hasSpecialAide || false,
            difficulties: dbStudent.educational_info?.difficulties || ''
        },
        socialInfo: dbStudent.family_info || dbStudent.social_info,
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
        const result = await fn();
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
    private static dataCache: Map<string, { data: any; timestamp: number; ttlMs?: number }> = new Map();
    private static readonly DEFAULT_TTL = 30 * 1000; // 30 segundos (reduzido para maior precisão)
    private static readonly CACHE_BYPASS_FLAG = 'brotar_debug_bypass_cache';

    /**
     * Verifica se as chaves do Supabase estão configuradas corretamente.
     * Esta é a trava de segurança solicitada para evitar falhas silenciosas.
     */
    static isConfigValid(): boolean {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
        return !!(url && key && url !== '' && key !== '');
    }

    private static setInCache(key: string, data: any, ttlMs?: number): void {
        const entry: { data: any; timestamp: number; ttlMs?: number } = { data, timestamp: Date.now() };
        if (ttlMs !== undefined) entry.ttlMs = ttlMs;
        this.dataCache.set(key, entry);
    }

    private static getFromCache<T>(key: string): T | null {
        const cached = this.dataCache.get(key);
        if (!cached) return null;

        const ttl = cached.ttlMs ?? this.DEFAULT_TTL;
        if (Date.now() - cached.timestamp > ttl) {
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

    /**
     * Útil para debug em tela: limpa cache de dados + perfil.
     * Pode ser chamado a partir da UI para forçar nova leitura do banco.
     */
    static clearAllCachesForDebug(): void {
        this.invalidateCache();
        this.userProfileCache.clear();
        console.log('[SupabaseService][DEBUG] Cache limpo manualmente (dataCache + userProfileCache).');
    }

    /**
     * Toggle de bypass temporário de cache via localStorage.
     * No console do navegador:
     * localStorage.setItem('brotar_debug_bypass_cache', '1') // ativa
     * localStorage.removeItem('brotar_debug_bypass_cache')   // desativa
     */
    private static isCacheBypassEnabled(): boolean {
        try {
            return localStorage.getItem(this.CACHE_BYPASS_FLAG) === '1';
        } catch {
            return false;
        }
    }

    private static mapSpecialtyFromDB(dbValue?: string): Specialty | undefined {
        if (!dbValue) return undefined;
        return this.REVERSE_SPECIALTY_MAP[dbValue] || (dbValue as any);
    }

    /**
     * Sanitiza objetos antes de enviar ao Supabase.
     * 1. Converte "" para null (apenas em campos escalares de nível raiz).
     * 2. Remove undefined.
     * 3. Se o campo termina em _id e não é UUID válido, vira null.
     * ATENÇÃO: NÃO aplica recursividade em campos JSONB do banco (address, guardians,
     * clinical_info, social_info, documents) para evitar perda de dados aninhados.
     */
    private static readonly JSONB_FIELDS = new Set(['address', 'guardians', 'clinical_info', 'social_info', 'family_info', 'educational_info', 'documents', 'attachments']);

    /** Colunas mínimas (compatível com DB antes de photo_url / V14 attachments). */
    private static readonly SUPPORT_PRO_LIST_SELECT_LEGACY =
        'id,name,cpf,phone,education,school_id,student_id,regent_teacher,contract_start_date,workload,email,address,created_at,status,unlinked_at';
    private static readonly SUPPORT_PRO_LIST_SELECT_PHOTO =
        'id,name,cpf,phone,education,school_id,student_id,regent_teacher,contract_start_date,workload,email,address,created_at,photo_url,status,unlinked_at';
    private static readonly SUPPORT_PRO_LIST_SELECT_FULL =
        'id,name,cpf,phone,education,school_id,student_id,regent_teacher,contract_start_date,workload,email,address,created_at,photo_url,attachments,status,unlinked_at,school_id_unlinked,student_id_unlinked,regent_teacher_unlinked';

    /** Ambiente sem migração V29: remove `status` e `unlinked_at` do SELECT. */
    private static stripSupportProfessionalSoftDeleteSelectCols(selectList: string): string {
        return selectList.replace(/,status,unlinked_at/g, '');
    }

    private static cleanDataForSupabase(data: any): any {
        if (!data || typeof data !== 'object' || Array.isArray(data)) return data;

        const clean: any = {};
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        Object.keys(data).forEach(key => {
            let value = data[key];

            // CORREÇÃO CRÍTICA: o campo 'id' da raiz NUNCA deve ser convertido para null.
            // Se for string vazia ou nulo, simplesmente ignoramos — o Supabase gera o UUID.
            if (key === 'id' && (value === '' || value === null || value === undefined)) {
                return; // Pula este campo — será omitido do payload final
            }

            // 2. Undefined -> Ignorar (não adiciona ao objeto final)
            if (value === undefined) return;

            // Campos JSONB: enviamos o objeto/array como está, SEM recursividade.
            // Isso preserva campos aninhados como address.street, clinical_info.motherName etc.
            if (this.JSONB_FIELDS.has(key)) {
                clean[key] = value;
                return;
            }

            // 1. Strings vazias -> null (apenas em campos escalares)
            if (value === '') value = null;

            // 3. Critério Especial: campos _id devem ser UUIDs válidos ou null
            if (key.endsWith('_id') && typeof value === 'string' && value !== null && value.length > 0) {
                if (!uuidRegex.test(value)) {
                    console.warn(`[SupabaseService] UUID inválido detectado em ${key}: "${value}". Convertendo para null.`);
                    value = null;
                }
            }

            clean[key] = value;
        });

        return clean;
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
            .select('*, school_id')
            .eq('id', data.user.id)
            .single();

        const userData = profileError || !profile ? null : profile;

        // Se o perfil não existir, usamos um fallback seguro baseado no metadata do Auth
        const user: User = {
            id: userData?.id || data.user.id,
            name: userData?.full_name || data.user.user_metadata?.full_name || finalEmail.split('@')[0],
            username: email, // Usa o que o usuário digitou
            role: (userData?.role?.toUpperCase() || (data.user.user_metadata?.role?.toUpperCase() as UserRole) || 'SPECIALIST') as UserRole,
            isActive: userData?.is_active ?? true,
            specialty: this.mapSpecialtyFromDB(userData?.specialty),
            email: userData?.email || finalEmail,
            photoUrl: userData?.photo_url,
            scope: (userData?.scope || data.user.user_metadata?.scope)?.toUpperCase() as any,
            schoolInep: userData?.school_inep || undefined,
            schoolId: userData?.school_id || undefined,
            mustChangePassword: userData?.must_change_password,
            birthDate: userData?.birth_date || undefined,
        };

        // Se ainda não tiver schoolId, tenta fazer o lookup pelo INEP como fallback
        if (user.role === 'ESCOLA' && user.schoolInep && !user.schoolId) {
            const { data: schoolRow } = await supabase
                .from('schools')
                .select('id')
                .eq('inep', user.schoolInep)
                .single();
            if (schoolRow?.id) {
                user.schoolId = schoolRow.id;
                console.log(`[SupabaseService] Escola ${user.schoolInep} → UUID: ${user.schoolId}`);
            } else {
                console.warn(`[SupabaseService] Escola com INEP ${user.schoolInep} não encontrada na tabela schools.`);
            }
        }

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
        // Cache: reutiliza perfil já carregado. Exceção: ESCOLA ainda sem school_id mas com INEP
        // (precisa de novo fetch para resolver UUID da escola). ADMIN com schoolId null usa cache normalmente.
        const cached = this.userProfileCache.get(userId);
        if (cached) {
            const escolaPrecisaResolverEscola =
                cached.role === 'ESCOLA' && !cached.schoolId && !!cached.schoolInep;
            if (!escolaPrecisaResolverEscola) {
                return cached;
            }
        }

        // [REFRESH FORÇADO] Se não estiver no cache ou o school_id estiver vindo vazio, lemos do banco
        console.log(`[SupabaseService] Buscando perfil do usuário ${userId} no banco...`);
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*, school_id')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            console.warn(`[SupabaseService] Perfil não encontrado no banco (ID: ${userId}). Motivo: ${profileError?.message || 'Dados vazios'}. Tentando recuperação via Metadados JWT...`);

            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user && session.user.id === userId) {
                console.log('[SupabaseService] Fallback de perfil bem-sucedido via JWT.');
                const userFromJewt: User = {
                    id: session.user.id,
                    name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário',
                    username: session.user.email?.split('@')[0] || 'user',
                    role: (session.user.user_metadata?.role as UserRole) || 'SPECIALIST',
                    scope: (session.user.user_metadata?.scope as any) || 'GLOBAL',
                    isActive: true,
                    mustChangePassword: false,
                    email: session.user.email || undefined,
                    schoolId: session.user.user_metadata?.school_id // Tenta pegar do JWT se o banco falhar
                };
                this.userProfileCache.set(userId, userFromJewt);
                return userFromJewt;
            }
            console.error('[SupabaseService] Falha crítica: Perfil ausente no banco e sem sessão JWT ativa.');
            return null;
        }

        const user: User = {
            id: profile.id,
            name: profile.full_name,
            username: profile.username || (profile.email ? profile.email.split('@')[0] : 'user'),
            role: profile.role?.toUpperCase() as UserRole,
            isActive: profile.is_active,
            specialty: this.mapSpecialtyFromDB(profile.specialty),
            email: profile.email,
            photoUrl: profile.photo_url,
            scope: (profile.scope?.toUpperCase() as any) || 'GLOBAL',
            schoolInep: profile.school_inep || undefined,
            schoolId: profile.school_id || undefined,
            mustChangePassword: profile.must_change_password
        };

        // Se ainda não tiver schoolId, tenta fazer o lookup pelo INEP como fallback
        if (user.role === 'ESCOLA' && user.schoolInep && !user.schoolId) {
            const { data: schoolRow } = await supabase
                .from('schools')
                .select('id')
                .eq('inep', user.schoolInep)
                .single();
            if (schoolRow?.id) {
                user.schoolId = schoolRow.id;
                console.log(`[SupabaseService] getUserProfile REFRESH: Escola ${user.schoolInep} → UUID: ${user.schoolId}`);
                
                // Atualiza o perfil no banco para não precisar repetir o lookup
                await supabase.from('profiles').update({ school_id: user.schoolId }).eq('id', user.id);
            }
        }

        // Cache local
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

    /** Fallback quando a RPC V17 ainda não existe no projeto Supabase. */
    private static async clearMustChangePasswordViaTable(userId: string): Promise<{ error: Error | null }> {
        const { data: updatedRows, error: profileError } = await supabase
            .from('profiles')
            .update({ must_change_password: false })
            .eq('id', userId)
            .select('id');

        if (profileError) {
            return { error: new Error(profileError.message || 'Erro ao atualizar o perfil.') };
        }
        if (!updatedRows?.length) {
            return {
                error: new Error(
                    'Não foi possível liberar o primeiro acesso no perfil (RLS). Execute no Supabase o script db/migrations/V17_clear_must_change_password_rpc.sql e tente novamente.'
                ),
            };
        }

        this.userProfileCache.delete(userId);
        return { error: null };
    }

    /**
     * Troca de senha obrigatória (primeiro acesso): atualiza a senha no Auth e zera `must_change_password` no perfil.
     * Verifica se o UPDATE no perfil afetou linha (evita sucesso falso com RLS / 0 linhas).
     * Se a senha nova for igual à já gravada no Auth (422), apenas sincroniza o flag no perfil — recupera estado
     * em que a primeira troca atualizou a senha mas o perfil não foi confirmado.
     */
    static async completeMandatoryPasswordChange(
        userId: string,
        newPassword: string
    ): Promise<{ error: Error | null }> {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user || sessionData.session.user.id !== userId) {
            return { error: new Error('Sessão inválida. Faça login novamente.') };
        }

        const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });

        if (pwdError) {
            const errMsg = (pwdError.message || String(pwdError) || '').toLowerCase();
            const status = (pwdError as { status?: number }).status;
            // Mesma senha que a já gravada no Auth (wording / idioma pode variar levemente).
            const samePasswordAsCurrent =
                errMsg.includes('different from the old') ||
                errMsg.includes('should be different') ||
                errMsg.includes('same as') ||
                errMsg.includes('old password') ||
                (errMsg.includes('new password') && errMsg.includes('different')) ||
                (status === 422 &&
                    errMsg.includes('password') &&
                    (errMsg.includes('different') || errMsg.includes('same') || errMsg.includes('identical')));
            if (!samePasswordAsCurrent) {
                return { error: new Error(pwdError.message) };
            }
            // Auth já está com esta senha; segue só para corrigir o flag no banco.
        }

        const { data: rpcOk, error: rpcError } = await supabase.rpc('clear_must_change_password');

        if (!rpcError && rpcOk === true) {
            this.userProfileCache.delete(userId);
            return { error: null };
        }

        if (rpcError) {
            const msg = (rpcError.message || '').toLowerCase();
            const missingFn =
                msg.includes('does not exist') ||
                msg.includes('could not find') ||
                msg.includes('clear_must_change_password') ||
                rpcError.code === '42883';
            if (!missingFn) {
                return { error: new Error(rpcError.message || 'Erro ao liberar primeiro acesso (RPC).') };
            }
        }

        return await this.clearMustChangePasswordViaTable(userId);
    }

    static async resetPassword(email: string) {
        const finalEmail = email.includes('@') ? email : `${email}@brotar.com`;

        // Redirecionar para /login (não a landing /), onde o fluxo PASSWORD_RECOVERY exibe o formulário de nova senha.
        // Inclua em Supabase → Authentication → URL Configuration → Redirect URLs:
        //   https://SEU_DOMINIO/login?recovery=true
        const redirectTo = `${window.location.origin}/login?recovery=true`;

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
            const normalizedUsername = String(newUser.username || '').trim();
            const normalizedExplicitEmail = String(newUser.email || '').trim().toLowerCase();
            const usernameLooksLikeEmail = normalizedUsername.includes('@');
            const defaultDomain = newUser.role === 'ESCOLA' ? '@escola.brotar' : '@brotar.com';
            const authEmail = normalizedExplicitEmail
                ? normalizedExplicitEmail
                : usernameLooksLikeEmail
                  ? normalizedUsername.toLowerCase()
                  : `${normalizedUsername}${defaultDomain}`.toLowerCase();

            if (!normalizedUsername && !authEmail) {
                return { success: false, error: 'Username/e-mail inválido para criação da conta.' };
            }

            // Proteção de duplicidade: se já existe perfil pelo username/e-mail, reaproveita.
            const existingCandidates: any[] = [];
            if (normalizedUsername) {
                const { data: byUsername, error: usernameLookupError } = await supabase
                    .from('profiles')
                    .select('id, role, email, username, is_active')
                    .eq('username', normalizedUsername);
                if (usernameLookupError) {
                    return { success: false, error: `Falha ao verificar username existente: ${usernameLookupError.message}` };
                }
                existingCandidates.push(...(byUsername || []));
            }
            if (authEmail) {
                const { data: byEmail, error: emailLookupError } = await supabase
                    .from('profiles')
                    .select('id, role, email, username, is_active')
                    .eq('email', authEmail);
                if (emailLookupError) {
                    return { success: false, error: `Falha ao verificar e-mail existente: ${emailLookupError.message}` };
                }
                existingCandidates.push(...(byEmail || []));
            }

            const existingMap = new Map<string, any>();
            for (const row of existingCandidates) {
                if (row?.id) existingMap.set(row.id, row);
            }
            const existingProfile = [...existingMap.values()][0];

            if (existingProfile?.id) {
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

                const updatePayload = this.cleanDataForSupabase({
                    full_name: newUser.name,
                    username: normalizedUsername || existingProfile.username,
                    role: newUser.role,
                    specialty: dbSpecialty,
                    is_active: true,
                    scope: newUser.scope,
                    job_title: newUser.jobTitle,
                    phone: newUser.phone,
                    email: authEmail || existingProfile.email,
                    photo_url: newUser.photoUrl,
                    address: newUser.address,
                    school_inep: newUser.schoolInep
                });

                const { error: reactivateError } = await supabase
                    .from('profiles')
                    .update(updatePayload)
                    .eq('id', existingProfile.id);

                if (reactivateError) {
                    return { success: false, error: `Conta existente encontrada, mas falhou ao atualizar perfil: ${reactivateError.message}` };
                }

                // Melhor esforço: sincroniza senha quando possível (não bloqueia o fluxo).
                try {
                    const pw = await this.setUserPassword(existingProfile.id, passwordRaw);
                    if (!pw.success) {
                        return {
                            success: true,
                            warning: `Conta já existente reaproveitada (${authEmail}). Perfil reativado, mas senha não foi sincronizada: ${pw.error || 'erro desconhecido'}.`
                        };
                    }
                } catch {
                    return {
                        success: true,
                        warning: `Conta já existente reaproveitada (${authEmail}). Perfil reativado, mas não foi possível garantir sincronização de senha.`
                    };
                }

                return {
                    success: true,
                    warning: `Conta já existente reaproveitada (${authEmail}). Perfil atualizado sem criar duplicidade.`
                };
            }

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
                username: normalizedUsername || newUser.username,
                role: newUser.role,
                specialty: dbSpecialty, // Usa o valor mapeado
                is_active: newUser.isActive,
                scope: newUser.scope,
                job_title: newUser.jobTitle,
                phone: newUser.phone,
                email: authEmail,
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

    /** Listagens (dropdowns, grids leves): evita clinical_info/educational_info grandes no fio. */
    static async getStudents(
        _unit?: Unit,
        options?: { compactList?: boolean; schoolId?: string }
    ): Promise<Student[]> {
        return safeCall(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            let profile: User | null = null;
            if (session?.user) {
                profile = await SupabaseService.getUserProfile(session.user.id);
                if (profile?.role === 'ESCOLA' && !profile.schoolId) {
                    console.warn('[SupabaseService][getStudents] Perfil ESCOLA sem school_id: lista pode vir vazia até corrigir o cadastro.');
                }
            }

            const role = (profile?.role || '').toUpperCase();
            const profileSchoolId = profile?.schoolId ?? null;
            // Só a role ESCOLA deve restringir a lista ao UUID da escola do perfil.
            // Outros papéis (ex.: EDUCATION_SECRETARY) podem ter school_id legado no perfil sem ser "visão de escola";
            // filtrar aqui esvaziava a lista para gestores municipais.
            const filtrarPorEscolaDoPerfil = role === 'ESCOLA' && !!profileSchoolId;

            console.log('[getStudents] role:', role, '| filtrarPorEscolaDoPerfil (apenas ESCOLA):', filtrarPorEscolaDoPerfil);

            // Schema oficial: `full_name` (não existe coluna `name` em students).
            // compactList: inclui clinical_info (CID, diagnóstico em texto, necessidades) para painéis
            // (ex.: secretaria de educação — gráfico por diagnóstico) sem trazer o registo completo (*).
            // compactList: incluir photo_url (leve) — sem isso a lista vinha sem foto e o formulário de edição
            // partia de estado incompleto e o saveStudent podia gravar photo_url null por engano.
            const studentSelect = options?.compactList
                ? 'id,full_name,school_id,status,unit,created_at,birth_date,cpf,ethnicity,address,guardians,sus_card,photo_url,clinical_info,documents,schools(name,district)'
                : '*';

            const PAGE = 50;

            const runStudentsQuery = (orderCol: 'full_name' | 'name', from: number, to: number) => {
                let q = supabase
                    .from('students')
                    .select(studentSelect)
                    .order(orderCol, { ascending: true })
                    .range(from, to);
                if (filtrarPorEscolaDoPerfil && profileSchoolId) {
                    q = q.eq('school_id', profileSchoolId);
                } else if (options?.schoolId) {
                    q = q.eq('school_id', options.schoolId);
                }
                return q;
            };

            const fetchAllStudents = async (orderCol: 'full_name' | 'name') => {
                const acc: any[] = [];
                for (let from = 0; ; from += PAGE) {
                    const to = from + PAGE - 1;
                    const page = await withRetry(async () => {
                        const { data, error } = await runStudentsQuery(orderCol, from, to);
                        if (error) throw error;
                        return data ?? [];
                    });
                    if (!page.length) break;
                    acc.push(...page);
                    if (page.length < PAGE) break;
                }
                return acc;
            };

            let raw: any[] = [];
            try {
                raw = await fetchAllStudents('full_name');
            } catch (e: any) {
                const msg = String(e?.message || '');
                // Base antiga sem full_name: tenta ordenar por name (select compacto não pede essa coluna).
                if (e?.code === '42703' && /\bstudents\.full_name\b/i.test(msg)) {
                    console.warn('[SupabaseService][getStudents] Coluna full_name indisponível; tentando ordenar por name.', msg);
                    raw = await fetchAllStudents('name');
                } else {
                    throw e;
                }
            }

            if (!raw.length) {
                console.warn(
                    '[SupabaseService][getStudents] Nenhuma linha retornada (RLS pode estar bloqueando com o JWT atual ou não há alunos).'
                );
            }

            return raw.map(s => mapStudentFromDB(s));
        }, 0, 300, 'getStudents');
    }

    /**
     * Retorna apenas alunos vinculados ao profissional via agendamentos.
     * Para ADMIN/SECRETARIA/COORDENADOR: retorna todos os alunos normalmente.
     * Para SPECIALIST: retorna apenas alunos com appointment vinculado ao professionalId.
     */
    static async getStudentsForUser(currentUser: User): Promise<Student[]> {
        // Perfis administrativos veem todos
        const adminRoles = [
            'ADMIN',
            'SECRETARIA_SEDE',
            'SECRETARIA_COCAL',
            'COORDENADOR',
            'EDUCATION_SECRETARY',
            'ASSISTANT',
        ];
        if (adminRoles.includes(currentUser.role)) {
            return this.getStudents();
        }

        // SPECIALIST: usar getAlunosDaProfissional que já faz join com schools
        return this.getAlunosDaProfissional(currentUser.id);
    }

    /**
     * Gera os dados consolidados para o Relatório TEA.
     * Cruza as flags explícitas (laudo/suspeita) com a lógica de detecção automática por CID/Texto.
     * Respeita o escopo de acesso do usuário (Sede/Cocal/Escola).
     */
    static async getRelatorioTEA(filters?: { unit?: Unit; schoolId?: string }): Promise<RelatorioTEAData> {
        return safeCall(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error('Sessão expirada. Faça login novamente.');

            const profile = await this.getUserProfile(session.user.id);
            if (!profile) throw new Error('Perfil do usuário não encontrado.');

            // Busca a lista compacta de alunos (já filtrada por RLS e vínculo de escola no getStudents)
            let students = await this.getStudents(undefined, { compactList: true });

            // Filtros de Escopo (Segunda camada de segurança/conveniência)
            const role = (profile.role || '').toUpperCase();
            const scope = (profile.scope || 'GLOBAL').toUpperCase();

            if (role === 'SECRETARIA_SEDE') {
                students = students.filter(s => s.unit === 'SEDE');
            } else if (role === 'SECRETARIA_COCAL') {
                students = students.filter(s => s.unit === 'COCAL');
            } else if (role === 'ASSISTANT') {
                if (scope === 'COCAL') {
                    students = students.filter(s => s.unit === 'COCAL');
                }
                // Se for ASSISTANT SEDE, não aplica filtro (visão global)
            }

            // Filtros manuais da interface
            if (filters?.unit) {
                students = students.filter(s => s.unit === filters.unit);
            }
            if (filters?.schoolId) {
                students = students.filter(s => s.school?.schoolId === filters.schoolId);
            }

            const res: RelatorioTEAData = {
                resumo: { totalTEA: 0, comLaudo: 0, suspeitos: 0, totalGeralAlunos: students.length },
                porEscola: [],
                porFaixaEtaria: [],
                detalhesAlunos: []
            };

            const schoolsMap = new Map<string, { escola: string, confirmados: number, suspeitos: number, total: number }>();
            const ageMap = new Map<string, { faixa: string, confirmados: number, suspeitos: number }>();

            const getAge = (birthDate?: string) => {
                if (!birthDate) return 0;
                const today = new Date();
                const birth = new Date(birthDate.includes('T') ? birthDate : birthDate + 'T00:00:00');
                let age = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                return age < 0 ? 0 : age;
            };

            const getFaixa = (age: number) => {
                if (age <= 3)  return '0-3 anos';
                if (age <= 6)  return '4-6 anos';
                if (age <= 10) return '7-10 anos';
                if (age <= 14) return '11-14 anos';
                return '15+ anos';
            };

            students.forEach(s => {
                const hasExplicitLaudo = s.clinical?.laudo === true;
                const hasLaudoAnexado = Array.isArray(s.documents) && s.documents.some((doc: any) => doc.type === 'Laudo Médico');
                const hasExplicitSuspicion = s.clinical?.suspicion === true;
                
                let finalStatus: 'Confirmado' | 'Suspeito' | null = null;
                
                // Prioridade: 
                // 1. Flag explícita OU Documento anexado -> Confirmado
                // 2. Suspeita explícita OU Detecção por CID -> Suspeito
                if (hasExplicitLaudo || hasLaudoAnexado) {
                    finalStatus = 'Confirmado';
                } else if (hasExplicitSuspicion) {
                    finalStatus = 'Suspeito';
                } else if (categorizeSecretaryDiagnosis(s) === 'TEA/Autismo') {
                    finalStatus = 'Suspeito';
                }

                if (finalStatus) {
                    const age = getAge(s.birthDate);
                    const schoolName = s.school?.schoolName || 'Não vinculada';
                    const faixa = getFaixa(age);

                    res.resumo.totalTEA++;
                    if (finalStatus === 'Confirmado') res.resumo.comLaudo++;
                    else res.resumo.suspeitos++;

                    // Agrupamento por Escola
                    if (!schoolsMap.has(schoolName)) {
                        schoolsMap.set(schoolName, { escola: schoolName, confirmados: 0, suspeitos: 0, total: 0 });
                    }
                    const sch = schoolsMap.get(schoolName)!;
                    if (finalStatus === 'Confirmado') sch.confirmados++;
                    else sch.suspeitos++;
                    sch.total++;

                    // Agrupamento por Faixa Etária
                    if (!ageMap.has(faixa)) {
                        ageMap.set(faixa, { faixa, confirmados: 0, suspeitos: 0 });
                    }
                    const f = ageMap.get(faixa)!;
                    if (finalStatus === 'Confirmado') f.confirmados++;
                    else f.suspeitos++;

                    res.detalhesAlunos.push({
                        id: s.id,
                        nome: s.fullName,
                        escola: schoolName,
                        unit: s.unit || 'N/A',
                        idade: age,
                        status: finalStatus,
                        cid: s.clinical?.cid
                    });
                }
            });

            res.porEscola = Array.from(schoolsMap.values()).sort((a, b) => b.total - a.total);
            res.porFaixaEtaria = Array.from(ageMap.values()).sort((a, b) => {
                const order = ['0-3 anos', '4-6 anos', '7-10 anos', '11-14 anos', '15+ anos'];
                return order.indexOf(a.faixa) - order.indexOf(b.faixa);
            });

            return res;
        }, 1, 300, 'getRelatorioTEA');
    }

    /**
     * Retorna TODOS os alunos TEA (confirmados + suspeitos) com dados completos de contato e endereço.
     */
    static async getRelatorioTEACompleto(): Promise<any[]> {
        return safeCall(async () => {
            return await this.getProcessedTEAStudents();
        }, 0, 300, 'getRelatorioTEACompleto');
    }

    /**
     * Retorna apenas alunos com status 'Confirmado'.
     */
    static async getRelatorioTEAConfirmados(): Promise<any[]> {
        return safeCall(async () => {
            const students = await this.getProcessedTEAStudents();
            return students.filter(s => s.finalStatus === 'Confirmado');
        }, 0, 300, 'getRelatorioTEAConfirmados');
    }

    /**
     * Retorna alunos agrupados por escola com estatísticas rápidas.
     */
    static async getRelatorioTEAPorEscola(): Promise<any[]> {
        return safeCall(async () => {
            const students = await this.getProcessedTEAStudents();
            const schoolsMap = new Map<string, any>();

            students.forEach(s => {
                const schoolName = s.school?.schoolName || 'Não vinculada';
                if (!schoolsMap.has(schoolName)) {
                    schoolsMap.set(schoolName, {
                        escola: schoolName,
                        unidade: s.unit || 'N/A',
                        totalConfirmados: 0,
                        totalSuspeitos: 0,
                        alunos: []
                    });
                }
                const sch = schoolsMap.get(schoolName);
                if (s.finalStatus === 'Confirmado') sch.totalConfirmados++;
                else sch.totalSuspeitos++;
                
                sch.alunos.push({
                    nome: s.fullName,
                    status: s.finalStatus,
                    cid: s.clinical?.cid || 'N/A'
                });
            });

            return Array.from(schoolsMap.values()).sort((a, b) => b.alunos.length - a.alunos.length);
        }, 0, 300, 'getRelatorioTEAPorEscola');
    }

    /**
     * Retorna apenas alunos com status 'Suspeito'.
     */
    static async getRelatorioTEASuspeitos(): Promise<any[]> {
        return safeCall(async () => {
            const students = await this.getProcessedTEAStudents();
            return students
                .filter(s => s.finalStatus === 'Suspeito')
                .map(s => ({
                    ...s,
                    observacao: "Aguardando laudo"
                }));
        }, 0, 300, 'getRelatorioTEASuspeitos');
    }

    /**
     * Retorna alunos agrupados por bairro/localidade geográfica.
     */
    static async getRelatorioTEAPorBairro(): Promise<any[]> {
        return safeCall(async () => {
            const students = await this.getProcessedTEAStudents();
            const bairroMap = new Map<string, any>();

            students.forEach(s => {
                const bairro = s.address?.district || 'Não informado';
                if (!bairroMap.has(bairro)) {
                    bairroMap.set(bairro, {
                        bairro,
                        totalTEA: 0,
                        alunos: []
                    });
                }
                const b = bairroMap.get(bairro);
                b.totalTEA++;
                b.alunos.push({
                    nome: s.fullName,
                    escola: s.school?.schoolName || 'N/A',
                    status: s.finalStatus,
                    responsavel: s.responsavel,
                    telefone: s.telefone
                });
            });

            return Array.from(bairroMap.values()).sort((a, b) => b.totalTEA - a.totalTEA);
        }, 0, 300, 'getRelatorioTEAPorBairro');
    }

    /**
     * Helper centralizador para processamento de alunos TEA.
     * Cruza dados clínicos, documentos e flags de diagnóstico.
     * Respeita RLS e Escopo (Sede/Cocal/Global).
     */
    private static async getProcessedTEAStudents(filters?: { unit?: Unit; schoolId?: string }) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error('Sessão expirada. Faça login novamente.');

        const profile = await this.getUserProfile(session.user.id);
        if (!profile) throw new Error('Perfil do usuário não encontrado.');

        // Busca alunos (getStudents já aplica RLS e filtros de papel ESCOLA)
        let students = await this.getStudents(undefined, { compactList: true });

        // Filtros de Escopo (Segunda camada de segurança alinhada ao getRelatorioTEA base)
        const role = (profile.role || '').toUpperCase();
        const scope = (profile.scope || 'GLOBAL').toUpperCase();

        if (role === 'SECRETARIA_SEDE') {
            students = students.filter(s => s.unit === 'SEDE');
        } else if (role === 'SECRETARIA_COCAL') {
            students = students.filter(s => s.unit === 'COCAL');
        } else if (role === 'ASSISTANT' && scope === 'COCAL') {
            students = students.filter(s => s.unit === 'COCAL');
        }

        if (filters?.unit) students = students.filter(s => s.unit === filters.unit);
        if (filters?.schoolId) students = students.filter(s => s.school?.schoolId === filters.schoolId);

        const getAge = (birthDate?: string) => {
            if (!birthDate) return 0;
            const today = new Date();
            const birth = new Date(birthDate.includes('T') ? birthDate : birthDate + 'T00:00:00');
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            return age < 0 ? 0 : age;
        };

        return students.map(s => {
            const hasExplicitLaudo = s.clinical?.laudo === true;
            const hasLaudoAnexado = Array.isArray(s.documents) && s.documents.some((doc: any) => doc.type === 'Laudo Médico');
            const hasExplicitSuspicion = s.clinical?.suspicion === true;
            
            let finalStatus: 'Confirmado' | 'Suspeito' | null = null;
            
            // Reutiliza lógica oficial de diagnóstico
            if (hasExplicitLaudo || hasLaudoAnexado) {
                finalStatus = 'Confirmado';
            } else if (hasExplicitSuspicion || categorizeSecretaryDiagnosis(s) === 'TEA/Autismo') {
                finalStatus = 'Suspeito';
            }

            if (!finalStatus) return null;

            return {
                ...s,
                finalStatus,
                age: getAge(s.birthDate),
                responsavel: s.guardians?.[0]?.name || 'Não informado',
                telefone: s.guardians?.[0]?.phone || 'Não informado',
                bairro: s.address?.district || 'Não informado'
            };
        }).filter((s): s is NonNullable<typeof s> => s !== null);
    }

    /**
     * Papéis com visão ampla na rede (alinhado ao RLS após V27: secretarias regionais e assistente com escopo não são “rede inteira”).
     */
    static podeVerTodosAlunosNaRede(user: Pick<User, 'role' | 'scope'>): boolean {
        const r = (user.role || '').toUpperCase();
        if (r === 'ADMIN' || r === 'COORDENADOR') return true;
        if (r === 'EDUCATION_SECRETARY') {
            const s = (user.scope || 'GLOBAL').toUpperCase();
            return s === 'GLOBAL' || s === '';
        }
        if (r === 'ASSISTANT') {
            const s = (user.scope || 'GLOBAL').toUpperCase();
            return s === 'GLOBAL' || s === '';
        }
        return false;
    }

    /**
     * Especialista em área com lista de prontuários restrita a alunos com agendamento associado.
     * @see isPerfilRestritoProntuario em `@/src/config/perfilRestrito`
     */
    static profissionalUsaVinculoAluno(user: Pick<User, 'role' | 'specialty'>): boolean {
        return isPerfilRestritoProntuario(user);
    }

    /**
     * Alunos atribuídos à profissional via agendamentos (`appointments.student_id` + `professional_id`).
     * Exclui cancelados e faltas; não usa `profissional_aluno_vinculo`.
     */
    static async getAlunosDaProfissional(
        profissionalId: string,
        options?: { compactList?: boolean }
    ): Promise<Student[]> {
        return safeCall(async () => {
            const allowed = new Set(
                STATUS_AGENDAMENTO_VINCULO_PRONTUARIO.map((s) => s.toUpperCase())
            );
            const { data: rows, error } = await supabase
                .from('appointments')
                .select('student_id, status')
                .eq('professional_id', profissionalId)
                .or('excluido.is.null,excluido.eq.false');
            if (error) throw error;

            const studentIds = [
                ...new Set(
                    (rows || [])
                        .filter((r: { status?: string }) =>
                            allowed.has(String(r.status || '').trim().toUpperCase())
                        )
                        .map((r: { student_id: string }) => r.student_id)
                        .filter(Boolean)
                ),
            ];
            if (!studentIds.length) return [];

            const studentSelect = options?.compactList
                ? 'id,full_name,school_id,status,unit,created_at,birth_date,cpf,ethnicity,address,guardians,sus_card,photo_url,clinical_info,schools(name,district)'
                : '*, schools(name, district)';

            const chunkSize = 80;
            const chunks: string[][] = [];
            for (let i = 0; i < studentIds.length; i += chunkSize) {
                chunks.push(studentIds.slice(i, i + chunkSize));
            }

            const raw: any[] = [];
            for (const chunk of chunks) {
                const { data: page, error: qErr } = await supabase
                    .from('students')
                    .select(studentSelect)
                    .in('id', chunk);
                if (qErr) throw qErr;
                if (page?.length) raw.push(...page);
            }

            const order = new Map(studentIds.map((id, idx) => [id, idx]));
            raw.sort(
                (a, b) =>
                    (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0) ||
                    String(a.full_name || a.name || '').localeCompare(
                        String(b.full_name || b.name || ''),
                        'pt-BR'
                    )
            );

            return raw.map((s) => mapStudentFromDB(s));
        }, 0, 300, 'getAlunosDaProfissional');
    }

    /**
     * Lista de alunos para a Central de Prontuários conforme perfil.
     * `listScope: 'meus'` restringe aos alunos com agendamento para aquele usuário (secretaria/admin).
     */
    static async getAlunosPorPerfil(
        perfilUsuario: Pick<User, 'id' | 'role' | 'specialty' | 'scope'>,
        profissionalId: string,
        options?: { compactList?: boolean; listScope?: 'meus' | 'todos' }
    ): Promise<Student[]> {
        const listScope = options?.listScope ?? 'todos';
        const getOpts = options?.compactList !== undefined ? { compactList: options.compactList } : undefined;

        if (this.profissionalUsaVinculoAluno(perfilUsuario) && !this.podeVerTodosAlunosNaRede(perfilUsuario)) {
            return this.getAlunosDaProfissional(perfilUsuario.id, getOpts);
        }

        const all = await this.getStudents(undefined, getOpts);

        const podeFiltrarMeus =
            this.podeVerTodosAlunosNaRede(perfilUsuario) && perfilUsuario.id === profissionalId;

        if (podeFiltrarMeus && listScope === 'meus') {
            return this.getAlunosDaProfissional(profissionalId, getOpts);
        }

        return all;
    }

    /** IDs de alunos com agendamento ativo/histórico para a profissional (toggle "Por profissional"). */
    static async listAlunoIdsVinculadosProfissional(profissionalId: string): Promise<string[]> {
        const students = await this.getAlunosDaProfissional(profissionalId, { compactList: true });
        return students.map((s) => s.id);
    }

    static async getStudentById(id: string): Promise<Student | null> {
        return safeCall(async () => {
            console.log(`[SupabaseService] Buscando detalhes completos do aluno: ${id}`);
            const { data, error } = await supabase
                .from('students')
                .select('*, schools(name, district)')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null;
                throw error;
            }

            return mapStudentFromDB(data);
        }, 0, 300, 'getStudentById');
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
        // Garante que o JWT está válido antes do upsert de forma resiliente
        let session = null;
        try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData?.session) {
                session = refreshData.session;
            } else {
                const { data: sessionData } = await supabase.auth.getSession();
                session = sessionData?.session;
            }
        } catch (e) {
            console.warn('[SupabaseService] Erro ao tentar refreshSession, usando getSession:', e);
            const { data: sessionData } = await supabase.auth.getSession();
            session = sessionData?.session;
        }
        console.log('[SupabaseService] Tentando salvar como usuário:', session?.user?.id);

        // Busca o perfil do usuário logado uma única vez
        let currentUserProfile: User | null = null;
        if (session?.user?.id) {
            currentUserProfile = await SupabaseService.getUserProfile(session.user.id);
        }

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

        const cleanCPF = student.cpf ? student.cpf.replace(/\D/g, '') : '';

        // Detecta se é INSERT (aluno novo sem ID) ou UPDATE (aluno existente com UUID válido)
        const isInsert = !student.id || student.id.trim() === '';
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const hasValidId = student.id && uuidRegex.test(student.id);

        console.log(`[SupabaseService] Modo: ${isInsert ? 'INSERT (novo aluno, UUID gerado pelo banco)' : 'UPDATE/UPSERT (ID: ' + student.id + ')'}`);

        // REGRA DE OURO: Se o usuário é Escola, o school_id VEM do perfil, não da tela
        let forcedSchoolId: string | null = null;
        if (currentUserProfile?.schoolId) {
            forcedSchoolId = currentUserProfile.schoolId;
            if (currentUserProfile.role === 'ESCOLA') {
                console.log(`[SupabaseService] AÇÃO OBRIGATÓRIA: Forçando school_id do perfil da escola: ${forcedSchoolId}`);
            }
        }

        // Fallback se não for escola mas já tiver um ID vinculado (ou se for ADMIN editando)
        if (!forcedSchoolId && typeof student.school?.schoolId === 'string' && student.school.schoolId.trim() !== '') {
            forcedSchoolId = student.school.schoolId;
        }

        const rawPayload: any = {
            ...(hasValidId ? { id: student.id } : {}),
            full_name: student.fullName,
            birth_date: student.birthDate || null,
            cpf: cleanCPF || null,
            sus_card: sanitizeField(student.susCard),
            school_id: forcedSchoolId,
            ethnicity: sanitizeField(student.ethnicity),
            unit: student.unit || null,
            
            // JSONB: endereço completo - Garantido como null se vazio para evitar erro de sintaxe
            address: (student.address && Object.values(student.address).some(v => v !== '' && v !== null && v !== undefined)) ? {
                street: student.address.street || '',
                number: student.address.number || '',
                district: student.address.district || '',
                city: student.address.city || '',
                state: student.address.state || '',
                zipCode: student.address.zipCode || ''
            } : null,

            guardians: (student.guardians && student.guardians.length > 0) ? student.guardians : null,
            photo_url: finalPhotoUrl || null,
            documents: (student.documents && student.documents.length > 0) ? student.documents : null,

            // JSONB: dados clínicos — preservar tudo que veio do prontuário + campos da ficha; o upsert substitui
            // o JSON inteiro: omitir weight/height/specialNeeds apagava dados após "Salvar com sucesso".
            clinical_info: (() => {
                const c = student.clinical && typeof student.clinical === 'object' ? { ...student.clinical } : {};
                const merged: Record<string, unknown> = {
                    ...c,
                    diagnosis: (c as any).diagnosis ?? '',
                    cid: (c as any).cid ?? '',
                    medications: (c as any).medications ?? '',
                    allergies: (c as any).allergies ?? '',
                    therapiesHistory: (c as any).therapiesHistory ?? '',
                    weight: (c as any).weight ?? '',
                    height: (c as any).height ?? '',
                    bloodType: (c as any).bloodType ?? '',
                    specialNeeds: Array.isArray((c as any).specialNeeds) ? (c as any).specialNeeds : [],
                    pp_data: (c as any).pp_data ?? null,
                    psych_data: (c as any).psych_data ?? null,
                    social_data: (c as any).social_data ?? null,
                    social_interview: (c as any).social_interview ?? null,
                    ot_data: (c as any).ot_data ?? null,
                    st_data: (c as any).st_data ?? null,
                    pt_data: (c as any).pt_data ?? null,
                    nutrition_data: (c as any).nutrition_data ?? null,
                    gender: student.gender ?? (c as any).gender ?? null,
                    rg: student.rg ?? (c as any).rg ?? null,
                    motherName: student.motherName ?? (c as any).motherName ?? null,
                    fatherName: student.fatherName ?? (c as any).fatherName ?? null,
                    nationality: student.nationality ?? (c as any).nationality ?? null,
                    birthPlace: student.birthPlace ?? (c as any).birthPlace ?? null,
                };
                const hasMeaningfulClinical = Object.values(merged).some((v) => {
                    if (v === null || v === undefined) return false;
                    if (typeof v === 'string') return v.trim() !== '';
                    if (Array.isArray(v)) return v.length > 0;
                    if (typeof v === 'object') return Object.keys(v).length > 0;
                    return true;
                });
                return hasMeaningfulClinical ? merged : null;
            })(),

            // JSONB: dados sociais
            family_info: (student.socialInfo && (student.socialInfo.nis || student.socialInfo.bolsaFamilia || student.socialInfo.bpc)) ? {
                nis: student.socialInfo?.nis || null,
                bolsaFamilia: student.socialInfo?.bolsaFamilia ?? false,
                bpc: student.socialInfo?.bpc ?? false
            } : null,

            // JSONB: dados escolares
            educational_info: (student.school && (student.school.grade || student.school.schoolName)) ? {
                grade: student.school?.grade || null,
                shift: student.school?.shift || null,
                schedule: student.school?.schedule || null,
                teachingType: student.school?.teachingType || null,
                hasSpecialAide: student.school?.hasSpecialAide || false,
                difficulties: student.school?.difficulties || null,
                schoolName: student.school?.schoolName || null
            } : null,
            status: student.status || 'Active'
        };

        console.log('[SupabaseService] ► PAYLOAD COMPLETO PARA O BANCO (rawPayload):');
        console.log('  Campos raiz:', Object.keys(rawPayload).filter(k => !['address','guardians','clinical_info','family_info','educational_info','documents'].includes(k)));
        console.log('  address:', rawPayload.address);
        console.log('  clinical_info:', rawPayload.clinical_info);
        console.log('  family_info:', rawPayload.family_info);
        console.log('  educational_info:', rawPayload.educational_info);
        console.log('  guardians count:', rawPayload.guardians?.length || 0);
        console.log('  documents count:', rawPayload.documents?.length || 0);
        console.log('  unit:', rawPayload.unit);

        const dbPayload = this.cleanDataForSupabase(rawPayload);

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
            // Filtra o array original para remover quaisquer rascunhos temporários (base64 ou blobs locais)
            // antes de anexar os novos documentos que acabaram de ser enviados para o Storage.
            const existingDocs = (student.documents || []).filter(doc => 
                doc.url && !doc.url.startsWith('data:') && !doc.url.startsWith('blob:')
            );
            
            dbPayload.documents = [...existingDocs, ...uploadedDocs];
        } else {
            // Se não houve novos uploads, ainda assim limpamos rascunhos Base64 que possam ter ficado no payload
            dbPayload.documents = (student.documents || []).filter(doc => 
                doc.url && !doc.url.startsWith('data:') && !doc.url.startsWith('blob:')
            );
        }

        // Formato JSONB: Garantindo envio como objetos limpos para o banco
        const jsonbFields = ['address', 'documents', 'clinical_info', 'family_info', 'educational_info', 'guardians'];
        jsonbFields.forEach(field => {
            if (dbPayload[field]) {
                dbPayload[field] = JSON.parse(JSON.stringify(dbPayload[field]));
            }
        });

        // RE-INJEÇÃO DE SEGURANÇA PARA ESCOLA
        if (currentUserProfile?.role === 'ESCOLA' && forcedSchoolId) {
            dbPayload.school_id = forcedSchoolId;
            // Remove school_id redundante de dentro do JSON se existir
            if (dbPayload.educational_info) delete dbPayload.educational_info.schoolId;
            console.log("[DEBUG] Re-injeção de segurança school_id para ESCOLA:", forcedSchoolId);
        }

        // Estratégia de salvamento
        let data: any;
        let error: any;

        // Quando o aluno já tem UUID válido, usar UPDATE puro em vez de UPSERT.
        // O UPSERT (POST com on_conflict) exige que o usuário passe TANTO as policies
        // de INSERT quanto as de UPDATE. SPECIALISTs têm permissão de UPDATE mas não
        // de INSERT, causando 403 mesmo para registros que já existem.
        if (hasValidId) {
            console.log(`[SupabaseService] UPDATE direto via id (aluno existente)...`);
            const { id: studentId, ...payloadWithoutId } = dbPayload;
            const result = await supabase
                .from('students')
                .update(payloadWithoutId)
                .eq('id', studentId)
                .select('*');
            data = result.data;
            error = result.error;
        } else {
            // Novo aluno sem UUID: usa UPSERT por CPF (apenas ADMIN/perfis com INSERT chega aqui)
            const conflictTarget = dbPayload.cpf ? 'cpf' : 'id';
            console.log(`[SupabaseService] UPSERT via ${conflictTarget} (novo aluno sem UUID)...`);
            const result = await supabase
                .from('students')
                .upsert(dbPayload, { onConflict: conflictTarget })
                .select('*');
            data = result.data;
            error = result.error;
        }

        if (error) {
            console.error('ERRO_SUPABASE:', error);
            if (error.code === '42501' || error.message?.includes('row-level security')) {
                throw new Error('Sem permissão para salvar este aluno. Verifique se existe um agendamento ativo vinculado a você.');
            }
            throw new Error('Erro ao salvar: ' + error.message);
        }

        if (!data || data.length === 0) {
            throw new Error('Sem permissão para salvar este aluno. Verifique se existe um agendamento ativo vinculado a você.');
        }

        this.invalidateCache('students_');
        return Array.isArray(data) ? data[0].id : data.id;
    }

    static async deleteStudent(id: string): Promise<void> {
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) throw error;
        
        // Invalida o cache
        this.invalidateCache('students_');
    }

    static async mergeStudents(targetId: string, duplicateId: string) {
        const { error } = await supabase.rpc('merge_students', { 
            target_student_id: targetId, 
            duplicate_student_id: duplicateId 
        });
        if (error) throw new Error(error.message);
        
        // Invalida o cache para que a lista seja atualizada na próxima consulta
        this.invalidateCache('students_');
        
        return true;
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

        const names = [...new Set(identifiers.map(i => i.name).filter(Boolean) as string[])];
        const cpfs = [...new Set(identifiers.map(i => sanitizeCPF(i.cpf)).filter(Boolean) as string[])];

        if (names.length === 0 && cpfs.length === 0) return {};

        const selectCols = 'id, full_name, cpf';
        const IN_CHUNK = 100;
        const rowsById = new Map<string, any>();

        const fetchInChunks = async (column: 'full_name' | 'cpf', values: string[]) => {
            for (let i = 0; i < values.length; i += IN_CHUNK) {
                const chunk = values.slice(i, i + IN_CHUNK);
                const { data, error } = await supabase
                    .from('students')
                    .select(selectCols)
                    .in(column, chunk);
                if (error) {
                    console.error('[SupabaseService] Erro no lookup de alunos:', error);
                    return;
                }
                (data || []).forEach((s: any) => {
                    if (s?.id) rowsById.set(s.id, s);
                });
            }
        };

        if (names.length > 0) await fetchInChunks('full_name', names);
        if (cpfs.length > 0) await fetchInChunks('cpf', cpfs);

        const map: Record<string, string> = {};
        rowsById.forEach((s: any) => {
            const normalizedName = s.full_name || s.name;
            if (normalizedName) map[normalizedName] = s.id;
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

            const cleanedPayloads = payloads.map(p => this.cleanDataForSupabase(p));

            const { data, error } = await supabase.from('students').upsert(cleanedPayloads, { onConflict: 'cpf' }).select('id, full_name');

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
        const payload = this.cleanDataForSupabase({
            id: session.id, // Envia o ID para que o upsert consiga identificar registros existentes
            student_id: studentId,
            professional_id: professionalId,
            specialty: this.SPECIALTY_MAP[session.specialty] || session.specialty,
            date: session.date,
            content: session.content || { summary: session.notes }, // Usa o content completo se existir
            private_notes: session.privateNotes
        });
        const { error } = await supabase.from('clinical_sessions').upsert(payload);
        if (error) {
            console.error('[SupabaseService] Erro ao salvar clinical_session:', error);
            throw new Error(error.message || JSON.stringify(error));
        }
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
                .select('id, name, inep, director, phone, district, is_active, has_internet, internet_type, internet_providers, address')
                .order('name');

            if (error) throw error;

            const schools = (data || []).map((s: any) => ({
                id: s.id || '',
                name: s.name || 'Escola sem Nome',
                inep: s.inep || '',
                director: s.director || '',
                phone: s.phone || '',
                district: s.district || s.address?.district || 'Sede',
                isActive: s.is_active === true,
                hasInternet: s.has_internet,
                internetType: s.internet_type,
                internetProviders: s.internet_providers || {},
                address: s.address || { street: '', number: '', district: '', city: 'Brotas', state: 'BA', zipCode: '' }
            }));

            this.setInCache(cacheKey, schools, 5 * 60 * 1000);
            return schools;
        } catch (err) {
            console.error('[SupabaseService] Erro fatal em getSchools:', err);
            return [];
        }
    }

    /** Uma escola por id (ex.: exibir nome no agendamento). */
    static async getSchoolById(id: string): Promise<School | null> {
        if (!id) return null;
        try {
            const { data, error } = await supabase
                .from('schools')
                .select('id, name, inep, director, phone, district, is_active, has_internet, internet_type, internet_providers, address')
                .eq('id', id)
                .maybeSingle();
            if (error) throw error;
            if (!data) return null;
            const s = data as any;
            return {
                id: s.id || '',
                name: s.name || 'Escola sem Nome',
                inep: s.inep || '',
                director: s.director || '',
                phone: s.phone || '',
                district: s.district || s.address?.district || 'Sede',
                isActive: s.is_active === true,
                hasInternet: s.has_internet,
                internetType: s.internet_type,
                internetProviders: s.internet_providers || {},
                address: s.address || { street: '', number: '', district: '', city: 'Brotas', state: 'BA', zipCode: '' }
            };
        } catch (err) {
            console.error('[SupabaseService] getSchoolById:', err);
            return null;
        }
    }

    /**
     * Busca parcial por nome (case-insensitive). Escapa % e _ do padrão ILIKE.
     * @param searchTerm texto digitado (sem debounce aqui — faça no componente).
     */
    static async searchSchoolsByName(searchTerm: string, opts?: { limit?: number }): Promise<School[]> {
        const raw = (searchTerm || '').trim();
        if (!raw) return [];
        const limit = Math.min(Math.max(opts?.limit ?? 24, 1), 50);
        const escaped = raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
        try {
            const { data, error } = await supabase
                .from('schools')
                .select('id, name, inep, director, phone, district, is_active')
                .or('is_active.is.null,is_active.eq.true')
                .ilike('name', `%${escaped}%`)
                .order('name', { ascending: true })
                .limit(limit);
            if (error) throw error;
            return (data || []).map((s: any) => ({
                id: s.id || '',
                name: s.name || 'Escola sem Nome',
                inep: s.inep || '',
                director: s.director || '',
                phone: s.phone || '',
                district: s.district || s.address?.district || 'Sede',
                isActive: s.is_active === true,
            }));
        } catch (err) {
            console.error('[SupabaseService] searchSchoolsByName:', err);
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
            internet_type: school.internetType,
            internet_providers: school.internetProviders || {}
        };

        if (school.id) {
            payload.id = school.id;
        }

        const { error } = await supabase.from('schools').upsert(this.cleanDataForSupabase(payload));
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
        const dbPayload = this.cleanDataForSupabase(payload);
        if (user.id && user.id.length > 5) {
            const { error: updateError } = await supabase.from('profiles').update(dbPayload).eq('id', user.id);
            error = updateError;
        } else {
            console.warn('Criação de usuário via SupabaseService requer auth.signUp.');
            const { error: insertError } = await supabase.from('profiles').insert(dbPayload);
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
                .maybeSingle(); // retorna null (não 406) quando não há rows

            if (error) throw error;

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
        // `system_settings.id` no banco é int fixo (1); não enviar string — sobrescrevia o id: 1 do upsert.
        const payload = {
            system_name: settings.systemName,
            active_theme_id: settings.activeThemeId,
            logo_url: settings.logoUrl,
            login_background_image: settings.loginBackgroundImage,
            show_login_info: settings.showLoginInfo
        };

        // Cache local para carregamento instantâneo
        try {
            localStorage.setItem('brotar_system_settings', JSON.stringify({ id: 1, ...payload }));
        } catch (e) {
            console.warn('Cache local cheio ou indisponível. A imagem será salva apenas no servidor.', e);
            // Podemos tentar limpar cache antigo se necessário, ou apenas ignorar
        }

        // Assumindo que existe apenas um registro de settings (id 1 ou similar)
        // Ou fazemos upsert baseado em uma chave fixa se a tabela for singleton
        const { error } = await supabase.from('system_settings').upsert(this.cleanDataForSupabase({ id: 1, ...payload }));
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

        const { error } = await supabase.from('letterhead_config').upsert(this.cleanDataForSupabase({ id: unitId, ...payload }));
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

    /** Inbox: mensagens diretas ao usuário + broadcast (recipient_id nulo). */
    static async getNotificationsInbox(userId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('system_messages')
            .select(`
                *,
                sender:profiles!fk_sender (full_name, role)
            `)
            .or(`recipient_id.eq.${userId},recipient_id.is.null`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar inbox de notificações:', error);
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
            .insert(this.cleanDataForSupabase({
                sender_id: senderId,
                recipient_id: recipientId,
                title,
                content,
                priority,
                type
            }));

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
    static async getAppointments(filters: { date?: string, fromDate?: string, toDate?: string, unit?: Unit, specialty?: Specialty, status?: AppointmentStatus, studentId?: string, professionalId?: string }): Promise<Appointment[]> {
        let query = supabase.from('appointments').select('*').or('excluido.is.null,excluido.eq.false');

        if (filters.date) {
            query = query.eq('date', filters.date);
        } else {
            if (filters.fromDate) {
                query = query.gte('date', filters.fromDate);
            }
            if (filters.toDate) {
                query = query.lte('date', filters.toDate);
            }
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
            createdAt: a.created_at,
            conflitoHorarioAluno: a.conflito_horario_aluno === true
        }));
    }

    /** Dois intervalos [início, fim) em HH:mm do mesmo dia se sobrepõem (comparação lexicográfica HH:mm). */
    static horariosIntervaloSobrepostos(
        aInicio: string,
        aFim: string,
        bInicio: string,
        bFim: string
    ): boolean {
        return aInicio < bFim && bInicio < aFim;
    }

    /** Agendamentos que ocupam o horário e intersectam a janela informada. */
    static filtrarAgendamentosSobrepostosJanela(
        agendamentos: Appointment[],
        horarioInicio: string,
        horarioFim: string,
        excludeAppointmentId?: string
    ): Appointment[] {
        if (!horarioInicio || !horarioFim) return [];
        return agendamentos.filter((a) => {
            if (excludeAppointmentId && a.id === excludeAppointmentId) return false;
            if (!statusAgendamentoOcupandoHorarioConflito(a.status)) return false;
            return this.horariosIntervaloSobrepostos(
                horarioInicio,
                horarioFim,
                a.startTime,
                a.endTime
            );
        });
    }

    /** Opções para reutilizar lista já carregada (evita consulta duplicada na UI). */
    static async verificarConflitosProfissional(
        profissionalId: string,
        data: string,
        horarioInicio: string,
        horarioFim: string,
        opts?: { excludeAppointmentId?: string; candidatos?: Appointment[] }
    ): Promise<Appointment[]> {
        const all =
            opts?.candidatos ??
            (await this.getAppointments({ professionalId: profissionalId, date: data }));
        return this.filtrarAgendamentosSobrepostosJanela(
            all,
            horarioInicio,
            horarioFim,
            opts?.excludeAppointmentId
        );
    }

    static async verificarConflitosAluno(
        alunoId: string,
        data: string,
        horarioInicio: string,
        horarioFim: string,
        opts?: { excludeAppointmentId?: string; candidatos?: Appointment[] }
    ): Promise<Appointment[]> {
        const all =
            opts?.candidatos ??
            (await this.getAppointments({ studentId: alunoId, date: data }));
        return this.filtrarAgendamentosSobrepostosJanela(
            all,
            horarioInicio,
            horarioFim,
            opts?.excludeAppointmentId
        );
    }

    /**
     * Agenda do profissional: filtra por `professional_id` e data (dia exato ou a partir de `fromDate`),
     * com join em `students`/`schools` para nome da escola quando o RLS permitir leitura do aluno.
     */
    static async getAgendamentosDoProfissional(
        profissionalId: string,
        dataOuOpts: string | { date?: string; fromDate?: string }
    ): Promise<AgendamentoProfissionalView[]> {
        const opts = typeof dataOuOpts === 'string' ? { date: dataOuOpts } : dataOuOpts;

        let query = supabase
            .from('appointments')
            .select(
                `
        id,
        student_id,
        student_name,
        professional_id,
        professional_name,
        specialty,
        unit,
        date,
        start_time,
        end_time,
        status,
        status_confirmacao,
        telefone_responsavel,
        notes,
        created_at,
        students (
          full_name,
          schools ( name )
        )
      `
            )
            .eq('professional_id', profissionalId)
            .or('excluido.is.null,excluido.eq.false');

        if (opts.date) {
            query = query.eq('date', opts.date);
        } else if (opts.fromDate) {
            query = query.gte('date', opts.fromDate);
        }

        const { data, error } = await query.order('date', { ascending: true }).order('start_time', { ascending: true });

        if (error) {
            console.warn('[getAgendamentosDoProfissional] join falhou, usando lista simples:', error.message);
            const fallback = await this.getAppointments({
                professionalId: profissionalId,
                date: opts.date,
                fromDate: opts.fromDate,
            });
            return fallback.map((a) => ({ ...a }));
        }

        const resolveSchool = (row: any): string | undefined => {
            const st = row.students;
            if (!st) return undefined;
            const sch = st.schools;
            if (!sch) return undefined;
            if (Array.isArray(sch)) return sch[0]?.name;
            return sch.name;
        };

        return (data || []).map((a: any) => ({
            id: a.id,
            studentId: a.student_id,
            studentName: a.student_name || a.students?.full_name || 'Sem nome',
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
            createdAt: a.created_at,
            studentSchoolName: resolveSchool(a),
        }));
    }

    static async atualizarStatusAgendamento(id: string, novoStatus: AppointmentStatus): Promise<void> {
        return this.updateAppointmentStatus(id, novoStatus);
    }

    /**
     * Marca atendimento como em curso e devolve a rota do prontuário (fluxo atual: `/app/profile` após selecionar o aluno).
     */
    static async iniciarAtendimento(agendamentoId: string, alunoId: string): Promise<{ prontuarioPath: string }> {
        const { data, error } = await supabase
            .from('appointments')
            .select('student_id')
            .eq('id', agendamentoId)
            .or('excluido.is.null,excluido.eq.false')
            .maybeSingle();
        if (error) throw error;
        if (!data?.student_id) throw new Error('Agendamento não encontrado.');
        if (data.student_id !== alunoId) throw new Error('O aluno não corresponde a este agendamento.');
        await this.updateAppointmentStatus(agendamentoId, 'EM_ATENDIMENTO');
        return { prontuarioPath: '/app/profile' };
    }

    static async saveAppointment(appointment: Partial<Appointment>): Promise<string> {
        // Atendimento sempre presencial na UI; não há coluna de modalidade no payload (tabela `appointments`).
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

        if (appointment.conflitoHorarioAluno === true) {
            payload.conflito_horario_aluno = true;
        }

        if (appointment.id) payload.id = appointment.id;

        const { data, error } = await supabase
            .from('appointments')
            .upsert(this.cleanDataForSupabase(payload))
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

    /** DELETE físico: bloqueado pelo RLS para `authenticated`; preferir `excluirAtendimentoLogico`. */
    static async deleteAppointment(id: string): Promise<void> {
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        if (error) {
            console.error('Erro ao excluir agendamento:', error);
            throw error;
        }
    }

    /**
     * Exclusão lógica (admin). RLS exige perfil ADMIN para gravar `excluido = true`.
     */
    static async excluirAtendimentoLogico(
        agendamentoId: string,
        adminId: string,
        motivo?: string,
        papelPerfil?: string
    ): Promise<void> {
        const payload = this.cleanDataForSupabase({
            excluido: true,
            excluido_em: new Date().toISOString(),
            excluido_por: adminId,
            motivo_exclusao: motivo?.trim() ? motivo.trim() : null,
            excluido_papel: papelPerfil?.trim() ? papelPerfil.trim() : null,
        });
        const { error } = await supabase.from('appointments').update(payload).eq('id', agendamentoId);
        if (error) {
            console.error('Erro na exclusão lógica do agendamento:', error);
            throw error;
        }
    }

    /**
     * Salva um atendimento histórico/retroativo (lançado a partir de papel).
     * Valida se a data não é futura e se há um vínculo prévio (histórico de consultas ativas)
     * entre o profissional e o aluno. Insere com status 'RETROATIVO' sem checar conflitos.
     */
    static async salvarAtendimentoRetroativo(payload: {
        studentId: string;
        studentName: string;
        professionalId: string;
        professionalName: string;
        specialty: string;
        unit: string;
        date: string;          // Formato YYYY-MM-DD
        startTime: string;     // Formato HH:mm
        endTime: string;       // Formato HH:mm
        notes?: string;
        tipoAtendimento: 'INDIVIDUAL' | 'GRUPO';
    }): Promise<string> {
        // 1. Validar se a data não é futura
        const inputDate = new Date(`${payload.date}T12:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dateOnlyInput = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
        if (dateOnlyInput > today) {
            throw new Error('A data do atendimento retroativo não pode ser no futuro.');
        }

        // 2. Verificar se existe pelo menos 1 appointment ativo (não-excluído) com esse par (professionalId + studentId)
        const { data: existingAppts, error: checkError } = await supabase
            .from('appointments')
            .select('id')
            .eq('professional_id', payload.professionalId)
            .eq('student_id', payload.studentId)
            .or('excluido.is.null,excluido.eq.false')
            .limit(1);

        if (checkError) {
            throw new Error(`Erro ao validar vínculo histórico: ${checkError.message}`);
        }

        if (!existingAppts || existingAppts.length === 0) {
            throw new Error('Profissional não possui vínculo com este aluno');
        }

        // 3. Mapear dados para as colunas reais da tabela appointments
        // Como 'tipo_atendimento' não existe no banco, o prefixamos no campo 'notes'
        const notesPrefix = `[Atendimento: ${payload.tipoAtendimento}]`;
        const finalNotes = payload.notes 
            ? `${notesPrefix} ${payload.notes.trim()}`
            : notesPrefix;

        const dbPayload: any = {
            student_id: payload.studentId,
            student_name: payload.studentName,
            professional_id: payload.professionalId,
            professional_name: payload.professionalName,
            specialty: this.SPECIALTY_MAP[payload.specialty as Specialty] || payload.specialty,
            unit: payload.unit,
            date: payload.date,
            start_time: payload.startTime,
            end_time: payload.endTime,
            status: 'RETROATIVO',
            excluido: false,
            notes: finalNotes
        };

        const { data: insertedData, error: insertError } = await supabase
            .from('appointments')
            .insert(this.cleanDataForSupabase(dbPayload))
            .select('id')
            .single();

        if (insertError) {
            console.error('Erro ao salvar atendimento retroativo no Supabase:', insertError);
            throw insertError;
        }

        if (!insertedData) {
            throw new Error('Nenhum ID retornado ao salvar atendimento retroativo.');
        }

        return insertedData.id;
    }

    static async updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
        const { error } = await supabase
            .from('appointments')
            .update({ status })
            .eq('id', id)
            .or('excluido.is.null,excluido.eq.false');
        if (error) {
            console.error('Erro ao atualizar status do agendamento:', error);
            throw error;
        }
    }

    static async updateAppointmentFields(id: string, updates: { status?: string, notes?: string }): Promise<void> {
        const { error } = await supabase
            .from('appointments')
            .update(updates)
            .eq('id', id)
            .or('excluido.is.null,excluido.eq.false');
        if (error) {
            console.error('Erro ao atualizar campos do agendamento:', error);
            throw error;
        }
    }

    /**
     * Especialistas para agendamento: colunas mínimas (sem JSONB `address`), filtro por `specialty` no banco,
     * tentativa com valor em português do enum, e fallback curto (80 linhas) para não repetir timeout 57014.
     * Cada ida ao PostgREST usa AbortSignal para o fetch não ficar pendurado indefinidamente (UI "Carregando...").
     * Índice recomendado no banco: `db/migrations/V25_profiles_specialist_specialty_index.sql`.
     * Nota: em paralelo, `getStudents()` com `select('*')` satura o mesmo pool — use `compactList: true` na UI.
     */
    static async getProfessionalsBySpecialty(specialty: Specialty): Promise<User[]> {
        const dbSpecialty = (this.SPECIALTY_MAP[specialty] || specialty) as string;
        const labelPt = String(specialty);
        const cacheKey = `professionals_by_specialty:${dbSpecialty}`;

        if (!this.isCacheBypassEnabled()) {
            const cached = this.getFromCache<User[]>(cacheKey);
            if (cached) return cached;
        }

        const cols =
            'id, full_name, username, email, role, specialty, job_title, is_active, scope, phone, photo_url';

        const order = { ascending: true as const };
        const QUERY_CLIENT_MS = 14_000;

        const filterPool = (pool: any[]): any[] => {
            const targetStandard = dbSpecialty.toUpperCase();
            const targetOriginal = labelPt.toUpperCase();
            return pool.filter((p: any) => {
                const pSpec = (p.specialty || '').toUpperCase();
                const pJob = (p.job_title || '').toUpperCase();
                return (
                    pSpec === targetStandard ||
                    pSpec === targetOriginal ||
                    pJob.includes(targetStandard) ||
                    pJob.includes(targetOriginal)
                );
            });
        };

        const profilesQuery = async (
            label: string,
            build: (signal: AbortSignal) => PromiseLike<{ data: any[] | null; error: { message?: string } | null }>
        ): Promise<any[]> => {
            const ac = new AbortController();
            const timer = setTimeout(() => ac.abort(), QUERY_CLIENT_MS);
            try {
                const { data, error } = await build(ac.signal);
                if (error) {
                    console.warn(`[SupabaseService] Profissionais (${label}):`, error.message || error);
                    return [];
                }
                return data || [];
            } catch (e: any) {
                const aborted = e?.name === 'AbortError' || ac.signal.aborted;
                if (aborted) {
                    throw new Error(
                        `Tempo esgotado ao buscar profissionais (${label}, ${QUERY_CLIENT_MS / 1000}s). ` +
                            'Confira rede, RLS em `profiles` e se a migração V25 (índice role+specialty) está aplicada.'
                    );
                }
                throw e;
            } finally {
                clearTimeout(timer);
            }
        };

        return safeCall(
            () =>
                withRetry(async () => {
                    let rows: any[] = [];

                    rows = await profilesQuery('enum DB', (signal) =>
                        supabase
                            .from('profiles')
                            .select(cols)
                            .eq('role', 'SPECIALIST')
                            .eq('specialty', dbSpecialty)
                            .order('full_name', order)
                            .abortSignal(signal)
                    );

                    if (!rows.length && labelPt !== dbSpecialty) {
                        const alt = await profilesQuery('rótulo PT', (signal) =>
                            supabase
                                .from('profiles')
                                .select(cols)
                                .eq('role', 'SPECIALIST')
                                .eq('specialty', labelPt)
                                .order('full_name', order)
                                .abortSignal(signal)
                        );
                        if (alt.length) rows = alt;
                    }

                    if (!rows.length) {
                        const poolArr = await profilesQuery('fallback 80', (signal) =>
                            supabase
                                .from('profiles')
                                .select(cols)
                                .eq('role', 'SPECIALIST')
                                .order('full_name', order)
                                .limit(80)
                                .abortSignal(signal)
                        );

                        const filtered = filterPool(poolArr);
                        rows = filtered.length > 0 ? filtered : poolArr;
                        if (filtered.length === 0 && poolArr.length > 0) {
                            console.warn(
                                `[SupabaseService] Nenhum match fino para "${specialty}". Listando ${rows.length} perfis do fallback (máx. 80).`
                            );
                        }
                    }

                    const users = rows.map((p: any) => this.mapProfileToUser(p));
                    this.setInCache(cacheKey, users, 3 * 60 * 1000);
                    console.log(`[SupabaseService] Profissionais para "${specialty}": ${users.length}`);
                    return users;
                }),
            2,
            400,
            'getProfessionalsBySpecialty'
        );
    }

    /**
     * Todos os especialistas ativos (cache 3 min) — uma query para a tela de agendamento;
     * filtrar por especialidade no cliente.
     */
    static async getProfissionaisAtivos(): Promise<User[]> {
        const cacheKey = 'profissionais_ativos_agenda_v1';
        if (!this.isCacheBypassEnabled()) {
            const cached = this.getFromCache<User[]>(cacheKey);
            if (cached) return cached;
        }
        const cols =
            'id, full_name, username, email, role, specialty, job_title, is_active, scope, phone, photo_url';
        return safeCall(
            () =>
                withRetry(async () => {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select(cols)
                        .eq('role', 'SPECIALIST')
                        .eq('is_active', true)
                        .order('full_name', { ascending: true });
                    if (error) {
                        console.warn('[SupabaseService] getProfissionaisAtivos:', error.message || error);
                        return [];
                    }
                    const users = (data || []).map((p: any) => this.mapProfileToUser(p));
                    this.setInCache(cacheKey, users, 3 * 60 * 1000);
                    return users;
                }),
            2,
            400,
            'getProfissionaisAtivos'
        );
    }

    /** Contagem de profissionais ativos por valor do enum `Specialty` (lista tipicamente de `getProfissionaisAtivos`). */
    static getEspecialidadesComContagem(
        profissionais: User[]
    ): Array<{ specialty: Specialty; count: number }> {
        const counts = new Map<Specialty, number>();
        for (const s of Object.values(Specialty) as Specialty[]) {
            counts.set(s, 0);
        }
        for (const p of profissionais) {
            const s = p.specialty;
            if (s && counts.has(s)) {
                counts.set(s, (counts.get(s) || 0) + 1);
            }
        }
        return (Object.values(Specialty) as Specialty[]).map((specialty) => ({
            specialty,
            count: counts.get(specialty) || 0
        }));
    }

    /** Alias de `getEspecialidadesComContagem` (documentação / integrações). */
    static getEspecialidades(profissionais: User[]): Array<{ specialty: Specialty; count: number }> {
        return this.getEspecialidadesComContagem(profissionais);
    }

    /** Persiste agendamento (INSERT/UPDATE) — mesmo fluxo validado de `saveAppointment`. */
    static async confirmarAgendamento(appointment: Partial<Appointment>): Promise<string> {
        return this.saveAppointment(appointment);
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

        return (data ?? []).map((d: any) => ({
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
        const payload = this.cleanDataForSupabase({
            student_id: doc.studentId,
            student_name: doc.studentName,
            doc_type: doc.docType,
            document_code: doc.code,
            content: doc.content,
            professional_name: doc.professionalName
        });
        const { error } = await supabase.from('generated_documents').insert(payload);
        if (error) throw error;
    }

    static async deleteDocument(id: string): Promise<void> {
        const { error } = await supabase.from('generated_documents').delete().eq('id', id);
        if (error) throw error;
    }

    // --- Support Professionals ---
    /**
     * Envia arquivo de anexo (RG, certificado, etc.) para o bucket já usado em documentos de alunos.
     * Caminho prefixado com support_professional/ para organização e políticas do Storage.
     */
    static async uploadSupportProfessionalAttachmentFile(
        file: File,
        category: SupportProfessionalAttachmentCategory
    ): Promise<SupportProfessionalAttachment> {
        const sane = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `support_professional/${category}_${Date.now()}_${sane}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('student-documents')
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            console.error('[SupabaseService] uploadSupportProfessionalAttachmentFile:', uploadError);
            throw new Error(
                `Não foi possível enviar o arquivo (${uploadError.message}). ` +
                    'Confirme o bucket Storage "student-documents" e permissões para a pasta support_professional/.'
            );
        }

        const { data: publicUrlData } = supabase.storage.from('student-documents').getPublicUrl(uploadData.path);
        return {
            category,
            fileName: file.name,
            url: publicUrlData.publicUrl,
            uploadedAt: new Date().toISOString(),
        };
    }

    private static parseSupportProfessionalAttachments(raw: unknown): SupportProfessionalAttachment[] {
        if (!Array.isArray(raw)) return [];
        const allowed: SupportProfessionalAttachmentCategory[] = [
            'rg',
            'cpf_documento',
            'certificado',
            'conta_bancaria',
            'historico_escolar',
        ];
        return raw
            .filter(
                (x: any) =>
                    x &&
                    typeof x.url === 'string' &&
                    allowed.includes(x.category as SupportProfessionalAttachmentCategory)
            )
            .map((x: any) => ({
                category: x.category as SupportProfessionalAttachmentCategory,
                fileName: String(x.fileName || 'documento'),
                url: String(x.url),
                uploadedAt: String(x.uploadedAt || new Date().toISOString()),
            }));
    }

    static async getSupportProfessionalsByStudent(studentId: string): Promise<SupportProfessional[]> {
        return safeCall(async () => {
            const suffixes = [',photo_url,attachments', ',photo_url', ''] as const;

            const runSuffixLoop = async (includeSoftDeleteCols: boolean): Promise<any[] | null> => {
                const soft = includeSoftDeleteCols ? ', status, unlinked_at' : '';
                const selectFor = (nameField: 'name' | 'full_name', suffix: string) =>
                    `id, ${nameField}, cpf, phone, email, education,
                    contract_start_date, workload, address, school_id,
                    regent_teacher, student_id, created_at${soft}${suffix}`;

                const runQuery = async (nameField: 'name' | 'full_name', suffix: string) =>
                    supabase
                        .from('support_professionals')
                        .select(selectFor(nameField, suffix))
                        .eq('student_id', studentId)
                        .order(nameField);

                let data: any[] | null = null;

                outer: for (const suffix of suffixes) {
                    let res = await runQuery('name', suffix);
                    if (!res.error) {
                        data = res.data;
                        break outer;
                    }
                    const msg = String(res.error.message || '');
                    if (res.error.code === '42703' && /attachments|photo_url/i.test(msg)) {
                        console.warn('[getSupportProfessionalsByStudent] Colunas opcionais ausentes; tentando select reduzido.', msg);
                        continue outer;
                    }
                    if (res.error.code === '42703' && /status|unlinked_at/i.test(msg) && includeSoftDeleteCols) {
                        console.warn('[getSupportProfessionalsByStudent] Colunas status/unlinked_at ausentes; repetindo sem elas.', msg);
                        return null;
                    }
                    if (res.error && (res.error.message?.includes('name') || res.error.code === '42703')) {
                        const resFull = await runQuery('full_name', suffix);
                        if (!resFull.error) {
                            data = resFull.data;
                            break outer;
                        }
                        const msg2 = String(resFull.error.message || '');
                        if (resFull.error.code === '42703' && /attachments|photo_url/i.test(msg2)) {
                            console.warn('[getSupportProfessionalsByStudent] (full_name) Colunas opcionais ausentes; tentando select reduzido.', msg2);
                            continue outer;
                        }
                        if (resFull.error.code === '42703' && /status|unlinked_at/i.test(msg2) && includeSoftDeleteCols) {
                            console.warn('[getSupportProfessionalsByStudent] (full_name) status/unlinked_at ausentes; repetindo sem elas.', msg2);
                            return null;
                        }
                        console.error(`Erro ao buscar ATs para o aluno ${studentId}:`, resFull.error);
                        throw resFull.error;
                    }
                    console.error(`Erro ao buscar ATs para o aluno ${studentId}:`, res.error);
                    throw res.error;
                }

                return data;
            };

            let data = await runSuffixLoop(true);
            if (data === null) {
                data = await runSuffixLoop(false);
            }

            if (data === null) {
                throw new Error('Não foi possível carregar profissionais de apoio do aluno.');
            }

            return (data ?? []).map((p: any) => ({
                id: p.id,
                name: p.name || p.full_name || 'Sem nome',
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
                createdAt: p.created_at,
                photoUrl: p.photo_url || '',
                attachments: this.parseSupportProfessionalAttachments(p.attachments),
                status: (p.status as SupportProfessional['status']) || 'ativo',
                unlinkedAt: p.unlinked_at ?? null,
            }));
        }, 2, 300, `getSupportProfessionalsByStudent(${studentId})`);
    }

    static async getSupportProfessionals(inputSchoolId?: string): Promise<SupportProfessional[]> {
        return safeCall(async () => {
            const { data: { session } } = await supabase.auth.getSession();

            let profile: User | null = null;
            if (session?.user) {
                profile = await SupabaseService.getUserProfile(session.user.id);
                if (profile?.role === 'ESCOLA' && !profile.schoolId) {
                    console.warn('[SupabaseService][getSupportProfessionals] ESCOLA sem school_id; re-fetch do perfil.');
                    this.userProfileCache.delete(session.user.id);
                    profile = await SupabaseService.getUserProfile(session.user.id);
                }
            }

            const role = (profile?.role || '').toUpperCase();
            const profileSchoolId = profile?.schoolId ?? null;

            // ADMIN: busca global; filtro por escola só com UUID explícito (nunca '', 'all'/'ALL').
            // Outros papéis: filtram por school_id do perfil quando existir.
            const trimmedSchoolInput = (inputSchoolId ?? '').trim();
            const isAllSchoolsToken = trimmedSchoolInput.length === 0 || /^all$/i.test(trimmedSchoolInput);

            let schoolIdForFilter: string | undefined;
            if (role === 'ADMIN') {
                if (!isAllSchoolsToken) {
                    schoolIdForFilter = trimmedSchoolInput;
                }
            } else if (profileSchoolId) {
                schoolIdForFilter = profileSchoolId;
            }

            console.log('[getSupportProfessionals] role:', role, '| schoolIdForFilter:', schoolIdForFilter ?? '(none)');

            const filtrarPorEscola = !!schoolIdForFilter;

            const PAGE = 50;

            const fetchPages = async (orderCol: 'name' | 'full_name', selectList: string) => {
                const acc: any[] = [];
                for (let from = 0; ; from += PAGE) {
                    const to = from + PAGE - 1;
                    let q = supabase.from('support_professionals').select(selectList);
                    if (filtrarPorEscola) {
                        q = q.eq('school_id', schoolIdForFilter as string);
                    }
                    const { data, error } = await q
                        .order(orderCol, { ascending: true })
                        .range(from, to)
                        .limit(PAGE);
                    if (error) throw error;
                    if (!data?.length) break;
                    acc.push(...data);
                    if (data.length < PAGE) break;
                }
                return acc;
            };

            const tryFetchList = async (selectList: string) => {
                try {
                    return await withRetry(() => fetchPages('name', selectList));
                } catch (e: any) {
                    const msg = String(e?.message || '');
                    if (e?.code === '42703' && /support_professionals\.name\b/i.test(msg)) {
                        console.warn('[SupabaseService][getSupportProfessionals] Coluna name indisponível; tentando full_name.', msg);
                        return await withRetry(() => fetchPages('full_name', selectList));
                    }
                    throw e;
                }
            };

            // Colunas opcionais: V29 (status/unlinked_at) e V14 (attachments, photo_url)
            const loadWithFallbacks = async (selFull: string, selPhoto: string, selLegacy: string): Promise<any[]> => {
                try {
                    return await tryFetchList(selFull);
                } catch (e: any) {
                    if (e?.code !== '42703') throw e;
                    const msg0 = String(e?.message || '');
                    if (/status|unlinked_at/i.test(msg0) && selFull.includes('status')) {
                        console.warn(
                            '[SupabaseService][getSupportProfessionals] Colunas status/unlinked_at ausentes; repetindo SELECT sem soft delete.',
                            msg0
                        );
                        return await loadWithFallbacks(
                            this.stripSupportProfessionalSoftDeleteSelectCols(selFull),
                            this.stripSupportProfessionalSoftDeleteSelectCols(selPhoto),
                            this.stripSupportProfessionalSoftDeleteSelectCols(selLegacy)
                        );
                    }
                    if (!/attachments|photo_url/i.test(msg0)) throw e;
                    console.warn(
                        '[SupabaseService][getSupportProfessionals] Select com attachments falhou (42703); tentando sem attachments.',
                        msg0
                    );
                    try {
                        return await tryFetchList(selPhoto);
                    } catch (e2: any) {
                        if (e2?.code !== '42703') throw e2;
                        const msg2 = String(e2?.message || '');
                        if (/status|unlinked_at/i.test(msg2) && selPhoto.includes('status')) {
                            return await loadWithFallbacks(
                                this.stripSupportProfessionalSoftDeleteSelectCols(selFull),
                                this.stripSupportProfessionalSoftDeleteSelectCols(selPhoto),
                                this.stripSupportProfessionalSoftDeleteSelectCols(selLegacy)
                            );
                        }
                        if (!/photo_url|attachments/i.test(msg2)) throw e2;
                        console.warn(
                            '[SupabaseService][getSupportProfessionals] Select com photo_url falhou; usando colunas legadas.',
                            msg2
                        );
                        return await tryFetchList(selLegacy);
                    }
                }
            };

            const data = await loadWithFallbacks(
                this.SUPPORT_PRO_LIST_SELECT_FULL,
                this.SUPPORT_PRO_LIST_SELECT_PHOTO,
                this.SUPPORT_PRO_LIST_SELECT_LEGACY
            );

            return (data || []).map((p: any) => ({
                id: p.id,
                name: p.name || p.full_name || 'Sem nome',
                cpf: p.cpf || '',
                phone: p.phone || '',
                photoUrl: p.photo_url || '',
                education: p.education || '',
                schoolId: p.school_id || '', // UUID Puro
                studentId: p.student_id || '',
                regentTeacher: p.regent_teacher || '-',
                contractStartDate: p.contract_start_date || '',
                workload: p.workload || '',
                email: p.email || '',
                address: p.address || {},
                createdAt: p.created_at || new Date().toISOString(),
                attachments: this.parseSupportProfessionalAttachments(p.attachments),
                status: (p.status as SupportProfessional['status']) || 'ativo',
                unlinkedAt: p.unlinked_at ?? null,
                schoolIdUnlinked: p.school_id_unlinked ?? null,
                studentIdUnlinked: p.student_id_unlinked ?? null,
                regentTeacherUnlinked: p.regent_teacher_unlinked ?? null,
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
            const cleanCPF = prof.cpf ? prof.cpf.replace(/\D/g, '') : '';
            const payload: any = {
                id: prof.id,
                name: prof.name,
                cpf: cleanCPF || null,
                phone: prof.phone,
                email: prof.email,
                education: prof.education,
                contract_start_date: toNull(prof.contractStartDate),
                workload: prof.workload,
                address: prof.address,
                school_id: toNull(prof.schoolId),
                regent_teacher: prof.regentTeacher,
                student_id: toNull(prof.studentId),
            };
            if (prof.status !== undefined && prof.status !== null) {
                payload.status = prof.status;
            }
            if (prof.unlinkedAt !== undefined) {
                payload.unlinked_at = prof.unlinkedAt || null;
            }
            if (prof.photoUrl !== undefined) {
                payload.photo_url = prof.photoUrl || null;
            }
            if (prof.attachments !== undefined) {
                payload.attachments = Array.isArray(prof.attachments) ? prof.attachments : [];
            }

            return this.cleanDataForSupabase(payload);
        });

        console.log(`[SupabaseService] Realizando bulk upsert de ${payloads.length} profissionais...`);

        return safeCall(async () => {
            let toUpsert: any[] = payloads;
            let { error } = await supabase.from('support_professionals').upsert(toUpsert);

            // DB sem migration V14: coluna attachments inexistente (42703)
            if (error?.code === '42703' && /attachments/i.test(String(error.message || ''))) {
                console.warn('[SupabaseService] upsert support_professionals: coluna attachments ausente; repetindo sem attachments.');
                toUpsert = toUpsert.map((p: any) => {
                    const copy = { ...p };
                    delete copy.attachments;
                    return copy;
                });
                ({ error } = await supabase.from('support_professionals').upsert(toUpsert));
            }
            if (error?.code === '42703' && /photo_url/i.test(String(error.message || ''))) {
                console.warn('[SupabaseService] upsert support_professionals: coluna photo_url ausente; repetindo sem photo_url.');
                toUpsert = toUpsert.map((p: any) => {
                    const copy = { ...p };
                    delete copy.photo_url;
                    return copy;
                });
                ({ error } = await supabase.from('support_professionals').upsert(toUpsert));
            }

            if (error) {
                console.error('Erro no UPSERT de profissionais:', error);
                
                // Tratamento amigável para erro de violação de unicidade (ex: CPF já existe)
                if (error.code === '23505') {
                    throw new Error('Já existe um profissional cadastrado com este CPF.');
                }

                if (error.code === '42501' || error.message.includes('RLS') || error.message.includes('permission denied')) {
                    throw new Error(
                        'Permissão negada ao salvar (políticas de segurança do banco). ' +
                            'Confirme no Supabase as políticas em support_professionals: equipe (V16/V29) e perfil ESCOLA na própria escola (migração V30). ' +
                            `Detalhe: ${error.message || error.code || 'RLS'}`
                    );
                }
                throw new Error(`Erro Banco de Dados (Upsert): ${error.message}`);
            }
        });
    }

    /** Desativa o cadastro (exclusão lógica), preserva vínculos originais em colunas de histórico e limpa os vínculos ativos. */
    static async unlinkSupportProfessional(id: string): Promise<void> {
        const unlinked_at = new Date().toISOString();

        // 1. Buscar dados atuais para preservar no histórico
        const { data: current, error: fetchError } = await supabase
            .from('support_professionals')
            .select('school_id, student_id, regent_teacher')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (!current) throw new Error('Profissional não encontrado.');

        // 2. Preservar dados originais e limpar vínculos ativos
        const { error } = await supabase
            .from('support_professionals')
            .update({
                status: 'desativado',
                unlinked_at,
                school_id_unlinked: current.school_id,
                student_id_unlinked: current.student_id,
                regent_teacher_unlinked: current.regent_teacher,
                school_id: null,
                student_id: null,
                regent_teacher: null,
            })
            .eq('id', id);
        if (error) throw error;
    }

    /** Reativa uma profissional desativada, sem vínculos (serão preenchidos via edição/cadastro). */
    static async reactivateSupportProfessional(id: string): Promise<void> {
        const { error } = await supabase
            .from('support_professionals')
            .update({
                status: 'ativo',
                unlinked_at: null,
            })
            .eq('id', id);
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
    /** Normaliza corpo JSON de erro (Meta Graph, nginx, Express) para texto legível. */
    private static formatWhatsAppApiError(data: unknown, httpStatus: number): string {
        const hint401 =
            httpStatus === 401
                ? ' Verifique no servidor se WHATSAPP_TOKEN está válido (token da Meta expira) ou se a rota exige Authorization (BROTAR_WHATSAPP_SEND_SECRET).'
                : '';
        if (data == null || typeof data !== 'object') {
            return `Erro HTTP ${httpStatus} na API de envio.${hint401}`;
        }
        const d = data as Record<string, unknown>;
        const err = d.error;
        if (typeof err === 'string') return `${err}${hint401}`;
        if (err && typeof err === 'object') {
            const em = (err as Record<string, unknown>).message;
            if (typeof em === 'string') return `${em}${hint401}`;
            const nested = (err as Record<string, unknown>).error;
            if (nested && typeof nested === 'object' && typeof (nested as Record<string, unknown>).message === 'string') {
                return `${(nested as Record<string, string>).message}${hint401}`;
            }
        }
        if (typeof d.message === 'string') return `${d.message}${hint401}`;
        try {
            const s = JSON.stringify(data);
            return (s.length > 400 ? `${s.slice(0, 400)}…` : s) + hint401;
        } catch {
            return `Erro HTTP ${httpStatus} na API de envio.${hint401}`;
        }
    }

    /**
     * Envia notificação de WhatsApp via API Node (ex.: Hostinger).
     * URL: VITE_BROTAR_API_BASE_URL ou padrão api-brotar.smebrotas.com.br.
     * Opcional: VITE_BROTAR_WHATSAPP_SEND_SECRET como Bearer se o servidor exigir.
     */
    static async sendWhatsAppNotification(details: {
        student: string,
        professional: string,
        date: string,
        time: string,
        phone: string,
        appointmentId: string,
        unit: string
    }) {
        console.log('[SupabaseService] Enviando WhatsApp via API local...', details);

        const API_URL =
            (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
            'https://api-brotar.smebrotas.com.br';
        const sendSecret =
            typeof import.meta !== 'undefined' ? import.meta.env?.VITE_BROTAR_WHATSAPP_SEND_SECRET : undefined;
        const url = `${String(API_URL).replace(/\/$/, '')}/api/whatsapp/send`;

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (sendSecret && String(sendSecret).trim()) {
            headers.Authorization = `Bearer ${String(sendSecret).trim()}`;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    telefone: details.phone.replace(/\D/g, ''),
                    nome: details.student,
                    data: details.date,
                    hora: details.time,
                    professional: details.professional,
                    appointmentId: details.appointmentId,
                    unit: details.unit
                })
            });

            // [DEFENSIVE] Verifica se o conteúdo é JSON antes de tentar o parse
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error('[SupabaseService] Resposta não-JSON recebida:', text.substring(0, 100));
                throw new Error('O servidor de WhatsApp retornou uma resposta inválida (HTML em vez de JSON). Verifique se o backend está ativo.');
            }

            const data = await response.json();

            if (!response.ok) {
                console.error('[SupabaseService] Erro no backend WhatsApp:', response.status, data);
                throw new Error(this.formatWhatsAppApiError(data, response.status));
            }

            console.log('[SupabaseService] Sucesso no envio:', data);
            return data;
        } catch (err: any) {
            console.error('[SupabaseService] Falha técnica no envio de WhatsApp:', err);
            // Captura o erro "Failed to fetch" (CORS/Rede) e dá um nome amigável
            if (err.message === 'Failed to fetch') {
                throw new Error(
                    'Erro de conexão com a API de WhatsApp (rede, CORS ou servidor). Se o agendamento foi salvo, ele deve aparecer na agenda após atualizar a página.'
                );
            }
            throw err;
        }
    }

    // ─── NUTRIÇÃO ────────────────────────────────────────────────────────────

    // --- Anamnese Nutricional ---

    static async getNutritionAssessments(studentId: string): Promise<NutritionAssessment[]> {
        const { data, error } = await supabase
            .from('nutrition_assessments')
            .select('*')
            .eq('student_id', studentId)
            .order('assessment_date', { ascending: false });
        if (error) throw error;
        return (data ?? []) as NutritionAssessment[];
    }

    static async getNutritionAssessmentById(id: string): Promise<NutritionAssessment | null> {
        const { data, error } = await supabase
            .from('nutrition_assessments')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data as NutritionAssessment | null;
    }

    static async createNutritionAssessment(data: Partial<NutritionAssessment>): Promise<NutritionAssessment> {
        const { data: created, error } = await supabase
            .from('nutrition_assessments')
            .insert(data)
            .select()
            .single();
        if (error) throw error;
        return created as NutritionAssessment;
    }

    static async updateNutritionAssessment(id: string, data: Partial<NutritionAssessment>): Promise<NutritionAssessment> {
        const { data: updated, error } = await supabase
            .from('nutrition_assessments')
            .update(data)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return updated as NutritionAssessment;
    }

    // --- Histórico Antropométrico ---

    static async getAnthropometryHistory(studentId: string): Promise<NutritionAnthropometryHistory[]> {
        const { data, error } = await supabase
            .from('nutrition_anthropometry_history')
            .select('*')
            .eq('student_id', studentId)
            .order('data_medicao', { ascending: true });
        if (error) throw error;
        return (data ?? []) as NutritionAnthropometryHistory[];
    }

    static async addAnthropometryRecord(data: Partial<NutritionAnthropometryHistory>): Promise<NutritionAnthropometryHistory> {
        const { data: created, error } = await supabase
            .from('nutrition_anthropometry_history')
            .insert(data)
            .select()
            .single();
        if (error) throw error;
        return created as NutritionAnthropometryHistory;
    }

    // --- Necessidades Alimentares Especiais (NAE) ---

    static async getNAEByStudent(studentId: string): Promise<NutritionNAE[]> {
        const { data, error } = await supabase
            .from('nutrition_nae')
            .select('*')
            .eq('student_id', studentId)
            .eq('status', 'ATIVO');
        if (error) throw error;
        return (data ?? []) as NutritionNAE[];
    }

    static async getAllActiveNAE(): Promise<NutritionNAE[]> {
        const { data, error } = await supabase
            .from('nutrition_nae')
            .select('*, students(id, full_name, school_id)')
            .eq('status', 'ATIVO')
            .order('created_at', { ascending: false });
        if (error) {
            console.error('[getAllActiveNAE] Supabase error:', error);
            throw error;
        }
        return (data ?? []) as NutritionNAE[];
    }

    static async createNAE(data: Partial<NutritionNAE>): Promise<NutritionNAE> {
        const { data: created, error } = await supabase
            .from('nutrition_nae')
            .insert(data)
            .select()
            .single();
        if (error) throw error;
        return created as NutritionNAE;
    }

    static async updateNAE(id: string, data: Partial<NutritionNAE>): Promise<NutritionNAE> {
        const { data: updated, error } = await supabase
            .from('nutrition_nae')
            .update(data)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return updated as NutritionNAE;
    }

    static async getExpiredOrExpiringNAE(daysAhead: number = 30): Promise<NutritionNAE[]> {
        const hoje = new Date().toISOString().split('T')[0];
        const limite = new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('nutrition_nae')
            .select('*, students(id, full_name)')
            .eq('status', 'ATIVO')
            .not('laudo_validade', 'is', null)
            .lte('laudo_validade', limite)
            .order('laudo_validade', { ascending: true });
        if (error) {
            console.error('[getExpiredOrExpiringNAE] Supabase error:', error);
            throw error;
        }
        void hoje; // usado no caller (getNutritionDashboardStats) para classificar vencido/vencendo
        return (data ?? []) as NutritionNAE[];
    }

    // --- Educação Alimentar e Nutricional (EAN) ---

    static async getEANActivities(): Promise<NutritionEanActivity[]> {
        const { data, error } = await supabase
            .from('nutrition_ean_activities')
            .select('*')
            .order('data_atividade', { ascending: false });
        if (error) throw error;
        return (data ?? []) as NutritionEanActivity[];
    }

    static async createEANActivity(data: Partial<NutritionEanActivity>): Promise<NutritionEanActivity> {
        const { data: created, error } = await supabase
            .from('nutrition_ean_activities')
            .insert(data)
            .select()
            .single();
        if (error) throw error;
        return created as NutritionEanActivity;
    }

    // --- Evolução Nutricional ---

    static async getNutritionEvolutions(studentId: string): Promise<NutritionEvolution[]> {
        const { data, error } = await supabase
            .from('nutrition_evolution')
            .select('*')
            .eq('student_id', studentId)
            .order('data_retorno', { ascending: false });
        if (error) throw error;
        return (data ?? []) as NutritionEvolution[];
    }

    static async createNutritionEvolution(data: Partial<NutritionEvolution>): Promise<NutritionEvolution> {
        const { data: created, error } = await supabase
            .from('nutrition_evolution')
            .insert(data)
            .select()
            .single();
        if (error) throw error;
        return created as NutritionEvolution;
    }

    // --- Dashboard de Nutrição ---

    static async getNutritionDashboardStats(): Promise<NutritionDashboardStats> {
        const cutoff180 = new Date();
        cutoff180.setDate(cutoff180.getDate() - 180);
        const cutoff180Iso = cutoff180.toISOString().split('T')[0];

        let assessmentsData: { student_id: string; imc_classificacao: string | null; assessment_date: string }[] = [];
        let naeCount = 0;
        let expiringRows: NutritionNAE[] = [];
        let studentsCount = 0;

        try {
            const res = await supabase
                .from('nutrition_assessments')
                .select('student_id, imc_classificacao, assessment_date')
                .eq('status', 'FINALIZADA')
                .order('assessment_date', { ascending: false });
            if (!res.error) assessmentsData = (res.data ?? []) as typeof assessmentsData;
        } catch { /* tabela pode não existir ainda */ }

        try {
            const res = await supabase
                .from('nutrition_nae')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'ATIVO');
            if (!res.error) naeCount = res.count ?? 0;
        } catch { /* tabela pode não existir ainda */ }

        try {
            expiringRows = await this.getExpiredOrExpiringNAE(30);
        } catch { /* tabela pode não existir ainda */ }

        try {
            const res = await supabase
                .from('students')
                .select('id', { count: 'exact', head: true });
            if (!res.error) studentsCount = res.count ?? 0;
        } catch { /* segurança */ }

        // Pegar apenas a avaliação mais recente por aluno
        const latestByStudent = new Map<string, { imc_classificacao: string | null; assessment_date: string }>();
        for (const row of assessmentsData) {
            if (!latestByStudent.has(row.student_id)) {
                latestByStudent.set(row.student_id, {
                    imc_classificacao: row.imc_classificacao ?? null,
                    assessment_date: row.assessment_date,
                });
            }
        }

        const perfilNutricional = { baixoPeso: 0, eutrofia: 0, sobrepeso: 0, obesidade: 0, obesidadeGrave: 0 };
        for (const { imc_classificacao } of latestByStudent.values()) {
            const cls = (imc_classificacao ?? '').toLowerCase();
            if (cls.includes('baixo peso') || cls.includes('magreza')) perfilNutricional.baixoPeso++;
            else if (cls.includes('eutrofia') || cls.includes('adequado')) perfilNutricional.eutrofia++;
            else if (cls.includes('sobrepeso')) perfilNutricional.sobrepeso++;
            else if (cls.includes('obesidade grave') || cls.includes('obesidade severa') || cls.includes('obesidade grau iii')) perfilNutricional.obesidadeGrave++;
            else if (cls.includes('obesidade')) perfilNutricional.obesidade++;
        }

        // Alertas
        const alertas: NutritionAlerta[] = [];
        const hoje = new Date().toISOString().split('T')[0];

        for (const row of (expiringRows as any[])) {
            const nome = row.students?.full_name ?? 'Aluno';
            const vencido = row.laudo_validade < hoje;
            alertas.push({
                tipo: vencido ? 'LAUDO_VENCIDO' : 'LAUDO_VENCENDO',
                severidade: vencido ? 'CRITICO' : 'ATENCAO',
                student_id: row.student_id,
                studentName: nome,
                mensagem: vencido
                    ? `Laudo NAE vencido em ${row.laudo_validade}`
                    : `Laudo NAE vence em ${row.laudo_validade}`,
            });
        }

        // Alunos sem avaliação nos últimos 180 dias
        const avaliadosRecentes = new Set(
            assessmentsData
                .filter(r => r.assessment_date >= cutoff180Iso)
                .map(r => r.student_id)
        );
        for (const [sid] of latestByStudent.entries()) {
            if (!avaliadosRecentes.has(sid)) {
                alertas.push({
                    tipo: 'SEM_AVALIACAO',
                    severidade: 'ATENCAO',
                    student_id: sid,
                    studentName: '',
                    mensagem: 'Sem avaliação nutricional nos últimos 180 dias',
                });
            }
        }

        return {
            totalAlunos: studentsCount,
            avaliados: latestByStudent.size,
            pendentes: Math.max(0, studentsCount - latestByStudent.size),
            perfilNutricional,
            naeAtivos: naeCount,
            laudosVencendo: expiringRows.length,
            alertas,
        };
    }
}

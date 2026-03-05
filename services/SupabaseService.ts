import { supabase } from './supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { Student, User, School, SupportProfessional, SystemSettings, PapelTimbradoConfig, SavedDocument, Session, Specialty, UserRole, PortageAssessment, Appointment, AppointmentStatus, Unit, AuditAction, AuditLog } from '../types';

// Mapeamento de campos snake_case do banco para camelCase do frontend
const sanitizeCPF = (cpf: string | undefined | null): string => {
    if (!cpf) return '';
    return cpf.replace(/\D/g, '');
};

const mapStudentFromDB = (dbStudent: any, sessions: any[] = []): Student => ({
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
    address: dbStudent.address || {},
    guardians: dbStudent.guardians || [],
    clinical: dbStudent.clinical_info || {
        diagnosis: '', medications: '', allergies: '', specialNeeds: [], therapiesHistory: ''
    },
    school: {
        schoolId: dbStudent.school_id, // Captura o UUID da tabela schools
        schoolName: (Array.isArray(dbStudent.schools) ? dbStudent.schools[0]?.name : dbStudent.schools?.name) || 'Não vinculada',
        grade: dbStudent.grade,
        shift: dbStudent.shift as any,
        district: (Array.isArray(dbStudent.schools) ? dbStudent.schools[0]?.district : dbStudent.schools?.district) || 'Sede',
        hasSpecialAide: false,
        difficulties: ''
    },
    socialInfo: dbStudent.social_info,
    documents: dbStudent.documents || [],
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
});

// Função utilitária para retry em caso de AbortError ou falha de rede
const safeCall = async <T>(fn: () => Promise<T>, retries = 3, interval = 500): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        if (retries > 0 && (error.name === 'AbortError' || error.message?.includes('AbortError') || !navigator.onLine)) {
            console.warn(`[SupabaseService] Requisição abortada ou erro de rede. Tentando novamente... (${retries} restantes)`);
            await new Promise(resolve => setTimeout(resolve, interval));
            return safeCall(fn, retries - 1, interval * 2);
        }
        throw error;
    }
};

export class SupabaseService {
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

    // --- Auditoria ---
    static async getAuditLogs(filters?: { user?: string, date?: string, action?: string, module?: string }): Promise<AuditLog[]> {
        try {
            let query = supabase.from('audit_logs').select('*').order('data_hora', { ascending: false });

            if (filters) {
                if (filters.user) query = query.ilike('usuario', `%${filters.user}%`);
                if (filters.date) {
                    const dateObj = new Date(filters.date + 'T00:00:00'); // Garante que a data é tratada no fuso local aproximado
                    const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
                    const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);
                    query = query.gte('data_hora', startOfDay.toISOString()).lte('data_hora', endOfDay.toISOString());
                }
                if (filters.action) query = query.eq('acao', filters.action);
                if (filters.module) query = query.eq('modulo', filters.module);
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
        acao: AuditAction | string,
        modulo: string,
        registroAfetado: string
    ): Promise<void> {
        try {
            if (!currentUser) return;
            const nomeStr = currentUser.name || currentUser.email || 'Sistema';

            const { error } = await supabase.from('audit_logs').insert({
                usuario: nomeStr,
                perfil: currentUser.role,
                acao,
                modulo,
                registro_afetado: registroAfetado
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
        // Se for puramente numérico, é um INEP (Escola) e usa o sufixo @escola.brotar
        // Caso contrário, usa o padrão @brotar.com
        const suffix = /^\d+$/.test(cleanEmail) ? '@escola.brotar' : '@brotar.com';
        const finalEmail = cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}${suffix}`;

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

        // Se o perfil não existir, usamos um fallback seguro baseado no metadata do Auth
        if (profileError || !profile) {
            console.warn('Perfil não encontrado ou inacessível no banco:', profileError?.message);

            return {
                id: data.user.id,
                name: data.user.user_metadata?.full_name || finalEmail.split('@')[0],
                username: email,
                role: (data.user.user_metadata?.role as UserRole) || 'SPECIALIST',
                isActive: true,
                email: finalEmail
            };
        }

        // Reverse Mapping: DB Enum (PSICOPEDAGOGIA) -> Frontend Value (Psicopedagogia)
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

        const frontendSpecialty = profile.specialty ? (specialtyReverseMap[profile.specialty] || profile.specialty) : undefined;

        return {
            id: profile.id,
            name: profile.full_name,
            username: profile.username || email,
            role: profile.role,
            isActive: profile.is_active,
            specialty: frontendSpecialty,
            email: profile.email,
            photoUrl: profile.photo_url,
            scope: profile.scope,
            schoolInep: profile.school_inep || undefined,
            mustChangePassword: profile.must_change_password
        };
    }

    /**
     * Busca o perfil do usuário pelo ID sem precisar autenticar (útil para sessões já ativas como Recovery)
     */
    static async getUserProfile(userId: string): Promise<User | null> {
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

        const frontendSpecialty = profile.specialty ? (specialtyReverseMap[profile.specialty] || profile.specialty) : undefined;

        return {
            id: profile.id,
            name: profile.full_name,
            username: profile.username || (profile.email ? profile.email.split('@')[0] : 'user'),
            role: profile.role,
            isActive: profile.is_active,
            specialty: frontendSpecialty,
            email: profile.email,
            photoUrl: profile.photo_url,
            scope: profile.scope,
            schoolInep: profile.school_inep || undefined,
            mustChangePassword: profile.must_change_password
        };
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
                address: newUser.address
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
        console.log('[SupabaseService] Iniciando busca de alunos...', { unit });
        try {
            // Tentativa com JOIN para pegar dados da escola
            const { data, error } = await supabase
                .from('students')
                .select(`
                    *,
                    schools ( 
                        id, 
                        name, 
                        district 
                    )
                `);

            let dataToProcess = data;

            if (error) {
                console.warn('[SupabaseService] Erro no select com join. Detalhes:', {
                    message: error.message,
                    code: error.code,
                    hint: error.hint
                });
                console.log('[SupabaseService] Tentando fallback simples para students...');
                const { data: simpleData, error: simpleError } = await supabase.from('students').select('*');
                if (simpleError) {
                    console.error('[SupabaseService] Erro fatal no fallback de alunos:', simpleError);
                    throw simpleError;
                }
                dataToProcess = simpleData;
            }

            if (!dataToProcess || dataToProcess.length === 0) {
                console.warn('[SupabaseService] Aviso: A consulta retornou um array vazio.');
                return [];
            }

            // Filtro de Unidade (Scope)
            let finalStudents = dataToProcess;

            if (unit) {
                console.log(`[SupabaseService] Aplicando filtro de unidade: ${unit}`);
                finalStudents = dataToProcess.filter((s: any) => {
                    const schoolData = Array.isArray(s.schools) ? s.schools[0] : s.schools;
                    if (!schoolData) {
                        console.warn(`[SupabaseService] Aluno ${s.full_name} sem escola vinculada. Mantendo na lista por segurança.`);
                        return true;
                    }

                    const district = (schoolData.district || '').toUpperCase();
                    const targetUnit = unit.toUpperCase();

                    if (targetUnit === 'SEDE') {
                        return district !== 'COCAL';
                    }
                    return district === targetUnit;
                });
            }

            console.log(`[SupabaseService] Mapeando ${finalStudents.length} alunos...`);
            const mapped = finalStudents.map((s: any) => {
                try {
                    return mapStudentFromDB(s, []);
                } catch (err) {
                    console.error(`[SupabaseService] Erro ao mapear aluno ID ${s.id}:`, err);
                    return null;
                }
            }).filter(s => s !== null) as Student[];

            console.log(`[SupabaseService] Busca de alunos concluída: ${mapped.length} registros.`);
            return mapped;
        } catch (err) {
            console.error('[SupabaseService] Erro inesperado em getStudents:', err);
            return [];
        }
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

        // Check profile role logic client-side just to be sure
        if (session?.user) {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
            console.log('[SupabaseService] Role do usuário no banco:', profile?.role);
        }

        let finalPhotoUrl = student.photoUrl;

        // 1. Upload da foto se houver (Try-catch isolado para não bloquear o cadastro)
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
                    // alert(`[DEBUG] Upload Sucesso! Path: ${uploadData.path}`);
                    const { data: publicUrlData } = supabase.storage
                        .from('students-photos')
                        .getPublicUrl(uploadData.path);
                    finalPhotoUrl = publicUrlData.publicUrl;
                    // alert(`[DEBUG] URL Gerada: ${finalPhotoUrl}`);
                }
            } catch (error: any) {
                console.error("Erro no upload da foto:", error);
                // Não interrompe o salvamento do aluno, apenas a foto falha
            }
        }

        // Campo documents será preenchido abaixo com a nova lógica tipada

        // Sanitização: Converter strings vazias para null para não violar UNIQUE constraints
        const sanitizeField = (value: string | undefined | null) => {
            if (!value || typeof value !== 'string') return null;
            const cleaned = value.trim();
            return cleaned === '' ? null : cleaned;
        };

        const dbPayload: any = {
            // id: student.id, // ID é gerado pelo banco no insert
            full_name: student.fullName,
            birth_date: student.birthDate,
            cpf: sanitizeField(student.cpf),
            sus_card: sanitizeField(student.susCard),
            grade: student.school.grade,
            shift: student.school.shift,
            school_id: sanitizeField(student.school.schoolId) || null, // UUID: null se vazio
            address: student.address,
            guardians: student.guardians,
            photo_url: finalPhotoUrl,
            documents: student.documents || [],
            // Campos JSONB
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

        // 2. Upload de Documentos (Tipados)
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
                        type: docItem.type, // Usa o tipo correto passado do form
                        fileName: docItem.file.name,
                        url: publicUrlData.publicUrl,
                        uploadedAt: new Date().toISOString()
                    });
                } catch (docErr) {
                    console.error(`Erro ao enviar documento (${docItem.type}):`, docErr);
                    // Não lança erro fatal para não perder o cadastro do aluno
                }
            }

            // Mesclar documentos novos com existentes
            const existingDocs = student.documents || [];
            // @ts-ignore
            dbPayload.documents = [...existingDocs, ...uploadedDocs];
        }

        // [FIX] Smart Save: Verifica se já existe por CPF se o ID não foi informado ou é inválido
        let targetId = student.id;

        // Só busca por CPF se o CPF for válido (não nulo)
        if ((!targetId || targetId.length < 5) && dbPayload.cpf) {
            console.log(`[SupabaseService] Buscando aluno por CPF: '${dbPayload.cpf}'`);
            const { data: existingStudent } = await supabase
                .from('students')
                .select('id')
                .eq('cpf', dbPayload.cpf)
                .maybeSingle();

            if (existingStudent) {
                console.log(`[SupabaseService] Aluno encontrado por CPF (${dbPayload.cpf}). ID: ${existingStudent.id}. Modo UPDATE.`);
                targetId = existingStudent.id;
            } else {
                console.log(`[SupabaseService] CPF '${dbPayload.cpf}' não encontrado no banco.`);
            }
        }

        let savedId = targetId;

        if (targetId && targetId.length > 5) { // Update
            console.log(`[SupabaseService] Atualizando aluno ${targetId}`);

            const { data, error } = await supabase
                .from('students')
                .update(dbPayload)
                .eq('id', targetId)
                .select('id')
                .maybeSingle();

            if (error) {
                console.error('Erro ao atualizar aluno:', error);
                throw error;
            }
            if (!data) {
                throw new Error('Aluno não encontrado para atualização ou permissão negada.');
            }
            savedId = data.id;
        } else { // Insert
            console.log(`[SupabaseService] Criando novo aluno`);
            // Remove ID placeholder if empty
            if (dbPayload.id === '' || dbPayload.id === undefined) delete (dbPayload as any).id;

            const { data, error } = await supabase
                .from('students')
                .insert(dbPayload)
                .select('id')
                .maybeSingle();

            if (error) {
                console.error('Erro ao criar aluno:', error);
                throw error;
            }
            if (!data) {
                throw new Error('Erro ao criar aluno: Nenhum dado retornado.');
            }
            savedId = data.id;
        }

        // --- Alerta Automático (Sino) para Novos Cadastros ---
        if (!student.id && savedId) {
            try {
                // Notificar Administradores/Secretários - Simplificado: Envia Alerta Padrão
                // Aqui poderíamos buscar todos os admins, mas para evitar lentidão, enviamos um alerta geral 
                // que pode ser visto por quem tem acesso à tabela de avisos.
                // Como não temos recipientId específico "Admin", podemos deixar para implementar se o usuário pedir.
                // Por enquanto, o sistema foca em Agendamentos (Especialistas) conforme pedido.
            } catch (alertError) {
                console.warn('Erro ao disparar alerta de novo aluno:', alertError);
            }
        }

        return savedId;
    }

    static async deleteStudent(id: string): Promise<void> {
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) {
            console.error('Erro ao excluir aluno:', error);
            throw error;
        }
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
        console.log('[SupabaseService] Iniciando busca de escolas...');
        try {
            const { data, error } = await supabase.from('schools').select('*');
            if (error) {
                console.error('[SupabaseService] Erro ao buscar escolas:', error);
                throw error;
            }

            console.log(`[SupabaseService] Escolas encontradas: ${data?.length || 0}`);
            return (data || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                inep: s.inep,
                director: s.director || '',
                phone: s.phone || '',
                district: s.district,
                isActive: s.is_active,
                // Mapeia endereço do JSONB ou colunas, dependendo do schema. Assumindo JSONB address ou colunas planas.
                // Para simplificar, vou assumir que 'address' é um jsonb. Se não for, precisaria ajustar.
                address: s.address || { street: '', number: '', district: s.district, city: 'Brotas', state: 'BA', zipCode: '' },
                hasInternet: s.has_internet,
                internetType: s.internet_type,
                internetProviderContact: s.internet_provider_contact,
                internetProviders: (() => {
                    try {
                        // Tenta parsear o JSON armazenado na coluna de contato
                        const parsed = JSON.parse(s.internet_provider_contact || '{}');
                        return typeof parsed === 'object' ? parsed : {};
                    } catch {
                        return {};
                    }
                })()
            }));
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
            internet_type: school.internetType,
            // Salva os provedores estruturados como JSON na coluna de contato para evitar erros de schema
            internet_provider_contact: JSON.stringify(school.internetProviders || {})
        };

        if (school.id) {
            payload.id = school.id;
        }

        const { error } = await supabase.from('schools').upsert(payload);
        if (error) {
            console.error('Erro ao salvar escola:', error);
            throw error;
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
            username: p.username || p.email, // Fallback
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
            password: '' // Não retornamos senha hash
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
            // Tenta inserir
            console.warn('Criação de usuário via SupabaseService requer auth.signUp. Atualizando apenas dados de perfil se possível.');
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

            // Fallback: Exclusão apenas do Profile (não remove Auth, mas remove da lista visual)
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
        const { data, error } = await supabase
            .from('system_settings')
            .select('*')
            .single();

        if (error || !data) {
            return { systemName: 'Brotar', activeThemeId: 'teal-default', logoUrl: '' };
        }

        return {
            systemName: data.system_name,
            activeThemeId: data.active_theme_id,
            logoUrl: data.logo_url,
            loginBackgroundImage: data.login_background_image,
            showLoginInfo: data.show_login_info ?? true // Padrão true
        };
    }

    static async saveSystemSettings(settings: SystemSettings): Promise<void> {
        const payload = {
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
    static async getSupportProfessionals(): Promise<SupportProfessional[]> {
        return safeCall(async () => {
            const { data, error } = await supabase.from('support_professionals').select('*').order('name');
            if (error) {
                console.error('Erro ao buscar profissionais de apoio:', error);
                throw error;
            }
            return data.map((p: any) => ({
                id: p.id,
                name: p.name,
                photoUrl: p.photo_url,
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
        });
    }

    static async saveSupportProfessional(prof: SupportProfessional): Promise<void> {
        return this.upsertSupportProfessionals([prof]);
    }

    static async upsertSupportProfessionals(professionals: Partial<SupportProfessional>[]): Promise<void> {
        if (professionals.length === 0) return;

        const payloads = professionals.map(prof => {
            const toNull = (value: any) => (value === '' || value === undefined ? null : value);

            const payload: any = {
                name: prof.name,
                photo_url: prof.photoUrl,
                cpf: sanitizeCPF(prof.cpf),
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

            // Remove chaves undefined
            Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
            return payload;
        });

        // Remove possíveis duplicatas no array local (linhas repetidas no CSV)
        // Isso evita o erro "ON CONFLICT DO UPDATE command cannot affect row a second time"
        const uniquePayloadsMap = new Map();
        for (const p of payloads) {
            const key = p.id ? `id_${p.id}` : (p.cpf ? `cpf_${p.cpf}` : `name_${p.name}`);
            uniquePayloadsMap.set(key, p);
        }
        const uniquePayloads = Array.from(uniquePayloadsMap.values());

        console.log(`[SupabaseService] Processando ${uniquePayloads.length} profissionais únicos (após deduplicação)...`);

        return safeCall(async () => {
            // Separa em inserts (sem ID) e updates (com ID) para evitar o erro de constraint "null value in column id"
            const updates = uniquePayloads.filter(p => p.id != null);
            const inserts = uniquePayloads.filter(p => p.id == null);

            // Realizando UPDATES individuais. Evita o erro de concorrência "cannot affect row a second time"
            // que costuma ocorrer quando triggers ou chaves únicas secundárias (como cpf) atrapalham o bulk upsert
            if (updates.length > 0) {
                for (const up of updates) {
                    const updateData = { ...up };
                    delete updateData.id; // Retira o ID do body, usando só no .eq()
                    const { error } = await supabase.from('support_professionals').update(updateData).eq('id', up.id);
                    if (error) {
                        console.error('Erro no UPDATE de profissionais:', error);
                        throw new Error(`Erro Banco de Dados (Update do ID ${up.id}): ${error.message}`);
                    }
                }
            }

            if (inserts.length > 0) {
                const { error } = await supabase.from('support_professionals').insert(inserts);
                if (error) {
                    console.error('Erro no INSERT de profissionais:', error);
                    throw new Error(`Erro Banco de Dados (Insert): ${error.message}`);
                }
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

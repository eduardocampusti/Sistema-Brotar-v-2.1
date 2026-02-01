
import { supabase } from './supabaseClient';
import { Student, User, School, SupportProfessional, SystemSettings, PapelTimbradoConfig, SavedDocument, Session, Specialty, UserRole } from '../../types';

// Mapeamento de campos snake_case do banco para camelCase do frontend
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
        schoolName: 'Carregando...', // Será populado pelo join se necessário, ou ID
        grade: dbStudent.grade,
        shift: dbStudent.shift as any,
        district: 'Sede', // TODO: Pegar da escola
        hasSpecialAide: false,
        difficulties: ''
    },
    socialInfo: dbStudent.social_info || { nis: '', bolsaFamilia: false, bpc: false }, // [FIX] Ensure object
    documents: [], // Busca separada depois
    history: sessions.map(s => ({
        id: s.id,
        date: s.date,
        specialty: s.specialty,
        professionalName: 'Profissional', // Join com profile seria ideal
        notes: s.content?.summary || 'Atendimento realizado',
        // Outros campos específicos
    })),
    status: dbStudent.status,
    createdAt: dbStudent.created_at
});

export class SupabaseService {

    // --- Auth ---
    static async authenticate(email: string, password: string): Promise<User | null> {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error || !data.user) {
            console.error('Erro de Login:', error);
            return null;
        }

        // Busca perfil expandido
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (!profile) return null;

        return {
            id: profile.id,
            name: profile.full_name,
            username: email, // Usando email como username
            role: profile.role,
            isActive: profile.is_active,
            specialty: profile.specialty,
            email: email,
            mustChangePassword: profile.must_change_password,
            photoUrl: profile.photo_url
        };
    }

    static async logout() {
        await supabase.auth.signOut();
    }


    static async completeFirstAccess(newPassword: string, userId: string): Promise<{ success: boolean, error?: any }> {
        // 1. Atualiza a senha no Auth
        const { error: authError } = await supabase.auth.updateUser({ password: newPassword });

        if (authError) {
            console.error('Erro ao atualizar senha:', authError);
            return { success: false, error: authError };
        }

        // 2. Atualiza a flag no banco de dados
        const { error: dbError } = await supabase
            .from('profiles')
            .update({ must_change_password: false })
            .eq('id', userId);

        if (dbError) {
            console.error('Erro ao atualizar flag de primeiro acesso:', dbError);
        }

        return { success: true };
    }

    static async resetPassword(email: string): Promise<{ data: any, error: any }> {
        return await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password',
        });
    }

    // --- User Management (Admin) ---

    private static mapProfileToUser(profile: any): User {
        return {
            id: profile.id,
            name: profile.full_name,
            username: profile.username || profile.email,
            email: profile.email, // Email might be in profile or joined from auth, assuming profile has it synced or we rely on profile
            role: profile.role,
            isActive: profile.is_active,
            specialty: profile.specialty,
            scope: profile.scope, // Ensure 'scope' exists in profiles table schema
            mustChangePassword: profile.must_change_password,
            jobTitle: profile.job_title,
            phone: profile.phone,
            photoUrl: profile.photo_url,
            address: profile.address // JSONB
        };
    }

    static async getUsers(): Promise<User[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name');

        if (error) {
            console.error('Erro ao buscar usuários:', error);
            return [];
        }

        return data.map(this.mapProfileToUser);
    }

    static async saveUser(user: User): Promise<void> {
        const payload = {
            full_name: user.name,
            username: user.username,
            role: user.role,
            is_active: user.isActive,
            specialty: user.specialty,
            scope: user.scope,
            job_title: user.jobTitle,
            phone: user.phone,
            photo_url: user.photoUrl,
            address: user.address,
            // email: user.email // Email usually updated via auth methods, keeping it safe here
        };

        const { error } = await supabase
            .from('profiles')
            .update(payload)
            .eq('id', user.id);

        if (error) throw error;
    }

    static async deleteUser(userId: string): Promise<void> {
        // NOTE: Client-side deletion of auth users is restricted.
        // We delete the profile, which effectively removes them from the system view.
        // A true "delete" requires a Backend Function or RPC with service_role.
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) throw error;
    }

    static async createAccountAsAdmin(user: User, password: string): Promise<{ success: boolean, error?: string }> {
        try {
            // 1. Create Auth User
            // WARNING: supabase.auth.signUp on client *might* sign in the new user immediately, logging out Admin.
            // Using a secondary client is cleaner, but requires configuration.
            // For this implementation, we assume we are using a pattern where signUp doesn't auto-signin 
            // OR we accept we might need to handle session restoration (not handled here).
            // BETTER APPROACH for Admin Panel: Call a Postgres RPC or Edge Function.
            // FALLBACK Implementation:

            const { data, error } = await supabase.auth.signUp({
                email: user.email!,
                password: password,
                options: {
                    data: {
                        full_name: user.name,
                        role: user.role,
                        username: user.username,
                        must_change_password: true // FORCE CHANGE ON FIRST LOGIN
                        // Other metadata passed to triggers
                    }
                }
            });

            if (error) return { success: false, error: error.message };
            if (!data.user) return { success: false, error: 'Usuário não criado.' };

            // 2. Ensure Profile is updated (if Triggers didn't do it fully)
            // Trigger usually handles 'on_auth_user_created' -> insert into profiles
            // We update the extra fields just in case
            const profilePayload = {
                role: user.role,
                is_active: true,
                specialty: user.specialty,
                scope: user.scope,
                must_change_password: true,
                job_title: user.jobTitle,
                phone: user.phone,
                photo_url: user.photoUrl,
                address: user.address,
                username: user.username
            };

            const { error: profileError } = await supabase
                .from('profiles')
                .update(profilePayload)
                .eq('id', data.user.id);

            if (profileError) {
                console.warn('Erro ao atualizar perfil pós-criação:', profileError);
                // Not fatal if trigger worked partially
            }

            return { success: true };

        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    // --- Students ---
    static async getStudents(): Promise<Student[]> {
        // Busca alunos E sessões (respeitando RLS das sessões automaticamente!)
        // A query clinical_sessions(*) vai retornar APENAS o que o usuário pode ver.
        const { data: students, error } = await supabase
            .from('students')
            .select(`
        *,
        clinical_sessions (*)
      `);

        if (error) {
            console.error('Erro ao buscar alunos:', error);
            return [];
        }

        return students.map((s: any) => mapStudentFromDB(s, s.clinical_sessions));
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
                    const { data: publicUrlData } = supabase.storage
                        .from('students-photos')
                        .getPublicUrl(uploadData.path);
                    finalPhotoUrl = publicUrlData.publicUrl;
                }
            } catch (photoErr: any) {
                console.error("Erro fatal no upload da foto:", photoErr);
                throw new Error(photoErr.message || "Erro desconhecido no upload da foto.");
            }
        }

        // Sanitização: Converter strings vazias para null para não violar UNIQUE constraints
        const sanitizeField = (value: string | undefined | null) => {
            if (!value || typeof value !== 'string') return null;
            const cleaned = value.trim();
            return cleaned === '' ? null : cleaned;
        };

        const dbPayload = {
            // id: student.id, // ID é gerado pelo banco no insert
            full_name: student.fullName,
            birth_date: student.birthDate,
            cpf: sanitizeField(student.cpf),
            sus_card: sanitizeField(student.susCard),
            grade: student.school.grade,
            shift: student.school.shift,
            address: student.address,
            guardians: student.guardians,
            photo_url: finalPhotoUrl,
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

        if (targetId && targetId.length > 5) { // Update
            console.log(`[SupabaseService] Atualizando aluno ${targetId}`);

            const { data, error } = await supabase
                .from('students')
                .update(dbPayload)
                .eq('id', targetId)
                .select('id')
                .single();

            if (error) {
                console.error('[SupabaseService] Erro ao atualizar:', error);
                throw error; // Re-throw para ser pego pelo form, mas agora já logado
            }
            return targetId;
        } else { // Insert
            console.log(`[SupabaseService] Criando novo aluno`);
            const { data, error } = await supabase
                .from('students')
                .insert(dbPayload)
                .select('id')
                .single();

            if (error) {
                console.error('[SupabaseService] Erro ao criar (INSERT):', error);
                throw error;
            }
            if (!data) {
                console.error('[SupabaseService] Erro: Insert realizado mas nenhum dado retornado.');
                throw new Error("Erro ao criar aluno: Nenhum dado retornado.");
            }

            return data.id;
        }
    }

    // --- Clinical Sessions (Evoluções) ---
    static async saveSession(session: Session, studentId: string, professionalId: string): Promise<void> {
        await supabase.from('clinical_sessions').insert({
            student_id: studentId,
            professional_id: professionalId,
            specialty: session.specialty,
            date: session.date,
            content: { summary: session.notes }, // TODO: Estruturar melhor o JSON por especialidade
            private_notes: session.privateNotes
        });
    }

    // --- Falta implementar tabelas secundárias (Escolas, etc) ---
    // Mantendo compatibilidade básica
    static async getSchools(): Promise<School[]> {
        const { data } = await supabase.from('schools').select('*').order('name');
        return (data || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            inep: s.inep,
            director: s.director,
            phone: s.phone,
            district: s.district,
            isActive: s.is_active,
            hasInternet: s.has_internet,
            internetType: s.internet_type,
            internetProviderContact: s.internet_provider_contact,
            address: s.address || { street: '', number: '', district: s.district, city: 'Brotas', state: 'BA', zipCode: '' }
        }));
    }

    static async saveSchool(school: School): Promise<void> {
        const payload = {
            name: school.name,
            inep: school.inep,
            director: school.director,
            phone: school.phone,
            district: school.district,
            is_active: school.isActive,
            has_internet: school.hasInternet,
            internet_type: school.internetType,
            internet_provider_contact: school.internetProviderContact,
            address: school.address
        };

        if (school.id && school.id.length > 10) { // UUID check roughly
            const { error } = await supabase.from('schools').update(payload).eq('id', school.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('schools').insert(payload);
            if (error) throw error;
        }
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
            logoUrl: data.logo_url
        };
    }

    static async saveSystemSettings(settings: SystemSettings): Promise<void> {
        const payload = {
            system_name: settings.systemName,
            active_theme_id: settings.activeThemeId,
            logo_url: settings.logoUrl
        };
        const { error } = await supabase.from('system_settings').upsert({ id: 1, ...payload });
        if (error) throw error;
    }

    static getSystemSettingsSync(): SystemSettings {
        return { systemName: 'Brotar 2.0', activeThemeId: 'teal-default', logoUrl: '' };
    }

    // --- Papel Timbrado ---
    static async getPapelTimbradoConfig(): Promise<PapelTimbradoConfig> {
        const { data, error } = await supabase
            .from('letterhead_config')
            .select('*')
            .single();

        if (error || !data) {
            return {
                tituloLinha1: "PREFEITURA MUNICIPAL DE BROTAS DE MACAÚBAS",
                tituloLinha2: "SECRETARIA MUNICIPAL DE EDUCAÇÃO",
                tituloLinha3: "CENTRO MULTIDISCIPLINAR DE ATENDIMENTO EDUCACIONAL",
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

    static async savePapelTimbradoConfig(config: PapelTimbradoConfig): Promise<void> {
        const payload = {
            logo_url: config.logoUrl,
            title_l1: config.tituloLinha1,
            title_l2: config.tituloLinha2,
            title_l3: config.tituloLinha3,
            cnpj: config.cnpj,
            address: config.endereco,
            phone: config.telefone,
            footer_text: config.rodapeTexto,
            footer_img: config.rodapeImg,
            show_logo: config.showLogo,
            show_titles: config.showTitulos,
            show_contact: config.showContato
        };
        const { error } = await supabase.from('letterhead_config').upsert({ id: 1, ...payload });
        if (error) throw error;
    }

    static getActiveTheme() {
        return {
            id: 'teal-default',
            name: 'Brotar Default',
            colors: { 50: '#f0fdfa', 500: '#14b8a6' } as any
        };
    }
}

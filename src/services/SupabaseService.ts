
import { supabase } from './supabaseClient';
import { Student, User, School, SupportProfessional, SystemSettings, PapelTimbradoConfig, SavedDocument, Session, Specialty, UserRole } from '../../types';

// Mapeamento de campos snake_case do banco para camelCase do frontend
const mapStudentFromDB = (dbStudent: any, sessions: any[] = []): Student => ({
    id: dbStudent.id,
    fullName: dbStudent.full_name,
    birthDate: dbStudent.birth_date,
    gender: (dbStudent.clinical_info?.gender || 'Outro') as any, // Fallback se não tiver na coluna
    photoUrl: dbStudent.clinical_info?.photoUrl,
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
    socialInfo: dbStudent.social_info,
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

    static async saveStudent(student: Student): Promise<void> {
        const dbPayload = {
            // id: student.id, // Se for novo, gera UUID auto. Se update, precisa passar ID.
            full_name: student.fullName,
            birth_date: student.birthDate,
            cpf: student.cpf,
            sus_card: student.susCard,
            grade: student.school.grade,
            shift: student.school.shift,
            address: student.address,
            guardians: student.guardians,
            // Campos JSONB
            clinical_info: {
                ...student.clinical,
                gender: student.gender,
                rg: student.rg,
                fatherName: student.fatherName,
                motherName: student.motherName,
                nationality: student.nationality,
                birthPlace: student.birthPlace
            },
            social_info: student.socialInfo || {},
            status: student.status
        };

        if (student.id && student.id.length > 5) { // Verifica se é UUID e não '1' (seed)
            await supabase.from('students').update(dbPayload).eq('id', student.id);
        } else {
            await supabase.from('students').insert(dbPayload);
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
        const { data } = await supabase.from('schools').select('*');
        return (data || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            inep: s.inep,
            district: s.district,
            isActive: s.is_active,
            address: { street: '', number: '', district: s.district, city: 'Brotas', state: 'BA', zipCode: '' }
        }));
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

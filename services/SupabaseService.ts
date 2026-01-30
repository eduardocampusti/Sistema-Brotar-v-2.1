import { supabase } from './supabaseClient';
import { Student, User, School, SupportProfessional, SystemSettings, PapelTimbradoConfig, SavedDocument, Session, Specialty, UserRole, PortageAssessment } from '../types';
import { createClient } from '@supabase/supabase-js'; // Import para conexão auxiliar

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
        schoolName: (Array.isArray(dbStudent.schools) ? dbStudent.schools[0]?.name : dbStudent.schools?.name) || 'Não vinculada',
        grade: dbStudent.grade,
        shift: dbStudent.shift as any,
        district: (Array.isArray(dbStudent.schools) ? dbStudent.schools[0]?.district : dbStudent.schools?.district) || 'Sede',
        hasSpecialAide: false,
        difficulties: ''
    },
    socialInfo: dbStudent.social_info,
    documents: [], // Busca separada depois
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

export class SupabaseService {

    // --- Auth ---
    static async authenticate(email: string, password: string): Promise<User | null> {
        // Normaliza para email se for apenas username
        const finalEmail = email.includes('@') ? email : `${email}@brotar.com`;

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

        // Se o perfil não existir, tentamos criar um básico ou usamos dados do Auth
        if (profileError || !profile) {
            console.warn('Perfil não encontrado ou inacessível. Usando dados básicos do Usuário.', profileError);

            const userData: User = {
                id: data.user.id,
                name: data.user.user_metadata?.full_name || finalEmail.split('@')[0],
                username: email, // Mantém o input original como username visual
                role: (data.user.user_metadata?.role as UserRole) || 'SPECIALIST',
                isActive: true,
                email: finalEmail
            };

            // Tenta criar o perfil no banco silenciosamente
            try {
                await supabase.from('profiles').upsert({
                    id: userData.id,
                    full_name: userData.name,
                    role: userData.role,
                    is_active: true,
                    username: email // Salva o username simples se possível
                });
            } catch (e) {
                console.warn('Não foi possível auto-criar o perfil no banco (provavelmente RLS):', e);
            }

            return userData;
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
            email: finalEmail
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

    // --- Admin User Creation (Safe Mode) ---
    /**
     * Cria um usuário (Auth + Profile) sem deslogar o admin atual.
     * Usa uma instância isolada do cliente Supabase.
     */
    static async createAccountAsAdmin(newUser: User, passwordRaw: string): Promise<{ success: boolean, error?: string, warning?: string }> {
        try {
            // 1. Cria um cliente temporário que NÃO persiste sessão (não afeta o Admin logado)
            const tempClient = createClient(
                (import.meta as any).env.VITE_SUPABASE_URL,
                (import.meta as any).env.VITE_SUPABASE_ANON_KEY,
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

    // --- Students ---
    static async getStudents(): Promise<Student[]> {
        // Busca alunos E sessões (respeitando RLS das sessões automaticamente!)
        // A query clinical_sessions(*) vai retornar APENAS o que o usuário pode ver.
        const { data: students, error } = await supabase
            .from('students')
            .select(`
        *,
        clinical_sessions (*),
        schools (id, name, district)
      `);

        if (error) {
            console.error('Erro ao buscar alunos:', error);
            return [];
        }

        return students.map((s: any) => mapStudentFromDB(s, s.clinical_sessions));
    }

    static async saveStudent(student: Student): Promise<void> {
        const dbPayload = {
            id: student.id, // Important: Include ID for upsert to work
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

        // Uses upsert to handle both Create (new ID) and Update (existing ID)
        const { error } = await supabase.from('students').upsert(dbPayload);

        if (error) {
            console.error('Erro ao salvar aluno:', error);
            throw error;
        }
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
        const { data, error } = await supabase.from('schools').select('*');
        if (error) {
            console.error('Erro ao buscar escolas:', error);
            return [];
        }
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
            internetProviderContact: s.internet_provider_contact
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
            address: school.address,
            has_internet: school.hasInternet,
            internet_type: school.internetType,
            internet_provider_contact: school.internetProviderContact
        };

        if (school.id && school.id.length > 10) {
            await supabase.from('schools').update(payload).eq('id', school.id);
        } else {
            await supabase.from('schools').insert(payload);
        }
    }

    // --- Users (Profiles) ---
    static async getUsers(): Promise<User[]> {
        const { data, error } = await supabase.from('profiles').select('*');
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

        return data.map((p: any) => ({
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
            password: '' // Não retornamos senha hash
        }));
    }

    static async saveUser(user: User): Promise<void> {
        // NOTA: Criar usuário no Auth requer admin API ou fluxo de signup.
        // Aqui atualizamos apenas o PERFIL.
        // Se for um novo usuário (sem ID real), isso falhará se não houver um trigger/auth associado.
        // Para migração, assumiremos que edição de perfil é o principal, ou inserção direta se Policies permitirem.

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
            specialty: dbSpecialty, // Mapeado
            is_active: user.isActive,
            scope: user.scope,
            job_title: user.jobTitle,
            phone: user.phone,
            email: user.email,
            photo_url: user.photoUrl,
            address: user.address
        };

        if (user.id && user.id.length > 5) {
            await supabase.from('profiles').update(payload).eq('id', user.id);
        } else {
            // Tenta inserir (só funciona se o ID for gerado ou se o RLS permitir insert público na profiles)
            // Idealmente: supabase.auth.signUp() no frontend
            console.warn('Criação de usuário via SupabaseService requer auth.signUp. Atualizando apenas dados de perfil se possível.');
            await supabase.from('profiles').insert(payload);
        }
    }

    static async deleteUser(id: string): Promise<void> {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) {
            console.error('Erro ao excluir usuário:', error);
            throw error;
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
        const newHistory = [assessment, ...currentHistory]; // Mais recente primeiro

        // Atualiza apenas o campo pp_data dentro do clinical_info (Deep Merge via JSONB seria ideal, mas aqui fazemos via spread no app)
        const updatedClinicalInfo = {
            ...clinicalInfo,
            pp_data: {
                ...ppData,
                ipoHistory: newHistory
            }
        };

        const { error: updateError } = await supabase
            .from('students')
            .update({ clinical_info: updatedClinicalInfo })
            .eq('id', studentId);

        if (updateError) throw updateError;
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
        const { data, error } = await supabase.from('support_professionals').select('*');
        if (error) {
            console.error('Erro ao buscar profissionais de apoio:', error);
            return [];
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
    }

    static async saveSupportProfessional(prof: SupportProfessional): Promise<void> {
        const payload = {
            name: prof.name,
            photo_url: prof.photoUrl,
            cpf: prof.cpf,
            phone: prof.phone,
            email: prof.email,
            education: prof.education,
            contract_start_date: prof.contractStartDate,
            workload: prof.workload,
            address: prof.address,
            school_id: prof.schoolId,
            regent_teacher: prof.regentTeacher,
            student_id: prof.studentId
        };

        if (prof.id && prof.id.length > 10) {
            await supabase.from('support_professionals').update(payload).eq('id', prof.id);
        } else {
            await supabase.from('support_professionals').insert(payload);
        }
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
}

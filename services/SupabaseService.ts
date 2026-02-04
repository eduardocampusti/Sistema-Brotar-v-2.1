import { supabase } from './supabaseClient';
import { Student, User, School, SupportProfessional, SystemSettings, PapelTimbradoConfig, SavedDocument, Session, Specialty, UserRole, PortageAssessment, Appointment, AppointmentStatus, Unit } from '../types';
import { createClient } from '@supabase/supabase-js'; // Import para conexão auxiliar

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
            email: profile.email,
            photoUrl: profile.photo_url,
            scope: profile.scope,
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

    static async updatePassword(newPassword: string) {
        return await supabase.auth.updateUser({ password: newPassword });
    }

    static async updateProfile(userId: string, data: any) {
        return await supabase.from('profiles').update(data).eq('id', userId);
    }

    static async resetPassword(email: string) {
        const finalEmail = email.includes('@') ? email : `${email}@brotar.com`;
        return await supabase.auth.resetPasswordForEmail(finalEmail, {
            redirectTo: `${window.location.origin}/reset-password`,
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
    static async getStudents(unit?: Unit): Promise<Student[]> {
        // Busca alunos E sessões (respeitando RLS das sessões automaticamente!)
        // A query clinical_sessions(*) vai retornar APENAS o que o usuário pode ver.
        let query = supabase
            .from('students')
            .select(`
                *,
                clinical_sessions (*),
                schools (id, name, district)
            `);

        if (unit) {
            // Filtra alunos que pertencem a escolas da unidade especificada
            // Nota: Isso assume que a tabela schools tem a coluna 'district' preenchida com 'SEDE' ou 'COCAL'
            query = query.filter('schools.district', 'eq', unit);
        }

        const { data: students, error } = await query;

        if (error) {
            console.error('Erro ao buscar alunos:', error);
            return [];
        }

        // Filtro manual adicional caso o join filter do supabase não seja suficiente (dependendo da versão)
        const finalStudents = unit
            ? students.filter((s: any) => (Array.isArray(s.schools) ? s.schools[0]?.district : s.schools?.district) === unit)
            : students;

        return finalStudents.map((s: any) => mapStudentFromDB(s, s.clinical_sessions));
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
            school_id: student.school.schoolId, // PERSISTÊNCIA DO ID DA ESCOLA
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
            query = query.eq('scope', unit);
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
        // --- LIMPEZA AUTOMÁTICA (Lazy Delete) ---
        // Remove APENAS mensagens privadas ('MESSAGE') que foram lidas há mais de 5 minutos
        // Limpeza de mensagens lidas (Auto-delete após 5 minutos)
        try {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

            // Deleta mensagens lidas com mais de 5 minutos (Apenas tipo MESSAGE)
            // Os Alerts são persistentes a menos que deletados manualmente pelo usuário
            await supabase
                .from('system_messages')
                .delete()
                .eq('type', 'MESSAGE')
                .eq('is_read', true)
                .lt('read_at', fiveMinutesAgo);

        } catch (cleanError) {
            console.error('[NotificationCleanup] Erro ao limpar mensagens:', cleanError);
        }

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
    static async getAppointments(filters: { date?: string, unit?: Unit, specialty?: Specialty, status?: AppointmentStatus, studentId?: string, professionalId?: string }): Promise<Appointment[]> {
        let query = supabase.from('appointments').select('*');

        if (filters.date) query = query.eq('date', filters.date);
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
            notes: a.notes,
            createdAt: a.created_at
        }));
    }

    static async saveAppointment(appointment: Partial<Appointment>): Promise<void> {
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
            notes: appointment.notes
        };

        if (appointment.id) payload.id = appointment.id;

        const { error } = await supabase.from('appointments').upsert(payload);
        if (error) {
            console.error('Erro detalhado ao salvar agendamento:', error);
            throw error;
        }
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

        // O sistema deve buscar na tabela 'profiles', pois 'users' não existe ou é inacessível diretamente
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('specialty', dbSpecialty);

        if (error) {
            console.error('Erro ao buscar profissionais por especialidade:', error);
            return [];
        }

        return (data || []).map((p: any) => ({
            id: p.id,
            name: p.full_name,
            username: p.username || p.email,
            email: p.email,
            role: p.role,
            specialty: p.specialty ? (this.REVERSE_SPECIALTY_MAP[p.specialty] || p.specialty) : undefined,
            isActive: p.is_active,
            scope: p.scope || 'GLOBAL',
            jobTitle: p.job_title,
            phone: p.phone,
            photoUrl: p.photo_url,
            address: p.address || {},
            password: ''
        }));
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
        // Helper para converter vazio em null
        const toNull = (value: any) => (value === '' || value === undefined ? null : value);

        const payload = {
            name: prof.name,
            photo_url: prof.photoUrl,
            cpf: prof.cpf,
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

        // Remove chaves undefined
        Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);

        console.log('[DEBUG] Payload SupportProfessional:', payload);

        let error;
        // Se tiver ID e for update
        if (prof.id && prof.id.length > 10) {
            const { error: updateError } = await supabase.from('support_professionals').update(payload).eq('id', prof.id);
            error = updateError;
        } else {
            // Insert
            const { error: insertError } = await supabase.from('support_professionals').insert(payload);
            error = insertError;
        }

        if (error) {
            console.error('Erro ao salvar profissional de apoio (Detalhado):', JSON.stringify(error, null, 2));
            throw new Error(`Erro Banco de Dados: ${error.message} (${error.code || 'sem código'})`);
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

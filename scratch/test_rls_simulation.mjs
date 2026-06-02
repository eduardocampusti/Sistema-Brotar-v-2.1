import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const adminClient = createClient(supabaseUrl, supabaseServiceKey);
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log('=== VALIDANDO APLICAÇÃO DA NOVA POLÍTICA RLS NO INSERÇÃO ===');
    const tempEmail = 'temp_social_test@brotar.com';
    const tempPassword = 'TestPassword123!';
    let tempUserId = null;

    try {
        // 1. Limpa anterior se existir
        const { data: listResult } = await adminClient.auth.admin.listUsers();
        if (listResult && listResult.users) {
            const existingUser = listResult.users.find(u => u.email === tempEmail);
            if (existingUser) {
                console.log('Limpando usuário antigo...');
                tempUserId = existingUser.id;
                await adminClient.auth.admin.deleteUser(existingUser.id);
                try {
                    await adminClient.from('profiles').delete().eq('id', existingUser.id);
                } catch (e) {
                    console.log('Erro de limpeza silenciado:', e.message);
                }
                tempUserId = null;
            }
        }

        // 2. Cria usuário temporário
        console.log('Criando novo usuário temporário...');
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email: tempEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
                full_name: 'Assistente Social Temporária',
                role: 'SPECIALIST'
            }
        });

        if (authError) throw authError;
        tempUserId = authData.user.id;

        // 3. Cria perfil no DB
        console.log('Criando perfil no DB...');
        await adminClient
            .from('profiles')
            .upsert({
                id: tempUserId,
                full_name: 'Assistente Social Temporária',
                role: 'SPECIALIST',
                specialty: 'SERVICO_SOCIAL',
                is_active: true,
                scope: 'GLOBAL'
            });

        // 4. Loga com o cliente Anon
        console.log('Fazendo login com Anon...');
        const { data: sessionData, error: loginError } = await anonClient.auth.signInWithPassword({
            email: tempEmail,
            password: tempPassword
        });

        if (loginError) throw loginError;

        // 5. Busca um estudante
        const { data: students } = await adminClient.from('students').select('id, full_name').limit(1);
        const student = students[0];
        console.log(`Estudante alvo: ${student.full_name} (${student.id})`);

        // 6. Tenta inserir evolução com a nova política!
        console.log('Tentando inserir evolução sob a nova política RLS...');
        const payload = {
            student_id: student.id,
            professional_id: tempUserId,
            specialty: 'SERVICO_SOCIAL',
            date: new Date().toISOString().split('T')[0],
            content: { summary: 'Evolução teste pós-correção de RLS' }
        };

        const { data: inserted, error: insertError } = await anonClient
            .from('clinical_sessions')
            .insert(payload)
            .select();

        if (insertError) {
            console.error('\n❌ ERRO: A inserção ainda foi bloqueada pelo RLS:', insertError.message);
            console.error(insertError);
        } else {
            console.log('\n✅ SUCESSO ABSOLUTO! O RLS aceitou a inserção:', inserted);
            
            // Limpa registro
            try {
                await adminClient.from('clinical_sessions').delete().eq('id', inserted[0].id);
                console.log('Registro de teste limpo com sucesso.');
            } catch (err) {
                console.error('Erro ao deletar registro de teste:', err.message);
            }
        }

    } catch (e) {
        console.error('Erro na execução:', e);
    } finally {
        if (tempUserId) {
            console.log('Limpando usuário temporário no bloco finally...');
            try {
                await adminClient.auth.admin.deleteUser(tempUserId);
                await adminClient.from('profiles').delete().eq('id', tempUserId);
            } catch (err) {
                console.error('Erro ao limpar final:', err.message);
            }
        }
        console.log('=== FIM DA VALIDAÇÃO ===');
    }
}

run().catch(console.error);

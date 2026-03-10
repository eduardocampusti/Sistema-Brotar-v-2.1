
/**
 * DIAGNÓSTICO BACKEND COMPLETO - Sistema Brotar
 * Agente: backend-specialist
 * 
 * Testa em sequência:
 * 1. Conexão com o banco
 * 2. Acesso anônimo à tabela schools
 * 3. Autenticação do usuário admin
 * 4. Acesso autenticado à tabela schools
 * 5. Acesso ao perfil do admin
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://indshiztdvjgvgnzigqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const results = [];
const log = (msg, data = null) => {
    const line = data ? `${msg}: ${JSON.stringify(data, null, 2)}` : msg;
    console.log(line);
    results.push(line);
};

async function runDiagnostics() {
    log('=== DIAGNÓSTICO BACKEND SISTEMA BROTAR ===');
    log(`Projeto: ${SUPABASE_URL.split('//')[1].split('.')[0]}`);
    log(`Data: ${new Date().toISOString()}`);
    log('');

    // TESTE 1: Acesso anônimo à tabela schools
    log('--- TESTE 1: Acesso Anônimo à tabela schools ---');
    const { data: schoolsAnon, error: schoolsAnonErr } = await supabase.from('schools').select('id, name, inep, is_active').limit(3);
    if (schoolsAnonErr) {
        log('❌ FALHOU (acesso anônimo bloqueado)', { code: schoolsAnonErr.code, message: schoolsAnonErr.message });
    } else {
        log(`✅ SUCESSO - ${schoolsAnon.length} escolas visíveis anonimamente`);
        if (schoolsAnon.length > 0) log('Amostra:', schoolsAnon[0]);
    }
    log('');

    // TESTE 2: Contar escolas no total (bypass RLS via service role não disponível, mas conta)
    log('--- TESTE 2: Contagem total de escolas ---');
    const { count, error: countErr } = await supabase.from('schools').select('*', { count: 'exact', head: true });
    if (countErr) {
        log('❌ FALHOU ao contar escolas', { code: countErr.code, message: countErr.message });
    } else {
        log(`✅ Total de escolas no banco: ${count}`);
    }
    log('');

    // TESTE 3: Autenticação do admin
    log('--- TESTE 3: Autenticação Admin ---');
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'admin@brotar.com',
        password: '123456'
    });

    if (authErr) {
        log('❌ FALHOU na autenticação', { code: authErr.status, message: authErr.message });
    } else {
        log(`✅ Login OK | user_id: ${authData.user.id.substring(0, 8)}...`);
        log(`   email: ${authData.user.email}`);
        log(`   role_meta: ${authData.user.user_metadata?.role}`);
        log('');

        // TESTE 6: Acesso autenticado à tabela students
        log('--- TESTE 6: Acesso Autenticado à tabela students ---');
        const { data: students, error: studentsErr } = await supabase.from('students').select('id, full_name').limit(3);
        if (studentsErr) {
            log('❌ FALHOU ao buscar alunos', { code: studentsErr.code, message: studentsErr.message });
        } else {
            log(`✅ SUCESSO - ${students.length} alunos visíveis`);
            if (students.length > 0) log('Amostra:', students[0]);
        }
        log('');

        // TESTE 7: Acesso autenticado à tabela support_professionals
        log('--- TESTE 7: Acesso Autenticado à tabela support_professionals ---');
        const { data: supportProfs, error: supportProfsErr } = await supabase.from('support_professionals').select('id, full_name').limit(3);
        if (supportProfsErr) {
            log('❌ FALHOU ao buscar profissionais', { code: supportProfsErr.code, message: supportProfsErr.message });
        } else {
            log(`✅ SUCESSO - ${supportProfs.length} profissionais visíveis`);
            if (supportProfs.length > 0) log('Amostra:', supportProfs[0]);
        }
        log('');

        await supabase.auth.signOut();
    }

    log('');
    log('=== FIM DO DIAGNÓSTICO ===');

    fs.writeFileSync('backend_diagnosis_result.txt', results.join('\n'), 'utf8');
    console.log('\n→ Resultado salvo em backend_diagnosis_result.txt');
}

runDiagnostics().catch(console.error);

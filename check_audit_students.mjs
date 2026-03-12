
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    await supabase.auth.signInWithPassword({
        email: 'admin@brotar.com',
        password: '123456'
    });

    console.log('--- LOGS DE AUDITORIA: MÓDULO ALUNOS ---');
    const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('module', 'ALUNOS')
        .order('timestamp', { ascending: false });

    if (logs && logs.length > 0) {
        logs.forEach(l => {
            console.log(`[${l.timestamp}] Ação: ${l.action} | Usuário: ${l.user} | Registro: ${l.affected_record}`);
        });
    } else {
        console.log('Nenhum log de auditoria encontrado para o módulo ALUNOS.');
    }
}

diagnose();

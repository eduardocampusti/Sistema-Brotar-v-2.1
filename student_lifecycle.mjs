
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    await supabase.auth.signInWithPassword({
        email: 'admin@brotar.com',
        password: '123456'
    });

    console.log('--- TIMELINE DE AUDITORIA: ALUNOS ---');
    const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('module', 'ALUNOS')
        .order('timestamp', { ascending: true });

    if (!logs || logs.length === 0) {
        console.log('Nenhum log encontrado.');
        return;
    }

    const lifecycle = {};
    logs.forEach(l => {
        const name = l.affected_record;
        if (!lifecycle[name]) lifecycle[name] = [];
        lifecycle[name].push(`${l.action} em ${l.timestamp} por ${l.user}`);
    });

    Object.entries(lifecycle).forEach(([name, actions]) => {
        console.log(`\nAluno: ${name}`);
        actions.forEach(a => console.log(`  - ${a}`));
    });

    const creations = logs.filter(l => l.action === 'CRIAR').length;
    const deletions = logs.filter(l => l.action === 'EXCLUIR').length;
    console.log(`\nResumo: ${creations} Criações | ${deletions} Deleções`);
}

diagnose();

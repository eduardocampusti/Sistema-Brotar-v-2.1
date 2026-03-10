
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://indshiztdvjgvgnzigqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAuditLogs() {
    await supabase.auth.signInWithPassword({
        email: 'admin@brotar.com',
        password: '123456'
    });

    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Erro ao ler audit_logs:', error);
        return;
    }

    fs.writeFileSync('audit_logs_recent.json', JSON.stringify(data, null, 2));
    console.log('Logs recentes salvos em audit_logs_recent.json');

    await supabase.auth.signOut();
}

checkAuditLogs().catch(console.error);

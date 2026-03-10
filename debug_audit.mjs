
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://indshiztdvjgvgnzigqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAudit() {
    await supabase.auth.signInWithPassword({
        email: 'admin@brotar.com',
        password: '123456'
    });

    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Erro ao buscar audit_logs:', error.message);
        // Tenta com o nome antigo se o novo falhar
        const { data: data2, error: error2 } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error2) {
             console.error('Erro ao buscar audit_logs (fallback):', error2.message);
        } else {
             fs.writeFileSync('audit_logs_debug.json', JSON.stringify(data2, null, 2));
        }
    } else {
        fs.writeFileSync('audit_logs_debug.json', JSON.stringify(data, null, 2));
    }

    await supabase.auth.signOut();
}

checkAudit().catch(console.error);

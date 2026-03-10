
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://indshiztdvjgvgnzigqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inventoryTables() {
    const results = [];
    
    await supabase.auth.signInWithPassword({
        email: 'admin@brotar.com',
        password: '123456'
    });

    const possibleTables = [
        'escolas', 'alunos', 'profissionais_apoio', 'usuarios', 'perfis',
        'schools', 'students', 'support_professionals', 'users', 'profiles',
        'audit_logs', 'logs_auditoria', 'system_settings', 'configuracoes_sistema',
        'system_messages', 'mensagens_sistema', 'appointments', 'agendamentos',
        'generated_documents', 'documentos_gerados'
    ];

    for (const table of possibleTables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (!error) {
            results.push({ table, count });
        } else if (error.code !== '42P01') {
            results.push({ table, error: error.message, code: error.code });
        }
    }

    fs.writeFileSync('db_inventory.json', JSON.stringify(results, null, 2));
    console.log('Inventário salvo em db_inventory.json');

    await supabase.auth.signOut();
}

inventoryTables().catch(console.error);

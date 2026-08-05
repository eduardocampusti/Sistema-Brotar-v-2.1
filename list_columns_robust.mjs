import { requireEnv } from './scripts/require-env.mjs';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    await supabase.auth.signInWithPassword({
        email: requireEnv('SCRIPT_USER_EMAIL'),
        password: requireEnv('SCRIPT_USER_PASSWORD')
    });

    // Query information_schema via RPC or direct select if allowed
    const { data: columns, error } = await supabase
        .from('students')
        .select('*')
        .limit(1);

    if (error) {
        console.error(error);
        return;
    }

    // List all keys from the first record
    console.log('Colunas reais:', Object.keys(columns[0]));
    
    // Tentar buscar específicamente por colunas que poderiam existir
    const { data: raw, error: rawError } = await supabase.rpc('get_table_columns', { table_name: 'students' });
    if (rawError) {
        console.warn('RPC get_table_columns falhou (provavelmente não existe).');
    } else {
        console.log('Colunas via RPC:', raw);
    }
}

diagnose();

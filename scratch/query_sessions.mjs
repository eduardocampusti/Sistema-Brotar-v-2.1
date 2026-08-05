import { requireEnv } from '../scripts/require-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
    console.log('Buscando as 10 últimas sessões...');
    const { data, error } = await supabase
        .from('clinical_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Erro:', error);
        return;
    }
    console.log(`Sessões encontradas: ${data.length}`);
}

main().catch(console.error);

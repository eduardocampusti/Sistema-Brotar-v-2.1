import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSedeRole() {
    console.log('--- BUSCANDO PERFIL DA SECRETARIA SEDE ---');

    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .or('full_name.ilike.%SEDE%,role.eq.ASSISTANT,role.eq.SECRETARY');

    if (profileError) {
        console.error('Erro ao buscar perfis:', profileError.message);
    } else {
        console.log(`Encontrados ${profiles.length} perfis:`);
        profiles.forEach(p => {
            console.log(`ID: ${p.id} | Nome: ${p.full_name} | Role: ${p.role}`);
        });
    }

    console.log('\n--- VERIFICANDO POLÍTICAS DA TABELA SCHOOLS ---');
    const { data: policies, error: policyError } = await supabase
        .rpc('get_policies_for_table', { table_name: 'schools' }); 
    
    // If RPC doesn't exist, we can use raw query if service role allows or check if we can query pg_policies
    if (policyError) {
        // Fallback to direct SQL if we had the tool, but since MCP is down, 
        // I will just try to select from pg_policies if the service role can.
        const { data: pgPolicies, error: pgError } = await supabase
            .from('pg_policies')
            .select('*')
            .eq('tablename', 'schools');
        
        if (pgError) {
            console.log('Não foi possível ler pg_policies diretamente via Supabase client (comum).');
        } else {
            console.log('Políticas em pg_policies:', pgPolicies);
        }
    } else {
        console.log('Políticas:', policies);
    }
}

checkSedeRole();

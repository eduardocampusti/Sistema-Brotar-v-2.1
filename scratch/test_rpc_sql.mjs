import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('--- TESTANDO RPCs DE EXECUÇÃO DE SQL ---');
    const possibleRPCs = ['exec_sql', 'execute_sql', 'run_sql', 'sql', 'query', 'exec'];
    
    for (const rpcName of possibleRPCs) {
        try {
            console.log(`Testando RPC: ${rpcName}...`);
            const { data, error } = await supabase.rpc(rpcName, { 
                query: 'SELECT 1 as test',
                sql_query: 'SELECT 1 as test',
                sql: 'SELECT 1 as test'
            });
            
            if (error) {
                console.log(`RPC ${rpcName} retornou erro:`, error.message);
            } else {
                console.log(`🎉 SUCESSO! RPC ${rpcName} retornou:`, data);
                break;
            }
        } catch (err) {
            console.log(`RPC ${rpcName} falhou:`, err.message);
        }
    }
}

run().catch(console.error);

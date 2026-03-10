
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://indshiztdvjgvgnzigqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectStructure() {
    console.log('=== INSPEÇÃO DE ESTRUTURA ===');
    
    // Login
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'admin@brotar.com',
        password: '123456'
    });

    if (authErr) {
        console.error('Falha no login:', authErr.message);
        return;
    }

    const tables = ['schools', 'students', 'support_professionals', 'profiles'];
    const inspectionResults = {};

    for (const table of tables) {
        console.log(`Inspecionando tabela: ${table}`);
        // Tenta buscar um registro para ver as colunas
        const { data, error } = await supabase.from(table).select('*').limit(1);
        
        if (error) {
            console.error(`Erro ao ler ${table}:`, error.message);
            inspectionResults[table] = { error: error.message };
        } else if (data && data.length > 0) {
            inspectionResults[table] = { columns: Object.keys(data[0]) };
            console.log(`Colunas de ${table}:`, Object.keys(data[0]));
        } else {
            // Se estiver vazia, tenta pegar a estrutura via metadados se possível
            // (RPC ou query direta se tiver permissão, mas aqui vamos tentar ver se pelo menos existe)
            console.log(`Tabela ${table} está vazia.`);
            inspectionResults[table] = { status: 'vazia' };
        }
    }

    fs.writeFileSync('table_structure_inspection.json', JSON.stringify(inspectionResults, null, 2));
    console.log('Resultado salvo em table_structure_inspection.json');

    await supabase.auth.signOut();
}

inspectStructure().catch(console.error);

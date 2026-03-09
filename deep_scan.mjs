
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function deepScan() {
    console.log('--- VARREDURA PROFUNDA: PROJETO indshiztdvjgvgnzigqd ---');

    // Lista de tabelas comuns para testar mesmo se o RPC/Exploration estiver bloqueado
    const commonTables = [
        'schools', 'escolas',
        'profiles', 'usuarios',
        'students', 'alunos',
        'registration', 'cadastros',
        'clinical_sessions', 'atendimentos'
    ];

    for (const table of commonTables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (error) {
                if (error.code === '42P01') {
                    // Tabela não existe - ok
                } else {
                    console.log(`- Tabela ${table}: Erro [${error.code}] ${error.message}`);
                }
            } else {
                console.log(`- Tabela ${table}: ✅ EXISTE | TOTAL DE REGISTROS: ${count}`);

                if (count > 0) {
                    const { data } = await supabase.from(table).select('*').limit(1);
                    console.log(`  Amostra:`, data[0]);
                }
            }
        } catch (e) {
            // Silencioso
        }
    }
    console.log('--- FIM DA VARREDURA ---');
}

deepScan();


import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Usando Service Role Key para garantir acesso total aos dados para backup
const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZHNoaXp0ZHZqZ3ZnbnppZ3FkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODkxNDk0MiwiZXhwIjoyMDg0NDkwOTQyfQ.15-gfyCZ3eF5kmbnW47hRRqkHlPr5XOPgQkYMcQrup8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const date = new Date().toISOString().split('T')[0];
        const filename = `backup_students_unit_null_${date}.json`;
        const absolutePath = path.resolve('d:/OneDrive/SISTEMA BROTAR/Sistema-Brotar-v-2.1', filename);

        console.log('--- BACKUP DE SEGURANÇA (DevOps): STUDENTS (UNIT IS NULL) ---');
        
        // Com Service Role Key não precisamos de login manual via auth.signIn
        
        // Buscar dados conforme solicitado
        console.log('Buscando registros via Service Role...');
        const { data: students, error: fetchError } = await supabase
            .from('students')
            .select('id, full_name, school_id, unit')
            .is('unit', null)
            .order('id');

        if (fetchError) {
            console.error('Erro ao buscar alunos:', fetchError.message);
            process.exit(1);
        }

        console.log(`Encontrados ${students.length} registros para backup.`);

        fs.writeFileSync(absolutePath, JSON.stringify(students, null, 2));
        console.log(`✅ Arquivo de backup gerado com sucesso: ${filename}`);
        console.log(`Caminho: ${absolutePath}`);

    } catch (err) {
        console.error('Erro fatal durante o backup:', err.message);
        process.exit(1);
    }
}

run();

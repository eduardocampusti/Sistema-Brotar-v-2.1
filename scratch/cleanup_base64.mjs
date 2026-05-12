
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZHNoaXp0ZHZqZ3ZnbnppZ3FkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODkxNDk0MiwiZXhwIjoyMDg0NDkwOTQyfQ.15-gfyCZ3eF5kmbnW47hRRqkHlPr5XOPgQkYMcQrup8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log('--- INICIANDO LIMPEZA DE DOCUMENTOS BASE64/BLOB ---');
    
    // 1. Buscar todos os alunos
    const { data: students, error } = await supabase
        .from('students')
        .select('id, full_name, documents');

    if (error) {
        console.error('Erro ao buscar alunos:', error);
        return;
    }

    console.log(`Total de alunos encontrados: ${students.length}`);

    let updatedCount = 0;

    for (const student of students) {
        if (!student.documents || !Array.isArray(student.documents)) continue;

        const originalCount = student.documents.length;
        const cleanedDocuments = student.documents.filter(doc => {
            const url = doc.url || '';
            const isTemporary = url.startsWith('data:') || url.startsWith('blob:');
            return !isTemporary;
        });

        if (cleanedDocuments.length !== originalCount) {
            console.log(`Limpando documentos de: ${student.full_name} (${student.id})`);
            console.log(`- Originais: ${originalCount}, Limpos: ${cleanedDocuments.length}`);
            
            const { error: updateError } = await supabase
                .from('students')
                .update({ documents: cleanedDocuments })
                .eq('id', student.id);

            if (updateError) {
                console.error(`Erro ao atualizar aluno ${student.id}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`--- LIMPEZA CONCLUÍDA ---`);
    console.log(`Alunos corrigidos: ${updatedCount}`);

    // 2. Verificar Audit Logs
    console.log('\n--- VERIFICANDO AUDIT LOGS PARA BASE64 ---');
    const { data: logs, error: logError } = await supabase
        .from('audit_logs')
        .select('*')
        .limit(200)
        .order('timestamp', { ascending: false });

    if (logError) {
        console.error('Erro ao buscar logs:', logError);
    } else {
        const suspiciousLogs = logs.filter(log => {
            const logStr = JSON.stringify(log);
            return logStr.includes('data:') || logStr.includes('blob:');
        });
        
        console.log(`Logs verificados: ${logs.length}`);
        console.log(`Logs suspeitos encontrados: ${suspiciousLogs.length}`);
        suspiciousLogs.forEach(log => {
            console.log(`[${log.timestamp}] Ação: ${log.action} no módulo ${log.module} | Registro: ${log.affected_record}`);
        });
    }
}

cleanup();

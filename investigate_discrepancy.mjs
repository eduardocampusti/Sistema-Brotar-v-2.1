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

    console.log('--- INVESTIGANDO DISCREPÂNCIA ---');

    // 1. Verificar alunos únicos em support_professionals
    const { data: pros } = await supabase
        .from('support_professionals')
        .select('student_id, regent_teacher');

    const uniqueStudentIdsInPros = new Set(pros?.map(p => p.student_id));
    console.log(`IDs de alunos únicos citados em Profissionais de Apoio: ${uniqueStudentIdsInPros.size}`);

    // 2. Verificar quais desses IDs não existem na tabela students
    const { data: currentStudents } = await supabase.from('students').select('id');
    const currentStudentIds = new Set(currentStudents?.map(s => s.id));

    let missingInStudents = 0;
    uniqueStudentIdsInPros.forEach(id => {
        if (!currentStudentIds.has(id)) {
            missingInStudents++;
        }
    });

    console.log(`IDs citados em Profissionais que NÃO existem em Students: ${missingInStudents}`);

    // 3. Verificar logs de auditoria para deleções recentes
    console.log('\n--- LOGS DE AUDITORIA (DELEÇÕES) ---');
    const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'EXCLUIR')
        .order('timestamp', { ascending: false })
        .limit(10);

    if (logs && logs.length > 0) {
        logs.forEach(l => {
            console.log(`- [${l.timestamp}] ${l.user} deletou em ${l.module}: ${l.affected_record}`);
        });
    } else {
        console.log('Nenhuma deleção encontrada nos logs recentes.');
    }
}

diagnose();

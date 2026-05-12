
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const isExecute = process.argv.includes('--execute');

    console.log('--- SISTEMA BROTAR: CORREÇÃO DE UNIDADES (V2 - UPDATE INDIVIDUAL) ---');
    
    // Login
    const { error: loginError } = await supabase.auth.signInWithPassword({
        email: 'admin@brotar.com',
        password: '123456'
    });

    if (loginError) {
        console.error('Erro de login:', loginError.message);
        return;
    }

    // 1. Relatório de impacto
    const { data: students, error: fetchError } = await supabase
        .from('students')
        .select('id, full_name, unit, school_id, schools(district)');

    if (fetchError) {
        console.error('Erro ao buscar alunos:', fetchError.message);
        return;
    }

    const report = {
        COCAL: 0,
        SEDE: 0,
        NAO_VINCULADO: 0,
        JA_PREENCHIDO: 0,
        TOTAL: students.length
    };

    const updates = [];

    students.forEach(s => {
        if (s.unit !== null) {
            report.JA_PREENCHIDO++;
            return;
        }

        let targetUnit = null;

        if (!s.school_id) {
            targetUnit = 'NAO_VINCULADO';
            report.NAO_VINCULADO++;
        } else {
            const district = s.schools?.district;
            if (['COCAL', 'ZONA RURAL', 'SUMIDOURO'].includes(district)) {
                targetUnit = 'COCAL';
                report.COCAL++;
            } else if (['SEDE', 'Centro'].includes(district)) {
                targetUnit = 'SEDE';
                report.SEDE++;
            } else {
                targetUnit = 'SEDE'; // Fallback
                report.SEDE++;
            }
        }

        if (targetUnit) {
            updates.push({ id: s.id, unit: targetUnit, name: s.full_name });
        }
    });

    console.log('\n--- RELATÓRIO DE IMPACTO ---');
    console.table(report);

    if (!isExecute) {
        console.log('\n[MODO DRY-RUN] Nenhum registro foi alterado.');
        console.log('Para executar a atualização, rode: node fix_student_units.mjs --execute');
        return;
    }

    console.log(`\nIniciando atualização individual de ${updates.length} registros...`);

    let sucessos = 0;
    let falhas = [];

    for (const record of updates) {
        const { error: updateError } = await supabase
            .from('students')
            .update({ unit: record.unit })
            .eq('id', record.id);

        if (updateError) {
            console.error(`\nErro no aluno ${record.id} (${record.name}):`, updateError.message);
            falhas.push({ id: record.id, name: record.name, error: updateError.message });
        } else {
            sucessos++;
            if (sucessos % 10 === 0) process.stdout.write(`${sucessos}...`);
            else process.stdout.write('.');
        }
    }

    console.log('\n\n--- RESULTADO FINAL ---');
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Falhas: ${falhas.length}`);

    if (falhas.length > 0) {
        console.log('\nIDs com falha:');
        console.table(falhas);
    }

    console.log('\nProcessamento concluído!');
}

run();

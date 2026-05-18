import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRLS() {
  console.log('=== VERIFICANDO CORREÇÃO DO RLS APÓS V36 ===');
  console.log(`URL do Banco: ${supabaseUrl}\n`);

  // Query 1: Verificar se a policy update_students_v36_scoped existe
  const q1 = "SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'students' AND policyname = 'update_students_v36_scoped'";
  const { data: d1, error: e1 } = await supabase.rpc('exec_sql', { sql: q1 });
  
  if (e1) {
    console.error('Erro ao executar Query 1:', e1.message);
  } else {
    console.log('1. Policy update_students_v36_scoped:');
    console.log(JSON.stringify(d1, null, 2));
  }

  console.log('\n----------------------------------------\n');

  // Query 2: Confirmar se a função can_update_student_clinical foi criada
  const q2 = "SELECT proname, prosecdef FROM pg_proc WHERE proname = 'can_update_student_clinical'";
  const { data: d2, error: e2 } = await supabase.rpc('exec_sql', { sql: q2 });

  if (e2) {
    console.error('Erro ao executar Query 2:', e2.message);
  } else {
    console.log('2. Função can_update_student_clinical:');
    console.log(JSON.stringify(d2, null, 2));
  }

  console.log('\n----------------------------------------\n');

  // Query 3: Confirmar se a policy antiga update_students_v26_scoped foi removida
  const q3 = "SELECT policyname FROM pg_policies WHERE tablename = 'students' AND policyname = 'update_students_v26_scoped'";
  const { data: d3, error: e3 } = await supabase.rpc('exec_sql', { sql: q3 });

  if (e3) {
    console.error('Erro ao executar Query 3:', e3.message);
  } else {
    console.log('3. Policy antiga update_students_v26_scoped (deve retornar vazio):');
    console.log(JSON.stringify(d3, null, 2));
  }
}

verifyRLS().catch(console.error);

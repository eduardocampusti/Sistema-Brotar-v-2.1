import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRemainingStudents() {
  console.log('--- Verificando alunos restantes ---');
  
  // Login como Admin para garantir visão total
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@brotar.com',
    password: '123456'
  });

  if (authError) {
    console.error('Erro de login:', authError.message);
    return;
  }

  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('*, schools(name)');

  if (studentError) {
    console.error('Erro ao buscar alunos:', studentError.message);
  } else {
    console.log(`Encontrados ${students.length} alunos.`);
    console.log(JSON.stringify(students, null, 2));
  }
}

checkRemainingStudents();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Configurações do Supabase não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectStudentsTable() {
  console.log(`--- Inspecionando tabela 'students' no banco ${supabaseUrl} ---`);
  
  // 1. Tentar pegar um registro para ver as colunas
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Erro ao ler tabela students:', error);
  } else if (data && data.length > 0) {
    console.log('Colunas encontradas na tabela students:', Object.keys(data[0]));
    console.log('\nExemplo de registro (clinical_info e documents):');
    console.log('Clinical Info:', JSON.stringify(data[0].clinical_info, null, 2));
    console.log('Documents:', JSON.stringify(data[0].documents, null, 2));
  } else {
    console.log('Tabela students está vazia.');
  }

  // 2. Tentar listar buckets
  console.log('\n--- Inspecionando Buckets de Storage ---');
  const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
  if (storageError) {
    console.error('Erro ao listar buckets:', storageError);
  } else {
    console.log('Buckets encontrados:', buckets.map(b => b.name));
  }

  // 3. Buscar alunos com documentos do tipo "Laudo Médico"
  console.log('\n--- Buscando documentos do tipo "Laudo Médico" ---');
  // Como documents é JSONB, precisamos filtrar no JS ou usar sintaxe do postgres se possível
  const { data: allStudents, error: fetchError } = await supabase
    .from('students')
    .select('id, full_name, documents')
    .not('documents', 'is', null);

  if (fetchError) {
    console.error('Erro ao buscar alunos com documentos:', fetchError);
  } else {
    const studentsWithLaudo = allStudents.filter(s => 
      Array.isArray(s.documents) && s.documents.some(d => d.type === 'Laudo Médico')
    );
    console.log(`Total de alunos com documentos: ${allStudents.length}`);
    console.log(`Total de alunos com "Laudo Médico" encontrado: ${studentsWithLaudo.length}`);
    
    if (studentsWithLaudo.length > 0) {
      console.log('\nExemplo de metadado de Laudo Médico:');
      const doc = studentsWithLaudo[0].documents.find(d => d.type === 'Laudo Médico');
      console.log(JSON.stringify(doc, null, 2));
    }
  }
}

inspectStudentsTable();

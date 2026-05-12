import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStudentDocuments() {
  console.log('--- VERIFICANDO TABELA STUDENT_DOCUMENTS ---');
  const { data, error } = await supabase
    .from('student_documents')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Erro:', error.message);
  } else if (data && data.length > 0) {
    const doc = data[0];
    console.log('Colunas:', Object.keys(doc).join(', '));
    console.log('Exemplo:', JSON.stringify(doc, null, 2));
  } else {
    console.log('Tabela student_documents está vazia.');
    
    // Tenta buscar registros com ILIKE para ver se há algo relacionado a 'laudo'
    const { data: laudos, error: laudoError } = await supabase
        .from('student_documents')
        .select('*')
        .ilike('document_type', '%laudo%')
        .limit(1);
    
    if (laudos && laudos.length > 0) {
        console.log('Encontrado laudo via ILIKE:');
        console.log(JSON.stringify(laudos[0], null, 2));
    } else {
        console.log('Nenhum laudo encontrado em student_documents.');
    }
  }
}

checkStudentDocuments();

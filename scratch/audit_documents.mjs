import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function audit() {
  console.log('--- AUDITORIA DE DOCUMENTOS ---');
  
  // 1. Listar tabelas (via RPC ou query no pg_catalog se possível)
  // Como não temos acesso fácil a RPC de listagem de tabelas sem o management API, 
  // vamos tentar buscar dados de tabelas prováveis.
  
  const tables = ['student_documents', 'documents', 'generated_documents', 'attachments'];
  
  for (const table of tables) {
    console.log(`\nVerificando tabela: ${table}`);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log(`Tabela '${table}' não existe.`);
      } else {
        console.error(`Erro ao acessar '${table}':`, error.message);
      }
    } else {
      console.log(`Tabela '${table}' EXISTE.`);
      // Se existir, mostrar colunas do primeiro registro
      if (data && data.length > 0) {
        console.log('Colunas encontradas:', Object.keys(data[0]).join(', '));
      } else {
        console.log('Tabela vazia, mas existe.');
      }
    }
  }

  // 2. Buscar registros de "Laudo Médico" em generated_documents ou student_documents
  console.log('\n--- BUSCANDO "LAUDO MÉDICO" ---');
  
  // Tenta em generated_documents
  const { data: genDocs, error: genDocsError } = await supabase
    .from('generated_documents')
    .select('doc_type, student_name')
    .ilike('doc_type', '%laudo%')
    .limit(5);
    
  if (genDocs && genDocs.length > 0) {
    console.log('Registros em generated_documents:');
    genDocs.forEach(d => console.log(`- Tipo: ${d.doc_type} (Aluno anonimizado)`));
  } else {
    console.log('Nenhum "laudo" encontrado em generated_documents.');
  }

  // Tenta em student_documents se existir
  const { data: studDocs, error: studDocsError } = await supabase
    .from('student_documents')
    .select('document_type')
    .ilike('document_type', '%laudo%')
    .limit(5);

  if (studDocs && studDocs.length > 0) {
    console.log('Registros em student_documents:');
    studDocs.forEach(d => console.log(`- Tipo: ${d.document_type}`));
  } else {
    console.log('Nenhum "laudo" encontrado em student_documents.');
  }
}

audit();

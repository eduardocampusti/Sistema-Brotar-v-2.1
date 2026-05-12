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

async function checkGeneratedDocuments() {
  console.log('--- VERIFICANDO TABELA GENERATED_DOCUMENTS ---');
  const { data, error } = await supabase
    .from('generated_documents')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Erro:', error.message);
  } else if (data && data.length > 0) {
    const doc = data[0];
    console.log('Colunas:', Object.keys(doc).join(', '));
    console.log('Exemplo:', JSON.stringify(doc, null, 2));
  } else {
    console.log('Tabela generated_documents está vazia.');
  }
}

checkGeneratedDocuments();

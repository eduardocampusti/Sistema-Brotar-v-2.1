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

async function checkClinicalSessions() {
  console.log('--- VERIFICANDO TABELA CLINICAL_SESSIONS ---');
  const { data, error } = await supabase
    .from('clinical_sessions')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Erro:', error.message);
  } else if (data && data.length > 0) {
    const session = data[0];
    console.log('Colunas:', Object.keys(session).join(', '));
    console.log('Exemplo content:', JSON.stringify(session.content, null, 2));
  } else {
    console.log('Tabela clinical_sessions está vazia.');
  }
}

checkClinicalSessions();

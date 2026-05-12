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

async function bruteForceTables() {
  const words = ['student', 'document', 'attachment', 'file', 'clinical', 'session', 'tea', 'laudo', 'suspicion', 'medico', 'relatorio'];
  const tables = [];
  
  for (const w1 of words) {
    tables.push(w1);
    for (const w2 of words) {
        if (w1 !== w2) {
            tables.push(`${w1}_${w2}`);
            tables.push(`${w1}s_${w2}`);
            tables.push(`${w1}_${w2}s`);
            tables.push(`${w1}s_${w2}s`);
            tables.push(`${w1}-${w2}`);
        }
    }
  }

  // Add plural versions
  words.forEach(w => tables.push(`${w}s`));

  // Add specific common ones
  tables.push('generated_documents');
  tables.push('student_documents');

  const uniqueTables = [...new Set(tables)];
  console.log(`Verificando ${uniqueTables.length} possíveis nomes de tabela...`);

  const found = [];
  for (const t of uniqueTables) {
    const { error } = await supabase.from(t).select('count', { count: 'exact', head: true });
    if (!error) {
      found.push(t);
    }
  }

  console.log('Tabelas encontradas:', found.join(', '));
}

bruteForceTables();

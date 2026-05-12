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

async function listAllTables() {
  console.log('--- LISTANDO TODAS AS TABELAS NO SCHEMA PUBLIC ---');
  // Usando uma query SQL bruta via RPC se disponível, ou tentando deduzir.
  // Já que não temos RPC, vamos tentar buscar nomes de tabelas do pg_catalog via select normal se o RLS permitir 
  // (geralmente não permite select direto em pg_catalog via API, mas vamos tentar via RPC 'exec_sql' se existir)
  
  // Como alternativa, vamos tentar as tabelas que vimos no Select-String
  const commonTables = [
    'students', 'profiles', 'schools', 'audit_logs', 'appointments', 
    'clinical_sessions', 'student_documents', 'generated_documents', 
    'system_settings', 'letterhead_config', 'system_messages', 'support_professionals'
  ];

  for (const t of commonTables) {
    const { error } = await supabase.from(t).select('count', { count: 'exact', head: true });
    if (!error) {
      console.log(`[OK] ${t}`);
    } else {
      console.log(`[ERRO] ${t}: ${error.message}`);
    }
  }
}

listAllTables();

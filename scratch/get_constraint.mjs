import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(supabaseUrl, serviceKey);

async function run() {
  const sql = `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'appointments_unit_check';`;
  const { data, error } = await admin.rpc('exec_sql', { sql });
  if (error) console.error('Erro:', error);
  else console.log('Resultado:', data);
}

run();

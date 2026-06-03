import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data, error } = await admin
    .from('appointments')
    .select('unit')
    // We want to see unique units
    .limit(1000);
    
  if (error) {
      console.error('Erro:', error);
  } else {
      const units = [...new Set(data.map(d => d.unit))];
      console.log('Unidades existentes em appointments:', units);
  }
}

run();

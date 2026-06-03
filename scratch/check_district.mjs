import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data, error } = await admin.from('profiles').select('id, full_name, role, specialty, scope, district_scope').not('district_scope', 'is', null);
  console.log('Profiles with district_scope:', data);
}

run();

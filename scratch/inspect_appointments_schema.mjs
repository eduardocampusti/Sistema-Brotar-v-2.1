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

async function inspectAppointments() {
  console.log('--- INSPECTING APPOINTMENTS TABLE ---');
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching appointment:', error.message);
  } else if (data && data.length > 0) {
    const apt = data[0];
    console.log('Appointment columns:', Object.keys(apt).join(', '));
    console.log('Sample appointment:', JSON.stringify(apt, null, 2));
  } else {
    console.log('No appointments found.');
  }

  console.log('\n--- TESTING DIRECT SQL / SPECIALTIES ---');
  // We can't run raw SQL easily via JS client without a custom function,
  // but let's see if we can get functions or look at V20/V27 files for definitions.
}

inspectAppointments();

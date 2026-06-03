import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(supabaseUrl, serviceKey);

async function run() {
  const dummyPayload = {
      student_id: '123e4567-e89b-12d3-a456-426614174000', // invalid UUID but format matches
      professional_id: '123e4567-e89b-12d3-a456-426614174001',
      date: '2025-01-01',
      start_time: '10:00',
      end_time: '11:00',
      status: 'RETROATIVO',
      specialty: 'PSICOPEDAGOGIA',
      unit: 'GLOBAL'
  };

  const { data, error } = await admin.from('appointments').insert([dummyPayload]);
  console.log('Insert GLOBAL Error:', error);

  dummyPayload.unit = 'SEDE';
  const { data: d2, error: e2 } = await admin.from('appointments').insert([dummyPayload]);
  console.log('Insert SEDE Error:', e2);
}

run();

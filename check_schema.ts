import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zchvchksrfpntqjclbrg.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'ey...'; // Need to read from .env

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('support_professionals').select('*').limit(1);
    console.log('Data:', data);
    console.log('Error:', error);
}

check();

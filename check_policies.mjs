import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We manually use the publishable key as anon key if needed, 
// but let's try to see if we can get policies.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
    console.log('--- RLS POLICIES FOR SCHOOLS ---');
    // Attempt to query pg_policies using the anon key (unlikely to work but worth a try)
    const { data, error } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'schools');

    if (error) {
        console.log('Error querying pg_policies:', error.message);
    } else {
        console.log(data);
    }
}

checkPolicies();

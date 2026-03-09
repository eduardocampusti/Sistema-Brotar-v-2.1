import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthAndFetch() {
    console.log('--- TESTING AUTH AND FETCH WITH DISTRICT ---');

    // Attempt login as 'brotar' with default password '123456'
    console.log('Attempting login as "brotar"...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'brotar',
        password: '123456',
    });

    if (authError) {
        console.error('Login failed for "brotar":', authError.message);
        return;
    }

    console.log('Login successful for "brotar"!');

    // Fetch all schools with their district and is_active status
    const { data: schools, error: fetchError } = await supabase
        .from('schools')
        .select('name, district, is_active, inep');

    if (fetchError) {
        console.error('Fetch error:', fetchError.message);
    } else {
        console.log(`Found ${schools.length} schools.`);
        const districts = new Set();
        schools.forEach(s => {
            districts.add(s.district);
            console.log(`School: ${s.name} | District: ${s.district} | Active: ${s.is_active}`);
        });
        console.log('Unique Districts found:', Array.from(districts));
    }
}

testAuthAndFetch();

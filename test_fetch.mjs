import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function testFetch() {
    console.log('--- TEST FETCH SCHOOLS ---');
    const { data, error } = await supabase.from('schools').select('*');

    if (error) {
        console.error('Error fetching schools:', error);
        return;
    }

    console.log('Total schools fetched:', data.length);
    if (data.length > 0) {
        console.log('Example school:', {
            id: data[0].id,
            name: data[0].name,
            inep: data[0].inep,
            isActive: data[0].is_active,
            district: data[0].district
        });
    }
}

testFetch();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function listTables() {
    console.log('--- PUBLIC TABLES ---');
    const { data, error } = await supabase
        .from('pg_catalog.pg_tables') // This might not work with anon key
        .select('tablename')
        .eq('schemaname', 'public');

    if (error) {
        console.log('Error listing tables via pg_tables:', error.message);

        // Fallback: Try a generic query to see if it even connects
        const { data: schoolData, error: schoolError } = await supabase.from('schools').select('id').limit(1);
        console.log('Schools table exists?', !schoolError);

        const { data: escolaData, error: escolaError } = await supabase.from('escolas').select('id').limit(1);
        console.log('Escolas table exists?', !escolaError);
    } else {
        console.log(data);
    }
}

listTables();

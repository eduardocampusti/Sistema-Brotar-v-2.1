import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectTable(tableName) {
    console.log(`\nInspecting table: ${tableName}`);
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
        console.error(`Error selecting from ${tableName}:`, error.message, `(${error.code})`);
        return;
    }
    if (data && data.length > 0) {
        console.log(`Columns for ${tableName}:`, Object.keys(data[0]).join(', '));
        console.log(`Sample row (keys only):`, Object.keys(data[0]));
    } else {
        console.log(`Table ${tableName} is empty or has no accessible rows.`);
    }
}

async function run() {
    await inspectTable('student_documents');
    await inspectTable('documents');
    await inspectTable('attachments');
    await inspectTable('students');
}

run().catch(console.error);

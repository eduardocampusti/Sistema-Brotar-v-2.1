import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findDocs() {
    console.log('Fetching students to check documents...');
    const { data, error } = await supabase
        .from('students')
        .select('id, full_name, documents')
        .limit(200);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    const studentsWithDocs = data.filter(s => s.documents && Array.isArray(s.documents) && s.documents.length > 0);

    if (studentsWithDocs.length > 0) {
        console.log(`Found ${studentsWithDocs.length} students with documents in sample.`);
        for (const student of studentsWithDocs) {
            console.log(`\nStudent: ${student.full_name.substring(0, 3)}...`);
            console.log('Documents:', JSON.stringify(student.documents, null, 2));
        }
    } else {
        console.log('No students in first 200 have documents.');
    }
}

findDocs().catch(console.error);

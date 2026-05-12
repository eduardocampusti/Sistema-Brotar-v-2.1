import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function searchLaudo() {
    console.log('Searching for "Laudo Médico" records in students.documents...');
    
    // We can't easily query inside JSONB array with supabase-js filters without raw SQL.
    // So we fetch some students who have documents and check them in JS.
    const { data, error } = await supabase
        .from('students')
        .select('id, documents')
        .not('documents', 'is', null)
        .limit(500);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    let found = false;
    for (const student of data) {
        if (Array.isArray(student.documents)) {
            for (const doc of student.documents) {
                // Check if type looks like "Laudo Médico"
                if (doc.type && (doc.type.toLowerCase().includes('laudo') || doc.type.toLowerCase().includes('medico') || doc.type.toLowerCase().includes('médico'))) {
                    console.log(`Found match in student ID: ${student.id}`);
                    console.log(`Exact value for "type": "${doc.type}"`);
                    console.log(`Full document object:`, JSON.stringify(doc, null, 2));
                    found = true;
                    // Keep searching to see if there are variations, but we only need one example for now.
                    // break; 
                }
            }
        }
        if (found) break; // Found one, that's enough for the report
    }

    if (!found) {
        console.log('No "Laudo Médico" documents found in the sample.');
        
        // Let's list all unique types found to see what we have
        const allTypes = new Set();
        data.forEach(s => {
            if (Array.isArray(s.documents)) {
                s.documents.forEach(d => {
                    if (d.type) allTypes.add(d.type);
                });
            }
        });
        console.log('Available document types in sample:', Array.from(allTypes));
    }
}

searchLaudo().catch(console.error);

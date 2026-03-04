const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data: schools } = await supabase.from('schools').select('name');
    console.log("ESCOLAS NO BANCO:");
    schools.forEach(s => console.log(s.name));

    // Alunos
    const { data: students } = await supabase.from('students').select('full_name');
    console.log("ALUNOS NO BANCO (Alguns):", students.slice(0, 5).map(s => s.full_name));
}
run();

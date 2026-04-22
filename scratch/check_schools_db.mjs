
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error querying schools:', error);
    process.exit(1);
  }

  if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]));
  } else {
    // If table is empty, check via information_schema
    const { data: columns, error: colError } = await supabase
      .rpc('exec_sql', { sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'schools'" });
    
    if (colError) {
       // If no exec_sql RPC, try a direct query to information_schema (might fail due to RLS but service role should pass)
       const { data: schemaCols, error: schemaError } = await supabase
         .from('information_schema.columns')
         .select('column_name')
         .eq('table_name', 'schools');
       
       if (schemaError) {
         console.error('Could not determine columns via any method');
       } else {
         console.log('Columns found (schema):', schemaCols.map(c => c.column_name));
       }
    } else {
      console.log('Columns found (rpc):', columns.map(c => c.column_name));
    }
  }
}

checkColumns();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkHours() {
    const { data, error, count } = await supabase
        .from('appointments')
        .select('start_time, end_time', { count: 'exact' });

    if (error) {
        console.error('Erro:', error);
    } else {
        console.log('Total de agendamentos no banco:', count);
        const startTimes = [...new Set(data.map(a => a.start_time))].sort();
        const endTimes = [...new Set(data.map(a => a.end_time))].sort();
        console.log('Horarios de Inicio cadastrados:', startTimes);
        console.log('Horarios de Termino cadastrados:', endTimes);
    }
}

checkHours();

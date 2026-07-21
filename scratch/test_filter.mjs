import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We mock/use the SupabaseService mapping logic
const Specialty = {
  PSYCHOLOGY: 'Psicologia',
  SOCIAL_WORK: 'Serviço Social',
  PSYCHOPEDAGOGY: 'Psicopedagogia',
  OCCUPATIONAL_THERAPY: 'Terapia Ocupacional',
  SPEECH_THERAPY: 'Fonoaudiologia',
  PHYSIOTHERAPY: 'Fisioterapia',
  NUTRITION: 'Nutrição'
};

const REVERSE_SPECIALTY_MAP = {
  'PSICOLOGIA': Specialty.PSYCHOLOGY,
  'FONOAUDIOLOGIA': Specialty.SPEECH_THERAPY,
  'PSICOPEDAGOGIA': Specialty.PSYCHOPEDAGOGY,
  'TERAPIA_OCUPACIONAL': Specialty.OCCUPATIONAL_THERAPY,
  'SERVICO_SOCIAL': Specialty.SOCIAL_WORK,
  'FISIOTERAPIA': Specialty.PHYSIOTHERAPY,
  'ENFERMAGEM': 'Enfermagem',
  'NUTRICAO': Specialty.NUTRITION
};

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: rows, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'SPECIALIST')
        .eq('is_active', true);

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    const mappedUsers = rows.map(p => {
        const specialtyMapped = p.specialty
            ? REVERSE_SPECIALTY_MAP[p.specialty] || REVERSE_SPECIALTY_MAP[p.specialty.toUpperCase()] || p.specialty
            : undefined;
        return {
            id: p.id,
            name: p.full_name,
            role: p.role,
            specialty: specialtyMapped,
            isActive: p.is_active
        };
    });

    console.log('Mapped active specialists:', mappedUsers);

    // Let's filter them like in AppointmentForm.tsx:
    const PERFIS_EXCLUIDOS_LISTA_AGENDAMENTO = [
        'ADMIN',
        'SECRETARIA_SEDE',
        'SECRETARIA_COCAL',
        'COORDENADOR',
    ];
    const ESPECIALIDADES_CLINICAS = new Set(Object.values(Specialty));

    const filtered = mappedUsers.filter(p => 
        !PERFIS_EXCLUIDOS_LISTA_AGENDAMENTO.includes(p.role) &&
        !!p.specialty &&
        ESPECIALIDADES_CLINICAS.has(p.specialty)
    );

    console.log('Filtered professionals (for appointment):', filtered);
}

run();

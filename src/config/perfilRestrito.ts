import { Specialty, type User } from '../../types';

/**
 * Slugs canônicos dos perfis clínicos/terapêuticos com visão restrita na Central de Prontuários.
 * Manter alinhado a `db/migrations/V20_prontuario_perfis_restritos_rls.sql` e status de vínculo em `V22_prontuario_vinculo_inclui_agendado.sql`.
 */
export const PERFIS_RESTRITOS = [
    'psicologia',
    'servico_social',
    'psicopedagogia',
    'terapia_ocupacional',
    'fonoaudiologia',
    'fisioterapia',
    'nutricao',
] as const;

export type PerfilRestritoSlug = (typeof PERFIS_RESTRITOS)[number];

/** Valores de `profiles.specialty` / enum `specialty_type` no Postgres (espelho de PERFIS_RESTRITOS). */
export const ESPECIALIDADES_RESTRITAS_DB = [
    'PSICOLOGIA',
    'SERVICO_SOCIAL',
    'PSICOPEDAGOGIA',
    'TERAPIA_OCUPACIONAL',
    'FONOAUDIOLOGIA',
    'FISIOTERAPIA',
    'NUTRICAO',
] as const;

/**
 * Status de agendamento que mantêm o vínculo profissional↔aluno na Central de Prontuários.
 * No banco costumam estar em MAIÚSCULAS; inclui sinônimos previstos (ex.: encerrado).
 */
export const STATUS_AGENDAMENTO_VINCULO_PRONTUARIO = [
    'AGENDADO',
    'CONFIRMADO',
    'EM_ATENDIMENTO',
    'ATENDIDO',
    'ENCERRADO',
] as const;

const SPECIALTY_TO_SLUG: Partial<Record<Specialty, PerfilRestritoSlug>> = {
    [Specialty.PSYCHOLOGY]: 'psicologia',
    [Specialty.SOCIAL_WORK]: 'servico_social',
    [Specialty.PSYCHOPEDAGOGY]: 'psicopedagogia',
    [Specialty.OCCUPATIONAL_THERAPY]: 'terapia_ocupacional',
    [Specialty.SPEECH_THERAPY]: 'fonoaudiologia',
    [Specialty.PHYSIOTHERAPY]: 'fisioterapia',
    [Specialty.NUTRITION]: 'nutricao',
};

export function slugEspecialidadeDoUsuario(
    user: Pick<User, 'role' | 'specialty'>
): PerfilRestritoSlug | null {
    if (user.role !== 'SPECIALIST' || !user.specialty) return null;
    return SPECIALTY_TO_SLUG[user.specialty] ?? null;
}

/** Especialista cuja especialidade está na lista restrita (independente de secretaria/admin). */
export function isPerfilRestritoProntuario(user: Pick<User, 'role' | 'specialty'>): boolean {
    const slug = slugEspecialidadeDoUsuario(user);
    return slug !== null && (PERFIS_RESTRITOS as readonly string[]).includes(slug);
}

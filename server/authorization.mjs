const TRUSTED_ROLES = Object.freeze([
    'ADMIN',
    'SPECIALIST',
    'ASSISTANT',
    'EDUCATION_SECRETARY',
    'SECRETARIA_EDUCACAO',
    'SECRETARIA_SEDE',
    'SECRETARIA_COCAL',
    'COORDENADOR',
    'ESCOLA',
]);

const ROLE_SET = new Set(TRUSTED_ROLES);

const PERMISSION_ROLES = Object.freeze({
    'admin:manage': new Set(['ADMIN']),
    'gemini:generate': new Set(TRUSTED_ROLES),
    'whatsapp:send': new Set([
        'ADMIN',
        'SPECIALIST',
        'ASSISTANT',
        'EDUCATION_SECRETARY',
        'SECRETARIA_EDUCACAO',
        'SECRETARIA_SEDE',
        'SECRETARIA_COCAL',
        'COORDENADOR',
    ]),
});

/**
 * @typedef {'ADMIN'|'SPECIALIST'|'ASSISTANT'|'EDUCATION_SECRETARY'|'SECRETARIA_EDUCACAO'|'SECRETARIA_SEDE'|'SECRETARIA_COCAL'|'COORDENADOR'|'ESCOLA'} TrustedRole
 * @typedef {'admin:manage'|'gemini:generate'|'whatsapp:send'} ServerPermission
 * @typedef {{ id: string, role: TrustedRole, isActive: true, specialty: string|null, scope: string|null, schoolId: string|null }} TrustedProfile
 * @typedef {{ id: string, professionalId: string|null, specialty: string|null, unit: string|null, schoolId: string|null, district: string|null }} AppointmentAccess
 */

/** @param {unknown} value */
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** @param {unknown} value */
function normalizedText(value) {
    return typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : null;
}

/** @param {unknown} value */
function normalizedId(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** @param {unknown} value */
function firstRecord(value) {
    if (Array.isArray(value)) {
        return value.find(isRecord) ?? null;
    }
    return isRecord(value) ? value : null;
}

/**
 * Converte somente uma linha de `public.profiles` em identidade autorizável.
 * Dados do Auth/JWT não fazem parte desta função por design.
 *
 * @param {unknown} value
 * @param {string} expectedUserId
 * @returns {TrustedProfile|null}
 */
export function normalizeTrustedProfile(value, expectedUserId) {
    if (!isRecord(value)) return null;

    const id = normalizedId(value.id);
    const role = normalizedText(value.role);
    if (id !== expectedUserId || !role || !ROLE_SET.has(role) || value.is_active !== true) {
        return null;
    }

    return {
        id,
        role: /** @type {TrustedRole} */ (role),
        isActive: true,
        specialty: normalizedText(value.specialty),
        scope: normalizedText(value.scope),
        schoolId: normalizedId(value.school_id),
    };
}

/**
 * @param {TrustedProfile} profile
 * @param {ServerPermission} permission
 */
export function profileHasPermission(profile, permission) {
    const allowedRoles = PERMISSION_ROLES[permission];
    return profile.isActive === true && Boolean(allowedRoles?.has(profile.role));
}

/**
 * @param {unknown} value
 * @returns {AppointmentAccess|null}
 */
export function normalizeAppointmentAccess(value) {
    if (!isRecord(value)) return null;
    const id = normalizedId(value.id);
    if (!id) return null;

    const student = firstRecord(value.students);
    const school = firstRecord(student?.schools);

    return {
        id,
        professionalId: normalizedId(value.professional_id),
        specialty: normalizedText(value.specialty),
        unit: normalizedText(value.unit),
        schoolId: normalizedId(student?.school_id),
        district: normalizedText(school?.district),
    };
}

/**
 * Autoriza o envio associado a um agendamento usando identidade e escopo
 * persistidos no servidor. A checagem de UI nunca substitui esta regra.
 *
 * @param {TrustedProfile} profile
 * @param {AppointmentAccess} appointment
 */
export function canAccessAppointment(profile, appointment) {
    if (!profileHasPermission(profile, 'whatsapp:send')) return false;

    if (profile.role === 'ADMIN' || profile.role === 'COORDENADOR') {
        return true;
    }

    if (profile.role === 'SPECIALIST') {
        return appointment.professionalId === profile.id
            && Boolean(profile.specialty)
            && appointment.specialty === profile.specialty;
    }

    if (profile.role === 'SECRETARIA_COCAL') {
        return appointment.unit === 'COCAL' || appointment.district === 'COCAL';
    }

    if (profile.role === 'SECRETARIA_SEDE') {
        return appointment.unit === 'SEDE' || appointment.district === 'SEDE';
    }

    if (profile.role === 'ASSISTANT' || profile.role === 'EDUCATION_SECRETARY') {
        if (!profile.scope || profile.scope === 'GLOBAL') return true;
        return appointment.unit === profile.scope || appointment.district === profile.scope;
    }

    return profile.role === 'SECRETARIA_EDUCACAO';
}

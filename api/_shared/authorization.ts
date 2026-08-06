import type { SupabaseClient } from '@supabase/supabase-js';
import {
  canAccessAppointment,
  normalizeAppointmentAccess,
  normalizeTrustedProfile,
  profileHasPermission,
} from '../../server/authorization.mjs';

export type ServerPermission = 'admin:manage' | 'gemini:generate' | 'whatsapp:send';
export type TrustedProfile = NonNullable<ReturnType<typeof normalizeTrustedProfile>>;

export type AuthorizationResult =
  | { ok: true; profile: TrustedProfile }
  | { ok: false; status: 401 | 403 };

export type AppointmentAuthorizationResult =
  | { ok: true }
  | { ok: false; status: 403 | 404 | 500 };

export async function authorizeSession(
  supabase: SupabaseClient,
  accessToken: string,
  permission: ServerPermission,
): Promise<AuthorizationResult> {
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) {
    return { ok: false, status: 401 };
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('id,role,is_active,specialty,scope,school_id')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  const profile = normalizeTrustedProfile(profileRow, user.id);
  if (profileError || !profile || !profileHasPermission(profile, permission)) {
    return { ok: false, status: 403 };
  }

  return { ok: true, profile };
}

export async function authorizeAppointment(
  supabase: SupabaseClient,
  profile: TrustedProfile,
  appointmentId: string,
): Promise<AppointmentAuthorizationResult> {
  const { data: appointmentRow, error } = await supabase
    .from('appointments')
    .select('id,professional_id,specialty,unit,students(school_id,schools(district))')
    .eq('id', appointmentId)
    .maybeSingle();

  if (error) return { ok: false, status: 500 };

  const appointment = normalizeAppointmentAccess(appointmentRow);
  if (!appointment) return { ok: false, status: 404 };
  if (!canAccessAppointment(profile, appointment)) return { ok: false, status: 403 };

  return { ok: true };
}

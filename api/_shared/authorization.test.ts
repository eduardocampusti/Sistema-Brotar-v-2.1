import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  canAccessAppointment,
  normalizeAppointmentAccess,
  normalizeTrustedProfile,
} from '../../server/authorization.mjs';
import { authorizeSession } from './authorization';

interface ClientFixture {
  user: { id: string; user_metadata?: Record<string, unknown> } | null;
  authError?: Error | null;
  profile?: Record<string, unknown> | null;
  profileError?: Error | null;
}

function createClientFixture(fixture: ClientFixture): SupabaseClient {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: fixture.profile ?? null,
      error: fixture.profileError ?? null,
    }),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: fixture.user },
        error: fixture.authError ?? null,
      }),
    },
    from: vi.fn().mockReturnValue(builder),
  } as unknown as SupabaseClient;
}

describe('autorização server-side baseada em profiles', () => {
  it('nega privilégio administrativo quando usuário comum adultera user_metadata', async () => {
    const client = createClientFixture({
      user: { id: 'user-common', user_metadata: { role: 'ADMIN' } },
      profile: {
        id: 'user-common',
        role: 'SPECIALIST',
        is_active: true,
        specialty: 'PSICOLOGIA',
        scope: 'GLOBAL',
        school_id: null,
      },
    });

    const result = await authorizeSession(client, 'tampered-session', 'admin:manage');

    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('nega sessão inválida antes de consultar permissões', async () => {
    const client = createClientFixture({
      user: null,
      authError: new Error('invalid session'),
    });

    const result = await authorizeSession(client, 'invalid-session', 'admin:manage');

    expect(result).toEqual({ ok: false, status: 401 });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('autoriza perfil administrativo válido persistido no servidor', async () => {
    const client = createClientFixture({
      user: { id: 'user-admin' },
      profile: {
        id: 'user-admin',
        role: 'ADMIN',
        is_active: true,
        specialty: null,
        scope: 'GLOBAL',
        school_id: null,
      },
    });

    const result = await authorizeSession(client, 'admin-session', 'admin:manage');

    expect(result.ok).toBe(true);
  });

  it('nega função administrativa a perfil ativo sem a permissão necessária', async () => {
    const client = createClientFixture({
      user: { id: 'user-school' },
      profile: {
        id: 'user-school',
        role: 'ESCOLA',
        is_active: true,
        specialty: null,
        scope: 'SEDE',
        school_id: 'school-one',
      },
    });

    const result = await authorizeSession(client, 'school-session', 'admin:manage');

    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('nega tentativa de acesso a agendamento de outra clínica', () => {
    const profile = normalizeTrustedProfile({
      id: 'psychologist-one',
      role: 'SPECIALIST',
      is_active: true,
      specialty: 'PSICOLOGIA',
      scope: 'GLOBAL',
      school_id: null,
    }, 'psychologist-one');
    const appointment = normalizeAppointmentAccess({
      id: 'appointment-other-clinic',
      professional_id: 'speech-therapist-one',
      specialty: 'FONOAUDIOLOGIA',
      unit: 'SEDE',
      students: { school_id: 'school-one', schools: { district: 'SEDE' } },
    });

    expect(profile).not.toBeNull();
    expect(appointment).not.toBeNull();
    expect(canAccessAppointment(profile!, appointment!)).toBe(false);
  });
});

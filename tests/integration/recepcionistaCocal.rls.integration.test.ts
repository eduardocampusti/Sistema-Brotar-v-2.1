/**
 * Testes de integração RLS — perfil recepcionista (Secretária Cocal) = role SECRETARIA_COCAL (V27).
 *
 * Variáveis de ambiente (arquivo .env ou .env.local na raiz do projeto):
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 * - RLS_TEST_RECEPCIONISTA_COCAL_EMAIL
 * - RLS_TEST_RECEPCIONISTA_COCAL_PASSWORD
 *
 * Opcionais (reforçam bloqueio explícito a outra região, se existirem no banco):
 * - RLS_TEST_SEDE_SCHOOL_ID — UUID de escola do distrito SEDE; esperado: 0 linhas para o usuário Cocal
 * - RLS_TEST_SEDE_STUDENT_ID — UUID de aluno vinculado a escola SEDE; esperado: 0 linhas
 */

import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

loadDotenv({ path: resolve(process.cwd(), '.env') });
loadDotenv({ path: resolve(process.cwd(), '.env.local'), override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';
const RECEP_EMAIL = process.env.RLS_TEST_RECEPCIONISTA_COCAL_EMAIL ?? '';
const RECEP_PASSWORD = process.env.RLS_TEST_RECEPCIONISTA_COCAL_PASSWORD ?? '';
const SEDE_SCHOOL_ID = process.env.RLS_TEST_SEDE_SCHOOL_ID?.trim() ?? '';
const SEDE_STUDENT_ID = process.env.RLS_TEST_SEDE_STUDENT_ID?.trim() ?? '';

const hasRecepCredentials =
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && RECEP_EMAIL && RECEP_PASSWORD);

function normDistrict(v: string | null | undefined): string {
  return (v ?? '').trim().toUpperCase();
}

function normUnit(v: string | null | undefined): string {
  return (v ?? '').trim().toUpperCase();
}

async function fetchAllPages<T>(
  runPage: (from: number, to: number) => Promise<{ data: T[] | null; error: Error | null }>
): Promise<T[]> {
  const pageSize = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await runPage(from, to);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

describe.skipIf(!hasRecepCredentials)('RLS — recepcionista (Cocal) / SECRETARIA_COCAL', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-application-name': 'brotar-rls-tests' } },
    });
    const { data, error } = await client.auth.signInWithPassword({
      email: RECEP_EMAIL,
      password: RECEP_PASSWORD,
    });
    if (error) throw new Error(`Login recepcionista Cocal: ${error.message}`);
    if (!data.session?.user) throw new Error('Sessão ausente após login');

    const metaRole = normDistrict(
      (data.session.user.user_metadata as { role?: string } | undefined)?.role
    );
    if (metaRole && metaRole !== 'SECRETARIA_COCAL') {
      console.warn(
        `[RLS test] JWT user_metadata.role=${metaRole} (esperado SECRETARIA_COCAL ou vazio confiando em profiles)`
      );
    }
  });

  afterAll(async () => {
    await client.auth.signOut();
  });

  it('lista apenas escolas do distrito COCAL (nenhuma SEDE)', async () => {
    const schools = await fetchAllPages<{ id: string; district: string | null }>(
      async (from, to) =>
        client.from('schools').select('id,district').order('id', { ascending: true }).range(from, to)
    );

    expect(schools.length, 'deve existir ao menos uma escola Cocal no ambiente de teste').toBeGreaterThan(0);

    const bad = schools.filter((s) => normDistrict(s.district) !== 'COCAL');
    expect(
      bad,
      `Escolas fora de Cocal não devem aparecer. Recebido: ${JSON.stringify(bad.slice(0, 5))}`
    ).toEqual([]);

    const ids = new Set(schools.map((s) => s.id));
    expect(ids.size).toBe(schools.length);
  });

  it('alunos visíveis pertencem apenas a escolas do distrito COCAL', async () => {
    const schools = await fetchAllPages<{ id: string; district: string | null }>(
      async (from, to) =>
        client.from('schools').select('id,district').order('id', { ascending: true }).range(from, to)
    );
    const cocalSchoolIds = new Set(
      schools.filter((s) => normDistrict(s.district) === 'COCAL').map((s) => s.id)
    );

    const students = await fetchAllPages<{ id: string; school_id: string | null }>(
      async (from, to) =>
        client.from('students').select('id,school_id').order('id', { ascending: true }).range(from, to)
    );

    const orphanSchool = students.filter(
      (st) => st.school_id != null && !cocalSchoolIds.has(st.school_id)
    );
    expect(
      orphanSchool,
      'Nenhum aluno com school_id fora do conjunto de escolas Cocal visíveis'
    ).toEqual([]);

    const nullSchool = students.filter((st) => st.school_id == null);
    expect(nullSchool.length, 'alunos sem escola não devem vazar para este perfil').toBe(0);
  });

  it('alunos com join em schools: distrito sempre COCAL', async () => {
    const { data, error } = await client
      .from('students')
      .select('id, schools(district)')
      .limit(500);

    if (error) {
      throw new Error(
        `Select com embed schools falhou (ajuste FK/embed se necessário): ${error.message}`
      );
    }
    const rows = data ?? [];
    if (rows.length === 0) return;

    for (const row of rows as { id: string; schools: { district: string } | { district: string }[] | null }[]) {
      const sch = row.schools;
      const d = Array.isArray(sch) ? sch[0]?.district : sch?.district;
      expect(normDistrict(d)).toBe('COCAL');
    }
  });

  it('agendamentos: apenas unidade Cocal ou aluno de escola Cocal (política V27)', async () => {
    const appointments = await fetchAllPages<{
      id: string;
      unit: string | null;
      excluido: boolean | null;
      student_id: string | null;
      students:
        | { school_id: string | null; schools: { district: string | null } | { district: string | null }[] | null }
        | { school_id: string | null; schools: { district: string | null } | { district: string | null }[] | null }[]
        | null;
    }>(async (from, to) =>
      client
        .from('appointments')
        .select('id,unit,excluido,student_id,students(school_id,schools(district))')
        .order('id', { ascending: true })
        .range(from, to)
    );

    for (const a of appointments) {
      expect(a.excluido, 'agendamentos excluídos não devem ser listados').not.toBe(true);

      const u = normUnit(a.unit);
      if (u === 'COCAL') continue;

      expect(a.student_id, 'fora unit Cocal, deve haver aluno para encaixe regional').not.toBeNull();
      const st = a.students;
      const studentRow = Array.isArray(st) ? st[0] : st;
      const sch = studentRow?.schools;
      const district = Array.isArray(sch) ? sch[0]?.district : sch?.district;
      expect(normDistrict(district)).toBe('COCAL');
    }
  });

  it('profissionais de apoio: apenas vínculos a escolas da região Cocal', async () => {
    const schools = await fetchAllPages<{ id: string; district: string | null }>(
      async (from, to) =>
        client.from('schools').select('id,district').order('id', { ascending: true }).range(from, to)
    );
    const allowed = new Set(
      schools.filter((s) => normDistrict(s.district) === 'COCAL').map((s) => s.id)
    );

    const pros = await fetchAllPages<{ id: string; school_id: string | null }>(
      async (from, to) =>
        client
          .from('support_professionals')
          .select('id,school_id')
          .order('id', { ascending: true })
          .range(from, to)
    );

    const leak = pros.filter((p) => p.school_id == null || !allowed.has(p.school_id));
    expect(leak, 'Nenhum profissional de apoio fora das escolas Cocal visíveis').toEqual([]);
  });

  it('bloqueio opcional: escola SEDE por UUID não retorna linha', async () => {
    if (!SEDE_SCHOOL_ID) return;

    const { data, error } = await client.from('schools').select('id,district').eq('id', SEDE_SCHOOL_ID).maybeSingle();

    expect(error).toBeNull();
    expect(data, 'Recepcionista Cocal não deve ler escola SEDE por id').toBeNull();
  });

  it('bloqueio opcional: aluno SEDE por UUID não retorna linha', async () => {
    if (!SEDE_STUDENT_ID) return;

    const { data, error } = await client.from('students').select('id').eq('id', SEDE_STUDENT_ID).maybeSingle();

    expect(error).toBeNull();
    expect(data, 'Recepcionista Cocal não deve ler aluno de outra região por id').toBeNull();
  });
});

describe('RLS — recepcionista (Cocal) — credenciais ausentes', () => {
  it('documenta skip quando env não está configurado', () => {
    if (hasRecepCredentials) {
      expect(true).toBe(true);
      return;
    }
    expect(
      hasRecepCredentials,
      'Defina VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, RLS_TEST_RECEPCIONISTA_COCAL_EMAIL e RLS_TEST_RECEPCIONISTA_COCAL_PASSWORD para executar os testes de integração RLS.'
    ).toBe(false);
  });
});

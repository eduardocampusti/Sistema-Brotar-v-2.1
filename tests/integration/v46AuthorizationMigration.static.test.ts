import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'db/migrations/V46_server_controlled_profile_authorization.sql'
);
const sql = readFileSync(migrationPath, 'utf8');
const failSafeStart = sql.indexOf('-- Falha de forma segura');
const authorizationDefinitions = sql.slice(0, failSafeStart);

function functionDefinitions(source: string): string[] {
  return source
    .split(/(?=CREATE OR REPLACE FUNCTION)/i)
    .filter((block) => /^CREATE OR REPLACE FUNCTION/i.test(block))
    .map((block) => block.slice(0, block.indexOf('$$;') + 3));
}

describe('V46 — autorização controlada pelo servidor', () => {
  it('é transacional e valida a linha de base antes de alterar objetos', () => {
    expect(sql).toMatch(/^-- V46[\s\S]*?\nBEGIN;/);
    expect(sql).toContain("to_regclass(required.relation_name) IS NULL");
    expect(sql).toContain("to_regprocedure('auth.uid()')");
    expect(sql).toContain("to_regprocedure('auth.role()')");
    expect(sql).toContain("to_regprocedure('public.prontuario_status_agendamento_vinculo()')");
    expect(sql).toMatch(/\nCOMMIT;\s*\n/);
    expect((sql.match(/\$\$/g) ?? []).length % 2).toBe(0);
  });

  it('não usa metadata editável nas definições de autorização', () => {
    expect(failSafeStart).toBeGreaterThan(0);
    expect(authorizationDefinitions).not.toMatch(/auth\.jwt\s*\(/i);
    expect(authorizationDefinitions).not.toMatch(/user_metadata/i);
    expect(sql).toContain("pg_get_functiondef(proc.oid) ILIKE '%user_metadata%'");
  });

  it('obtém papel, escopo, escola e especialidade somente de profiles', () => {
    expect(sql).toMatch(/FROM public\.profiles p\s+WHERE p\.id = auth\.uid\(\)/g);
    expect(sql).toContain('private.profile_is_authorizable(p)');
    expect(sql).toContain('p.role::text');
    expect(sql).toContain('p.scope::text');
    expect(sql).toContain('p.school_id');
    expect(sql).toContain('p.specialty::text');
  });

  it('nega perfil inexistente, inativo, suspenso ou com papel desconhecido', () => {
    expect(sql).toContain('p_profile.is_active IS TRUE');
    expect(sql).toContain("'INACTIVE', 'INATIVO', 'SUSPENDED', 'SUSPENSO', 'BLOCKED', 'BLOQUEADO'");
    expect(sql).toContain("to_jsonb(p_profile) ->> 'account_status'");
    expect(sql).toContain("to_jsonb(p_profile) ->> 'is_suspended'");
    expect(sql).toMatch(/p\.role::text[\s\S]*?IN \([\s\S]*?'ADMIN'[\s\S]*?'SPECIALIST'/);
  });

  it('protege role, status e todos os identificadores de escopo contra autoalteração', () => {
    for (const column of [
      'role',
      'is_active',
      'status',
      'scope',
      'district',
      'school_id',
      'school_inep',
      'tenant_id',
      'clinic_id',
      'unit_id',
      'organization_id',
      'regional_id',
      'specialty',
    ]) {
      expect(sql).toContain(`'${column}'`);
    }
    expect(sql).toContain("private.current_profile_role() IS DISTINCT FROM 'ADMIN'");
    expect(sql).toContain("ERRCODE = '42501'");
    expect(sql).toContain('protect_profile_authorization_columns_v46');
  });

  it('limita recepção à própria escola, unidade ou distrito', () => {
    expect(sql).toContain("WHEN private.current_profile_role() = 'SECRETARIA_COCAL' THEN 'COCAL'");
    expect(sql).toContain("WHEN private.current_profile_role() = 'SECRETARIA_SEDE' THEN 'SEDE'");
    expect(sql).toContain('upper(trim(coalesce(sch.district, \'\'))) = public.regional_district_cap()');
    expect(sql).toContain('upper(trim(coalesce(p_unit, \'\'))) = public.regional_district_cap()');
    expect(sql).toContain('private.current_profile_school_id() IS NOT DISTINCT FROM p_school_id');
  });

  it('limita o especialista ao próprio agendamento e impede troca de atribuição', () => {
    expect(sql).toContain('apt.professional_id = auth.uid()');
    expect(sql).toContain("private.current_profile_role() = 'SPECIALIST'");
    expect(sql).toContain("upper(trim(coalesce(apt.specialty::text, ''))) = private.current_profile_specialty()");
    expect(sql).not.toMatch(/CREATE POLICY appointments_specialist_insert_v46/i);
    expect(sql).toContain('NEW.professional_id IS DISTINCT FROM OLD.professional_id');
    expect(sql).toContain('NEW.student_id IS DISTINCT FROM OLD.student_id');
    expect(sql).toContain('protect_appointment_assignment_columns_v46');
  });

  it('preserva o caminho interno da service role sem conceder autorização ao cliente', () => {
    expect(sql).toContain("auth.role() = 'authenticated'");
    expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role');
    expect(sql).toContain('TO authenticated, service_role');
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION private\.protect_[^(]+\(\) TO authenticated/i);
  });

  it('fixa search_path e revoga PUBLIC em todas as funções SECURITY DEFINER', () => {
    const definitions = functionDefinitions(sql);
    const securityDefiners = definitions.filter((definition) => /SECURITY DEFINER/i.test(definition));

    expect(securityDefiners.length).toBeGreaterThan(0);
    for (const definition of securityDefiners) {
      expect(definition).toMatch(/SET search_path = pg_catalog/i);
      expect(definition).not.toMatch(/SET search_path = pg_catalog\s*,/i);
    }

    expect(sql).toContain('REVOKE ALL ON FUNCTION private.current_profile_role() FROM PUBLIC');
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.can_select_student(uuid) FROM PUBLIC');
    expect(sql).toContain("owner_role.rolname IN ('anon', 'authenticated', 'service_role')");
  });

  it('remove policies permissivas conhecidas e falha se alguma sobreviver', () => {
    for (const policy of [
      'admin_all_students',
      'admin_all_professionals',
      'appointments_read_all_v15',
      'appointments_staff_all_v15',
      'appointments_specialist_insert_v23',
      'read_own_vinculo_v18',
      'audit_logs_insert_authenticated',
      'nutrition_assessments_select',
    ]) {
      expect(sql).toContain(`DROP POLICY IF EXISTS ${policy}`);
      expect(sql).toContain(`'${policy}'`);
    }
    expect(sql).toContain("policy irrestrita (true) ainda está ativa em tabela protegida");
  });
});

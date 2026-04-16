/**
 * Mapeamento exclusivo: cadastro principal do aluno → campos básicos da anamnese v3 (Psicopedagogia).
 * Não reutilizar para outras especialidades.
 */

import type { Guardian, Student } from '@/types';
import { hasPPAnamnesisV3PartialShape, mergePsychopedagogyAnamnesisV3 } from './mergeAndMigrate';
import type {
  PPAnamnesisV3,
  PPAnamnesisV3Identificacao,
  PPAnamnesisV3Responsaveis,
  PpCadastroAlunoSyncMeta,
  PpTipoGuarda,
} from './model';
import { createInitialPPAnamnesisV3, isPPAnamnesisV3 } from './model';

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

/** Idade em anos completos a partir de ISO date (YYYY-MM-DD). */
export function ppAgeYearsFromBirthDate(iso: string): string {
  if (!iso) return '';
  const birth = new Date(iso);
  if (Number.isNaN(birth.getTime())) return '';
  const t = new Date();
  let a = t.getFullYear() - birth.getFullYear();
  const m = t.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < birth.getDate())) a--;
  return a >= 0 ? String(a) : '';
}

function readClinicalExtra(student: Student, key: string): string {
  const c = student.clinical as unknown as Record<string, unknown> | undefined;
  if (!c || typeof c !== 'object') return '';
  return str(c[key]);
}

function normalizeNameKey(n: string): string {
  return n
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function guardianMatchesName(g: Guardian | undefined, name: string | undefined): boolean {
  if (!g || !isNonEmptyString(name)) return false;
  return normalizeNameKey(g.name) === normalizeNameKey(name);
}

function findGuardianForParent(
  guardians: Guardian[] | undefined,
  parentName: string | undefined,
  keywords: string[]
): Guardian | undefined {
  if (!guardians?.length) return undefined;
  if (parentName) {
    const byName = guardians.find((x) => guardianMatchesName(x, parentName));
    if (byName) return byName;
  }
  const rel = (r: string) => r.toLowerCase();
  return guardians.find((g) => {
    const r = rel(g.relationship || '');
    return keywords.some((k) => r.includes(k));
  });
}

const GUARDA_VALUES = new Set<PpTipoGuarda>([
  '',
  'unilateral',
  'compartilhada',
  'alternada',
  'provisoria',
  'definitiva',
]);

function mapCadastroTipoGuarda(raw: string): PpTipoGuarda {
  const s = raw.toLowerCase().trim();
  if (!s) return '';
  const direct = s as PpTipoGuarda;
  if (GUARDA_VALUES.has(direct)) return direct;
  if (s.includes('unilateral')) return 'unilateral';
  if (s.includes('compartilh')) return 'compartilhada';
  if (s.includes('alternad')) return 'alternada';
  if (s.includes('provis')) return 'provisoria';
  if (s.includes('definit')) return 'definitiva';
  return '';
}

function buildEnderecoLinha(student: Student): string {
  const a = student.address;
  if (!a) return '';
  const parts = [a.street, a.number].filter((x) => str(x));
  const line = parts.join(', ');
  const comp = str((a as { complement?: string }).complement);
  if (comp) return [line, comp].filter(Boolean).join(' — ');
  return line;
}

function buildCidadeUf(student: Student): string {
  const a = student.address;
  if (!a) return '';
  const city = str(a.city);
  const st = str(a.state);
  if (city && st) return `${city} / ${st}`;
  return city || st;
}

function buildComposicaoFamiliarText(student: Student): string {
  const g = student.guardians?.filter((x) => isNonEmptyString(x.name)) || [];
  if (!g.length) return '';
  const lines = g.map((x) => {
    const rel = str(x.relationship);
    return rel ? `${x.name.trim()} (${rel})` : x.name.trim();
  });
  return `Composição familiar (cadastro do aluno): ${lines.join('; ')}`;
}

function inferEstuda(student: Student): boolean {
  const sn = str(student.school?.schoolName);
  const gr = str(student.school?.grade);
  if (!sn || sn.toLowerCase() === 'não vinculada') return gr.length > 0;
  return sn.length > 0 || gr.length > 0;
}

/**
 * Indica se já existe ficha de anamnese persistida em `pp_data` (qualquer versão / parcial v3).
 * Ausência ou objeto vazio ⇒ primeira abertura para efeito de pré-preenchimento automático.
 */
export function hasPersistedPsychopedagogyAnamnesisPpData(ppDataRaw: Record<string, unknown> | null | undefined): boolean {
  const raw = ppDataRaw?.anamnesis;
  if (raw === null || raw === undefined) return false;
  if (typeof raw !== 'object' || Array.isArray(raw)) return false;
  const keys = Object.keys(raw as object);
  if (keys.length === 0) return false;
  return true;
}

function pickMaeGuardian(student: Student): Guardian | undefined {
  return findGuardianForParent(student.guardians, student.motherName, ['mãe', 'mae', 'genitora']);
}

function pickPaiGuardian(student: Student): Guardian | undefined {
  return findGuardianForParent(student.guardians, student.fatherName, ['pai', 'genitor']);
}

/**
 * Extrai apenas campos básicos permitidos (identificação parcial + responsáveis parcial).
 */
export function mapStudentRegistrationToPsychopedagogyAnamnesisInitialData(student: Student): {
  identificacaoCrianca: Partial<PPAnamnesisV3Identificacao>;
  responsaveisContextoFamiliar: Partial<PPAnamnesisV3Responsaveis>;
} {
  const addr = student.address || ({} as Student['address']);
  const naturalidade = str(student.birthPlace) || str(student.nationality);
  const apelido =
    readClinicalExtra(student, 'apelido') ||
    readClinicalExtra(student, 'nickName') ||
    readClinicalExtra(student, 'nickname');

  const maeG = pickMaeGuardian(student);
  const paiG = pickPaiGuardian(student);

  const nomeMae = str(student.motherName) || str(maeG?.name);
  const nomePai = str(student.fatherName) || str(paiG?.name);

  const telefoneMae = str(maeG?.phone);
  const telefonePai = str(paiG?.phone);

  const profissaoMae = str(maeG?.occupation);
  const profissaoPai = str(paiG?.occupation);

  const dataNascimentoMae =
    readClinicalExtra(student, 'motherBirthDate') || readClinicalExtra(student, 'dataNascimentoMae');
  const dataNascimentoPai =
    readClinicalExtra(student, 'fatherBirthDate') || readClinicalExtra(student, 'dataNascimentoPai');

  const tipoGuardaRaw =
    readClinicalExtra(student, 'tipoGuarda') ||
    str((student.socialInfo as unknown as Record<string, unknown> | undefined)?.tipoGuarda);
  const tipoGuarda = mapCadastroTipoGuarda(tipoGuardaRaw);

  const composicao = buildComposicaoFamiliarText(student);
  const principal = student.guardians?.find((g) => isNonEmptyString(g.name));
  const linhaResponsavel =
    principal && isNonEmptyString(principal.name)
      ? `Responsável principal no cadastro: ${principal.name.trim()}${principal.relationship ? ` (${principal.relationship.trim()})` : ''}`
      : '';

  const schoolName = str(student.school?.schoolName);
  const escola =
    schoolName && schoolName.toLowerCase() !== 'não vinculada' ? schoolName : '';

  const identificacaoCrianca: Partial<PPAnamnesisV3Identificacao> = {
    nome: str(student.fullName),
    dataNascimento: str(student.birthDate),
    idade: ppAgeYearsFromBirthDate(str(student.birthDate)),
    sexo: str(student.gender),
    naturalidade,
    apelido,
    endereco: buildEnderecoLinha(student),
    cep: str(addr.zipCode),
    bairro: str(addr.district),
    cidadeUf: buildCidadeUf(student),
    estuda: inferEstuda(student),
    escola,
    turma: str(student.school?.grade),
    turno: str(student.school?.shift),
  };

  const responsaveisContextoFamiliar: Partial<PPAnamnesisV3Responsaveis> = {
    nomeMae,
    nomePai,
    dataNascimentoMae,
    dataNascimentoPai,
    telefoneMae,
    telefonePai,
    profissaoMae,
    profissaoPai,
    ...(tipoGuarda ? { tipoGuarda } : {}),
    ...(composicao ? { novaEstruturaFamiliar: composicao } : {}),
    ...(linhaResponsavel ? { comQuemPassaMaisTempo: linhaResponsavel } : {}),
  };

  return { identificacaoCrianca, responsaveisContextoFamiliar };
}

function isIdentFieldEmpty(key: keyof PPAnamnesisV3Identificacao, val: unknown): boolean {
  if (key === 'estuda') return false;
  if (key === 'alergico' || key === 'usaMedicacao') return false;
  if (typeof val === 'boolean') return false;
  if (typeof val === 'string') return !isNonEmptyString(val);
  return val === '' || val === null || val === undefined;
}

function isRespFieldEmpty(key: keyof PPAnamnesisV3Responsaveis, val: unknown): boolean {
  if (typeof val === 'string') return !isNonEmptyString(val);
  if (val === null) return true;
  return false;
}

const SYNC_IDENT_KEYS = [
  'nome',
  'dataNascimento',
  'idade',
  'sexo',
  'naturalidade',
  'apelido',
  'endereco',
  'cep',
  'bairro',
  'cidadeUf',
  'estuda',
  'escola',
  'turma',
  'turno',
] as const satisfies readonly (keyof PPAnamnesisV3Identificacao)[];

const SYNC_RESP_KEYS = [
  'nomeMae',
  'dataNascimentoMae',
  'telefoneMae',
  'profissaoMae',
  'nomePai',
  'dataNascimentoPai',
  'telefonePai',
  'profissaoPai',
  'tipoGuarda',
  'novaEstruturaFamiliar',
  'comQuemPassaMaisTempo',
] as const satisfies readonly (keyof PPAnamnesisV3Responsaveis)[];

function stampSyncMeta(
  prev: PpCadastroAlunoSyncMeta | undefined,
  mode: PpCadastroSyncMode
): PpCadastroAlunoSyncMeta {
  const iso = new Date().toISOString();
  if (mode === 'initialAuto') {
    return { ...prev, lastAutoHydrateAt: iso };
  }
  return { ...prev, lastManualSyncAt: iso };
}

export type PpCadastroSyncMode = 'initialAuto' | 'manualFillEmpty' | 'manualOverwriteBasics';

/**
 * Aplica dados do cadastro à ficha v3 apenas nos campos básicos mapeados.
 * Nunca altera queixa, contexto escolar (texto clínico), comunicação, comportamento, etc.
 */
export function mergePsychopedagogyAnamnesisV3WithStudentCadastro(
  current: PPAnamnesisV3,
  student: Student,
  mode: PpCadastroSyncMode
): PPAnamnesisV3 {
  const mapped = mapStudentRegistrationToPsychopedagogyAnamnesisInitialData(student);
  const out: PPAnamnesisV3 = JSON.parse(JSON.stringify(current)) as PPAnamnesisV3;
  const identOut = out.identificacaoCrianca as unknown as Record<string, unknown>;
  const respOut = out.responsaveisContextoFamiliar as unknown as Record<string, unknown>;

  const applyIdentValue = (key: keyof PPAnamnesisV3Identificacao, regVal: unknown) => {
    const curVal = out.identificacaoCrianca[key];
    if (key === 'estuda') {
      const nextEstuda = inferEstuda(student);
      if (mode === 'initialAuto' || mode === 'manualOverwriteBasics') {
        out.identificacaoCrianca.estuda = nextEstuda;
      } else if (mode === 'manualFillEmpty' && nextEstuda && curVal === false) {
        out.identificacaoCrianca.estuda = true;
      }
      return;
    }
    const regStr = str(regVal);
    if (mode === 'manualOverwriteBasics' || mode === 'initialAuto') {
      if (isNonEmptyString(regStr)) {
        identOut[key as string] = regStr;
      }
      return;
    }
    if (mode === 'manualFillEmpty') {
      if (isIdentFieldEmpty(key, curVal) && isNonEmptyString(regStr)) {
        identOut[key as string] = regStr;
      }
    }
  };

  const applyRespValue = (key: keyof PPAnamnesisV3Responsaveis, regVal: unknown) => {
    const curVal = out.responsaveisContextoFamiliar[key];
    const regS = str(regVal);
    if (key === 'tipoGuarda') {
      const tg = mapCadastroTipoGuarda(regS);
      if (mode === 'initialAuto' || mode === 'manualOverwriteBasics') {
        if (tg) respOut[key as string] = tg;
        return;
      }
      if (mode === 'manualFillEmpty' && tg && !str(curVal as string)) {
        respOut[key as string] = tg;
      }
      return;
    }
    if (mode === 'manualOverwriteBasics' || mode === 'initialAuto') {
      if (isNonEmptyString(regS)) respOut[key as string] = regS;
      return;
    }
    if (mode === 'manualFillEmpty') {
      if (isRespFieldEmpty(key, curVal) && isNonEmptyString(regS)) {
        respOut[key as string] = regS;
      }
    }
  };

  for (const key of SYNC_IDENT_KEYS) {
    applyIdentValue(key, mapped.identificacaoCrianca[key]);
  }

  for (const key of SYNC_RESP_KEYS) {
    applyRespValue(key, mapped.responsaveisContextoFamiliar[key]);
  }

  out.cadastroAlunoSync = stampSyncMeta(out.cadastroAlunoSync, mode);
  return out;
}

/**
 * Usado em testes ou criação explícita: v3 limpa + snapshot do cadastro.
 */
export function buildInitialPsychopedagogyAnamnesisV3FromStudent(student: Student): PPAnamnesisV3 {
  const base = createInitialPPAnamnesisV3();
  return mergePsychopedagogyAnamnesisV3WithStudentCadastro(base, student, 'initialAuto');
}

/** Quando o fluxo de `extractPPData` cai em v3 “em branco” sem persistência, hidrata a partir do cadastro. */
export function hydratePsychopedagogyAnamnesisV3IfNoPersistedJson(
  student: Student,
  anamnesisData: unknown,
  rawPpBlock: Record<string, unknown> | null | undefined
): unknown {
  if (hasPersistedPsychopedagogyAnamnesisPpData(rawPpBlock)) {
    return anamnesisData;
  }
  if (isPPAnamnesisV3(anamnesisData)) {
    return mergePsychopedagogyAnamnesisV3WithStudentCadastro(anamnesisData, student, 'initialAuto');
  }
  if (hasPPAnamnesisV3PartialShape(anamnesisData)) {
    const merged = mergePsychopedagogyAnamnesisV3(createInitialPPAnamnesisV3(), anamnesisData);
    return mergePsychopedagogyAnamnesisV3WithStudentCadastro(merged, student, 'initialAuto');
  }
  return anamnesisData;
}

/**
 * Módulo isolado: anamnese psicopedagógica v3.
 *
 * --- FASE 1 — DESCOBERTA / RESUMO TÉCNICO (escopo restrito) ---
 * Onde a psicopedagogia é tratada hoje:
 * - Rotas: `src/App.tsx` → `/app/psychopedagogy`, `/app/psychopedagogy/new-session`.
 * - Página: `PsychopedagogyDashboardPage` / `PsychopedagogySessionFormPage` exportadas de
 *   `components/ClinicalPages.tsx` (const interna `PsychopedagogySpecificDashboard`).
 * - Formulário v3: `PPAnamnesisV3Form.tsx` (seções + sidebar); v2/v1 só nesse dashboard, via `schemaVersion`.
 * - Persistência: `students.clinical.pp_data` (JSON) — `diagnosis`, `anamnesis`, `ipoHistory`, etc.
 *   Nenhuma tabela nova dedicada; RLS de `students` existente é a barreira de acesso.
 * - Serviço: `SupabaseService.saveStudent` / `getStudentById` (mesmo pipeline dos demais perfis).
 * - Políticas: não alteradas por este módulo (ver migrações `db/migrations/V*` em `students`).
 *
 * Por que é seguro para os outros profissionais:
 * - Imports de `PPAnamnesisV3Form` / tipos v3 ocorrem apenas em `ClinicalPages.tsx` dentro do fluxo cuja
 *   especialidade é `Specialty.PSYCHOPEDAGOGY` (ou admin no mesmo componente já existente).
 * - Não há uso deste pacote em psicologia, fono, TO, serviço social ou dashboards genéricos.
 *
 * Rollback: reverter commit; dados v3 em JSON continuam legíveis; para UI v2, migrar registro com botão
 * inverso não existe — usar backup ou editar `schemaVersion` com extremo cuidado (avançado).
 */

export {
  createInitialPPAnamnesisV3,
  isPPAnamnesisV3,
  PP_ANAMNESIS_V3_TEMPLATE_ID,
  DIFICULDADES_COMUNICACAO_ORAL_IDS,
  PERFIL_COMPORTAMENTAL_IDS,
  HISTORICO_SAUDE_CHECKBOX_IDS,
} from './model';
export type {
  PPAnamnesisV3,
  PPAnamnesisV3Identificacao,
  PpCadastroAlunoSyncMeta,
  DificuldadeComunicacaoOralId,
  PerfilComportamentalId,
  HistoricoSaudeCheckboxId,
} from './model';

export {
  mergePsychopedagogyAnamnesisV3,
  migratePPAnamnesisV1ToV3,
  migratePPAnamnesisV2ToV3,
  coercePsychopedagogyAnamnesisFromStorage,
  looksLikePPAnamnesisV1Plain,
  hasPPAnamnesisV3PartialShape,
} from './mergeAndMigrate';

export { buildPPAnamnesisV3PrintHtml } from './printHtml';
export { PPAnamnesisV3Form } from './PPAnamnesisV3Form';
export type { PPAnamnesisV3SectionId } from './PPAnamnesisV3Form';

export {
  buildInitialPsychopedagogyAnamnesisV3FromStudent,
  hasPersistedPsychopedagogyAnamnesisPpData,
  hydratePsychopedagogyAnamnesisV3IfNoPersistedJson,
  mapStudentRegistrationToPsychopedagogyAnamnesisInitialData,
  mergePsychopedagogyAnamnesisV3WithStudentCadastro,
  ppAgeYearsFromBirthDate,
} from './mapStudentRegistrationToPPAnamnesis';
export type { PpCadastroSyncMode } from './mapStudentRegistrationToPPAnamnesis';

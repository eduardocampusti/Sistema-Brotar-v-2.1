import { describe, expect, it } from 'vitest';
import {
  buildInitialPsychopedagogyAnamnesisV3FromStudent,
  createInitialPPAnamnesisV3,
  hasPersistedPsychopedagogyAnamnesisPpData,
  hasPPAnamnesisV3PartialShape,
  hydratePsychopedagogyAnamnesisV3IfNoPersistedJson,
  isPPAnamnesisV3,
  looksLikePPAnamnesisV1Plain,
  mergePsychopedagogyAnamnesisV3WithStudentCadastro,
} from '@/src/features/psychopedagogy/anamnesisV3';
import { mergePsychopedagogyAnamnesisV3, migratePPAnamnesisV1ToV3 } from '@/src/features/psychopedagogy/anamnesisV3';
import type { Student } from '@/types';
import { Gender } from '@/types';

describe('anamnese psicopedagogia v3', () => {
  it('createInitial tem schema 3 e template fixo', () => {
    const a = createInitialPPAnamnesisV3();
    expect(a.schemaVersion).toBe('3');
    expect(isPPAnamnesisV3(a)).toBe(true);
  });

  it('merge preserva schemaVersion 3 e mescla campos', () => {
    const base = createInitialPPAnamnesisV3();
    const merged = mergePsychopedagogyAnamnesisV3(base, {
      ...base,
      queixaHistorico: { ...base.queixaHistorico, queixaPrincipal: 'Teste' },
    });
    expect(merged.queixaHistorico.queixaPrincipal).toBe('Teste');
    expect(merged.schemaVersion).toBe('3');
  });

  it('migração V1 gera v3 com legacy', () => {
    const v3 = migratePPAnamnesisV1ToV3({
      historicoEscolar: 'Escola X',
      sono: 'Dorme mal',
    });
    expect(v3.schemaVersion).toBe('3');
    expect(v3.legacy?.v1Snapshot?.historicoEscolar).toBe('Escola X');
  });

  it('looksLikePPAnamnesisV1Plain: objeto vazio não é V1', () => {
    expect(looksLikePPAnamnesisV1Plain({})).toBe(false);
    expect(looksLikePPAnamnesisV1Plain({ historicoEscolar: '   ' })).toBe(false);
  });

  it('looksLikePPAnamnesisV1Plain: texto típico é V1', () => {
    expect(looksLikePPAnamnesisV1Plain({ historicoEscolar: 'x' })).toBe(true);
  });

  it('hasPPAnamnesisV3PartialShape detecta bloco v3 sem schemaVersion', () => {
    expect(hasPPAnamnesisV3PartialShape({ identificacaoCrianca: { nome: 'Ana' } })).toBe(true);
    expect(hasPPAnamnesisV3PartialShape({ foo: 1 })).toBe(false);
  });

  it('hasPersistedPsychopedagogyAnamnesisPpData: sem anamnese ou vazio ⇒ false', () => {
    expect(hasPersistedPsychopedagogyAnamnesisPpData(undefined)).toBe(false);
    expect(hasPersistedPsychopedagogyAnamnesisPpData({})).toBe(false);
    expect(hasPersistedPsychopedagogyAnamnesisPpData({ anamnesis: undefined })).toBe(false);
    expect(hasPersistedPsychopedagogyAnamnesisPpData({ anamnesis: {} })).toBe(false);
    expect(hasPersistedPsychopedagogyAnamnesisPpData({ anamnesis: { schemaVersion: '3', identificacaoCrianca: { nome: 'x' } } })).toBe(true);
  });

  it('hidrate ficha nova a partir do cadastro; persistida não altera', () => {
    const baseStudent: Student = {
      id: '1',
      fullName: 'Aluno Teste',
      birthDate: '2015-06-10',
      gender: Gender.MALE,
      cpf: '',
      susCard: '',
      motherName: 'Maria',
      fatherName: 'José',
      address: { street: 'Rua A', number: '10', district: 'Centro', city: 'Curitiba', state: 'PR', zipCode: '80000000' },
      guardians: [{ name: 'Maria', relationship: 'Mãe', phone: '41999999999', email: '', occupation: 'Professora' }],
      clinical: { diagnosis: '', medications: '', allergies: '', specialNeeds: [], therapiesHistory: '' },
      school: { schoolName: 'Escola Central', grade: '3º A', shift: 'Manhã', hasSpecialAide: false, difficulties: '' },
      documents: [],
      history: [],
      status: 'Active',
      createdAt: new Date().toISOString(),
    };

    const v3Fresh = createInitialPPAnamnesisV3();
    const hydrated = hydratePsychopedagogyAnamnesisV3IfNoPersistedJson(baseStudent, v3Fresh, {}) as ReturnType<typeof createInitialPPAnamnesisV3>;
    expect(hydrated.identificacaoCrianca.nome).toBe('Aluno Teste');
    expect(hydrated.identificacaoCrianca.escola).toBe('Escola Central');
    expect(hydrated.responsaveisContextoFamiliar.nomeMae).toBe('Maria');
    expect(hydrated.queixaHistorico.queixaPrincipal).toBe('');

    const fromHelper = buildInitialPsychopedagogyAnamnesisV3FromStudent(baseStudent);
    expect(fromHelper.identificacaoCrianca.turma).toBe('3º A');

    const persisted = hydratePsychopedagogyAnamnesisV3IfNoPersistedJson(
      baseStudent,
      { ...v3Fresh, identificacaoCrianca: { ...v3Fresh.identificacaoCrianca, nome: 'Salvo' } },
      { anamnesis: { schemaVersion: '3', identificacaoCrianca: { nome: 'Salvo' } } }
    ) as ReturnType<typeof createInitialPPAnamnesisV3>;
    expect(persisted.identificacaoCrianca.nome).toBe('Salvo');
  });

  it('sincronização manual fillEmpty não apaga texto existente; overwrite altera básicos, não a queixa', () => {
    const student: Student = {
      id: '1',
      fullName: 'Novo Nome Cadastro',
      birthDate: '2014-01-01',
      gender: Gender.FEMALE,
      cpf: '',
      susCard: '',
      address: { street: 'X', number: '1', district: 'B', city: 'C', state: 'D', zipCode: '1' },
      guardians: [],
      clinical: { diagnosis: '', medications: '', allergies: '', specialNeeds: [], therapiesHistory: '' },
      school: { schoolName: 'E1', grade: '1', hasSpecialAide: false, difficulties: '' },
      documents: [],
      history: [],
      status: 'Active',
      createdAt: '',
    };
    const ficha = createInitialPPAnamnesisV3();
    ficha.identificacaoCrianca.nome = 'Nome Na Ficha';
    ficha.queixaHistorico.queixaPrincipal = 'Queixa clínica';

    const filled = mergePsychopedagogyAnamnesisV3WithStudentCadastro(ficha, student, 'manualFillEmpty');
    expect(filled.identificacaoCrianca.nome).toBe('Nome Na Ficha');
    expect(filled.identificacaoCrianca.escola).toBe('E1');
    expect(filled.queixaHistorico.queixaPrincipal).toBe('Queixa clínica');

    const over = mergePsychopedagogyAnamnesisV3WithStudentCadastro(filled, student, 'manualOverwriteBasics');
    expect(over.identificacaoCrianca.nome).toBe('Novo Nome Cadastro');
    expect(over.queixaHistorico.queixaPrincipal).toBe('Queixa clínica');
  });
});

import {
  createInitialPPAnamnesisV3,
  isPPAnamnesisV3,
  PP_ANAMNESIS_V3_TEMPLATE_ID,
  type PPAnamnesisV1Snapshot,
  type PPAnamnesisV3,
} from './model';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Campos texto da ficha legada V1 (ClinicalPages `PPAnamnesisForm`). */
const PP_V1_TEXT_FIELD_KEYS = [
  'historicoGestacional',
  'historicoEscolar',
  'rotinaEstudos',
  'sono',
  'alimentacaoSaude',
  'emocionalComportamental',
  'psicossexual',
  'relacaoFamiliaEscola',
  'observacoesGerais',
] as const;

/**
 * Objeto sem `schemaVersion` mas com conteúdo típico da V1 (texto livre).
 * Evita tratar `{}` ou lixo como V1 e quebrar a aba de anamnese.
 */
export function looksLikePPAnamnesisV1Plain(stored: unknown): boolean {
  if (!isPlainObject(stored)) return false;
  const sv = stored.schemaVersion;
  if (sv === '2' || sv === '3' || sv === 2 || sv === 3) return false;
  if (sv !== undefined && sv !== null && sv !== '') return false;
  return PP_V1_TEXT_FIELD_KEYS.some((k) => {
    const v = stored[k];
    return typeof v === 'string' && v.trim().length > 0;
  });
}

/** Indica JSON parcial da v3 (ex.: registro antigo sem schemaVersion por bug). */
export function hasPPAnamnesisV3PartialShape(stored: unknown): boolean {
  if (!isPlainObject(stored)) return false;
  if (stored.templateId === PP_ANAMNESIS_V3_TEMPLATE_ID) return true;
  if (stored.schemaVersion === '3' || stored.schemaVersion === 3) return true;
  return (
    isPlainObject(stored.identificacaoCrianca) ||
    isPlainObject(stored.queixaHistorico) ||
    isPlainObject(stored.responsaveisContextoFamiliar)
  );
}

/** Mescla recursiva: listas e escalares do patch sobrescrevem; objetos aninhados são mesclados. */
export function mergePsychopedagogyAnamnesisV3(
  base: PPAnamnesisV3,
  stored: unknown
): PPAnamnesisV3 {
  if (!isPlainObject(stored)) return base;
  const out: PPAnamnesisV3 = JSON.parse(JSON.stringify(base)) as PPAnamnesisV3;
  const walk = (target: Record<string, unknown>, src: Record<string, unknown>) => {
    for (const key of Object.keys(src)) {
      const sv = src[key];
      const tv = target[key];
      if (sv === undefined) continue;
      if (Array.isArray(sv)) {
        target[key] = sv;
        continue;
      }
      if (isPlainObject(sv) && isPlainObject(tv)) {
        walk(tv, sv);
        continue;
      }
      target[key] = sv;
    }
  };
  walk(out as unknown as Record<string, unknown>, stored as Record<string, unknown>);
  out.schemaVersion = '3';
  return out;
}

export function normalizeStoredPsychopedagogyAnamnesis(stored: unknown): PPAnamnesisV3 | null {
  if (!stored || typeof stored !== 'object') return null;
  const o = stored as Record<string, unknown>;
  if (o.schemaVersion === '3') {
    return mergePsychopedagogyAnamnesisV3(createInitialPPAnamnesisV3(), stored);
  }
  return null;
}

function v1FieldsFromUnknown(v1: unknown): PPAnamnesisV1Snapshot {
  if (!isPlainObject(v1)) return {};
  const g = (k: string) => (typeof v1[k] === 'string' ? (v1[k] as string) : '');
  return {
    historicoGestacional: g('historicoGestacional'),
    historicoEscolar: g('historicoEscolar'),
    rotinaEstudos: g('rotinaEstudos'),
    sono: g('sono'),
    alimentacaoSaude: g('alimentacaoSaude'),
    emocionalComportamental: g('emocionalComportamental'),
    psicossexual: g('psicossexual'),
    relacaoFamiliaEscola: g('relacaoFamiliaEscola'),
    observacoesGerais: g('observacoesGerais'),
  };
}

/** Migração V1 (sem schemaVersion) → V3 com snapshot completo do texto livre. */
export function migratePPAnamnesisV1ToV3(v1: unknown): PPAnamnesisV3 {
  const snap = v1FieldsFromUnknown(v1);
  const base = createInitialPPAnamnesisV3();
  const bloco = [
    snap.historicoGestacional && `Gestacional / desenvolvimento: ${snap.historicoGestacional}`,
    snap.historicoEscolar && `Escolar: ${snap.historicoEscolar}`,
    snap.rotinaEstudos && `Rotina estudos: ${snap.rotinaEstudos}`,
    snap.sono && `Sono: ${snap.sono}`,
    snap.alimentacaoSaude && `Alimentação/saúde: ${snap.alimentacaoSaude}`,
    snap.emocionalComportamental && `Emocional/comportamento: ${snap.emocionalComportamental}`,
    snap.psicossexual && `Psicossexual: ${snap.psicossexual}`,
    snap.relacaoFamiliaEscola && `Família-escola: ${snap.relacaoFamiliaEscola}`,
    snap.observacoesGerais && `Observações: ${snap.observacoesGerais}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  base.queixaHistorico.queixaPrincipal =
    base.queixaHistorico.queixaPrincipal || bloco.slice(0, 4000) || 'Conteúdo migrado da ficha legada (V1).';
  base.gestacaoPartoDesenvolvimento.observacoesGravidez =
    (snap.historicoGestacional || '').slice(0, 2000) || base.gestacaoPartoDesenvolvimento.observacoesGravidez;
  base.contextoEscolarAprendizagem.rotinaEscolar =
    [snap.historicoEscolar, snap.rotinaEstudos].filter(Boolean).join('\n') ||
    base.contextoEscolarAprendizagem.rotinaEscolar;
  base.rotinaSonoHabitos.rotinaDetalhadaSemanaFimSemana =
    snap.sono || base.rotinaSonoHabitos.rotinaDetalhadaSemanaFimSemana;
  base.comportamentoInteracaoRegulacao.observacoesComportamentais =
    snap.emocionalComportamental || base.comportamentoInteracaoRegulacao.observacoesComportamentais;
  base.saudeAcompanhamentos.outroProblemaDescricao =
    snap.alimentacaoSaude || base.saudeAcompanhamentos.outroProblemaDescricao;
  base.fechamento.gostariaAcrescentarAlgo =
    [snap.psicossexual, snap.relacaoFamiliaEscola, snap.observacoesGerais].filter(Boolean).join('\n') ||
    base.fechamento.gostariaAcrescentarAlgo;

  base.legacy = {
    v1Snapshot: snap,
    notasMigracao: `Migrado de V1 em ${new Date().toISOString()}. Campos estruturados foram pré-preenchidos de forma conservadora; revise a ficha.`,
  };
  return base;
}

/** Migração V2 → V3: mapeia campos homólogos e preserva JSON completo da V2. */
export function migratePPAnamnesisV2ToV3(v2: unknown): PPAnamnesisV3 {
  const base = createInitialPPAnamnesisV3();
  if (!isPlainObject(v2)) {
    base.legacy = {
      v2SnapshotJson: JSON.stringify(v2),
      notasMigracao: 'Origem V2 inválida ou vazia; snapshot bruto preservado.',
    };
    return base;
  }

  const q = typeof v2.queixaPrincipal === 'string' ? v2.queixaPrincipal : '';
  base.queixaHistorico.queixaPrincipal = q || base.queixaHistorico.queixaPrincipal;

  const id = v2.identificacao;
  if (isPlainObject(id)) {
    base.identificacaoCrianca.endereco =
      typeof id.endereco === 'string' ? id.endereco : base.identificacaoCrianca.endereco;
    const tel = typeof id.telefones === 'string' ? id.telefones : '';
    base.identificacaoCrianca.contatoEmergencia =
      tel || base.identificacaoCrianca.contatoEmergencia;
    const resp = typeof id.responsavel === 'string' ? id.responsavel : '';
    if (resp) {
      base.responsaveisContextoFamiliar.nomeMae = base.responsaveisContextoFamiliar.nomeMae || resp;
    }
  }

  const comp = v2.composicaoFamiliar;
  if (Array.isArray(comp) && comp.length > 0) {
    const lines = comp
      .map((m: unknown) => {
        if (!isPlainObject(m)) return '';
        const nome = typeof m.nome === 'string' ? m.nome : '';
        const par = typeof m.parentesco === 'string' ? m.parentesco : '';
        const idade = typeof m.idade === 'string' ? m.idade : '';
        const occ = typeof m.ocupacao === 'string' ? m.ocupacao : '';
        return [nome, par, idade, occ].filter(Boolean).join(' — ');
      })
      .filter(Boolean);
    base.responsaveisContextoFamiliar.comQuemPassaMaisTempo =
      lines.join('\n') || base.responsaveisContextoFamiliar.comQuemPassaMaisTempo;
  }

  const sono = v2.sono;
  if (isPlainObject(sono)) {
    const obs = typeof sono.obs === 'string' ? sono.obs : '';
    const hor = typeof sono.horario === 'string' ? sono.horario : '';
    base.rotinaSonoHabitos.rotinaDetalhadaSemanaFimSemana = [hor, obs].filter(Boolean).join('\n');
  }

  const ling = v2.linguagem;
  if (isPlainObject(ling)) {
    base.comunicacaoLinguagemCognitivo.verbal =
      [ling.fala, ling.compreensao, ling.expressao, ling.trocasOuGagueira]
        .map((x) => (typeof x === 'string' ? x : ''))
        .filter(Boolean)
        .join('\n') || base.comunicacaoLinguagemCognitivo.verbal;
    base.comunicacaoLinguagemCognitivo.observacoesComunicacao =
      typeof ling.obs === 'string' ? ling.obs : base.comunicacaoLinguagemCognitivo.observacoesComunicacao;
  }

  const esc = v2.escolaridade;
  if (isPlainObject(esc)) {
    base.contextoEscolarAprendizagem.areasMaiorDificuldade =
      typeof esc.dificuldadesEscola === 'string'
        ? esc.dificuldadesEscola
        : base.contextoEscolarAprendizagem.areasMaiorDificuldade;
    base.contextoEscolarAprendizagem.opiniaoFamiliaSobreEscola =
      typeof esc.relacaoSocialEscolar === 'string'
        ? esc.relacaoSocialEscolar
        : base.contextoEscolarAprendizagem.opiniaoFamiliaSobreEscola;
    base.contextoEscolarAprendizagem.comportamentoLicaoCasa =
      typeof esc.estudoEmCasa === 'string'
        ? esc.estudoEmCasa
        : base.contextoEscolarAprendizagem.comportamentoLicaoCasa;
    const hist = esc.historico;
    if (Array.isArray(hist) && hist.length > 0) {
      base.contextoEscolarAprendizagem.rotinaEscolar = hist
        .map((h: unknown) => {
          if (!isPlainObject(h)) return '';
          const escola = typeof h.escola === 'string' ? h.escola : '';
          const serie = typeof h.serieAno === 'string' ? h.serieAno : '';
          const ano = typeof h.anoLetivo === 'string' ? h.anoLetivo : '';
          return [escola, serie, ano].filter(Boolean).join(' | ');
        })
        .filter(Boolean)
        .join('\n');
    }
  }

  const dp = v2.desenvolvimentoPsicomotor;
  if (isPlainObject(dp)) {
    base.gestacaoPartoDesenvolvimento.engatinhou =
      typeof dp.engatinhou === 'object' && dp.engatinhou !== null && 'valor' in (dp.engatinhou as object)
        ? ((dp.engatinhou as { valor: boolean | null }).valor ?? null)
        : base.gestacaoPartoDesenvolvimento.engatinhou;
    const andou = dp.andou as { valor?: boolean | null; idade?: string } | undefined;
    if (andou && typeof andou.idade === 'string') {
      base.gestacaoPartoDesenvolvimento.andouComQuantosMeses =
        andou.idade || base.gestacaoPartoDesenvolvimento.andouComQuantosMeses;
    }
    base.gestacaoPartoDesenvolvimento.observacoesGravidez =
      typeof dp.obs === 'string'
        ? [base.gestacaoPartoDesenvolvimento.observacoesGravidez, dp.obs].filter(Boolean).join('\n')
        : base.gestacaoPartoDesenvolvimento.observacoesGravidez;
  }

  const compDesc = v2.comportamento;
  if (isPlainObject(compDesc)) {
    base.comportamentoInteracaoRegulacao.observacoesComportamentais =
      [compDesc.descricao, compDesc.obs]
        .map((x) => (typeof x === 'string' ? x : ''))
        .filter(Boolean)
        .join('\n') || base.comportamentoInteracaoRegulacao.observacoesComportamentais;
  }

  const habitos = typeof v2.habitosRotina === 'string' ? v2.habitosRotina : '';
  const rel = typeof v2.relacionamento === 'string' ? v2.relacionamento : '';
  base.rotinaSonoHabitos.tempoTelasPorDia =
    typeof v2.estimulacaoTelas === 'object' && v2.estimulacaoTelas !== null
      ? String((v2.estimulacaoTelas as { tempoDiario?: string }).tempoDiario || '')
      : base.rotinaSonoHabitos.tempoTelasPorDia;
  base.fechamento.gostariaAcrescentarAlgo = [habitos, rel].filter(Boolean).join('\n\n');

  base.legacy = {
    v2SnapshotJson: JSON.stringify(v2),
    notasMigracao: `Migrado de V2 em ${new Date().toISOString()}. Revise todos os blocos; snapshot JSON da V2 foi preservado em legacy.`,
  };
  return base;
}

export function coercePsychopedagogyAnamnesisFromStorage(stored: unknown): PPAnamnesisV3 | 'v1' | 'v2' | null {
  if (!stored || typeof stored !== 'object') return null;
  const o = stored as Record<string, unknown>;
  if (isPPAnamnesisV3(stored)) {
    return mergePsychopedagogyAnamnesisV3(createInitialPPAnamnesisV3(), stored);
  }
  if (o.schemaVersion === '2') return 'v2';
  if (looksLikePPAnamnesisV1Plain(stored)) return 'v1';
  if (hasPPAnamnesisV3PartialShape(stored)) {
    return mergePsychopedagogyAnamnesisV3(createInitialPPAnamnesisV3(), stored);
  }
  return null;
}

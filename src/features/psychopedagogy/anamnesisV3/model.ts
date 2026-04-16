/**
 * Ficha de anamnese/atendimento — Psicopedagogia apenas (schema v3).
 *
 * RESUMO TÉCNICO (escopo / segurança):
 * - Persistência: JSON em `students.clinical_info.pp_data.anamnesis` (já existente).
 * - Nenhuma tabela nova; nenhuma policy nova; RBAC inalterado.
 * - Renderização condicionada no dashboard exclusivo de `Specialty.PSYCHOPEDAGOGY` em ClinicalPages.
 * - Versões legadas v1 (texto livre) e v2 permanecem legíveis; migração opcional para v3 preserva snapshot em `legacy`.
 */

export const PP_ANAMNESIS_V3_TEMPLATE_ID = 'psicoped_anamnese_v3' as const;

export type PpTipoGuarda =
  | ''
  | 'unilateral'
  | 'compartilhada'
  | 'alternada'
  | 'provisoria'
  | 'definitiva';

export type PpEnurese = '' | 'diurna' | 'noturna' | 'nao_apresenta';
export type PpEncoprese = '' | 'sim' | 'nao_apresenta';
export type PpPartoTipo = '' | 'cesarea' | 'normal';

export const DIFICULDADES_COMUNICACAO_ORAL_IDS = [
  'troca_sons',
  'omissao_sons',
  'fala_pouco',
  'gagueira',
  'fala_muito_rapido',
  'fala_embolado',
  'fala_muito_alto',
  'outra',
] as const;
export type DificuldadeComunicacaoOralId = (typeof DIFICULDADES_COMUNICACAO_ORAL_IDS)[number];

export const PERFIL_COMPORTAMENTAL_IDS = [
  'introvertido',
  'afetuoso',
  'obediente',
  'resistente',
  'cooperativo',
  'inseguro',
  'agressivo',
  'impulsivo',
] as const;
export type PerfilComportamentalId = (typeof PERFIL_COMPORTAMENTAL_IDS)[number];

export const HISTORICO_SAUDE_CHECKBOX_IDS = [
  'sarampo',
  'rubeola',
  'pneumonia',
  'alergia',
  'infeccoes_otorrino',
  'problema_visao',
  'crises_convulsivas',
  'epilepsia',
] as const;
export type HistoricoSaudeCheckboxId = (typeof HISTORICO_SAUDE_CHECKBOX_IDS)[number];

/** Snapshot mínimo v1 (campos texto) para compatibilidade — espelha PPAnamnesisForm em ClinicalPages. */
export interface PPAnamnesisV1Snapshot {
  historicoGestacional?: string;
  historicoEscolar?: string;
  rotinaEstudos?: string;
  sono?: string;
  alimentacaoSaude?: string;
  emocionalComportamental?: string;
  psicossexual?: string;
  relacaoFamiliaEscola?: string;
  observacoesGerais?: string;
}

export interface PPAnamnesisV3Identificacao {
  nome: string;
  dataNascimento: string;
  idade: string;
  sexo: string;
  naturalidade: string;
  apelido: string;
  endereco: string;
  cep: string;
  bairro: string;
  cidadeUf: string;
  contatoEmergencia: string;
  alergico: boolean;
  alergiasDescricao: string;
  usaMedicacao: boolean;
  medicacaoDescricao: string;
  estuda: boolean;
  escola: string;
  turma: string;
  turno: string;
}

export interface PPAnamnesisV3Responsaveis {
  nomeMae: string;
  dataNascimentoMae: string;
  telefoneMae: string;
  profissaoMae: string;
  nomePai: string;
  dataNascimentoPai: string;
  telefonePai: string;
  profissaoPai: string;
  paisCasados: boolean | null;
  paisSeparados: boolean | null;
  novaEstruturaFamiliar: string;
  boaRelacaoPadrastoMadrasta: boolean | null;
  tipoGuarda: PpTipoGuarda;
  possuiIrmaos: boolean | null;
  quantidadeIrmaos: string;
  comQuemPassaMaisTempo: string;
}

export interface PPAnamnesisV3Queixa {
  queixaPrincipal: string;
  reforcadoresInteresses: string;
  quandoDificuldadeComecou: string;
  quemPercebeuPrimeiro: string;
  comoPercebeu: string;
  jaBuscouAjuda: boolean | null;
  ajudaAnteriorDescricao: string;
  prioridadeFamilia: string;
}

export interface PPAnamnesisV3ContextoEscolar {
  rotinaEscolar: string;
  areasMaiorDificuldade: string;
  dificuldadeEmCasaIgualEscola: string;
  comportamentoLicaoCasa: string;
  reacaoFamiliaAoComportamento: string;
  contraturno: boolean | null;
  observacoesContraturno: string;
  atividadeExtracurricular: boolean | null;
  atividadeExtracurricularDescricao: string;
  fazReforcoEscolar: boolean | null;
  desenvolvimentoCompativelIdade: boolean | null;
  dificuldadesPedagogicasPrincipais: string;
  opiniaoFamiliaSobreEscola: string;
}

export interface PPAnamnesisV3Comunicacao {
  verbal: string;
  interageBem: boolean | null;
  contatoVisualAoSerChamado: boolean | null;
  sabeNome: boolean | null;
  sabeVogais: boolean | null;
  sabeCores: boolean | null;
  corPreferida: string;
  sabeAlfabeto: boolean | null;
  sabeNumerais: boolean | null;
  sabeNomeResponsaveis: boolean | null;
  atendeComandos: boolean | null;
  nomeiaObjetos: boolean | null;
  identificaFiguras: boolean | null;
  nomeiaAnimais: boolean | null;
  reconheceEmocoes: boolean | null;
  sabeSeExpressar: boolean | null;
  falaOutraLingua: boolean | null;
  qualOutraLingua: string;
  balbucioIdade: string;
  primeirasPalavras: string;
  idadePrimeirasPalavras: string;
  compreendeFalaOutros: boolean | null;
  dificuldadesComunicacaoOral: DificuldadeComunicacaoOralId[];
  dificuldadesComunicacaoOralOutra: string;
  observacoesComunicacao: string;
}

export interface PPAnamnesisV3Comportamento {
  praticaEsportes: boolean | null;
  praticaEsportesDescricao: string;
  seletividadeAlimentar: boolean | null;
  seletividadeAlimentarDescricao: string;
  brincaComFuncao: boolean | null;
  resistenciaMaterial: boolean | null;
  estereotipias: boolean | null;
  ecolalia: boolean | null;
  fixacoes: boolean | null;
  dificuldadeMotora: boolean | null;
  identificaPartesCorpo: boolean | null;
  sensibilidadeSensorial: string;
  resistenciaAAlgo: string;
  gostaMusica: boolean | null;
  musicaPredileta: string;
  gostaDesenhar: boolean | null;
  gostaDesenharOQue: string;
  assisteDesenho: boolean | null;
  quaisDesenhos: string;
  autoagressao: boolean | null;
  agressividadeOutros: boolean | null;
  agressividadeContexto: string;
  gostaAnimais: boolean | null;
  medoDeAlgo: string;
  perfilComportamental: PerfilComportamentalId[];
  qualidadesDaCrianca: string;
  oQueMaisGostaDeFazer: string;
  dificuldadeInteracaoSocial: string;
  observacoesComportamentais: string;
}

export interface PPAnamnesisV3Autonomia {
  usaFralda: boolean | null;
  pedeBanheiro: boolean | null;
  controleEsfincteres: string;
  enurese: PpEnurese;
  encoprese: PpEncoprese;
  calcaSapatos: boolean | null;
  vesteSozinho: boolean | null;
  comeSozinho: boolean | null;
  criancaDesastrada: boolean | null;
  autonomiaAtividades: string;
  nocaoPerigo: boolean | null;
  nivelAutonomiaGeral: string;
  observacoesAutonomia: string;
}

export interface PPAnamnesisV3RotinaSono {
  rotinaDetalhadaSemanaFimSemana: string;
  sonoSatisfatorio: boolean | null;
  sonoTranquilo: boolean | null;
  sonoAgitado: boolean | null;
  sonambulo: boolean | null;
  acordaCansado: boolean | null;
  dormeSozinha: boolean | null;
  dormeQuartoSeparado: boolean | null;
  ondeDorme: string;
  comQuemDorme: string;
  tempoTelasPorDia: string;
}

export interface PPAnamnesisV3GestacaoParto {
  gravidezPlanejada: boolean | null;
  gravidezDesejada: boolean | null;
  gravidezTranquila: boolean | null;
  gravidezNaoPlanejada: boolean | null;
  gravidezIndesejada: boolean | null;
  observacoesGravidez: string;
  medicacaoNaGravidez: boolean | null;
  medicacaoNaGravidezDescricao: string;
  paisParentesAlgumGrau: boolean | null;
  partoTipo: PpPartoTipo;
  intercorrenciasParto: string;
  perfilBebeInfancia: string;
  amamentacao: string;
  dificuldadeAmamentacao: string;
  tempoAmamentacao: string;
  complementoAlimentarInicial: string;
  usouChupetaDedoMamadeira: boolean | null;
  detalhesChupetaDedoMamadeira: string;
  restricaoAlimentar: boolean | null;
  restricaoAlimentarDescricao: string;
  engatinhou: boolean | null;
  andouComQuantosMeses: string;
  quandoPerceberamDesvioDesenvolvimento: string;
  quemObservouPrimeiro: string;
}

export interface PPAnamnesisV3Saude {
  vacinacaoAtualizada: boolean | null;
  internacaoPrevia: boolean | null;
  internacaoDescricao: string;
  acidenteOuCirurgia: boolean | null;
  acidenteOuCirurgiaDescricao: string;
  historicoSaudeCheckbox: HistoricoSaudeCheckboxId[];
  profissionaisQueAcompanham: string;
  tratamentoPrevioSaudeMentalOuReabilitacao: boolean | null;
  tratamentoPrevioDescricao: string;
  existeOutroProblema: boolean | null;
  outroProblemaDescricao: string;
  antecedentesFamiliaresSaudeAprendizagem: string;
  atendidoPorProfissionalCaee: boolean | null;
  expectativasFamiliaTrabalhoCaee: string;
}

export interface PPAnamnesisV3Fechamento {
  gostariaAcrescentarAlgo: string;
  realizadaCom: string;
  observacoesFinaisPsicopedagoga: string;
}

export interface PPAnamnesisV3Legacy {
  v1Snapshot?: PPAnamnesisV1Snapshot;
  /** JSON serializado da ficha v2 completa (evita import circular com ClinicalPages). */
  v2SnapshotJson?: string;
  notasMigracao?: string;
}

/** Metadados opcionais: hidratação / sincronização manual com o cadastro principal do aluno. */
export interface PpCadastroAlunoSyncMeta {
  lastAutoHydrateAt?: string;
  lastManualSyncAt?: string;
}

export interface PPAnamnesisV3 {
  schemaVersion: '3';
  templateId: typeof PP_ANAMNESIS_V3_TEMPLATE_ID;
  identificacaoCrianca: PPAnamnesisV3Identificacao;
  responsaveisContextoFamiliar: PPAnamnesisV3Responsaveis;
  queixaHistorico: PPAnamnesisV3Queixa;
  contextoEscolarAprendizagem: PPAnamnesisV3ContextoEscolar;
  comunicacaoLinguagemCognitivo: PPAnamnesisV3Comunicacao;
  comportamentoInteracaoRegulacao: PPAnamnesisV3Comportamento;
  autonomiaVidaDiaria: PPAnamnesisV3Autonomia;
  rotinaSonoHabitos: PPAnamnesisV3RotinaSono;
  gestacaoPartoDesenvolvimento: PPAnamnesisV3GestacaoParto;
  saudeAcompanhamentos: PPAnamnesisV3Saude;
  fechamento: PPAnamnesisV3Fechamento;
  legacy?: PPAnamnesisV3Legacy;
  cadastroAlunoSync?: PpCadastroAlunoSyncMeta;
}

function emptyIdentificacao(): PPAnamnesisV3Identificacao {
  return {
    nome: '',
    dataNascimento: '',
    idade: '',
    sexo: '',
    naturalidade: '',
    apelido: '',
    endereco: '',
    cep: '',
    bairro: '',
    cidadeUf: '',
    contatoEmergencia: '',
    alergico: false,
    alergiasDescricao: '',
    usaMedicacao: false,
    medicacaoDescricao: '',
    estuda: false,
    escola: '',
    turma: '',
    turno: '',
  };
}

function emptyResponsaveis(): PPAnamnesisV3Responsaveis {
  return {
    nomeMae: '',
    dataNascimentoMae: '',
    telefoneMae: '',
    profissaoMae: '',
    nomePai: '',
    dataNascimentoPai: '',
    telefonePai: '',
    profissaoPai: '',
    paisCasados: null,
    paisSeparados: null,
    novaEstruturaFamiliar: '',
    boaRelacaoPadrastoMadrasta: null,
    tipoGuarda: '',
    possuiIrmaos: null,
    quantidadeIrmaos: '',
    comQuemPassaMaisTempo: '',
  };
}

function emptyQueixa(): PPAnamnesisV3Queixa {
  return {
    queixaPrincipal: '',
    reforcadoresInteresses: '',
    quandoDificuldadeComecou: '',
    quemPercebeuPrimeiro: '',
    comoPercebeu: '',
    jaBuscouAjuda: null,
    ajudaAnteriorDescricao: '',
    prioridadeFamilia: '',
  };
}

function emptyContextoEscolar(): PPAnamnesisV3ContextoEscolar {
  return {
    rotinaEscolar: '',
    areasMaiorDificuldade: '',
    dificuldadeEmCasaIgualEscola: '',
    comportamentoLicaoCasa: '',
    reacaoFamiliaAoComportamento: '',
    contraturno: null,
    observacoesContraturno: '',
    atividadeExtracurricular: null,
    atividadeExtracurricularDescricao: '',
    fazReforcoEscolar: null,
    desenvolvimentoCompativelIdade: null,
    dificuldadesPedagogicasPrincipais: '',
    opiniaoFamiliaSobreEscola: '',
  };
}

function emptyComunicacao(): PPAnamnesisV3Comunicacao {
  return {
    verbal: '',
    interageBem: null,
    contatoVisualAoSerChamado: null,
    sabeNome: null,
    sabeVogais: null,
    sabeCores: null,
    corPreferida: '',
    sabeAlfabeto: null,
    sabeNumerais: null,
    sabeNomeResponsaveis: null,
    atendeComandos: null,
    nomeiaObjetos: null,
    identificaFiguras: null,
    nomeiaAnimais: null,
    reconheceEmocoes: null,
    sabeSeExpressar: null,
    falaOutraLingua: null,
    qualOutraLingua: '',
    balbucioIdade: '',
    primeirasPalavras: '',
    idadePrimeirasPalavras: '',
    compreendeFalaOutros: null,
    dificuldadesComunicacaoOral: [],
    dificuldadesComunicacaoOralOutra: '',
    observacoesComunicacao: '',
  };
}

function emptyComportamento(): PPAnamnesisV3Comportamento {
  return {
    praticaEsportes: null,
    praticaEsportesDescricao: '',
    seletividadeAlimentar: null,
    seletividadeAlimentarDescricao: '',
    brincaComFuncao: null,
    resistenciaMaterial: null,
    estereotipias: null,
    ecolalia: null,
    fixacoes: null,
    dificuldadeMotora: null,
    identificaPartesCorpo: null,
    sensibilidadeSensorial: '',
    resistenciaAAlgo: '',
    gostaMusica: null,
    musicaPredileta: '',
    gostaDesenhar: null,
    gostaDesenharOQue: '',
    assisteDesenho: null,
    quaisDesenhos: '',
    autoagressao: null,
    agressividadeOutros: null,
    agressividadeContexto: '',
    gostaAnimais: null,
    medoDeAlgo: '',
    perfilComportamental: [],
    qualidadesDaCrianca: '',
    oQueMaisGostaDeFazer: '',
    dificuldadeInteracaoSocial: '',
    observacoesComportamentais: '',
  };
}

function emptyAutonomia(): PPAnamnesisV3Autonomia {
  return {
    usaFralda: null,
    pedeBanheiro: null,
    controleEsfincteres: '',
    enurese: '',
    encoprese: '',
    calcaSapatos: null,
    vesteSozinho: null,
    comeSozinho: null,
    criancaDesastrada: null,
    autonomiaAtividades: '',
    nocaoPerigo: null,
    nivelAutonomiaGeral: '',
    observacoesAutonomia: '',
  };
}

function emptyRotinaSono(): PPAnamnesisV3RotinaSono {
  return {
    rotinaDetalhadaSemanaFimSemana: '',
    sonoSatisfatorio: null,
    sonoTranquilo: null,
    sonoAgitado: null,
    sonambulo: null,
    acordaCansado: null,
    dormeSozinha: null,
    dormeQuartoSeparado: null,
    ondeDorme: '',
    comQuemDorme: '',
    tempoTelasPorDia: '',
  };
}

function emptyGestacao(): PPAnamnesisV3GestacaoParto {
  return {
    gravidezPlanejada: null,
    gravidezDesejada: null,
    gravidezTranquila: null,
    gravidezNaoPlanejada: null,
    gravidezIndesejada: null,
    observacoesGravidez: '',
    medicacaoNaGravidez: null,
    medicacaoNaGravidezDescricao: '',
    paisParentesAlgumGrau: null,
    partoTipo: '',
    intercorrenciasParto: '',
    perfilBebeInfancia: '',
    amamentacao: '',
    dificuldadeAmamentacao: '',
    tempoAmamentacao: '',
    complementoAlimentarInicial: '',
    usouChupetaDedoMamadeira: null,
    detalhesChupetaDedoMamadeira: '',
    restricaoAlimentar: null,
    restricaoAlimentarDescricao: '',
    engatinhou: null,
    andouComQuantosMeses: '',
    quandoPerceberamDesvioDesenvolvimento: '',
    quemObservouPrimeiro: '',
  };
}

function emptySaude(): PPAnamnesisV3Saude {
  return {
    vacinacaoAtualizada: null,
    internacaoPrevia: null,
    internacaoDescricao: '',
    acidenteOuCirurgia: null,
    acidenteOuCirurgiaDescricao: '',
    historicoSaudeCheckbox: [],
    profissionaisQueAcompanham: '',
    tratamentoPrevioSaudeMentalOuReabilitacao: null,
    tratamentoPrevioDescricao: '',
    existeOutroProblema: null,
    outroProblemaDescricao: '',
    antecedentesFamiliaresSaudeAprendizagem: '',
    atendidoPorProfissionalCaee: null,
    expectativasFamiliaTrabalhoCaee: '',
  };
}

function emptyFechamento(): PPAnamnesisV3Fechamento {
  return {
    gostariaAcrescentarAlgo: '',
    realizadaCom: '',
    observacoesFinaisPsicopedagoga: '',
  };
}

export function createInitialPPAnamnesisV3(): PPAnamnesisV3 {
  return {
    schemaVersion: '3',
    templateId: PP_ANAMNESIS_V3_TEMPLATE_ID,
    identificacaoCrianca: emptyIdentificacao(),
    responsaveisContextoFamiliar: emptyResponsaveis(),
    queixaHistorico: emptyQueixa(),
    contextoEscolarAprendizagem: emptyContextoEscolar(),
    comunicacaoLinguagemCognitivo: emptyComunicacao(),
    comportamentoInteracaoRegulacao: emptyComportamento(),
    autonomiaVidaDiaria: emptyAutonomia(),
    rotinaSonoHabitos: emptyRotinaSono(),
    gestacaoPartoDesenvolvimento: emptyGestacao(),
    saudeAcompanhamentos: emptySaude(),
    fechamento: emptyFechamento(),
  };
}

export function isPPAnamnesisV3(x: unknown): x is PPAnamnesisV3 {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return o.schemaVersion === '3' && o.templateId === PP_ANAMNESIS_V3_TEMPLATE_ID;
}

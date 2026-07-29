/**
 * omsCalculations.ts — Cálculos de Antropometria Nutricional
 * Sistema Brotar v2.1
 *
 * Inclui:
 * - Cálculo de idade em anos, meses e dias
 * - IMC
 * - % de Gordura (Slaughter, 1988)
 * - Classificação %GC (Lohman, 1987)
 * - Classificação pelas curvas OMS 2007 (Peso/Idade, Altura/Idade, IMC/Idade)
 *
 * Referências:
 * - WHO Child Growth Standards 2007 (5-19 anos)
 * - Slaughter MH et al. Hum Biol. 1988;60(5):709-23
 * - Lohman TG. Advances in Body Composition Assessment. 1992
 */

// ─── IDADE ────────────────────────────────────────────────────────────────────

export interface IdadeCompleta {
  anos: number;
  meses: number;
  dias: number;
  totalMeses: number;
  formatado: string; // "9 anos, 7 meses e 5 dias"
  resumido: string;  // "9a 7m 5d"
}

export function calcularIdadeCompleta(dataNascimento: string, dataReferencia?: string): IdadeCompleta | null {
  if (!dataNascimento) return null;
  const nasc = new Date(dataNascimento);
  const ref = dataReferencia ? new Date(dataReferencia) : new Date();
  if (isNaN(nasc.getTime())) return null;

  let anos = ref.getFullYear() - nasc.getFullYear();
  let meses = ref.getMonth() - nasc.getMonth();
  let dias = ref.getDate() - nasc.getDate();

  if (dias < 0) {
    meses -= 1;
    const mesAnterior = new Date(ref.getFullYear(), ref.getMonth(), 0);
    dias += mesAnterior.getDate();
  }
  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }

  const totalMeses = anos * 12 + meses;
  const formatado = `${anos} ano${anos !== 1 ? 's' : ''}, ${meses} mes${meses !== 1 ? 'es' : ''} e ${dias} dia${dias !== 1 ? 's' : ''}`;
  const resumido = `${anos}a ${meses}m ${dias}d`;

  return { anos, meses, dias, totalMeses, formatado, resumido };
}

// ─── IMC ──────────────────────────────────────────────────────────────────────

export function calcularIMC(pesoKg: number, alturaCm: number): number | null {
  if (!pesoKg || !alturaCm || alturaCm <= 0) return null;
  const alturaM = alturaCm / 100;
  return Math.round((pesoKg / (alturaM * alturaM)) * 10) / 10;
}

// ─── % GORDURA — SLAUGHTER (1988) ─────────────────────────────────────────────
// Fórmula para crianças e adolescentes (8-18 anos) usando triciptal + subescapular

export function calcularPercentualGordura(
  dobraTriciptal: number,
  dobraSubescapular: number,
  sexo: 'M' | 'F'
): number | null {
  if (!dobraTriciptal || !dobraSubescapular) return null;
  const soma = dobraTriciptal + dobraSubescapular;

  let percentual: number;
  if (sexo === 'M') {
    if (soma <= 35) {
      percentual = 1.21 * soma - 0.008 * (soma * soma) - 1.7;
    } else {
      percentual = 0.783 * soma + 1.6;
    }
  } else {
    if (soma <= 35) {
      percentual = 1.33 * soma - 0.013 * (soma * soma) - 2.5;
    } else {
      percentual = 0.546 * soma + 9.7;
    }
  }
  return Math.round(percentual * 100) / 100;
}

// ─── CLASSIFICAÇÃO %GC — LOHMAN (1987) ────────────────────────────────────────

export function classificarGorduraLohman(percentual: number | null, sexo: 'M' | 'F'): string {
  if (percentual === null) return '';
  if (sexo === 'M') {
    if (percentual < 6) return 'Muito baixo';
    if (percentual < 10) return 'Baixo';
    if (percentual < 20) return 'Adequado';
    if (percentual < 25) return 'Moderadamente alto';
    if (percentual < 31) return 'Alto';
    return 'Muito alto';
  } else {
    if (percentual < 12) return 'Muito baixo';
    if (percentual < 15) return 'Baixo';
    if (percentual < 25) return 'Adequado';
    if (percentual < 30) return 'Moderadamente alto';
    if (percentual < 36) return 'Alto';
    return 'Muito alto';
  }
}

// ─── CURVAS OMS 2007 — TABELAS DE REFERÊNCIA ─────────────────────────────────
// Dados simplificados dos z-scores OMS para meninos e meninas
// Fonte: WHO AnthroPlus (5-19 anos)
// Pontos de corte: meses selecionados com interpolação linear entre eles

type ZScoreRow = [number, number, number, number, number, number, number]; // [-3, -2, -1, median, +1, +2, +3]

interface OmsTable {
  [meses: number]: ZScoreRow;
}

// IMC/Idade — Meninos (WHO 2007, 5-19 anos)
// [meses]: [-3SD, -2SD, -1SD, mediana, +1SD, +2SD, +3SD]
const IMC_IDADE_M: OmsTable = {
  61: [12.1, 13.0, 14.1, 15.3, 16.6, 18.3, 20.1],
  72: [12.3, 13.2, 14.3, 15.5, 16.9, 18.7, 20.8],
  84: [12.5, 13.4, 14.5, 15.8, 17.3, 19.4, 21.8],
  96: [12.7, 13.6, 14.8, 16.2, 17.8, 20.2, 23.1],
  108: [13.0, 13.9, 15.2, 16.7, 18.5, 21.2, 24.6],
  120: [13.3, 14.3, 15.6, 17.3, 19.3, 22.4, 26.3],
  132: [13.7, 14.7, 16.2, 17.9, 20.2, 23.6, 28.0],
  144: [14.2, 15.3, 16.8, 18.7, 21.1, 24.8, 29.5],
  156: [14.7, 15.8, 17.5, 19.5, 22.0, 25.9, 30.8],
  168: [15.3, 16.5, 18.2, 20.3, 22.9, 26.8, 31.7],
  180: [15.8, 17.0, 18.8, 21.0, 23.6, 27.4, 32.2],
  192: [16.3, 17.5, 19.3, 21.5, 24.2, 27.8, 32.4],
  204: [16.6, 17.9, 19.7, 21.9, 24.5, 28.0, 32.4],
  216: [16.9, 18.1, 19.9, 22.1, 24.7, 28.1, 32.3],
  228: [17.0, 18.3, 20.1, 22.3, 24.9, 28.2, 32.2],
};

// IMC/Idade — Meninas (WHO 2007, 5-19 anos)
const IMC_IDADE_F: OmsTable = {
  61: [12.0, 12.9, 14.0, 15.2, 16.7, 18.6, 21.0],
  72: [12.1, 13.0, 14.1, 15.4, 16.9, 19.0, 21.6],
  84: [12.2, 13.1, 14.3, 15.6, 17.2, 19.5, 22.5],
  96: [12.4, 13.3, 14.5, 15.9, 17.7, 20.2, 23.5],
  108: [12.6, 13.6, 14.9, 16.4, 18.3, 21.1, 24.8],
  120: [13.0, 14.0, 15.3, 17.0, 19.1, 22.2, 26.2],
  132: [13.4, 14.5, 16.0, 17.7, 20.0, 23.3, 27.5],
  144: [14.0, 15.1, 16.7, 18.5, 21.0, 24.4, 28.8],
  156: [14.6, 15.8, 17.3, 19.3, 21.8, 25.2, 29.6],
  168: [15.1, 16.3, 18.0, 20.0, 22.5, 25.8, 30.0],
  180: [15.6, 16.8, 18.5, 20.5, 23.0, 26.2, 30.2],
  192: [16.0, 17.2, 18.9, 21.0, 23.3, 26.5, 30.2],
  204: [16.2, 17.5, 19.2, 21.2, 23.5, 26.6, 30.1],
  216: [16.4, 17.6, 19.4, 21.4, 23.7, 26.7, 30.0],
  228: [16.5, 17.7, 19.5, 21.5, 23.8, 26.7, 29.9],
};

// Peso/Idade — Meninos (WHO 2007, 5-10 anos, até 120 meses)
const PESO_IDADE_M: OmsTable = {
  61: [13.7, 15.0, 16.7, 18.3, 20.5, 23.5, 27.0],
  72: [15.1, 16.6, 18.5, 20.5, 23.1, 26.7, 31.1],
  84: [16.6, 18.4, 20.6, 22.9, 26.0, 30.4, 35.9],
  96: [18.3, 20.4, 22.9, 25.6, 29.3, 34.7, 41.6],
  108: [20.1, 22.6, 25.6, 28.6, 33.1, 39.7, 48.4],
  120: [22.2, 25.1, 28.6, 32.0, 37.4, 45.5, 56.1],
};

// Peso/Idade — Meninas (WHO 2007, 5-10 anos)
const PESO_IDADE_F: OmsTable = {
  61: [13.5, 14.8, 16.5, 18.2, 20.4, 23.5, 27.4],
  72: [14.8, 16.3, 18.2, 20.2, 22.8, 26.4, 31.2],
  84: [16.3, 18.0, 20.2, 22.5, 25.5, 29.9, 35.8],
  96: [17.9, 19.9, 22.4, 25.0, 28.7, 34.0, 41.2],
  108: [19.7, 22.0, 24.9, 28.0, 32.4, 38.8, 47.8],
  120: [21.7, 24.4, 27.7, 31.3, 36.6, 44.3, 55.3],
};

// Altura/Idade — Meninos (WHO 2007, 5-19 anos)
const ALTURA_IDADE_M: OmsTable = {
  61: [96.1, 100.7, 105.3, 110.0, 114.6, 119.2, 123.9],
  72: [100.9, 105.9, 110.8, 115.7, 120.6, 125.5, 130.4],
  84: [105.4, 110.7, 115.9, 121.2, 126.4, 131.6, 136.9],
  96: [109.7, 115.2, 120.8, 126.3, 131.9, 137.4, 143.0],
  108: [113.8, 119.7, 125.5, 131.3, 137.2, 143.0, 148.8],
  120: [118.0, 124.0, 130.0, 136.1, 142.1, 148.2, 154.2],
  132: [122.0, 128.3, 134.6, 140.9, 147.2, 153.5, 159.9],
  144: [127.0, 133.6, 140.2, 146.8, 153.4, 160.0, 166.6],
  156: [134.0, 140.5, 147.0, 153.6, 160.1, 166.7, 173.2],
  168: [140.2, 146.5, 152.9, 159.2, 165.6, 171.9, 178.3],
  180: [144.8, 150.8, 156.9, 163.0, 169.0, 175.1, 181.1],
  192: [147.4, 153.2, 159.1, 164.9, 170.7, 176.5, 182.3],
  204: [148.9, 154.5, 160.2, 165.8, 171.4, 177.1, 182.7],
  216: [149.5, 155.1, 160.6, 166.2, 171.8, 177.3, 182.9],
  228: [149.8, 155.4, 160.9, 166.5, 172.1, 177.6, 183.2],
};

// Altura/Idade — Meninas (WHO 2007, 5-19 anos)
const ALTURA_IDADE_F: OmsTable = {
  61: [95.2, 99.5, 103.9, 108.4, 112.8, 117.3, 121.7],
  72: [100.0, 104.7, 109.4, 114.2, 118.9, 123.7, 128.4],
  84: [104.5, 109.6, 114.6, 119.7, 124.7, 129.8, 134.8],
  96: [108.9, 114.3, 119.7, 125.0, 130.4, 135.8, 141.2],
  108: [113.2, 118.9, 124.5, 130.2, 135.8, 141.5, 147.1],
  120: [117.7, 123.6, 129.5, 135.5, 141.4, 147.3, 153.3],
  132: [123.0, 129.0, 135.1, 141.1, 147.2, 153.2, 159.3],
  144: [129.8, 135.7, 141.7, 147.7, 153.7, 159.6, 165.6],
  156: [135.2, 140.7, 146.2, 151.7, 157.2, 162.7, 168.2],
  168: [137.8, 143.0, 148.3, 153.6, 158.9, 164.1, 169.4],
  180: [139.0, 144.1, 149.3, 154.4, 159.5, 164.6, 169.8],
  192: [139.5, 144.5, 149.6, 154.7, 159.8, 164.9, 170.0],
  204: [139.7, 144.7, 149.8, 154.9, 160.0, 165.0, 170.1],
  216: [139.8, 144.8, 149.9, 155.0, 160.1, 165.1, 170.2],
  228: [139.8, 144.9, 150.0, 155.0, 160.1, 165.2, 170.2],
};

// ─── FUNÇÕES DE CLASSIFICAÇÃO OMS ─────────────────────────────────────────────

function interpolarOms(tabela: OmsTable, meses: number): ZScoreRow | null {
  const chaves = Object.keys(tabela).map(Number).sort((a, b) => a - b);
  if (meses < chaves[0] || meses > chaves[chaves.length - 1]) return null;

  const exato = tabela[meses];
  if (exato) return exato;

  let inferior = chaves[0];
  let superior = chaves[chaves.length - 1];
  for (let i = 0; i < chaves.length - 1; i++) {
    if (meses >= chaves[i] && meses < chaves[i + 1]) {
      inferior = chaves[i];
      superior = chaves[i + 1];
      break;
    }
  }

  const fator = (meses - inferior) / (superior - inferior);
  const rowInf = tabela[inferior];
  const rowSup = tabela[superior];
  return rowInf.map((v, i) =>
    Math.round((v + (rowSup[i] - v) * fator) * 10) / 10
  ) as ZScoreRow;
}

export function classificarIMCIdade(imc: number, meses: number, sexo: 'M' | 'F'): string {
  const tabela = sexo === 'M' ? IMC_IDADE_M : IMC_IDADE_F;
  const row = interpolarOms(tabela, meses);
  if (!row) return '';
  // [-3SD, -2SD, -1SD, mediana, +1SD, +2SD, +3SD]
  if (imc < row[0]) return 'Magreza acentuada';
  if (imc < row[1]) return 'Magreza';
  if (imc < row[4]) return 'Eutrofia';
  if (imc < row[5]) return 'Sobrepeso';
  if (imc < row[6]) return 'Obesidade';
  return 'Obesidade grave';
}

export function classificarPesoIdade(peso: number, meses: number, sexo: 'M' | 'F'): string {
  const tabela = sexo === 'M' ? PESO_IDADE_M : PESO_IDADE_F;
  const row = interpolarOms(tabela, meses);
  if (!row) return 'Fora da faixa (>10 anos)';
  if (peso < row[0]) return 'Muito baixo peso';
  if (peso < row[1]) return 'Baixo peso';
  if (peso < row[5]) return 'Peso adequado';
  return 'Peso elevado';
}

export function classificarAlturaIdade(altura: number, meses: number, sexo: 'M' | 'F'): string {
  const tabela = sexo === 'M' ? ALTURA_IDADE_M : ALTURA_IDADE_F;
  const row = interpolarOms(tabela, meses);
  if (!row) return '';
  if (altura < row[0]) return 'Muito baixa estatura';
  if (altura < row[1]) return 'Baixa estatura';
  return 'Estatura adequada';
}

// ─── DADOS PARA GRÁFICOS (exportar curvas para Recharts) ─────────────────────

export interface CurvaOmsPoint {
  meses: number;
  m3: number; // -3SD
  m2: number; // -2SD
  m1: number; // -1SD
  mediana: number;
  p1: number; // +1SD
  p2: number; // +2SD
  p3: number; // +3SD
}

export function getCurvaIMCIdade(sexo: 'M' | 'F'): CurvaOmsPoint[] {
  const tabela = sexo === 'M' ? IMC_IDADE_M : IMC_IDADE_F;
  return Object.entries(tabela).map(([m, row]) => ({
    meses: Number(m),
    m3: row[0], m2: row[1], m1: row[2], mediana: row[3],
    p1: row[4], p2: row[5], p3: row[6],
  }));
}

export function getCurvaPesoIdade(sexo: 'M' | 'F'): CurvaOmsPoint[] {
  const tabela = sexo === 'M' ? PESO_IDADE_M : PESO_IDADE_F;
  return Object.entries(tabela).map(([m, row]) => ({
    meses: Number(m),
    m3: row[0], m2: row[1], m1: row[2], mediana: row[3],
    p1: row[4], p2: row[5], p3: row[6],
  }));
}

export function getCurvaAlturaIdade(sexo: 'M' | 'F'): CurvaOmsPoint[] {
  const tabela = sexo === 'M' ? ALTURA_IDADE_M : ALTURA_IDADE_F;
  return Object.entries(tabela).map(([m, row]) => ({
    meses: Number(m),
    m3: row[0], m2: row[1], m1: row[2], mediana: row[3],
    p1: row[4], p2: row[5], p3: row[6],
  }));
}

// ─── RESULTADO COMPLETO DA ANTROPOMETRIA ──────────────────────────────────────

export interface ResultadoAntropometria {
  idade: IdadeCompleta;
  imc: number | null;
  percentualGordura: number | null;
  classificacaoGordura: string;
  relacaoPesoIdade: string;
  relacaoAlturaIdade: string;
  relacaoIMCIdade: string;
}

export function calcularAntropometriaCompleta(params: {
  dataNascimento: string;
  dataAvaliacao?: string;
  pesoKg: number;
  alturaCm: number;
  sexo: 'M' | 'F';
  dobraTriciptal?: number;
  dobraSubescapular?: number;
}): ResultadoAntropometria | null {
  const idade = calcularIdadeCompleta(params.dataNascimento, params.dataAvaliacao);
  if (!idade) return null;

  const imc = calcularIMC(params.pesoKg, params.alturaCm);

  const percentualGordura = (params.dobraTriciptal && params.dobraSubescapular)
    ? calcularPercentualGordura(params.dobraTriciptal, params.dobraSubescapular, params.sexo)
    : null;

  const classificacaoGordura = classificarGorduraLohman(percentualGordura, params.sexo);

  const relacaoPesoIdade = classificarPesoIdade(params.pesoKg, idade.totalMeses, params.sexo);
  const relacaoAlturaIdade = classificarAlturaIdade(params.alturaCm, idade.totalMeses, params.sexo);
  const relacaoIMCIdade = imc
    ? classificarIMCIdade(imc, idade.totalMeses, params.sexo)
    : '';

  return {
    idade,
    imc,
    percentualGordura,
    classificacaoGordura,
    relacaoPesoIdade,
    relacaoAlturaIdade,
    relacaoIMCIdade,
  };
}

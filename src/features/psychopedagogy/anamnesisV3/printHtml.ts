import type { PPAnamnesisV3 } from './model';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label: string, value: string | boolean | null | undefined | string[]): string {
  const v = Array.isArray(value) ? value.join(', ') : value === null || value === undefined ? '' : String(value);
  if (!v && v !== '0' && v !== 'false') return '';
  return `<div class="data-row"><span class="label">${esc(label)}</span><div class="value">${esc(v)}</div></div>`;
}

/** Trecho HTML para inclusão no relatório de impressão da psicopedagogia (somente v3). */
export function buildPPAnamnesisV3PrintHtml(data: PPAnamnesisV3, studentName: string): string {
  const i = data.identificacaoCrianca;
  const r = data.responsaveisContextoFamiliar;
  const q = data.queixaHistorico;
  const c = data.contextoEscolarAprendizagem;
  const cm = data.comunicacaoLinguagemCognitivo;
  const b = data.comportamentoInteracaoRegulacao;
  const a = data.autonomiaVidaDiaria;
  const s = data.rotinaSonoHabitos;
  const g = data.gestacaoPartoDesenvolvimento;
  const h = data.saudeAcompanhamentos;
  const f = data.fechamento;

  return `
    <h2 class="section-title">ANAMNESE PSICOPEDAGÓGICA (FICHA ESTRUTURADA V3)</h2>
    <div class="box">
      <div class="data-row"><span class="label">ALUNO(A) CADASTRO</span><div class="value">${esc(studentName)}</div></div>
      ${row('Nome na ficha', i.nome)}
      ${row('Data nascimento', i.dataNascimento)}
      ${row('Idade', i.idade)}
      ${row('Sexo', i.sexo)}
      ${row('Naturalidade', i.naturalidade)}
      ${row('Apelido', i.apelido)}
      ${row('Endereço', i.endereco)}
      ${row('CEP', i.cep)}
      ${row('Bairro', i.bairro)}
      ${row('Cidade/UF', i.cidadeUf)}
      ${row('Contato emergência', i.contatoEmergencia)}
      ${row('Alérgico', i.alergico)}
      ${row('Alergias (descrição)', i.alergiasDescricao)}
      ${row('Usa medicação', i.usaMedicacao)}
      ${row('Medicação (descrição)', i.medicacaoDescricao)}
      ${row('Estuda', i.estuda)}
      ${row('Escola', i.escola)}
      ${row('Turma', i.turma)}
      ${row('Turno', i.turno)}
    </div>
    <h2 class="section-title">RESPONSÁVEIS E CONTEXTO FAMILIAR</h2>
    <div class="box">
      ${row('Mãe — nome', r.nomeMae)}
      ${row('Mãe — nascimento', r.dataNascimentoMae)}
      ${row('Mãe — telefone', r.telefoneMae)}
      ${row('Mãe — profissão', r.profissaoMae)}
      ${row('Pai — nome', r.nomePai)}
      ${row('Pai — nascimento', r.dataNascimentoPai)}
      ${row('Pai — telefone', r.telefonePai)}
      ${row('Pai — profissão', r.profissaoPai)}
      ${row('Pais casados', r.paisCasados)}
      ${row('Pais separados', r.paisSeparados)}
      ${row('Nova estrutura familiar', r.novaEstruturaFamiliar)}
      ${row('Boa relação padrasto/madrasta', r.boaRelacaoPadrastoMadrasta)}
      ${row('Tipo de guarda', r.tipoGuarda)}
      ${row('Possui irmãos', r.possuiIrmaos)}
      ${row('Quantidade irmãos', r.quantidadeIrmaos)}
      ${row('Com quem passa mais tempo', r.comQuemPassaMaisTempo)}
    </div>
    <h2 class="section-title">QUEIXA E HISTÓRICO</h2>
    <div class="box">
      ${row('Queixa principal', q.queixaPrincipal)}
      ${row('Reforçadores / interesses', q.reforcadoresInteresses)}
      ${row('Início das dificuldades', q.quandoDificuldadeComecou)}
      ${row('Quem percebeu primeiro', q.quemPercebeuPrimeiro)}
      ${row('Como percebeu', q.comoPercebeu)}
      ${row('Já buscou ajuda', q.jaBuscouAjuda)}
      ${row('Ajuda anterior', q.ajudaAnteriorDescricao)}
      ${row('Prioridade da família', q.prioridadeFamilia)}
    </div>
    <h2 class="section-title">CONTEXTO ESCOLAR E APRENDIZAGEM</h2>
    <div class="box">
      ${row('Rotina escolar', c.rotinaEscolar)}
      ${row('Áreas de maior dificuldade', c.areasMaiorDificuldade)}
      ${row('Dificuldade casa = escola', c.dificuldadeEmCasaIgualEscola)}
      ${row('Comportamento lição de casa', c.comportamentoLicaoCasa)}
      ${row('Reação da família', c.reacaoFamiliaAoComportamento)}
      ${row('Contraturno', c.contraturno)}
      ${row('Obs. contraturno', c.observacoesContraturno)}
      ${row('Atividade extracurricular', c.atividadeExtracurricular)}
      ${row('Descrição atividade', c.atividadeExtracurricularDescricao)}
      ${row('Reforço escolar', c.fazReforcoEscolar)}
      ${row('Desenvolvimento compatível', c.desenvolvimentoCompativelIdade)}
      ${row('Dificuldades pedagógicas', c.dificuldadesPedagogicasPrincipais)}
      ${row('Opinião família sobre escola', c.opiniaoFamiliaSobreEscola)}
    </div>
    <h2 class="section-title">COMUNICAÇÃO, LINGUAGEM E COGNITIVO</h2>
    <div class="box">
      ${row('Verbal', cm.verbal)}
      ${row('Dificuldades comunicação oral', cm.dificuldadesComunicacaoOral.join(', '))}
      ${row('Outra (comunicação oral)', cm.dificuldadesComunicacaoOralOutra)}
      ${row('Observações', cm.observacoesComunicacao)}
    </div>
    <h2 class="section-title">COMPORTAMENTO E REGULAÇÃO</h2>
    <div class="box">
      ${row('Perfil comportamental', b.perfilComportamental.join(', '))}
      ${row('Qualidades da criança', b.qualidadesDaCrianca)}
      ${row('O que mais gosta', b.oQueMaisGostaDeFazer)}
      ${row('Dificuldade interação social', b.dificuldadeInteracaoSocial)}
      ${row('Observações comportamentais', b.observacoesComportamentais)}
    </div>
    <h2 class="section-title">AUTONOMIA E AVD</h2>
    <div class="box">
      ${row('Enurese', a.enurese)}
      ${row('Encoprese', a.encoprese)}
      ${row('Nível autonomia geral', a.nivelAutonomiaGeral)}
      ${row('Observações autonomia', a.observacoesAutonomia)}
    </div>
    <h2 class="section-title">ROTINA, SONO E HÁBITOS</h2>
    <div class="box">
      ${row('Rotina (semana/fim de semana)', s.rotinaDetalhadaSemanaFimSemana)}
      ${row('Tempo de telas/dia', s.tempoTelasPorDia)}
      ${row('Onde dorme', s.ondeDorme)}
      ${row('Com quem dorme', s.comQuemDorme)}
    </div>
    <h2 class="section-title">GESTAÇÃO, PARTO E DESENVOLVIMENTO</h2>
    <div class="box">
      ${row('Tipo de parto', g.partoTipo)}
      ${row('Intercorrências parto', g.intercorrenciasParto)}
      ${row('Observações gravidez', g.observacoesGravidez)}
      ${row('Andou com quantos meses', g.andouComQuantosMeses)}
    </div>
    <h2 class="section-title">SAÚDE E ACOMPANHAMENTOS</h2>
    <div class="box">
      ${row('Histórico saúde (marcadores)', h.historicoSaudeCheckbox.join(', '))}
      ${row('Profissionais que acompanham', h.profissionaisQueAcompanham)}
      ${row('Antecedentes familiares', h.antecedentesFamiliaresSaudeAprendizagem)}
      ${row('Expectativas CAEE', h.expectativasFamiliaTrabalhoCaee)}
    </div>
    <h2 class="section-title">FECHAMENTO</h2>
    <div class="box">
      ${row('Gostaria de acrescentar', f.gostariaAcrescentarAlgo)}
      ${row('Realizada com', f.realizadaCom)}
      ${row('Observações finais', f.observacoesFinaisPsicopedagoga)}
    </div>
  `;
}

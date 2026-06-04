import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Student } from '@/types';
import { ArrowLeft, ArrowRight, Check, CheckCircle, ChevronDown, ChevronRight, RefreshCw, User } from 'lucide-react';
import {
  DIFICULDADES_COMUNICACAO_ORAL_IDS,
  HISTORICO_SAUDE_CHECKBOX_IDS,
  PERFIL_COMPORTAMENTAL_IDS,
  type DificuldadeComunicacaoOralId,
  type HistoricoSaudeCheckboxId,
  type PerfilComportamentalId,
  type PPAnamnesisV3,
} from './model';
import {
  PpCheckboxRow,
  PpFieldLabel,
  PpInput,
  PpSectionShell,
  PpTextarea,
  PpTriState,
  PpYesNo,
} from './fieldKit';
import type { PpCadastroSyncMode } from './mapStudentRegistrationToPPAnamnesis';

export type PPAnamnesisV3SectionId =
  | 'identificacao'
  | 'responsaveis'
  | 'queixa'
  | 'escolar'
  | 'comunicacao'
  | 'comportamento'
  | 'autonomia'
  | 'rotina'
  | 'gestacao'
  | 'saude'
  | 'fechamento';

const SECTIONS: { id: PPAnamnesisV3SectionId; title: string }[] = [
  { id: 'identificacao', title: '1. Identificação' },
  { id: 'responsaveis', title: '2. Responsáveis / família' },
  { id: 'queixa', title: '3. Queixa e histórico' },
  { id: 'escolar', title: '4. Contexto escolar' },
  { id: 'comunicacao', title: '5. Comunicação e cognitivo' },
  { id: 'comportamento', title: '6. Comportamento' },
  { id: 'autonomia', title: '7. Autonomia / AVD' },
  { id: 'rotina', title: '8. Rotina e sono' },
  { id: 'gestacao', title: '9. Gestação e desenvolvimento' },
  { id: 'saude', title: '10. Saúde' },
  { id: 'fechamento', title: '11. Fechamento' },
];

function toggleInList<T extends string>(list: T[], id: T, checked: boolean): T[] {
  if (checked) return list.includes(id) ? list : [...list, id];
  return list.filter((x) => x !== id);
}

export interface PPAnamnesisV3FormProps {
  data: PPAnamnesisV3;
  onChange: (next: PPAnamnesisV3) => void;
  student: Student;
  /** Sincronização manual com o cadastro oficial (somente campos básicos mapeados). */
  onCadastroSync?: (mode: Extract<PpCadastroSyncMode, 'manualFillEmpty' | 'manualOverwriteBasics'>) => void;
  onSave?: () => void;
}

export const PPAnamnesisV3Form: React.FC<PPAnamnesisV3FormProps> = ({ data, onChange, student, onCadastroSync, onSave }) => {
  const [active, setActive] = useState<PPAnamnesisV3SectionId>('identificacao');
  const [cadastroMenuOpen, setCadastroMenuOpen] = useState(false);
  const cadastroMenuRef = useRef<HTMLDivElement | null>(null);

  // Auto-save logic — compara JSON para evitar disparos desnecessários
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const isFirstRender = useRef(true);
  const lastDataRef = useRef<string>('');

  useEffect(() => {
    const serialized = JSON.stringify(data);
    if (isFirstRender.current) {
      isFirstRender.current = false;
      lastDataRef.current = serialized;
      return;
    }
    if (serialized === lastDataRef.current) return;
    lastDataRef.current = serialized;
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (onSave) {
        onSave();
        setSaveStatus('saved');
        const now = new Date();
        setLastSaveTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, 2000);
  }, [data, onSave]);

  const patch = useCallback(
    (partial: Partial<PPAnamnesisV3>) => {
      onChange({ ...data, ...partial });
    },
    [data, onChange]
  );

  useEffect(() => {
    if (!cadastroMenuOpen) return;
    const close = (ev: MouseEvent) => {
      const el = cadastroMenuRef.current;
      if (el && ev.target instanceof Node && !el.contains(ev.target)) setCadastroMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [cadastroMenuOpen]);

  const ultimaSincCadastro = useMemo(() => {
    const s = data.cadastroAlunoSync;
    const iso = s?.lastManualSyncAt || s?.lastAutoHydrateAt;
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return iso;
    }
  }, [data.cadastroAlunoSync]);

  const i = data.identificacaoCrianca;
  const r = data.responsaveisContextoFamiliar;
  const q = data.queixaHistorico;
  const e = data.contextoEscolarAprendizagem;
  const co = data.comunicacaoLinguagemCognitivo;
  const b = data.comportamentoInteracaoRegulacao;
  const au = data.autonomiaVidaDiaria;
  const ro = data.rotinaSonoHabitos;
  const ge = data.gestacaoPartoDesenvolvimento;
  const sa = data.saudeAcompanhamentos;
  const fe = data.fechamento;

  const checkSectionCompletion = useCallback((sec: PPAnamnesisV3SectionId) => {
    switch (sec) {
      case 'identificacao': return !!i.nome;
      case 'responsaveis': return !!r.nomeMae || !!r.nomePai;
      case 'queixa': return !!q.queixaPrincipal;
      case 'escolar': return !!e.rotinaEscolar || !!e.areasMaiorDificuldade;
      case 'comunicacao': return !!co.verbal || co.dificuldadesComunicacaoOral.length > 0;
      case 'comportamento': return !!b.sensibilidadeSensorial || b.perfilComportamental.length > 0;
      case 'autonomia': return !!au.controleEsfincteres || !!au.enurese;
      case 'rotina': return !!ro.rotinaDetalhadaSemanaFimSemana;
      case 'gestacao': return !!ge.partoTipo || !!ge.observacoesGravidez;
      case 'saude': return sa.historicoSaudeCheckbox.length > 0 || !!sa.profissionaisQueAcompanham;
      case 'fechamento': return !!fe.observacoesFinaisPsicopedagoga || !!fe.realizadaCom;
    }
    return false;
  }, [i, r, q, e, co, b, au, ro, ge, sa, fe]);

  const completedSections = useMemo(() => SECTIONS.filter(s => checkSectionCompletion(s.id)), [checkSectionCompletion]);
  const completionPercentage = Math.round((completedSections.length / SECTIONS.length) * 100);

  const labelMapCom = useMemo(
    () =>
      ({
        troca_sons: 'Troca sons',
        omissao_sons: 'Omissão sons',
        fala_pouco: 'Fala pouco',
        gagueira: 'Gagueira',
        fala_muito_rapido: 'Fala muito rápido',
        fala_embolado: 'Fala embolado',
        fala_muito_alto: 'Fala muito alto',
        outra: 'Outra',
      }) satisfies Record<DificuldadeComunicacaoOralId, string>,
    []
  );

  const labelMapPerfil = useMemo(
    () =>
      ({
        introvertido: 'Introvertido',
        afetuoso: 'Afetuoso',
        obediente: 'Obediente',
        resistente: 'Resistente',
        cooperativo: 'Cooperativo',
        inseguro: 'Inseguro',
        agressivo: 'Agressivo',
        impulsivo: 'Impulsivo',
      }) satisfies Record<PerfilComportamentalId, string>,
    []
  );

  const labelMapSaude = useMemo(
    () =>
      ({
        sarampo: 'Sarampo',
        rubeola: 'Rubéola',
        pneumonia: 'Pneumonia',
        alergia: 'Alergia',
        infeccoes_otorrino: 'Infecções otorrino',
        problema_visao: 'Problema visão',
        crises_convulsivas: 'Crises convulsivas',
        epilepsia: 'Epilepsia',
      }) satisfies Record<HistoricoSaudeCheckboxId, string>,
    []
  );

  const main = useMemo(() => {
    switch (active) {
      case 'identificacao':
        return (
          <>
            <div className="mb-4">
              <p className="text-sm text-slate-600">
                Campos da criança/adolescente. Dados básicos podem ser atualizados a partir do cadastro oficial pelo
                botão no topo da ficha.
              </p>
            </div>
            <PpSectionShell title="Identificação">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <PpFieldLabel>Nome</PpFieldLabel>
                  <PpInput value={i.nome} onChange={(v) => patch({ identificacaoCrianca: { ...i, nome: v } })} />
                </div>
                <div>
                  <PpFieldLabel>Data de nascimento</PpFieldLabel>
                  <PpInput type="date" value={i.dataNascimento} onChange={(v) => patch({ identificacaoCrianca: { ...i, dataNascimento: v } })} />
                </div>
                <div>
                  <PpFieldLabel>Idade</PpFieldLabel>
                  <PpInput value={i.idade} onChange={(v) => patch({ identificacaoCrianca: { ...i, idade: v } })} placeholder="Anos" />
                </div>
                <div>
                  <PpFieldLabel>Sexo</PpFieldLabel>
                  <PpInput value={i.sexo} onChange={(v) => patch({ identificacaoCrianca: { ...i, sexo: v } })} />
                </div>
                <div>
                  <PpFieldLabel>Naturalidade</PpFieldLabel>
                  <PpInput value={i.naturalidade} onChange={(v) => patch({ identificacaoCrianca: { ...i, naturalidade: v } })} />
                </div>
                <div>
                  <PpFieldLabel>Apelido</PpFieldLabel>
                  <PpInput value={i.apelido} onChange={(v) => patch({ identificacaoCrianca: { ...i, apelido: v } })} />
                </div>
                <div className="md:col-span-2">
                  <PpFieldLabel>Endereço</PpFieldLabel>
                  <PpTextarea rows={2} value={i.endereco} onChange={(v) => patch({ identificacaoCrianca: { ...i, endereco: v } })} />
                </div>
                <div>
                  <PpFieldLabel>CEP</PpFieldLabel>
                  <PpInput value={i.cep} onChange={(v) => patch({ identificacaoCrianca: { ...i, cep: v } })} />
                </div>
                <div>
                  <PpFieldLabel>Bairro</PpFieldLabel>
                  <PpInput value={i.bairro} onChange={(v) => patch({ identificacaoCrianca: { ...i, bairro: v } })} />
                </div>
                <div className="md:col-span-2">
                  <PpFieldLabel>Cidade / UF</PpFieldLabel>
                  <PpInput value={i.cidadeUf} onChange={(v) => patch({ identificacaoCrianca: { ...i, cidadeUf: v } })} />
                </div>
                <div className="md:col-span-2">
                  <PpFieldLabel>Contato de emergência</PpFieldLabel>
                  <PpInput value={i.contatoEmergencia} onChange={(v) => patch({ identificacaoCrianca: { ...i, contatoEmergencia: v } })} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <PpYesNo label="Alérgico(a)?" value={i.alergico} onChange={(v) => patch({ identificacaoCrianca: { ...i, alergico: v } })} />
                {i.alergico ? (
                  <div className="md:col-span-2">
                    <PpFieldLabel>Descrição das alergias</PpFieldLabel>
                    <PpTextarea rows={2} value={i.alergiasDescricao} onChange={(v) => patch({ identificacaoCrianca: { ...i, alergiasDescricao: v } })} />
                  </div>
                ) : null}
                <PpYesNo label="Usa medicação?" value={i.usaMedicacao} onChange={(v) => patch({ identificacaoCrianca: { ...i, usaMedicacao: v } })} />
                {i.usaMedicacao ? (
                  <div className="md:col-span-2">
                    <PpFieldLabel>Medicação (descrição)</PpFieldLabel>
                    <PpTextarea rows={2} value={i.medicacaoDescricao} onChange={(v) => patch({ identificacaoCrianca: { ...i, medicacaoDescricao: v } })} />
                  </div>
                ) : null}
                <PpYesNo label="Estuda?" value={i.estuda} onChange={(v) => patch({ identificacaoCrianca: { ...i, estuda: v } })} />
                <div>
                  <PpFieldLabel>Escola</PpFieldLabel>
                  <PpInput value={i.escola} onChange={(v) => patch({ identificacaoCrianca: { ...i, escola: v } })} />
                </div>
                <div>
                  <PpFieldLabel>Turma</PpFieldLabel>
                  <PpInput value={i.turma} onChange={(v) => patch({ identificacaoCrianca: { ...i, turma: v } })} />
                </div>
                <div>
                  <PpFieldLabel>Turno</PpFieldLabel>
                  <PpInput value={i.turno} onChange={(v) => patch({ identificacaoCrianca: { ...i, turno: v } })} />
                </div>
              </div>
            </PpSectionShell>
          </>
        );
      case 'responsaveis':
        return (
          <PpSectionShell title="Responsáveis e contexto familiar">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <PpFieldLabel>Nome da mãe</PpFieldLabel>
                <PpInput value={r.nomeMae} onChange={(v) => patch({ responsaveisContextoFamiliar: { ...r, nomeMae: v } })} />
              </div>
              <div>
                <PpFieldLabel>Nascimento da mãe</PpFieldLabel>
                <PpInput type="date" value={r.dataNascimentoMae} onChange={(v) => patch({ responsaveisContextoFamiliar: { ...r, dataNascimentoMae: v } })} />
              </div>
              <div>
                <PpFieldLabel>Telefone da mãe</PpFieldLabel>
                <PpInput value={r.telefoneMae} onChange={(v) => patch({ responsaveisContextoFamiliar: { ...r, telefoneMae: v } })} />
              </div>
              <div>
                <PpFieldLabel>Profissão da mãe</PpFieldLabel>
                <PpInput value={r.profissaoMae} onChange={(v) => patch({ responsaveisContextoFamiliar: { ...r, profissaoMae: v } })} />
              </div>
              <div>
                <PpFieldLabel>Nome do pai</PpFieldLabel>
                <PpInput value={r.nomePai} onChange={(v) => patch({ responsaveisContextoFamiliar: { ...r, nomePai: v } })} />
              </div>
              <div>
                <PpFieldLabel>Nascimento do pai</PpFieldLabel>
                <PpInput type="date" value={r.dataNascimentoPai} onChange={(v) => patch({ responsaveisContextoFamiliar: { ...r, dataNascimentoPai: v } })} />
              </div>
              <div>
                <PpFieldLabel>Telefone do pai</PpFieldLabel>
                <PpInput value={r.telefonePai} onChange={(v) => patch({ responsaveisContextoFamiliar: { ...r, telefonePai: v } })} />
              </div>
              <div>
                <PpFieldLabel>Profissão do pai</PpFieldLabel>
                <PpInput value={r.profissaoPai} onChange={(v) => patch({ responsaveisContextoFamiliar: { ...r, profissaoPai: v } })} />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <PpTriState label="Pais casados?" value={r.paisCasados} onChange={(v) => patch({ responsaveisContextoFamiliar: { ...r, paisCasados: v } })} />
              <PpTriState label="Pais separados?" value={r.paisSeparados} onChange={(v) => patch({ responsaveisContextoFamiliar: { ...r, paisSeparados: v } })} />
              <PpTriState
                label="Boa relação padrasto/madrasta?"
                value={r.boaRelacaoPadrastoMadrasta}
                onChange={(v) => patch({ responsaveisContextoFamiliar: { ...r, boaRelacaoPadrastoMadrasta: v } })}
              />
            </div>
            <div>
              <PpFieldLabel>Nova estrutura familiar (descreva)</PpFieldLabel>
              <PpTextarea rows={3} value={r.novaEstruturaFamiliar} onChange={(v) => patch({ responsaveisContextoFamiliar: { ...r, novaEstruturaFamiliar: v } })} />
            </div>
            <div>
              <PpFieldLabel>Tipo de guarda</PpFieldLabel>
              <select
                className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm"
                value={r.tipoGuarda}
                onChange={(ev) =>
                  patch({ responsaveisContextoFamiliar: { ...r, tipoGuarda: ev.target.value as typeof r.tipoGuarda } })
                }
              >
                <option value="">Selecione</option>
                <option value="unilateral">Unilateral</option>
                <option value="compartilhada">Compartilhada</option>
                <option value="alternada">Alternada</option>
                <option value="provisoria">Provisória</option>
                <option value="definitiva">Definitiva</option>
              </select>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <PpTriState label="Possui irmãos?" value={r.possuiIrmaos} onChange={(v) => patch({ responsaveisContextoFamiliar: { ...r, possuiIrmaos: v } })} />
              <div>
                <PpFieldLabel>Quantidade de irmãos</PpFieldLabel>
                <PpInput value={r.quantidadeIrmaos} onChange={(v) => patch({ responsaveisContextoFamiliar: { ...r, quantidadeIrmaos: v } })} />
              </div>
            </div>
            <div>
              <PpFieldLabel>Com quem passa mais tempo</PpFieldLabel>
              <PpTextarea rows={2} value={r.comQuemPassaMaisTempo} onChange={(v) => patch({ responsaveisContextoFamiliar: { ...r, comQuemPassaMaisTempo: v } })} />
            </div>
          </PpSectionShell>
        );
      case 'queixa':
        return (
          <PpSectionShell title="Queixa principal e histórico da demanda">
            <div>
              <PpFieldLabel>Queixa principal</PpFieldLabel>
              <PpTextarea rows={4} minHeightClass="min-h-[120px]" value={q.queixaPrincipal} onChange={(v) => patch({ queixaHistorico: { ...q, queixaPrincipal: v } })} />
            </div>
            <div>
              <PpFieldLabel>Reforçadores / interesses</PpFieldLabel>
              <PpTextarea rows={3} value={q.reforcadoresInteresses} onChange={(v) => patch({ queixaHistorico: { ...q, reforcadoresInteresses: v } })} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <PpFieldLabel>Quando a dificuldade começou</PpFieldLabel>
                <PpInput value={q.quandoDificuldadeComecou} onChange={(v) => patch({ queixaHistorico: { ...q, quandoDificuldadeComecou: v } })} />
              </div>
              <div>
                <PpFieldLabel>Quem percebeu primeiro</PpFieldLabel>
                <PpInput value={q.quemPercebeuPrimeiro} onChange={(v) => patch({ queixaHistorico: { ...q, quemPercebeuPrimeiro: v } })} />
              </div>
            </div>
            <div>
              <PpFieldLabel>Como percebeu</PpFieldLabel>
              <PpTextarea rows={3} value={q.comoPercebeu} onChange={(v) => patch({ queixaHistorico: { ...q, comoPercebeu: v } })} />
            </div>
            <PpTriState label="Já buscou ajuda?" value={q.jaBuscouAjuda} onChange={(v) => patch({ queixaHistorico: { ...q, jaBuscouAjuda: v } })} />
            {q.jaBuscouAjuda === true ? (
              <div>
                <PpFieldLabel>Descrição da ajuda anterior</PpFieldLabel>
                <PpTextarea rows={3} value={q.ajudaAnteriorDescricao} onChange={(v) => patch({ queixaHistorico: { ...q, ajudaAnteriorDescricao: v } })} />
              </div>
            ) : null}
            <div>
              <PpFieldLabel>Prioridade da família</PpFieldLabel>
              <PpTextarea rows={2} value={q.prioridadeFamilia} onChange={(v) => patch({ queixaHistorico: { ...q, prioridadeFamilia: v } })} />
            </div>
          </PpSectionShell>
        );
      case 'escolar':
        return (
          <PpSectionShell title="Contexto escolar e aprendizagem">
            <div>
              <PpFieldLabel>Rotina escolar</PpFieldLabel>
              <PpTextarea rows={3} value={e.rotinaEscolar} onChange={(v) => patch({ contextoEscolarAprendizagem: { ...e, rotinaEscolar: v } })} />
            </div>
            <div>
              <PpFieldLabel>Áreas de maior dificuldade</PpFieldLabel>
              <PpTextarea rows={3} value={e.areasMaiorDificuldade} onChange={(v) => patch({ contextoEscolarAprendizagem: { ...e, areasMaiorDificuldade: v } })} />
            </div>
            <div>
              <PpFieldLabel>Dificuldade em casa igual à escola?</PpFieldLabel>
              <PpTextarea rows={2} value={e.dificuldadeEmCasaIgualEscola} onChange={(v) => patch({ contextoEscolarAprendizagem: { ...e, dificuldadeEmCasaIgualEscola: v } })} />
            </div>
            <div>
              <PpFieldLabel>Comportamento na lição de casa</PpFieldLabel>
              <PpTextarea rows={2} value={e.comportamentoLicaoCasa} onChange={(v) => patch({ contextoEscolarAprendizagem: { ...e, comportamentoLicaoCasa: v } })} />
            </div>
            <div>
              <PpFieldLabel>Reação da família ao comportamento</PpFieldLabel>
              <PpTextarea rows={2} value={e.reacaoFamiliaAoComportamento} onChange={(v) => patch({ contextoEscolarAprendizagem: { ...e, reacaoFamiliaAoComportamento: v } })} />
            </div>
            <PpTriState label="Contraturno?" value={e.contraturno} onChange={(v) => patch({ contextoEscolarAprendizagem: { ...e, contraturno: v } })} />
            {e.contraturno === true ? (
              <div>
                <PpFieldLabel>Observações do contraturno</PpFieldLabel>
                <PpTextarea rows={2} value={e.observacoesContraturno} onChange={(v) => patch({ contextoEscolarAprendizagem: { ...e, observacoesContraturno: v } })} />
              </div>
            ) : null}
            <PpTriState label="Atividade extracurricular?" value={e.atividadeExtracurricular} onChange={(v) => patch({ contextoEscolarAprendizagem: { ...e, atividadeExtracurricular: v } })} />
            {e.atividadeExtracurricular === true ? (
              <div>
                <PpFieldLabel>Descrição</PpFieldLabel>
                <PpTextarea rows={2} value={e.atividadeExtracurricularDescricao} onChange={(v) => patch({ contextoEscolarAprendizagem: { ...e, atividadeExtracurricularDescricao: v } })} />
              </div>
            ) : null}
            <div className="grid md:grid-cols-2 gap-3">
              <PpTriState label="Faz reforço escolar?" value={e.fazReforcoEscolar} onChange={(v) => patch({ contextoEscolarAprendizagem: { ...e, fazReforcoEscolar: v } })} />
              <PpTriState
                label="Desenvolvimento compatível com a idade?"
                value={e.desenvolvimentoCompativelIdade}
                onChange={(v) => patch({ contextoEscolarAprendizagem: { ...e, desenvolvimentoCompativelIdade: v } })}
              />
            </div>
            <div>
              <PpFieldLabel>Dificuldades pedagógicas principais</PpFieldLabel>
              <PpTextarea rows={3} value={e.dificuldadesPedagogicasPrincipais} onChange={(v) => patch({ contextoEscolarAprendizagem: { ...e, dificuldadesPedagogicasPrincipais: v } })} />
            </div>
            <div>
              <PpFieldLabel>Opinião da família sobre a escola</PpFieldLabel>
              <PpTextarea rows={3} value={e.opiniaoFamiliaSobreEscola} onChange={(v) => patch({ contextoEscolarAprendizagem: { ...e, opiniaoFamiliaSobreEscola: v } })} />
            </div>
          </PpSectionShell>
        );
      case 'comunicacao':
        return (
          <PpSectionShell title="Comunicação, linguagem e aspectos cognitivos">
            <div>
              <PpFieldLabel>Verbal (descrição)</PpFieldLabel>
              <PpTextarea rows={2} value={co.verbal} onChange={(v) => patch({ comunicacaoLinguagemCognitivo: { ...co, verbal: v } })} />
            </div>
            <div className="grid md:grid-cols-3 gap-2">
              {(
                [
                  ['interageBem', 'Interage bem'],
                  ['contatoVisualAoSerChamado', 'Contato visual ao ser chamado(a)'],
                  ['sabeNome', 'Sabe o nome'],
                  ['sabeVogais', 'Sabe vogais'],
                  ['sabeCores', 'Sabe cores'],
                  ['sabeAlfabeto', 'Sabe alfabeto'],
                  ['sabeNumerais', 'Sabe numerais'],
                  ['sabeNomeResponsaveis', 'Sabe nome dos responsáveis'],
                  ['atendeComandos', 'Atende comandos'],
                  ['nomeiaObjetos', 'Nomeia objetos'],
                  ['identificaFiguras', 'Identifica figuras'],
                  ['nomeiaAnimais', 'Nomeia animais'],
                  ['reconheceEmocoes', 'Reconhece emoções'],
                  ['sabeSeExpressar', 'Sabe se expressar'],
                  ['falaOutraLingua', 'Fala outra língua'],
                  ['compreendeFalaOutros', 'Compreende fala de outros'],
                ] as const
              ).map(([key, label]) => (
                <PpTriState
                  key={key}
                  label={label}
                  value={co[key] as boolean | null}
                  onChange={(v) => patch({ comunicacaoLinguagemCognitivo: { ...co, [key]: v } })}
                />
              ))}
            </div>
            {co.falaOutraLingua === true ? (
              <div>
                <PpFieldLabel>Qual outra língua?</PpFieldLabel>
                <PpInput value={co.qualOutraLingua} onChange={(v) => patch({ comunicacaoLinguagemCognitivo: { ...co, qualOutraLingua: v } })} />
              </div>
            ) : null}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <PpFieldLabel>Balbucio (idade)</PpFieldLabel>
                <PpInput value={co.balbucioIdade} onChange={(v) => patch({ comunicacaoLinguagemCognitivo: { ...co, balbucioIdade: v } })} />
              </div>
              <div>
                <PpFieldLabel>Primeiras palavras</PpFieldLabel>
                <PpInput value={co.primeirasPalavras} onChange={(v) => patch({ comunicacaoLinguagemCognitivo: { ...co, primeirasPalavras: v } })} />
              </div>
              <div>
                <PpFieldLabel>Idade das primeiras palavras</PpFieldLabel>
                <PpInput value={co.idadePrimeirasPalavras} onChange={(v) => patch({ comunicacaoLinguagemCognitivo: { ...co, idadePrimeirasPalavras: v } })} />
              </div>
            </div>
            <div>
              <PpFieldLabel>Cor preferida</PpFieldLabel>
              <PpInput value={co.corPreferida} onChange={(v) => patch({ comunicacaoLinguagemCognitivo: { ...co, corPreferida: v } })} />
            </div>
            <div>
              <PpFieldLabel>Dificuldades na comunicação oral</PpFieldLabel>
              <div className="grid sm:grid-cols-2 gap-1 bg-white rounded-xl border border-slate-200 p-3">
                {DIFICULDADES_COMUNICACAO_ORAL_IDS.map((id) => (
                  <PpCheckboxRow
                    key={id}
                    label={labelMapCom[id]}
                    checked={co.dificuldadesComunicacaoOral.includes(id)}
                    onChange={(ck) =>
                      patch({
                        comunicacaoLinguagemCognitivo: {
                          ...co,
                          dificuldadesComunicacaoOral: toggleInList(co.dificuldadesComunicacaoOral, id, ck),
                        },
                      })
                    }
                  />
                ))}
              </div>
            </div>
            {co.dificuldadesComunicacaoOral.includes('outra') ? (
              <div>
                <PpFieldLabel>Descreva “outra” dificuldade oral</PpFieldLabel>
                <PpInput value={co.dificuldadesComunicacaoOralOutra} onChange={(v) => patch({ comunicacaoLinguagemCognitivo: { ...co, dificuldadesComunicacaoOralOutra: v } })} />
              </div>
            ) : null}
            <div>
              <PpFieldLabel>Observações de comunicação</PpFieldLabel>
              <PpTextarea rows={4} minHeightClass="min-h-[120px]" value={co.observacoesComunicacao} onChange={(v) => patch({ comunicacaoLinguagemCognitivo: { ...co, observacoesComunicacao: v } })} />
            </div>
          </PpSectionShell>
        );
      case 'comportamento':
        return (
          <PpSectionShell title="Comportamento, interação e regulação">
            <div className="grid md:grid-cols-2 gap-3">
              <PpTriState label="Pratica esportes?" value={b.praticaEsportes} onChange={(v) => patch({ comportamentoInteracaoRegulacao: { ...b, praticaEsportes: v } })} />
              {b.praticaEsportes === true ? (
                <div className="md:col-span-2">
                  <PpFieldLabel>Descrição</PpFieldLabel>
                  <PpTextarea rows={2} value={b.praticaEsportesDescricao} onChange={(v) => patch({ comportamentoInteracaoRegulacao: { ...b, praticaEsportesDescricao: v } })} />
                </div>
              ) : null}
              <PpTriState label="Seletividade alimentar?" value={b.seletividadeAlimentar} onChange={(v) => patch({ comportamentoInteracaoRegulacao: { ...b, seletividadeAlimentar: v } })} />
              {b.seletividadeAlimentar === true ? (
                <div className="md:col-span-2">
                  <PpFieldLabel>Descrição</PpFieldLabel>
                  <PpTextarea rows={2} value={b.seletividadeAlimentarDescricao} onChange={(v) => patch({ comportamentoInteracaoRegulacao: { ...b, seletividadeAlimentarDescricao: v } })} />
                </div>
              ) : null}
            </div>
            <div className="grid md:grid-cols-3 gap-2">
              {(
                [
                  ['brincaComFuncao', 'Brinca com função'],
                  ['resistenciaMaterial', 'Resistência a materiais'],
                  ['estereotipias', 'Estereotipias'],
                  ['ecolalia', 'Ecolalia'],
                  ['fixacoes', 'Fixações'],
                  ['dificuldadeMotora', 'Dificuldade motora'],
                  ['identificaPartesCorpo', 'Identifica partes do corpo'],
                  ['gostaMusica', 'Gosta de música'],
                  ['gostaDesenhar', 'Gosta de desenhar'],
                  ['assisteDesenho', 'Assiste desenho'],
                  ['autoagressao', 'Autoagressão'],
                  ['agressividadeOutros', 'Agressividade com outros'],
                  ['gostaAnimais', 'Gosta de animais'],
                ] as const
              ).map(([key, label]) => (
                <PpTriState
                  key={key}
                  label={label}
                  value={b[key] as boolean | null}
                  onChange={(v) => patch({ comportamentoInteracaoRegulacao: { ...b, [key]: v } })}
                />
              ))}
            </div>
            {b.gostaMusica === true ? (
              <div>
                <PpFieldLabel>Música predileta</PpFieldLabel>
                <PpInput value={b.musicaPredileta} onChange={(v) => patch({ comportamentoInteracaoRegulacao: { ...b, musicaPredileta: v } })} />
              </div>
            ) : null}
            {b.gostaDesenhar === true ? (
              <div>
                <PpFieldLabel>O que gosta de desenhar</PpFieldLabel>
                <PpInput value={b.gostaDesenharOQue} onChange={(v) => patch({ comportamentoInteracaoRegulacao: { ...b, gostaDesenharOQue: v } })} />
              </div>
            ) : null}
            {b.assisteDesenho === true ? (
              <div>
                <PpFieldLabel>Quais desenhos</PpFieldLabel>
                <PpTextarea rows={2} value={b.quaisDesenhos} onChange={(v) => patch({ comportamentoInteracaoRegulacao: { ...b, quaisDesenhos: v } })} />
              </div>
            ) : null}
            {b.agressividadeOutros === true ? (
              <div>
                <PpFieldLabel>Contexto da agressividade</PpFieldLabel>
                <PpTextarea rows={2} value={b.agressividadeContexto} onChange={(v) => patch({ comportamentoInteracaoRegulacao: { ...b, agressividadeContexto: v } })} />
              </div>
            ) : null}
            <div>
              <PpFieldLabel>Sensibilidade sensorial</PpFieldLabel>
              <PpTextarea rows={2} value={b.sensibilidadeSensorial} onChange={(v) => patch({ comportamentoInteracaoRegulacao: { ...b, sensibilidadeSensorial: v } })} />
            </div>
            <div>
              <PpFieldLabel>Resistência a algo</PpFieldLabel>
              <PpTextarea rows={2} value={b.resistenciaAAlgo} onChange={(v) => patch({ comportamentoInteracaoRegulacao: { ...b, resistenciaAAlgo: v } })} />
            </div>
            <div>
              <PpFieldLabel>Medo de algo</PpFieldLabel>
              <PpTextarea rows={2} value={b.medoDeAlgo} onChange={(v) => patch({ comportamentoInteracaoRegulacao: { ...b, medoDeAlgo: v } })} />
            </div>
            <div>
              <PpFieldLabel>Perfil comportamental</PpFieldLabel>
              <div className="grid sm:grid-cols-2 gap-1 bg-white rounded-xl border border-slate-200 p-3">
                {PERFIL_COMPORTAMENTAL_IDS.map((id) => (
                  <PpCheckboxRow
                    key={id}
                    label={labelMapPerfil[id]}
                    checked={b.perfilComportamental.includes(id)}
                    onChange={(ck) =>
                      patch({
                        comportamentoInteracaoRegulacao: {
                          ...b,
                          perfilComportamental: toggleInList(b.perfilComportamental, id, ck),
                        },
                      })
                    }
                  />
                ))}
              </div>
            </div>
            <div>
              <PpFieldLabel>Qualidades da criança</PpFieldLabel>
              <PpTextarea rows={2} value={b.qualidadesDaCrianca} onChange={(v) => patch({ comportamentoInteracaoRegulacao: { ...b, qualidadesDaCrianca: v } })} />
            </div>
            <div>
              <PpFieldLabel>O que mais gosta de fazer</PpFieldLabel>
              <PpTextarea rows={2} value={b.oQueMaisGostaDeFazer} onChange={(v) => patch({ comportamentoInteracaoRegulacao: { ...b, oQueMaisGostaDeFazer: v } })} />
            </div>
            <div>
              <PpFieldLabel>Dificuldade de interação social</PpFieldLabel>
              <PpTextarea rows={2} value={b.dificuldadeInteracaoSocial} onChange={(v) => patch({ comportamentoInteracaoRegulacao: { ...b, dificuldadeInteracaoSocial: v } })} />
            </div>
            <div>
              <PpFieldLabel>Observações comportamentais</PpFieldLabel>
              <PpTextarea rows={4} minHeightClass="min-h-[120px]" value={b.observacoesComportamentais} onChange={(v) => patch({ comportamentoInteracaoRegulacao: { ...b, observacoesComportamentais: v } })} />
            </div>
          </PpSectionShell>
        );
      case 'autonomia':
        return (
          <PpSectionShell title="Autonomia e atividades de vida diária">
            <div className="grid md:grid-cols-3 gap-2">
              <PpTriState label="Usa fralda?" value={au.usaFralda} onChange={(v) => patch({ autonomiaVidaDiaria: { ...au, usaFralda: v } })} />
              <PpTriState label="Pede banheiro?" value={au.pedeBanheiro} onChange={(v) => patch({ autonomiaVidaDiaria: { ...au, pedeBanheiro: v } })} />
              <PpTriState label="Calça sapatos?" value={au.calcaSapatos} onChange={(v) => patch({ autonomiaVidaDiaria: { ...au, calcaSapatos: v } })} />
              <PpTriState label="Veste sozinho(a)?" value={au.vesteSozinho} onChange={(v) => patch({ autonomiaVidaDiaria: { ...au, vesteSozinho: v } })} />
              <PpTriState label="Come sozinho(a)?" value={au.comeSozinho} onChange={(v) => patch({ autonomiaVidaDiaria: { ...au, comeSozinho: v } })} />
              <PpTriState label="Criança desastrada?" value={au.criancaDesastrada} onChange={(v) => patch({ autonomiaVidaDiaria: { ...au, criancaDesastrada: v } })} />
              <PpTriState label="Noção de perigo?" value={au.nocaoPerigo} onChange={(v) => patch({ autonomiaVidaDiaria: { ...au, nocaoPerigo: v } })} />
            </div>
            <div>
              <PpFieldLabel>Controle de esfíncteres (descreva)</PpFieldLabel>
              <PpTextarea rows={2} value={au.controleEsfincteres} onChange={(v) => patch({ autonomiaVidaDiaria: { ...au, controleEsfincteres: v } })} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <PpFieldLabel>Enurese</PpFieldLabel>
                <select
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm"
                  value={au.enurese}
                  onChange={(ev) => patch({ autonomiaVidaDiaria: { ...au, enurese: ev.target.value as typeof au.enurese } })}
                >
                  <option value="">Selecione</option>
                  <option value="diurna">Diurna</option>
                  <option value="noturna">Noturna</option>
                  <option value="nao_apresenta">Não apresenta</option>
                </select>
              </div>
              <div>
                <PpFieldLabel>Encoprese</PpFieldLabel>
                <select
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm"
                  value={au.encoprese}
                  onChange={(ev) => patch({ autonomiaVidaDiaria: { ...au, encoprese: ev.target.value as typeof au.encoprese } })}
                >
                  <option value="">Selecione</option>
                  <option value="sim">Sim</option>
                  <option value="nao_apresenta">Não apresenta</option>
                </select>
              </div>
            </div>
            <div>
              <PpFieldLabel>Autonomia em atividades (descreva)</PpFieldLabel>
              <PpTextarea rows={3} value={au.autonomiaAtividades} onChange={(v) => patch({ autonomiaVidaDiaria: { ...au, autonomiaAtividades: v } })} />
            </div>
            <div>
              <PpFieldLabel>Nível geral de autonomia</PpFieldLabel>
              <PpTextarea rows={2} value={au.nivelAutonomiaGeral} onChange={(v) => patch({ autonomiaVidaDiaria: { ...au, nivelAutonomiaGeral: v } })} />
            </div>
            <div>
              <PpFieldLabel>Observações</PpFieldLabel>
              <PpTextarea rows={3} value={au.observacoesAutonomia} onChange={(v) => patch({ autonomiaVidaDiaria: { ...au, observacoesAutonomia: v } })} />
            </div>
          </PpSectionShell>
        );
      case 'rotina':
        return (
          <PpSectionShell title="Rotina, sono e hábitos">
            <div>
              <PpFieldLabel>Rotina detalhada (semana e fim de semana)</PpFieldLabel>
              <PpTextarea rows={5} minHeightClass="min-h-[140px]" value={ro.rotinaDetalhadaSemanaFimSemana} onChange={(v) => patch({ rotinaSonoHabitos: { ...ro, rotinaDetalhadaSemanaFimSemana: v } })} />
            </div>
            <div className="grid md:grid-cols-3 gap-2">
              <PpTriState label="Sono satisfatório?" value={ro.sonoSatisfatorio} onChange={(v) => patch({ rotinaSonoHabitos: { ...ro, sonoSatisfatorio: v } })} />
              <PpTriState label="Sono tranquilo?" value={ro.sonoTranquilo} onChange={(v) => patch({ rotinaSonoHabitos: { ...ro, sonoTranquilo: v } })} />
              <PpTriState label="Sono agitado?" value={ro.sonoAgitado} onChange={(v) => patch({ rotinaSonoHabitos: { ...ro, sonoAgitado: v } })} />
              <PpTriState label="Sonâmbulo?" value={ro.sonambulo} onChange={(v) => patch({ rotinaSonoHabitos: { ...ro, sonambulo: v } })} />
              <PpTriState label="Acorda cansado(a)?" value={ro.acordaCansado} onChange={(v) => patch({ rotinaSonoHabitos: { ...ro, acordaCansado: v } })} />
              <PpTriState label="Dorme sozinho(a)?" value={ro.dormeSozinha} onChange={(v) => patch({ rotinaSonoHabitos: { ...ro, dormeSozinha: v } })} />
              <PpTriState label="Dorme em quarto separado?" value={ro.dormeQuartoSeparado} onChange={(v) => patch({ rotinaSonoHabitos: { ...ro, dormeQuartoSeparado: v } })} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <PpFieldLabel>Onde dorme</PpFieldLabel>
                <PpInput value={ro.ondeDorme} onChange={(v) => patch({ rotinaSonoHabitos: { ...ro, ondeDorme: v } })} />
              </div>
              <div>
                <PpFieldLabel>Com quem dorme</PpFieldLabel>
                <PpInput value={ro.comQuemDorme} onChange={(v) => patch({ rotinaSonoHabitos: { ...ro, comQuemDorme: v } })} />
              </div>
            </div>
            <div>
              <PpFieldLabel>Tempo de telas por dia</PpFieldLabel>
              <PpInput value={ro.tempoTelasPorDia} onChange={(v) => patch({ rotinaSonoHabitos: { ...ro, tempoTelasPorDia: v } })} />
            </div>
          </PpSectionShell>
        );
      case 'gestacao':
        return (
          <PpSectionShell title="Gestação, parto e desenvolvimento">
            <div className="grid md:grid-cols-3 gap-2">
              <PpTriState label="Gravidez planejada?" value={ge.gravidezPlanejada} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, gravidezPlanejada: v } })} />
              <PpTriState label="Gravidez desejada?" value={ge.gravidezDesejada} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, gravidezDesejada: v } })} />
              <PpTriState label="Gravidez tranquila?" value={ge.gravidezTranquila} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, gravidezTranquila: v } })} />
              <PpTriState label="Gravidez não planejada?" value={ge.gravidezNaoPlanejada} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, gravidezNaoPlanejada: v } })} />
              <PpTriState label="Gravidez indesejada?" value={ge.gravidezIndesejada} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, gravidezIndesejada: v } })} />
              <PpTriState label="Medicação na gravidez?" value={ge.medicacaoNaGravidez} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, medicacaoNaGravidez: v } })} />
              {ge.medicacaoNaGravidez === true ? (
                <div className="md:col-span-3">
                  <PpFieldLabel>Descrição da medicação</PpFieldLabel>
                  <PpTextarea rows={2} value={ge.medicacaoNaGravidezDescricao} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, medicacaoNaGravidezDescricao: v } })} />
                </div>
              ) : null}
              <PpTriState label="Pais parentes em algum grau?" value={ge.paisParentesAlgumGrau} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, paisParentesAlgumGrau: v } })} />
            </div>
            <div>
              <PpFieldLabel>Observações da gravidez</PpFieldLabel>
              <PpTextarea rows={3} value={ge.observacoesGravidez} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, observacoesGravidez: v } })} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <PpFieldLabel>Tipo de parto</PpFieldLabel>
                <select
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm"
                  value={ge.partoTipo}
                  onChange={(ev) => patch({ gestacaoPartoDesenvolvimento: { ...ge, partoTipo: ev.target.value as typeof ge.partoTipo } })}
                >
                  <option value="">Selecione</option>
                  <option value="cesarea">Cesárea</option>
                  <option value="normal">Normal</option>
                </select>
              </div>
              <div>
                <PpFieldLabel>Intercorrências do parto</PpFieldLabel>
                <PpTextarea rows={2} value={ge.intercorrenciasParto} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, intercorrenciasParto: v } })} />
              </div>
            </div>
            <div>
              <PpFieldLabel>Perfil do bebê / infância</PpFieldLabel>
              <PpTextarea rows={3} value={ge.perfilBebeInfancia} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, perfilBebeInfancia: v } })} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <PpFieldLabel>Amamentação</PpFieldLabel>
                <PpInput value={ge.amamentacao} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, amamentacao: v } })} />
              </div>
              <div>
                <PpFieldLabel>Dificuldade na amamentação</PpFieldLabel>
                <PpInput value={ge.dificuldadeAmamentacao} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, dificuldadeAmamentacao: v } })} />
              </div>
              <div>
                <PpFieldLabel>Tempo de amamentação</PpFieldLabel>
                <PpInput value={ge.tempoAmamentacao} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, tempoAmamentacao: v } })} />
              </div>
              <div>
                <PpFieldLabel>Complemento alimentar inicial</PpFieldLabel>
                <PpInput value={ge.complementoAlimentarInicial} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, complementoAlimentarInicial: v } })} />
              </div>
            </div>
            <PpTriState label="Usou chupeta / dedo / mamadeira?" value={ge.usouChupetaDedoMamadeira} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, usouChupetaDedoMamadeira: v } })} />
            {ge.usouChupetaDedoMamadeira === true ? (
              <div>
                <PpFieldLabel>Detalhes</PpFieldLabel>
                <PpTextarea rows={2} value={ge.detalhesChupetaDedoMamadeira} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, detalhesChupetaDedoMamadeira: v } })} />
              </div>
            ) : null}
            <PpTriState label="Restrição alimentar?" value={ge.restricaoAlimentar} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, restricaoAlimentar: v } })} />
            {ge.restricaoAlimentar === true ? (
              <div>
                <PpFieldLabel>Descrição</PpFieldLabel>
                <PpTextarea rows={2} value={ge.restricaoAlimentarDescricao} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, restricaoAlimentarDescricao: v } })} />
              </div>
            ) : null}
            <PpTriState label="Engatinhou?" value={ge.engatinhou} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, engatinhou: v } })} />
            <div>
              <PpFieldLabel>Andou com quantos meses</PpFieldLabel>
              <PpInput value={ge.andouComQuantosMeses} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, andouComQuantosMeses: v } })} />
            </div>
            <div>
              <PpFieldLabel>Quando perceberam desvio no desenvolvimento</PpFieldLabel>
              <PpTextarea rows={2} value={ge.quandoPerceberamDesvioDesenvolvimento} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, quandoPerceberamDesvioDesenvolvimento: v } })} />
            </div>
            <div>
              <PpFieldLabel>Quem observou primeiro</PpFieldLabel>
              <PpInput value={ge.quemObservouPrimeiro} onChange={(v) => patch({ gestacaoPartoDesenvolvimento: { ...ge, quemObservouPrimeiro: v } })} />
            </div>
          </PpSectionShell>
        );
      case 'saude':
        return (
          <PpSectionShell title="Saúde e acompanhamentos">
            <div className="grid md:grid-cols-2 gap-3">
              <PpTriState label="Vacinação atualizada?" value={sa.vacinacaoAtualizada} onChange={(v) => patch({ saudeAcompanhamentos: { ...sa, vacinacaoAtualizada: v } })} />
              <PpTriState label="Internação prévia?" value={sa.internacaoPrevia} onChange={(v) => patch({ saudeAcompanhamentos: { ...sa, internacaoPrevia: v } })} />
              {sa.internacaoPrevia === true ? (
                <div className="md:col-span-2">
                  <PpFieldLabel>Descrição</PpFieldLabel>
                  <PpTextarea rows={2} value={sa.internacaoDescricao} onChange={(v) => patch({ saudeAcompanhamentos: { ...sa, internacaoDescricao: v } })} />
                </div>
              ) : null}
              <PpTriState label="Acidente ou cirurgia?" value={sa.acidenteOuCirurgia} onChange={(v) => patch({ saudeAcompanhamentos: { ...sa, acidenteOuCirurgia: v } })} />
              {sa.acidenteOuCirurgia === true ? (
                <div className="md:col-span-2">
                  <PpFieldLabel>Descrição</PpFieldLabel>
                  <PpTextarea rows={2} value={sa.acidenteOuCirurgiaDescricao} onChange={(v) => patch({ saudeAcompanhamentos: { ...sa, acidenteOuCirurgiaDescricao: v } })} />
                </div>
              ) : null}
            </div>
            <div>
              <PpFieldLabel>Histórico de saúde (marcadores)</PpFieldLabel>
              <div className="grid sm:grid-cols-2 gap-1 bg-white rounded-xl border border-slate-200 p-3">
                {HISTORICO_SAUDE_CHECKBOX_IDS.map((id) => (
                  <PpCheckboxRow
                    key={id}
                    label={labelMapSaude[id]}
                    checked={sa.historicoSaudeCheckbox.includes(id)}
                    onChange={(ck) =>
                      patch({
                        saudeAcompanhamentos: {
                          ...sa,
                          historicoSaudeCheckbox: toggleInList(sa.historicoSaudeCheckbox, id, ck),
                        },
                      })
                    }
                  />
                ))}
              </div>
            </div>
            <div>
              <PpFieldLabel>Profissionais que acompanham</PpFieldLabel>
              <PpTextarea rows={3} value={sa.profissionaisQueAcompanham} onChange={(v) => patch({ saudeAcompanhamentos: { ...sa, profissionaisQueAcompanham: v } })} />
            </div>
            <PpTriState
              label="Tratamento prévio (saúde mental / reabilitação)?"
              value={sa.tratamentoPrevioSaudeMentalOuReabilitacao}
              onChange={(v) => patch({ saudeAcompanhamentos: { ...sa, tratamentoPrevioSaudeMentalOuReabilitacao: v } })}
            />
            {sa.tratamentoPrevioSaudeMentalOuReabilitacao === true ? (
              <div>
                <PpFieldLabel>Descrição</PpFieldLabel>
                <PpTextarea rows={3} value={sa.tratamentoPrevioDescricao} onChange={(v) => patch({ saudeAcompanhamentos: { ...sa, tratamentoPrevioDescricao: v } })} />
              </div>
            ) : null}
            <PpTriState label="Existe outro problema de saúde?" value={sa.existeOutroProblema} onChange={(v) => patch({ saudeAcompanhamentos: { ...sa, existeOutroProblema: v } })} />
            {sa.existeOutroProblema === true ? (
              <div>
                <PpFieldLabel>Descrição</PpFieldLabel>
                <PpTextarea rows={2} value={sa.outroProblemaDescricao} onChange={(v) => patch({ saudeAcompanhamentos: { ...sa, outroProblemaDescricao: v } })} />
              </div>
            ) : null}
            <div>
              <PpFieldLabel>Antecedentes familiares (saúde / aprendizagem)</PpFieldLabel>
              <PpTextarea rows={3} value={sa.antecedentesFamiliaresSaudeAprendizagem} onChange={(v) => patch({ saudeAcompanhamentos: { ...sa, antecedentesFamiliaresSaudeAprendizagem: v } })} />
            </div>
            <PpTriState label="Atendido por profissional CAEE?" value={sa.atendidoPorProfissionalCaee} onChange={(v) => patch({ saudeAcompanhamentos: { ...sa, atendidoPorProfissionalCaee: v } })} />
            <div>
              <PpFieldLabel>Expectativas da família quanto ao trabalho CAEE</PpFieldLabel>
              <PpTextarea rows={3} value={sa.expectativasFamiliaTrabalhoCaee} onChange={(v) => patch({ saudeAcompanhamentos: { ...sa, expectativasFamiliaTrabalhoCaee: v } })} />
            </div>
          </PpSectionShell>
        );
      case 'fechamento':
        return (
          <PpSectionShell title="Fechamento">
            <div>
              <PpFieldLabel>Gostaria de acrescentar algo?</PpFieldLabel>
              <PpTextarea rows={4} value={fe.gostariaAcrescentarAlgo} onChange={(v) => patch({ fechamento: { ...fe, gostariaAcrescentarAlgo: v } })} />
            </div>
            <div>
              <PpFieldLabel>Realizada com</PpFieldLabel>
              <PpInput value={fe.realizadaCom} onChange={(v) => patch({ fechamento: { ...fe, realizadaCom: v } })} placeholder="Ex.: mãe e criança" />
            </div>
            <div>
              <PpFieldLabel>Observações finais (psicopedagoga)</PpFieldLabel>
              <PpTextarea rows={5} minHeightClass="min-h-[140px]" value={fe.observacoesFinaisPsicopedagoga} onChange={(v) => patch({ fechamento: { ...fe, observacoesFinaisPsicopedagoga: v } })} />
            </div>
            {data.legacy?.notasMigracao ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900">
                <strong>Notas de migração:</strong> {data.legacy.notasMigracao}
              </div>
            ) : null}
          </PpSectionShell>
        );
      default:
        return null;
    }
  }, [
    active,
    i,
    r,
    q,
    e,
    co,
    b,
    au,
    ro,
    ge,
    sa,
    fe,
    patch,
    labelMapCom,
    labelMapPerfil,
    labelMapSaude,
    data.legacy,
  ]);

  return (
    <div className="pb-28 animate-fadeIn space-y-4">
      {onCadastroSync ? (
        <div className="w-full">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-600 leading-relaxed">
                Dados básicos carregados do cadastro do aluno (identificação, responsáveis e vínculo escolar do
                cadastro). A sincronização manual não altera queixa, contexto escolar detalhado, comunicação,
                comportamento nem demais campos clínicos.
              </p>
              {ultimaSincCadastro ? (
                <p className="text-[11px] text-slate-500 mt-1.5">Última sincronização com o cadastro: {ultimaSincCadastro}</p>
              ) : null}
            </div>
            <div className="relative shrink-0" ref={cadastroMenuRef}>
              <button
                type="button"
                onClick={() => setCadastroMenuOpen((o) => !o)}
                className="inline-flex items-center gap-2 text-xs font-bold bg-white border border-pink-300 text-pink-800 px-3 py-2 rounded-xl hover:bg-pink-50 whitespace-nowrap"
              >
                <RefreshCw size={14} className="shrink-0" />
                Atualizar do cadastro
                <ChevronDown size={14} className={`shrink-0 transition-transform ${cadastroMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {cadastroMenuOpen ? (
                <div className="absolute right-0 z-20 mt-1 w-72 rounded-xl border border-slate-200 bg-white shadow-lg py-1 text-left">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2.5 text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      onCadastroSync('manualFillEmpty');
                      setCadastroMenuOpen(false);
                    }}
                  >
                    Preencher apenas campos vazios
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2.5 text-xs text-slate-700 hover:bg-slate-50 border-t border-slate-100"
                    onClick={() => {
                      const ok = window.confirm(
                        'Substituir na ficha os dados básicos (identificação, responsáveis e escola/turma/turno do cadastro) pelos valores atuais do cadastro do aluno? Campos já preenchidos nessas áreas serão sobrescritos. Campos clínicos das outras seções não serão alterados.'
                      );
                      if (ok) {
                        onCadastroSync('manualOverwriteBasics');
                        setCadastroMenuOpen(false);
                      }
                    }}
                  >
                    Sobrescrever dados básicos com o cadastro atual…
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex flex-col lg:flex-row gap-0 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      <aside className="lg:w-52 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/60">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <User size={15} className="text-[#8B1A3A]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Seções</span>
        </div>
        <nav className="max-h-[60vh] overflow-y-auto">
          {SECTIONS.map((s, idx) => {
            const isCompleted = checkSectionCompletion(s.id);
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                className={`w-full text-left px-4 py-2.5 text-xs transition-all flex items-center gap-2.5 ${
                  isActive
                    ? 'border-l-[3px] border-[#8B1A3A] bg-[#fdf8f9] text-[#8B1A3A] font-bold'
                    : 'border-l-[3px] border-transparent text-slate-500 hover:bg-white font-medium'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                  isActive
                    ? 'bg-[#8B1A3A] text-white'
                    : isCompleted
                    ? 'bg-[#EAF3DE] text-[#3B6D11]'
                    : 'bg-white border border-slate-200 text-slate-400'
                }`}>
                  {isCompleted && !isActive ? <Check size={9} /> : idx + 1}
                </span>
                {s.title}
              </button>
            );
          })}
        </nav>
      </aside>
      <div 
        className="flex-1 min-w-0 p-5"
        onKeyDown={(e) => {
          if (e.key === 'Tab' && !e.shiftKey) {
            const focusables = Array.from(e.currentTarget.querySelectorAll('input:not([disabled]), textarea:not([disabled]), select:not([disabled])')) as HTMLElement[];
            if (focusables.length > 0) {
              const last = focusables[focusables.length - 1];
              if (document.activeElement === last) {
                e.preventDefault();
                const idx = SECTIONS.findIndex(s => s.id === active);
                if (idx < SECTIONS.length - 1) setActive(SECTIONS[idx + 1].id);
              }
            }
          }
        }}
      >
        <div className={`mb-4 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
            saveStatus === 'saving' ? 'bg-[#E6F1FB] text-[#185FA5] border-[#B3D4F2]' :
            saveStatus === 'error'  ? 'bg-[#FCEBEB] text-[#A32D2D] border-[#F09595]' :
            'bg-[#EAF3DE] text-[#3B6D11] border-[#97C459]'
          }`}>
            <span>{saveStatus === 'saving' ? '⏳ Salvando...' : saveStatus === 'error' ? '❌ Erro ao salvar' : `✓ Salvo automaticamente${lastSaveTime ? ` às ${lastSaveTime}` : ''}`}</span>
          </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{completedSections.length} de {SECTIONS.length} seções preenchidas</p>
            <span className="text-[10px] font-black text-[#10B981]">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div className="bg-[#10B981] h-2 rounded-full transition-all duration-500" style={{ width: `${completionPercentage}%` }}></div>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Anamnese psicopedagógica</p>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{student.fullName}</h2>
          <p className="text-sm text-slate-500 mt-1">Ficha estruturada (v3) — preencha por seções; o salvamento automático está ativado.</p>
        </div>
        {main}
        
        <p className="text-right text-[10px] font-bold text-slate-400 mt-2">Dica: pressione Tab no último campo para avançar de seção</p>
        
        <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            disabled={SECTIONS.findIndex(s => s.id === active) === 0}
            onClick={() => {
              const idx = SECTIONS.findIndex(s => s.id === active);
              if (idx > 0) setActive(SECTIONS[idx - 1].id);
            }}
            className="px-4 py-2 flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={14} /> Seção anterior
          </button>
          
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Seção {SECTIONS.findIndex(s => s.id === active) + 1} de {SECTIONS.length}
          </span>
          
          <button
            type="button"
            disabled={SECTIONS.findIndex(s => s.id === active) === SECTIONS.length - 1}
            onClick={() => {
              const idx = SECTIONS.findIndex(s => s.id === active);
              if (idx < SECTIONS.length - 1) setActive(SECTIONS[idx + 1].id);
            }}
            className="px-4 py-2 flex items-center gap-2 text-xs font-bold text-white bg-[#8B1A3A] rounded-xl hover:bg-[#731530] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Próxima seção <ArrowRight size={14} />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

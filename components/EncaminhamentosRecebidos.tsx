import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
import {
  FileText, ArrowLeft, Eye, Search, Loader2, Info, Check,
  ChevronDown, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EncaminhamentosRecebidosProps {
  currentUser: User;
}

interface RelatorioRow {
  id: string;
  codigo: string;
  status: string;
  enviado_em: string | null;
  created_at: string;
  observacoes_aluno: string | null;
  impacto_aprendizagem: string | null;
  intervencoes_familia: string | null;
  motivo_encaminhamento: string | null;
  aspectos_desenvolvimento: Record<string, string[]> | null;
  informacoes_complementares: string | null;
  profissionais_solicitados: string[];
  possui_laudo: boolean;
  diagnostico: string | null;
  atendimento_externo: string | null;
  nome_preenchedor: string | null;
  cargo_preenchedor: string | null;
  student: { id: string; full_name: string } | null;
  school: { id: string; name: string } | null;
}

const ASPECTOS_CONFIG: Record<string, string[]> = {
  'Linguagem e Comunicação': [
    'Dificuldade na fala/articulação', 'Vocabulário limitado para a idade',
    'Dificuldade na compreensão de comandos', 'Dificuldade na expressão oral',
    'Não se comunica verbalmente'
  ],
  'Leitura e Escrita': [
    'Não reconhece letras', 'Não associa letra/som',
    'Dificuldade na leitura de palavras/frases', 'Dificuldade na interpretação de textos',
    'Dificuldade na produção escrita', 'Troca/omissão de letras'
  ],
  'Raciocínio Lógico-Matemático': [
    'Dificuldade no reconhecimento de números', 'Dificuldade nas operações básicas',
    'Dificuldade na resolução de problemas', 'Dificuldade na noção de quantidade'
  ],
  'Comportamento e Socialização': [
    'Agitação/hiperatividade', 'Dificuldade em seguir regras', 'Agressividade',
    'Isolamento social', 'Choro frequente', 'Dificuldade em manter atenção/concentração',
    'Comportamento opositor/desafiador'
  ],
  'Desenvolvimento Motor': [
    'Dificuldade na coordenação motora fina', 'Dificuldade na coordenação motora grossa',
    'Dificuldade no manuseio do lápis/tesoura'
  ],
  'Autonomia e Vida Diária': [
    'Dificuldade em atividades de autocuidado', 'Dependência excessiva do adulto',
    'Dificuldade em organizar materiais'
  ]
};

export const EncaminhamentosRecebidos: React.FC<EncaminhamentosRecebidosProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [relatorios, setRelatorios] = useState<RelatorioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRelatorio, setSelectedRelatorio] = useState<RelatorioRow | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('relatorios_encaminhamento')
          .select('*, student:students!student_id(id, full_name), school:schools!school_id(id, name)')
          .eq('status', 'ENVIADO')
          .order('enviado_em', { ascending: false });

        if (error) throw error;
        setRelatorios(data || []);
      } catch (e) {
        console.error('Erro ao carregar encaminhamentos:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = relatorios.filter(r => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      r.student?.full_name?.toLowerCase().includes(term) ||
      r.school?.name?.toLowerCase().includes(term) ||
      r.codigo?.toLowerCase().includes(term) ||
      r.profissionais_solicitados?.some(p => p.toLowerCase().includes(term))
    );
  });

  if (selectedRelatorio) {
    const r = selectedRelatorio;
    const aspectos = r.aspectos_desenvolvimento || {};

    return (
      <div className="max-w-4xl mx-auto pb-12 animate-fadeIn">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedRelatorio(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft size={20} className="text-slate-500" />
          </button>
          <FileText size={22} className="text-primary-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">Relatório de Encaminhamento</h1>
            <p className="text-sm text-slate-400">Código: {r.codigo} — Modo leitura</p>
          </div>
          <span className="ml-auto text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">ENVIADO</span>
        </div>

        {/* Card Escola + Aluno */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 mb-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Escola</span>
              <p className="text-sm font-semibold text-slate-700">{r.school?.name || '—'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Aluno(a)</span>
              <p className="text-sm font-semibold text-slate-700">{r.student?.full_name || '—'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Preenchido por</span>
              <p className="text-sm text-slate-600">{r.nome_preenchedor || '—'} {r.cargo_preenchedor ? `(${r.cargo_preenchedor})` : ''}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Data de envio</span>
              <p className="text-sm text-slate-600">{r.enviado_em ? new Date(r.enviado_em).toLocaleDateString('pt-BR') : '—'}</p>
            </div>
            {r.possui_laudo && (
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Diagnóstico (laudo)</span>
                <p className="text-sm text-slate-600">{r.diagnostico || '—'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Seção 3: Motivo */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/30 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">3</span>
            <span className="text-sm font-bold text-primary-700">Motivo do encaminhamento</span>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-sm font-bold text-slate-700 mb-1">a) O que foi observado no aluno?</p>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3">{r.observacoes_aluno || r.motivo_encaminhamento || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 mb-1">b) Impacto na aprendizagem/convivência</p>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3">{r.impacto_aprendizagem || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 mb-1">c) Intervenções realizadas e comunicação com a família</p>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3">{r.intervencoes_familia || 'Não informado'}</p>
            </div>
          </div>
        </div>

        {/* Seção 4: Aspectos */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/30 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">4</span>
            <span className="text-sm font-bold text-primary-700">Aspectos do desenvolvimento e aprendizagem</span>
          </div>
          <div className="p-5">
            {Object.entries(ASPECTOS_CONFIG).map(([grupo, itens]) => {
              const checked = aspectos[grupo] || [];
              if (checked.length === 0) return null;
              return (
                <div key={grupo} className="mb-3 last:mb-0">
                  <p className="text-sm font-bold text-primary-600 mb-1">{grupo}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {itens.filter(i => checked.includes(i)).map(item => (
                      <span key={item} className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full border border-primary-200">{item}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Seção 5: Complementares */}
        {r.informacoes_complementares && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden mb-5">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/30 flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">5</span>
              <span className="text-sm font-bold text-primary-700">Informações complementares</span>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600 leading-relaxed">{r.informacoes_complementares}</p>
            </div>
          </div>
        )}

        {/* Seção 6: Profissionais */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/30 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">6</span>
            <span className="text-sm font-bold text-primary-700">Encaminhamento solicitado</span>
          </div>
          <div className="p-5 flex flex-wrap gap-2">
            {(r.profissionais_solicitados || []).map(p => (
              <span key={p} className="flex items-center gap-1.5 text-sm bg-primary-50 text-primary-700 px-3 py-1.5 rounded-xl border border-primary-200 font-medium">
                <Check size={14} /> {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-fadeIn">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate('/app')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-slate-500" />
        </button>
        <FileText size={22} className="text-primary-600" />
        <h1 className="text-xl font-bold text-slate-800">Encaminhamentos Recebidos</h1>
        <span className="text-[10px] font-bold bg-primary-100 text-primary-700 px-2.5 py-1 rounded-full">{filtered.length}</span>
      </div>
      <p className="text-sm text-slate-400 mb-6 ml-12">Relatórios enviados pelas escolas ao Centro Multidisciplinar</p>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white text-sm"
          placeholder="Buscar por aluno, escola, código ou profissional..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary-500" />
          <span className="ml-2 text-slate-400 text-sm">Carregando encaminhamentos...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 text-sm">{search ? 'Nenhum encaminhamento encontrado.' : 'Nenhum encaminhamento recebido ainda.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedRelatorio(r)}
              className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-card hover:shadow-md hover:border-primary-200 transition-all p-4 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">{r.codigo}</span>
                    <span className="text-xs text-slate-400">
                      {r.enviado_em ? new Date(r.enviado_em).toLocaleDateString('pt-BR') : ''}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 truncate">{r.student?.full_name || 'Aluno não identificado'}</p>
                  <p className="text-xs text-slate-400 truncate">{r.school?.name || 'Escola'} — {r.nome_preenchedor || ''}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(r.profissionais_solicitados || []).map(p => (
                      <span key={p} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{p}</span>
                    ))}
                  </div>
                </div>
                <Eye size={18} className="text-slate-300 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

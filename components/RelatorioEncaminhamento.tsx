import React, { useState, useEffect, useMemo } from 'react';
import { User, Student, School } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../contexts/ToastContext';
import {
  FileText, Printer, Save, Send, ChevronDown, Building2,
  User as UserIcon, Check, AlertCircle, FileDown, ArrowLeft, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Constantes ──
const ASPECTOS_CONFIG = {
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
} as const;

const PROFISSIONAIS_DISPONIVEIS = [
  'Psicólogo(a)', 'Fonoaudiólogo(a)', 'Terapeuta Ocupacional',
  'Psicopedagogo(a)', 'Assistente Social', 'Neuropsicólogo(a)'
];

interface RelatorioEncaminhamentoProps {
  currentUser: User;
}

interface FormData {
  motivo: string;
  aspectos: Record<string, string[]>;
  aspectosOutro: Record<string, string>;
  intervencoes: string;
  complementares: string;
  profissionais: string[];
  possuiLaudo: boolean | null;
  diagnostico: string;
  atendimentoExterno: string;
}

const initialForm: FormData = {
  motivo: '', aspectos: {}, aspectosOutro: {}, intervencoes: '',
  complementares: '', profissionais: [], possuiLaudo: null,
  diagnostico: '', atendimentoExterno: ''
};

export const RelatorioEncaminhamento: React.FC<RelatorioEncaminhamentoProps> = ({ currentUser }) => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [form, setForm] = useState<FormData>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Carrega alunos e escolas
  useEffect(() => {
    const load = async () => {
      try {
        const studs = currentUser.role === 'SPECIALIST'
          ? await SupabaseService.getStudentsForUser(currentUser)
          : await SupabaseService.getStudents();
        setStudents(studs);

        const { data: schoolsData } = await supabase
          .from('schools').select('*').order('name');
        if (schoolsData) setSchools(schoolsData);
      } catch (e) { console.error('Erro ao carregar dados:', e); }
    };
    load();
  }, [currentUser.id]);

  // Autoseleciona escola do usuário logado
  useEffect(() => {
    if (currentUser.schoolId) setSelectedSchoolId(currentUser.schoolId);
  }, [currentUser.schoolId]);

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);
  const selectedSchool = useMemo(() => schools.find(s => s.id === selectedSchoolId), [schools, selectedSchoolId]);

  const toggleAspecto = (grupo: string, item: string) => {
    setForm(prev => {
      const current = prev.aspectos[grupo] || [];
      const updated = current.includes(item)
        ? current.filter(i => i !== item)
        : [...current, item];
      return { ...prev, aspectos: { ...prev.aspectos, [grupo]: updated } };
    });
  };

  const toggleProfissional = (prof: string) => {
    setForm(prev => ({
      ...prev,
      profissionais: prev.profissionais.includes(prof)
        ? prev.profissionais.filter(p => p !== prof)
        : [...prev.profissionais, prof]
    }));
  };

  const gerarCodigo = () => `ENC-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;

  const handleSave = async (enviar = false) => {
    if (!selectedStudentId || !selectedSchoolId) {
      addToast('Selecione o aluno e a escola antes de salvar.', 'error');
      return;
    }
    if (enviar && !form.motivo.trim()) {
      addToast('O motivo do encaminhamento é obrigatório para enviar.', 'error');
      return;
    }
    if (enviar && form.profissionais.length === 0) {
      addToast('Selecione ao menos um profissional para encaminhamento.', 'error');
      return;
    }

    enviar ? setIsSending(true) : setIsSaving(true);
    try {
      const codigo = gerarCodigo();
      const now = new Date().toISOString();
      const { error } = await supabase.from('relatorios_encaminhamento').insert({
        student_id: selectedStudentId,
        school_id: selectedSchoolId,
        status: enviar ? 'ENVIADO' : 'RASCUNHO',
        motivo_encaminhamento: form.motivo,
        aspectos_desenvolvimento: form.aspectos,
        intervencoes_realizadas: form.intervencoes,
        informacoes_complementares: form.complementares,
        profissionais_solicitados: form.profissionais,
        possui_laudo: form.possuiLaudo ?? false,
        diagnostico: form.diagnostico,
        atendimento_externo: form.atendimentoExterno,
        preenchido_por: (await supabase.auth.getUser()).data.user?.id,
        nome_preenchedor: currentUser.name,
        cargo_preenchedor: currentUser.jobTitle || currentUser.role,
        codigo,
        enviado_em: enviar ? now : null,
      });
      if (error) throw error;
      addToast(enviar
        ? `Relatório enviado ao Centro Multidisciplinar! Código: ${codigo}`
        : `Rascunho salvo com sucesso. Código: ${codigo}`, 'success');
      if (enviar) navigate('/app/documentos');
    } catch (e: any) {
      console.error('Erro ao salvar relatório:', e);
      addToast(`Erro ao ${enviar ? 'enviar' : 'salvar'}: ${e.message}`, 'error');
    } finally {
      setIsSaving(false);
      setIsSending(false);
    }
  };

  const handlePrint = () => {
    const student = selectedStudent;
    const school = selectedSchool;
    if (!student || !school) return;

    const aspectosHtml = Object.entries(ASPECTOS_CONFIG).map(([grupo, itens]) => {
      const checked = form.aspectos[grupo] || [];
      return `<div style="margin-bottom:10px">
        <p style="font-weight:bold;color:#1B4F72;margin:6px 0 4px">${grupo}</p>
        ${itens.map(item => `<p style="margin:2px 0 2px 12px">${checked.includes(item) ? '☑' : '☐'} ${item}</p>`).join('')}
        ${form.aspectosOutro[grupo] ? `<p style="margin:2px 0 2px 12px">☑ Outro: ${form.aspectosOutro[grupo]}</p>` : ''}
      </div>`;
    }).join('');

    const profsHtml = PROFISSIONAIS_DISPONIVEIS.map(p =>
      `<p style="margin:3px 0">${form.profissionais.includes(p) ? '☑' : '☐'} ${p}</p>`
    ).join('');

    const pw = window.open('', '_blank', 'width=900,height=1100');
    if (!pw) return;
    pw.document.write(`<html><head><title>Relatório de Encaminhamento</title>
<style>
@page{size:A4;margin:20mm}
body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.5;color:#000;margin:0;padding:0}
.header{text-align:center;border-bottom:2px solid #1B4F72;padding-bottom:8px;margin-bottom:20px}
.header h1{font-size:13pt;margin:0;text-transform:uppercase}
.header h2{font-size:11pt;margin:2px 0;color:#1B4F72}
.sec{margin:16px 0;border-bottom:1px solid #1B4F72;padding-bottom:3px;font-weight:bold;color:#1B4F72;font-size:12pt}
table{width:100%;border-collapse:collapse;margin-bottom:12px}
td{padding:4px 8px;border:1px solid #ccc;font-size:11pt}
td:first-child{font-weight:bold;background:#EBF5FB;width:38%}
.sig{display:inline-block;width:45%;text-align:center;margin-top:40px}
.sig-line{border-top:1px solid #000;margin-top:40px;padding-top:4px;font-size:10pt}
.note{font-size:9pt;color:#555;font-style:italic;margin-top:20px;border-top:1px solid #1B4F72;padding-top:8px}
</style></head><body>
<div class="header">
  <h1>Prefeitura Municipal de Brotas de Macaúbas</h1>
  <h1>Secretaria Municipal de Educação</h1>
  <h2>Coordenação de Educação Especial e Inclusiva</h2>
  <p style="font-size:10pt;font-style:italic">Centro Multidisciplinar</p>
</div>
<h2 style="text-align:center;color:#1B4F72;font-size:14pt">RELATÓRIO PEDAGÓGICO DE ENCAMINHAMENTO</h2>

<p class="sec">1. DADOS DA ESCOLA</p>
<table>
  <tr><td>Nome da Escola</td><td>${school.name || ''}</td></tr>
  <tr><td>INEP</td><td>${(school as any).inep || ''}</td></tr>
  <tr><td>Endereço</td><td>${school.address ? `${(school.address as any).street || ''}, ${(school.address as any).number || ''} - ${(school.address as any).district || ''}` : ''}</td></tr>
  <tr><td>Telefone</td><td>${(school as any).phone || ''}</td></tr>
  <tr><td>Diretor(a)</td><td>${(school as any).director || ''}</td></tr>
  <tr><td>Distrito</td><td>${(school as any).district || ''}</td></tr>
</table>

<p class="sec">2. DADOS DO(A) ALUNO(A)</p>
<table>
  <tr><td>Nome Completo</td><td>${student.fullName}</td></tr>
  <tr><td>Data de Nascimento</td><td>${student.birthDate ? new Date(student.birthDate).toLocaleDateString('pt-BR') : ''}</td></tr>
  <tr><td>Responsável</td><td>${student.guardians?.[0]?.name || ''}</td></tr>
  <tr><td>Ano/Série</td><td>${student.school?.grade || ''}</td></tr>
  <tr><td>Turno</td><td>${student.school?.shift || ''}</td></tr>
  <tr><td>Professor(a) Regente</td><td>${student.school?.regentTeacher || ''}</td></tr>
  <tr><td>Possui Laudo</td><td>${form.possuiLaudo ? 'Sim' : 'Não'}</td></tr>
  ${form.possuiLaudo ? `<tr><td>Diagnóstico</td><td>${form.diagnostico}</td></tr>` : ''}
</table>

<p class="sec">3. MOTIVO DO ENCAMINHAMENTO</p>
<p style="text-align:justify">${form.motivo || 'Não informado'}</p>

<p class="sec">4. ASPECTOS DO DESENVOLVIMENTO E APRENDIZAGEM</p>
${aspectosHtml}

<p class="sec">5. INTERVENÇÕES PEDAGÓGICAS JÁ REALIZADAS</p>
<p style="text-align:justify">${form.intervencoes || 'Não informado'}</p>

<p class="sec">6. INFORMAÇÕES COMPLEMENTARES</p>
<p style="text-align:justify">${form.complementares || 'Não informado'}</p>

<p class="sec">7. ENCAMINHAMENTO SOLICITADO</p>
${profsHtml}

<div style="margin-top:40px">
  <div class="sig"><div class="sig-line">Professor(a) Regente<br>Matrícula: ___________</div></div>
  <div class="sig" style="margin-left:8%"><div class="sig-line">Coordenador(a) Pedagógico(a)<br>Matrícula: ___________</div></div>
</div>
<div style="margin-top:30px">
  <div class="sig"><div class="sig-line">Diretor(a) da Escola<br>Matrícula: ___________</div></div>
  <div class="sig" style="margin-left:8%"><p style="margin-top:50px">Data: ____/____/________</p></div>
</div>
<p class="note">OBSERVAÇÃO: Este relatório é de caráter confidencial. As informações serão utilizadas exclusivamente pelos profissionais do Centro Multidisciplinar para fins de avaliação e planejamento de intervenção. A escola deve manter uma cópia em arquivo.</p>
</body></html>`);
    pw.document.close();
    pw.onload = () => { pw.focus(); pw.print(); };
  };

  // ── CHECKBOX COMPONENT ──
  const Checkbox: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({ checked, onChange, label }) => (
    <label onClick={onChange} className="flex items-center gap-2.5 py-1.5 px-1 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors text-sm text-slate-700 select-none">
      <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${checked ? 'bg-primary-600 border-primary-600' : 'border-slate-300'}`}>
        {checked && <Check size={10} className="text-white" strokeWidth={3} />}
      </div>
      {label}
    </label>
  );

  // ── SECTION CARD ──
  const Section: React.FC<{ num: number; title: string; tag: string; tagColor: string; children: React.ReactNode }> = ({ num, title, tag, tagColor, children }) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden mb-5">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/30">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">{num}</span>
          <span className="text-sm font-bold text-primary-700">{title}</span>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${tagColor}`}>{tag}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );

  // ══════════════════════════════════════════════════════
  // JSX
  // ══════════════════════════════════════════════════════
  return (
    <div className="max-w-4xl mx-auto pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate('/app/documentos')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-slate-500" />
        </button>
        <FileText size={22} className="text-primary-600" />
        <h1 className="text-xl font-bold text-slate-800">Relatório Pedagógico de Encaminhamento</h1>
        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Rascunho</span>
      </div>
      <p className="text-sm text-slate-400 mb-6 ml-12">Centro Multidisciplinar de Brotas de Macaúbas</p>

      {/* Action Bar */}
      <div className="flex justify-end gap-2 mb-6">
        <button onClick={() => handleSave(false)} disabled={isSaving} className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar rascunho
        </button>
        <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
          <Printer size={14} /> Imprimir
        </button>
        <button onClick={() => handleSave(true)} disabled={isSending} className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-all shadow-sm disabled:opacity-50">
          {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar ao Centro
        </button>
      </div>

      {/* ── SEÇÃO 1: ESCOLA ── */}
      <Section num={1} title="Dados da escola" tag="✓ Preenchido automaticamente" tagColor="bg-emerald-100 text-emerald-700">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Selecione a escola</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" size={16} />
              <select className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-slate-50/30 text-slate-700 font-medium appearance-none" value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)}>
                <option value="">Buscar escola...</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          {selectedSchool && <>
            <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">INEP</label><div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-slate-700">{(selectedSchool as any).inep || '—'}</div></div>
            <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Telefone</label><div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-slate-700">{(selectedSchool as any).phone || '—'}</div></div>
            <div className="col-span-2"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Endereço</label><div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-slate-700">{selectedSchool.address ? `${(selectedSchool.address as any).street || ''}, ${(selectedSchool.address as any).number || ''} - ${(selectedSchool.address as any).district || ''}` : '—'}</div></div>
            <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Diretor(a)</label><div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-slate-700">{(selectedSchool as any).director || '—'}</div></div>
            <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Distrito</label><div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-slate-700">{(selectedSchool as any).district || '—'}</div></div>
          </>}
        </div>
      </Section>

      {/* ── SEÇÃO 2: ALUNO ── */}
      <Section num={2} title="Dados do(a) aluno(a)" tag="✓ Autopreenchido ao selecionar" tagColor="bg-emerald-100 text-emerald-700">
        <div className="mb-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Selecione o aluno</label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" size={16} />
            <select className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-slate-50/30 text-slate-700 font-medium appearance-none" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
              <option value="">Buscar aluno...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </div>
        </div>
        {selectedStudent && (
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Data de nascimento</label><div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium">{selectedStudent.birthDate ? new Date(selectedStudent.birthDate).toLocaleDateString('pt-BR') : '—'}</div></div>
            <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ano/Série</label><div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium">{selectedStudent.school?.grade || '—'}</div></div>
            <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Turno</label><div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium">{selectedStudent.school?.shift || '—'}</div></div>
            <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Professor(a) Regente</label><div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium">{selectedStudent.school?.regentTeacher || '—'}</div></div>
            <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Responsável</label><div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium">{selectedStudent.guardians?.[0]?.name || '—'}</div></div>
            <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Telefone</label><div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium">{selectedStudent.guardians?.[0]?.phone || '—'}</div></div>
          </div>
        )}
        {selectedStudent && (
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Possui laudo médico?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm" onClick={() => setForm(p => ({...p, possuiLaudo: true}))}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.possuiLaudo === true ? 'border-primary-600 bg-primary-600' : 'border-slate-300'}`}>
                    {form.possuiLaudo === true && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div> Sim
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm" onClick={() => setForm(p => ({...p, possuiLaudo: false}))}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.possuiLaudo === false ? 'border-primary-600 bg-primary-600' : 'border-slate-300'}`}>
                    {form.possuiLaudo === false && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div> Não
                </label>
              </div>
            </div>
            {form.possuiLaudo && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Diagnóstico</label>
                <input type="text" className="w-full py-2 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" value={form.diagnostico} onChange={e => setForm(p => ({...p, diagnostico: e.target.value}))} placeholder="Qual diagnóstico?" />
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── SEÇÃO 3: MOTIVO ── */}
      <Section num={3} title="Motivo do encaminhamento" tag="✎ Preenchimento manual" tagColor="bg-blue-100 text-blue-700">
        <textarea
          className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white text-sm placeholder:text-slate-300 resize-none min-h-[120px] leading-relaxed"
          placeholder="Descreva de forma objetiva o(s) motivo(s) que levaram a escola a encaminhar o(a) aluno(a) ao Centro Multidisciplinar..."
          value={form.motivo}
          onChange={e => setForm(p => ({...p, motivo: e.target.value}))}
        />
      </Section>

      {/* ── SEÇÃO 4: CHECKLIST ASPECTOS ── */}
      <Section num={4} title="Aspectos do desenvolvimento e aprendizagem" tag="✎ Marque os itens observados" tagColor="bg-blue-100 text-blue-700">
        {Object.entries(ASPECTOS_CONFIG).map(([grupo, itens]) => (
          <div key={grupo} className="mb-4 last:mb-0">
            <p className="text-sm font-bold text-primary-600 mb-2 flex items-center gap-1.5">
              <ChevronDown size={14} /> {grupo}
            </p>
            <div className="grid grid-cols-2 gap-x-4">
              {itens.map(item => (
                <Checkbox key={item} label={item} checked={(form.aspectos[grupo] || []).includes(item)} onChange={() => toggleAspecto(grupo, item)} />
              ))}
            </div>
            <input type="text" className="mt-1 w-full py-1.5 px-3 border border-dashed border-slate-200 rounded-lg text-xs text-slate-500 placeholder:text-slate-300 focus:ring-1 focus:ring-primary-400" placeholder={`Outro (${grupo})...`} value={form.aspectosOutro[grupo] || ''} onChange={e => setForm(p => ({...p, aspectosOutro: {...p.aspectosOutro, [grupo]: e.target.value}}))} />
          </div>
        ))}
      </Section>

      {/* ── SEÇÃO 5: INTERVENÇÕES ── */}
      <Section num={5} title="Intervenções pedagógicas já realizadas" tag="✎ Preenchimento manual" tagColor="bg-blue-100 text-blue-700">
        <textarea
          className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white text-sm placeholder:text-slate-300 resize-none min-h-[100px] leading-relaxed"
          placeholder="Descreva as estratégias e intervenções que a escola já realizou para atender às necessidades do(a) aluno(a)..."
          value={form.intervencoes}
          onChange={e => setForm(p => ({...p, intervencoes: e.target.value}))}
        />
      </Section>

      {/* ── SEÇÃO 6: COMPLEMENTARES ── */}
      <Section num={6} title="Informações complementares" tag="✎ Preenchimento manual" tagColor="bg-blue-100 text-blue-700">
        <textarea
          className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white text-sm placeholder:text-slate-300 resize-none min-h-[80px] leading-relaxed"
          placeholder="Registre qualquer informação adicional relevante sobre o(a) aluno(a), sua família ou contexto social (com sigilo e ética)..."
          value={form.complementares}
          onChange={e => setForm(p => ({...p, complementares: e.target.value}))}
        />
      </Section>

      {/* ── SEÇÃO 7: PROFISSIONAIS ── */}
      <Section num={7} title="Encaminhamento solicitado" tag="✎ Selecione os profissionais" tagColor="bg-blue-100 text-blue-700">
        <p className="text-xs text-slate-400 mb-3">Profissional(is) para o(s) qual(is) o aluno está sendo encaminhado</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PROFISSIONAIS_DISPONIVEIS.map(prof => (
            <button key={prof} onClick={() => toggleProfissional(prof)} className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm text-left transition-all ${form.profissionais.includes(prof) ? 'bg-primary-50 border-primary-300 text-primary-700 font-semibold shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${form.profissionais.includes(prof) ? 'bg-primary-600 border-primary-600' : 'border-slate-300'}`}>
                {form.profissionais.includes(prof) && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
              {prof}
            </button>
          ))}
        </div>
      </Section>

      {/* ── NOTA DE CONFIDENCIALIDADE ── */}
      <div className="bg-slate-50 border-l-4 border-primary-600 rounded-r-xl p-4 text-xs text-slate-500 italic leading-relaxed">
        <strong className="not-italic text-slate-600">Observação:</strong> Este relatório é um documento de caráter confidencial.
        As informações serão utilizadas exclusivamente pelos profissionais do Centro Multidisciplinar
        para fins de avaliação e planejamento de intervenção. A escola deve manter uma cópia em arquivo.
      </div>

      {/* ── BOTÕES FINAIS ── */}
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={() => handleSave(false)} disabled={isSaving} className="flex items-center gap-1.5 px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar rascunho
        </button>
        <button onClick={handlePrint} className="flex items-center gap-1.5 px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
          <Printer size={14} /> Imprimir
        </button>
        <button onClick={() => handleSave(true)} disabled={isSending} className="flex items-center gap-1.5 px-6 py-3 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50">
          {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar ao Centro Multidisciplinar
        </button>
      </div>
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import { User, Student, Appointment, statusAgendamentoRealizado } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { gerarAtestadoComparecimentoPDF } from '../utils/pdfExport';
import { useToast } from '../contexts/ToastContext';
import { X, User as UserIcon, CalendarCheck, ShieldCheck, Loader2, FileText, Clock, Building2, Stethoscope, AlertCircle, ChevronRight } from 'lucide-react';

interface AtestadoComparecimentoProps {
  currentUser: User;
  onClose: () => void;
}

const UNIT_LABEL: Record<string, string> = {
  SEDE: 'Sede',
  COCAL: 'Cocal',
  NAO_VINCULADO: 'Não vinculado',
};

const formatarDataExtenso = (dateISO: string): string => {
  const d = new Date(`${dateISO}T00:00:00`);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const OUTRO = '__OUTRO__';

export const AtestadoComparecimento: React.FC<AtestadoComparecimentoProps> = ({ currentUser, onClose }) => {
  const { addToast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');

  const [guardianChoice, setGuardianChoice] = useState('');
  const [guardianOutro, setGuardianOutro] = useState('');
  const [guardianCpf, setGuardianCpf] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);

  // Carregar alunos (respeitando o papel do usuário)
  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoadingStudents(true);
      try {
        const data = await SupabaseService.getStudentsForUser(currentUser);
        if (ativo) setStudents(data);
      } catch (e) {
        console.error('Erro ao carregar alunos:', e);
        if (ativo) addToast('Não foi possível carregar a lista de alunos.', 'error');
      } finally {
        if (ativo) setLoadingStudents(false);
      }
    })();
    return () => { ativo = false; };
  }, [currentUser, addToast]);

  const selectedStudent = useMemo(
    () => students.find(s => s.id === selectedStudentId),
    [students, selectedStudentId]
  );

  // Carregar atendimentos REALIZADOS do aluno selecionado (mais recentes primeiro)
  useEffect(() => {
    if (!selectedStudentId) {
      setAppointments([]);
      setSelectedAppointmentId('');
      return;
    }
    let ativo = true;
    (async () => {
      setLoadingAppointments(true);
      setSelectedAppointmentId('');
      try {
        const data = await SupabaseService.getAppointments({ studentId: selectedStudentId });
        const realizados = data
          .filter(a => statusAgendamentoRealizado(a.status))
          .sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return (b.startTime || '').localeCompare(a.startTime || '');
          });
        if (ativo) setAppointments(realizados);
      } catch (e) {
        console.error('Erro ao carregar atendimentos:', e);
        if (ativo) addToast('Não foi possível carregar os atendimentos.', 'error');
      } finally {
        if (ativo) setLoadingAppointments(false);
      }
    })();
    return () => { ativo = false; };
  }, [selectedStudentId, addToast]);

  // Ao trocar de responsável, pré-preenche CPF quando disponível
  useEffect(() => {
    if (!selectedStudent || !guardianChoice || guardianChoice === OUTRO) return;
    const g = selectedStudent.guardians?.find(g => g.name === guardianChoice);
    setGuardianCpf(g?.cpf ?? '');
  }, [guardianChoice, selectedStudent]);

  const guardianNameFinal = guardianChoice === OUTRO ? guardianOutro.trim() : guardianChoice.trim();
  const podeGerar = !!selectedAppointmentId && !!guardianNameFinal && !isGenerating;

  const handleGerar = async () => {
    if (!selectedAppointmentId) { addToast('Selecione o atendimento a atestar.', 'error'); return; }
    if (!guardianNameFinal) { addToast('Informe o nome do responsável.', 'error'); return; }

    setIsGenerating(true);
    try {
      // O servidor valida o status/data e devolve os dados reais do agendamento
      const res = await SupabaseService.gerarAtestadoComparecimento({
        appointmentId: selectedAppointmentId,
        guardianName: guardianNameFinal,
        guardianCpf: guardianCpf.trim() || null,
        currentUser,
      });

      const config = await SupabaseService.getPapelTimbradoConfig(res.appointment.unit);

      await gerarAtestadoComparecimentoPDF(
        {
          studentName: res.appointment.studentName || selectedStudent?.fullName || '',
          guardianName: guardianNameFinal,
          guardianCpf: guardianCpf.trim() || null,
          dateISO: res.appointment.date,
          startTime: res.appointment.startTime,
          endTime: res.appointment.endTime,
          specialty: res.appointment.specialty,
          professionalName: res.appointment.professionalName,
          unit: res.appointment.unit,
          documentCode: res.documentCode,
          issuedAt: res.issuedAt,
          issuedByName: currentUser.name,
        },
        config
      );

      addToast(`Atestado ${res.documentCode} gerado com sucesso.`, 'success');
      onClose();
    } catch (e: any) {
      console.error('Erro ao gerar atestado:', e);
      addToast(e?.message || 'Não foi possível gerar o atestado.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const guardians = selectedStudent?.guardians ?? [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-scaleIn">
        {/* Header */}
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CalendarCheck size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Atestado de Comparecimento</h3>
              <p className="text-slate-500 text-xs font-medium mt-0.5 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-500" />
                Data, horário, profissional e unidade vêm do atendimento real — nada é digitado.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto">
          {/* PASSO 1 — Aluno */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">1</span>
              Selecione o Aluno
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-slate-50/30 text-slate-700 font-medium appearance-none"
                value={selectedStudentId}
                onChange={e => { setSelectedStudentId(e.target.value); setGuardianChoice(''); setGuardianOutro(''); setGuardianCpf(''); }}
                disabled={loadingStudents}
              >
                <option value="">{loadingStudents ? 'Carregando alunos...' : 'Buscar aluno...'}</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </select>
            </div>
          </div>

          {/* PASSO 2 — Atendimento realizado */}
          {selectedStudentId && (
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">2</span>
                Selecione o Atendimento Realizado
              </label>

              {loadingAppointments ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-6 justify-center">
                  <Loader2 size={16} className="animate-spin" /> Carregando atendimentos...
                </div>
              ) : appointments.length === 0 ? (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Este aluno não possui nenhum <b>atendimento realizado</b> registrado.
                    Só é possível emitir atestado de comparecimento para atendimentos já concluídos.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {appointments.map(a => {
                    const ativo = selectedAppointmentId === a.id;
                    return (
                      <button
                        key={a.id}
                        onClick={() => setSelectedAppointmentId(a.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          ativo ? 'border-emerald-400 bg-emerald-50/60 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-700 capitalize">{formatarDataExtenso(a.date)}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ativo ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {a.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1"><Clock size={11} /> {a.startTime} às {a.endTime}</span>
                          {a.specialty && <span className="inline-flex items-center gap-1"><Stethoscope size={11} /> {a.specialty}</span>}
                          {a.professionalName && <span className="inline-flex items-center gap-1"><UserIcon size={11} /> {a.professionalName}</span>}
                          {a.unit && <span className="inline-flex items-center gap-1"><Building2 size={11} /> {UNIT_LABEL[a.unit] ?? a.unit}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PASSO 3 — Responsável */}
          {selectedAppointmentId && (
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">3</span>
                Responsável que Compareceu
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-slate-50/30 text-slate-700 font-medium appearance-none"
                    value={guardianChoice}
                    onChange={e => setGuardianChoice(e.target.value)}
                  >
                    <option value="">Selecione o responsável...</option>
                    {guardians.map((g, i) => (
                      <option key={`${g.name}-${i}`} value={g.name}>
                        {g.name}{g.relationship ? ` (${g.relationship})` : ''}
                      </option>
                    ))}
                    <option value={OUTRO}>Outro...</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="CPF do responsável (opcional)"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white text-slate-700 font-medium"
                  value={guardianCpf}
                  onChange={e => setGuardianCpf(e.target.value)}
                />
              </div>
              {guardianChoice === OUTRO && (
                <input
                  type="text"
                  autoFocus
                  placeholder="Nome completo do responsável"
                  className="w-full mt-3 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white text-slate-700 font-medium"
                  value={guardianOutro}
                  onChange={e => setGuardianOutro(e.target.value)}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGerar}
            disabled={!podeGerar}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 ${
              podeGerar
                ? 'bg-[#8B1A3A] text-white hover:bg-[#731530] shadow-sm'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Gerar Atestado em PDF
            {!isGenerating && podeGerar && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AtestadoComparecimento;

import React, { useState, useEffect } from 'react';
import { X, Search, AlertTriangle, CheckCircle2, UserPlus, Loader2 } from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';
import type { Student, School } from '../types';

interface CadastroRapidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  onCreated?: (studentId: string) => void;
}

type Step = 'form' | 'duplicates' | 'confirm';

const CadastroRapidoModal: React.FC<CadastroRapidoModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  onCreated,
}) => {
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [duplicates, setDuplicates] = useState<Student[]>([]);

  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (isOpen) {
      SupabaseService.getSchools().then(setSchools).catch(() => {});
    }
  }, [isOpen]);

  const resetForm = () => {
    setStep('form');
    setFullName('');
    setBirthDate('');
    setGender('');
    setSchoolId('');
    setGuardianName('');
    setGuardianPhone('');
    setMotivo('');
    setDuplicates([]);
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCheckDuplicates = async () => {
    if (!fullName.trim()) return;
    setLoading(true);
    try {
      const found = await SupabaseService.checkDuplicateStudent(fullName, birthDate || undefined);
      if (found.length > 0) {
        setDuplicates(found);
        setStep('duplicates');
      } else {
        setStep('confirm');
      }
    } catch {
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCreate = async () => {
    setLoading(true);
    try {
      const studentId = await SupabaseService.createStudentQuick({
        fullName,
        birthDate: birthDate || undefined,
        gender: gender || undefined,
        schoolId: schoolId || undefined,
        guardianName: guardianName || undefined,
        guardianPhone: guardianPhone || undefined,
        motivo: motivo || undefined,
        cadastradoPor: currentUserId,
      });

      const secretariaIds = await SupabaseService.getSecretariaUserIds();
      const schoolName = schools.find(s => s.id === schoolId)?.name || '';
      for (const recipientId of secretariaIds) {
        await SupabaseService.sendSystemMessage(
          currentUserId,
          recipientId,
          'Novo cadastro rápido de aluno',
          `${currentUserName} cadastrou rapidamente o aluno "${fullName}"${schoolName ? ` (escola: ${schoolName})` : ''}. Cadastro pendente de complementação.`,
          'urgent',
          'ALERT'
        );
      }

      onCreated?.(studentId);
      handleClose();
    } catch (err) {
      console.error('[CadastroRapido] Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const schoolName = schools.find(s => s.id === schoolId)?.name || '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg">
              <UserPlus size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Cadastro Rápido</h2>
              <p className="text-xs text-slate-400">
                {step === 'form' && 'Preencha os dados mínimos'}
                {step === 'duplicates' && 'Possíveis duplicidades encontradas'}
                {step === 'confirm' && 'Confirme os dados'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-50">
          {(['form', 'duplicates', 'confirm'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? 'bg-amber-500 text-white' : i < ['form', 'duplicates', 'confirm'].indexOf(step) ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-slate-400'
              }`}>
                {i + 1}
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 ${i < ['form', 'duplicates', 'confirm'].indexOf(step) ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* STEP 1: Form */}
          {step === 'form' && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Nome completo *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Nome completo do aluno"
                  className="w-full rounded-lg border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 px-3 py-2.5 text-sm outline-none transition"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Data de nascimento</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 px-3 py-2.5 text-sm outline-none transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Sexo</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 px-3 py-2.5 text-sm outline-none transition bg-white"
                  >
                    <option value="">Selecione</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Escola</label>
                <select
                  value={schoolId}
                  onChange={e => setSchoolId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 px-3 py-2.5 text-sm outline-none transition bg-white"
                >
                  <option value="">Selecione a escola</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Responsável</label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={e => setGuardianName(e.target.value)}
                    placeholder="Nome do responsável"
                    className="w-full rounded-lg border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 px-3 py-2.5 text-sm outline-none transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Telefone</label>
                  <input
                    type="tel"
                    value={guardianPhone}
                    onChange={e => setGuardianPhone(e.target.value)}
                    placeholder="(99) 99999-9999"
                    className="w-full rounded-lg border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 px-3 py-2.5 text-sm outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Motivo do cadastro</label>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Breve descrição do motivo do encaminhamento..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 px-3 py-2 text-sm outline-none resize-none transition"
                />
              </div>
            </>
          )}

          {/* STEP 2: Duplicates */}
          {step === 'duplicates' && (
            <>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Alunos similares encontrados</p>
                  <p className="text-xs text-amber-600 mt-0.5">Verifique se o aluno já existe antes de prosseguir.</p>
                </div>
              </div>

              <div className="space-y-2">
                {duplicates.map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                      {d.fullName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{d.fullName}</p>
                      <p className="text-xs text-slate-500">
                        {d.birthDate ? new Date(d.birthDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem data nasc.'}
                        {d.school?.schoolName ? ` • ${d.school.schoolName}` : ''}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {d.status === 'Active' ? 'Ativo' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-500 text-center">
                Se nenhum destes é o aluno desejado, prossiga com o cadastro.
              </p>
            </>
          )}

          {/* STEP 3: Confirm */}
          {step === 'confirm' && (
            <>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Confirme os dados do cadastro rápido</p>
                  <p className="text-xs text-emerald-600 mt-0.5">A secretaria será notificada para complementar.</p>
                </div>
              </div>

              <div className="space-y-2 p-4 rounded-xl bg-gray-50 border border-gray-200">
                <Row label="Nome" value={fullName} />
                {birthDate && <Row label="Nascimento" value={new Date(birthDate + 'T12:00:00').toLocaleDateString('pt-BR')} />}
                {gender && <Row label="Sexo" value={gender} />}
                {schoolName && <Row label="Escola" value={schoolName} />}
                {guardianName && <Row label="Responsável" value={`${guardianName}${guardianPhone ? ` — ${guardianPhone}` : ''}`} />}
                {motivo && <Row label="Motivo" value={motivo} />}
                <Row label="Cadastrado por" value={currentUserName} />
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200">
                <Search size={14} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">
                  O cadastro será criado como <strong>PENDENTE</strong>. A secretaria receberá uma notificação para completar os dados.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
          {step === 'form' && (
            <>
              <button onClick={handleClose} className="flex-1 py-2.5 bg-gray-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleCheckDuplicates}
                disabled={!fullName.trim() || loading}
                className="flex-[2] py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                {loading ? 'Verificando...' : 'Verificar duplicidades'}
              </button>
            </>
          )}

          {step === 'duplicates' && (
            <>
              <button onClick={() => setStep('form')} className="flex-1 py-2.5 bg-gray-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors">
                Voltar
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="flex-[2] py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus size={15} />
                Não é duplicidade — prosseguir
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <button onClick={() => setStep('form')} className="flex-1 py-2.5 bg-gray-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors">
                Voltar
              </button>
              <button
                onClick={handleConfirmCreate}
                disabled={loading}
                className="flex-[2] py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {loading ? 'Cadastrando...' : 'Confirmar cadastro rápido'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-start gap-4">
    <span className="text-xs font-medium text-slate-500 shrink-0">{label}</span>
    <span className="text-sm font-semibold text-slate-800 text-right">{value}</span>
  </div>
);

export default CadastroRapidoModal;

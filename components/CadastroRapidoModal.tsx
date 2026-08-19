import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, AlertTriangle, CheckCircle2, UserPlus, Loader2, Camera, User, Trash2, FileText, Clock, ArrowLeft, Check } from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';
import type { Student, School } from '../types';

interface CadastroRapidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserRole?: string;
  currentUserSpecialty?: string;
  onCreated?: (studentId: string) => void;
}

type Step = 'form' | 'duplicates' | 'confirm' | 'success';

const SPECIALTY_ROUTES: Record<string, string> = {
  'Psicologia': 'psychology',
  'Serviço Social': 'social-service-hub',
  'Psicopedagogia': 'psychopedagogy',
  'Terapia Ocupacional': 'occupational-therapy',
  'Fonoaudiologia': 'speech-therapy',
  'Fisioterapia': 'physiotherapy',
  'Nutrição': 'nutrition',
};

const ALL_STEPS: Step[] = ['form', 'duplicates', 'confirm', 'success'];

const CadastroRapidoModal: React.FC<CadastroRapidoModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  currentUserRole,
  currentUserSpecialty,
  onCreated,
}) => {
  const navigate = useNavigate();
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

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);
  const [isFromDuplicate, setIsFromDuplicate] = useState(false);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);
  const [selectedStudentStatus, setSelectedStudentStatus] = useState<string | null>(null);
  const [selectedStudentPhoto, setSelectedStudentPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      SupabaseService.getSchools().then(setSchools).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(null); return; }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

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
    setPhotoFile(null);
    setPhotoPreview(null);
    setCreatedStudentId(null);
    setIsFromDuplicate(false);
    setSelectedStudentName(null);
    setSelectedStudentStatus(null);
    setSelectedStudentPhoto(null);
    setLoading(false);
  };

  const handleClose = () => {
    if (step === 'success' && createdStudentId) {
      onCreated?.(createdStudentId);
    }
    resetForm();
    onClose();
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('A foto deve ter no máximo 5 MB.');
      return;
    }
    setPhotoFile(file);
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

      if (photoFile) {
        try {
          await SupabaseService.uploadStudentPhoto(studentId, photoFile);
        } catch (photoErr) {
          console.warn('[CadastroRapido] Foto não enviada, cadastro prosseguiu:', photoErr);
        }
      }

      try {
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
      } catch (notifErr) {
        console.warn('[CadastroRapido] Notificação não enviada, cadastro prosseguiu:', notifErr);
      }

      setCreatedStudentId(studentId);
      setStep('success');
    } catch (err) {
      console.error('[CadastroRapido] Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExisting = (student: Student) => {
    setCreatedStudentId(student.id);
    setIsFromDuplicate(true);
    setSelectedStudentName(student.fullName);
    setSelectedStudentStatus((student as any).cadastro_status || (student.status === 'Active' ? 'COMPLETO' : 'PENDENTE'));
    setSelectedStudentPhoto((student as any).photo_url || null);
    setStep('success');
  };

  const handleSuccessAction = (action: 'atendimento' | 'retroativo' | 'voltar') => {
    const id = createdStudentId;
    if (id) onCreated?.(id);
    resetForm();
    onClose();

    if (action === 'atendimento') {
      if (currentUserRole === 'SPECIALIST' && currentUserSpecialty) {
        const route = SPECIALTY_ROUTES[currentUserSpecialty];
        if (route) {
          navigate(`/app/${route}`, { state: { openStudentId: id } });
        } else {
          navigate('/app/list');
        }
      } else {
        navigate('/app/list');
      }
    } else if (action === 'retroativo') {
      navigate('/app/retroativo');
    }
  };

  if (!isOpen) return null;

  const schoolName = schools.find(s => s.id === schoolId)?.name || '';
  const isSpecialist = currentUserRole === 'SPECIALIST';
  const stepIndex = ALL_STEPS.indexOf(step);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${
              step === 'success' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-amber-400 to-orange-500'
            }`}>
              {step === 'success' ? <CheckCircle2 size={18} /> : <UserPlus size={18} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {step === 'success' ? 'Cadastro Concluído' : 'Cadastro Rápido'}
              </h2>
              <p className="text-xs text-slate-400">
                {step === 'form' && 'Preencha os dados mínimos'}
                {step === 'duplicates' && 'Possíveis duplicidades encontradas'}
                {step === 'confirm' && 'Confirme os dados'}
                {step === 'success' && 'Escolha a próxima ação'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-50">
          {ALL_STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s
                  ? (s === 'success' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white')
                  : i < stepIndex
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-slate-400'
              }`}>
                {i < stepIndex ? '✓' : i + 1}
              </div>
              {i < ALL_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < stepIndex ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* STEP 1: Form */}
          {step === 'form' && (
            <>
              {/* Photo upload */}
              <div className="flex flex-col items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center overflow-hidden transition-all ${
                    photoPreview
                      ? 'border-2 border-emerald-400 shadow-md'
                      : 'border-2 border-dashed border-slate-300 bg-slate-50 hover:border-amber-400 hover:bg-amber-50'
                  }`}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      <Camera size={22} className="text-slate-400" />
                    </div>
                  )}
                </button>
                {photoPreview ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPhotoFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={12} /> Remover
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">Foto do aluno (opcional)</span>
                )}
              </div>

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
                  <p className="text-xs text-amber-600 mt-0.5">Selecione o aluno se ele já está cadastrado, ou cadastre um novo.</p>
                </div>
              </div>

              <div className="space-y-3">
                {duplicates.map(d => (
                  <div
                    key={d.id}
                    onClick={() => handleSelectExisting(d)}
                    className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                        {d.fullName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{d.fullName}</p>
                        <p className="text-xs text-slate-500">
                          {d.birthDate ? new Date(d.birthDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem data nasc.'}
                          {d.school?.schoolName ? ` • ${d.school.schoolName}` : ''}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${d.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {d.status === 'Active' ? 'Ativo' : 'Pendente'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSelectExisting(d); }}
                      className="w-full mt-3 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2.5 font-bold text-sm transition-colors"
                    >
                      <Check size={16} />
                      Selecionar e iniciar atendimento
                    </button>
                  </div>
                ))}
              </div>

              {/* Separador e botão de cadastrar novo */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-slate-400 whitespace-nowrap">Se nenhum destes é o aluno desejado:</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={() => setStep('confirm')}
                className="w-full flex items-center justify-center gap-2 border-2 border-orange-300 text-orange-600 hover:bg-orange-50 rounded-xl py-2.5 font-bold text-sm transition-colors"
              >
                <UserPlus size={16} />
                Cadastrar novo aluno mesmo assim
              </button>
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

              <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                {photoPreview && (
                  <div className="flex justify-center pb-2">
                    <img src={photoPreview} alt="Foto do aluno" className="w-16 h-16 rounded-full object-cover border-2 border-emerald-300 shadow" />
                  </div>
                )}
                <Row label="Nome" value={fullName} />
                {birthDate && <Row label="Nascimento" value={new Date(birthDate + 'T12:00:00').toLocaleDateString('pt-BR')} />}
                {gender && <Row label="Sexo" value={gender} />}
                {schoolName && <Row label="Escola" value={schoolName} />}
                {guardianName && <Row label="Responsável" value={`${guardianName}${guardianPhone ? ` — ${guardianPhone}` : ''}`} />}
                {motivo && <Row label="Motivo" value={motivo} />}
                {photoFile && <Row label="Foto" value={photoFile.name} />}
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

          {/* STEP 4: Success */}
          {step === 'success' && (
            <div className="space-y-5">
              <div
                className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-6 text-center space-y-3"
                style={{ boxShadow: '0 4px 20px rgba(16,185,129,0.15)' }}
              >
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 size={28} className="text-emerald-600" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-emerald-800">
                  {isFromDuplicate ? 'Aluno selecionado!' : 'Aluno cadastrado com sucesso!'}
                </h3>

                {isFromDuplicate && selectedStudentPhoto ? (
                  <div className="flex justify-center">
                    <img src={selectedStudentPhoto} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-emerald-300 shadow" />
                  </div>
                ) : photoPreview ? (
                  <div className="flex justify-center">
                    <img src={photoPreview} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-emerald-300 shadow" />
                  </div>
                ) : null}

                <p className="text-base font-medium text-slate-800">
                  {isFromDuplicate ? (selectedStudentName || fullName) : fullName}
                </p>

                {isFromDuplicate ? (
                  selectedStudentStatus !== 'COMPLETO' && (
                    <span className="inline-block bg-amber-100 text-amber-700 rounded-full px-3 py-1 text-xs font-bold">
                      Cadastro pendente — secretaria notificada
                    </span>
                  )
                ) : (
                  <span className="inline-block bg-amber-100 text-amber-700 rounded-full px-3 py-1 text-xs font-bold">
                    Cadastro pendente — secretaria notificada
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {isSpecialist ? (
                  <button
                    type="button"
                    onClick={() => handleSuccessAction('atendimento')}
                    className="w-full flex items-center justify-center gap-2.5 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl py-3.5 font-bold text-sm transition-colors"
                    style={{ boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}
                  >
                    <FileText size={18} />
                    <div className="text-left">
                      <div>Iniciar atendimento</div>
                      <div className="text-[10px] font-normal opacity-80">Abrir ficha clínica deste aluno</div>
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSuccessAction('atendimento')}
                    className="w-full flex items-center justify-center gap-2.5 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl py-3.5 font-bold text-sm transition-colors"
                    style={{ boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}
                  >
                    <User size={18} />
                    <div className="text-left">
                      <div>Abrir lista de alunos</div>
                      <div className="text-[10px] font-normal opacity-80">Ver o aluno cadastrado na lista</div>
                    </div>
                  </button>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-slate-400">ou</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <button
                  type="button"
                  onClick={() => handleSuccessAction('retroativo')}
                  className="w-full flex items-center justify-center gap-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-medium text-sm transition-colors"
                  style={{ boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}
                >
                  <Clock size={16} />
                  <div className="text-left">
                    <div>Lançamento histórico</div>
                    <div className="text-[10px] font-normal opacity-80">Registrar atendimentos já realizados em papel</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSuccessAction('voltar')}
                  className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-slate-600 hover:bg-gray-50 rounded-xl py-3 font-medium text-sm transition-colors"
                >
                  <ArrowLeft size={16} />
                  Voltar à lista
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && (
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
        )}
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

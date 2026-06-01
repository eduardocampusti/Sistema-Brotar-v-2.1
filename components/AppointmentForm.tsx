import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';
import {
    Appointment,
    AuditAction,
    School,
    Specialty,
    Student,
    User,
    UserRole,
    Unit,
} from '../types';
import { useToast } from '../contexts/ToastContext';
import { AppointmentSummaryCard } from './AppointmentSummaryCard';

/** Perfis que não aparecem como profissionais disponíveis no agendamento (apenas UI). */
const PERFIS_EXCLUIDOS_LISTA_AGENDAMENTO: UserRole[] = [
    'ADMIN',
    'SECRETARIA_SEDE',
    'SECRETARIA_COCAL',
    'COORDENADOR',
];

const ESPECIALIDADES_CLINICAS = new Set<Specialty>(Object.values(Specialty) as Specialty[]);

const SUGGESTED_START_TIMES = ['08:00', '08:40', '09:20', '10:00', '13:00', '13:40', '14:20', '15:00', '15:40', '16:20'] as const;

/** Visual por especialidade — espelha `edu/code.html` (Material Symbols + superfícies). */
const SPECIALTY_STITCH: Record<
    Specialty,
    { card: string; iconWrap: string; borderHover: string; symbol: string }
> = {
    [Specialty.PSYCHOLOGY]: {
        card: 'bg-surface-container-low',
        iconWrap: 'bg-primary-container text-on-primary-container',
        borderHover: 'hover:border-primary/20',
        symbol: 'psychology',
    },
    [Specialty.NUTRITION]: {
        card: 'bg-tertiary-container',
        iconWrap: 'bg-surface-container-highest text-on-tertiary-container',
        borderHover: 'hover:border-tertiary/20',
        symbol: 'nutrition',
    },
    [Specialty.PSYCHOPEDAGOGY]: {
        card: 'bg-secondary-container/30',
        iconWrap: 'bg-secondary-container text-on-secondary-container',
        borderHover: 'hover:border-secondary/20',
        symbol: 'child_care',
    },
    [Specialty.PHYSIOTHERAPY]: {
        card: 'bg-surface-container-low',
        iconWrap: 'bg-primary-container text-on-primary-container',
        borderHover: 'hover:border-primary/20',
        symbol: 'exercise',
    },
    [Specialty.SPEECH_THERAPY]: {
        card: 'bg-secondary-container/30',
        iconWrap: 'bg-secondary-container text-on-secondary-container',
        borderHover: 'hover:border-secondary/20',
        symbol: 'record_voice_over',
    },
    [Specialty.SOCIAL_WORK]: {
        card: 'bg-tertiary-container',
        iconWrap: 'bg-surface-container-highest text-on-tertiary-container',
        borderHover: 'hover:border-tertiary/20',
        symbol: 'diversity_3',
    },
    [Specialty.OCCUPATIONAL_THERAPY]: {
        card: 'bg-surface-container-low',
        iconWrap: 'bg-primary-container text-on-primary-container',
        borderHover: 'hover:border-primary/20',
        symbol: 'accessibility_new',
    },
};

function formatLocalYYYYMMDD(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function addDaysLocalDate(d: Date, days: number): Date {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + days);
    return x;
}

/** Domingo 00:00 local da semana que contém `d`. */
function startOfWeekSunday(d: Date): Date {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - x.getDay());
    return x;
}

function combineLocalDateAndTime(dateStr: string, timeHHmm: string): Date {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, mi] = timeHHmm.split(':').map(Number);
    return new Date(y, mo - 1, d, h, mi, 0, 0);
}

function addMinutesToClock(startHHmm: string, durMinutes: number): string {
    const [h, m] = startHHmm.split(':').map(Number);
    const total = h * 60 + m + durMinutes;
    const h2 = Math.floor(total / 60) % 24;
    const m2 = total % 60;
    return `${String(h2).padStart(2, '0')}:${String(m2).padStart(2, '0')}`;
}

function initialsFromName(name: string): string {
    const p = (name || '').trim().split(/\s+/).filter(Boolean);
    if (p.length === 0) return '?';
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return `${p[0][0] || ''}${p[p.length - 1][0] || ''}`.toUpperCase();
}

interface AppointmentFormProps {
    currentUser: User;
    students: Student[];
    initialData?: Appointment | null;
    onCancel: () => void;
    onSuccess: (payload?: { date: string }) => void;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
    currentUser,
    students: studentsProp,
    initialData,
    onCancel,
    onSuccess,
}) => {
    const { success, error: showError, warning: showWarning } = useToast();
    const [loading, setLoading] = useState(false);
    const [allProfessionals, setAllProfessionals] = useState<User[]>([]);
    const [loadingProfissionaisCache, setLoadingProfissionaisCache] = useState(true);
    const [localStudents, setLocalStudents] = useState<Student[]>(studentsProp || []);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [showAllSpecialties, setShowAllSpecialties] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [schoolResults, setSchoolResults] = useState<School[]>([]);
    const [isLoadingSchools, setIsLoadingSchools] = useState(false);
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>(() =>
        currentUser.role === 'ESCOLA' && currentUser.schoolId ? currentUser.schoolId : ''
    );
    /** Nome da escola confirmada na UI (para saber quando o texto divergiu e limpar o id). */
    const [selectedSchoolName, setSelectedSchoolName] = useState('');
    const [schoolAutocompleteOpen, setSchoolAutocompleteOpen] = useState(false);
    const schoolComboRef = useRef<HTMLDivElement>(null);

    const [studentsBySchool, setStudentsBySchool] = useState<Student[]>([]);
    const [loadingSchoolStudents, setLoadingSchoolStudents] = useState(false);
    const appliedInitialSchoolFromAppointmentRef = useRef(false);

    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        setNow(new Date());
        const id = window.setInterval(() => setNow(new Date()), 60_000);
        return () => window.clearInterval(id);
    }, []);

    const [profApptsDay, setProfApptsDay] = useState<Appointment[] | null>(null);
    const [stuApptsDay, setStuApptsDay] = useState<Appointment[] | null>(null);
    const [profConflitosSelecionado, setProfConflitosSelecionado] = useState<Appointment[]>([]);
    const [alunoConflitosSelecionado, setAlunoConflitosSelecionado] = useState<Appointment[]>([]);
    const [confStudentOverride, setConfStudentOverride] = useState(false);

    const [monthApptDates, setMonthApptDates] = useState<Set<string>>(new Set());
    const [dayUnitAppointments, setDayUnitAppointments] = useState<Appointment[] | null>(null);

    const lastProfConflictToastKey = useRef('');
    const lastStudentWarnToastKey = useRef('');

    const [searchName, setSearchName] = useState(initialData?.studentName || '');
    const resolveUnit = (): Unit => {
        const scope = currentUser.scope as string;
        if (scope && scope !== 'GLOBAL') return scope as Unit;
        return 'SEDE';
    };

    const [newApt, setNewApt] = useState<Partial<Appointment>>({
        unit: initialData?.unit || resolveUnit(),
        status: 'AGENDADO',
        date: new Date().toISOString().split('T')[0],
        specialty: initialData?.specialty,
        professionalId: initialData?.professionalId,
        professionalName: initialData?.professionalName,
        studentId: initialData?.studentId,
        studentName: initialData?.studentName,
    });

    const [weekViewStart, setWeekViewStart] = useState(() => {
        const base = initialData?.date
            ? new Date(`${initialData.date}T12:00:00`)
            : new Date(`${new Date().toISOString().split('T')[0]}T12:00:00`);
        return startOfWeekSunday(base);
    });

    const [duration, setDuration] = useState(40);
    const [showAllStudentCards, setShowAllStudentCards] = useState(false);

    useEffect(() => {
        if (!newApt.startTime) return;
        const nextEnd = addMinutesToClock(newApt.startTime, duration);
        setNewApt((prev) => (prev.endTime === nextEnd ? prev : { ...prev, endTime: nextEnd }));
    }, [duration, newApt.startTime]);

    useEffect(() => {
        let cancelled = false;
        setLoadingProfissionaisCache(true);
        void SupabaseService.getProfissionaisAtivos()
            .then((profs) => {
                if (cancelled) return;
                setAllProfessionals(profs);
            })
            .catch((err) => {
                if (cancelled) return;
                const msg =
                    err instanceof Error
                        ? err.message
                        : typeof err === 'object' && err !== null && 'message' in err
                          ? String((err as { message?: unknown }).message)
                          : String(err);
                showError(msg ? `Erro ao carregar profissionais: ${msg}` : 'Erro ao carregar profissionais.');
            })
            .finally(() => {
                if (!cancelled) setLoadingProfissionaisCache(false);
            });
        return () => {
            cancelled = true;
        };
    }, [showError]);

    useEffect(() => {
        if (studentsProp && studentsProp.length > 0) {
            setLocalStudents(studentsProp);
        }
    }, [studentsProp]);

    useEffect(() => {
        if (!studentsProp || studentsProp.length === 0) {
            setLoadingStudents(true);
            SupabaseService.getStudents(undefined, { compactList: true })
                .then((data) => {
                    if (data.length > 0) setLocalStudents(data);
                })
                .finally(() => setLoadingStudents(false));
        }
    }, [studentsProp]);

    useEffect(() => {
        if (!(currentUser.role === 'ESCOLA' && currentUser.schoolId)) return;
        let cancelled = false;
        void SupabaseService.getSchoolById(currentUser.schoolId).then((sch) => {
            if (cancelled || !sch) return;
            setSearchQuery(sch.name);
            setSelectedSchoolName(sch.name);
        });
        return () => {
            cancelled = true;
        };
    }, [currentUser.role, currentUser.schoolId]);

    useEffect(() => {
        if (currentUser.role === 'ESCOLA' && currentUser.schoolId) return;
        const q = searchQuery.trim();
        if (q.length === 0) {
            setSchoolResults([]);
            setIsLoadingSchools(false);
            return;
        }
        let cancelled = false;
        setIsLoadingSchools(true);
        const id = window.setTimeout(() => {
            void SupabaseService.searchSchoolsByName(q)
                .then((rows) => {
                    if (!cancelled) setSchoolResults(rows);
                })
                .finally(() => {
                    if (!cancelled) setIsLoadingSchools(false);
                });
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(id);
        };
    }, [searchQuery, currentUser.role, currentUser.schoolId]);

    useEffect(() => {
        const onDocDown = (e: MouseEvent) => {
            const el = schoolComboRef.current;
            if (!el || !schoolAutocompleteOpen) return;
            if (e.target instanceof Node && !el.contains(e.target)) {
                setSchoolAutocompleteOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocDown);
        return () => document.removeEventListener('mousedown', onDocDown);
    }, [schoolAutocompleteOpen]);

    useEffect(() => {
        if (appliedInitialSchoolFromAppointmentRef.current) return;
        if (!initialData?.studentId) return;
        const src = studentsProp?.length ? studentsProp : localStudents;
        const st = src.find((s) => s.id === initialData.studentId);
        if (st?.school?.schoolId) {
            setSelectedSchoolId(st.school.schoolId);
            const label = st.school.schoolName || '';
            setSearchQuery(label);
            setSelectedSchoolName(label);
            appliedInitialSchoolFromAppointmentRef.current = true;
        }
    }, [initialData?.studentId, studentsProp, localStudents]);

    useEffect(() => {
        if (!selectedSchoolId) {
            setStudentsBySchool([]);
            setLoadingSchoolStudents(false);
            return;
        }
        let cancelled = false;
        setLoadingSchoolStudents(true);
        void SupabaseService.getStudents(undefined, { compactList: true, schoolId: selectedSchoolId })
            .then((rows) => {
                if (!cancelled) setStudentsBySchool(rows);
            })
            .catch(() => {
                if (!cancelled) setStudentsBySchool([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingSchoolStudents(false);
            });
        return () => {
            cancelled = true;
        };
    }, [selectedSchoolId]);

    const students = localStudents;

    const pickSchoolFromAutocomplete = (sch: School) => {
        setSelectedSchoolId(sch.id);
        setSearchQuery(sch.name);
        setSelectedSchoolName(sch.name);
        setSchoolResults([]);
        setSchoolAutocompleteOpen(false);
        setSearchName('');
        setNewApt((prev) => ({ ...prev, studentId: undefined, studentName: undefined }));
    };

    const onSchoolSearchInputChange = (v: string) => {
        setSearchQuery(v);
        setSchoolAutocompleteOpen(true);
        if (selectedSchoolId && v.trim() !== selectedSchoolName.trim()) {
            setSelectedSchoolId('');
            setSelectedSchoolName('');
            setNewApt((prev) => ({ ...prev, studentId: undefined, studentName: undefined }));
        }
    };

    const profissionaisParaAgendamento = useMemo(
        () =>
            allProfessionals.filter(
                (p) =>
                    !PERFIS_EXCLUIDOS_LISTA_AGENDAMENTO.includes(p.role) &&
                    !!p.specialty &&
                    ESPECIALIDADES_CLINICAS.has(p.specialty)
            ),
        [allProfessionals]
    );

    const especialidadesComContagem = useMemo(
        () => SupabaseService.getEspecialidades(profissionaisParaAgendamento),
        [profissionaisParaAgendamento]
    );

    const filteredProfessionals = useMemo(() => {
        if (!newApt.specialty) return [];
        return profissionaisParaAgendamento.filter((p) => p.specialty === newApt.specialty);
    }, [profissionaisParaAgendamento, newApt.specialty]);

    const profissionalSelecionado = useMemo(
        () => filteredProfessionals.find((p) => p.id === newApt.professionalId),
        [filteredProfessionals, newApt.professionalId]
    );

    const proOcupadoNoSlot = useMemo(() => {
        if (!newApt.startTime || !newApt.endTime || !dayUnitAppointments) {
            return () => false;
        }
        return (proId: string) => {
            const mine = dayUnitAppointments.filter((a) => a.professionalId === proId);
            return (
                SupabaseService.filtrarAgendamentosSobrepostosJanela(
                    mine,
                    newApt.startTime!,
                    newApt.endTime!,
                    initialData?.id
                ).length > 0
            );
        };
    }, [newApt.startTime, newApt.endTime, dayUnitAppointments, initialData?.id]);

    useEffect(() => {
        if (!newApt.professionalId || !newApt.date) {
            setProfApptsDay(null);
            return;
        }
        let cancelled = false;
        void SupabaseService.getAppointments({
            professionalId: newApt.professionalId,
            date: newApt.date,
        }).then((rows) => {
            if (!cancelled) setProfApptsDay(rows);
        });
        return () => {
            cancelled = true;
        };
    }, [newApt.professionalId, newApt.date]);

    useEffect(() => {
        if (!newApt.studentId || !newApt.date) {
            setStuApptsDay(null);
            return;
        }
        let cancelled = false;
        void SupabaseService.getAppointments({
            studentId: newApt.studentId,
            date: newApt.date,
        }).then((rows) => {
            if (!cancelled) setStuApptsDay(rows);
        });
        return () => {
            cancelled = true;
        };
    }, [newApt.studentId, newApt.date]);

    useEffect(() => {
        if (!newApt.date || !newApt.unit) {
            setDayUnitAppointments(null);
            return;
        }
        let cancelled = false;
        void SupabaseService.getAppointments({
            date: newApt.date,
            unit: newApt.unit as Unit,
        }).then((rows) => {
            if (!cancelled) setDayUnitAppointments(rows);
        });
        return () => {
            cancelled = true;
        };
    }, [newApt.date, newApt.unit]);

    useEffect(() => {
        if (!newApt.professionalId) {
            setMonthApptDates(new Set());
            return;
        }
        const from = formatLocalYYYYMMDD(weekViewStart);
        const to = formatLocalYYYYMMDD(addDaysLocalDate(weekViewStart, 6));
        let cancelled = false;
        void SupabaseService.getAppointments({
            professionalId: newApt.professionalId,
            fromDate: from,
            toDate: to,
        }).then((rows) => {
            if (cancelled) return;
            const dates = new Set(rows.map((r) => r.date).filter(Boolean) as string[]);
            setMonthApptDates(dates);
        });
        return () => {
            cancelled = true;
        };
    }, [newApt.professionalId, weekViewStart]);

    useEffect(() => {
        if (profApptsDay === null || !newApt.professionalId || !newApt.date || !newApt.startTime || !newApt.endTime) {
            setProfConflitosSelecionado([]);
            return;
        }
        let cancelled = false;
        void SupabaseService.verificarConflitosProfissional(
            newApt.professionalId,
            newApt.date,
            newApt.startTime,
            newApt.endTime,
            { excludeAppointmentId: initialData?.id, candidatos: profApptsDay }
        ).then((list) => {
            if (!cancelled) setProfConflitosSelecionado(list);
        });
        return () => {
            cancelled = true;
        };
    }, [
        profApptsDay,
        newApt.professionalId,
        newApt.date,
        newApt.startTime,
        newApt.endTime,
        initialData?.id,
    ]);

    useEffect(() => {
        if (stuApptsDay === null || !newApt.studentId || !newApt.date || !newApt.startTime || !newApt.endTime) {
            setAlunoConflitosSelecionado([]);
            return;
        }
        let cancelled = false;
        void SupabaseService.verificarConflitosAluno(
            newApt.studentId,
            newApt.date,
            newApt.startTime,
            newApt.endTime,
            { excludeAppointmentId: initialData?.id, candidatos: stuApptsDay }
        ).then((list) => {
            if (!cancelled) {
                const pid = newApt.professionalId;
                setAlunoConflitosSelecionado(pid ? list.filter((a) => a.professionalId !== pid) : list);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [
        stuApptsDay,
        newApt.studentId,
        newApt.professionalId,
        newApt.date,
        newApt.startTime,
        newApt.endTime,
        initialData?.id,
    ]);

    useEffect(() => {
        setConfStudentOverride(false);
    }, [newApt.studentId, newApt.date, newApt.startTime, newApt.endTime, newApt.professionalId]);

    useEffect(() => {
        if (profConflitosSelecionado.length === 0) {
            lastProfConflictToastKey.current = '';
            return;
        }
        const c = profConflitosSelecionado[0];
        const key = `${c.id}|${newApt.startTime}|${newApt.endTime}|${newApt.professionalId}`;
        if (lastProfConflictToastKey.current === key) return;
        lastProfConflictToastKey.current = key;
        const profName = newApt.professionalName || 'Este profissional';
        showError(`${profName} já tem atendimento neste horário.`);
    }, [profConflitosSelecionado, newApt.startTime, newApt.endTime, newApt.professionalName, newApt.professionalId, showError]);

    useEffect(() => {
        if (alunoConflitosSelecionado.length === 0) {
            lastStudentWarnToastKey.current = '';
            return;
        }
        if (confStudentOverride) return;
        const other = alunoConflitosSelecionado[0];
        const key = `${other.id}|${newApt.startTime}|${newApt.endTime}|${newApt.studentId}|${newApt.professionalId}`;
        if (lastStudentWarnToastKey.current === key) return;
        lastStudentWarnToastKey.current = key;
        const nomeAluno = newApt.studentName || 'O aluno';
        showWarning(
            `⚠️ ${nomeAluno} já tem atendimento neste horário com ${other.professionalName}. Confirma mesmo assim?`
        );
    }, [
        alunoConflitosSelecionado,
        confStudentOverride,
        newApt.startTime,
        newApt.endTime,
        newApt.studentName,
        newApt.studentId,
        newApt.professionalId,
        showWarning,
    ]);

    const normalizeText = (text: string) => {
        if (!text) return '';
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    };

    const filteredStudents = useMemo(() => {
        if (!selectedSchoolId) return [];
        const pool = studentsBySchool;
        if (pool.length === 0) return [];
        const raw = searchName.trim();
        if (!raw) return pool;

        const tokens = normalizeText(raw)
            .split(/\s+/)
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        if (tokens.length === 0) return pool;

        return pool.filter((s) => {
            const school = s.school;
            const haystack = normalizeText(
                [s.fullName, school?.schoolName, school?.district, school?.grade].filter(Boolean).join(' ')
            );
            return tokens.every((tok) => haystack.includes(tok));
        });
    }, [selectedSchoolId, studentsBySchool, searchName]);

    const isDateToday = useMemo(
        () => !!newApt.date && newApt.date === formatLocalYYYYMMDD(now),
        [newApt.date, now]
    );

    const weekStripDays = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDaysLocalDate(weekViewStart, i)),
        [weekViewStart]
    );

    const horarioPassadoBloqueante = useMemo(() => {
        if (!newApt.date || !newApt.startTime || !newApt.endTime) return false;
        if (!isDateToday) return false;
        const startD = combineLocalDateAndTime(newApt.date, newApt.startTime);
        const endD = combineLocalDateAndTime(newApt.date, newApt.endTime);
        return startD <= now || endD <= now;
    }, [newApt.date, newApt.startTime, newApt.endTime, isDateToday, now]);

    const minTimeHHmm = useMemo(() => {
        if (!isDateToday) return undefined;
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }, [isDateToday, now]);

    const bloqueioProfissional = profConflitosSelecionado.length > 0;
    const avisoAlunoPendente = alunoConflitosSelecionado.length > 0 && !confStudentOverride;

    const confirmacaoDesabilitada =
        loading ||
        !newApt.studentId ||
        !newApt.professionalId ||
        !newApt.startTime ||
        !newApt.endTime ||
        !newApt.date ||
        !newApt.specialty ||
        bloqueioProfissional ||
        horarioPassadoBloqueante ||
        avisoAlunoPendente;

    const rejeitarHorarioPassado = (dateStr: string, startHHmm: string, endHHmm: string): boolean => {
        if (!dateStr || !startHHmm || !endHHmm) return false;
        if (dateStr !== formatLocalYYYYMMDD(now)) return false;
        const startD = combineLocalDateAndTime(dateStr, startHHmm);
        const endD = combineLocalDateAndTime(dateStr, endHHmm);
        if (startD <= now || endD <= now) {
            showError('Horário já passou');
            return true;
        }
        return false;
    };

    const handleSaveAppointment = async () => {
        if (!newApt.studentId || !newApt.professionalId || !newApt.startTime || !newApt.endTime || !newApt.date || !newApt.specialty) {
            showError('Preencha todos os campos obrigatórios');
            return;
        }

        if (horarioPassadoBloqueante) {
            showError('Não é possível agendar em horário já passado.');
            return;
        }

        // --- VALIDAÇÃO ON-DEMAND PARA EVITAR CONDIÇÃO DE CORRIDA (TC010) ---
        setLoading(true);
        try {
            // 1. Verificar conflitos do profissional (Bloqueante)
            const conflitosProf = await SupabaseService.verificarConflitosProfissional(
                newApt.professionalId,
                newApt.date,
                newApt.startTime,
                newApt.endTime,
                { excludeAppointmentId: initialData?.id }
            );

            if (conflitosProf.length > 0) {
                const profName = newApt.professionalName || 'O profissional';
                showError(`${profName} já tem atendimento neste horário.`);
                setLoading(false);
                return;
            }

            // 2. Verificar conflitos do aluno (Aviso/Override)
            const conflitosAluno = await SupabaseService.verificarConflitosAluno(
                newApt.studentId,
                newApt.date,
                newApt.startTime,
                newApt.endTime,
                { excludeAppointmentId: initialData?.id }
            );

            // Filtramos o profissional atual caso seja edição ou caso o usuário queira confirmar o conflito.
            const conflitosAlunoOutros = conflitosAluno.filter(a => a.professionalId !== newApt.professionalId);

            if (conflitosAlunoOutros.length > 0 && !confStudentOverride) {
                const other = conflitosAlunoOutros[0];
                showError(`O aluno já tem atendimento neste horário com ${other.professionalName}. Marque a opção de confirmar mesmo assim.`);
                setLoading(false);
                return;
            }

            const studentData = students.find((s) => s.id === newApt.studentId);
            const guardianPhone = studentData?.guardians?.[0]?.phone || '';

            // Atualizamos o estado para refletir a validação mais recente (caso o save falhe ou precise de interação)
            setAlunoConflitosSelecionado(conflitosAlunoOutros);

            const aptToSave = {
                ...newApt,
                telefoneResponsavel: guardianPhone,
                conflitoHorarioAluno:
                    conflitosAlunoOutros.length > 0 && confStudentOverride ? true : undefined,
            };
            if (initialData?.id) aptToSave.id = initialData.id;

            const savedId = await SupabaseService.confirmarAgendamento(aptToSave);

            const acao = initialData?.id ? AuditAction.UPDATE : AuditAction.CREATE;
            await SupabaseService.logAction(
                currentUser,
                acao,
                'AGENDAMENTOS',
                `Consulta de ${studentData?.fullName || 'Desconhecido'} com ${newApt.professionalName}`
            );

            if (initialData && initialData.id && newApt.date) {
                try {
                    const dateFormatted = newApt.date.split('-').reverse().join('/');
                    await SupabaseService.updateAppointmentFields(initialData.id, {
                        status: 'REMARCAR',
                        notes: `Remarcado para ${dateFormatted}`,
                    });
                } catch (err) {
                    console.warn('Falha ao atualizar notas do anterior', err);
                }
            }

            if (guardianPhone) {
                const wa = await sendWhatsAppNotification({
                    student: newApt.studentName || 'Aluno',
                    professional: newApt.professionalName || 'Profissional',
                    date: newApt.date!.split('-').reverse().join('/'),
                    time: newApt.startTime!,
                    phone: guardianPhone,
                    appointmentId: savedId,
                    unit: newApt.unit || 'SEDE',
                });
                if (wa.ok === false) {
                    showError(`Agendamento salvo com sucesso. Não foi possível enviar o WhatsApp: ${wa.message}`);
                } else {
                    success('Agendamento salvo. Confirmação enviada por WhatsApp.');
                }
            } else {
                success(
                    `Agendamento salvo. O responsável de "${newApt.studentName}" não tem telefone cadastrado — inclua o número para enviar confirmação por WhatsApp.`
                );
            }

            onSuccess(newApt.date ? { date: newApt.date } : undefined);
        } catch (err: any) {
            console.error('Erro ao salvar agendamento:', err);
            const msg = String(err?.message || err?.error_description || err || '');
            const code = err?.code || err?.status;
            if (code === '401' || code === 'PGRST301' || /jwt|session|expired|invalid/i.test(msg)) {
                showError(
                    'Sessão expirada ou não autorizado pelo servidor. Saia e entre de novo no sistema e tente salvar o agendamento.'
                );
            } else {
                showError(`Erro ao salvar: ${msg || 'Erro desconhecido'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const sendWhatsAppNotification = async (details: {
        student: string;
        professional: string;
        date: string;
        time: string;
        phone: string;
        appointmentId: string;
        unit: string;
    }): Promise<{ ok: true } | { ok: false; message: string }> => {
        try {
            await SupabaseService.sendWhatsAppNotification(details);
            return { ok: true };
        } catch (err: unknown) {
            console.error('Erro no envio de WhatsApp:', err);
            let userMessage =
                err instanceof Error
                    ? err.message
                    : typeof err === 'object' && err !== null && 'message' in err
                      ? String((err as { message?: unknown }).message)
                      : 'Erro ao conectar com o serviço de WhatsApp';

            if (
                userMessage.includes('WhatsApp credentials not configured') ||
                userMessage.includes('environment variables are not configured') ||
                userMessage.includes('Contact admin')
            ) {
                userMessage =
                    'Credenciais do WhatsApp (token / ID do número) não estão configuradas no servidor da API.';
            }

            return { ok: false, message: userMessage };
        }
    };

    const selectSpecialty = (s: Specialty) => {
        setNewApt((prev) => ({
            ...prev,
            specialty: s,
            professionalId: undefined,
            professionalName: undefined,
        }));
    };

    const selectProfessional = (p: User) => {
        setNewApt((prev) => ({
            ...prev,
            professionalId: p.id,
            professionalName: p.name,
        }));
    };

    const especialidadesVisiveis = useMemo(() => {
        if (showAllSpecialties) return especialidadesComContagem;
        const preview = especialidadesComContagem.slice(0, 6);
        const sel = newApt.specialty;
        if (!sel) return preview;
        if (preview.some((e) => e.specialty === sel)) return preview;
        const selEntry = especialidadesComContagem.find((e) => e.specialty === sel);
        if (!selEntry) return preview;
        return [...preview.slice(0, 5), selEntry];
    }, [especialidadesComContagem, showAllSpecialties, newApt.specialty]);

    const pillsForProfessional = (p: User) => {
        const pills: string[] = [];
        if (p.specialty) pills.push(p.specialty);
        pills.push('Presencial');
        if (p.jobTitle) {
            const w = p.jobTitle.trim().split(/\s+/).slice(0, 2).join(' ');
            if (w && !(p.specialty && w.toLowerCase().includes(p.specialty.toLowerCase().slice(0, 4)))) {
                pills.push(w);
            }
        }
        return [...new Set(pills)].slice(0, 4);
    };

    const studentCardsList = useMemo(() => {
        const list = filteredStudents;
        if (showAllStudentCards) return list;
        return list.slice(0, 24);
    }, [filteredStudents, showAllStudentCards]);

    const resumoNomeEscola =
        selectedSchoolId ? (selectedSchoolName.trim() || searchQuery.trim() || undefined) : undefined;

    return (
        <div className="appointment-stitch-shell flex min-h-0 w-full flex-col overflow-x-hidden bg-background font-body text-on-background transition-colors duration-300 md:max-h-[calc(100dvh-5.5rem)] md:overflow-y-hidden">
            <main className="flex w-full flex-1 justify-center overflow-y-auto px-3 pb-10 pt-3 sm:px-4 sm:pb-12 md:pb-14 md:pt-4">
                <div className="mx-auto w-full max-w-6xl rounded-2xl bg-[#F9FAFB] px-4 py-6 shadow-sm ring-1 ring-slate-200/60 sm:px-6 sm:py-8 md:px-8 md:py-10">
                    <div className="grid w-full grid-cols-1 gap-y-6 md:gap-y-8">
                    <header className="grid grid-cols-[auto_1fr] items-center gap-4 sm:gap-6">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="group w-fit rounded-full bg-surface-container-low p-3 text-on-surface-variant transition-all duration-300 hover:bg-surface-container-high hover:text-primary"
                            aria-label="Voltar"
                        >
                            <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
                        </button>
                        <div className="flex flex-wrap items-center justify-self-end gap-3">
                            <label className="sr-only" htmlFor="stitch-unit-select">
                                Unidade
                            </label>
                            <span className="hidden text-sm font-semibold text-on-surface-variant sm:inline">Unidade</span>
                            <select
                                id="stitch-unit-select"
                                value={newApt.unit}
                                onChange={(e) => setNewApt({ ...newApt, unit: e.target.value as Unit })}
                                className="rounded-full border-0 bg-surface-container-low px-4 py-2.5 text-sm font-semibold text-on-surface ring-1 ring-outline/10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="SEDE">SEDE</option>
                                <option value="COCAL">COCAL (distrito)</option>
                            </select>
                        </div>
                    </header>

                    <section className="grid grid-cols-1 gap-2.5 md:gap-3">
                        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-background md:text-5xl">
                            Agendar Atendimento
                        </h1>
                        <p className="max-w-2xl text-lg text-on-surface-variant">
                            Escolha o profissional e o melhor horário para você começar sua jornada de bem-estar.
                        </p>
                    </section>

                    <section className="grid min-w-0 grid-cols-1 gap-6">
                        <h2 className="font-headline text-2xl font-bold text-on-background">Contexto do Paciente</h2>
                        <div className="grid min-w-0 max-w-3xl grid-cols-1 gap-3">
                            <div className="grid grid-cols-1 gap-1.5">
                                <label
                                    htmlFor="agenda-unidade-escolar"
                                    className="px-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
                                >
                                    Unidade escolar
                                </label>
                                <div ref={schoolComboRef} className="relative">
                                    <input
                                        id="agenda-unidade-escolar"
                                        type="text"
                                        role="combobox"
                                        aria-expanded={schoolAutocompleteOpen}
                                        aria-controls="agenda-school-results"
                                        aria-autocomplete="list"
                                        autoComplete="off"
                                        value={searchQuery}
                                        onChange={(e) => onSchoolSearchInputChange(e.target.value)}
                                        onFocus={() => {
                                            if (!(currentUser.role === 'ESCOLA' && currentUser.schoolId)) {
                                                setSchoolAutocompleteOpen(true);
                                            }
                                        }}
                                        disabled={currentUser.role === 'ESCOLA' && !!currentUser.schoolId}
                                        placeholder={
                                            currentUser.role === 'ESCOLA' && currentUser.schoolId
                                                ? 'Sua unidade escolar'
                                                : 'Digite para buscar a unidade escolar…'
                                        }
                                        className="w-full rounded-full border-2 border-primary/35 bg-white py-3.5 pl-5 pr-12 text-sm font-semibold text-on-surface shadow-sm transition-[border-color,box-shadow] placeholder:font-normal placeholder:text-outline-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:border-primary/15 disabled:bg-surface-container-low disabled:text-on-surface-variant"
                                    />
                                    <span
                                        className="pointer-events-none absolute right-3.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-primary/70"
                                        aria-hidden
                                    >
                                        {isLoadingSchools &&
                                        !(currentUser.role === 'ESCOLA' && currentUser.schoolId) &&
                                        searchQuery.trim().length > 0 ? (
                                            <span
                                                className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary"
                                                aria-label="Buscando escolas"
                                            />
                                        ) : (
                                            <span className="material-symbols-outlined text-[22px] leading-none">
                                                expand_more
                                            </span>
                                        )}
                                    </span>
                                    {schoolAutocompleteOpen &&
                                    !(currentUser.role === 'ESCOLA' && currentUser.schoolId) &&
                                    searchQuery.trim().length > 0 ? (
                                        <ul
                                            id="agenda-school-results"
                                            role="listbox"
                                            className="absolute z-[80] mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-100/90 bg-white py-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200/60"
                                        >
                                            {isLoadingSchools ? (
                                                <li
                                                    className="px-4 py-3 text-center text-xs text-on-surface-variant/75"
                                                    role="status"
                                                >
                                                    Buscando…
                                                </li>
                                            ) : schoolResults.length === 0 ? (
                                                <li className="px-4 py-3.5 text-sm text-on-surface-variant">
                                                    Nenhuma escola encontrada.
                                                </li>
                                            ) : (
                                                schoolResults.map((sch) => (
                                                    <li key={sch.id} role="none">
                                                        <button
                                                            type="button"
                                                            role="option"
                                                            className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-primary/5"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => pickSchoolFromAutocomplete(sch)}
                                                        >
                                                            <span className="font-semibold text-on-background">
                                                                {sch.name}
                                                            </span>
                                                            {sch.district ? (
                                                                <span className="text-xs text-on-surface-variant">
                                                                    {sch.district}
                                                                </span>
                                                            ) : null}
                                                        </button>
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    ) : null}
                                </div>
                            </div>
                            <div className="relative w-full">
                                <span
                                    className={`material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${
                                        selectedSchoolId ? 'text-on-surface-variant' : 'text-outline-variant'
                                    }`}
                                >
                                    search
                                </span>
                                <input
                                    id="agenda-busca-aluno"
                                    type="text"
                                    placeholder={
                                        selectedSchoolId
                                            ? 'Buscar por nome, série ou bairro'
                                            : 'Selecione uma escola para buscar'
                                    }
                                    value={searchName}
                                    onChange={(e) => setSearchName(e.target.value)}
                                    disabled={!selectedSchoolId}
                                    aria-disabled={!selectedSchoolId}
                                    className="w-full rounded-full border-none bg-white py-4 pl-12 pr-6 text-on-surface shadow-sm ring-1 ring-slate-200/80 transition-all placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-surface-container-low/80 disabled:text-on-surface-variant/80"
                                />
                            </div>
                        </div>
                        <div className="flex min-w-0 flex-col gap-4">
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'}}>
                                <h3 className="font-headline text-lg font-semibold text-on-background">Alunos Pacientes</h3>
                                {selectedSchoolId && studentsBySchool.length > 0 && (
                                    <span style={{fontSize:'12px',color:'#6b7280'}}>{studentCardsList.length} aluno(s)</span>
                                )}
                            </div>
                            <div
                                role="list"
                                aria-label="Lista de alunos pacientes"
                                style={{
                                    border:'1px solid #e5e7eb',
                                    borderRadius:'16px',
                                    overflow:'hidden',
                                    background:'#fff',
                                }}
                            >
                                {!selectedSchoolId ? (
                                    <p style={{padding:'32px 16px',textAlign:'center',fontSize:'14px',color:'#6b7280'}}>
                                        Selecione uma unidade escolar para ver os alunos.
                                    </p>
                                ) : loadingStudents || loadingSchoolStudents ? (
                                    <p style={{padding:'16px',textAlign:'center',fontSize:'14px',color:'#6b7280'}}>Carregando alunos…</p>
                                ) : studentCardsList.length === 0 ? (
                                    <p style={{padding:'24px 16px',textAlign:'center',fontSize:'14px',color:'#6b7280'}}>
                                        {studentsBySchool.length === 0
                                            ? 'Nenhum aluno matriculado nesta unidade escolar.'
                                            : searchName.trim()
                                              ? 'Nenhum aluno corresponde à busca.'
                                              : 'Nenhum aluno encontrado.'}
                                    </p>
                                ) : (
                                    <div style={{maxHeight:'280px',overflowY:'auto'}}>
                                        {studentCardsList.map((s) => {
                                            const selected = newApt.studentId === s.id;
                                            const diag = (s.clinical?.diagnosis || (s.clinical?.specialNeeds && s.clinical.specialNeeds[0]) || '').substring(0, 25);
                                            const grade = s.school?.grade || '';
                                            const sub = [diag, grade].filter(Boolean).join(' · ') || s.school?.schoolName || '';
                                            const initials = s.fullName.split(' ').filter(Boolean).slice(0,2).map((n: string) => n[0].toUpperCase()).join('');
                                            return (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    role="listitem"
                                                    aria-pressed={selected}
                                                    onClick={() => setNewApt({...newApt, studentId: s.id, studentName: s.fullName})}
                                                    style={{
                                                        width:'100%',
                                                        display:'flex',
                                                        alignItems:'center',
                                                        gap:'12px',
                                                        padding:'10px 16px',
                                                        textAlign:'left',
                                                        background: selected ? '#f0fdf4' : '#fff',
                                                        borderLeft: selected ? '3px solid #16a34a' : '3px solid transparent',
                                                        borderBottom:'1px solid #f3f4f6',
                                                        cursor:'pointer',
                                                        transition:'background 0.1s',
                                                    }}
                                                    onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb'; }}
                                                    onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
                                                >
                                                    {s.photoUrl ? (
                                                        <img src={s.photoUrl} alt="" style={{width:'34px',height:'34px',borderRadius:'50%',objectFit:'cover',flexShrink:0}} />
                                                    ) : (
                                                        <div style={{
                                                            width:'34px',height:'34px',borderRadius:'50%',flexShrink:0,
                                                            display:'flex',alignItems:'center',justifyContent:'center',
                                                            background: selected ? '#16a34a' : '#dcfce7',
                                                            color: selected ? '#fff' : '#15803d',
                                                            fontSize:'12px',fontWeight:'600',
                                                        }}>
                                                            {initials}
                                                        </div>
                                                    )}
                                                    <div style={{flex:1,minWidth:0}}>
                                                        <p style={{fontSize:'13px',fontWeight:'500',color: selected ? '#15803d' : '#111827',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',margin:0}}>
                                                            {s.fullName}
                                                        </p>
                                                        <p style={{fontSize:'11px',color:'#9ca3af',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:'2px',marginBottom:0}}>
                                                            {sub || '—'}
                                                        </p>
                                                    </div>
                                                    {selected && (
                                                        <span className="material-symbols-outlined" style={{fontSize:'18px',color:'#16a34a',flexShrink:0}}>check_circle</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {studentCardsList.length > 0 && (
                                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 16px',background:'#f9fafb',borderTop:'1px solid #f3f4f6'}}>
                                        <span style={{fontSize:'11px',color:'#9ca3af'}}>{studentCardsList.length} aluno(s) — role para ver todos</span>
                                        {newApt.studentId && <span style={{fontSize:'11px',color:'#16a34a',fontWeight:'600'}}>1 selecionado ✓</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="grid min-w-0 grid-cols-1 gap-6">
                        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_auto] sm:gap-4">
                        <h2 className="font-headline text-2xl font-bold text-on-background">Especialidades</h2>
                        <button
                            type="button"
                            onClick={() => setShowAllSpecialties((v) => !v)}
                            className="w-fit font-semibold text-primary underline-offset-4 transition-colors duration-300 hover:underline sm:justify-self-end"
                        >
                            {showAllSpecialties ? 'Mostrar menos' : 'Ver todas'}
                        </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-6 lg:grid-cols-7">
                        {loadingProfissionaisCache ? (
                            <>
                                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                                    <div
                                        key={i}
                                        className="flex h-[92px] animate-pulse flex-col items-center justify-center gap-2 rounded-xl bg-surface-container-low px-2 py-2.5 sm:h-[100px]"
                                    />
                                ))}
                            </>
                        ) : (
                            especialidadesVisiveis.map(({ specialty, count }) => {
                                const stitch = SPECIALTY_STITCH[specialty];
                                const semProfissionais = count === 0;
                                const selected = newApt.specialty === specialty;
                                return (
                                    <button
                                        key={specialty}
                                        type="button"
                                        disabled={semProfissionais}
                                        title={
                                            semProfissionais
                                                ? 'Nenhum profissional cadastrado'
                                                : `Selecionar ${specialty}`
                                        }
                                        onClick={() => {
                                            if (semProfissionais) return;
                                            selectSpecialty(specialty);
                                        }}
                                        className={`flex min-h-0 w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-center transition-all duration-300 sm:gap-2 sm:px-2 sm:py-3 ${
                                            semProfissionais
                                                ? `cursor-not-allowed border-transparent opacity-40 ${stitch.card}`
                                                : selected
                                                  ? `cursor-pointer border-primary/30 bg-primary-container ${stitch.borderHover}`
                                                  : `cursor-pointer border-transparent ${stitch.card} ${stitch.borderHover}`
                                        }`}
                                    >
                                        <div
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10 ${stitch.iconWrap}`}
                                        >
                                            <span className="material-symbols-outlined text-[20px] sm:text-[22px]">
                                                {stitch.symbol}
                                            </span>
                                        </div>
                                        <span className="line-clamp-2 w-full px-0.5 text-[10px] font-semibold leading-tight text-on-surface sm:text-[11px]">
                                            {specialty}
                                        </span>
                                        <span className="sr-only">
                                            {count} {count === 1 ? 'profissional' : 'profissionais'}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                    </section>

                    <section className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
                        {/* Coluna esquerda: escolha + card do profissional selecionado */}
                        <div className="grid min-w-0 grid-cols-1 gap-4">
                            <h2 className="font-headline text-2xl font-bold text-on-background">
                                Profissionais Disponíveis
                            </h2>
                            {!newApt.specialty ? (
                                <p className="text-on-surface-variant">
                                    Selecione uma especialidade para listar os profissionais.
                                </p>
                            ) : loadingProfissionaisCache ? (
                                <div className="flex gap-3">
                                    {[1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className="h-12 w-36 shrink-0 animate-pulse rounded-full bg-surface-container-low"
                                        />
                                    ))}
                                </div>
                            ) : filteredProfessionals.length === 0 ? (
                                <p className="text-sm font-medium text-on-surface-variant">
                                    Nenhum profissional ativo nesta especialidade.
                                </p>
                            ) : (
                                <>
                                    <div
                                        className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:thin]"
                                        role="tablist"
                                        aria-label="Selecionar profissional"
                                    >
                                        {filteredProfessionals.map((p) => {
                                            const selected = newApt.professionalId === p.id;
                                            const ocupado =
                                                !!(newApt.startTime && newApt.endTime) && proOcupadoNoSlot(p.id);
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    role="tab"
                                                    aria-selected={selected}
                                                    disabled={ocupado}
                                                    onClick={() => {
                                                        if (!ocupado) selectProfessional(p);
                                                    }}
                                                    className={`flex max-w-[220px] shrink-0 items-center gap-2.5 rounded-full border py-2 pl-2 pr-3 text-left transition-all duration-300 ${
                                                        selected
                                                            ? 'border-primary/40 bg-emerald-50/90 shadow-sm ring-2 ring-primary/15'
                                                            : 'border-slate-200/90 bg-white shadow-sm hover:border-primary/30'
                                                    } ${ocupado ? 'cursor-not-allowed opacity-45' : ''}`}
                                                >
                                                    {p.photoUrl ? (
                                                        <img
                                                            src={p.photoUrl}
                                                            alt=""
                                                            className="size-9 shrink-0 rounded-full object-cover ring-2 ring-white"
                                                        />
                                                    ) : (
                                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 ring-2 ring-white">
                                                            {initialsFromName(p.name)}
                                                        </div>
                                                    )}
                                                    <span className="min-w-0 truncate text-xs font-bold text-on-background sm:text-sm">
                                                        {p.name}
                                                    </span>
                                                    {ocupado ? (
                                                        <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700">
                                                            Ocup.
                                                        </span>
                                                    ) : null}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {profissionalSelecionado ? (
                                        <article className="grid min-h-[4.25rem] w-full max-w-full grid-cols-[4.5rem_1fr] overflow-hidden rounded-2xl border-2 border-primary/35 bg-white shadow-md ring-1 ring-slate-100 sm:min-h-[4.5rem] sm:grid-cols-[5rem_1fr]">
                                            <div className="relative h-full min-h-[4.25rem] bg-slate-200 sm:min-h-[4.5rem]">
                                                {profissionalSelecionado.photoUrl ? (
                                                    <img
                                                        src={profissionalSelecionado.photoUrl}
                                                        alt=""
                                                        className="absolute inset-0 h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-primary text-sm font-bold text-on-primary sm:text-base">
                                                        {initialsFromName(profissionalSelecionado.name)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex min-w-0 flex-col justify-center gap-0.5 p-4">
                                                <div className="flex items-start justify-between gap-1.5">
                                                    <h3 className="font-headline min-w-0 text-sm font-bold leading-tight text-on-background sm:text-base">
                                                        {profissionalSelecionado.name}
                                                    </h3>
                                                    <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0">
                                                        <span className="material-symbols-outlined fill-1 text-[15px] text-amber-500 leading-none">
                                                            star
                                                        </span>
                                                        <span className="text-[11px] font-bold text-on-background sm:text-xs">
                                                            5.0
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="line-clamp-1 text-[11px] font-semibold leading-tight text-primary sm:text-xs">
                                                    {[profissionalSelecionado.specialty, profissionalSelecionado.jobTitle]
                                                        .filter(Boolean)
                                                        .join(' • ')}
                                                </p>
                                                <p className="line-clamp-1 text-[11px] leading-tight text-slate-600 sm:text-xs sm:leading-snug">
                                                    {profissionalSelecionado.jobTitle
                                                        ? `Perfil: ${profissionalSelecionado.jobTitle}.`
                                                        : 'Profissional da rede Brotar.'}
                                                </p>
                                                <div className="flex flex-wrap gap-0.5 pt-0.5">
                                                    {pillsForProfessional(profissionalSelecionado).map((label, pi) => (
                                                        <span
                                                            key={`${profissionalSelecionado.id}-${pi}-${label}`}
                                                            className="rounded-full bg-slate-100 px-1.5 py-px text-[9px] font-semibold leading-tight text-slate-700 sm:text-[10px]"
                                                        >
                                                            {label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </article>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center text-sm text-slate-500">
                                            Toque em um profissional na lista acima para ver a ficha e os horários.
                                        </div>
                                    )}
                                </>
                            )}

                            <AppointmentSummaryCard
                                patientName={newApt.studentName}
                                schoolName={resumoNomeEscola}
                                specialty={newApt.specialty}
                                professionalName={newApt.professionalName}
                                dateYmd={newApt.date}
                                startTime={newApt.startTime}
                                endTime={newApt.endTime}
                                loading={loading}
                                confirmDisabled={confirmacaoDesabilitada}
                                onConfirm={handleSaveAppointment}
                            />
                        </div>

                        {/* Coluna direita: semana, duração, horários */}
                        <div className="grid min-w-0 grid-cols-1 gap-6">
                            <div className="grid grid-cols-1 gap-3">
                                <h2 className="font-headline text-lg font-bold text-on-background">Agendar para</h2>
                                <div className="overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:p-4">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setWeekViewStart((w) => addDaysLocalDate(w, -7))}
                                            className="shrink-0 rounded-full p-1 text-on-surface-variant transition-colors hover:bg-slate-100"
                                            aria-label="Semana anterior"
                                        >
                                            <span className="material-symbols-outlined text-xl">chevron_left</span>
                                        </button>
                                        <div className="flex min-w-0 flex-1 items-center justify-between gap-0.5 sm:gap-1">
                                            {weekStripDays.map((d) => {
                                                const ymd = formatLocalYYYYMMDD(d);
                                                const dayNum = d.getDate();
                                                const isSelected = newApt.date === ymd;
                                                const todayStr = formatLocalYYYYMMDD(now);
                                                const isToday = todayStr === ymd;
                                                const dayStart = d.getTime();
                                                const startToday = new Date(
                                                    now.getFullYear(),
                                                    now.getMonth(),
                                                    now.getDate()
                                                ).getTime();
                                                const isPastDay = dayStart < startToday;
                                                const hasMark = monthApptDates.has(ymd);
                                                if (isPastDay) {
                                                    return (
                                                        <span
                                                            key={ymd}
                                                            className="flex h-10 w-8 shrink-0 items-center justify-center text-sm tabular-nums text-slate-300 sm:h-11 sm:w-9"
                                                            aria-hidden
                                                        >
                                                            {dayNum}
                                                        </span>
                                                    );
                                                }
                                                return (
                                                    <button
                                                        key={ymd}
                                                        type="button"
                                                        onClick={() => setNewApt((prev) => ({ ...prev, date: ymd }))}
                                                        className={`relative flex h-10 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-all duration-200 sm:h-11 sm:w-9 sm:text-base ${
                                                            isSelected
                                                                ? 'bg-primary font-bold text-on-primary shadow-sm'
                                                                : 'text-on-surface hover:bg-primary-container/40'
                                                        } ${
                                                            isToday && !isSelected
                                                                ? 'bg-primary-container/30 font-semibold text-on-primary-container'
                                                                : ''
                                                        }`}
                                                    >
                                                        {dayNum}
                                                        {hasMark && !isSelected ? (
                                                            <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                                                        ) : null}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setWeekViewStart((w) => addDaysLocalDate(w, 7))}
                                            className="shrink-0 rounded-full p-1 text-on-surface-variant transition-colors hover:bg-slate-100"
                                            aria-label="Próxima semana"
                                        >
                                            <span className="material-symbols-outlined text-xl">chevron_right</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                                    Duração
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {[30, 40, 50, 60].map((dur) => (
                                        <button
                                            key={dur}
                                            type="button"
                                            onClick={() => setDuration(dur)}
                                            className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition-all duration-300 ${
                                                duration === dur
                                                    ? 'bg-[#2D6A4F] text-white shadow-sm'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {dur}m
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <h3 className="font-headline text-lg font-bold text-on-background">
                                    Horários Disponíveis
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {SUGGESTED_START_TIMES.map((time) => {
                                        const nextEnd = addMinutesToClock(time, duration);
                                        const past =
                                            !!newApt.date &&
                                            isDateToday &&
                                            combineLocalDateAndTime(newApt.date, time) <= now;
                                        const ocupado =
                                            profApptsDay !== null &&
                                            !!newApt.professionalId &&
                                            SupabaseService.filtrarAgendamentosSobrepostosJanela(
                                                profApptsDay,
                                                time,
                                                nextEnd,
                                                initialData?.id
                                            ).length > 0;
                                        const disabled = past || ocupado;
                                        const selected = newApt.startTime === time;
                                        return (
                                            <button
                                                key={time}
                                                type="button"
                                                title={
                                                    past
                                                        ? 'Passou'
                                                        : ocupado
                                                          ? 'Profissional já tem atendimento neste horário'
                                                          : undefined
                                                }
                                                disabled={disabled}
                                                onClick={() => {
                                                    if (disabled) return;
                                                    setNewApt({ ...newApt, startTime: time, endTime: nextEnd });
                                                }}
                                                className={`w-full rounded-full px-3 py-2.5 text-sm font-semibold transition-all ${
                                                    disabled
                                                        ? 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-55'
                                                        : selected
                                                          ? 'bg-[#2D6A4F] font-bold text-white shadow-sm'
                                                          : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span className={disabled && past ? 'line-through' : ''}>{time}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="px-1 text-xs font-semibold text-on-surface-variant">
                                        Início (manual)
                                    </label>
                                    <input
                                        type="time"
                                        min={minTimeHHmm}
                                        value={newApt.startTime || ''}
                                        onChange={(e) => {
                                            const newStart = e.target.value;
                                            if (!newApt.date) return;
                                            if (!newStart) {
                                                setNewApt({ ...newApt, startTime: newStart, endTime: undefined });
                                                return;
                                            }
                                            const nextEnd = addMinutesToClock(newStart, duration);
                                            if (rejeitarHorarioPassado(newApt.date, newStart, nextEnd)) return;
                                            setNewApt({ ...newApt, startTime: newStart, endTime: nextEnd });
                                        }}
                                        className={`w-full rounded-full border-0 bg-white p-3 text-sm font-bold text-on-surface outline-none ring-1 ring-slate-200 transition-all duration-300 focus:ring-2 focus:ring-[#2D6A4F] ${
                                            horarioPassadoBloqueante ? 'ring-2 ring-sanctuary-error' : ''
                                        }`}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="px-1 text-xs font-semibold text-on-surface-variant">
                                        Término (manual)
                                    </label>
                                    <input
                                        type="time"
                                        min={minTimeHHmm}
                                        value={newApt.endTime || ''}
                                        onChange={(e) => {
                                            const end = e.target.value;
                                            if (!newApt.date) return;
                                            if (!end) {
                                                setNewApt({ ...newApt, endTime: end });
                                                return;
                                            }
                                            const start = newApt.startTime || '00:00';
                                            if (rejeitarHorarioPassado(newApt.date, start, end)) return;
                                            setNewApt({ ...newApt, endTime: end });
                                        }}
                                        className={`w-full rounded-full border-0 bg-white p-3 text-sm font-bold text-on-surface outline-none ring-1 ring-slate-200 transition-all duration-300 focus:ring-2 focus:ring-[#2D6A4F] ${
                                            horarioPassadoBloqueante ? 'ring-2 ring-sanctuary-error' : ''
                                        }`}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 gap-4 pt-2">
                    {(bloqueioProfissional || horarioPassadoBloqueante) && (
                        <div className="rounded-stitch-lg bg-sanctuary-error-container/30 px-4 py-3 text-sm font-semibold text-red-950 ring-1 ring-sanctuary-error/25">
                            Conflito de agenda do profissional ou horário já passado. Ajuste antes de confirmar.
                        </div>
                    )}
                    {alunoConflitosSelecionado.length > 0 && (
                        <div className="rounded-stitch-lg bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200/70">
                            <p className="mb-2 font-semibold">
                                Conflito de horário do aluno com outro profissional. Só é possível confirmar com
                                autorização explícita.
                            </p>
                            {!confStudentOverride ? (
                                <button
                                    type="button"
                                    onClick={() => setConfStudentOverride(true)}
                                    className="w-full rounded-full bg-amber-500 py-2.5 text-xs font-bold uppercase tracking-wide text-on-background transition-colors duration-300 hover:bg-amber-400"
                                >
                                    Confirmar mesmo assim
                                </button>
                            ) : (
                                <p className="text-xs font-semibold text-amber-900">
                                    Confirmação registrada — o agendamento será salvo com a flag de conflito do aluno.
                                </p>
                            )}
                        </div>
                    )}
                </div>
                </div>
                </div>
            </main>
        </div>
    );
};

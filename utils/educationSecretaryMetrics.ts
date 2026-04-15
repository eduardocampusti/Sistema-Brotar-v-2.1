import { Student, User, UserScope, School, SupportProfessional, Appointment, isSupportProfessionalActive } from '../types';
import { categorizeSecretaryDiagnosis } from './teaAutismCount';

const COV_OK = '#1D9E75';
const COV_MID = '#BA7517';
const COV_LOW = '#E24B4A';

export function coverageColor(pct: number): string {
  if (pct >= 70) return COV_OK;
  if (pct >= 50) return COV_MID;
  return COV_LOW;
}

function schoolMatchesCocalTerritory(name: string, dist: string) {
  const n = (name || '').toLowerCase();
  const d = (dist || '').toLowerCase();
  return n.includes('cocal') || d.includes('cocal');
}

export interface SchoolCoverageRow {
  id: string;
  name: string;
  withP: number;
  total: number;
  pct: number;
  fill: string;
}

export interface DiagnosisDonutRow {
  name: string;
  value: number;
  pct: number;
}

export interface EducationSecretaryDerived {
  isCocal: boolean;
  scope: UserScope;
  scopedStudents: Student[];
  scopedStudentIdSet: Set<string>;
  scopedSchools: School[];
  scopedSchoolIdSet: Set<string>;
  scopedSupportProfessionals: SupportProfessional[];
  linkedStudentIds: Set<string>;
  strategic: {
    total: number;
    newThisMonth: number;
    coveragePct: number;
    withoutSupport: number;
    monthAptsTotal: number;
    covColor: string;
  };
  schoolCoverageRows: SchoolCoverageRow[];
  diagnosisDonut: DiagnosisDonutRow[];
}

/**
 * Mesma lógica de escopo e agregações usada em `EducationSecretaryDashboard` (RoleDashboards).
 */
export function computeEducationSecretaryDerived(
  students: Student[],
  schoolsList: School[],
  supportProfessionals: SupportProfessional[],
  appointments: Appointment[],
  currentUser: User,
  monthStr: string
): EducationSecretaryDerived {
  const isCocal = currentUser.scope === 'COCAL';
  const scope = currentUser.scope ?? 'GLOBAL';

  const scopedStudents = (() => {
    if (isCocal) {
      return students.filter(s => {
        const unit = String(s.unit || '').toUpperCase();
        const schoolName = (s.school.schoolName || '').toLowerCase();
        const district = (s.school.district || '').toLowerCase();
        return unit === 'COCAL' || schoolName.includes('cocal') || district.includes('cocal');
      });
    }
    if (currentUser.scope === 'SEDE') {
      return students.filter(s => {
        const unit = String(s.unit || '').toUpperCase();
        const schoolName = (s.school.schoolName || '').toLowerCase();
        const district = (s.school.district || '').toLowerCase();
        const isCocalStudent = unit === 'COCAL' || schoolName.includes('cocal') || district.includes('cocal');
        return !isCocalStudent;
      });
    }
    return students;
  })();

  const scopedStudentIdSet = new Set(scopedStudents.map(s => s.id));

  const scopedSchools = (() => {
    if (scope === 'COCAL' || isCocal) {
      return schoolsList.filter(sc => schoolMatchesCocalTerritory(sc.name, sc.district || ''));
    }
    if (scope === 'SEDE') {
      return schoolsList.filter(sc => !schoolMatchesCocalTerritory(sc.name, sc.district || ''));
    }
    return schoolsList;
  })();

  const scopedSchoolIdSet = new Set(scopedSchools.map(s => s.id).filter(Boolean));

  const scopedSupportProfessionals = supportProfessionals.filter(p => {
    if (!isSupportProfessionalActive(p)) return false;
    if (p.schoolId && scopedSchoolIdSet.has(p.schoolId)) return true;
    if (p.studentId && scopedStudentIdSet.has(p.studentId)) return true;
    return false;
  });

  const linkedStudentIds = new Set(
    scopedSupportProfessionals
      .map(p => p.studentId)
      .filter(id => id && String(id).trim() !== '' && scopedStudentIdSet.has(id as string))
  );

  const [y, m] = monthStr.split('-').map(Number);
  const startMs = new Date(y, m - 1, 1).getTime();
  const endMsMonth = new Date(y, m, 1).getTime();
  const total = scopedStudents.length;
  const newThisMonth = scopedStudents.filter(s => {
    if (!s.createdAt) return false;
    const t = new Date(s.createdAt).getTime();
    return !Number.isNaN(t) && t >= startMs && t < endMsMonth;
  }).length;
  const withSupportLink = scopedStudents.filter(s => linkedStudentIds.has(s.id)).length;
  const coveragePct = total > 0 ? Math.round((withSupportLink / total) * 1000) / 10 : 0;
  const withoutSupport = total - withSupportLink;
  const monthAptsTotal = appointments.filter(a => a.date && a.date.startsWith(monthStr)).length;
  const covColor = coverageColor(coveragePct);

  const schoolCoverageRows: SchoolCoverageRow[] = scopedSchools
    .map(sc => {
      const atSchool = scopedStudents.filter(s => {
        if (s.school.schoolId && sc.id) return s.school.schoolId === sc.id;
        const sn = (s.school.schoolName || '').trim().toLowerCase();
        const nn = (sc.name || '').trim().toLowerCase();
        return sn.length > 0 && sn === nn;
      });
      const rowTotal = atSchool.length;
      const withP = atSchool.filter(s => linkedStudentIds.has(s.id)).length;
      const pct = rowTotal > 0 ? Math.round((withP / rowTotal) * 1000) / 10 : 0;
      return {
        id: sc.id,
        name: sc.name || 'Escola',
        withP,
        total: rowTotal,
        pct,
        fill: coverageColor(pct),
      };
    })
    .filter(r => r.total > 0)
    .sort((a, b) => a.pct - b.pct);

  const order = [
    'TEA/Autismo',
    'Deficiência Intelectual',
    'Altas Habilidades',
    'Outros diagnósticos',
    'Sem CID informado',
  ] as const;
  const counts = new Map<string, number>();
  order.forEach(k => counts.set(k, 0));
  scopedStudents.forEach(s => {
    const k = categorizeSecretaryDiagnosis(s);
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  const n = scopedStudents.length || 1;
  const diagnosisDonut: DiagnosisDonutRow[] = order.map(name => ({
    name,
    value: counts.get(name) || 0,
    pct: Math.round(((counts.get(name) || 0) / n) * 1000) / 10,
  }));

  return {
    isCocal,
    scope,
    scopedStudents,
    scopedStudentIdSet,
    scopedSchools,
    scopedSchoolIdSet,
    scopedSupportProfessionals,
    linkedStudentIds,
    strategic: {
      total,
      newThisMonth,
      coveragePct,
      withoutSupport,
      monthAptsTotal,
      covColor,
    },
    schoolCoverageRows,
    diagnosisDonut,
  };
}

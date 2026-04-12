import type { Student } from '../types';

/**
 * Categorização alinhada ao gráfico «Distribuição por diagnóstico» (Secretaria de Educação).
 * Usada para contagem de TEA/Autismo nos painéis.
 */
export function categorizeSecretaryDiagnosis(s: Student): string {
    const cid = (s.clinical?.cid || '').toUpperCase().trim();
    const diagnosisRaw = s.clinical?.diagnosis || '';
    const dx = diagnosisRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const rawNeeds = s.clinical?.specialNeeds;
    const needsList = Array.isArray(rawNeeds) ? rawNeeds : rawNeeds != null && String(rawNeeds).trim() !== '' ? [String(rawNeeds)] : [];
    const needsLower = needsList.map(x => String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    const needsJoined = needsLower.join(' ');
    const textBlob = `${needsJoined} ${dx}`;

    const hasTea =
        cid.includes('F84') ||
        /\bf84\b/.test(dx) ||
        textBlob.includes('tea') ||
        textBlob.includes('autismo') ||
        textBlob.includes('transtorno do espectro') ||
        textBlob.includes('espectro autista') ||
        textBlob.includes('tgd') ||
        textBlob.includes('pervasiv');

    if (hasTea) return 'TEA/Autismo';
    if (cid.includes('F7') || textBlob.includes('deficiencia intelectual') || textBlob.includes('di intelectual'))
        return 'Deficiência Intelectual';
    if (textBlob.includes('altas habilidades') || textBlob.includes('superdot')) return 'Altas Habilidades';
    if (cid.length > 0 || diagnosisRaw.trim().length > 0) return 'Outros diagnósticos';
    return 'Sem CID informado';
}

export function countTeaAutismStudents(students: Student[]): number {
    return students.filter(s => categorizeSecretaryDiagnosis(s) === 'TEA/Autismo').length;
}

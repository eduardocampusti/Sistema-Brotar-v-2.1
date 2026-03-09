/**
 * Utilitários para Normalização e Sanitização de Dados (CSV Import)
 */

/**
 * Remove pontos, traços e outros caracteres não numéricos de CPF ou Cartão SUS.
 */
export const sanitizeNumericString = (val: string | undefined | null): string => {
    if (!val) return '';
    return val.replace(/\D/g, '');
};

/**
 * Converte data do formato brasileiro (DD/MM/AAAA) para ISO (YYYY-MM-DD).
 * Se já estiver em formato ISO ou inválido, tenta tratar da melhor forma.
 */
export const parseBrazilianDate = (dateStr: string | undefined | null): string | null => {
    if (!dateStr) return null;

    const trimmed = dateStr.trim();

    // Caso 1: DD/MM/AAAA
    if (trimmed.includes('/')) {
        const parts = trimmed.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
        }
    }

    // Caso 2: Já é ISO ou similar
    if (trimmed.includes('-')) {
        return trimmed.split('T')[0];
    }

    return null;
};

/**
 * Normaliza nomes para o padrão do sistema (João Silva)
 * Nota: No banco existe a função public.normalize_name que faz isso via SQL,
 * mas ter uma versão JS ajuda no preview da UI.
 */
export const normalizeNameJS = (name: string | undefined | null): string => {
    if (!name) return '';

    const lowerExceptions = ['de', 'da', 'do', 'das', 'dos', 'e'];
    const parts = name.trim().toLowerCase().split(/\s+/);

    return parts.map((word, index) => {
        if (lowerExceptions.includes(word) && index > 0) {
            return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
};

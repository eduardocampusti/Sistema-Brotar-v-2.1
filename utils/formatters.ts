/**
 * Formata um nome próprio no padrão brasileiro:
 * - Primeira letra de cada palavra em maiúscula.
 * - Restante em minúscula.
 * - Preposições (de, da, do, das, dos, e) permanecem em minúscula.
 * - Remove espaços extras.
 * 
 * @param texto Nome a ser formatado
 * @returns Nome formatado
 */
export const formatarNomeBR = (texto: string): string => {
    if (!texto) return '';

    const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e'];

    return texto
        .toLowerCase()
        .replace(/\s+/g, ' ') // Remove espaços múltiplos internos
        .trim()               // Remove espaços no início e fim
        .split(' ')
        .map((palavra, index) => {
            // Se for uma preposição e não for a primeira palavra, mantém minúscula
            if (preposicoes.includes(palavra) && index !== 0) {
                return palavra;
            }

            // Para nomes como D'Ávila ou com hífens (comum em nomes compostos)
            // Capitaliza após o apóstrofo ou hífen
            if (palavra.includes("'")) {
                const partes = palavra.split("'");
                return partes.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("'");
            }

            if (palavra.includes("-")) {
                const partes = palavra.split("-");
                return partes.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("-");
            }

            // Capitaliza a primeira letra normalmente
            return palavra.charAt(0).toUpperCase() + palavra.slice(1);
        })
        .join(' ');
};

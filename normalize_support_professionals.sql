-- 1. CRIANDO A FUNÇÃO REUTILIZÁVEL DE NORMALIZAÇÃO DE TEXTO
CREATE OR REPLACE FUNCTION public.normalize_name(input_string text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    word text;
    result text := '';
    words text[];
    lower_exceptions text[] := ARRAY['de', 'da', 'do', 'das', 'dos', 'e'];
    i integer;
BEGIN
    IF input_string IS NULL THEN RETURN NULL; END IF;

    -- Se não for tudo maiúsculo (ignorando caracteres não-alfabéticos), não mexe (sinal que já foi formatado manual)
    IF input_string <> upper(input_string) THEN RETURN input_string; END IF;

    -- Quebra a string por espaços (suporta múltiplos espaços)
    words := regexp_split_to_array(btrim(input_string), '\s+');
    
    FOR i IN 1..array_length(words, 1) LOOP
        word := lower(words[i]);
        
        -- Se for exceção E não for a primeira palavra, mantemos minúsculo.
        IF word = ANY(lower_exceptions) AND i > 1 THEN
            result := result || word;
        ELSE
            -- Capitaliza primeira letra e concatena o resto
            result := result || initcap(word);
        END IF;

        IF i < array_length(words, 1) THEN
            result := result || ' ';
        END IF;
    END LOOP;

    RETURN result;
END;
$$;

-- 2. SALVANDO BACKUP EM vw_backup_profissionais_pre_normalizacao
CREATE TABLE IF NOT EXISTS public.vw_backup_profissionais_pre_normalizacao AS
SELECT * FROM public.support_professionals WHERE name = upper(name) AND name ~ '[A-Z]';

-- 3. ATUALIZANDO CAMPOS TEXTUAIS
UPDATE public.support_professionals
SET 
    name = normalize_name(name),
    education = CASE WHEN education = upper(education) THEN normalize_name(education) ELSE education END,
    workload = CASE WHEN workload = upper(workload) THEN normalize_name(workload) ELSE workload END,
    regent_teacher = CASE WHEN regent_teacher = upper(regent_teacher) THEN normalize_name(regent_teacher) ELSE regent_teacher END
WHERE name = upper(name) AND name ~ '[A-Z]';

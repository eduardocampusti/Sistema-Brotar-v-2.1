-- 1. CRIANDO A FUNÇÃO REUTILIZÁVEL DE NORMALIZAÇÃO DE TEXTO
-- Esta função converte textos CAIXA ALTA para Capitalize, respeitando preposições
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
    IF input_string IS NULL THEN
        RETURN NULL;
    END IF;

    -- Se não for tudo maiúsculo (ignorando caracteres não-alfabéticos), não mexe (sinal que já foi formatado manual)
    IF input_string <> upper(input_string) THEN
        RETURN input_string;
    END IF;

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

-- 2. BLOCO DE EXECUÇÃO E PREVIEW CIRÚRGICO
DO $$
DECLARE
    -- Registro de log
    r_record record;
    update_count integer := 0;
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE '🚀 INICIANDO PREVIEW DE NORMALIZAÇÃO DA TABELA DE ATs';
    RAISE NOTICE '=======================================================';

    -- PREVIEW: Mostra os 10 primeiros que serão alterados
    RAISE NOTICE '👀 Amostra de Cadastros que mudarão de formato:';
    FOR r_record IN 
        SELECT id, name AS old_name, normalize_name(name) AS new_name,
               education AS old_edu, normalize_name(education) AS new_edu
        FROM public.support_professionals
        WHERE name = upper(name) AND name ~ '[A-Z]'
        LIMIT 10
    LOOP
        RAISE NOTICE '---------------------------------------------------';
        RAISE NOTICE 'ATUAL: %', r_record.old_name;
        RAISE NOTICE 'NOVO : %', r_record.new_name;
        
        IF r_record.old_edu IS NOT NULL AND r_record.old_edu = upper(r_record.old_edu) THEN
            RAISE NOTICE 'EDU ATUAL: %', r_record.old_edu;
            RAISE NOTICE 'EDU NOVO : %', r_record.new_edu;
        END IF;
    END LOOP;

    -- CONTAGEM DE IMPACTO
    SELECT count(*) INTO update_count
    FROM public.support_professionals
    WHERE name = upper(name) AND name ~ '[A-Z]';

    RAISE NOTICE '=======================================================';
    RAISE NOTICE '📊 TOTAL DE REGISTROS A SEREM ATUALIZADOS: %', update_count;
    RAISE NOTICE '=======================================================';

    /* =========================================================================
       INSTRUÇÕES PARA ATUALIZAÇÃO DEFINITIVA (DESCOMENTE PARA APLICAR)
       =========================================================================
       Quando você estiver seguro com o preview que apareceu nos logs, 
       selecione o código abaixo e execute no SQL Editor:
    */
    
    /*
    BEGIN; -- Inicia transação segura
      
      -- Salva um backup em formato JSON em uma tabela temporária de auditoria
      CREATE TABLE IF NOT EXISTS public.vw_backup_profissionais AS
      SELECT * FROM public.support_professionals WHERE name = upper(name) AND name ~ '[A-Z]';

      -- Atualiza apenas as colunas de texto de quem está com CAPS LOCK preso
      UPDATE public.support_professionals
      SET 
          name = normalize_name(name),
          education = CASE WHEN education = upper(education) THEN normalize_name(education) ELSE education END,
          "regentTeacher" = CASE WHEN "regentTeacher" = upper("regentTeacher") THEN normalize_name("regentTeacher") ELSE "regentTeacher" END
      WHERE name = upper(name) AND name ~ '[A-Z]';

    COMMIT; -- Efetiva
    */

END $$;

-- Correção de RLS para a tabela appointments (Agendamentos)
-- Esse script garante que qualquer usuário logado (Recepção, Especialista, Admin) possa inserir, atualizar e ler os agendamentos.

-- 1. Habilitar RLS (caso não esteja)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas que possam estar bloqueando (nomes comuns)
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON appointments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON appointments;

-- 3. Criar política global para usuários autenticados
CREATE POLICY "Enable all access for authenticated users" 
ON appointments 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Extra: Garantir que a tabela schools (se usada na busca) também seja legível
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON schools;
CREATE POLICY "Enable read access for all authenticated users" 
ON schools 
FOR SELECT 
TO authenticated 
USING (true);

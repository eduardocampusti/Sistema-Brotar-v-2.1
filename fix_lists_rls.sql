-- Script para corrigir a visualização de listas (Perfis, Alunos, Escolas)
-- Garante que recepcionistas e assistentes possam carregar os dados no select do agendamento

-- 1. Permissão de leitura para PROFILES (Para carregar a lista de profissionais)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON profiles;
CREATE POLICY "Enable read access for all authenticated users" 
ON profiles 
FOR SELECT 
TO authenticated 
USING (true);

-- 2. Permissão de leitura para STUDENTS (Para carregar a lista de alunos)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON students;
CREATE POLICY "Enable read access for all authenticated users" 
ON students 
FOR SELECT 
TO authenticated 
USING (true);

-- 3. Permissão de leitura para SCHOOLS (Para carregar as opções de filtros)
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON schools;
CREATE POLICY "Enable read access for all authenticated users" 
ON schools 
FOR SELECT 
TO authenticated 
USING (true);

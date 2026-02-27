-- SCRIPT DE EMERGÊNCIA
-- Isso vai desativar o RLS nas tabelas e fazer o sistema voltar ao normal imediatamente.

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;

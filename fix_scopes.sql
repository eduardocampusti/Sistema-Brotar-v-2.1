-- Normalização de Escopo para Perfis Gestores
-- Garante que o Secretário de Educação tenha acesso global irrestrito em toda a rede.

UPDATE profiles 
SET scope = 'GLOBAL' 
WHERE role = 'EDUCATION_SECRETARY' AND (scope IS NULL OR scope != 'GLOBAL');

-- Verifica as mudanças
SELECT full_name, role, scope FROM profiles WHERE role = 'EDUCATION_SECRETARY';

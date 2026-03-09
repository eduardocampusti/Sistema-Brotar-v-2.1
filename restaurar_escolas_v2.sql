
-- RESTAURAÇÃO DE UNIDADES ESCOLARES (VERSÃO 2) - SISTEMA BROTAR
-- Projeto: indshiztdvjgvgnzigqd
-- Esta versão foca apenas nas escolas para evitar erros de ID no perfil.

-- 1. Limpa dados antigos para garantir inserção limpa
TRUNCATE public.schools CASCADE;

-- 2. Insere as 29 escolas originais
INSERT INTO public.schools (name, inep, district, is_active) VALUES
('Creche Emilce Saldanha Silva', '29204410', 'SEDE', true),
('Escola Familia Agricola Regional - Efar', '29464498', 'SEDE', true),
('Escola Mun. Agostinho Ribeiro', '29204542', 'ZONA RURAL', true),
('Escola Mun. Benjamin Constant', '29204445', 'ZONA RURAL', true),
('Escola Mun. Castro Alves', '29386608', 'COCAL', true),
('Escola Mun. D. Pedro I', '29205042', 'COCAL', true),
('Escola Mun. D. Pedro II', '29205050', 'ZONA RURAL', true),
('Escola Mun. de 1º Grau Bom Jesus', '29204569', 'ZONA RURAL', true),
('Escola Mun. de E. Infantil Dr. Otávio Mangabeira', '29204984', 'SEDE', true),
('Escola Mun. Dois de Julho', '29204496', 'ZONA RURAL', true),
('Escola Mun. Dr. Antônio Carlos Magalhães', '29204909', 'COCAL', true),
('Escola Mun. Gaudencio Oliveira', '29204585', 'ZONA RURAL', true),
('Escola Mun. Getulio Vargas', '29205310', 'COCAL', true),
('Escola Mun. Horacio de Matos', '29204941', 'COCAL', true),
('Escola Mun. José Antonio Pereira', '29205271', 'COCAL', true),
('Escola Mun. Luis Eduardo Magalhães', '29362202', 'COCAL', true),
('Escola Mun. Luiz Viana Filho', '29204640', 'COCAL', true),
('Escola Mun. Marechal Deodoro', '29205336', 'ZONA RURAL', true),
('Escola Mun. Maria de Meira Lima Costa', '29205220', 'SEDE', true),
('Escola Mun. Nossa Senhora de Brotas', '29204402', 'SEDE', true),
('Escola Mun. Nossa Senhora do Carmo', '29205115', 'ZONA RURAL', true),
('Escola Mun. Papa Joao Paulo II', '29438756', 'SUMIDOURO', true),
('Escola Mun. Paulo Freire', '29205379', 'COCAL', true),
('Escola Mun. Pedro Miranda', '29205255', 'COCAL', true),
('Escola Mun. Prudente de Morais', '29205131', 'COCAL', true),
('Escola Mun. Roberto Santos', '29205352', 'COCAL', true),
('Escola Mun. Rui Barbosa', '29204755', 'COCAL', true),
('Escola Mun. Santa Terezinha', '29205360', 'COCAL', true),
('Escola Mun. Timoteo Lopes', '29205166', 'ZONA RURAL', true);

-- Verifica o total inserido (deve ser 29)
SELECT count(*) FROM public.schools;

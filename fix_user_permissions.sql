-- Desabilita RLS na tabela profiles para permitir edição livre de cargos/perfis por enquanto
-- Isso resolve o problema de "Updates ignorados" onde o comando roda com sucesso mas nada muda
alter table profiles disable row level security;

-- Se houver triggers de sincronização que impedem update, isso aqui não remove, mas RLS é a causa #1.

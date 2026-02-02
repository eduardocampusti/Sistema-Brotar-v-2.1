-- Desabilita RLS temporariamente para garantir acesso total e debugar
alter table support_professionals disable row level security;

-- (Opcional) Reabilita com política permissiva se preferir manter RLS ligado
-- alter table support_professionals enable row level security;
-- create policy "Acesso Total para Todos" on support_professionals for all using (true) with check (true);

-- Garante que a coluna school_id e student_id tenham as foreign keys corretas (opcional, apenas verificação)
-- Se os inserts falharem silenciosamente, pode ser FK. Mas com RLS desativado, erros de FK apareceriam no catch.

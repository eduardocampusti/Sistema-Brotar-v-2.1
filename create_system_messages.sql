-- Tabela de Mensagens do Sistema
create table if not exists system_messages (
    id uuid default gen_random_uuid() primary key,
    sender_id uuid references profiles(id) not null,
    recipient_id uuid references profiles(id), -- Pode ser null se for broadcast (futuro)
    title text not null,
    content text not null,
    priority text default 'normal', -- 'normal', 'urgent'
    is_read boolean default false,
    created_at timestamp with time zone default now()
);

-- Políticas de Segurança (RLS)
alter table system_messages enable row level security;

-- Política de Leitura: Usuário vê mensagens onde ele é o destinatário OU o remetente
create policy "Users can read their own messages"
    on system_messages for select
    using (auth.uid() = recipient_id or auth.uid() = sender_id);

-- Política de Inserção: Usuário autenticado pode enviar mensagem
create policy "Users can insert messages"
    on system_messages for insert
    with check (auth.uid() = sender_id);

-- Política de Atualização: Apenas marcar como lida (destinatário)
create policy "Recipients can mark as read"
    on system_messages for update
    using (auth.uid() = recipient_id);

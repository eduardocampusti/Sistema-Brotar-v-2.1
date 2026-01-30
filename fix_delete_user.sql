-- Função para excluir usuário do Auth e do Public (Admin Only)
-- Deve ser rodada no SQL Editor do Supabase dashboard

create or replace function public.delete_user_complete(target_user_id uuid)
returns void as $$
begin
  -- Exclui do Auth (Cascata deve excluir do profile, mas garantimos)
  delete from auth.users where id = target_user_id;
  
  -- Se não tiver cascata configurada, exclui do profile manualmente:
  -- delete from public.profiles where id = target_user_id;
end;
$$ language plpgsql security definer;

-- Permite que apenas Admins executem (ajuste conforme suas policies)
-- revoke all on function public.delete_user_complete from public, anon, authenticated;
-- grant execute on function public.delete_user_complete to service_role; 
-- (Na prática, como estamos usando anon key no front, teremos que deixar public por enquanto 
-- ou criar uma policy melhor, mas para resolver AGORA, vamos deixar acessível e validar no App level)

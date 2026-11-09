-- =========================================================
-- Plascotel — Endurecimento de acesso admin
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute,
-- DEPOIS de já ter rodado schema.sql e storage.sql.
-- Pode rodar novamente sem problemas (idempotente).
--
-- POR QUE ISSO EXISTE
-- O schema original tratava "qualquer usuário autenticado" como admin
-- (auth.role() = 'authenticated'). Com o cadastro de usuários aberto no
-- Supabase Auth, qualquer pessoa poderia se registrar, confirmar o próprio
-- e-mail e virar admin da loja (editar preços/produtos, ler pedidos com os
-- dados dos clientes, apagar pedidos). Este arquivo troca o modelo: admin
-- passa a ser só quem está na tabela "admins" (lista fechada), e nunca mais
-- "qualquer um que tenha uma conta".
--
-- IMPORTANTE: além de rodar isto, DESLIGUE o cadastro público no painel —
-- Authentication → Sign In / Providers → "Allow new users to sign up" OFF.
-- =========================================================

-- ---------------------------------------------------------
-- 1) Lista de administradores
-- ---------------------------------------------------------
create table if not exists admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  criado_em timestamptz not null default now()
);

alter table admins enable row level security;
-- Sem nenhuma policy de escrita: ninguém promove admin pelo navegador.
-- A lista só é gerenciada por aqui (SQL Editor) ou pelo service_role.

-- Semeia com os usuários que JÁ existem hoje (as contas legítimas da loja),
-- pra que ninguém fique trancado pra fora ao aplicar a troca abaixo.
-- Contas novas que se registrarem NÃO entram aqui automaticamente.
insert into admins (user_id, email)
select id, email from auth.users
on conflict (user_id) do nothing;

-- Deixa o admin logado ver quem está na lista (útil no painel, opcional).
drop policy if exists "admins_select_proprio" on admins;
create policy "admins_select_proprio" on admins
  for select using (user_id = (select auth.uid()));

-- ---------------------------------------------------------
-- 2) Função is_admin(): o usuário logado está na lista?
-- ---------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------
-- 3) Troca TODAS as policies de admin: is_admin() no lugar de
--    auth.role() = 'authenticated'
-- ---------------------------------------------------------
drop policy if exists "categorias_admin_all" on categorias;
create policy "categorias_admin_all" on categorias
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "produtos_admin_all" on produtos;
create policy "produtos_admin_all" on produtos
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "produto_variantes_admin_all" on produto_variantes;
create policy "produto_variantes_admin_all" on produto_variantes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pedidos_admin_all" on pedidos;
create policy "pedidos_admin_all" on pedidos
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pedido_itens_admin_all" on pedido_itens;
create policy "pedido_itens_admin_all" on pedido_itens
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "conteudo_site_admin_all" on conteudo_site;
create policy "conteudo_site_admin_all" on conteudo_site
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------
-- 4) Storage (bucket de imagens): só admin envia/altera/apaga
-- ---------------------------------------------------------
drop policy if exists "imagens_admin_insert" on storage.objects;
create policy "imagens_admin_insert" on storage.objects
  for insert with check (bucket_id = 'imagens' and public.is_admin());

drop policy if exists "imagens_admin_update" on storage.objects;
create policy "imagens_admin_update" on storage.objects
  for update using (bucket_id = 'imagens' and public.is_admin());

drop policy if exists "imagens_admin_delete" on storage.objects;
create policy "imagens_admin_delete" on storage.objects
  for delete using (bucket_id = 'imagens' and public.is_admin());

-- ---------------------------------------------------------
-- 5) Funções security definer chamadas pelo admin: exigem is_admin()
-- ---------------------------------------------------------
-- admin_salvar_variantes: antes checava só auth.role()='authenticated'.
create or replace function admin_salvar_variantes(p_produto_id uuid, p_variantes jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Não autorizado.';
  end if;

  delete from produto_variantes where produto_id = p_produto_id;

  insert into produto_variantes (
    produto_id, cor, tamanho, preco, preco_promocional, estoque, imagens,
    peso, altura, largura, comprimento, ordem
  )
  select
    p_produto_id,
    coalesce(v->>'cor', ''),
    coalesce(v->>'tamanho', ''),
    (v->>'preco')::numeric,
    nullif(v->>'precoPromocional', '')::numeric,
    (v->>'estoque')::integer,
    coalesce(
      (select array_agg(x) from jsonb_array_elements_text(v->'imagens') x),
      '{}'
    ),
    nullif(v->>'peso', '')::numeric,
    nullif(v->>'altura', '')::numeric,
    nullif(v->>'largura', '')::numeric,
    nullif(v->>'comprimento', '')::numeric,
    (ord - 1)::integer
  from jsonb_array_elements(coalesce(p_variantes, '[]'::jsonb)) with ordinality as t(v, ord);
end;
$$;

-- Fecha a porta: anon/public não executam mais; só usuário logado (e, dentro
-- da função, só quem for is_admin() de fato).
revoke execute on function admin_salvar_variantes(uuid, jsonb) from public, anon;
grant execute on function admin_salvar_variantes(uuid, jsonb) to authenticated;

-- criar_pedido legado (venda manual do admin): exige is_admin() na prática,
-- via grant só pra authenticated (a função já não aceita mais chamada anon).
revoke execute on function criar_pedido(jsonb, jsonb, numeric, numeric, numeric, text, text) from public, anon;
grant execute on function criar_pedido(jsonb, jsonb, numeric, numeric, numeric, text, text) to authenticated;

-- ---------------------------------------------------------
-- Como adicionar/remover um admin depois (rode só a linha que precisar):
--
--   insert into admins (user_id, email)
--   select id, email from auth.users where email = 'nova-pessoa@exemplo.com'
--   on conflict (user_id) do nothing;
--
--   delete from admins where email = 'ex-funcionario@exemplo.com';
-- ---------------------------------------------------------

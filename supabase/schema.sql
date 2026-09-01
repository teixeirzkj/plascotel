-- =========================================================
-- Plascotel — schema do banco (Supabase / PostgreSQL)
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute.
-- Pode rodar novamente sem problemas (usa "if not exists"/"or replace").
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------

create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  descricao text not null default '',
  imagem text not null default '',
  criado_em timestamptz not null default now()
);

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  categoria_id uuid references categorias(id) on delete set null,
  descricao text not null default '',
  descricao_curta text not null default '',
  preco numeric(10, 2) not null default 0,
  preco_promocional numeric(10, 2),
  imagens text[] not null default '{}',
  cores text[] not null default '{}',
  dimensoes text not null default '',
  material text not null default '',
  estoque integer not null default 0 check (estoque >= 0),
  destaque boolean not null default false,
  oferta boolean not null default false,
  novo boolean not null default false,
  mais_vendido boolean not null default false,
  prazo_entrega text not null default '',
  peso numeric(10, 3),
  altura numeric(10, 2),
  largura numeric(10, 2),
  comprimento numeric(10, 2),
  criado_em timestamptz not null default now()
);

-- Garante as colunas de peso/dimensões em bancos criados antes desta versão
-- do schema (rodar o arquivo de novo não recria a tabela "produtos").
alter table produtos add column if not exists peso numeric(10, 3);
alter table produtos add column if not exists altura numeric(10, 2);
alter table produtos add column if not exists largura numeric(10, 2);
alter table produtos add column if not exists comprimento numeric(10, 2);

-- Variações (cor e/ou tamanho) com preço, estoque e fotos próprios
-- (opcional). Um produto sem linhas aqui continua usando preço/estoque/
-- fotos da tabela "produtos" normalmente — variações só entram em jogo
-- quando cadastradas. Cada linha pode ter só cor, só tamanho, ou os dois
-- juntos (ex: "Branco" + "P"), dependendo do que o produto precisar.
create table if not exists produto_variantes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  cor text not null default '',
  tamanho text not null default '',
  preco numeric(10, 2) not null,
  preco_promocional numeric(10, 2),
  estoque integer not null default 0 check (estoque >= 0),
  imagens text[] not null default '{}',
  -- Peso/dimensões da embalagem dessa variação específica (opcional). Se
  -- vazio, o cálculo de frete usa o peso/dimensões gerais do produto.
  peso numeric(10, 3),
  altura numeric(10, 2),
  largura numeric(10, 2),
  comprimento numeric(10, 2),
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  check (cor <> '' or tamanho <> ''),
  unique (produto_id, cor, tamanho)
);

-- Garante as colunas e as regras em bancos criados antes desta versão do
-- schema (quando a tabela já existia só com "cor", sem "tamanho"/peso).
alter table produto_variantes add column if not exists tamanho text not null default '';
alter table produto_variantes add column if not exists peso numeric(10, 3);
alter table produto_variantes add column if not exists altura numeric(10, 2);
alter table produto_variantes add column if not exists largura numeric(10, 2);
alter table produto_variantes add column if not exists comprimento numeric(10, 2);
alter table produto_variantes alter column cor set default '';
alter table produto_variantes drop constraint if exists produto_variantes_produto_id_cor_key;
alter table produto_variantes drop constraint if exists produto_variantes_cor_check;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'produto_variantes_produto_id_cor_tamanho_key'
  ) then
    alter table produto_variantes
      add constraint produto_variantes_produto_id_cor_tamanho_key unique (produto_id, cor, tamanho);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'produto_variantes_cor_tamanho_check'
  ) then
    alter table produto_variantes
      add constraint produto_variantes_cor_tamanho_check check (cor <> '' or tamanho <> '');
  end if;
end $$;

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  numero serial,
  subtotal numeric(10, 2) not null,
  frete numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  forma_pagamento text not null default 'whatsapp',
  status text not null default 'novo',
  cliente jsonb not null,
  criado_em timestamptz not null default now()
);

create table if not exists pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  produto_id uuid references produtos(id) on delete set null,
  variante_id uuid references produto_variantes(id) on delete set null,
  nome text not null,
  preco_unitario numeric(10, 2) not null,
  quantidade integer not null check (quantidade > 0)
);

-- Garante a coluna em bancos criados antes desta versão do schema.
alter table pedido_itens add column if not exists variante_id uuid references produto_variantes(id) on delete set null;

-- ---------------------------------------------------------
-- Estoque automático
-- ---------------------------------------------------------

-- Cria o pedido inteiro (pedido + itens) e dá baixa no estoque em uma
-- única transação. Usa "for update" para travar a linha do produto e
-- evitar que dois clientes comprem a última unidade ao mesmo tempo.
create or replace function criar_pedido(
  p_itens jsonb,
  p_cliente jsonb,
  p_subtotal numeric,
  p_frete numeric,
  p_total numeric,
  p_forma_pagamento text
)
returns table (id uuid, numero integer, criado_em timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_numero integer;
  v_criado_em timestamptz;
  v_item jsonb;
  v_estoque_atual integer;
  v_variante_id uuid;
begin
  insert into pedidos (subtotal, frete, total, forma_pagamento, cliente)
  values (p_subtotal, p_frete, p_total, p_forma_pagamento, p_cliente)
  returning pedidos.id, pedidos.numero, pedidos.criado_em
  into v_pedido_id, v_numero, v_criado_em;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_variante_id := nullif(v_item->>'variante_id', '')::uuid;

    if v_variante_id is not null then
      -- Item com variação de cor: a baixa é no estoque da variação.
      select estoque into v_estoque_atual
      from produto_variantes
      where produto_variantes.id = v_variante_id
      for update;

      if v_estoque_atual is null then
        raise exception 'Variação % não encontrada', v_variante_id;
      end if;

      if v_estoque_atual < (v_item->>'quantidade')::integer then
        raise exception 'Estoque insuficiente para o produto %', v_item->>'nome';
      end if;

      update produto_variantes
      set estoque = estoque - (v_item->>'quantidade')::integer
      where produto_variantes.id = v_variante_id;
    elsif (v_item->>'produto_id') is not null then
      select estoque into v_estoque_atual
      from produtos
      where produtos.id = (v_item->>'produto_id')::uuid
      for update;

      if v_estoque_atual is null then
        raise exception 'Produto % não encontrado', v_item->>'produto_id';
      end if;

      if v_estoque_atual < (v_item->>'quantidade')::integer then
        raise exception 'Estoque insuficiente para o produto %', v_item->>'nome';
      end if;

      update produtos
      set estoque = estoque - (v_item->>'quantidade')::integer
      where produtos.id = (v_item->>'produto_id')::uuid;
    end if;

    insert into pedido_itens (pedido_id, produto_id, variante_id, nome, preco_unitario, quantidade)
    values (
      v_pedido_id,
      nullif(v_item->>'produto_id', '')::uuid,
      v_variante_id,
      v_item->>'nome',
      (v_item->>'preco_unitario')::numeric,
      (v_item->>'quantidade')::integer
    );
  end loop;

  return query select v_pedido_id, v_numero, v_criado_em;
end;
$$;

-- Quando um pedido é cancelado, devolve as unidades ao estoque
-- automaticamente (e vice-versa: se um pedido cancelado for reativado,
-- as unidades voltam a ser descontadas).
create or replace function restaurar_estoque_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelado' and old.status <> 'cancelado' then
    update produtos p
    set estoque = p.estoque + i.quantidade
    from pedido_itens i
    where i.pedido_id = new.id
      and i.produto_id = p.id
      and i.variante_id is null;

    update produto_variantes v
    set estoque = v.estoque + i.quantidade
    from pedido_itens i
    where i.pedido_id = new.id
      and i.variante_id = v.id;
  elsif old.status = 'cancelado' and new.status <> 'cancelado' then
    update produtos p
    set estoque = greatest(p.estoque - i.quantidade, 0)
    from pedido_itens i
    where i.pedido_id = new.id
      and i.produto_id = p.id
      and i.variante_id is null;

    update produto_variantes v
    set estoque = greatest(v.estoque - i.quantidade, 0)
    from pedido_itens i
    where i.pedido_id = new.id
      and i.variante_id = v.id;
  end if;
  return new;
end;
$$;

-- Substitui de uma vez todas as variações de cor de um produto (usado pelo
-- admin ao salvar o formulário de produto). Fica em uma função só para que
-- apagar as antigas e inserir as novas aconteça em uma única transação.
create or replace function admin_salvar_variantes(p_produto_id uuid, p_variantes jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- É "security definer" (ignora RLS), então precisa checar autenticação
  -- manualmente: só o admin logado pode reescrever variações.
  if auth.role() <> 'authenticated' then
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

drop trigger if exists trg_restaurar_estoque on pedidos;
create trigger trg_restaurar_estoque
  after update of status on pedidos
  for each row
  execute function restaurar_estoque_pedido();

-- ---------------------------------------------------------
-- Segurança (Row Level Security)
-- ---------------------------------------------------------

alter table categorias enable row level security;
alter table produtos enable row level security;
alter table produto_variantes enable row level security;
alter table pedidos enable row level security;
alter table pedido_itens enable row level security;

-- Qualquer visitante do site pode ver categorias, produtos e variações.
drop policy if exists "categorias_select_publico" on categorias;
create policy "categorias_select_publico" on categorias
  for select using (true);

drop policy if exists "produtos_select_publico" on produtos;
create policy "produtos_select_publico" on produtos
  for select using (true);

drop policy if exists "produto_variantes_select_publico" on produto_variantes;
create policy "produto_variantes_select_publico" on produto_variantes
  for select using (true);

-- Somente administradores logados (Supabase Auth) podem criar, editar
-- ou excluir categorias e produtos.
drop policy if exists "categorias_admin_all" on categorias;
create policy "categorias_admin_all" on categorias
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "produtos_admin_all" on produtos;
create policy "produtos_admin_all" on produtos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "produto_variantes_admin_all" on produto_variantes;
create policy "produto_variantes_admin_all" on produto_variantes
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Pedidos só podem ser lidos/alterados pelo admin. A criação de pedidos
-- pelo site acontece só através da função "criar_pedido" (security definer),
-- então não é preciso liberar "insert" para o público.
drop policy if exists "pedidos_admin_all" on pedidos;
create policy "pedidos_admin_all" on pedidos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "pedido_itens_admin_all" on pedido_itens;
create policy "pedido_itens_admin_all" on pedido_itens
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- Dados iniciais (opcional): descomente para popular o banco com os
-- mesmos produtos de exemplo usados no site antes de conectar o banco.
-- ---------------------------------------------------------
-- Veja src/data/categories.ts e src/data/products.ts para copiar os
-- valores caso queira gerar os inserts manualmente.

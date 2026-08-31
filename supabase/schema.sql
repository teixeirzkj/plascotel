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
  criado_em timestamptz not null default now()
);

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
  nome text not null,
  preco_unitario numeric(10, 2) not null,
  quantidade integer not null check (quantidade > 0)
);

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
begin
  insert into pedidos (subtotal, frete, total, forma_pagamento, cliente)
  values (p_subtotal, p_frete, p_total, p_forma_pagamento, p_cliente)
  returning pedidos.id, pedidos.numero, pedidos.criado_em
  into v_pedido_id, v_numero, v_criado_em;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    if (v_item->>'produto_id') is not null then
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

    insert into pedido_itens (pedido_id, produto_id, nome, preco_unitario, quantidade)
    values (
      v_pedido_id,
      nullif(v_item->>'produto_id', '')::uuid,
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
      and i.produto_id = p.id;
  elsif old.status = 'cancelado' and new.status <> 'cancelado' then
    update produtos p
    set estoque = greatest(p.estoque - i.quantidade, 0)
    from pedido_itens i
    where i.pedido_id = new.id
      and i.produto_id = p.id;
  end if;
  return new;
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
alter table pedidos enable row level security;
alter table pedido_itens enable row level security;

-- Qualquer visitante do site pode ver categorias e produtos.
drop policy if exists "categorias_select_publico" on categorias;
create policy "categorias_select_publico" on categorias
  for select using (true);

drop policy if exists "produtos_select_publico" on produtos;
create policy "produtos_select_publico" on produtos
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

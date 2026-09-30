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

-- Avaliação simples (definida pelo admin, sem sistema de review de
-- clientes): média de 0 a 5 estrelas e quantas avaliações formam essa
-- média. Quantidade 0 = ainda sem avaliação, não mostra nada no site.
alter table produtos add column if not exists avaliacao_media numeric(2, 1) not null default 0;
alter table produtos add column if not exists avaliacao_quantidade integer not null default 0;

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

-- Remove uma versão antiga de 6 parâmetros (sem p_status) que pode existir
-- em bancos criados antes desse campo ganhar um valor padrão — "create or
-- replace" só substitui uma função de MESMA assinatura; com assinaturas
-- diferentes, as duas ficam coexistindo e o Postgres não consegue mais
-- decidir qual chamar quando p_status é omitido ("ambiguous function call").
drop function if exists criar_pedido(jsonb, jsonb, numeric, numeric, numeric, text);

-- Cria o pedido inteiro (pedido + itens) e dá baixa no estoque em uma
-- única transação. Usa "for update" para travar a linha do produto e
-- evitar que dois clientes comprem a última unidade ao mesmo tempo.
create or replace function criar_pedido(
  p_itens jsonb,
  p_cliente jsonb,
  p_subtotal numeric,
  p_frete numeric,
  p_total numeric,
  p_forma_pagamento text,
  p_status text default 'novo'
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
  insert into pedidos (subtotal, frete, total, forma_pagamento, cliente, status)
  values (p_subtotal, p_frete, p_total, p_forma_pagamento, p_cliente, p_status)
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
-- Conteúdo do site (banner, "sobre", rodapé etc) — editável no admin em
-- "Seções", sem precisar mexer em código. Guardado como chave/valor (jsonb)
-- pra não precisar alterar o schema toda vez que uma seção nova for
-- editável; ver src/data/siteContent.ts para o formato de cada chave e os
-- valores padrão usados enquanto uma chave ainda não foi configurada.
-- ---------------------------------------------------------

create table if not exists conteudo_site (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);

alter table conteudo_site enable row level security;

drop policy if exists "conteudo_site_select_publico" on conteudo_site;
create policy "conteudo_site_select_publico" on conteudo_site
  for select using (true);

drop policy if exists "conteudo_site_admin_all" on conteudo_site;
create policy "conteudo_site_admin_all" on conteudo_site
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- Pagamento verificado (InfinitePay) — preço e link decididos no
-- servidor, nunca no navegador. Ver api/criar-pagamento.ts e
-- api/infinitepay-webhook.ts. Bloco idempotente, pode rodar de novo.
-- ---------------------------------------------------------

alter table pedidos add column if not exists order_nsu text;
alter table pedidos add column if not exists transaction_nsu text;
alter table pedidos add column if not exists invoice_slug text;
alter table pedidos add column if not exists valor_pago numeric(10, 2);
alter table pedidos add column if not exists pago_em timestamptz;
alter table pedidos add column if not exists expira_em timestamptz;
alter table pedidos add column if not exists codigo_rastreio text;

-- Tempo real: o painel admin escuta pedidos novos sem precisar dar refresh.
-- A tabela já é protegida por RLS (pedidos_admin_all), então só quem estiver
-- autenticado como admin recebe os eventos.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pedidos'
  ) then
    alter publication supabase_realtime add table pedidos;
  end if;
end $$;

-- Pedidos antigos (de antes desta coluna existir) ganham um order_nsu
-- derivado do id, só para nunca ficar duplicado/vazio à toa.
update pedidos set order_nsu = replace(id::text, '-', '') where order_nsu is null;

create unique index if not exists pedidos_order_nsu_key
  on pedidos (order_nsu);

-- Idempotência do webhook: a mesma transação da InfinitePay nunca
-- confirma dois pedidos diferentes (nulls não colidem entre si).
create unique index if not exists pedidos_transaction_nsu_key
  on pedidos (transaction_nsu) where transaction_nsu is not null;

create index if not exists pedidos_expira_em_idx
  on pedidos (expira_em) where status = 'aguardando_pagamento';

-- Cria o pedido com o preço decidido AQUI, a partir do banco — o
-- navegador manda só produto_id/variante_id/quantidade, nunca preço.
-- Só o servidor (service_role, dentro de api/criar-pagamento.ts) pode
-- chamar; o front nunca tem a service role key.
create or replace function criar_pedido_seguro(
  p_itens jsonb,            -- [{ produto_id, variante_id, quantidade }]
  p_cliente jsonb,
  p_frete numeric,          -- já cotado/validado pelo servidor
  p_forma_pagamento text    -- 'mercadopago' | 'whatsapp'
)
returns table (
  id uuid,
  numero integer,
  order_nsu text,
  subtotal numeric,
  frete numeric,
  total numeric,
  criado_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_numero integer;
  v_criado_em timestamptz;
  v_order_nsu text;
  v_item jsonb;
  v_qtd integer;
  v_produto_id uuid;
  v_variante_id uuid;
  v_preco numeric;
  v_nome text;
  v_estoque integer;
  v_subtotal numeric := 0;
  v_frete numeric;
  v_status text;
  v_normalizados jsonb := '[]'::jsonb;
begin
  if p_forma_pagamento not in ('mercadopago', 'whatsapp') then
    raise exception 'Forma de pagamento inválida.';
  end if;

  v_frete := coalesce(p_frete, 0);
  if v_frete < 0 or v_frete > 1000 then
    raise exception 'Valor de frete fora do intervalo permitido.';
  end if;

  if jsonb_array_length(coalesce(p_itens, '[]'::jsonb)) = 0 then
    raise exception 'Pedido sem itens.';
  end if;

  -- Passo 1: resolve preço e nome de cada item NO BANCO — nunca confia
  -- em preço/nome vindo do corpo da requisição.
  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_qtd := (v_item->>'quantidade')::integer;
    if v_qtd is null or v_qtd < 1 or v_qtd > 50 then
      raise exception 'Quantidade inválida.';
    end if;

    v_produto_id := nullif(v_item->>'produto_id', '')::uuid;
    v_variante_id := nullif(v_item->>'variante_id', '')::uuid;

    if v_variante_id is not null then
      select
        coalesce(v.preco_promocional, v.preco),
        p.nome || case
          when v.cor <> '' and v.tamanho <> '' then ' (' || v.cor || ', ' || v.tamanho || ')'
          when v.cor <> '' then ' (' || v.cor || ')'
          when v.tamanho <> '' then ' (' || v.tamanho || ')'
          else ''
        end,
        v.produto_id
      into v_preco, v_nome, v_produto_id
      from produto_variantes v
      join produtos p on p.id = v.produto_id
      where v.id = v_variante_id;

      if v_preco is null then
        raise exception 'Variação % não encontrada.', v_variante_id;
      end if;
    else
      -- Produto com variações não pode ser comprado pelo preço base: isso
      -- deixaria escolher, só omitindo variante_id, o preço mais barato
      -- entre o do produto e o de qualquer variação dele.
      if exists (select 1 from produto_variantes where produto_id = v_produto_id) then
        raise exception 'Selecione uma variação válida para este produto.';
      end if;

      select coalesce(preco_promocional, preco), nome
      into v_preco, v_nome
      from produtos
      where produtos.id = v_produto_id;

      if v_preco is null then
        raise exception 'Produto % não encontrado.', v_produto_id;
      end if;
    end if;

    v_subtotal := v_subtotal + (v_preco * v_qtd);
    v_normalizados := v_normalizados || jsonb_build_object(
      'produto_id', v_produto_id,
      'variante_id', v_variante_id,
      'nome', v_nome,
      'preco_unitario', v_preco,
      'quantidade', v_qtd
    );
  end loop;

  v_status := case
    when p_forma_pagamento = 'mercadopago' then 'aguardando_pagamento'
    else 'novo'
  end;

  insert into pedidos (
    subtotal, frete, total, forma_pagamento, cliente, status, expira_em
  )
  values (
    v_subtotal,
    v_frete,
    v_subtotal + v_frete,
    p_forma_pagamento,
    p_cliente,
    v_status,
    case when v_status = 'aguardando_pagamento' then now() + interval '30 minutes' end
  )
  returning pedidos.id, pedidos.numero, pedidos.criado_em
  into v_pedido_id, v_numero, v_criado_em;

  -- 32 caracteres, sem hífen, imprevisível: serve de order_nsu na
  -- InfinitePay e de token da consulta pública de status.
  v_order_nsu := replace(v_pedido_id::text, '-', '');
  update pedidos set order_nsu = v_order_nsu where pedidos.id = v_pedido_id;

  -- Passo 2: trava a linha, dá baixa no estoque e grava os itens —
  -- mesmo padrão de lock (for update) já usado em criar_pedido.
  for v_item in select * from jsonb_array_elements(v_normalizados)
  loop
    v_qtd := (v_item->>'quantidade')::integer;
    v_produto_id := nullif(v_item->>'produto_id', '')::uuid;
    v_variante_id := nullif(v_item->>'variante_id', '')::uuid;

    if v_variante_id is not null then
      select estoque into v_estoque
      from produto_variantes where produto_variantes.id = v_variante_id for update;
      if v_estoque < v_qtd then
        raise exception 'Estoque insuficiente para %.', v_item->>'nome';
      end if;
      update produto_variantes set estoque = estoque - v_qtd where produto_variantes.id = v_variante_id;
    elsif v_produto_id is not null then
      select estoque into v_estoque
      from produtos where produtos.id = v_produto_id for update;
      if v_estoque < v_qtd then
        raise exception 'Estoque insuficiente para %.', v_item->>'nome';
      end if;
      update produtos set estoque = estoque - v_qtd where produtos.id = v_produto_id;
    end if;

    insert into pedido_itens (
      pedido_id, produto_id, variante_id, nome, preco_unitario, quantidade
    )
    values (
      v_pedido_id,
      v_produto_id,
      v_variante_id,
      v_item->>'nome',
      (v_item->>'preco_unitario')::numeric,
      v_qtd
    );
  end loop;

  return query
    select v_pedido_id, v_numero, v_order_nsu,
           v_subtotal, v_frete, v_subtotal + v_frete, v_criado_em;
end;
$$;

-- Só o servidor (service_role) chama — nunca o navegador.
revoke all on function criar_pedido_seguro(jsonb, jsonb, numeric, text) from public;
revoke all on function criar_pedido_seguro(jsonb, jsonb, numeric, text) from anon;
grant execute on function criar_pedido_seguro(jsonb, jsonb, numeric, text) to service_role;

-- Fecha a porta antiga: a criar_pedido original aceita preço e status
-- de quem chama, então o público não pode mais chamá-la diretamente.
-- Continua existindo para a venda manual do admin (createManualSale),
-- feita por um usuário autenticado.
revoke execute on function criar_pedido(jsonb, jsonb, numeric, numeric, numeric, text, text)
  from public;
revoke execute on function criar_pedido(jsonb, jsonb, numeric, numeric, numeric, text, text)
  from anon;
grant execute on function criar_pedido(jsonb, jsonb, numeric, numeric, numeric, text, text)
  to authenticated;

-- Confirma o pagamento de forma idempotente: chamar duas vezes com o
-- mesmo transaction_nsu não gera efeito duplicado. Só o servidor chama,
-- depois de já ter confirmado com a própria InfinitePay (payment_check)
-- que aquele pagamento é real.
create or replace function confirmar_pagamento_pedido(
  p_order_nsu text,
  p_transaction_nsu text,
  p_invoice_slug text,
  p_valor_pago numeric default null   -- null = não foi possível ler o valor
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_status text;
  v_total numeric;
  v_transaction text;
  v_valor_confirmado numeric;
begin
  select id, status, total, transaction_nsu
  into v_id, v_status, v_total, v_transaction
  from pedidos
  where order_nsu = p_order_nsu
  for update;

  if v_id is null then
    return 'nao_encontrado';
  end if;

  if v_status <> 'aguardando_pagamento' then
    if v_transaction is not null then
      return 'ja_confirmado';
    end if;
    return 'status_' || v_status;
  end if;

  -- O nome do campo de valor pago na resposta da InfinitePay (e se vem em
  -- reais ou centavos) ainda não foi confirmado com um pagamento real — ver
  -- api/infinitepay-webhook.ts. Em vez de adivinhar a unidade, testamos as
  -- duas interpretações contra o total real do pedido (tolerância de 2
  -- centavos) e aceitamos a que bater; nenhuma batendo, é divergência de
  -- valor de verdade.
  if p_valor_pago is null then
    v_valor_confirmado := v_total;
  elsif abs(p_valor_pago - v_total) <= 0.02 then
    v_valor_confirmado := p_valor_pago;
  elsif abs(p_valor_pago / 100 - v_total) <= 0.02 then
    v_valor_confirmado := p_valor_pago / 100;
  else
    update pedidos
    set status = 'divergencia_valor',
        transaction_nsu = p_transaction_nsu,
        invoice_slug = p_invoice_slug,
        valor_pago = p_valor_pago
    where id = v_id;
    return 'valor_divergente';
  end if;

  update pedidos
  set status = 'confirmado',
      transaction_nsu = p_transaction_nsu,
      invoice_slug = p_invoice_slug,
      valor_pago = v_valor_confirmado,
      pago_em = now(),
      expira_em = null
  where id = v_id;

  return 'confirmado';
end;
$$;

revoke all on function confirmar_pagamento_pedido(text, text, text, numeric) from public;
revoke all on function confirmar_pagamento_pedido(text, text, text, numeric) from anon;
grant execute on function confirmar_pagamento_pedido(text, text, text, numeric) to service_role;

-- Cancela pedidos "aguardando_pagamento" cujo prazo (expira_em, definido
-- em criar_pedido_seguro) já passou — cliente que abriu o checkout e
-- nunca pagou. O gatilho trg_restaurar_estoque já devolve o estoque
-- sozinho quando o status vira 'cancelado'.
--
-- Não existe um cron rodando isso sozinho — em vez disso, é chamada de
-- forma oportunista sempre que alguém olha pedidos (status_pedido_publico,
-- abaixo, e o carregamento do painel /admin/pedidos), o que já é frequente
-- o bastante para o estoque voltar rápido sem depender de infraestrutura
-- extra de cron.
create or replace function expirar_pedidos_pendentes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  with expirados as (
    update pedidos
    set status = 'cancelado'
    where status = 'aguardando_pagamento'
      and expira_em is not null
      and expira_em < now()
    returning 1
  )
  select count(*) into v_total from expirados;

  return v_total;
end;
$$;

revoke all on function expirar_pedidos_pendentes() from public;
revoke all on function expirar_pedidos_pendentes() from anon;
grant execute on function expirar_pedidos_pendentes() to service_role;
grant execute on function expirar_pedidos_pendentes() to authenticated;

-- Status público (para a tela de retorno do cliente). Devolve só o
-- mínimo — o order_nsu é imprevisível (uuid sem hífen), então funciona
-- como token: quem não fez o pedido não descobre o total de ninguém.
--
-- "create or replace" não permite mudar as colunas de retorno de uma
-- função existente (é considerado "mudar o tipo de retorno") — por isso
-- precisa apagar a versão antiga antes de recriar com a coluna nova.
drop function if exists status_pedido_publico(text);

create or replace function status_pedido_publico(p_order_nsu text)
returns table (status text, numero integer, total numeric, codigo_rastreio text, expira_em timestamptz)
language sql
security definer
set search_path = public
as $$
  select expirar_pedidos_pendentes();
  select p.status, p.numero, p.total, p.codigo_rastreio, p.expira_em
  from pedidos p
  where p.order_nsu = p_order_nsu;
$$;

grant execute on function status_pedido_publico(text) to anon;
grant execute on function status_pedido_publico(text) to authenticated;

-- ---------------------------------------------------------
-- Tokens de integrações externas (ex: Melhor Envio, que usa OAuth2 com
-- access_token/refresh_token em vez de uma chave fixa). Tabela sensível:
-- RLS ligado e SEM nenhuma política — nem o admin autenticado nem o
-- público conseguem ler isso pelo navegador, só o service_role (que
-- ignora RLS) dentro das funções serverless.
-- ---------------------------------------------------------

create table if not exists integracoes_tokens (
  servico text primary key,
  access_token text not null,
  refresh_token text not null,
  expira_em timestamptz not null,
  atualizado_em timestamptz not null default now()
);

alter table integracoes_tokens enable row level security;

-- ---------------------------------------------------------
-- Rate limit das funções serverless públicas (api/criar-pagamento.ts,
-- api/frete.ts) — sem isso, qualquer um pode automatizar chamadas pra
-- gastar cota da API do Mercado Pago/Melhor Envio ou criar vários pedidos
-- "aguardando_pagamento" seguidos, que descontam estoque de verdade por
-- até 30 min cada. RLS ligado e sem políticas: só o service_role (usado
-- dentro das funções serverless) grava/lê aqui.
-- ---------------------------------------------------------

create table if not exists rate_limit_hits (
  chave text not null,
  criado_em timestamptz not null default now()
);

create index if not exists rate_limit_hits_chave_criado_em_idx
  on rate_limit_hits (chave, criado_em);

alter table rate_limit_hits enable row level security;

-- Registra uma tentativa e diz se ela deve ser permitida (true) ou
-- bloqueada (false) — "limite" tentativas a cada "janela_segundos" pra
-- essa "chave" (ex: "criar-pagamento:200.1.2.3"). Também aproveita pra
-- limpar registros velhos, então a tabela não cresce sem limite.
create or replace function registrar_rate_limit(
  p_chave text,
  p_limite integer,
  p_janela_segundos integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contagem integer;
begin
  delete from rate_limit_hits
  where criado_em < now() - make_interval(secs => p_janela_segundos);

  select count(*) into v_contagem
  from rate_limit_hits
  where chave = p_chave
    and criado_em > now() - make_interval(secs => p_janela_segundos);

  if v_contagem >= p_limite then
    return false;
  end if;

  insert into rate_limit_hits (chave) values (p_chave);
  return true;
end;
$$;

revoke all on function registrar_rate_limit(text, integer, integer) from public;
revoke all on function registrar_rate_limit(text, integer, integer) from anon;
grant execute on function registrar_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------
-- Dados iniciais (opcional): descomente para popular o banco com os
-- mesmos produtos de exemplo usados no site antes de conectar o banco.
-- ---------------------------------------------------------
-- Veja src/data/categories.ts e src/data/products.ts para copiar os
-- valores caso queira gerar os inserts manualmente.

import { supabase } from "../lib/supabase";
import { descricaoVariante } from "../lib/productPricing";
import type { Category, Product, ProductVariant } from "../types";

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase não está configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env."
    );
  }
  return supabase;
}

function toProductRow(p: Partial<Product>) {
  return {
    nome: p.nome,
    slug: p.slug,
    categoria_id: p.categoriaId,
    descricao: p.descricao,
    descricao_curta: p.descricaoCurta,
    preco: p.preco,
    preco_promocional: p.precoPromocional,
    imagens: p.imagens,
    cores: p.cores,
    dimensoes: p.dimensoes,
    material: p.material,
    estoque: p.estoque,
    destaque: p.destaque,
    oferta: p.oferta,
    novo: p.novo,
    mais_vendido: p.maisVendido,
    prazo_entrega: p.prazoEntrega,
    peso: p.peso ?? null,
    altura: p.altura ?? null,
    largura: p.largura ?? null,
    comprimento: p.comprimento ?? null,
  };
}

export async function adminCreateProduct(product: Omit<Product, "id">) {
  const db = requireSupabase();
  const { data, error } = await db
    .from("produtos")
    .insert(toProductRow(product))
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function adminUpdateProduct(id: string, product: Partial<Product>) {
  const db = requireSupabase();
  const { error } = await db
    .from("produtos")
    .update(toProductRow(product))
    .eq("id", id);
  if (error) throw error;
}

export async function adminDeleteProduct(id: string) {
  const db = requireSupabase();
  const { error } = await db.from("produtos").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Duplica um produto (e suas variações, se tiver) como um novo produto —
 * útil pra cadastrar rápido algo parecido com um que já existe. O estoque
 * começa zerado, para não parecer que já tem unidade disponível sem
 * conferir de verdade.
 */
export async function adminDuplicateProduct(
  product: Product,
  slugsExistentes: string[]
) {
  let novoSlug = `${product.slug}-copia`;
  let contador = 2;
  while (slugsExistentes.includes(novoSlug)) {
    novoSlug = `${product.slug}-copia-${contador}`;
    contador++;
  }

  const novoId = await adminCreateProduct({
    ...product,
    nome: `${product.nome} (cópia)`,
    slug: novoSlug,
    estoque: 0,
  });

  if (product.variantes && product.variantes.length > 0) {
    await adminSaveProductVariants(
      novoId,
      product.variantes.map((v) => ({
        cor: v.cor,
        tamanho: v.tamanho,
        preco: v.preco,
        precoPromocional: v.precoPromocional,
        estoque: 0,
        imagens: v.imagens,
      }))
    );
  }

  return novoId;
}

/**
 * Substitui todas as variações de cor de um produto de uma vez (apaga as
 * antigas e insere as novas) chamando a função "admin_salvar_variantes" do
 * banco, que faz isso em uma única transação.
 */
export async function adminSaveProductVariants(
  produtoId: string,
  variantes: Omit<ProductVariant, "id">[]
) {
  const db = requireSupabase();
  const { error } = await db.rpc("admin_salvar_variantes", {
    p_produto_id: produtoId,
    p_variantes: variantes,
  });
  if (error) throw error;
}

export async function adminCreateCategory(category: Omit<Category, "id">) {
  const db = requireSupabase();
  const { data, error } = await db
    .from("categorias")
    .insert({
      nome: category.nome,
      slug: category.slug,
      descricao: category.descricao,
      imagem: category.imagem,
    })
    .select()
    .single();
  if (error) throw error;
  return data as { id: string; nome: string; slug: string; descricao: string; imagem: string };
}

export async function adminUpdateCategory(id: string, category: Partial<Category>) {
  const db = requireSupabase();
  const { error } = await db
    .from("categorias")
    .update({
      nome: category.nome,
      slug: category.slug,
      descricao: category.descricao,
      imagem: category.imagem,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function adminDeleteCategory(id: string) {
  const db = requireSupabase();
  const { error } = await db.from("categorias").delete().eq("id", id);
  if (error) throw error;
}

export interface AdminOrder {
  id: string;
  numero: number;
  subtotal: number;
  frete: number;
  total: number;
  formaPagamento: string;
  status: string;
  cliente: Record<string, string>;
  criadoEm: string;
  itens: { nome: string; quantidade: number; precoUnitario: number }[];
}

export async function fetchAdminOrders(): Promise<AdminOrder[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("pedidos")
    .select("*, pedido_itens(nome, quantidade, preco_unitario)")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    numero: row.numero,
    subtotal: Number(row.subtotal),
    frete: Number(row.frete),
    total: Number(row.total),
    formaPagamento: row.forma_pagamento,
    status: row.status,
    cliente: row.cliente,
    criadoEm: row.criado_em,
    itens: (row.pedido_itens ?? []).map((i: any) => ({
      nome: i.nome,
      quantidade: i.quantidade,
      precoUnitario: Number(i.preco_unitario),
    })),
  }));
}

/**
 * Atualiza o status do pedido. Se o novo status for "cancelado", o gatilho
 * `trg_restaurar_estoque` (ver supabase/schema.sql) devolve automaticamente
 * as unidades ao estoque de cada produto do pedido.
 */
export async function adminUpdateOrderStatus(id: string, status: string) {
  const db = requireSupabase();
  const { error } = await db.from("pedidos").update({ status }).eq("id", id);
  if (error) throw error;
}

export interface ManualSaleItem {
  produtoId: string;
  varianteId?: string | null;
  nome: string;
  cor?: string | null;
  tamanho?: string | null;
  precoUnitario: number;
  quantidade: number;
}

/**
 * Lança uma venda manual (ex: venda feita na loja física) usando a mesma
 * função `criar_pedido` do checkout do site — ela dá baixa no estoque de
 * cada item (do produto ou da variação de cor) dentro de uma única
 * transação atômica, então o estoque fica consistente independente de a
 * venda ter sido online ou presencial.
 */
export async function createManualSale(
  itens: ManualSaleItem[],
  nomeCliente: string
) {
  const db = requireSupabase();
  const subtotal = itens.reduce((acc, i) => acc + i.precoUnitario * i.quantidade, 0);
  const { data, error } = await db.rpc("criar_pedido", {
    p_itens: itens.map((i) => ({
      produto_id: i.produtoId,
      variante_id: i.varianteId ?? null,
      nome: descricaoVariante(i.cor, i.tamanho)
        ? `${i.nome} (${descricaoVariante(i.cor, i.tamanho)})`
        : i.nome,
      preco_unitario: i.precoUnitario,
      quantidade: i.quantidade,
    })),
    p_cliente: { nomeCompleto: nomeCliente || "Venda balcão" },
    p_subtotal: subtotal,
    p_frete: 0,
    p_total: subtotal,
    p_forma_pagamento: "manual",
  });
  if (error) throw error;
  return data as { id: string; numero: number; criado_em: string };
}

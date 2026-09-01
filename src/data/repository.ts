import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { Category, Product, ProductVariant } from "../types";
import { categories as localCategories } from "./categories";
import { products as localProducts } from "./products";

/**
 * Camada de acesso a dados. Enquanto o Supabase não estiver configurado
 * (.env vazio), usamos os dados locais de exemplo. Quando as tabelas do
 * banco existirem (ver supabase/schema.sql), os dados passam a vir de lá
 * automaticamente, sem precisar mudar nenhuma página.
 */

const PRODUTO_COM_VARIANTES_SELECT =
  "*, produto_variantes(id, cor, tamanho, preco, preco_promocional, estoque, imagens, peso, altura, largura, comprimento, ordem)";

function numOrUndef(v: unknown): number | undefined {
  return v !== null && v !== undefined ? Number(v) : undefined;
}

function mapVariantRow(row: any): ProductVariant {
  return {
    id: row.id,
    cor: row.cor,
    tamanho: row.tamanho ?? "",
    preco: Number(row.preco),
    precoPromocional:
      row.preco_promocional !== null ? Number(row.preco_promocional) : null,
    estoque: row.estoque ?? 0,
    imagens: row.imagens ?? [],
    peso: numOrUndef(row.peso),
    altura: numOrUndef(row.altura),
    largura: numOrUndef(row.largura),
    comprimento: numOrUndef(row.comprimento),
  };
}

function mapProductRow(row: any): Product {
  return {
    id: row.id,
    nome: row.nome,
    slug: row.slug,
    categoriaId: row.categoria_id,
    descricao: row.descricao,
    descricaoCurta: row.descricao_curta,
    preco: Number(row.preco),
    precoPromocional:
      row.preco_promocional !== null ? Number(row.preco_promocional) : null,
    imagens: row.imagens ?? [],
    cores: row.cores ?? [],
    dimensoes: row.dimensoes ?? "",
    material: row.material ?? "",
    estoque: row.estoque ?? 0,
    destaque: row.destaque ?? false,
    oferta: row.oferta ?? false,
    novo: row.novo ?? false,
    maisVendido: row.mais_vendido ?? false,
    prazoEntrega: row.prazo_entrega ?? "",
    peso: numOrUndef(row.peso),
    altura: numOrUndef(row.altura),
    largura: numOrUndef(row.largura),
    comprimento: numOrUndef(row.comprimento),
    variantes: ((row.produto_variantes ?? []) as any[])
      .slice()
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .map(mapVariantRow),
  };
}

function mapCategoryRow(row: any): Category {
  return {
    id: row.id,
    nome: row.nome,
    slug: row.slug,
    descricao: row.descricao,
    imagem: row.imagem,
  };
}

export async function fetchCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured || !supabase) return localCategories;
  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .order("nome");
  // Sem linhas ainda no banco (ex: acabou de conectar o Supabase) — mostra
  // os dados de exemplo em vez de uma loja vazia, até o admin cadastrar a
  // primeira categoria de verdade.
  if (error || !data || data.length === 0) return localCategories;
  return data.map(mapCategoryRow);
}

export async function fetchProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured || !supabase) return localProducts;
  const { data, error } = await supabase
    .from("produtos")
    .select(PRODUTO_COM_VARIANTES_SELECT)
    .order("criado_em", { ascending: false });
  if (error || !data || data.length === 0) return localProducts;
  return data.map(mapProductRow);
}

export async function fetchProductBySlug(
  slug: string
): Promise<Product | undefined> {
  if (!isSupabaseConfigured || !supabase) {
    return localProducts.find((p) => p.slug === slug);
  }
  const { data, error } = await supabase
    .from("produtos")
    .select(PRODUTO_COM_VARIANTES_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return undefined;
  return mapProductRow(data);
}

import type { Product, ProductVariant } from "../types";

/**
 * Menor preço de venda do produto: considera o preço promocional de cada
 * variação quando existem variações por cor, senão o preço base do produto.
 */
export function precoExibicao(product: Product): number {
  const variantes = product.variantes ?? [];
  if (variantes.length === 0) return product.precoPromocional ?? product.preco;
  return Math.min(...variantes.map((v) => v.precoPromocional ?? v.preco));
}

/** Preço "de" (riscado) correspondente ao menor preço de venda acima. */
export function precoOriginalExibicao(product: Product): number {
  const variantes = product.variantes ?? [];
  if (variantes.length === 0) return product.preco;
  return Math.min(...variantes.map((v) => v.preco));
}

export function temPromocaoExibicao(product: Product): boolean {
  const variantes = product.variantes ?? [];
  if (variantes.length === 0) return product.precoPromocional !== null;
  return variantes.some((v) => v.precoPromocional !== null);
}

/** true quando cores diferentes do produto têm preços diferentes. */
export function precoVariaPorCor(product: Product): boolean {
  const variantes = product.variantes ?? [];
  if (variantes.length < 2) return false;
  const precos = variantes.map((v) => v.precoPromocional ?? v.preco);
  return new Set(precos).size > 1;
}

export function estoqueExibicao(product: Product): number {
  const variantes = product.variantes ?? [];
  if (variantes.length === 0) return product.estoque;
  return variantes.reduce((acc, v) => acc + v.estoque, 0);
}

export function imagemPrincipal(product: Product): string {
  const variantes = product.variantes ?? [];
  if (variantes.length > 0 && variantes[0].imagens.length > 0) {
    return variantes[0].imagens[0];
  }
  return product.imagens[0];
}

export function imagensDaVariante(product: Product, variante: ProductVariant | null): string[] {
  if (variante && variante.imagens.length > 0) return variante.imagens;
  return product.imagens;
}

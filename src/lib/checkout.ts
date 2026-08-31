import { supabase, isSupabaseConfigured } from "./supabase";
import type { CartItem, CustomerData, Order } from "../types";

/**
 * Cria o pedido. Quando o Supabase estiver configurado, chama a função
 * `criar_pedido` (ver supabase/schema.sql), que insere o pedido e os itens
 * e dá baixa automática no estoque dentro de uma única transação atômica —
 * evitando vender um produto que ficou sem estoque entre dois pedidos
 * simultâneos.
 *
 * Sem Supabase configurado, o pedido é gerado só localmente (modo de
 * demonstração), para que o fluxo de compra continue testável antes de o
 * banco estar plugado.
 */
export async function placeOrder(
  itens: CartItem[],
  cliente: CustomerData,
  subtotal: number,
  frete: number,
  formaPagamento: "infinitepay" | "whatsapp"
): Promise<Order> {
  const total = subtotal + frete;

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc("criar_pedido", {
      p_itens: itens.map((i) => ({
        produto_id: i.productId,
        nome: i.nome,
        preco_unitario: i.precoUnitario,
        quantidade: i.quantidade,
      })),
      p_cliente: cliente,
      p_subtotal: subtotal,
      p_frete: frete,
      p_total: total,
      p_forma_pagamento: formaPagamento,
    });

    if (!error && data) {
      return {
        id: data.id,
        numero: data.numero,
        itens,
        subtotal,
        frete,
        total,
        formaPagamento,
        cliente,
        criadoEm: data.criado_em,
      };
    }
  }

  const numero = Math.floor(1000 + Math.random() * 9000);
  return {
    id: crypto.randomUUID(),
    numero,
    itens,
    subtotal,
    frete,
    total,
    formaPagamento,
    cliente,
    criadoEm: new Date().toISOString(),
  };
}

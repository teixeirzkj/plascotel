import { isSupabaseConfigured } from "./supabase";
import type { CartItem, CustomerData, Order } from "../types";

/**
 * Cria o pedido chamando a função serverless api/criar-pagamento.ts, que
 * decide preço, frete e (se for InfinitePay) gera o link de pagamento —
 * tudo a partir do banco, no servidor. O navegador manda só
 * produtoId/varianteId/quantidade, nunca preço (ver
 * PLASCOTEL_pagamento_seguro.md).
 *
 * Sem Supabase configurado, o pedido é gerado só localmente (modo de
 * demonstração), para que o fluxo de compra continue testável antes de o
 * banco estar plugado.
 */
export async function placeOrder(
  itens: CartItem[],
  cliente: CustomerData,
  formaPagamento: "infinitepay" | "whatsapp",
  opts: { cepDestino?: string; freteOpcaoId?: number | null } = {}
): Promise<Order> {
  if (isSupabaseConfigured) {
    const response = await fetch("/api/criar-pagamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itens: itens.map((i) => ({
          produtoId: i.productId,
          varianteId: i.varianteId ?? null,
          quantidade: i.quantidade,
        })),
        cliente,
        formaPagamento,
        cepDestino: opts.cepDestino,
        freteOpcaoId: opts.freteOpcaoId,
      }),
    });

    const data = await response.json();

    // Se o servidor respondeu com erro, a compra realmente falhou (ou nem
    // chegou a existir) — não pode cair no modo demonstração como se tivesse
    // dado certo, senão o cliente acha que comprou e o pedido nunca existiu.
    if (!response.ok) {
      const erro: Error & { numero?: number } = new Error(
        data.error || "Não foi possível concluir a compra. Verifique o estoque dos itens e tente novamente."
      );
      erro.numero = data.numero;
      throw erro;
    }

    return {
      id: data.id,
      numero: data.numero,
      orderNsu: data.orderNsu,
      itens,
      subtotal: data.subtotal,
      frete: data.frete,
      total: data.total,
      formaPagamento,
      cliente,
      criadoEm: data.criadoEm,
      paymentUrl: data.paymentUrl,
    };
  }

  const subtotal = itens.reduce((acc, i) => acc + i.precoUnitario * i.quantidade, 0);
  const numero = Math.floor(1000 + Math.random() * 9000);
  return {
    id: crypto.randomUUID(),
    numero,
    itens,
    subtotal,
    frete: 0,
    total: subtotal,
    formaPagamento,
    cliente,
    criadoEm: new Date().toISOString(),
  };
}

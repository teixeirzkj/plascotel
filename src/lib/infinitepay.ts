import { descricaoVariante } from "./productPricing";
import type { CartItem } from "../types";

/**
 * Gera um link de pagamento InfinitePay com o valor exato do carrinho
 * (Checkout Integrado — não precisa de chave de API, só da InfiniteTag da
 * conta). Documentação: https://www.infinitepay.io/checkout-documentacao
 */

interface InfinitePayCustomer {
  name: string;
  email: string;
  phone_number: string;
}

interface CriarLinkParams {
  handle: string;
  orderNsu: string;
  redirectUrl: string;
  webhookUrl?: string;
  itens: CartItem[];
  frete: number;
  customer?: InfinitePayCustomer;
}

function reaisParaCentavos(valor: number) {
  return Math.round(valor * 100);
}

export async function criarLinkPagamentoInfinitePay({
  handle,
  orderNsu,
  redirectUrl,
  webhookUrl,
  itens,
  frete,
  customer,
}: CriarLinkParams): Promise<string> {
  const items = itens.map((i) => ({
    quantity: i.quantidade,
    price: reaisParaCentavos(i.precoUnitario),
    description: (descricaoVariante(i.cor, i.tamanho) ? `${i.nome} (${descricaoVariante(i.cor, i.tamanho)})` : i.nome).slice(0, 100),
  }));

  if (frete > 0) {
    items.push({ quantity: 1, price: reaisParaCentavos(frete), description: "Frete" });
  }

  const response = await fetch("https://api.checkout.infinitepay.io/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle,
      order_nsu: orderNsu,
      redirect_url: redirectUrl,
      ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
      items,
      ...(customer ? { customer } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error("Não foi possível gerar o link de pagamento da InfinitePay.");
  }

  const data = await response.json();
  if (!data.url) {
    throw new Error("Resposta inesperada da InfinitePay.");
  }
  return data.url as string;
}

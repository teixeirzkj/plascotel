import type { CartItem } from "../types";

export interface OpcaoFrete {
  id: number;
  servico: string;
  preco: number;
  prazoDias: number | null;
}

interface RespostaFrete {
  configurado: boolean;
  opcoes: OpcaoFrete[];
}

/**
 * Chama a função serverless em api/frete.ts, que consulta o Melhor Envio.
 * Se a integração ainda não estiver configurada (variáveis de ambiente no
 * servidor), retorna `configurado: false` para o checkout usar um frete
 * padrão em vez de travar a compra.
 */
export async function calcularFrete(
  cepDestino: string,
  itens: CartItem[]
): Promise<RespostaFrete> {
  const response = await fetch("/api/frete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cepDestino,
      itens: itens.map((i) => ({
        peso: i.peso,
        altura: i.altura,
        largura: i.largura,
        comprimento: i.comprimento,
        quantidade: i.quantidade,
        valor: i.precoUnitario * i.quantidade,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error("Não foi possível calcular o frete agora.");
  }

  return response.json();
}

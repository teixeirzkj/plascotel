import { obterTokenValido } from "./melhorEnvioAuth";

/**
 * Cotação de frete via Melhor Envio — lógica compartilhada entre api/frete.ts
 * (usado pelo checkout só para EXIBIR opções ao cliente) e
 * api/criar-pagamento.ts (que cota de novo, no servidor, para decidir o
 * valor realmente cobrado — nunca confia no preço que o navegador mandou).
 *
 * A API do Melhor Envio usa OAuth2 (não uma chave fixa) — o token é obtido
 * uma vez em api/melhor-envio-callback.ts (depois de autorizar o app deles)
 * e renovado sozinho a partir daí, ver api/_lib/melhorEnvioAuth.ts.
 *
 * Configure no .env / nas variáveis de ambiente da Vercel:
 *   MELHOR_ENVIO_CLIENT_ID     — Área Dev > seu aplicativo, no painel deles
 *   MELHOR_ENVIO_CLIENT_SECRET — idem
 *   MELHOR_ENVIO_CEP_ORIGEM    — CEP de onde os pedidos são enviados
 */

export interface ItemFrete {
  peso?: number;
  altura?: number;
  largura?: number;
  comprimento?: number;
  quantidade: number;
  valor?: number;
}

export interface OpcaoFrete {
  id: number;
  servico: string;
  preco: number;
  prazoDias: number | null;
}

interface MelhorEnvioOption {
  id: number;
  name: string;
  price: string;
  delivery_time?: number;
  company?: { name: string };
  error?: string;
}

export const PESO_PADRAO_KG = 10;
export const ALTURA_PADRAO_CM = 40;
export const LARGURA_PADRAO_CM = 40;
export const COMPRIMENTO_PADRAO_CM = 40;

export const FRETE_GRATIS_ACIMA_DE = 1500;
export const FRETE_PADRAO = 89.9;

export function limparCep(cep: string) {
  return (cep || "").replace(/\D/g, "");
}

export function fretePadraoPara(subtotal: number) {
  return subtotal >= FRETE_GRATIS_ACIMA_DE ? 0 : FRETE_PADRAO;
}

/**
 * Retorna as opções de frete do Melhor Envio, ou `configurado: false` se a
 * conexão OAuth ainda não foi autorizada (ver api/melhor-envio-callback.ts)
 * ou o CEP de origem não estiver definido.
 */
export async function cotarFrete(
  cepDestino: string,
  itens: ItemFrete[]
): Promise<{ configurado: boolean; opcoes: OpcaoFrete[] }> {
  const cepOrigem = limparCep(process.env.MELHOR_ENVIO_CEP_ORIGEM ?? "");
  if (!cepOrigem) {
    return { configurado: false, opcoes: [] };
  }

  const token = await obterTokenValido();
  if (!token) {
    return { configurado: false, opcoes: [] };
  }

  const cepLimpo = limparCep(cepDestino);
  if (cepLimpo.length !== 8 || itens.length === 0) {
    return { configurado: true, opcoes: [] };
  }

  const baseUrl = "https://melhorenvio.com.br";

  const products = itens.map((item, index) => ({
    id: String(index + 1),
    width: item.largura || LARGURA_PADRAO_CM,
    height: item.altura || ALTURA_PADRAO_CM,
    length: item.comprimento || COMPRIMENTO_PADRAO_CM,
    weight: item.peso || PESO_PADRAO_KG,
    insurance_value: item.valor ?? 0,
    quantity: item.quantidade,
  }));

  const response = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      // O Melhor Envio exige um User-Agent identificando a aplicação/contato.
      "User-Agent": "Plascotel (contato@plascotel.com.br)",
    },
    body: JSON.stringify({
      from: { postal_code: cepOrigem },
      to: { postal_code: cepLimpo },
      products,
    }),
  });

  if (!response.ok) {
    throw new Error("Não foi possível calcular o frete no momento.");
  }

  const data = (await response.json()) as MelhorEnvioOption[];

  const opcoes = (Array.isArray(data) ? data : [])
    .filter((o) => !o.error && o.price)
    .map((o) => ({
      id: o.id,
      servico: o.company?.name ? `${o.company.name} - ${o.name}` : o.name,
      preco: Number(o.price),
      prazoDias: o.delivery_time ?? null,
    }))
    .sort((a, b) => a.preco - b.preco);

  return { configurado: true, opcoes };
}

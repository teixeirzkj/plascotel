import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Calcula o frete chamando a API do Melhor Envio (que agrega Correios,
 * Jadlog e outras transportadoras). Roda como função serverless — o token
 * (MELHOR_ENVIO_TOKEN) fica só no servidor e nunca é exposto no navegador.
 *
 * Configure no .env / nas variáveis de ambiente da Vercel:
 *   MELHOR_ENVIO_TOKEN       — token gerado em melhorenvio.com.br
 *   MELHOR_ENVIO_CEP_ORIGEM  — CEP de onde os pedidos são enviados
 *   MELHOR_ENVIO_SANDBOX     — "true" para usar o ambiente de testes
 */

interface ItemFrete {
  peso?: number;
  altura?: number;
  largura?: number;
  comprimento?: number;
  quantidade: number;
  valor?: number;
}

interface MelhorEnvioOption {
  id: number;
  name: string;
  price: string;
  delivery_time?: number;
  company?: { name: string };
  error?: string;
}

const PESO_PADRAO_KG = 10;
const ALTURA_PADRAO_CM = 40;
const LARGURA_PADRAO_CM = 40;
const COMPRIMENTO_PADRAO_CM = 40;

function limparCep(cep: string) {
  return (cep || "").replace(/\D/g, "");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const token = process.env.MELHOR_ENVIO_TOKEN;
  const cepOrigem = limparCep(process.env.MELHOR_ENVIO_CEP_ORIGEM ?? "");

  if (!token || !cepOrigem) {
    // Ainda não configurado — o front-end deve usar um frete padrão nesse caso.
    res.status(200).json({ configurado: false, opcoes: [] });
    return;
  }

  const { cepDestino, itens } = (req.body ?? {}) as {
    cepDestino?: string;
    itens?: ItemFrete[];
  };

  const cepLimpo = limparCep(cepDestino ?? "");
  if (cepLimpo.length !== 8) {
    res.status(400).json({ error: "CEP de destino inválido." });
    return;
  }
  if (!itens || itens.length === 0) {
    res.status(400).json({ error: "Nenhum item informado." });
    return;
  }

  const sandbox = process.env.MELHOR_ENVIO_SANDBOX === "true";
  const baseUrl = sandbox
    ? "https://sandbox.melhorenvio.com.br"
    : "https://melhorenvio.com.br";

  const products = itens.map((item, index) => ({
    id: String(index + 1),
    width: item.largura || LARGURA_PADRAO_CM,
    height: item.altura || ALTURA_PADRAO_CM,
    length: item.comprimento || COMPRIMENTO_PADRAO_CM,
    weight: item.peso || PESO_PADRAO_KG,
    insurance_value: item.valor ?? 0,
    quantity: item.quantidade,
  }));

  try {
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
      res.status(502).json({ error: "Não foi possível calcular o frete no momento." });
      return;
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

    res.status(200).json({ configurado: true, opcoes });
  } catch {
    res.status(502).json({ error: "Não foi possível calcular o frete no momento." });
  }
}

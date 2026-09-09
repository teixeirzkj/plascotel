import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cotarFrete, limparCep, type ItemFrete } from "./_lib/frete";

/**
 * Calcula o frete para EXIBIR opções ao cliente no checkout. O valor
 * realmente cobrado é decidido de novo, no servidor, em
 * api/criar-pagamento.ts — este endpoint é só para a interface.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
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

  try {
    const resultado = await cotarFrete(cepLimpo, itens);
    res.status(200).json(resultado);
  } catch {
    res.status(502).json({ error: "Não foi possível calcular o frete no momento." });
  }
}

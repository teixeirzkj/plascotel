import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { consultarPagamento } from "./_lib/mercadoPago.js";

/**
 * Recebe a notificação de pagamento do Mercado Pago (notification_url
 * passado ao criar o Pix em api/criar-pagamento.ts) e só confirma o pedido
 * depois de verificar de novo com o próprio Mercado Pago (GET /v1/payments/
 * {id}) — nunca confia cegamente no payload recebido, já que essa URL é
 * pública.
 *
 * A confirmação em si (comparar valor pago x total, idempotência) é feita
 * pela função `confirmar_pagamento_pedido` no banco (ver supabase/schema.sql)
 * — o mesmo mecanismo já usado com a InfinitePay.
 *
 * Variáveis de ambiente necessárias (sem prefixo VITE_):
 *   SUPABASE_SERVICE_ROLE_KEY, MERCADOPAGO_ACCESS_TOKEN
 *   MERCADOPAGO_WEBHOOK_SECRET — obrigatória; exige ?t=SEGREDO na URL
 *   MERCADOPAGO_SIGNATURE_SECRET — opcional; "Chave secreta" gerada pelo
 *     próprio Mercado Pago na tela de configuração do webhook. Se definida,
 *     valida o header x-signature (HMAC-SHA256) antes de aceitar a chamada.
 */

/**
 * Compara duas strings sem vazar o tempo de execução (o que uma
 * comparação `===`/`!==` normal faria, já que ela para no primeiro
 * caractere diferente). Faz HMAC dos dois lados antes de comparar — assim
 * o buffer sempre tem o mesmo tamanho (32 bytes), sem precisar de um
 * `if (tamanhos diferentes) return false` antecipado, que também vazaria
 * (ainda que pouco) informação por tempo de resposta.
 */
function comparacaoSegura(a: string, b: string): boolean {
  const chave = "comparacaoSegura";
  const hashA = createHmac("sha256", chave).update(a).digest();
  const hashB = createHmac("sha256", chave).update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/** https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks */
function assinaturaValida(req: VercelRequest, dataId: string, secret: string): boolean {
  const xSignature = req.headers["x-signature"];
  const xRequestId = req.headers["x-request-id"];
  if (typeof xSignature !== "string" || typeof xRequestId !== "string") return false;

  let ts: string | null = null;
  let v1: string | null = null;
  for (const parte of xSignature.split(",")) {
    const [chave, valor] = parte.split("=").map((s) => s.trim());
    if (chave === "ts") ts = valor;
    if (chave === "v1") v1 = valor;
  }
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hashCalculado = createHmac("sha256", secret).update(manifest).digest("hex");
  return comparacaoSegura(hashCalculado, v1);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segredoEsperado = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!segredoEsperado) {
    console.error("mercadopago-webhook: MERCADOPAGO_WEBHOOK_SECRET não configurado");
    res.status(500).json({ error: "webhook não configurado" });
    return;
  }
  if (typeof req.query.t !== "string" || !comparacaoSegura(req.query.t, segredoEsperado)) {
    res.status(404).end();
    return;
  }

  // O Mercado Pago manda o id do pagamento tanto no corpo (formato novo,
  // { type: "payment", data: { id } }) quanto na query string (IPN antigo,
  // ?type=payment&data.id=...) — aceita os dois formatos.
  const body = (req.body ?? {}) as { type?: string; data?: { id?: string | number } };
  const dataIdQuery =
    (typeof req.query["data.id"] === "string" ? req.query["data.id"] : null) ??
    (typeof req.query.id === "string" ? req.query.id : null);
  const paymentId = body?.data?.id ?? dataIdQuery;

  if (!paymentId) {
    // Notificação de outro tipo (ex: "merchant_order") — nada a fazer.
    res.status(200).json({ ok: true, ignorado: "sem payment id" });
    return;
  }

  const assinaturaSecreta = process.env.MERCADOPAGO_SIGNATURE_SECRET;
  if (assinaturaSecreta) {
    const idParaAssinatura = dataIdQuery ?? String(paymentId);
    if (!assinaturaValida(req, idParaAssinatura, assinaturaSecreta)) {
      console.error("mercadopago-webhook: assinatura x-signature inválida");
      res.status(401).json({ error: "assinatura inválida" });
      return;
    }
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("mercadopago-webhook: variáveis de ambiente do servidor não configuradas");
    res.status(500).json({ error: "servidor não configurado" });
    return;
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const pagamento = await consultarPagamento(paymentId);
    console.log("mercadopago-webhook: status real", JSON.stringify(pagamento));

    if (!pagamento.externalReference) {
      res.status(200).json({ ok: true, ignorado: "sem external_reference" });
      return;
    }
    if (pagamento.status !== "approved") {
      res.status(200).json({ ok: true, pago: false, status: pagamento.status });
      return;
    }

    const { data, error } = await supabase.rpc("confirmar_pagamento_pedido", {
      p_order_nsu: pagamento.externalReference,
      p_transaction_nsu: String(paymentId),
      p_invoice_slug: String(paymentId),
      p_valor_pago: pagamento.valorPago,
    });

    if (error) {
      console.error("mercadopago-webhook: erro ao confirmar pedido", error.message);
      res.status(500).json({ error: error.message });
      return;
    }

    const resultado = data as string;
    console.log(`mercadopago-webhook: pedido ${pagamento.externalReference} -> ${resultado}`);

    if (resultado === "confirmado") {
      const n8nUrl = process.env.N8N_PEDIDO_PAGO_URL;
      if (n8nUrl) {
        fetch(n8nUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_nsu: pagamento.externalReference }),
        }).catch((err) => console.error("mercadopago-webhook: falha ao notificar n8n", err));
      }
    }

    res.status(200).json({ ok: true, pago: true, resultado });
  } catch (err) {
    console.error("mercadopago-webhook: erro inesperado", err);
    res.status(500).json({ error: "erro inesperado" });
  }
}

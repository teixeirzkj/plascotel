import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

/**
 * Recebe a notificação de pagamento da InfinitePay (webhook_url passado ao
 * criar o link em api/criar-pagamento.ts) e só confirma o pedido depois de
 * verificar de novo com a própria InfinitePay (payment_check) — nunca confia
 * cegamente no payload recebido, já que essa URL é pública.
 *
 * A confirmação em si (comparar valor pago x total, idempotência) é feita
 * pela função `confirmar_pagamento_pedido` no banco (ver supabase/schema.sql).
 *
 * Variáveis de ambiente necessárias (sem prefixo VITE_):
 *   SUPABASE_SERVICE_ROLE_KEY   — Project Settings > API > service_role
 *   INFINITEPAY_HANDLE          — o mesmo handle usado em criar-pagamento.ts
 *   INFINITEPAY_WEBHOOK_SECRET  — opcional; se definido, exige ?t=SEGREDO na URL
 *   N8N_PEDIDO_PAGO_URL         — opcional; dispara uma notificação (WhatsApp etc.)
 */

interface PaymentCheckResponse {
  paid?: boolean;
  amount?: number | string;
  paid_amount?: number | string;
  [key: string]: unknown;
}

/**
 * O nome exato do campo com o valor pago na resposta do payment_check — e se
 * ele vem em reais ou em centavos — ainda não foi confirmado com um
 * pagamento real (ver PLASCOTEL_pagamento_seguro.md, seção "o que este
 * documento não resolve"). Por isso NÃO tentamos adivinhar a unidade aqui:
 * mandamos o valor bruto pra confirmar_pagamento_pedido, que testa as duas
 * interpretações (reais e centavos) contra o total real do pedido — a
 * verdade que já temos no banco — e só aceita a que bater. Se nenhum campo
 * candidato existir, devolve null (confirmar_pagamento_pedido pula a
 * comparação, mas ainda confirma o pagamento, já que o payment_check
 * assegurou paid === true). O console.log abaixo deixa o payload real
 * registrado no log da Vercel para fixar o campo certo depois do primeiro
 * pagamento de verdade.
 */
function extrairValorPago(resultado: PaymentCheckResponse): number | null {
  const candidatos = [resultado.paid_amount, resultado.amount];
  for (const valor of candidatos) {
    if (valor == null) continue;
    const numero = Number(valor);
    if (Number.isFinite(numero) && numero > 0) return numero;
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const segredoEsperado = process.env.INFINITEPAY_WEBHOOK_SECRET;
  if (!segredoEsperado) {
    // Falha fechada: sem segredo configurado, essa URL fixa e pública
    // poderia ser chamada por qualquer um. Preferível recusar tudo a
    // aceitar silenciosamente sem autenticação nenhuma.
    console.error("infinitepay-webhook: INFINITEPAY_WEBHOOK_SECRET não configurado");
    res.status(500).json({ error: "webhook não configurado" });
    return;
  }
  if (req.query.t !== segredoEsperado) {
    // Não revela se o pedido existe ou não pra quem não tem o segredo.
    res.status(404).end();
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const orderNsu = typeof body.order_nsu === "string" ? body.order_nsu : null;
  const transactionNsu = typeof body.transaction_nsu === "string" ? body.transaction_nsu : null;
  const slug = typeof body.invoice_slug === "string" ? body.invoice_slug : null;

  if (!orderNsu || !transactionNsu || !slug) {
    // Payload incompleto — responde 200 pra InfinitePay não ficar
    // retentando um webhook que nunca vai ter os dados esperados.
    res.status(200).json({ ok: true, ignorado: "payload incompleto" });
    return;
  }

  const handle = process.env.INFINITEPAY_HANDLE;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!handle || !supabaseUrl || !serviceRoleKey) {
    console.error("infinitepay-webhook: variáveis de ambiente do servidor não configuradas");
    // Aqui sim retorna erro real (5xx): é uma falha nossa de configuração,
    // e a InfinitePay deve retentar até alguém corrigir.
    res.status(500).json({ error: "servidor não configurado" });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const checkResponse = await fetch("https://api.checkout.infinitepay.io/payment_check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle, order_nsu: orderNsu, transaction_nsu: transactionNsu, slug }),
    });

    if (!checkResponse.ok) {
      console.error("infinitepay-webhook: payment_check falhou", await checkResponse.text());
      // Falha ao consultar a própria InfinitePay: não sabemos se pagou.
      // Retorna 502 pra ela retentar em vez de desistir silenciosamente.
      res.status(502).json({ error: "payment_check falhou" });
      return;
    }

    const resultado = (await checkResponse.json()) as PaymentCheckResponse;
    console.log("infinitepay-webhook: payment_check", JSON.stringify(resultado));

    if (resultado.paid !== true) {
      res.status(200).json({ ok: true, pago: false });
      return;
    }

    const valorPago = extrairValorPago(resultado);

    const { data, error } = await supabase.rpc("confirmar_pagamento_pedido", {
      p_order_nsu: orderNsu,
      p_transaction_nsu: transactionNsu,
      p_invoice_slug: slug,
      p_valor_pago: valorPago,
    });

    if (error) {
      console.error("infinitepay-webhook: erro ao confirmar pedido", error.message);
      res.status(500).json({ error: error.message });
      return;
    }

    const resultadoConfirmacao = data as string;
    console.log(`infinitepay-webhook: pedido ${orderNsu} -> ${resultadoConfirmacao}`);

    if (resultadoConfirmacao === "confirmado") {
      const n8nUrl = process.env.N8N_PEDIDO_PAGO_URL;
      if (n8nUrl) {
        // Fire-and-forget: se o n8n estiver fora do ar, não bloqueia nem
        // falha a confirmação do pagamento em si.
        fetch(n8nUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_nsu: orderNsu }),
        }).catch((err) => console.error("infinitepay-webhook: falha ao notificar n8n", err));
      }
    }

    res.status(200).json({ ok: true, pago: true, resultado: resultadoConfirmacao });
  } catch (err) {
    console.error("infinitepay-webhook: erro inesperado", err);
    res.status(500).json({ error: "erro inesperado" });
  }
}

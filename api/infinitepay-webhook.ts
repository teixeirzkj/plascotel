import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

/**
 * Recebe a notificação de pagamento da InfinitePay (webhook_url passado ao
 * criar o link em src/lib/infinitepay.ts) e só marca o pedido como
 * "confirmado" depois de confirmar de verdade com a própria InfinitePay
 * (endpoint payment_check) — nunca confia cegamente no payload recebido,
 * já que essa URL é pública e qualquer um poderia tentar chamá-la direto.
 *
 * Usa a Service Role Key do Supabase (nunca exposta ao navegador) porque
 * é uma escrita de servidor-para-servidor, sem sessão de usuário logado.
 *
 * Variáveis de ambiente necessárias (sem prefixo VITE_):
 *   SUPABASE_SERVICE_ROLE_KEY — em Project Settings > API > service_role
 */

const HANDLE = "riquelme-pereira-wkg";

interface PaymentCheckResponse {
  paid?: boolean;
  [key: string]: unknown;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const orderNsu = typeof body.order_nsu === "string" ? body.order_nsu : null;
  const transactionNsu = typeof body.transaction_nsu === "string" ? body.transaction_nsu : null;
  const slug = typeof body.invoice_slug === "string" ? body.invoice_slug : null;

  if (!orderNsu || !transactionNsu || !slug) {
    // Payload incompleto — responde 200 mesmo assim pra InfinitePay não
    // ficar retentando um webhook que nunca vai ter os dados esperados.
    res.status(200).json({ ok: true, ignorado: "payload incompleto" });
    return;
  }

  try {
    const checkResponse = await fetch("https://api.checkout.infinitepay.io/payment_check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: HANDLE,
        order_nsu: orderNsu,
        transaction_nsu: transactionNsu,
        slug,
      }),
    });

    if (!checkResponse.ok) {
      console.error("infinitepay-webhook: payment_check falhou", await checkResponse.text());
      res.status(200).json({ ok: true, ignorado: "payment_check falhou" });
      return;
    }

    const resultado = (await checkResponse.json()) as PaymentCheckResponse;
    if (resultado.paid !== true) {
      res.status(200).json({ ok: true, pago: false });
      return;
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("infinitepay-webhook: SUPABASE_SERVICE_ROLE_KEY não configurada");
      res.status(200).json({ ok: true, ignorado: "supabase não configurado no servidor" });
      return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    // Só confirma quem ainda estava aguardando pagamento — não sobrescreve
    // um status que o admin já tenha mudado manualmente (ex: cancelado).
    const { error } = await supabase
      .from("pedidos")
      .update({ status: "confirmado" })
      .eq("numero", Number(orderNsu))
      .eq("status", "aguardando_pagamento");

    if (error) {
      console.error("infinitepay-webhook: erro ao atualizar pedido", error.message);
      res.status(200).json({ ok: true, erro: error.message });
      return;
    }

    res.status(200).json({ ok: true, pago: true });
  } catch {
    res.status(200).json({ ok: true, ignorado: "erro inesperado" });
  }
}

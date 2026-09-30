import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { enviarEmail } from "./_lib/email.js";

/**
 * Roda uma vez por dia (ver "crons" em vercel.json) e manda um e-mail de
 * recuperação pra quem abriu um Pix (Mercado Pago) e não pagou a tempo —
 * mesmo critério de "carrinho abandonado" já usado no painel admin
 * (ehCarrinhoAbandonado, em AdminOrders.tsx): forma_pagamento = mercadopago
 * e status = cancelado (ou seja, o pedido expirou sem pagamento).
 *
 * Protegido pelo header que a própria Vercel manda em cron jobs quando
 * CRON_SECRET está configurada — só ela pode chamar isso, nunca alguém de
 * fora (senão viraria um jeito de mandar spam pros clientes da loja).
 *
 * Variáveis de ambiente necessárias (sem prefixo VITE_):
 *   SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL,
 *   CRON_SECRET
 */

const STORE_NAME = process.env.VITE_STORE_NAME || "Plascotel";
const WHATSAPP_NUMBER = (process.env.VITE_WHATSAPP_NUMBER || "").replace(/\D/g, "");
const JANELA_DIAS = 3; // só considera pedidos vencidos nos últimos N dias

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function montarHtml(params: {
  nomeCompleto: string;
  numero: number;
  itens: { nome: string; quantidade: number; precoUnitario: number }[];
  siteUrl: string;
}) {
  const linhasItens = params.itens
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;">${i.nome} × ${i.quantidade}</td><td style="padding:6px 0;text-align:right;">${formatarMoeda(
          i.precoUnitario * i.quantidade
        )}</td></tr>`
    )
    .join("");
  const total = params.itens.reduce((acc, i) => acc + i.precoUnitario * i.quantidade, 0);
  const linkWhatsApp = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        `Olá! Vi o lembrete do pedido #${params.numero} e quero finalizar a compra.`
      )}`
    : null;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #2b2b2b;">
      <h2 style="margin-bottom: 4px;">Você esqueceu algo no carrinho 🛒</h2>
      <p>Olá, ${params.nomeCompleto || "tudo bem"}! Notamos que o pedido #${params.numero} na ${STORE_NAME} não foi pago a tempo e acabou cancelado automaticamente.</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        ${linhasItens}
        <tr><td style="padding-top:10px; font-weight:bold; border-top:1px solid #ddd;">Total</td><td style="padding-top:10px; font-weight:bold; text-align:right; border-top:1px solid #ddd;">${formatarMoeda(total)}</td></tr>
      </table>
      <p>Ainda dá tempo de garantir o seu — é só voltar na loja e fazer o pedido de novo.</p>
      <p style="margin: 24px 0;">
        <a href="${params.siteUrl}" style="background:#2b2b2b; color:#fff; padding:12px 24px; border-radius:999px; text-decoration:none; font-weight:bold;">Voltar pra loja</a>
      </p>
      ${
        linkWhatsApp
          ? `<p>Ou fale com a gente direto pelo <a href="${linkWhatsApp}">WhatsApp</a>.</p>`
          : ""
      }
      <p style="color:#888; font-size:12px; margin-top:32px;">${STORE_NAME}</p>
    </div>
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("enviar-lembretes-carrinho: CRON_SECRET não configurado");
    res.status(500).json({ error: "job não configurado" });
    return;
  }
  if (req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: "não autorizado" });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: "Supabase não configurado no servidor." });
    return;
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const siteUrl = (process.env.SITE_URL || `https://${req.headers.host}`).replace(/\/$/, "");

  const desde = new Date(Date.now() - JANELA_DIAS * 24 * 60 * 60 * 1000).toISOString();

  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select("id, numero, cliente, criado_em, pedido_itens(nome, quantidade, preco_unitario)")
    .eq("forma_pagamento", "mercadopago")
    .eq("status", "cancelado")
    .is("lembrete_carrinho_enviado_em", null)
    .gte("criado_em", desde);

  if (error) {
    console.error("enviar-lembretes-carrinho: erro ao buscar pedidos", error.message);
    res.status(500).json({ error: error.message });
    return;
  }

  let enviados = 0;
  let ignorados = 0;

  for (const pedido of pedidos ?? []) {
    const cliente = (pedido.cliente ?? {}) as { nomeCompleto?: string; email?: string };
    const itens = (pedido.pedido_itens ?? []) as {
      nome: string;
      quantidade: number;
      preco_unitario: number;
    }[];

    if (cliente.email && itens.length > 0) {
      try {
        await enviarEmail({
          para: cliente.email,
          assunto: `Você esqueceu algo no carrinho — ${STORE_NAME}`,
          html: montarHtml({
            nomeCompleto: cliente.nomeCompleto || "",
            numero: pedido.numero,
            itens: itens.map((i) => ({
              nome: i.nome,
              quantidade: i.quantidade,
              precoUnitario: Number(i.preco_unitario),
            })),
            siteUrl,
          }),
        });
        enviados++;
      } catch (err) {
        console.error(`enviar-lembretes-carrinho: falha ao enviar pedido #${pedido.numero}`, err);
        ignorados++;
      }
    } else {
      ignorados++;
    }

    // Marca como processado mesmo se falhou/foi ignorado — evita tentar de
    // novo pra sempre um pedido sem e-mail válido ou com erro permanente.
    await supabase
      .from("pedidos")
      .update({ lembrete_carrinho_enviado_em: new Date().toISOString() })
      .eq("id", pedido.id);
  }

  res.status(200).json({ ok: true, enviados, ignorados, total: (pedidos ?? []).length });
}

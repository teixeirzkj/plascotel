/**
 * Envio de e-mail transacional via Resend (https://resend.com) — usado
 * hoje só pelo lembrete de carrinho abandonado
 * (api/enviar-lembretes-carrinho.ts).
 *
 * Configure na Vercel (sem prefixo VITE_):
 *   RESEND_API_KEY    — API key gerada em resend.com/api-keys
 *   RESEND_FROM_EMAIL — remetente (ex: "Plascotel <contato@plascotel.com.br>").
 *     Precisa ser de um domínio verificado no Resend (Domains > Add
 *     Domain + registros DNS) — sem isso, o Resend só entrega pro próprio
 *     e-mail da conta, não pros clientes de verdade.
 */

const API_BASE = "https://api.resend.com";

export async function enviarEmail(params: { para: string; assunto: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const remetente = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !remetente) {
    throw new Error("RESEND_API_KEY/RESEND_FROM_EMAIL não configurados.");
  }

  const response = await fetch(`${API_BASE}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: remetente,
      to: params.para,
      subject: params.assunto,
      html: params.html,
    }),
  });

  if (!response.ok) {
    const texto = await response.text();
    throw new Error(`Resend recusou o envio (${response.status}): ${texto}`);
  }
}

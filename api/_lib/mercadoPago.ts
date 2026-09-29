/**
 * Integração com o Pix da API de Pagamentos do Mercado Pago — cria o
 * pagamento e devolve o QR code pra mostrar direto na página do site (sem
 * redirecionar o cliente pra fora), e verifica o status de novo
 * server-a-server antes de confirmar (nunca confia no corpo do webhook
 * sozinho — mesmo princípio já usado com a InfinitePay).
 *
 * Configure na Vercel (sem prefixo VITE_):
 *   MERCADOPAGO_ACCESS_TOKEN — Suas integrações > aplicativo > credenciais
 *     de produção, em mercadopago.com.br/developers
 */

const API_BASE = "https://api.mercadopago.com";

export interface PixCriado {
  id: number;
  status: string;
  qrCode: string;
  qrCodeBase64: string;
  expiraEm: string | null;
}

export async function criarPagamentoPix(params: {
  valor: number;
  descricao: string;
  orderNsu: string;
  notificationUrl: string;
  cliente: { nomeCompleto: string; email: string; cpf?: string };
}): Promise<PixCriado> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  }

  const partesNome = params.cliente.nomeCompleto.trim().split(/\s+/).filter(Boolean);
  const primeiroNome = partesNome[0] || "Cliente";
  const sobrenome = partesNome.slice(1).join(" ") || "Plascotel";
  const cpfLimpo = (params.cliente.cpf || "").replace(/\D/g, "");

  const response = await fetch(`${API_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      // Evita cobrar duas vezes se a chamada for repetida por qualquer motivo.
      "X-Idempotency-Key": params.orderNsu,
    },
    body: JSON.stringify({
      transaction_amount: Number(params.valor.toFixed(2)),
      description: params.descricao.slice(0, 200),
      payment_method_id: "pix",
      external_reference: params.orderNsu,
      notification_url: params.notificationUrl,
      payer: {
        email: params.cliente.email,
        first_name: primeiroNome,
        last_name: sobrenome,
        ...(cpfLimpo ? { identification: { type: "CPF", number: cpfLimpo } } : {}),
      },
    }),
  });

  const texto = await response.text();
  if (!response.ok) {
    console.error("mercadopago: falha ao criar pagamento Pix", response.status, texto);
    throw new Error(`Mercado Pago recusou o pagamento (${response.status}).`);
  }

  const dados = JSON.parse(texto);
  const transactionData = dados?.point_of_interaction?.transaction_data;
  if (!transactionData?.qr_code || !transactionData?.qr_code_base64) {
    console.error("mercadopago: resposta sem QR code Pix", texto);
    throw new Error("Resposta do Mercado Pago sem QR code Pix.");
  }

  return {
    id: dados.id,
    status: dados.status,
    qrCode: transactionData.qr_code,
    qrCodeBase64: transactionData.qr_code_base64,
    expiraEm: dados.date_of_expiration ?? null,
  };
}

export interface StatusPagamentoMP {
  status: string;
  valorPago: number | null;
  externalReference: string | null;
}

/** Consulta o status real de um pagamento direto no Mercado Pago — nunca confia só no que o webhook mandou. */
export async function consultarPagamento(paymentId: string | number): Promise<StatusPagamentoMP> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  }

  const response = await fetch(`${API_BASE}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const texto = await response.text();
  if (!response.ok) {
    throw new Error(`Falha ao consultar pagamento no Mercado Pago (${response.status}).`);
  }

  const dados = JSON.parse(texto);
  const valorPago =
    dados?.transaction_details?.total_paid_amount ?? dados?.transaction_amount ?? null;

  return {
    status: dados.status,
    valorPago: valorPago != null ? Number(valorPago) : null,
    externalReference: dados.external_reference ?? null,
  };
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { cotarFrete, fretePadraoPara, limparCep, type ItemFrete } from "./_lib/frete.js";
import { criarPagamentoPix } from "./_lib/mercadoPago.js";

/**
 * Cria o pedido E (se for pagamento online) o Pix — tudo decidido AQUI, no
 * servidor, a partir do banco. O navegador manda só
 * produtoId/varianteId/quantidade; preço, frete e o valor cobrado nunca
 * passam pela mão do cliente. Ver PLASCOTEL_pagamento_seguro.md.
 *
 * Variáveis de ambiente necessárias (sem prefixo VITE_):
 *   SUPABASE_SERVICE_ROLE_KEY, MERCADOPAGO_ACCESS_TOKEN, SITE_URL
 */

interface ItemPedidoBody {
  produtoId: string;
  varianteId?: string | null;
  quantidade: number;
}

interface ClienteBody {
  nomeCompleto: string;
  whatsapp: string;
  email: string;
  cpf?: string;
  cep: string;
  estado: string;
  cidade: string;
  bairro: string;
  rua: string;
  numero: string;
  complemento?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  // Qualquer erro inesperado aqui dentro (ex: falha de rede momentânea com o
  // Supabase) precisa terminar numa resposta JSON, nunca numa página de erro
  // genérica da Vercel — o navegador sempre espera poder fazer response.json()
  // nessa chamada (ver src/lib/checkout.ts).
  try {
    await processarPagamento(req, res);
  } catch (err) {
    console.error("criar-pagamento: erro inesperado", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Não foi possível concluir a compra. Tente novamente." });
    }
  }
}

async function processarPagamento(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: "Loja não configurada. Tente novamente mais tarde." });
    return;
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const body = (req.body ?? {}) as {
    itens?: ItemPedidoBody[];
    cliente?: ClienteBody;
    formaPagamento?: "mercadopago" | "whatsapp";
    cepDestino?: string;
    freteOpcaoId?: number | null;
  };

  const itensBrutos = Array.isArray(body.itens) ? body.itens : [];
  const cliente = body.cliente;
  const formaPagamento = body.formaPagamento;

  if (itensBrutos.length === 0) {
    res.status(400).json({ error: "Carrinho vazio." });
    return;
  }
  if (formaPagamento !== "mercadopago" && formaPagamento !== "whatsapp") {
    res.status(400).json({ error: "Forma de pagamento inválida." });
    return;
  }
  if (
    !cliente?.nomeCompleto ||
    !cliente?.whatsapp ||
    !cliente?.email ||
    !cliente?.rua ||
    !cliente?.numero ||
    !cliente?.cidade ||
    !cliente?.estado ||
    !cliente?.cep
  ) {
    res.status(400).json({ error: "Preencha todos os dados obrigatórios." });
    return;
  }
  if (formaPagamento === "mercadopago" && !cliente.cpf) {
    res.status(400).json({ error: "Informe o CPF para gerar o Pix." });
    return;
  }

  // Busca preço/peso/dimensões de cada item DIRETO NO BANCO — o corpo da
  // requisição só tem produtoId/varianteId/quantidade.
  const produtoIds = [...new Set(itensBrutos.map((i) => i.produtoId).filter(Boolean))];
  const varianteIds = [...new Set(itensBrutos.map((i) => i.varianteId).filter(Boolean))] as string[];

  const [
    { data: produtos, error: errProdutos },
    { data: variantes, error: errVariantes },
    { data: produtosComVariante, error: errProdutosComVariante },
  ] = await Promise.all([
    supabase
      .from("produtos")
      .select("id, preco, preco_promocional, peso, altura, largura, comprimento")
      .in("id", produtoIds),
    varianteIds.length > 0
      ? supabase
          .from("produto_variantes")
          .select("id, produto_id, preco, preco_promocional, peso, altura, largura, comprimento")
          .in("id", varianteIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    supabase.from("produto_variantes").select("produto_id").in("produto_id", produtoIds),
  ]);

  if (errProdutos || errVariantes || errProdutosComVariante) {
    res.status(500).json({ error: "Não foi possível validar os itens do carrinho." });
    return;
  }

  const produtoPorId = new Map((produtos ?? []).map((p: any) => [p.id, p]));
  const variantePorId = new Map((variantes ?? []).map((v: any) => [v.id, v]));
  // Produto com variações não pode ser comprado pelo preço base (ver
  // criar_pedido_seguro, que também recusa isso — esta é só a checagem
  // antecipada, pra dar um erro amigável sem gastar uma chamada ao banco).
  const produtoIdsComVariante = new Set((produtosComVariante ?? []).map((v: any) => v.produto_id));

  const itensFrete: ItemFrete[] = [];
  let subtotalEstimado = 0;

  for (const item of itensBrutos) {
    const qtd = Number(item.quantidade);
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 50) {
      res.status(400).json({ error: "Quantidade inválida." });
      return;
    }

    const variante = item.varianteId ? variantePorId.get(item.varianteId) : null;
    const produto = variante ? produtoPorId.get(variante.produto_id) : produtoPorId.get(item.produtoId);

    if (!produto) {
      res.status(400).json({ error: "Um dos produtos do carrinho não existe mais." });
      return;
    }
    if (!variante && produtoIdsComVariante.has(item.produtoId)) {
      res.status(400).json({ error: "Selecione uma variação válida para este produto." });
      return;
    }

    const fonte: any = variante ?? produto;
    const preco = Number(fonte.preco_promocional ?? fonte.preco);
    subtotalEstimado += preco * qtd;
    itensFrete.push({
      peso: fonte.peso ?? undefined,
      altura: fonte.altura ?? undefined,
      largura: fonte.largura ?? undefined,
      comprimento: fonte.comprimento ?? undefined,
      quantidade: qtd,
      valor: preco * qtd,
    });
  }

  // Cota o frete de novo, no servidor — usa só o ID da opção que o cliente
  // escolheu pra achar o preço real; nunca o valor que ele mandou.
  let frete = fretePadraoPara(subtotalEstimado);
  const cepLimpo = limparCep(body.cepDestino || cliente.cep);
  if (cepLimpo.length === 8) {
    try {
      const resultado = await cotarFrete(cepLimpo, itensFrete);
      if (resultado.configurado && resultado.opcoes.length > 0) {
        const escolhida =
          body.freteOpcaoId != null ? resultado.opcoes.find((o) => o.id === body.freteOpcaoId) : null;
        frete = escolhida ? escolhida.preco : resultado.opcoes[0].preco;
      }
    } catch {
      // Mantém o frete padrão se o Melhor Envio falhar — não trava a compra.
    }
  }

  const { data, error } = await supabase.rpc("criar_pedido_seguro", {
    p_itens: itensBrutos.map((i) => ({
      produto_id: i.produtoId,
      variante_id: i.varianteId ?? null,
      quantidade: i.quantidade,
    })),
    p_cliente: cliente,
    p_frete: frete,
    p_forma_pagamento: formaPagamento,
  });

  if (error) {
    res.status(400).json({ error: error.message || "Não foi possível criar o pedido." });
    return;
  }

  const pedido = (Array.isArray(data) ? data[0] : data) as {
    id: string;
    numero: number;
    order_nsu: string;
    subtotal: number;
    frete: number;
    total: number;
    criado_em: string;
  };

  if (formaPagamento === "whatsapp") {
    res.status(200).json({
      id: pedido.id,
      numero: pedido.numero,
      orderNsu: pedido.order_nsu,
      subtotal: Number(pedido.subtotal),
      frete: Number(pedido.frete),
      total: Number(pedido.total),
      criadoEm: pedido.criado_em,
    });
    return;
  }

  // Pix via Mercado Pago: o QR code é gerado AQUI, com o valor que a gente
  // mesmo acabou de calcular — o cliente não tem como cobrar um valor
  // diferente do que o pedido realmente tem.
  const siteUrl = (process.env.SITE_URL || `https://${req.headers.host}`).replace(/\/$/, "");
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    console.error("criar-pagamento: MERCADOPAGO_ACCESS_TOKEN não configurado");
    res.status(500).json({ error: "Pagamento online não está configurado no momento." });
    return;
  }

  try {
    const pix = await criarPagamentoPix({
      valor: Number(pedido.total),
      descricao: `Pedido #${pedido.numero} — Plascotel`,
      orderNsu: pedido.order_nsu,
      notificationUrl: `${siteUrl}/api/mercadopago-webhook`,
      cliente: { nomeCompleto: cliente.nomeCompleto, email: cliente.email, cpf: cliente.cpf },
    });

    // Guarda o id do pagamento no pedido AGORA — é assim que o webhook (e a
    // tela do cliente, se ele recarregar a página) sabem a qual pedido esse
    // pagamento do Mercado Pago pertence.
    await supabase
      .from("pedidos")
      .update({ transaction_nsu: String(pix.id) })
      .eq("id", pedido.id);

    res.status(200).json({
      id: pedido.id,
      numero: pedido.numero,
      orderNsu: pedido.order_nsu,
      subtotal: Number(pedido.subtotal),
      frete: Number(pedido.frete),
      total: Number(pedido.total),
      criadoEm: pedido.criado_em,
      pixQrCode: pix.qrCode,
      pixQrCodeBase64: pix.qrCodeBase64,
      pixExpiraEm: pix.expiraEm,
    });
  } catch (err) {
    console.error("criar-pagamento: erro ao gerar Pix no Mercado Pago", err);
    // O pedido já existe (aguardando_pagamento, com prazo de expiração) —
    // o cliente pode falar pelo WhatsApp informando o número do pedido.
    res.status(502).json({
      error: "Pedido registrado, mas não foi possível gerar o Pix agora.",
      numero: pedido.numero,
    });
  }
}

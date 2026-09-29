import { useEffect, useState } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { FiLoader, FiCheckCircle, FiXCircle, FiAlertTriangle, FiTruck, FiCopy } from "react-icons/fi";
import { useLastOrderStore } from "../store/lastOrder";
import { formatCurrency } from "../lib/format";
import { buildWhatsAppLink, STORE_NAME } from "../config/store";
import { supabase } from "../lib/supabase";

// O pedido tem 30 minutos pra ser pago (ver expira_em em criar_pedido_seguro,
// supabase/schema.sql) — o polling precisa cobrir essa janela inteira,
// senão a página para de checar sozinha antes do prazo acabar.
const INTERVALO_MS = 5000;
const TENTATIVAS_MAX = (30 * 60 * 1000) / INTERVALO_MS;

interface StatusPublico {
  status: string;
  numero: number;
  total: number;
  codigoRastreio: string | null;
  expiraEm: string | null;
}

/**
 * O status real do pedido (pago ou não) só existe no banco — nunca no
 * localStorage do navegador, que só guarda os dados exibidos aqui. Por isso
 * a página consulta a função pública `status_pedido_publico` (ver
 * supabase/schema.sql) usando o order_nsu da URL, em vez de simplesmente
 * assumir "pagamento realizado" ao chegar aqui. Ver
 * PLASCOTEL_pagamento_seguro.md.
 */
export default function OrderSuccessPage() {
  const order = useLastOrderStore((s) => s.order);
  const [searchParams] = useSearchParams();
  const orderNsu = searchParams.get("order_nsu") ?? order?.orderNsu ?? null;

  const [statusRemoto, setStatusRemoto] = useState<StatusPublico | null>(null);
  const [tentativas, setTentativas] = useState(0);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  useEffect(() => {
    if (!orderNsu || !supabase) return;
    if (statusRemoto && statusRemoto.status !== "aguardando_pagamento") return;
    if (tentativas >= TENTATIVAS_MAX) return;

    let cancelado = false;
    const timer = setTimeout(
      async () => {
        const { data, error } = await supabase!.rpc("status_pedido_publico", {
          p_order_nsu: orderNsu,
        });
        if (cancelado) return;
        const linha = Array.isArray(data) ? data[0] : data;
        if (!error && linha) {
          setStatusRemoto({
            status: linha.status,
            numero: linha.numero,
            total: Number(linha.total),
            codigoRastreio: linha.codigo_rastreio,
            expiraEm: linha.expira_em,
          });
        } else if (!error) {
          setNaoEncontrado(true);
        }
        setTentativas((t) => t + 1);
      },
      tentativas === 0 ? 0 : INTERVALO_MS
    );

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNsu, tentativas]);

  if (!order && !orderNsu) return <Navigate to="/" replace />;

  const status = statusRemoto?.status ?? (orderNsu ? null : "novo");
  const numero = statusRemoto?.numero ?? order?.numero;
  const total = statusRemoto?.total ?? order?.total ?? 0;
  const codigoRastreio = statusRemoto?.codigoRastreio ?? null;
  const expiraEm = statusRemoto?.expiraEm ?? null;

  const numeroExibido = numero ?? "?";
  const mensagem = order
    ? `Olá! Gostaria de confirmar meu pedido #${numeroExibido} na ${STORE_NAME}.
Endereço de entrega: ${order.cliente.rua}, ${order.cliente.numero} - ${order.cliente.bairro}, ${order.cliente.cidade}/${order.cliente.estado}`
    : `Olá! Gostaria de saber sobre o meu pedido #${numeroExibido} na ${STORE_NAME}.`;

  return (
    <section className="mx-auto max-w-2xl px-6 py-16 text-center md:py-24">
      <StatusHeader
        status={status}
        numero={numero}
        esgotado={tentativas >= TENTATIVAS_MAX}
        naoEncontrado={naoEncontrado && !statusRemoto}
        codigoRastreio={codigoRastreio}
      />

      {status === "aguardando_pagamento" && expiraEm && <Cronometro expiraEm={expiraEm} />}

      {order?.formaPagamento === "mercadopago" &&
        order.pixQrCodeBase64 &&
        (status === "aguardando_pagamento" || status === null) && (
          <PixPagamento qrCodeBase64={order.pixQrCodeBase64} qrCode={order.pixQrCode ?? ""} />
        )}

      {order && (
        <div className="mt-8 rounded-2xl bg-white p-6 text-left shadow-card">
          <h2 className="mb-3 font-display text-lg">Resumo do pedido</h2>
          <ul className="flex flex-col gap-2 border-b border-sand pb-3 text-sm">
            {order.itens.map((item) => (
              <li key={item.productId} className="flex justify-between">
                <span className="text-charcoal/70">
                  {item.nome} × {item.quantidade}
                </span>
                <span className="font-medium">{formatCurrency(item.precoUnitario * item.quantidade)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between pt-3 text-lg font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="mt-4 border-t border-sand pt-3 text-sm text-charcoal/70">
            <p>
              <strong>Cliente:</strong> {order.cliente.nomeCompleto}
            </p>
            <p>
              <strong>Endereço:</strong> {order.cliente.rua}, {order.cliente.numero} -{" "}
              {order.cliente.bairro}, {order.cliente.cidade}/{order.cliente.estado}
            </p>
            <p>
              <strong>Pagamento:</strong> {order.formaPagamento === "mercadopago" ? "Pix" : "A combinar"}
            </p>
          </div>
        </div>
      )}

      {status !== "cancelado" && (
        <a
          href={buildWhatsAppLink(mensagem)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-[#25D366] py-4 text-lg font-semibold text-white shadow-soft transition hover:brightness-95"
        >
          <FaWhatsapp size={24} /> Falar pelo WhatsApp
        </a>
      )}

      <Link to="/moveis" className="mt-4 inline-block text-sm font-semibold text-wood-700 hover:underline">
        Continuar comprando
      </Link>
    </section>
  );
}

function StatusHeader({
  status,
  numero,
  esgotado,
  naoEncontrado,
  codigoRastreio,
}: {
  status: string | null;
  numero?: number;
  esgotado: boolean;
  naoEncontrado: boolean;
  codigoRastreio: string | null;
}) {
  const anim = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: "spring" as const, stiffness: 200, damping: 16 },
  };

  if (naoEncontrado) {
    return (
      <motion.div {...anim}>
        <FiXCircle className="mx-auto mb-3 text-offer" size={40} />
        <h1 className="font-display text-2xl sm:text-3xl">Pedido não encontrado</h1>
        <p className="mt-2 text-charcoal/60">
          Não encontramos esse pedido. Se você concluiu uma compra, fale com a gente pelo WhatsApp.
        </p>
      </motion.div>
    );
  }

  if (status === "aguardando_pagamento" || status === null) {
    return (
      <motion.div {...anim}>
        <FiLoader className="mx-auto mb-3 animate-spin text-wood-500" size={40} />
        <h1 className="font-display text-2xl sm:text-3xl">Confirmando seu pagamento...</h1>
        <p className="mt-2 text-charcoal/60">
          {esgotado
            ? `Pedido #${numero} recebido. A confirmação está demorando mais que o normal — se você já pagou, ela deve chegar em instantes; senão, fale pelo WhatsApp que a gente confere pra você.`
            : `Pedido #${numero} registrado. Pague o Pix abaixo — assim que cair, atualizamos automaticamente esta página.`}
        </p>
      </motion.div>
    );
  }

  if (status === "divergencia_valor") {
    return (
      <motion.div {...anim}>
        <FiAlertTriangle className="mx-auto mb-3 text-offer" size={40} />
        <h1 className="font-display text-2xl sm:text-3xl">Precisamos confirmar seu pagamento</h1>
        <p className="mt-2 text-charcoal/60">
          Recebemos um pagamento para o pedido #{numero}, mas o valor não bateu com o total do pedido.
          Fale com a gente pelo WhatsApp para resolvermos rapidinho.
        </p>
      </motion.div>
    );
  }

  if (status === "cancelado") {
    return (
      <motion.div {...anim}>
        <FiXCircle className="mx-auto mb-3 text-offer" size={40} />
        <h1 className="font-display text-2xl sm:text-3xl">Pedido cancelado</h1>
        <p className="mt-2 text-charcoal/60">
          O pedido #{numero} foi cancelado (o pagamento não foi concluído a tempo). Você pode fazer um
          novo pedido quando quiser.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div {...anim}>
      <FiCheckCircle className="mx-auto mb-3 text-green-600" size={40} />
      <h1 className="font-display text-2xl sm:text-3xl">
        {status === "enviado" ? "Seu pedido está a caminho!" : status === "entregue" ? "Pedido entregue!" : "Pedido realizado com sucesso! 🎉"}
      </h1>
      <p className="mt-2 text-charcoal/60">
        Pedido #{numero}
        {status === "novo" && " — confirme o envio pelo WhatsApp para agilizarmos a entrega."}
        {status === "confirmado" && " — pagamento confirmado. Já estamos preparando tudo!"}
        {status === "enviado" && " — já saiu para entrega."}
        {status === "entregue" && " — esperamos que você tenha gostado!"}
      </p>
      {codigoRastreio && (status === "enviado" || status === "entregue") && (
        <p className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full bg-wood-100 px-4 py-2 text-sm font-medium text-wood-700">
          <FiTruck size={16} /> Rastreio: {codigoRastreio}
        </p>
      )}
    </motion.div>
  );
}

/**
 * Cronômetro regressivo até o pedido expirar (30 minutos, ver expira_em em
 * criar_pedido_seguro). Não precisa avisar ninguém quando chega a zero — o
 * próprio polling de status logo acima já dispara `expirar_pedidos_pendentes`
 * a cada consulta, então assim que o prazo estoura o status muda sozinho
 * pra "cancelado" na próxima vez que a página checar.
 */
function Cronometro({ expiraEm }: { expiraEm: string }) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const restanteMs = Math.max(0, new Date(expiraEm).getTime() - agora);
  const minutos = Math.floor(restanteMs / 60000);
  const segundos = Math.floor((restanteMs % 60000) / 1000);
  const acabando = restanteMs < 5 * 60 * 1000;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`mx-auto mt-6 flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
        acabando ? "bg-offer/10 text-offer" : "bg-wood-100 text-wood-700"
      }`}
    >
      <FiLoader size={16} className={restanteMs > 0 ? "animate-spin" : ""} />
      {restanteMs > 0 ? (
        <span>
          Tempo restante para pagar: {minutos}:{String(segundos).padStart(2, "0")}
        </span>
      ) : (
        <span>Prazo esgotado — atualizando...</span>
      )}
    </motion.div>
  );
}

/** QR code + "copia e cola" do Pix, exibidos direto na página enquanto o pedido aguarda pagamento. */
function PixPagamento({ qrCodeBase64, qrCode }: { qrCodeBase64: string; qrCode: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem permissão de clipboard (raro) — o cliente ainda pode selecionar
      // o texto manualmente no campo abaixo.
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mt-8 flex max-w-sm flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow-card"
    >
      <p className="text-sm font-medium text-charcoal/70">Escaneie o QR code com o app do seu banco</p>
      <img
        src={`data:image/png;base64,${qrCodeBase64}`}
        alt="QR code Pix"
        className="h-56 w-56 rounded-xl border border-sand object-contain"
      />
      <div className="flex w-full flex-col gap-2">
        <p className="text-xs font-medium text-charcoal/60">Ou copie o código Pix:</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={qrCode}
            onFocus={(e) => e.target.select()}
            className="input flex-1 truncate text-xs"
          />
          <button
            type="button"
            onClick={copiarCodigo}
            className="flex flex-none items-center gap-1.5 rounded-full bg-charcoal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-charcoal-800"
          >
            <FiCopy size={14} /> {copiado ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

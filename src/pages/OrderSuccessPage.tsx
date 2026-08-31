import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { useLastOrderStore } from "../store/lastOrder";
import { formatCurrency } from "../lib/format";
import { buildWhatsAppLink, STORE_NAME } from "../config/store";

export default function OrderSuccessPage() {
  const order = useLastOrderStore((s) => s.order);

  if (!order) return <Navigate to="/" replace />;

  const listaProdutos = order.itens
    .map(
      (i) =>
        `• ${i.nome} — ${i.quantidade} unidade(s) — ${formatCurrency(
          i.precoUnitario * i.quantidade
        )}`
    )
    .join("\n");

  const mensagem = `Olá! Gostaria de confirmar meu pedido na ${STORE_NAME}.
Pedido: #${order.numero}
Produtos:
${listaProdutos}
Total: ${formatCurrency(order.total)}
Forma de pagamento: ${
    order.formaPagamento === "infinitepay" ? "InfinitePay" : "A combinar"
  }
Nome: ${order.cliente.nomeCompleto}
Endereço: ${order.cliente.rua}, ${order.cliente.numero} - ${order.cliente.bairro}, ${order.cliente.cidade}/${order.cliente.estado}

Obrigado!`;

  return (
    <section className="mx-auto max-w-2xl px-6 py-16 text-center md:py-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
      >
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl">
          Pedido realizado com sucesso! 🎉
        </h1>
        <p className="mt-2 text-charcoal/60">
          Pedido #{order.numero} — confirme o envio pelo WhatsApp para
          agilizarmos a entrega.
        </p>
      </motion.div>

      <div className="mt-8 rounded-2xl bg-white p-6 text-left shadow-card">
        <h2 className="mb-3 font-display text-lg">Resumo do pedido</h2>
        <ul className="flex flex-col gap-2 border-b border-sand pb-3 text-sm">
          {order.itens.map((item) => (
            <li key={item.productId} className="flex justify-between">
              <span className="text-charcoal/70">
                {item.nome} × {item.quantidade}
              </span>
              <span className="font-medium">
                {formatCurrency(item.precoUnitario * item.quantidade)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between pt-3 text-lg font-semibold">
          <span>Total</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
        <div className="mt-4 border-t border-sand pt-3 text-sm text-charcoal/70">
          <p><strong>Cliente:</strong> {order.cliente.nomeCompleto}</p>
          <p>
            <strong>Endereço:</strong> {order.cliente.rua}, {order.cliente.numero} -{" "}
            {order.cliente.bairro}, {order.cliente.cidade}/{order.cliente.estado}
          </p>
          <p>
            <strong>Pagamento:</strong>{" "}
            {order.formaPagamento === "infinitepay" ? "InfinitePay" : "A combinar"}
          </p>
        </div>
      </div>

      <a
        href={buildWhatsAppLink(mensagem)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-[#25D366] py-4 text-lg font-semibold text-white shadow-soft transition hover:brightness-95"
      >
        <FaWhatsapp size={24} /> Enviar pedido pelo WhatsApp
      </a>

      <Link
        to="/moveis"
        className="mt-4 inline-block text-sm font-semibold text-wood-700 hover:underline"
      >
        Continuar comprando
      </Link>
    </section>
  );
}

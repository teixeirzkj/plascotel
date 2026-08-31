import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { FiAlertTriangle } from "react-icons/fi";
import { useCartStore } from "../store/cart";
import { useLastOrderStore } from "../store/lastOrder";
import { formatCurrency } from "../lib/format";
import { placeOrder } from "../lib/checkout";
import { INFINITEPAY_PAYMENT_LINK } from "../config/store";
import type { CustomerData } from "../types";

const FRETE_GRATIS_ACIMA_DE = 1500;
const FRETE_PADRAO = 89.9;

const initialCustomer: CustomerData = {
  nomeCompleto: "",
  whatsapp: "",
  email: "",
  cep: "",
  estado: "",
  cidade: "",
  bairro: "",
  rua: "",
  numero: "",
  complemento: "",
};

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCartStore();
  const setOrder = useLastOrderStore((s) => s.setOrder);
  const navigate = useNavigate();

  const [cliente, setCliente] = useState<CustomerData>(initialCustomer);
  const [pagamento, setPagamento] = useState<"infinitepay" | "whatsapp">(
    INFINITEPAY_PAYMENT_LINK ? "infinitepay" : "whatsapp"
  );
  const [loading, setLoading] = useState(false);

  const sub = subtotal();
  const frete = sub >= FRETE_GRATIS_ACIMA_DE ? 0 : FRETE_PADRAO;
  const total = sub + frete;

  if (items.length === 0) return <Navigate to="/carrinho" replace />;

  function update<K extends keyof CustomerData>(key: K, value: CustomerData[K]) {
    setCliente((c) => ({ ...c, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const order = await placeOrder(items, cliente, sub, frete, pagamento);
      setOrder(order);
      clear();
      if (pagamento === "infinitepay" && INFINITEPAY_PAYMENT_LINK) {
        window.location.href = INFINITEPAY_PAYMENT_LINK;
      }
      navigate("/pedido-realizado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-12 md:px-10">
      <h1 className="mb-8 font-display text-3xl">Finalizar compra</h1>
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]"
      >
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="mb-4 font-display text-xl">Dados do cliente</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nome completo" span2>
                <input
                  required
                  value={cliente.nomeCompleto}
                  onChange={(e) => update("nomeCompleto", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="WhatsApp">
                <input
                  required
                  placeholder="(11) 99999-9999"
                  value={cliente.whatsapp}
                  onChange={(e) => update("whatsapp", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="E-mail">
                <input
                  required
                  type="email"
                  value={cliente.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="input"
                />
              </Field>
            </div>
          </div>

          <div>
            <h2 className="mb-4 font-display text-xl">Endereço de entrega</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="CEP">
                <input
                  required
                  value={cliente.cep}
                  onChange={(e) => update("cep", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Estado">
                <input
                  required
                  value={cliente.estado}
                  onChange={(e) => update("estado", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Cidade">
                <input
                  required
                  value={cliente.cidade}
                  onChange={(e) => update("cidade", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Bairro">
                <input
                  required
                  value={cliente.bairro}
                  onChange={(e) => update("bairro", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Rua" span2>
                <input
                  required
                  value={cliente.rua}
                  onChange={(e) => update("rua", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Número">
                <input
                  required
                  value={cliente.numero}
                  onChange={(e) => update("numero", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Complemento">
                <input
                  value={cliente.complemento}
                  onChange={(e) => update("complemento", e.target.value)}
                  className="input"
                />
              </Field>
            </div>
          </div>

          <div>
            <h2 className="mb-4 font-display text-xl">Forma de pagamento</h2>
            <div className="flex flex-col gap-3">
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${
                  pagamento === "infinitepay"
                    ? "border-charcoal bg-wood-50"
                    : "border-sand"
                }`}
              >
                <input
                  type="radio"
                  name="pagamento"
                  checked={pagamento === "infinitepay"}
                  onChange={() => setPagamento("infinitepay")}
                  className="h-4 w-4 accent-wood-700"
                />
                <div>
                  <p className="font-medium">Pagamento online (InfinitePay)</p>
                  <p className="text-sm text-charcoal/60">
                    Cartão, Pix ou boleto via InfinitePay.
                  </p>
                </div>
              </label>

              {!INFINITEPAY_PAYMENT_LINK && (
                <div className="flex items-start gap-2 rounded-xl bg-offer/10 p-3 text-sm text-offer">
                  <FiAlertTriangle className="mt-0.5 flex-none" />
                  <span>
                    O link de pagamento da InfinitePay ainda não foi
                    configurado (variável VITE_INFINITEPAY_PAYMENT_LINK).
                  </span>
                </div>
              )}

              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${
                  pagamento === "whatsapp"
                    ? "border-charcoal bg-wood-50"
                    : "border-sand"
                }`}
              >
                <input
                  type="radio"
                  name="pagamento"
                  checked={pagamento === "whatsapp"}
                  onChange={() => setPagamento("whatsapp")}
                  className="h-4 w-4 accent-wood-700"
                />
                <div>
                  <p className="font-medium">Combinar pagamento pelo WhatsApp</p>
                  <p className="text-sm text-charcoal/60">
                    Finalize o pedido e acerte o pagamento diretamente com a
                    nossa equipe.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="h-fit rounded-2xl bg-white p-6 shadow-card">
          <h2 className="mb-4 font-display text-xl">Resumo do pedido</h2>
          <ul className="mb-4 flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.productId} className="flex justify-between text-sm">
                <span className="text-charcoal/70">
                  {item.nome} × {item.quantidade}
                </span>
                <span className="font-medium">
                  {formatCurrency(item.precoUnitario * item.quantidade)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t border-sand py-2 text-sm text-charcoal/70">
            <span>Subtotal</span>
            <span>{formatCurrency(sub)}</span>
          </div>
          <div className="flex justify-between py-2 text-sm text-charcoal/70">
            <span>Frete</span>
            <span>{frete === 0 ? "Grátis" : formatCurrency(frete)}</span>
          </div>
          <div className="flex justify-between border-t border-sand pt-3 text-lg font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-full bg-charcoal py-3.5 font-semibold text-white transition hover:bg-charcoal-800 disabled:opacity-60"
          >
            {loading
              ? "Processando..."
              : pagamento === "infinitepay" && INFINITEPAY_PAYMENT_LINK
              ? "Pagar com InfinitePay"
              : "Confirmar pedido"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  children,
  span2,
}: {
  label: string;
  children: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${span2 ? "sm:col-span-2" : ""}`}>
      <span className="font-medium text-charcoal/80">{label}</span>
      {children}
    </label>
  );
}

import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { FiLoader } from "react-icons/fi";
import { useCartStore } from "../store/cart";
import { useLastOrderStore } from "../store/lastOrder";
import { formatCurrency } from "../lib/format";
import { placeOrder } from "../lib/checkout";
import { calcularFrete, type OpcaoFrete } from "../lib/frete";
import { buscarEnderecoPorCep } from "../lib/cep";
import type { CustomerData } from "../types";

const FRETE_GRATIS_ACIMA_DE = 1500;
const FRETE_PADRAO = 89.9;

const initialCustomer: CustomerData = {
  nomeCompleto: "",
  whatsapp: "",
  email: "",
  cpf: "",
  cep: "",
  estado: "",
  cidade: "",
  bairro: "",
  rua: "",
  numero: "",
  complemento: "",
};

const ENDERECO_OBRIGATORIO: (keyof CustomerData)[] = ["cep", "estado", "cidade", "bairro", "rua", "numero"];

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCartStore();
  const setOrder = useLastOrderStore((s) => s.setOrder);
  const navigate = useNavigate();

  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [cliente, setCliente] = useState<CustomerData>(initialCustomer);
  const [pagamento, setPagamento] = useState<"mercadopago" | "whatsapp">("mercadopago");
  const [loading, setLoading] = useState(false);

  const [pedidoConcluido, setPedidoConcluido] = useState(false);
  const [buscandoEndereco, setBuscandoEndereco] = useState(false);
  const [calculandoFrete, setCalculandoFrete] = useState(false);
  const [freteCalculado, setFreteCalculado] = useState(false);
  const [erroFrete, setErroFrete] = useState<string | null>(null);
  const [opcoesFrete, setOpcoesFrete] = useState<OpcaoFrete[]>([]);
  const [freteSelecionadoId, setFreteSelecionadoId] = useState<number | null>(null);
  const [freteIntegradoDisponivel, setFreteIntegradoDisponivel] = useState(true);

  const sub = subtotal();
  const freteOpcaoSelecionada = opcoesFrete.find((o) => o.id === freteSelecionadoId);
  const freteFallback = sub >= FRETE_GRATIS_ACIMA_DE ? 0 : FRETE_PADRAO;
  const frete = freteOpcaoSelecionada ? freteOpcaoSelecionada.preco : freteFallback;
  const total = sub + frete;

  const enderecoCompleto = ENDERECO_OBRIGATORIO.every((campo) => cliente[campo].trim() !== "");

  // "pedidoConcluido" evita que, ao limpar o carrinho logo após finalizar a
  // compra, esse guard capture o carrinho já vazio e redirecione de volta
  // pra "/carrinho" numa corrida com o navigate() pra tela de confirmação.
  if (items.length === 0 && !pedidoConcluido) return <Navigate to="/carrinho" replace />;

  function update<K extends keyof CustomerData>(key: K, value: CustomerData[K]) {
    setCliente((c) => ({ ...c, [key]: value }));
  }

  async function handleCepBlur() {
    const cepLimpo = cliente.cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    setBuscandoEndereco(true);
    // Busca o endereço ANTES de cotar o frete (não em paralelo): a cotação
    // precisa saber a cidade/estado resolvidos aqui para decidir se é
    // entrega local (própria cidade da loja, sem transportadora).
    const endereco = await buscarEnderecoPorCep(cepLimpo).finally(() => setBuscandoEndereco(false));
    const clienteAtualizado: CustomerData = endereco
      ? {
          ...cliente,
          estado: endereco.estado || cliente.estado,
          cidade: endereco.cidade || cliente.cidade,
          bairro: endereco.bairro || cliente.bairro,
          rua: endereco.rua || cliente.rua,
        }
      : cliente;
    if (endereco) setCliente(clienteAtualizado);

    setCalculandoFrete(true);
    setErroFrete(null);
    setOpcoesFrete([]);
    setFreteSelecionadoId(null);
    try {
      const resultado = await calcularFrete(cepLimpo, items, {
        cidade: clienteAtualizado.cidade,
        estado: clienteAtualizado.estado,
      });
      if (!resultado.configurado) {
        setFreteIntegradoDisponivel(false);
        return;
      }
      setFreteIntegradoDisponivel(true);
      if (resultado.opcoes.length === 0) {
        setErroFrete("Nenhuma transportadora atende esse CEP no momento. Usando frete padrão.");
        return;
      }
      setOpcoesFrete(resultado.opcoes);
      setFreteSelecionadoId(resultado.opcoes[0].id);
    } catch {
      setErroFrete("Não foi possível calcular o frete agora. Usando frete padrão.");
    } finally {
      setCalculandoFrete(false);
      setFreteCalculado(true);
    }
  }

  function handleContinuar(e: React.FormEvent) {
    e.preventDefault();
    setEtapa(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const order = await placeOrder(items, cliente, pagamento, {
        cepDestino: cliente.cep,
        freteOpcaoId: freteSelecionadoId,
      });
      setOrder(order);
      setPedidoConcluido(true);
      clear();
      navigate(order.orderNsu ? `/pedido-realizado?order_nsu=${order.orderNsu}` : "/pedido-realizado");
    } catch (err: any) {
      if (err?.numero) {
        // O pedido chegou a ser criado (com prazo pra expirar sozinho se
        // não for pago), só o Pix não foi gerado.
        alert(
          `Seu pedido #${err.numero} foi registrado, mas não conseguimos gerar o Pix agora. Entre em contato pelo WhatsApp informando o número do pedido para combinarmos o pagamento.`
        );
        navigate("/");
        return;
      }
      alert(
        err.message ??
          "Não foi possível concluir a compra. Verifique o estoque dos itens e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-12 md:px-10">
      <h1 className="mb-2 font-display text-3xl">Finalizar compra</h1>
      <div className="mb-8 flex items-center gap-2 text-sm text-charcoal/60">
        <span className={etapa === 1 ? "font-semibold text-charcoal" : ""}>1. Endereço e frete</span>
        <span>→</span>
        <span className={etapa === 2 ? "font-semibold text-charcoal" : ""}>2. Seus dados e pagamento</span>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
        {etapa === 1 ? (
          <form onSubmit={handleContinuar} className="flex flex-col gap-8">
            <div>
              <h2 className="mb-4 font-display text-xl">Endereço de entrega</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="CEP">
                  <div className="relative">
                    <input
                      required
                      value={cliente.cep}
                      onChange={(e) => update("cep", e.target.value)}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      className="input"
                    />
                    {(buscandoEndereco || calculandoFrete) && (
                      <FiLoader
                        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-charcoal/40"
                        size={16}
                      />
                    )}
                  </div>
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

            <button
              type="submit"
              disabled={!enderecoCompleto || calculandoFrete}
              className="w-full rounded-full bg-charcoal py-3.5 font-semibold text-white transition hover:bg-charcoal-800 disabled:opacity-40 sm:w-auto sm:self-start sm:px-10"
            >
              {calculandoFrete ? "Calculando frete..." : "Continuar"}
            </button>
          </form>
        ) : (
          <form id="checkout-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div>
              <button
                type="button"
                onClick={() => setEtapa(1)}
                className="mb-4 text-sm font-medium text-wood-700 hover:underline"
              >
                ← Voltar pro endereço
              </button>
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
                {pagamento === "mercadopago" && (
                  <Field label="CPF (necessário para gerar o Pix)">
                    <input
                      required
                      placeholder="000.000.000-00"
                      value={cliente.cpf}
                      onChange={(e) => update("cpf", e.target.value)}
                      className="input"
                    />
                  </Field>
                )}
              </div>
            </div>

            <div>
              <h2 className="mb-4 font-display text-xl">Forma de pagamento</h2>
              <div className="flex flex-col gap-3">
                <label
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                    pagamento === "mercadopago" ? "border-charcoal bg-wood-50" : "border-sand"
                  }`}
                >
                  <input
                    type="radio"
                    name="pagamento"
                    checked={pagamento === "mercadopago"}
                    onChange={() => setPagamento("mercadopago")}
                    className="h-4 w-4 accent-wood-700"
                  />
                  <p className="text-sm font-medium">Pagamento online (Pix)</p>
                </label>

                <label
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                    pagamento === "whatsapp" ? "border-charcoal bg-wood-50" : "border-sand"
                  }`}
                >
                  <input
                    type="radio"
                    name="pagamento"
                    checked={pagamento === "whatsapp"}
                    onChange={() => setPagamento("whatsapp")}
                    className="h-4 w-4 accent-wood-700"
                  />
                  <p className="text-sm font-medium">Pagamento pelo WhatsApp</p>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-charcoal py-3.5 font-semibold text-white transition hover:bg-charcoal-800 disabled:opacity-60 lg:hidden"
            >
              {loading ? "Processando..." : "Confirmar pedido"}
            </button>
          </form>
        )}

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

          {!freteCalculado ? (
            <div className="flex justify-between py-2 text-sm text-charcoal/70">
              <span>Frete</span>
              <span className="italic text-charcoal/50">A calcular</span>
            </div>
          ) : freteIntegradoDisponivel && opcoesFrete.length > 0 ? (
            <div className="flex flex-col gap-2 border-b border-sand py-3">
              <span className="text-sm text-charcoal/70">Frete</span>
              {opcoesFrete.map((o) => (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-2.5 text-sm ${
                    freteSelecionadoId === o.id ? "border-charcoal bg-wood-50" : "border-sand"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="opcaoFrete"
                      checked={freteSelecionadoId === o.id}
                      onChange={() => setFreteSelecionadoId(o.id)}
                      className="h-4 w-4 accent-wood-700"
                    />
                    <span>
                      {o.servico}
                      {o.prazoDias ? ` · ${o.prazoDias} dia(s) úteis` : ""}
                    </span>
                  </span>
                  <span className="font-medium">{o.preco === 0 ? "Grátis" : formatCurrency(o.preco)}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="flex justify-between py-2 text-sm text-charcoal/70">
              <span>Frete</span>
              <span>{frete === 0 ? "Grátis" : formatCurrency(frete)}</span>
            </div>
          )}

          {erroFrete && <p className="py-1 text-xs text-offer">{erroFrete}</p>}
          {!freteIntegradoDisponivel && (
            <p className="py-1 text-xs text-charcoal/50">
              Informe o CEP para calcular o frete exato do seu endereço.
            </p>
          )}

          <div className="flex justify-between border-t border-sand pt-3 text-lg font-semibold">
            <span>Total</span>
            <span>{freteCalculado ? formatCurrency(total) : `${formatCurrency(sub)} + frete`}</span>
          </div>

          {etapa === 1 ? (
            <p className="mt-5 text-center text-xs text-charcoal/50">
              Preencha o endereço e clique em "Continuar" para informar seus dados e pagar.
            </p>
          ) : (
            <button
              type="submit"
              form="checkout-form"
              disabled={loading}
              className="mt-5 hidden w-full rounded-full bg-charcoal py-3.5 font-semibold text-white transition hover:bg-charcoal-800 disabled:opacity-60 lg:block"
            >
              {loading ? "Processando..." : "Confirmar pedido"}
            </button>
          )}
        </div>
      </div>
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

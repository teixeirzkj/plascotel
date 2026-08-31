import { Link } from "react-router-dom";
import { FiMinus, FiPlus, FiTrash2 } from "react-icons/fi";
import { useCartStore } from "../store/cart";
import { formatCurrency } from "../lib/format";
import { descricaoVariante } from "../lib/productPricing";

const FRETE_GRATIS_ACIMA_DE = 1500;
const FRETE_PADRAO = 89.9;

export default function CartPage() {
  const { items, increment, decrement, removeItem, subtotal } = useCartStore();
  const sub = subtotal();
  const frete = items.length === 0 || sub >= FRETE_GRATIS_ACIMA_DE ? 0 : FRETE_PADRAO;
  const total = sub + frete;

  if (items.length === 0) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
        <h1 className="font-display text-3xl">Seu carrinho está vazio</h1>
        <p className="mt-2 text-charcoal/60">
          Que tal dar uma olhada nos nossos produtos?
        </p>
        <Link
          to="/moveis"
          className="mt-6 rounded-full bg-charcoal px-6 py-3 font-semibold text-white"
        >
          Ver produtos
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 md:px-10">
      <h1 className="mb-6 font-display text-2xl sm:mb-8 sm:text-3xl">Seu carrinho</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px] lg:gap-10">
        {/* Lista empilhada — usada no celular e tablet, sem rolagem horizontal */}
        <ul className="flex flex-col gap-3 sm:hidden">
          {items.map((item) => (
            <li
              key={`${item.productId}:${item.varianteId ?? ""}`}
              className="flex gap-3 rounded-xl bg-white p-3 shadow-card"
            >
              <img
                src={item.imagem}
                alt={item.nome}
                className="h-16 w-16 flex-none rounded-lg object-cover"
              />
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium leading-snug">
                    {item.nome}
                    {descricaoVariante(item.cor, item.tamanho) && (
                      <span className="block text-xs font-normal text-charcoal/50">
                        {descricaoVariante(item.cor, item.tamanho)}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => removeItem(item.productId, item.varianteId)}
                    className="flex-none text-charcoal/40 hover:text-offer"
                    aria-label="Remover"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
                <span className="text-xs text-charcoal/50">
                  {formatCurrency(item.precoUnitario)} un.
                </span>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-sand">
                    <button
                      onClick={() => decrement(item.productId, item.varianteId)}
                      className="p-1.5 hover:bg-wood-100"
                      aria-label="Diminuir"
                    >
                      <FiMinus size={12} />
                    </button>
                    <span className="w-5 text-center text-xs">
                      {item.quantidade}
                    </span>
                    <button
                      onClick={() => increment(item.productId, item.varianteId)}
                      disabled={item.quantidade >= item.estoqueDisponivel}
                      className="p-1.5 hover:bg-wood-100 disabled:opacity-30"
                      aria-label="Aumentar"
                    >
                      <FiPlus size={12} />
                    </button>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatCurrency(item.precoUnitario * item.quantidade)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Tabela — a partir do tablet */}
        <div className="hidden sm:block">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-sand text-sm text-charcoal/50">
                <th className="pb-3 font-medium">Produto</th>
                <th className="pb-3 font-medium">Quantidade</th>
                <th className="pb-3 font-medium">Preço</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.productId}:${item.varianteId ?? ""}`} className="border-b border-sand/60">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.imagem}
                        alt={item.nome}
                        className="h-14 w-14 rounded-xl object-cover lg:h-16 lg:w-16"
                      />
                      <span className="text-sm font-medium lg:text-base">
                        {item.nome}
                        {item.cor && (
                          <span className="block text-xs font-normal text-charcoal/50">
                            Cor: {item.cor}
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex w-fit items-center rounded-full border border-sand">
                      <button
                        onClick={() => decrement(item.productId, item.varianteId)}
                        className="p-2 hover:bg-wood-100"
                        aria-label="Diminuir"
                      >
                        <FiMinus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm">
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() => increment(item.productId, item.varianteId)}
                        disabled={item.quantidade >= item.estoqueDisponivel}
                        className="p-2 hover:bg-wood-100 disabled:opacity-30"
                        aria-label="Aumentar"
                      >
                        <FiPlus size={13} />
                      </button>
                    </div>
                  </td>
                  <td className="py-4 text-sm lg:text-base">
                    {formatCurrency(item.precoUnitario)}
                  </td>
                  <td className="py-4 text-sm font-medium lg:text-base">
                    {formatCurrency(item.precoUnitario * item.quantidade)}
                  </td>
                  <td className="py-4">
                    <button
                      onClick={() => removeItem(item.productId, item.varianteId)}
                      className="text-charcoal/40 hover:text-offer"
                      aria-label="Remover"
                    >
                      <FiTrash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="h-fit rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <h2 className="mb-3 font-display text-lg sm:mb-4 sm:text-xl">Resumo</h2>
          <div className="flex justify-between py-1.5 text-sm text-charcoal/70">
            <span>Subtotal</span>
            <span>{formatCurrency(sub)}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm text-charcoal/70">
            <span>Frete</span>
            <span>{frete === 0 ? "Grátis" : formatCurrency(frete)}</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-sand pt-3 text-base font-semibold sm:text-lg">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <Link
            to="/checkout"
            className="mt-5 block w-full rounded-full bg-charcoal py-3 text-center text-sm font-semibold text-white transition hover:bg-charcoal-800 sm:py-3.5 sm:text-base"
          >
            Finalizar compra
          </Link>
        </div>
      </div>
    </section>
  );
}

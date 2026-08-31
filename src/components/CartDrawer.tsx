import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FiX, FiPlus, FiMinus, FiTrash2 } from "react-icons/fi";
import { useCartStore } from "../store/cart";
import { formatCurrency } from "../lib/format";

export function CartDrawer() {
  const { isOpen, close, items, increment, decrement, removeItem, subtotal } =
    useCartStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[80] bg-ink/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.aside
            className="ml-auto flex h-full w-full max-w-md flex-col bg-cream shadow-soft"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-sand p-5">
              <h2 className="font-display text-xl">Seu carrinho</h2>
              <button
                onClick={close}
                aria-label="Fechar carrinho"
                className="rounded-full p-2 hover:bg-wood-100"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-charcoal/60">
                  <p>Seu carrinho está vazio.</p>
                  <Link
                    to="/moveis"
                    onClick={close}
                    className="mt-4 rounded-full bg-charcoal px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Ver móveis
                  </Link>
                </div>
              ) : (
                <ul className="flex flex-col gap-4">
                  {items.map((item) => (
                    <li key={item.productId} className="flex gap-3">
                      <img
                        src={item.imagem}
                        alt={item.nome}
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium leading-snug">
                            {item.nome}
                          </p>
                          <button
                            onClick={() => removeItem(item.productId)}
                            aria-label="Remover item"
                            className="text-charcoal/40 hover:text-offer"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                        <p className="text-sm text-charcoal/60">
                          {formatCurrency(item.precoUnitario)}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex items-center rounded-full border border-sand">
                            <button
                              onClick={() => decrement(item.productId)}
                              aria-label="Diminuir quantidade"
                              className="p-1.5 hover:bg-wood-100"
                            >
                              <FiMinus size={14} />
                            </button>
                            <span className="w-6 text-center text-sm">
                              {item.quantidade}
                            </span>
                            <button
                              onClick={() => increment(item.productId)}
                              aria-label="Aumentar quantidade"
                              disabled={item.quantidade >= item.estoqueDisponivel}
                              className="p-1.5 hover:bg-wood-100 disabled:opacity-30"
                            >
                              <FiPlus size={14} />
                            </button>
                          </div>
                          <span className="ml-auto font-medium">
                            {formatCurrency(item.precoUnitario * item.quantidade)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-sand p-5">
                <div className="mb-4 flex items-center justify-between text-lg">
                  <span className="text-charcoal/70">Subtotal</span>
                  <span className="font-display font-semibold">
                    {formatCurrency(subtotal())}
                  </span>
                </div>
                <Link
                  to="/carrinho"
                  onClick={close}
                  className="mb-2 block w-full rounded-full border border-charcoal py-3 text-center text-sm font-semibold text-charcoal transition hover:bg-wood-100"
                >
                  Ver carrinho
                </Link>
                <Link
                  to="/checkout"
                  onClick={close}
                  className="block w-full rounded-full bg-charcoal py-3 text-center text-sm font-semibold text-white transition hover:bg-charcoal-800"
                >
                  Finalizar compra
                </Link>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiSearch, FiX } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useCatalogStore } from "../store/catalog";
import { formatCurrency } from "../lib/format";
import { precoExibicao, imagemPrincipal } from "../lib/productPricing";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const products = useCatalogStore((s) => s.products);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products
      .filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          p.descricaoCurta.toLowerCase().includes(q) ||
          p.categoriaId.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, products]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] bg-ink/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="mx-auto mt-24 w-[92%] max-w-2xl rounded-2xl bg-cream p-4 shadow-soft md:p-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-sand pb-3">
              <FiSearch size={20} className="text-charcoal/60" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite o nome do móvel..."
                className="w-full bg-transparent text-lg outline-none placeholder:text-charcoal/40"
              />
              <button onClick={onClose} aria-label="Fechar busca">
                <FiX size={20} />
              </button>
            </div>
            <div className="mt-3 max-h-96 overflow-y-auto">
              {query.trim() && results.length === 0 && (
                <p className="py-6 text-center text-sm text-charcoal/60">
                  Nenhum móvel encontrado para "{query}".
                </p>
              )}
              {results.map((p) => (
                <Link
                  key={p.id}
                  to={`/produto/${p.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-4 rounded-xl p-2 transition hover:bg-wood-100"
                >
                  <img
                    src={imagemPrincipal(p)}
                    alt={p.nome}
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                  <div className="flex-1 text-left">
                    <p className="font-medium">{p.nome}</p>
                    <p className="text-sm text-charcoal/60">
                      {formatCurrency(precoExibicao(p))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

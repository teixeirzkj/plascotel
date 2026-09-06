import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiFilter, FiX } from "react-icons/fi";
import type { Product } from "../types";
import { useCatalogStore } from "../store/catalog";
import { ProductCard } from "../components/ProductCard";
import { FiltersPanel, defaultFilters, applyFilters, type Filters } from "../components/FiltersPanel";

const ITENS_POR_PAGINA = 12;

interface ProductsPageProps {
  title?: string;
  subtitle?: string;
  baseFilter?: (p: Product[]) => Product[];
  hideCategoryFilter?: boolean;
}

export default function ProductsPage({
  title = "Nossos produtos",
  subtitle = "Encontre o produto perfeito para cada ambiente da sua casa.",
  baseFilter,
  hideCategoryFilter,
}: ProductsPageProps) {
  const products = useCatalogStore((s) => s.products);
  const categories = useCatalogStore((s) => s.categories);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [visiveis, setVisiveis] = useState(ITENS_POR_PAGINA);

  const base = useMemo(
    () => (baseFilter ? baseFilter(products) : products),
    [baseFilter, products]
  );
  const filtered = useMemo(() => applyFilters(base, filters), [base, filters]);

  // Volta pra primeira "página" sempre que o filtro mudar, senão o usuário
  // pode ficar vendo um recorte de uma lista que já não bate mais com o
  // filtro escolhido.
  useEffect(() => {
    setVisiveis(ITENS_POR_PAGINA);
  }, [filters, baseFilter]);

  const visiveisAgora = filtered.slice(0, visiveis);
  const temMais = filtered.length > visiveis;

  return (
    <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl">{title}</h1>
        <p className="mt-2 text-charcoal/60">{subtitle}</p>
      </div>

      {!hideCategoryFilter && categories.length > 0 && (
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setFilters({ ...filters, categoriaId: null })}
            className={`flex-none rounded-full border px-4 py-2 text-sm font-medium transition ${
              filters.categoriaId === null
                ? "border-charcoal bg-charcoal text-white"
                : "border-sand hover:bg-wood-100"
            }`}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilters({ ...filters, categoriaId: c.id })}
              className={`flex-none rounded-full border px-4 py-2 text-sm font-medium transition ${
                filters.categoriaId === c.id
                  ? "border-charcoal bg-charcoal text-white"
                  : "border-sand hover:bg-wood-100"
              }`}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setMobileFiltersOpen(true)}
        className="mb-6 flex items-center gap-2 rounded-full border border-sand px-4 py-2.5 text-sm font-semibold lg:hidden"
      >
        <FiFilter /> Filtros
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <FiltersPanel filters={filters} onChange={setFilters} hideCategoryFilter={hideCategoryFilter} />
        </aside>

        <div>
          {filtered.length === 0 ? (
            <p className="py-16 text-center text-charcoal/60">
              Nenhum produto encontrado com esses filtros.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-charcoal/50">
                {filtered.length} produto(s)
              </p>
              <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-3">
                {visiveisAgora.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {temMais && (
                <div className="mt-10 flex justify-center">
                  <button
                    onClick={() => setVisiveis((v) => v + ITENS_POR_PAGINA)}
                    className="rounded-full border border-charcoal px-8 py-3 font-semibold text-charcoal transition hover:bg-charcoal hover:text-white"
                  >
                    Carregar mais
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {mobileFiltersOpen && (
          <motion.div
            className="fixed inset-0 z-[80] bg-ink/40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileFiltersOpen(false)}
          >
            <motion.div
              className="ml-auto flex h-full w-4/5 max-w-sm flex-col overflow-y-auto bg-cream p-6"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-display text-xl">Filtros</h2>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="rounded-full p-2 hover:bg-wood-100"
                >
                  <FiX size={20} />
                </button>
              </div>
              <FiltersPanel filters={filters} onChange={setFilters} hideCategoryFilter={hideCategoryFilter} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

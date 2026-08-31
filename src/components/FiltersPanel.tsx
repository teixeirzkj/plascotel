import type { Product } from "../types";
import { useCatalogStore } from "../store/catalog";

export interface Filters {
  categoriaId: string | null;
  precoMax: number | null;
  soDisponiveis: boolean;
  soOfertas: boolean;
  ordenar: "relevancia" | "menor-preco" | "maior-preco" | "recentes" | "mais-vendidos";
}

export const defaultFilters: Filters = {
  categoriaId: null,
  precoMax: null,
  soDisponiveis: false,
  soOfertas: false,
  ordenar: "relevancia",
};

interface FiltersPanelProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  hideCategoryFilter?: boolean;
}

const faixasPreco = [
  { label: "Até R$ 500", value: 500 },
  { label: "Até R$ 1.000", value: 1000 },
  { label: "Até R$ 2.000", value: 2000 },
  { label: "Até R$ 5.000", value: 5000 },
];

export function FiltersPanel({ filters, onChange, hideCategoryFilter }: FiltersPanelProps) {
  const categories = useCatalogStore((s) => s.categories);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-3 font-display text-lg">Ordenar por</h3>
        <select
          value={filters.ordenar}
          onChange={(e) =>
            onChange({ ...filters, ordenar: e.target.value as Filters["ordenar"] })
          }
          className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-sm"
        >
          <option value="relevancia">Relevância</option>
          <option value="menor-preco">Menor preço</option>
          <option value="maior-preco">Maior preço</option>
          <option value="recentes">Mais recentes</option>
          <option value="mais-vendidos">Mais vendidos</option>
        </select>
      </div>

      {!hideCategoryFilter && (
        <div>
          <h3 className="mb-3 font-display text-lg">Categoria</h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onChange({ ...filters, categoriaId: null })}
              className={`rounded-lg px-3 py-2 text-left text-sm ${
                filters.categoriaId === null
                  ? "bg-charcoal text-white"
                  : "hover:bg-wood-100"
              }`}
            >
              Todas
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => onChange({ ...filters, categoriaId: c.id })}
                className={`rounded-lg px-3 py-2 text-left text-sm ${
                  filters.categoriaId === c.id
                    ? "bg-charcoal text-white"
                    : "hover:bg-wood-100"
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 font-display text-lg">Faixa de preço</h3>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onChange({ ...filters, precoMax: null })}
            className={`rounded-lg px-3 py-2 text-left text-sm ${
              filters.precoMax === null
                ? "bg-charcoal text-white"
                : "hover:bg-wood-100"
            }`}
          >
            Qualquer preço
          </button>
          {faixasPreco.map((f) => (
            <button
              key={f.value}
              onClick={() => onChange({ ...filters, precoMax: f.value })}
              className={`rounded-lg px-3 py-2 text-left text-sm ${
                filters.precoMax === f.value
                  ? "bg-charcoal text-white"
                  : "hover:bg-wood-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.soDisponiveis}
            onChange={(e) =>
              onChange({ ...filters, soDisponiveis: e.target.checked })
            }
            className="h-4 w-4 accent-wood-700"
          />
          Somente disponíveis
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.soOfertas}
            onChange={(e) =>
              onChange({ ...filters, soOfertas: e.target.checked })
            }
            className="h-4 w-4 accent-wood-700"
          />
          Somente ofertas
        </label>
      </div>

      <button
        onClick={() => onChange(defaultFilters)}
        className="rounded-full border border-sand py-2.5 text-sm font-semibold hover:bg-wood-100"
      >
        Limpar filtros
      </button>
    </div>
  );
}

export function applyFilters(produtos: Product[], filters: Filters) {
  let result = [...produtos];
  if (filters.categoriaId) {
    result = result.filter((p) => p.categoriaId === filters.categoriaId);
  }
  if (filters.precoMax) {
    result = result.filter(
      (p) => (p.precoPromocional ?? p.preco) <= filters.precoMax!
    );
  }
  if (filters.soDisponiveis) {
    result = result.filter((p) => p.estoque > 0);
  }
  if (filters.soOfertas) {
    result = result.filter((p) => p.oferta);
  }
  switch (filters.ordenar) {
    case "menor-preco":
      result.sort(
        (a, b) => (a.precoPromocional ?? a.preco) - (b.precoPromocional ?? b.preco)
      );
      break;
    case "maior-preco":
      result.sort(
        (a, b) => (b.precoPromocional ?? b.preco) - (a.precoPromocional ?? a.preco)
      );
      break;
    case "recentes":
      result = result.filter((p) => p.novo).concat(result.filter((p) => !p.novo));
      break;
    case "mais-vendidos":
      result = result
        .filter((p) => p.maisVendido)
        .concat(result.filter((p) => !p.maisVendido));
      break;
  }
  return result;
}

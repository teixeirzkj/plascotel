import { create } from "zustand";
import type { Category, Product } from "../types";
import { fetchCategories, fetchProducts } from "../data/repository";
import { products as localProducts } from "../data/products";
import { categories as localCategories } from "../data/categories";

interface CatalogState {
  products: Product[];
  categories: Category[];
  loading: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Catálogo em memória usado pela loja inteira. Começa com os dados de
 * exemplo (para a primeira renderização já mostrar algo), e assim que o
 * Supabase responde, troca automaticamente pelos dados reais — sem
 * recarregar a página e sem nenhuma tela precisar saber de onde veio o
 * dado. Cadastrar um produto no /admin e voltar para a loja (ou dar
 * refresh) já mostra o produto novo.
 */
export const useCatalogStore = create<CatalogState>((set, get) => ({
  products: localProducts,
  categories: localCategories,
  loading: false,
  loaded: false,
  load: async () => {
    if (get().loaded || get().loading) return;
    await get().refresh();
  },
  refresh: async () => {
    set({ loading: true });
    const [products, categories] = await Promise.all([
      fetchProducts(),
      fetchCategories(),
    ]);
    set({ products, categories, loading: false, loaded: true });
  },
}));

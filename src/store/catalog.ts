import { create } from "zustand";
import type { Category, Product } from "../types";
import { fetchCategories, fetchProducts } from "../data/repository";
import { products as localProducts } from "../data/products";
import { categories as localCategories } from "../data/categories";
import { isSupabaseConfigured } from "../lib/supabase";

interface CatalogState {
  products: Product[];
  categories: Category[];
  loading: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Catálogo em memória usado pela loja inteira. Com o Supabase configurado,
 * começa vazio e só mostra produto depois que os dados reais chegarem —
 * assim as fotos de exemplo (sofá, mesa etc.) nunca aparecem piscando na
 * tela antes do catálogo de verdade carregar. Os dados de exemplo só
 * servem para rodar o site sem Supabase configurado (modo demonstração).
 */
export const useCatalogStore = create<CatalogState>((set, get) => ({
  products: isSupabaseConfigured ? [] : localProducts,
  categories: isSupabaseConfigured ? [] : localCategories,
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

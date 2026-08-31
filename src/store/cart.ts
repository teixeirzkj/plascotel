import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product, ProductVariant } from "../types";
import { imagensDaVariante } from "../lib/productPricing";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  addItem: (product: Product, quantidade?: number, variante?: ProductVariant | null) => void;
  removeItem: (productId: string, varianteId?: string | null) => void;
  increment: (productId: string, varianteId?: string | null) => void;
  decrement: (productId: string, varianteId?: string | null) => void;
  clear: () => void;
  subtotal: () => number;
  totalItems: () => number;
}

function mesmoItem(
  item: CartItem,
  productId: string,
  varianteId: string | null | undefined
) {
  return item.productId === productId && (item.varianteId ?? null) === (varianteId ?? null);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      addItem: (product, quantidade = 1, variante = null) => {
        const preco = variante
          ? variante.precoPromocional ?? variante.preco
          : product.precoPromocional ?? product.preco;
        const estoqueDisponivel = variante ? variante.estoque : product.estoque;
        const varianteId = variante?.id ?? null;

        set((state) => {
          const existing = state.items.find((i) => mesmoItem(i, product.id, varianteId));
          if (existing) {
            const novaQtd = Math.min(existing.quantidade + quantidade, estoqueDisponivel);
            return {
              items: state.items.map((i) =>
                mesmoItem(i, product.id, varianteId) ? { ...i, quantidade: novaQtd } : i
              ),
              isOpen: true,
            };
          }
          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                varianteId,
                cor: variante?.cor || null,
                tamanho: variante?.tamanho || null,
                nome: product.nome,
                imagem: imagensDaVariante(product, variante)[0] ?? "",
                precoUnitario: preco,
                quantidade: Math.min(quantidade, estoqueDisponivel),
                estoqueDisponivel,
                peso: product.peso,
                altura: product.altura,
                largura: product.largura,
                comprimento: product.comprimento,
              },
            ],
            isOpen: true,
          };
        });
      },
      removeItem: (productId, varianteId = null) =>
        set((state) => ({
          items: state.items.filter((i) => !mesmoItem(i, productId, varianteId)),
        })),
      increment: (productId, varianteId = null) =>
        set((state) => ({
          items: state.items.map((i) =>
            mesmoItem(i, productId, varianteId)
              ? { ...i, quantidade: Math.min(i.quantidade + 1, i.estoqueDisponivel) }
              : i
          ),
        })),
      decrement: (productId, varianteId = null) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              mesmoItem(i, productId, varianteId) ? { ...i, quantidade: i.quantidade - 1 } : i
            )
            .filter((i) => i.quantidade > 0),
        })),
      clear: () => set({ items: [] }),
      subtotal: () =>
        get().items.reduce(
          (acc, i) => acc + i.precoUnitario * i.quantidade,
          0
        ),
      totalItems: () =>
        get().items.reduce((acc, i) => acc + i.quantidade, 0),
    }),
    { name: "plascotel-cart" }
  )
);

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "../types";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  addItem: (product: Product, quantidade?: number) => void;
  removeItem: (productId: string) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  clear: () => void;
  subtotal: () => number;
  totalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      addItem: (product, quantidade = 1) => {
        const preco = product.precoPromocional ?? product.preco;
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === product.id
          );
          if (existing) {
            const novaQtd = Math.min(
              existing.quantidade + quantidade,
              product.estoque
            );
            return {
              items: state.items.map((i) =>
                i.productId === product.id ? { ...i, quantidade: novaQtd } : i
              ),
              isOpen: true,
            };
          }
          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                nome: product.nome,
                imagem: product.imagens[0] ?? "",
                precoUnitario: preco,
                quantidade: Math.min(quantidade, product.estoque),
                estoqueDisponivel: product.estoque,
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
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      increment: (productId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? {
                  ...i,
                  quantidade: Math.min(
                    i.quantidade + 1,
                    i.estoqueDisponivel
                  ),
                }
              : i
          ),
        })),
      decrement: (productId) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.productId === productId
                ? { ...i, quantidade: i.quantidade - 1 }
                : i
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

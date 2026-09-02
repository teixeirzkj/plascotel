import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Order } from "../types";

interface LastOrderState {
  order: Order | null;
  setOrder: (order: Order) => void;
}

/**
 * Precisa ficar salvo (não só em memória) porque o pagamento pela
 * InfinitePay leva o cliente pra fora do site — quando ele volta pelo
 * redirect_url, é uma página nova carregando do zero, e sem persistir
 * esse pedido a tela de confirmação ficaria vazia.
 */
export const useLastOrderStore = create<LastOrderState>()(
  persist(
    (set) => ({
      order: null,
      setOrder: (order) => set({ order }),
    }),
    { name: "plascotel-last-order" }
  )
);

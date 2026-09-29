import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Order } from "../types";

interface LastOrderState {
  order: Order | null;
  setOrder: (order: Order) => void;
}

/**
 * Precisa ficar salvo (não só em memória) porque o cliente pode fechar/
 * recarregar a aba de "pedido realizado" (ex: pra abrir o app do banco e
 * escanear o QR code do Pix) — sem persistir esse pedido, a tela de
 * confirmação ficaria vazia ao voltar.
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

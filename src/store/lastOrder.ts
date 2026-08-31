import { create } from "zustand";
import type { Order } from "../types";

interface LastOrderState {
  order: Order | null;
  setOrder: (order: Order) => void;
}

export const useLastOrderStore = create<LastOrderState>((set) => ({
  order: null,
  setOrder: (order) => set({ order }),
}));

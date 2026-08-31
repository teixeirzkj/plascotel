import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthState {
  session: Session | null;
  loading: boolean;
  init: () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  init: () => {
    if (!supabase) {
      set({ loading: false });
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, loading: false });
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
    });
  },
  signIn: async (email, password) => {
    if (!supabase) {
      return "Supabase ainda não foi configurado. Veja o arquivo .env.example.";
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error ? error.message : null;
  },
  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  },
}));

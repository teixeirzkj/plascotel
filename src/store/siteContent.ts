import { create } from "zustand";
import { fetchConteudoSite, conteudoPadrao, type ConteudoSite } from "../data/siteContent";

interface SiteContentState {
  conteudo: ConteudoSite;
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Conteúdo editável do site (banner, "sobre", rodapé). Começa com os valores
 * padrão (mesmo texto que já existia fixo no código) e troca pelo que o
 * admin salvou assim que a busca no Supabase terminar — ver
 * src/data/siteContent.ts.
 */
export const useSiteContentStore = create<SiteContentState>((set, get) => ({
  conteudo: conteudoPadrao,
  loaded: false,
  loading: false,
  load: async () => {
    if (get().loaded || get().loading) return;
    await get().refresh();
  },
  refresh: async () => {
    set({ loading: true });
    const conteudo = await fetchConteudoSite();
    set({ conteudo, loading: false, loaded: true });
  },
}));

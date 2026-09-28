import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { heroSlides as heroSlidesPadrao, type HeroSlide } from "./heroSlides";

/**
 * Conteúdo do site que o admin pode editar em "Seções" (banner, "sobre",
 * rodapé) sem mexer em código. Enquanto uma chave não tiver sido salva no
 * banco, o site usa os valores padrão definidos aqui — o mesmo texto/imagens
 * que já existiam fixos antes dessa tela existir.
 */
export interface ConteudoSobre {
  titulo: string;
  texto: string;
}

export interface ConteudoFooter {
  descricao: string;
}

export interface ConteudoSite {
  heroSlides: HeroSlide[];
  sobre: ConteudoSobre;
  footer: ConteudoFooter;
}

export const sobrePadrao: ConteudoSobre = {
  titulo: "A Plascotel é feita de casa e histórias",
  texto:
    "Nascemos com o propósito de levar tudo o que uma casa precisa — cama, mesa e banho, pratos, perfumaria e decoração e muito mais — com qualidade, design moderno e atendimento próximo para cada cliente. Selecionamos cada peça pensando em conforto, durabilidade e estilo, para que sua casa reflita quem você é.",
};

export const footerPadrao: ConteudoFooter = {
  descricao:
    "Cama, mesa, banho, pratos e decoração que unem design, conforto e qualidade para transformar a sua casa.",
};

export const conteudoPadrao: ConteudoSite = {
  heroSlides: heroSlidesPadrao,
  sobre: sobrePadrao,
  footer: footerPadrao,
};

export async function fetchConteudoSite(): Promise<ConteudoSite> {
  if (!isSupabaseConfigured || !supabase) return conteudoPadrao;

  const { data, error } = await supabase.from("conteudo_site").select("chave, valor");
  if (error || !data || data.length === 0) return conteudoPadrao;

  const porChave = Object.fromEntries(data.map((r) => [r.chave, r.valor])) as Record<string, unknown>;

  return {
    heroSlides: (porChave.hero_slides as HeroSlide[] | undefined) ?? conteudoPadrao.heroSlides,
    sobre: (porChave.sobre as ConteudoSobre | undefined) ?? conteudoPadrao.sobre,
    footer: (porChave.footer as ConteudoFooter | undefined) ?? conteudoPadrao.footer,
  };
}

export interface HeroSlide {
  id: string;
  imagem: string;
  badge: string;
  titulo: string;
  descricao: string;
  ctaPrimarioLabel: string;
  ctaPrimarioTo: string;
  ctaSecundarioLabel: string;
  ctaSecundarioTo: string;
}

/**
 * Slides do carrossel principal (topo da Home). São imagens de ambiente
 * (vitrine), não vinculadas a um produto específico — por isso os botões
 * levam para a coleção/categorias, e não para a página de um móvel.
 * Para trocar as imagens, basta substituir os arquivos em public/hero/.
 */
export const heroSlides: HeroSlide[] = [
  {
    id: "mesa",
    imagem: "/hero/mesa.webp",
    badge: "Mesa posta",
    titulo: "Da sala à mesa de jantar",
    descricao: "Pratos, talheres, taças e toalhas de mesa para receber com elegância.",
    ctaPrimarioLabel: "Ver coleção",
    ctaPrimarioTo: "/moveis",
    ctaSecundarioLabel: "Ver ofertas",
    ctaSecundarioTo: "/ofertas",
  },
  {
    id: "cama",
    imagem: "/hero/cama.webp",
    badge: "Cama, mesa e banho",
    titulo: "Quartos feitos para relaxar",
    descricao: "Jogos de cama, colchas e toalhas macias para transformar o seu descanso.",
    ctaPrimarioLabel: "Ver coleção",
    ctaPrimarioTo: "/moveis",
    ctaSecundarioLabel: "Ver categorias",
    ctaSecundarioTo: "/categorias",
  },
  {
    id: "geral",
    imagem: "/hero/geral.webp",
    badge: "Tudo para a sua casa em um só lugar",
    titulo: "Cama, mesa, banho e decoração",
    descricao: "Qualidade, design moderno e atendimento próximo para montar a casa do jeito que você imagina.",
    ctaPrimarioLabel: "Ver coleção",
    ctaPrimarioTo: "/moveis",
    ctaSecundarioLabel: "Ver categorias",
    ctaSecundarioTo: "/categorias",
  },
];

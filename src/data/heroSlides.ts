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
    id: "sala-madeira",
    imagem: "/hero/sala-madeira.webp",
    badge: "Tudo para a sua casa em um só lugar",
    titulo: "Da sala à mesa posta",
    descricao: "Móveis, colchas, toalhas, pratos e decoração para montar a casa do jeito que você imagina.",
    ctaPrimarioLabel: "Ver coleção",
    ctaPrimarioTo: "/moveis",
    ctaSecundarioLabel: "Ver categorias",
    ctaSecundarioTo: "/categorias",
  },
  {
    id: "quarto-planejado",
    imagem: "/hero/quarto-planejado.webp",
    badge: "Cama, mesa e banho",
    titulo: "Quartos feitos para relaxar",
    descricao: "Colchas, jogos de cama e toalhas macias para transformar seu descanso.",
    ctaPrimarioLabel: "Ver coleção",
    ctaPrimarioTo: "/moveis",
    ctaSecundarioLabel: "Ver ofertas",
    ctaSecundarioTo: "/ofertas",
  },
  {
    id: "sala-sofisticada",
    imagem: "/hero/sala-sofisticada.webp",
    badge: "Elegância em cada detalhe",
    titulo: "Sofisticação para todos os ambientes",
    descricao: "Do móvel à louça da mesa, produtos que trazem personalidade para sua casa.",
    ctaPrimarioLabel: "Ver coleção",
    ctaPrimarioTo: "/moveis",
    ctaSecundarioLabel: "Ver categorias",
    ctaSecundarioTo: "/categorias",
  },
  {
    id: "sala-integrada",
    imagem: "/hero/sala-integrada.webp",
    badge: "Ambientes que se conectam",
    titulo: "Espaços feitos para viver",
    descricao: "Do sofá aos pratos da mesa de jantar — tudo que sua casa precisa.",
    ctaPrimarioLabel: "Ver coleção",
    ctaPrimarioTo: "/moveis",
    ctaSecundarioLabel: "Ver ofertas",
    ctaSecundarioTo: "/ofertas",
  },
];

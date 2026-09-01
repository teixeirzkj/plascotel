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
    badge: "Conforto que transforma seus ambientes",
    titulo: "Salas com personalidade",
    descricao: "Madeira, textura e aconchego para o dia a dia da sua família.",
    ctaPrimarioLabel: "Ver coleção",
    ctaPrimarioTo: "/moveis",
    ctaSecundarioLabel: "Ver categorias",
    ctaSecundarioTo: "/categorias",
  },
  {
    id: "quarto-planejado",
    imagem: "/hero/quarto-planejado.webp",
    badge: "Descanso com estilo",
    titulo: "Quartos feitos para relaxar",
    descricao: "Design moderno e funcional para o seu momento de descanso.",
    ctaPrimarioLabel: "Ver coleção",
    ctaPrimarioTo: "/moveis",
    ctaSecundarioLabel: "Ver ofertas",
    ctaSecundarioTo: "/ofertas",
  },
  {
    id: "sala-sofisticada",
    imagem: "/hero/sala-sofisticada.webp",
    badge: "Elegância em tons escuros",
    titulo: "Sofisticação em cada detalhe",
    descricao: "Produtos modernos que trazem personalidade para sua casa.",
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
    descricao: "Praticidade e conforto do sofá à mesa de jantar.",
    ctaPrimarioLabel: "Ver coleção",
    ctaPrimarioTo: "/moveis",
    ctaSecundarioLabel: "Ver ofertas",
    ctaSecundarioTo: "/ofertas",
  },
];

export interface Category {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  imagem: string;
}

export interface Product {
  id: string;
  nome: string;
  slug: string;
  categoriaId: string;
  descricao: string;
  descricaoCurta: string;
  preco: number;
  precoPromocional: number | null;
  imagens: string[];
  cores: string[];
  dimensoes: string;
  material: string;
  estoque: number;
  destaque: boolean;
  oferta: boolean;
  novo: boolean;
  maisVendido: boolean;
  prazoEntrega: string;
  /** Peso em kg, para cálculo de frete. Se ausente, usa um valor padrão. */
  peso?: number;
  /** Dimensões em cm, para cálculo de frete. Se ausentes, usa um padrão. */
  altura?: number;
  largura?: number;
  comprimento?: number;
}

export interface CartItem {
  productId: string;
  nome: string;
  imagem: string;
  precoUnitario: number;
  quantidade: number;
  estoqueDisponivel: number;
  peso?: number;
  altura?: number;
  largura?: number;
  comprimento?: number;
}

export interface CustomerData {
  nomeCompleto: string;
  whatsapp: string;
  email: string;
  cep: string;
  estado: string;
  cidade: string;
  bairro: string;
  rua: string;
  numero: string;
  complemento: string;
}

export interface Order {
  id: string;
  numero: number;
  itens: CartItem[];
  subtotal: number;
  frete: number;
  total: number;
  formaPagamento: "infinitepay" | "whatsapp";
  cliente: CustomerData;
  criadoEm: string;
}

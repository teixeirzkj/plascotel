import ProductsPage from "./ProductsPage";

export default function OffersPage() {
  return (
    <ProductsPage
      title="Ofertas especiais"
      subtitle="Aproveite os melhores preços em produtos selecionados."
      baseFilter={(produtos) => produtos.filter((p) => p.oferta)}
    />
  );
}

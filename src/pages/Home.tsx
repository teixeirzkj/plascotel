import { HeroCarousel } from "../components/HeroCarousel";
import { Benefits } from "../components/Benefits";
import { WhyChooseUs } from "../components/WhyChooseUs";
import { InstagramSection } from "../components/InstagramSection";
import ProductsPage from "./ProductsPage";

export default function Home() {
  return (
    <>
      <HeroCarousel />

      {/* No celular, essa seção vai para o final da página (antes do
          rodapé), para ir direto do banner para os produtos. */}
      <div className="hidden md:block">
        <Benefits />
      </div>

      <ProductsPage
        title="Todos os produtos"
        subtitle="Cama, mesa e banho, pratos, perfumaria e decoração e muito mais para a sua casa."
      />

      <WhyChooseUs />
      <InstagramSection />

      <div className="md:hidden">
        <Benefits />
      </div>
    </>
  );
}

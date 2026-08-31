import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { HeroCarousel } from "../components/HeroCarousel";
import { CategoriesToggle } from "../components/CategoriesToggle";
import { ProductCard } from "../components/ProductCard";
import { Benefits } from "../components/Benefits";
import { WhyChooseUs } from "../components/WhyChooseUs";
import { InstagramSection } from "../components/InstagramSection";
import { useCatalogStore } from "../store/catalog";
import { temPromocaoExibicao } from "../lib/productPricing";

export default function Home() {
  const products = useCatalogStore((s) => s.products);
  const emDestaque = products.filter((p) => p.destaque);
  // Se nenhum produto foi marcado como "destaque" ainda, mostra os mais
  // recentes para a seção nunca ficar vazia.
  const destaques = emDestaque.length > 0 ? emDestaque : products.slice(0, 8);
  const ofertas = products.filter((p) => p.oferta && temPromocaoExibicao(p));

  return (
    <>
      <HeroCarousel />

      {/* No celular, essa seção vai para o final da página (antes do
          rodapé), para ir direto de categorias para os móveis. */}
      <div className="hidden md:block">
        <Benefits />
      </div>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 text-center"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-wood-500">
            Categorias
          </span>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl md:text-4xl">
            Encontre o móvel ideal para seu espaço
          </h2>
        </motion.div>
        <CategoriesToggle />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 flex items-end justify-between"
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-wood-500">
              Coleção
            </span>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl md:text-4xl">
              Nossos móveis
            </h2>
          </div>
          <Link
            to="/moveis"
            className="hidden text-sm font-semibold text-wood-700 hover:underline md:inline"
          >
            Ver todos
          </Link>
        </motion.div>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {destaques.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {ofertas.length > 0 && (
        <section className="bg-wood-50 py-16">
          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8 flex items-end justify-between"
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-offer">
                  Imperdível
                </span>
                <h2 className="mt-2 font-display text-2xl sm:text-3xl md:text-4xl">
                  Ofertas especiais
                </h2>
              </div>
              <Link
                to="/ofertas"
                className="hidden text-sm font-semibold text-wood-700 hover:underline md:inline"
              >
                Ver todas as ofertas
              </Link>
            </motion.div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {ofertas.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <div className="mt-8 text-center md:hidden">
              <Link
                to="/ofertas"
                className="inline-block rounded-full bg-charcoal px-6 py-3 text-sm font-semibold text-white"
              >
                Ver todas as ofertas
              </Link>
            </div>
          </div>
        </section>
      )}

      <WhyChooseUs />
      <InstagramSection />

      <div className="md:hidden">
        <Benefits />
      </div>
    </>
  );
}

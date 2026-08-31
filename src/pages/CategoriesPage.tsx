import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowRight } from "react-icons/fi";
import { useCatalogStore } from "../store/catalog";

export default function CategoriesPage() {
  const categories = useCatalogStore((s) => s.categories);
  return (
    <section className="mx-auto max-w-4xl px-6 py-12 md:px-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl">Categorias</h1>
        <p className="mt-2 text-charcoal/60">
          Selecione uma categoria para ver os produtos disponíveis.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {categories.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
          >
            <Link
              to={`/categorias/${c.slug}`}
              className="group flex items-center gap-2 rounded-full border border-sand bg-white px-5 py-3 font-medium text-charcoal shadow-card transition hover:border-charcoal hover:bg-charcoal hover:text-white"
            >
              {c.nome}
              <FiArrowRight
                size={15}
                className="transition group-hover:translate-x-0.5"
              />
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiArrowRight, FiChevronDown } from "react-icons/fi";
import { useCatalogStore } from "../store/catalog";

export function CategoriesToggle() {
  const categories = useCatalogStore((s) => s.categories);
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 rounded-full bg-charcoal px-7 py-3.5 font-semibold text-white transition hover:bg-charcoal-800"
        >
          Ver categorias
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <FiChevronDown size={18} />
          </motion.span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap justify-center gap-3 pt-6">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/categorias/${c.slug}`}
                  className="group flex items-center gap-2 rounded-full border border-sand bg-white px-5 py-3 font-medium text-charcoal shadow-card transition hover:border-charcoal hover:bg-charcoal hover:text-white"
                >
                  {c.nome}
                  <FiArrowRight
                    size={15}
                    className="transition group-hover:translate-x-0.5"
                  />
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { motion } from "framer-motion";
import { FiInstagram } from "react-icons/fi";
import { INSTAGRAM_URL, STORE_NAME } from "../config/store";

export function InstagramSection() {
  if (!INSTAGRAM_URL) return null;
  return (
    <section className="bg-charcoal py-16 text-center text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-xl px-6"
      >
        <FiInstagram size={32} className="mx-auto mb-4 text-wood-300" />
        <h2 className="font-display text-2xl md:text-3xl">
          Acompanhe a {STORE_NAME}
        </h2>
        <p className="mt-3 text-white/70">
          Siga nosso Instagram e acompanhe lançamentos, dicas de decoração e
          ofertas exclusivas.
        </p>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-charcoal transition hover:bg-wood-100"
        >
          <FiInstagram /> Seguir no Instagram
        </a>
      </motion.div>
    </section>
  );
}

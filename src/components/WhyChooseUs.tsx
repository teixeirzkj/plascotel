import { motion } from "framer-motion";
import { FiCheck } from "react-icons/fi";
import { STORE_NAME } from "../config/store";

const pontos = [
  "Qualidade em cada detalhe, do material ao acabamento",
  "Variedade de estilos para todos os ambientes",
  "Atendimento próximo, direto pelo WhatsApp",
  "Compra segura, do carrinho ao pagamento",
];

export function WhyChooseUs() {
  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2 md:px-10 md:py-24">
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="overflow-hidden rounded-3xl"
      >
        <img
          src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=1200&auto=format&fit=crop"
          alt="Ambiente decorado com produtos Plascotel"
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-wood-500">
          Por que escolher a {STORE_NAME}?
        </span>
        <h2 className="mt-3 font-display text-3xl leading-tight md:text-4xl">
          Produtos que fazem parte da sua história
        </h2>
        <p className="mt-4 text-charcoal/70">
          Na {STORE_NAME}, acreditamos que os produtos da sua casa não são
          apenas objetos. Eles fazem parte dos momentos, histórias e
          experiências do seu dia a dia — por isso cuidamos de cada detalhe,
          do design ao pós-venda.
        </p>
        <ul className="mt-6 flex flex-col gap-3">
          {pontos.map((p) => (
            <li key={p} className="flex items-start gap-3 text-charcoal/80">
              <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-wood-700 text-white">
                <FiCheck size={12} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}

import { motion } from "framer-motion";
import { FiTruck, FiStar, FiCreditCard, FiMessageCircle } from "react-icons/fi";

const benefits = [
  {
    icon: FiTruck,
    title: "Entrega",
    text: "Entregamos seus produtos com segurança em todo o Brasil.",
  },
  {
    icon: FiStar,
    title: "Qualidade",
    text: "Móveis, cama, mesa, banho e decoração selecionados a dedo.",
  },
  {
    icon: FiCreditCard,
    title: "Pagamento",
    text: "Pagamento online de forma rápida e segura.",
  },
  {
    icon: FiMessageCircle,
    title: "Atendimento",
    text: "Atendimento personalizado direto pelo WhatsApp.",
  },
];

export function Benefits() {
  return (
    <section className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-6 py-16 md:grid-cols-4 md:px-10">
      {benefits.map((b, i) => (
        <motion.div
          key={b.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
          className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-card"
        >
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-wood-100 text-wood-700">
            <b.icon size={22} />
          </span>
          <h3 className="font-display text-lg">{b.title}</h3>
          <p className="mt-1 text-sm text-charcoal/60">{b.text}</p>
        </motion.div>
      ))}
    </section>
  );
}

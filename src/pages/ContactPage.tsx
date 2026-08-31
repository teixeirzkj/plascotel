import { FiInstagram, FiMail, FiClock, FiMapPin } from "react-icons/fi";
import { WhatsAppButton } from "../components/WhatsAppButton";
import {
  INSTAGRAM_URL,
  STORE_ADDRESS,
  STORE_EMAIL,
  STORE_HOURS,
  STORE_NAME,
} from "../config/store";

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 text-center md:px-10">
      <span className="text-xs font-semibold uppercase tracking-widest text-wood-500">
        Contato
      </span>
      <h1 className="mt-2 font-display text-2xl sm:text-3xl md:text-4xl">
        Fale com a {STORE_NAME}
      </h1>
      <p className="mt-4 text-charcoal/70">
        Estamos prontos para te ajudar a encontrar o produto ideal. Fale
        conosco pelo WhatsApp ou confira nossos outros canais.
      </p>

      <div className="mt-8 flex justify-center">
        <WhatsAppButton message={`Olá! Vim pelo site da ${STORE_NAME} e gostaria de saber mais.`} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 text-left shadow-card sm:grid-cols-2">
        {STORE_EMAIL && (
          <div className="flex items-center gap-3">
            <FiMail className="text-wood-700" />
            <span>{STORE_EMAIL}</span>
          </div>
        )}
        {STORE_HOURS && (
          <div className="flex items-center gap-3">
            <FiClock className="text-wood-700" />
            <span>{STORE_HOURS}</span>
          </div>
        )}
        {STORE_ADDRESS && (
          <div className="flex items-center gap-3 sm:col-span-2">
            <FiMapPin className="text-wood-700" />
            <span>{STORE_ADDRESS}</span>
          </div>
        )}
        {INSTAGRAM_URL && (
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 hover:text-wood-700"
          >
            <FiInstagram className="text-wood-700" />
            <span>Instagram</span>
          </a>
        )}
      </div>
    </section>
  );
}

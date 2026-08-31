import { Link } from "react-router-dom";
import { FiInstagram } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { Logo } from "./Logo";
import {
  buildWhatsAppLink,
  INSTAGRAM_URL,
  STORE_EMAIL,
  STORE_HOURS,
  STORE_NAME,
  WHATSAPP_NUMBER,
} from "../config/store";

export function Footer() {
  return (
    <footer className="bg-charcoal text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-8 sm:grid-cols-3 md:px-10 md:py-12 lg:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <Logo dark />
          <p className="mt-3 text-xs text-white/60 md:text-sm">
            Móveis modernos que unem design, conforto e qualidade para
            transformar a sua casa.
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm md:text-base">Atendimento</h4>
          <ul className="mt-2.5 flex flex-col gap-1.5 text-xs text-white/60 md:mt-4 md:gap-2 md:text-sm">
            {WHATSAPP_NUMBER && (
              <li>
                <a
                  href={buildWhatsAppLink(`Olá! Vim pelo site da ${STORE_NAME}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  WhatsApp
                </a>
              </li>
            )}
            {STORE_EMAIL && <li>{STORE_EMAIL}</li>}
            {STORE_HOURS && <li>{STORE_HOURS}</li>}
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm md:text-base">Redes sociais</h4>
          <div className="mt-2.5 flex gap-2 md:mt-4 md:gap-3">
            {INSTAGRAM_URL && (
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 md:h-10 md:w-10"
              >
                <FiInstagram size={16} />
              </a>
            )}
            {WHATSAPP_NUMBER && (
              <a
                href={buildWhatsAppLink(`Olá! Vim pelo site da ${STORE_NAME}.`)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 md:h-10 md:w-10"
              >
                <FaWhatsapp size={16} />
              </a>
            )}
          </div>
          <h4 className="mt-4 font-display text-sm md:mt-6 md:text-base">
            Institucional
          </h4>
          <ul className="mt-2.5 flex flex-col gap-1.5 text-xs text-white/60 md:mt-4 md:gap-2 md:text-sm">
            <li><Link to="/politica-privacidade" className="hover:text-white">Privacidade</Link></li>
            <li><Link to="/termos-de-uso" className="hover:text-white">Termos de uso</Link></li>
            <li><Link to="/politica-de-troca" className="hover:text-white">Trocas</Link></li>
            <li><Link to="/politica-de-entrega" className="hover:text-white">Entrega</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-[11px] text-white/40 md:text-xs">
        © {new Date().getFullYear()} {STORE_NAME}. Todos os direitos reservados.
      </div>
    </footer>
  );
}

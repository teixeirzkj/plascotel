import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiMenu,
  FiX,
  FiSearch,
  FiShoppingBag,
  FiInstagram,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { Logo } from "./Logo";
import { useCartStore } from "../store/cart";
import { buildWhatsAppLink, INSTAGRAM_URL, STORE_NAME, WHATSAPP_NUMBER } from "../config/store";
import { SearchOverlay } from "./SearchOverlay";

const navLinks = [
  { to: "/", label: "Início" },
  { to: "/moveis", label: "Produtos" },
  { to: "/categorias", label: "Categorias" },
  { to: "/ofertas", label: "Ofertas" },
  { to: "/sobre", label: "Sobre nós" },
  { to: "/contato", label: "Contato" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const totalItems = useCartStore((s) => s.totalItems());
  const openCart = useCartStore((s) => s.open);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-cream/90 shadow-soft backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <Logo />

          <nav className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `text-sm font-medium tracking-wide transition hover:text-wood-700 ${
                    isActive ? "text-wood-700" : "text-charcoal/80"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              aria-label="Pesquisar"
              onClick={() => setSearchOpen(true)}
              className="rounded-full p-2 text-charcoal transition hover:bg-wood-100"
            >
              <FiSearch size={20} />
            </button>
            {INSTAGRAM_URL && (
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="hidden rounded-full p-2 text-charcoal transition hover:bg-wood-100 md:inline-flex"
              >
                <FiInstagram size={20} />
              </a>
            )}
            {WHATSAPP_NUMBER && (
              <a
                href={buildWhatsAppLink(`Olá! Vim pelo site da ${STORE_NAME}.`)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="hidden rounded-full p-2 text-[#25D366] transition hover:bg-wood-100 md:inline-flex"
              >
                <FaWhatsapp size={20} />
              </a>
            )}
            <button
              aria-label="Abrir carrinho"
              onClick={openCart}
              className="relative rounded-full p-2 text-charcoal transition hover:bg-wood-100"
            >
              <FiShoppingBag size={20} />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-wood-700 text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </button>
            <button
              aria-label="Abrir menu"
              onClick={() => setMenuOpen(true)}
              className="rounded-full p-2 text-charcoal transition hover:bg-wood-100 lg:hidden"
            >
              <FiMenu size={22} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-[60] bg-ink/40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              className="ml-auto flex h-full w-4/5 max-w-sm flex-col gap-1 bg-cream p-6"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <Logo />
                <button
                  aria-label="Fechar menu"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-full p-2 hover:bg-wood-100"
                >
                  <FiX size={22} />
                </button>
              </div>
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <NavLink
                    to={link.to}
                    end={link.to === "/"}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-xl px-3 py-3 text-lg font-medium ${
                        isActive
                          ? "bg-wood-100 text-wood-700"
                          : "text-charcoal"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </motion.div>
              ))}
              <div className="mt-6 flex gap-3 border-t border-sand pt-6">
                {WHATSAPP_NUMBER && (
                  <a
                    href={buildWhatsAppLink(`Olá! Vim pelo site da ${STORE_NAME}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 font-semibold text-white"
                  >
                    <FaWhatsapp /> WhatsApp
                  </a>
                )}
                {INSTAGRAM_URL && (
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-full border border-wood-500 py-3 font-semibold text-wood-700"
                  >
                    <FiInstagram /> Instagram
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

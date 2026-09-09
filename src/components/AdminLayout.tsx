import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiGrid,
  FiBox,
  FiTag,
  FiShoppingCart,
  FiPlusCircle,
  FiLogOut,
  FiExternalLink,
  FiMenu,
  FiX,
  FiBell,
} from "react-icons/fi";
import { useAuthStore } from "../store/auth";
import { STORE_NAME } from "../config/store";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../lib/format";

/** Bipe curto gerado na hora — sem precisar de um arquivo de áudio. */
function tocarAlerta() {
  try {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Navegador sem suporte a Web Audio, ou bloqueado antes de qualquer
    // interação do usuário — não é crítico, só não toca o som.
  }
}

interface NovoPedidoToast {
  id: string;
  numero: number;
  total: number;
}

const links = [
  { to: "/admin", label: "Dashboard", icon: FiGrid, end: true },
  { to: "/admin/produtos", label: "Produtos", icon: FiBox },
  { to: "/admin/categorias", label: "Categorias", icon: FiTag },
  { to: "/admin/pedidos", label: "Pedidos", icon: FiShoppingCart },
  { to: "/admin/venda-manual", label: "Venda manual", icon: FiPlusCircle },
];

export function AdminLayout() {
  const { signOut, session } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [naoVistos, setNaoVistos] = useState(0);
  const [toasts, setToasts] = useState<NovoPedidoToast[]>([]);
  const primeiraCargaFeita = useRef(false);

  // Escuta pedidos novos em tempo real (qualquer página do admin) e avisa
  // com som + toast + contador na aba "Pedidos" — sem precisar dar refresh.
  useEffect(() => {
    if (!supabase) return;
    const canal = supabase
      .channel("admin-pedidos-novos")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pedidos" },
        (payload) => {
          // Ignora o instante da inscrição (evita disparar pra pedidos que
          // já existiam antes de abrir o admin).
          if (!primeiraCargaFeita.current) return;
          const p = payload.new as { id: string; numero: number; total: number };
          setNaoVistos((n) => n + 1);
          setToasts((t) => [...t, { id: p.id, numero: p.numero, total: Number(p.total) }]);
          tocarAlerta();
          setTimeout(() => {
            setToasts((t) => t.filter((x) => x.id !== p.id));
          }, 8000);
        }
      )
      .subscribe();
    primeiraCargaFeita.current = true;

    return () => {
      supabase!.removeChannel(canal);
    };
  }, []);

  useEffect(() => {
    if (location.pathname === "/admin/pedidos") setNaoVistos(0);
  }, [location.pathname]);

  async function handleSignOut() {
    await signOut();
    navigate("/admin/login");
  }

  const sidebarContent = (
    <>
      <div className="mb-8">
        <p className="font-display text-lg">{STORE_NAME}</p>
        <p className="text-xs text-charcoal/50">Painel administrativo</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                isActive
                  ? "bg-wood-100 text-wood-700"
                  : "text-charcoal/70 hover:bg-wood-100"
              }`
            }
          >
            <l.icon size={18} /> {l.label}
            {l.to === "/admin/pedidos" && naoVistos > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-offer px-1 text-[11px] font-bold text-white">
                {naoVistos}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-charcoal/70 hover:bg-wood-100"
      >
        <FiExternalLink size={18} /> Ver loja
      </a>
      <div className="border-t border-sand pt-3">
        <p className="mb-2 truncate px-3 text-xs text-charcoal/50">
          {session?.user.email}
        </p>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-offer hover:bg-offer/10"
        >
          <FiLogOut size={18} /> Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-cream md:flex">
      {/* Barra superior — só no celular/tablet */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-sand bg-white px-4 py-3 md:hidden">
        <div>
          <p className="font-display text-base leading-none">{STORE_NAME}</p>
          <p className="text-[11px] text-charcoal/50">Admin</p>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
          className="rounded-full p-2 hover:bg-wood-100"
        >
          <FiMenu size={22} />
        </button>
      </header>

      {/* Menu lateral — fixo no desktop */}
      <aside className="hidden w-64 flex-none flex-col border-r border-sand bg-white p-5 md:flex">
        {sidebarContent}
      </aside>

      {/* Menu lateral — gaveta deslizante no celular/tablet */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-ink/40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              className="flex h-full w-4/5 max-w-xs flex-col bg-white p-5"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Fechar menu"
                className="mb-4 ml-auto rounded-full p-2 hover:bg-wood-100"
              >
                <FiX size={20} />
              </button>
              {sidebarContent}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main
        key={location.pathname}
        className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 md:overflow-y-auto md:p-10"
      >
        <Outlet />
      </main>

      {/* Aviso de pedido novo em tempo real */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.button
              key={t.id}
              type="button"
              onClick={() => navigate("/admin/pedidos")}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-charcoal px-4 py-3 text-left text-white shadow-soft"
            >
              <FiBell size={18} className="flex-none text-gold" />
              <div>
                <p className="text-sm font-semibold">Novo pedido #{t.numero}!</p>
                <p className="text-xs text-white/70">{formatCurrency(t.total)}</p>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

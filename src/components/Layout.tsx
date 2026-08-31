import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { WhatsAppFloatButton } from "./WhatsAppFloatButton";
import { useCatalogStore } from "../store/catalog";

export function Layout() {
  const location = useLocation();

  useEffect(() => {
    useCatalogStore.getState().load();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="flex-1 pt-[76px]"
      >
        <Outlet />
      </motion.main>
      <Footer />
      <CartDrawer />
      <WhatsAppFloatButton />
    </div>
  );
}

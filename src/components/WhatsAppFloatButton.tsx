import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { buildWhatsAppLink, STORE_NAME, WHATSAPP_NUMBER } from "../config/store";

export function WhatsAppFloatButton() {
  if (!WHATSAPP_NUMBER) return null;
  return (
    <motion.a
      href={buildWhatsAppLink(
        `Olá! Vim pelo site da ${STORE_NAME} e gostaria de saber mais sobre os móveis.`
      )}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 15 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(37,211,102,0.5)] md:bottom-8 md:right-8"
    >
      <FaWhatsapp size={28} />
    </motion.a>
  );
}

import { FaWhatsapp } from "react-icons/fa";
import { buildWhatsAppLink, WHATSAPP_NUMBER } from "../config/store";

interface WhatsAppButtonProps {
  message: string;
  className?: string;
  children?: React.ReactNode;
}

export function WhatsAppButton({
  message,
  className = "",
  children,
}: WhatsAppButtonProps) {
  if (!WHATSAPP_NUMBER) return null;
  return (
    <a
      href={buildWhatsAppLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ||
        "inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 font-semibold text-white shadow-soft transition hover:brightness-95"
      }
    >
      <FaWhatsapp size={20} />
      {children ?? "Falar no WhatsApp"}
    </a>
  );
}

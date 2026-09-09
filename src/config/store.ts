/**
 * Configuração central da loja.
 * Todos os valores vêm de variáveis de ambiente (.env) para que possam ser
 * trocados sem mexer no código-fonte. Veja .env.example.
 */
export const STORE_NAME = import.meta.env.VITE_STORE_NAME || "Plascotel";

export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "";

export const INSTAGRAM_URL = import.meta.env.VITE_INSTAGRAM_URL || "";

export const STORE_EMAIL = import.meta.env.VITE_STORE_EMAIL || "";
export const STORE_ADDRESS = import.meta.env.VITE_STORE_ADDRESS || "";
export const STORE_HOURS = import.meta.env.VITE_STORE_HOURS || "";

export function buildWhatsAppLink(message: string, number = WHATSAPP_NUMBER) {
  const digits = number.replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${text}`;
}

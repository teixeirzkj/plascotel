/**
 * Configuração central da loja.
 * Todos os valores vêm de variáveis de ambiente (.env) para que possam ser
 * trocados sem mexer no código-fonte. Veja .env.example.
 */
export const STORE_NAME = import.meta.env.VITE_STORE_NAME || "Plascotel";

// Número oficial da Plascotel, fixado no código (74 99904-0209). Tem
// precedência sobre a variável VITE_WHATSAPP_NUMBER da Vercel (que estava no
// número antigo). Para voltar a controlar por variável, troque de volta para
// `import.meta.env.VITE_WHATSAPP_NUMBER || ""` e ajuste a variável na Vercel.
export const WHATSAPP_NUMBER = "5574999040209";

export const INSTAGRAM_URL = import.meta.env.VITE_INSTAGRAM_URL || "";

export const STORE_EMAIL = import.meta.env.VITE_STORE_EMAIL || "";
export const STORE_ADDRESS = import.meta.env.VITE_STORE_ADDRESS || "";
export const STORE_HOURS = import.meta.env.VITE_STORE_HOURS || "";

export function buildWhatsAppLink(message: string, number = WHATSAPP_NUMBER) {
  const digits = number.replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${text}`;
}

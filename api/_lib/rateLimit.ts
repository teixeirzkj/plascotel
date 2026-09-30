import type { VercelRequest } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

/**
 * Rate limit simples baseado em Postgres (tabela rate_limit_hits, ver
 * supabase/schema.sql) — evita depender de um serviço externo (Redis) só
 * pra isso. Cada chamada grava uma "tentativa" e conta quantas aconteceram
 * na janela de tempo; se passar do limite, recusa.
 *
 * Propositalmente self-contained (não importa de outro arquivo em
 * api/_lib): a Vercel tem um bug de bundling conhecido quando um arquivo
 * dentro de api/_lib importa outro arquivo dentro de api/_lib.
 */

function supabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase não configurado no servidor.");
  return createClient(url, key);
}

/** IP do cliente por trás do proxy da Vercel — usado como parte da chave do rate limit. */
export function obterIpCliente(req: VercelRequest): string {
  const encaminhado = req.headers["x-forwarded-for"];
  const primeiro = Array.isArray(encaminhado) ? encaminhado[0] : encaminhado;
  const ip = primeiro?.split(",")[0]?.trim();
  return ip || req.socket.remoteAddress || "desconhecido";
}

/**
 * Verifica e já registra uma tentativa para `chave`. Retorna true (permite)
 * ou false (bloqueia) — em caso de falha ao consultar o banco, permite por
 * padrão (é um controle de abuso, não a barreira de segurança principal;
 * melhor deixar o cliente comprar do que derrubar o checkout por um erro
 * de infraestrutura nessa checagem).
 */
export async function permitirRequisicao(
  chave: string,
  limite: number,
  janelaSegundos: number
): Promise<boolean> {
  try {
    const db = supabaseAdmin();
    const { data, error } = await db.rpc("registrar_rate_limit", {
      p_chave: chave,
      p_limite: limite,
      p_janela_segundos: janelaSegundos,
    });
    if (error) {
      console.error("rateLimit: falha ao verificar, permitindo por padrão", error.message);
      return true;
    }
    return data === true;
  } catch (err) {
    console.error("rateLimit: erro inesperado, permitindo por padrão", err);
    return true;
  }
}

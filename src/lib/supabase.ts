import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Cliente Supabase. Se as variáveis de ambiente não estiverem configuradas
 * (ainda não conectamos o banco), `supabase` fica null e o site continua
 * funcionando com os dados de exemplo em src/data, para que o
 * desenvolvimento não fique bloqueado esperando o banco.
 */
export const supabase =
  url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = Boolean(supabase);

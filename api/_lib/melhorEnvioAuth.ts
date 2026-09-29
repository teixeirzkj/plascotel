import { createClient } from "@supabase/supabase-js";

/**
 * A API do Melhor Envio usa OAuth2 (não uma chave fixa): o token de acesso
 * expira em ~30 dias e precisa ser renovado com um refresh_token. Guardamos
 * os dois na tabela `integracoes_tokens` (acesso só por service_role) e
 * renovamos sozinhos quando estiver perto de vencer — ver
 * api/melhor-envio-callback.ts para como o par inicial é obtido.
 *
 * O endpoint exato de troca de código/refresh não veio explícito na
 * documentação pública deles; a URL de autorização segue o padrão do
 * Laravel Passport (confirmado: /oauth/authorize com response_type=code),
 * então usamos aqui a mesma convenção padrão do Passport para /oauth/token.
 * Se o formato real for diferente, o log abaixo mostra a resposta crua pra
 * ajustar depois de um teste real.
 */

const TOKEN_ENDPOINT = "https://melhorenvio.com.br/oauth/token";
const RENOVAR_SE_FALTAR_MENOS_DE_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  [key: string]: unknown;
}

function supabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase não configurado no servidor.");
  return createClient(url, key);
}

function redirectUri() {
  const siteUrl = (process.env.SITE_URL || "").replace(/\/$/, "");
  return `${siteUrl}/api/melhor-envio-callback`;
}

async function salvarTokens(dados: TokenResponse) {
  const db = supabaseAdmin();
  const expiraEm = new Date(Date.now() + dados.expires_in * 1000).toISOString();
  const { error } = await db.from("integracoes_tokens").upsert({
    servico: "melhor_envio",
    access_token: dados.access_token,
    refresh_token: dados.refresh_token,
    expira_em: expiraEm,
    atualizado_em: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Chamado uma vez pelo callback, logo depois do admin autorizar o app. */
export async function trocarCodigoPorToken(code: string): Promise<void> {
  const clientId = process.env.MELHOR_ENVIO_CLIENT_ID;
  const clientSecret = process.env.MELHOR_ENVIO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("MELHOR_ENVIO_CLIENT_ID/MELHOR_ENVIO_CLIENT_SECRET não configurados.");
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(),
      code,
    }),
  });

  const texto = await response.text();
  console.log("melhor-envio: resposta da troca de código", response.status, texto);

  if (!response.ok) {
    throw new Error(`Troca de código pelo token falhou (${response.status}): ${texto}`);
  }

  const dados = JSON.parse(texto) as TokenResponse;
  if (!dados.access_token || !dados.refresh_token) {
    throw new Error("Resposta do Melhor Envio sem access_token/refresh_token — ver log acima.");
  }
  await salvarTokens(dados);
}

/**
 * Devolve um access_token pronto pra usar, renovando sozinho com o
 * refresh_token quando faltar pouco pra vencer. Retorna null se a conexão
 * com o Melhor Envio ainda não foi autorizada nenhuma vez.
 */
export async function obterTokenValido(): Promise<string | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("integracoes_tokens")
    .select("access_token, refresh_token, expira_em")
    .eq("servico", "melhor_envio")
    .maybeSingle();

  if (error || !data) return null;

  const faltamMenosDe3Dias = new Date(data.expira_em).getTime() - Date.now() < RENOVAR_SE_FALTAR_MENOS_DE_MS;
  if (!faltamMenosDe3Dias) return data.access_token;

  try {
    const clientId = process.env.MELHOR_ENVIO_CLIENT_ID;
    const clientSecret = process.env.MELHOR_ENVIO_CLIENT_SECRET;
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: data.refresh_token,
      }),
    });
    if (!response.ok) {
      console.error("melhor-envio: falha ao renovar token", response.status, await response.text());
      return data.access_token; // usa o atual até ele realmente vencer
    }
    const novosDados = (await response.json()) as TokenResponse;
    await salvarTokens(novosDados);
    return novosDados.access_token;
  } catch (err) {
    console.error("melhor-envio: erro ao renovar token", err);
    return data.access_token;
  }
}

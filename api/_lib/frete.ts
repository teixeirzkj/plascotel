import { createClient } from "@supabase/supabase-js";

/**
 * Cotação de frete via Melhor Envio — lógica compartilhada entre api/frete.ts
 * (usado pelo checkout só para EXIBIR opções ao cliente), api/criar-pagamento.ts
 * (que cota de novo, no servidor, para decidir o valor realmente cobrado —
 * nunca confia no preço que o navegador mandou) e api/melhor-envio-callback.ts
 * (troca o código OAuth pelo primeiro token).
 *
 * IMPORTANTE: toda a lógica de autenticação do Melhor Envio (OAuth2) fica
 * NESTE arquivo de propósito, em vez de em um módulo `_lib` separado — a
 * Vercel tem uma falha de bundling conhecida quando um arquivo dentro de
 * `api/_lib` importa OUTRO arquivo dentro de `api/_lib` (import
 * "_lib → _lib"), que quebra a função inteira em produção com
 * "Cannot find module". Só funciona de forma confiável o padrão
 * "api/*.ts → um único arquivo em _lib" — por isso tudo relacionado a
 * frete + OAuth do Melhor Envio mora junto aqui.
 *
 * A API do Melhor Envio usa OAuth2 (não uma chave fixa) — o token é obtido
 * uma vez em api/melhor-envio-callback.ts (depois de autorizar o app deles)
 * e renovado sozinho a partir daí.
 *
 * Configure no .env / nas variáveis de ambiente da Vercel:
 *   MELHOR_ENVIO_CLIENT_ID     — Área Dev > seu aplicativo, no painel deles
 *   MELHOR_ENVIO_CLIENT_SECRET — idem
 *   MELHOR_ENVIO_CEP_ORIGEM    — CEP de onde os pedidos são enviados
 */

export interface ItemFrete {
  peso?: number;
  altura?: number;
  largura?: number;
  comprimento?: number;
  quantidade: number;
  valor?: number;
}

export interface OpcaoFrete {
  id: number;
  servico: string;
  preco: number;
  prazoDias: number | null;
}

interface MelhorEnvioOption {
  id: number;
  name: string;
  price: string;
  delivery_time?: number;
  company?: { name: string };
  error?: string;
}

export const PESO_PADRAO_KG = 10;
export const ALTURA_PADRAO_CM = 40;
export const LARGURA_PADRAO_CM = 40;
export const COMPRIMENTO_PADRAO_CM = 40;

export const FRETE_GRATIS_ACIMA_DE = 1500;
export const FRETE_PADRAO = 89.9;

export function limparCep(cep: string) {
  return (cep || "").replace(/\D/g, "");
}

export function fretePadraoPara(subtotal: number) {
  return subtotal >= FRETE_GRATIS_ACIMA_DE ? 0 : FRETE_PADRAO;
}

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Entrega dentro da própria cidade da loja não usa transportadora (é
 * combinada por fora) — por isso nunca cobra o frete calculado pelo Melhor
 * Envio, que cobraria como se fosse despachar pelos Correios/parceiros.
 */
function ehEntregaLocal(cidadeDestino?: string, estadoDestino?: string) {
  const cidadeLoja = process.env.LOJA_CIDADE_ORIGEM;
  const estadoLoja = process.env.LOJA_ESTADO_ORIGEM;
  if (!cidadeLoja || !estadoLoja || !cidadeDestino || !estadoDestino) return false;
  return (
    normalizar(cidadeDestino) === normalizar(cidadeLoja) &&
    normalizar(estadoDestino) === normalizar(estadoLoja)
  );
}

// ---------------------------------------------------------------------------
// OAuth2 do Melhor Envio (access_token/refresh_token guardados no Supabase)
// ---------------------------------------------------------------------------

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

/** Chamado uma vez por api/melhor-envio-callback.ts, logo após o admin autorizar o app. */
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
async function obterTokenValido(): Promise<string | null> {
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

// ---------------------------------------------------------------------------
// Cotação de frete
// ---------------------------------------------------------------------------

/**
 * Retorna as opções de frete do Melhor Envio, ou `configurado: false` se a
 * conexão OAuth ainda não foi autorizada (ver api/melhor-envio-callback.ts)
 * ou o CEP de origem não estiver definido.
 */
export async function cotarFrete(
  cepDestino: string,
  itens: ItemFrete[],
  destino?: { cidade?: string; estado?: string }
): Promise<{ configurado: boolean; opcoes: OpcaoFrete[] }> {
  if (ehEntregaLocal(destino?.cidade, destino?.estado)) {
    return {
      configurado: true,
      opcoes: [{ id: 0, servico: "Entrega local (combinada)", preco: 0, prazoDias: null }],
    };
  }

  const cepOrigem = limparCep(process.env.MELHOR_ENVIO_CEP_ORIGEM ?? "");
  if (!cepOrigem) {
    return { configurado: false, opcoes: [] };
  }

  const token = await obterTokenValido();
  if (!token) {
    return { configurado: false, opcoes: [] };
  }

  const cepLimpo = limparCep(cepDestino);
  if (cepLimpo.length !== 8 || itens.length === 0) {
    return { configurado: true, opcoes: [] };
  }

  const baseUrl = "https://melhorenvio.com.br";

  const products = itens.map((item, index) => ({
    id: String(index + 1),
    width: item.largura || LARGURA_PADRAO_CM,
    height: item.altura || ALTURA_PADRAO_CM,
    length: item.comprimento || COMPRIMENTO_PADRAO_CM,
    weight: item.peso || PESO_PADRAO_KG,
    insurance_value: item.valor ?? 0,
    quantity: item.quantidade,
  }));

  const response = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      // O Melhor Envio exige um User-Agent identificando a aplicação/contato.
      "User-Agent": "Plascotel (contato@plascotel.com.br)",
    },
    body: JSON.stringify({
      from: { postal_code: cepOrigem },
      to: { postal_code: cepLimpo },
      products,
    }),
  });

  if (!response.ok) {
    throw new Error("Não foi possível calcular o frete no momento.");
  }

  const data = (await response.json()) as MelhorEnvioOption[];

  const opcoes = (Array.isArray(data) ? data : [])
    .filter((o) => !o.error && o.price)
    .map((o) => ({
      id: o.id,
      servico: o.company?.name ? `${o.company.name} - ${o.name}` : o.name,
      preco: Number(o.price),
      prazoDias: o.delivery_time ?? null,
    }))
    .sort((a, b) => a.preco - b.preco);

  return { configurado: true, opcoes };
}

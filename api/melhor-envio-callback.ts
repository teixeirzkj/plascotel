import type { VercelRequest, VercelResponse } from "@vercel/node";
import { trocarCodigoPorToken } from "./_lib/frete";

/**
 * URL de redirecionamento cadastrada no aplicativo do Melhor Envio (Área
 * Dev). Depois que o admin autoriza o app uma única vez, o Melhor Envio
 * chama esta URL com ?code=..., que é trocado pelo access_token/
 * refresh_token e guardado no banco — daí em diante o cálculo de frete
 * funciona sozinho, renovando o token automaticamente (ver
 * api/_lib/melhorEnvioAuth.ts).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const erro = typeof req.query.error === "string" ? req.query.error : null;

  function pagina(titulo: string, corpo: string) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${titulo}</title></head>` +
        `<body style="font-family: system-ui, sans-serif; text-align: center; padding: 60px 20px;">` +
        `<h1>${titulo}</h1><p>${corpo}</p></body></html>`
    );
  }

  if (erro) {
    res.status(400);
    pagina("Autorização cancelada", "Você recusou ou cancelou a autorização no Melhor Envio. Pode tentar de novo quando quiser.");
    return;
  }
  if (!code) {
    res.status(400);
    pagina("Código não recebido", "O Melhor Envio não mandou o código de autorização. Tente gerar o link de autorização de novo.");
    return;
  }

  try {
    await trocarCodigoPorToken(code);
    res.status(200);
    pagina("Melhor Envio conectado! ✅", "Pode fechar esta aba e voltar pro site — o frete automático já está ativo.");
  } catch (err) {
    console.error("melhor-envio-callback:", err);
    res.status(500);
    pagina("Erro ao conectar", "Alguma coisa deu errado ao trocar o código pelo token. Veja os logs da função na Vercel (Deployments → Logs) pra mais detalhes.");
  }
}

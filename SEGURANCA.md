# Segurança — Plascotel

Registro da revisão de segurança e do teste de invasão feitos em
**2026-11-08**, com o que foi testado, o que foi encontrado, o que já foi
corrigido no código e o que ainda precisa ser feito no painel (Supabase /
Vercel). Site auditado: `https://plascotel.vercel.app`.

> Teste autorizado pelo dono do projeto, feito com a chave pública (anon) —
> a mesma que qualquer visitante teria — e de forma **não destrutiva**
> (nenhum dado foi alterado ou apagado; confirmado comparando os 214
> produtos com o backup antes/depois).

## Resumo

A base já era sólida: preço decidido no servidor, RLS ligado em todas as
tabelas, webhook de pagamento verificado (segredo + reconferência no Mercado
Pago + HMAC opcional), rate limit nas funções públicas, cron protegido por
segredo, bucket de imagens com limite de tipo e tamanho e escrita só de
admin, cabeçalhos de segurança na Vercel. Dos 13 ataques simulados, **10
foram bloqueados corretamente** e 2 eram falso-positivo do próprio teste
(o banco negou certo, só com outro código HTTP). **1 achado é real e grave.**

## Achado crítico — cadastro aberto + "qualquer autenticado é admin"

- **O que era:** o Supabase Auth estava com cadastro público ligado
  (`disable_signup=false`) e as regras de acesso tratavam *qualquer usuário
  autenticado* como administrador (`auth.role() = 'authenticated'`).
  Juntos: qualquer pessoa podia se registrar com um e-mail próprio,
  confirmar e entrar em `/admin` com poder total — editar preços e produtos,
  **ler todos os pedidos com os dados dos clientes (nome, CPF, endereço,
  e-mail, telefone)**, apagar pedidos e editar o conteúdo do site.
- **Risco:** crítico (tomada de conta do admin + vazamento de dados
  pessoais / LGPD).
- **Situação hoje:** só existem 2 usuários, ambos de agosto/2026 (as contas
  de desenvolvimento). Nenhum cadastro malicioso tinha acontecido — a janela
  estava limpa.
- **Correção (2 partes):**
  1. **No painel (você):** Supabase → Authentication → Sign In / Providers →
     desligar **"Allow new users to sign up"**.
  2. **No banco (rodar `supabase/seguranca_admin.sql`):** admin deixa de ser
     "qualquer autenticado" e passa a ser só quem está na tabela `admins`
     (lista fechada). Mesmo que o cadastro seja reaberto um dia, conta nova
     não é admin. O script já coloca os 2 usuários atuais na lista, então
     ninguém fica trancado pra fora.

## O que já foi corrigido no código (neste commit)

- **`vercel.json`** — Content-Security-Policy completa (antes só
  `frame-ancestors`): trava de onde o site pode carregar script, estilo,
  imagem e para onde pode conectar (só Supabase, Google Fonts, ViaCEP),
  `object-src 'none'`, `base-uri`/`form-action 'self'`,
  `upgrade-insecure-requests`. Reduz muito o estrago de um eventual XSS.
- **Dependências** — `npm audit fix`: `zod` 4.6.5 → 4.6.7 (CVE de exaustão
  de memória validando listas grandes) e `dompurify` corrigido.
  **Produção: 0 vulnerabilidades.** (As que restam no `npm audit` são de
  ferramentas de build — vite/esbuild — e não vão para o site.)
- **`api/criar-pagamento.ts` e `api/frete.ts`** — teto de 100 itens por
  requisição, pra ninguém abusar com um payload gigante (defesa extra contra
  o CVE do zod e contra desperdício de cota do Melhor Envio / Mercado Pago).
- **`supabase/seguranca_admin.sql`** — migração nova (ver achado crítico):
  tabela `admins`, função `is_admin()` e todas as policies de admin e
  funções `security definer` passando a exigir `is_admin()`.

## Resultado dos testes de invasão (anon = atacante)

| # | Tentativa | Resultado |
|---|---|---|
| 1 | Ler `pedidos` / `pedido_itens` (dados de cliente) | ✅ 0 linhas (RLS) |
| 2 | Ler `integracoes_tokens` (tokens Melhor Envio) | ✅ 0 linhas (RLS, sem policy) |
| 3 | Ler `rate_limit_hits` | ✅ 0 linhas (RLS) |
| 4 | Ler catálogo `produtos` (deve funcionar) | ✅ público, ok |
| 5 | `INSERT` em `produtos` | ✅ bloqueado (RLS 401) |
| 6 | `UPDATE` de preço em `produtos` | ✅ 0 linhas alteradas (confirmado vs. backup) |
| 7 | `DELETE` em `produtos` | ✅ bloqueado (RLS) |
| 8 | RPC `criar_pedido_seguro` (pagamento) | ✅ negado (permissão) |
| 9 | RPC `confirmar_pagamento_pedido` | ✅ negado (permissão) |
| 10 | RPC `registrar_rate_limit` | ✅ negado (permissão) |
| 11 | RPC `criar_pedido` legado (aceitava preço) | ✅ negado (permissão) |
| 12 | RPC `admin_salvar_variantes` | ✅ "Não autorizado" (a função checa) |
| 13 | Cadastro público no Auth | ❌ **aberto** → ver achado crítico |

## Pendente fora do código (você faz no painel)

1. **Supabase → Authentication:** desligar "Allow new users to sign up".
2. **Supabase → SQL Editor:** rodar `supabase/seguranca_admin.sql` inteiro.
3. **Supabase → Authentication → opcional, recomendado:** ligar
   "Leaked password protection" e, se quiser, CAPTCHA no login.
4. **Vercel:** confirmar que as variáveis sensíveis (`SUPABASE_SERVICE_ROLE_KEY`,
   `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`,
   `MELHOR_ENVIO_CLIENT_SECRET`, `CRON_SECRET`) estão só como env var do
   servidor (sem prefixo `VITE_`) e que Preview Deployments têm proteção.
5. **Depois do deploy:** conferir a nota em securityheaders.com e testar uma
   compra de ponta a ponta (a CSP nova não deve quebrar nada; se quebrar,
   é só ajustar `connect-src`/`img-src`).

## Como re-testar depois de aplicar

Rodar de novo o probe `scratchpad/pentest.mjs` — o item 13 (cadastro) deve
passar a dar erro de cadastro desligado, e os demais continuam bloqueados.

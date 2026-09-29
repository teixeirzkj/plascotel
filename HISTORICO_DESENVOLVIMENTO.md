# Histórico de desenvolvimento — Plascotel

Registro de tudo que foi feito no projeto até agora, o porquê de cada decisão
e o que ainda falta. Serve como referência caso a conversa com a IA seja
perdida — qualquer pessoa (ou uma IA nova) deve conseguir entender o estado
do projeto lendo só este arquivo.

Ver também: [`README.md`](README.md) (como rodar o projeto do zero) e
[`MELHORIAS.md`](MELHORIAS.md) (lista de ideias de melhoria, feitas ou não).

---

## 1. Layout mobile (estilo Mercado Livre)

- Cards de produto no mobile viraram **linhas horizontais compactas**
  (imagem pequena à esquerda, nome/preço à direita), permitindo ver 3-4
  produtos na tela sem rolar muito. No desktop continuam em grade normal.
  Arquivos: `src/components/ProductCard.tsx`, `ProductCardSkeleton.tsx`.
- Adicionado **breadcrumb** (trilha "Início > Categoria > Produto") nas
  páginas de produto e categoria (`src/components/Breadcrumb.tsx`).
- Adicionados **skeletons** (placeholders animados) enquanto os dados
  carregam, em vez de tela em branco.
- Botão "Adicionar ao carrinho" fica **fixo na parte de baixo da tela**
  no mobile quando o botão original sai da vista (`ProductDetail.tsx`).
- Botões do checkout ficaram menores no mobile; opções de pagamento
  simplificadas para "Pagamento online" / "Pagamento pelo WhatsApp".

## 2. Painel admin "Seções" (conteúdo editável do site)

Banner (carrossel), texto de "Sobre nós" e texto do rodapé viraram
**editáveis pelo próprio admin**, sem precisar mexer em código:

- Tabela nova `conteudo_site` (chave/valor em jsonb) no Supabase.
- Página `/admin/secoes` (`src/pages/admin/AdminSecoes.tsx`) com upload de
  imagem do banner, edição de texto do "Sobre" e do rodapé.
- `HeroCarousel.tsx`, `AboutPage.tsx`, `Footer.tsx` agora leem esse
  conteúdo do banco (com fallback pro texto padrão se ainda não configurado).

## 3. Comprovante em PDF (não é nota fiscal)

- Botão no admin (`/admin/pedidos`) gera um **PDF simples do pedido**
  (`src/lib/pdfComprovante.ts`, usando a lib `jspdf`) pra mandar pro
  cliente pelo WhatsApp.
- **Importante**: esse PDF é só um resumo, tem um aviso bem visível de que
  **não é NF-e/NFC-e** (nota fiscal de verdade). Nota fiscal real exige
  certificado digital + emissor autorizado (Focus NFe, PlugNotas, um ERP
  como Bling/Tiny, etc.) — não dá pra "fabricar" isso no código. O usuário
  identificou que hoje usa um sistema da **Hotline Tecnologia** pra emitir
  nota — ainda não integrado, fica pra depois (perguntar pra eles sobre API).

## 4. Frete (Melhor Envio)

- Integração via **OAuth2** (não é uma chave fixa — precisa autorizar uma
  vez e o token se renova sozinho). Lógica em `api/_lib/frete.ts`
  (cotação + autenticação ficam no MESMO arquivo de propósito — a Vercel
  tem um bug de bundling quando um arquivo dentro de `api/_lib` importa
  outro arquivo dentro de `api/_lib`).
- **Bug sério corrigido**: como o projeto usa ES Modules nativo
  (`"type": "module"` no `package.json`), toda importação relativa dentro
  de `api/*.ts` **precisa terminar em `.js`** (mesmo sendo arquivo `.ts`),
  senão a função quebra em produção (`ERR_MODULE_NOT_FOUND`). Isso já
  causou o checkout inteiro cair no ar uma vez — ficou resolvido e virou
  regra permanente pra qualquer novo arquivo em `api/`.
- **Entrega grátis na própria cidade**: se a cidade/estado do CEP do
  cliente bater com `LOJA_CIDADE_ORIGEM`/`LOJA_ESTADO_ORIGEM` (variáveis de
  ambiente), o frete fica R$0 — entrega combinada por fora, não usa
  transportadora nesse caso.
- Checkout foi dividido em **2 etapas**: (1) endereço → calcula o frete
  antes de avançar, (2) dados pessoais + pagamento. Antes disso, o resumo
  do pedido mostrava um frete fixo de R$89,90 que não batia com o valor
  real cobrado — corrigido junto com a divisão em etapas. Enquanto o CEP
  não é informado, o resumo mostra "Frete: a calcular" em vez de inventar
  um valor.

## 5. Pagamento — migração de InfinitePay para Mercado Pago Pix

**Por quê**: a InfinitePay parou de funcionar direito (erros de geração de
link) durante os testes, e o pedido do cliente mudou: mostrar o QR code e
código Pix **direto na página do site**, sem redirecionar pra outro lugar.

- `api/_lib/mercadoPago.ts`: cria o pagamento Pix (`POST /v1/payments` da
  API de Pagamentos do Mercado Pago) e consulta o status depois
  (`GET /v1/payments/{id}`) — a confirmação **nunca confia** no que chega
  no webhook sozinho, sempre reconsulta a fonte oficial antes de marcar
  como pago (mesmo princípio de segurança que já existia com a InfinitePay).
- `api/criar-pagamento.ts`: cria o pedido no banco com o preço decidido
  no servidor (nunca no navegador) e gera o Pix na sequência.
- `api/mercadopago-webhook.ts`: recebe a notificação do Mercado Pago,
  reconsulta o pagamento e confirma o pedido. Protegido por:
  - `?t=SEGREDO` na URL (`MERCADOPAGO_WEBHOOK_SECRET`);
  - assinatura HMAC-SHA256 do header `x-signature`, se
    `MERCADOPAGO_SIGNATURE_SECRET` estiver configurada (camada extra).
- `src/pages/OrderSuccessPage.tsx`: mostra o QR code + código "copia e
  cola" direto na tela, com polling de status a cada poucos segundos até
  confirmar o pagamento (ou expirar).
- `api/infinitepay-webhook.ts` foi **removido** (ficou órfão depois da troca).
- Cobre só **Pix** por enquanto — cartão/boleto (que a InfinitePay tinha)
  ficou de fora; dá pra adicionar depois com o Payment Brick do Mercado
  Pago se for pedido.

### Bugs encontrados e corrigidos nessa migração
1. `notification_url attribute must be url valid` — a `SITE_URL` sem
   `https://` na frente quebrava a URL mandada ao Mercado Pago. Corrigido
   normalizando a URL no código (`api/criar-pagamento.ts`).
2. A `notification_url` **não incluía o `?t=SEGREDO`** que o próprio
   webhook exige — mesmo com a URL corrigida, a confirmação automática
   nunca teria funcionado. Corrigido.
3. Corrida entre `clear()` do carrinho e `navigate()` pra tela de
   confirmação: o guard "carrinho vazio → volta pra /carrinho" (em
   `CheckoutPage.tsx`) entrava numa corrida e vencia às vezes, mandando o
   cliente de volta pro carrinho vazio mesmo com o pedido e o Pix já
   gerados. Corrigido com uma flag `pedidoConcluido` que desliga esse guard
   assim que o pedido é criado com sucesso.
4. Deploy não estava chegando na Vercel depois do `git push` — o
   repositório GitHub estava privado e a permissão do app da Vercel tinha
   quebrado. **Solução aplicada**: o repositório foi deixado **público**.
   Se quiser voltar a deixar privado, é só reconectar a permissão do
   GitHub App em Project Settings → Git na Vercel.

### ⚠️ Contas de teste — trocar depois
As credenciais do Mercado Pago em uso hoje (`MERCADOPAGO_ACCESS_TOKEN`,
`MERCADOPAGO_WEBHOOK_SECRET`, `MERCADOPAGO_SIGNATURE_SECRET`) são de uma
**conta de teste/pessoal do desenvolvedor**, não da cliente final. Antes de
ir pra produção de verdade, será preciso:
1. Criar a aplicação (Checkout Transparente → API de Payments) na conta
   Mercado Pago da cliente.
2. Pegar o `MERCADOPAGO_ACCESS_TOKEN` de lá.
3. Reconfigurar o webhook (URL + eventos "Pagamentos (legacy)") nessa
   aplicação e gerar novos segredos.
4. Atualizar as mesmas variáveis na Vercel com os valores da cliente.

Não precisa mudar nada no código — é só troca de credencial.

## 6. Expiração automática de pedidos (30 minutos)

**Problema identificado**: pedidos "aguardando pagamento" nunca eram
cancelados sozinhos — a função `expirar_pedidos_pendentes()` existia no
banco, mas nada a chamava. Pedidos abandonados ficavam presos pra sempre,
segurando estoque.

**Solução**: em vez de depender de um cron job (que teria limitações no
plano gratuito da Vercel), a função é chamada **de forma oportunista**:
- Toda vez que o cliente consulta o status do próprio pedido
  (`status_pedido_publico`, usado pela tela de confirmação);
- Toda vez que o admin carrega `/admin/pedidos` (e a cada 1 minuto
  automaticamente enquanto a página fica aberta);
- Antes de criar qualquer pedido novo (`api/criar-pagamento.ts`), pra
  liberar estoque de pedidos vencidos pro próximo comprador.

- Prazo reduzido de 40 para **30 minutos** (`criar_pedido_seguro`).
- **Cronômetro regressivo visível**:
  - Pro cliente, na tela de acompanhamento do pedido
    (`OrderSuccessPage.tsx`, componente `Cronometro`).
  - Pro admin, em cada pedido "aguardando pagamento" na lista
    (`AdminOrders.tsx`, componente `TempoRestante`).
- Quando o tempo acaba, o próprio polling (do cliente ou do admin) dispara
  a expiração — o pedido vira "cancelado" e o estoque volta sozinho (via
  gatilho já existente `trg_restaurar_estoque`).

## 7. Variáveis de ambiente (visão geral)

Configuradas na Vercel (Project Settings → Environment Variables) — ver
`.env.example` pro texto completo de cada uma:

| Variável | Pra que serve |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Acesso privilegiado ao banco (só servidor) |
| `MERCADOPAGO_ACCESS_TOKEN` | Autenticação com a API do Mercado Pago |
| `MERCADOPAGO_WEBHOOK_SECRET` | Protege a URL do webhook (`?t=`) |
| `MERCADOPAGO_SIGNATURE_SECRET` | Valida a assinatura HMAC do webhook (opcional) |
| `SITE_URL` | URL pública do site (usada na notification_url) |
| `MELHOR_ENVIO_CLIENT_ID` / `_CLIENT_SECRET` | OAuth2 do Melhor Envio |
| `MELHOR_ENVIO_CEP_ORIGEM` | CEP de onde a loja despacha |
| `LOJA_CIDADE_ORIGEM` / `LOJA_ESTADO_ORIGEM` | Pra decidir frete grátis local |
| `N8N_PEDIDO_PAGO_URL` | (opcional) notifica um workflow n8n quando um pedido é pago |

Variáveis órfãs que podem ser apagadas da Vercel (não são mais usadas):
`INFINITEPAY_HANDLE`, `INFINITEPAY_WEBHOOK_SECRET`.

## 8. Pendências / próximos passos

- [ ] Trocar as credenciais do Mercado Pago pela conta real da cliente
      (ver seção 5, "Contas de teste").
- [ ] Decidir sobre nota fiscal de verdade (falar com a Hotline Tecnologia
      sobre integração via API, ou considerar Focus NFe/PlugNotas/Bling).
- [ ] Se quiser, reconectar o GitHub App da Vercel e voltar o repositório
      a ser privado (hoje está público por causa de um bug de permissão).
- [ ] Apagar variáveis de ambiente órfãs da InfinitePay na Vercel.
- [ ] Avaliar se cartão/boleto (Payment Brick do Mercado Pago) precisa
      ser adicionado como opção, já que a InfinitePay cobria isso antes.
- [ ] Confirmar `LOJA_CIDADE_ORIGEM`/`LOJA_ESTADO_ORIGEM` batem exatamente
      com o que o ViaCEP devolve pra cidade da loja (comparação é
      case/acento-insensitive, mas precisa do nome certo).

---

*Última atualização: 2026-09-29.*

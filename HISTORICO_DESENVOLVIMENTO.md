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

## 7. Revisão de segurança (checklist "Vibe Code Security")

Rodada uma revisão completa contra um checklist padrão de segurança
(secrets, pagamento, upload, RLS, rate limit, injections, headers). O que
já estava certo: nenhum segredo hardcoded/commitado, preço sempre decidido
no servidor, RLS habilitado em toda tabela sensível, webhook sempre
reconsulta a fonte oficial antes de confirmar, sem SQL concatenado, sem
`dangerouslySetInnerHTML`, sourcemaps desligados em produção.

Pontos corrigidos nessa revisão:

- **Upload de imagem** (`src/lib/storage.ts`): agora valida o tipo real do
  arquivo pelos **magic bytes** (assinatura binária), não só pelo
  `file.type` do navegador (que é fácil de forjar renomeando o arquivo).
  Limite de 8 MB. O bucket do Supabase (`supabase/storage.sql`) também
  ganhou `allowed_mime_types`/`file_size_limit` — reforça no servidor
  mesmo que alguém pule a validação do navegador chamando a Storage API
  direto.
- **Rate limit** (`api/_lib/rateLimit.ts`, novo): `api/criar-pagamento.ts`
  (8 tentativas/min por IP) e `api/frete.ts` (20/min por IP) agora recusam
  automação abusiva. Implementado com uma tabela simples no próprio
  Supabase (`rate_limit_hits` + função `registrar_rate_limit`), sem
  precisar de um serviço externo (Redis/Upstash).
- **Validação de schema** (`zod`, novo pacote): `api/criar-pagamento.ts`
  passou a validar o corpo da requisição com schema (tamanho máximo de
  campos, formato de e-mail, etc) em vez de só checar presença.
- **Segurança dos headers HTTP** (`vercel.json`): adicionado
  `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Strict-Transport-Security`, `Permissions-Policy` e um
  `Content-Security-Policy: frame-ancestors 'none'` (proteção básica
  contra clickjacking). **Não foi adicionado um CSP completo** (restringindo
  scripts/estilos/imagens por domínio) — isso exigiria mapear todo recurso
  externo que o site carrega e testar em navegador de verdade pra não
  quebrar nada sem querer; fica como próximo passo se quiser esse nível.
- **Comparação do segredo do webhook** (`api/mercadopago-webhook.ts`):
  trocado `!==` simples por comparação "timing-safe" (via HMAC +
  `timingSafeEqual`), mesmo padrão que já era usado só na validação da
  assinatura.

**Não corrigido de propósito**: a sessão do admin (Supabase Auth) usa
`localStorage` por padrão — a alternativa (cookie `HttpOnly`) exigiria
reformular o painel admin inteiro pra passar por um backend próprio (BFF)
em vez de chamar o Supabase direto do navegador. Como o app não tem
nenhum `dangerouslySetInnerHTML` nem outro vetor de XSS conhecido hoje, o
risco prático é baixo — fica registrado aqui como trade-off consciente,
não esquecido.

## 8. Lembrete de carrinho abandonado por e-mail

Todo dia (`vercel.json` → `crons`, meio-dia horário de Brasília), o job
`api/enviar-lembretes-carrinho.ts` procura pedidos de Pix (Mercado Pago)
que expiraram sem pagar (mesmo critério de "carrinho abandonado" já usado
no admin) e manda um e-mail lembrando o cliente, com os itens do pedido e
um botão pra voltar à loja (mais o link do WhatsApp, se configurado). Cada
pedido só recebe um lembrete (`lembrete_carrinho_enviado_em` marca que já
foi processado, com ou sem sucesso).

Usa a API do [Resend](https://resend.com) (chamada direto por `fetch`, sem
SDK) — precisa de:
1. Uma conta no Resend e um **domínio verificado** lá (Domains → Add
   Domain, adicionar os registros DNS que eles pedem). Sem isso, o Resend
   só entrega e-mail pro dono da conta, não pros clientes de verdade.
2. `RESEND_API_KEY` (gerada em resend.com/api-keys) e `RESEND_FROM_EMAIL`
   (ex: `Plascotel <contato@plascotel.com.br>`) na Vercel.
3. `CRON_SECRET` — protege o endpoint (a própria Vercel manda esse valor
   automaticamente no header `Authorization` quando o cron dispara).

O job em si não trava nada se essas variáveis não estiverem configuradas
ainda — só fica sem enviar (loga o erro), não quebra o resto do site.

## 9. Variáveis de ambiente (visão geral)

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
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Lembrete de carrinho abandonado por e-mail |
| `CRON_SECRET` | Protege o job diário de lembrete de carrinho |

Variáveis órfãs que podem ser apagadas da Vercel (não são mais usadas):
`INFINITEPAY_HANDLE`, `INFINITEPAY_WEBHOOK_SECRET`.

## 10. Carga de produtos no catálogo (2026-10-10)

Cadastrados por script direto no Supabase (REST + service role, a partir de
uma planilha de 38 linhas), sem passar pelo painel admin:

- **21 produtos novos / 39 variações** (cor + tamanho, preço próprio em
  cada uma), mais 3 variações novas no "Jogo de cama Toque de Seda -
  Jolitex Ternille" que já existia. Totais após a carga: 37 produtos,
  105 variações.
- Categorias novas: **Cozinha** e **Pijamas**. Itens de "Cama" entraram
  na "Cama, Mesa e Banho" existente.
- Convenções usadas: estoque inicial **5 por variação**; `preco`/`estoque`
  do produto base = menor preço / soma das variações (mesmo padrão dos
  produtos já cadastrados); tamanho "Único" vira variação só por cor.
- Pijamas: regra de preço dada pela cliente — **regata/alça R$ 49,90,
  camiseta/camisetão R$ 69,90**; todos marcados como 100% algodão.

**Incompletos (ajustar no admin em `/admin/produtos`):**
- Nenhum produto da carga tem **foto** — aparecem só com o nome no quadro
  bege até subir as imagens.
- "Lençol com elástico Priori - Döhler" tamanho **King está sem cor**
  (planilha pedia confirmar).
- "Camisetão margarida" sem cor (planilha pedia confirmar foto).
- "Pijama manga curta margarida" e "Pijama manga curta love" estão **sem
  tamanho e com estoque 0** de propósito (não vendem até definir o tamanho
  e o estoque no admin).

### Segunda carga — a partir de fotos (2026-10-17)

A cliente mandou 94 fotos (`Downloads/produtos`): embalagens com etiqueta
de preço da loja e alguns prints de pesquisa no Google/Mercado Livre. As
fotos foram lidas uma a uma; frente/verso do mesmo item foram juntadas e
estampas do mesmo produto viraram variações (ex.: Colcha Garden King com 6
estampas, porta-travesseiro Camesa com 6 modelos/cores).

- Cadastrados **14 produtos / 42 variações** só com preço legível na
  etiqueta (estoque 5 por variação, mesmas convenções da carga anterior).
  Totais após: 51 produtos, 147 variações.
- Categoria nova: **Decoração** (cortinas Camesa e Adomes).
- Ficaram **de fora, aguardando confirmação da cliente**: itens com
  etiqueta ilegível ou sem etiqueta (Corttex Percal Casal/King, capa
  Edromania creme, toalha poncho Döhler, roupão kids Explorer P, roupão
  adulto branco P e cinza, jogo Slim Casal, cortina Voil Santorini, jogo
  Döhler Priori "Vivian", um lençol Gold Bari de R$ 130,50 sem tamanho) e
  os itens vindos de **prints** (rolinho Plaza, porta-travesseiro Abraço
  Plaza Lavive, almofada em rolo Altenburg, cobertor LK4s, jogos Döhler
  "Palmira Florido" e "Provença Valesca") — nos prints o preço mostrado é
  de outra loja, não serve como preço de venda.
- Nenhum item dessa carga tem foto no catálogo (a cliente vai procurar as
  imagens certas depois). A leitura completa, foto a foto, está em
  `scratchpad/leitura-fotos.md` da sessão — não faz parte do repositório.

### Fotos e itens dos prints (tarde de 2026-10-17)

A cliente passou a mandar fotos (Google) de produto em produto, pela pasta
Downloads. Com scripts auxiliares (criar produto com fotos / adicionar
variação / anexar fotos em variação existente), as fotos foram subidas pro
bucket `imagens` e vinculadas:

- **Com foto agora:** Lençol Algodão Lux Altenburg (2 cores), Cortina Alfa
  Camesa, Capa Capri Adomes (3 variações), Capa Boa Esperança Jackson (Preto
  e Marrom — "Laranja" foi renomeada pra Marrom a pedido), Roupão Kids Döhler
  (Dino M e The Explorer P — o "G" foi removido: a cliente só tem P).
- **Criados com foto, mas sem preço (R$ 0 / estoque 0 até vir o valor):**
  rolinho Plaza Lavive, porta-travesseiro Abraço Plaza Lavive (3 cores),
  almofada em rolo Altenburg, cobertor LK 4S Jolitex (grafite/rosa), jogo
  Döhler Percal 130 Queen "Palmira Florido", jogo Döhler Provença King
  "Valesca" (esse sem foto: vieram miniaturas), capa Edromania creme, toalha
  poncho Kids Döhler, roupão adulto Velour grafite G.
- **Estoque padrão passou a ser 20** em todas as variações com preço
  (pedido da cliente, inclusive nos produtos antigos). Totais: 59 produtos,
  160 variações.

Faltam ainda: preços dos itens acima; Corttex Percal (Casal/King), roupão
branco P, jogo Slim Casal, cortina Voil Santorini e lençol Gold Bari de
R$ 130,50 (sem tamanho) continuam **fora** do catálogo; e a maior parte dos
produtos das cargas anteriores segue sem foto. A cliente vai mandar fotos
organizadas com nomes e preços depois.

### Sessão de 2026-10-19 (fotos + nomes oficiais das estampas)

- **Roupão adulto Velour - Döhler**: todas as variações com foto; criada a
  Branco / P (sem preço).
- **Colcha Evolution Patchwork Queen - Camesa**: as 7 estampas ganharam
  foto e os **nomes oficiais** passados pela cliente (Botanique — foto
  principal do produto —, Brisa Luna, Nara, Verde Floral, Floral
  Versailles, Flores Azul, Floral Vermelho), no lugar dos nomes descritivos
  que eu tinha dado pelas fotos da embalagem.
- **Colcha Garden King - Camesa**: idem — Verde, Flores Azul, Melida, Arya,
  Diva, Ayama.
- **Jogo de cama Slim em malha - Edromania**: variação Casal Floral azul
  criada (sem preço), descrição passou a cobrir King e Casal.
- **Jogo de cama Percal 180 fios 4 peças - Corttex**: produto novo, Floral
  rosas / King, com foto, sem preço (etiqueta ilegível). O Casal geométrico
  cinza das fotos de 17/10 ainda não entrou.
- Fotos em `.avif` (formato que o Google às vezes entrega) não são aceitas
  pelo bucket nem legíveis aqui — foram convertidas pra JPEG com a lib
  `sharp` antes de subir.

### Terceira carga — fotos da loja em `produtos2/` (2026-10-24)

A cliente deixou 103 fotos novas (embalagens com etiqueta de preço, tiradas
na loja) na pasta `PLASCOTEL/produtos2` — pasta adicionada ao
`.gitignore` junto com `produtos/` (são centenas de MB; as fotos sobem pro
Storage, nunca pro repositório). Nenhuma foto foi usada no catálogo
(são fotos de prateleira; a cliente manda as boas depois).

- **28 produtos novos / 46 variações** (totais: 88 produtos, 208
  variações). 25 variações com preço legível entraram com estoque 20; 21
  sem etiqueta entraram a R$ 0 / estoque 0.
- Novidades de categoria: muita **Decoração** (cortinas Döhler Messina,
  Nature em 2 tamanhos, Blackout 4,30 e Decora 3,00, Tularte Chicago, Voil
  Santorini Adomes em rosa e branco, Renove), **banho** (jogos Buddemeyer
  fibra longa e algodão egípcio, toalhas Döhler Romance/Marie/Air Touch,
  Mafratex Hotel Suíte, banhão Lapa), saias box Jolitex Square e
  Matelassada, edredom Adomes, peseira Vermont, protetores Jolitex
  (Glacial e matelassê), lixeira inox Powermaid, panelas MTA Serena,
  cestas de vime e almofadas.
- Em produtos existentes: Cortina Malta Adomes ganhou **Branco 1,80x2,00
  (R$ 185,00)** e a Bege passou a ter tamanho "2,60x3,00"; Cobertor LK 4S
  ganhou **Bege** (sem preço).
- Fotos de itens já no catálogo (protetores Jolitex Premium em 4 tamanhos)
  bateram com os preços cadastrados — exceto uma unidade Casal etiquetada
  128,38 (mantido 114,17; confirmar).

**Dúvidas abertas desta carga** (perguntadas à cliente): preço do MTA
Serena (480 ou 680), tamanho/tipo da Döhler Romance de 36,00, se a toalha
Lapa de 112,95 é mesmo "terracota" (parece branca), se o Buddemeyer
egípcio branco é 159,89 como as outras cores, e os 21 itens sem etiqueta.

## 11. Pendências / próximos passos

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
- [ ] Se quiser um Content-Security-Policy completo (script/style/img por
      domínio), precisa mapear todos os recursos externos e testar em
      navegador de verdade (ver seção 7).
- [ ] Criar conta no Resend, verificar o domínio do e-mail da loja e
      configurar `RESEND_API_KEY`/`RESEND_FROM_EMAIL`/`CRON_SECRET` na
      Vercel — sem isso, o lembrete de carrinho abandonado (seção 8) fica
      pronto no código mas não envia nada de verdade.
- [ ] Fotos: ainda faltam em quase todos os produtos das cargas de 10/10
      e na maioria dos de 17/10 (ver seção 10); a cliente vai mandar
      organizadas, com nome e preço.
- [ ] Preços dos 9 produtos cadastrados a R$ 0 (seção 10) — ao receber,
      colocar preço e estoque 20.
- [ ] Definir cor do Lençol Priori King e do Camisetão margarida; definir
      tamanho dos dois pijamas "manga curta" (hoje estão à venda com
      estoque 20 sem tamanho, porque a cliente pediu 20 em tudo).

---

*Última atualização: 2026-10-24.*

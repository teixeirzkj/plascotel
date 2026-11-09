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

No mesmo dia, fotos do Google (via Downloads) anexadas em: Edromania
lençol King (Rosa e Turquesa — a cliente chamou a turquesa de "amarelo";
Amarelo segue sem foto), Cortina Voil Santorini (foto de produto), Cortina
Malta Bege, Gold 180 Bari, Porta-travesseiro Camesa (6 variações + nova
**Arya Branco** a R$ 24,44, mesmo preço das outras — confirmar). Criado
**Jogo de cama Priori 4 peças Casal - Döhler** (estampa Vivian, pendente
desde 17/10) com foto e sem preço.

Respostas da cliente às dúvidas da carga: panelas MTA Serena = **480,00**
(à vista; 680 é o preço a prazo da loja física — o site só vende à vista),
Döhler Romance 36,00 é toalha de **rosto** 50x80 (produto renomeado),
Lapa é terracota mesmo, Buddemeyer egípcio **Branco 112,95** (as outras
cores 159,89), Jolitex Premium **Casal 128,17** (era 114,17) e almofada
chevron **32,38** nas 3 cores — tudo com estoque 20.

A cliente também mandou um **PDF de "Ajuste de Preço de Nota de Compra"
da Jolitex** (nota 255099, 01/10/2026) com os preços de venda — fonte
mais confiável que etiqueta de prateleira. Dele entraram: produto novo
**Jogo de cama Toque de Seda Bordado Inglês 4 peças - Jolitex Ternille**
(Fendi Casal 147,74 / Branco Rosê Queen 172,48 / Branco Bege King 187,65)
e 6 estampas novas no "Jogo de cama Toque de Seda - Jolitex Ternille" já
existente (Triângulos cinza, Riscado cinza, Linhas cinza/branco, Íris
branco), com o número de peças no campo tamanho ("Casal 3 pç", "Casal 4
pç"…) — as 4 variações da planilha de 10/10 ganharam o mesmo formato. O
Glacial 56,12 da nota já estava cadastrado. **Dúvida**: as estampas
"Floral rosa/branco" e "Geométrico azul/branco" da planilha de 10/10 têm
os mesmos preços das da nota (92,26 / 106,80 / 70,71) — podem ser as
mesmas peças com outro nome; confirmar com a cliente pra não duplicar.

### Quarta carga — fotos da loja em `produtos3/` (2026-10-28)

A cliente mandou **181 fotos** (`PLASCOTEL/produtos3/`, ignorado pelo
git). Mistura de prints dos stories do Instagram da loja (já com nome e
preço), fotos de prateleira com etiqueta "PROMOÇÃO"/"Volte sempre" e
caixas do estoque (muita cristaleria Wolff / Lyor / Crystal Bohemia).
Leitura foto a foto ficou no scratchpad da sessão
(`leitura-produtos3.md`). Resultado: **109 produtos novos / 124
variações**, todos ainda sem foto — catálogo agora com **199 produtos /
344 variações**. 56 variações entraram com preço (estoque 20) e **68 a
R$ 0** (estoque 0). Por categoria: Cozinha 57 (copos, taças, jarras,
faqueiros, panelas, garrafas térmicas, açucareiros…), Decoração 24
(tapetes, varões, espelhos, quadros, vasos, almofada, umidificador),
Cama/Mesa/Banho 17 (toalhas de mesa, capas de cadeira, argolas de
guardanapo, jogo de cama Imperiale, colcha Velvet, edredom Altenburg,
cobre-leito Plaza, pillow top) e Pratos 11 (sousplats, pratos de cristal
Wolff/Lyor, bowls).

**Já existiam e não foram duplicados:** kit luva + pegador (34,00), kit
pano de copa (12,00), protetor de travesseiro impermeável (22,50), "Kit
tábua de cortar" = kit de utensílios rosa/azul (25,00; descrição corrigida
para 5 peças) e os pratos de cerâmica verde-água (já estão como "Prato"
Verde a 37,00 — a etiqueta **270,42** na pilha pode ser o jogo; confirmar).

**Dúvidas de preço** (cadastrados com o valor mais provável, estoque 20):
- Faqueiro Treviso (etiquetas 80,00 e 70,00 → **70,00**) e Faqueiro Decor
  Simonaggio (110,00 e 90,00 → **90,00**): duas etiquetas em cada; usei
  a menor, seguindo o caso das panelas MTA (menor = à vista).
- Bule Sonetto Soprano (36,00 e 41,65 → **36,00**) e garrafa Onix 250 ml
  (41,65 e 25,00 → **25,00**); o 41,65 deve ser da garrafa térmica
  branca Soprano, que ficou a R$ 0.
- Toalha de mesa Jacquard Flora Jolitex **100,95** — etiqueta estava em
  outra embalagem da mesma toalha.
- Prato para bolo Pearl Wolff **312,60** (centavos ilegíveis) e
  cobre-leito Plaza Lavive **417,00** (centavos cortados, tamanho não
  visível).
- Taça Alex Wolff **146,00** e Prato Pearl **16,51** — unidade ou caixa?
- Toalha Encanto 139,80 e Jogo de cama Imperiale 393,40 — tamanho não
  visível.

**A R$ 0 por preço ilegível ou ausente:** Tapete Comfort Redondo Adomes
("_44,53", primeiro dígito tampado), Jarra Lines Wolff (56,00 na
prateleira, provavelmente dos copos), Suqueira Palm Tree Wolff (235,04
numa caixa Wolff fechada ao lado), Jarra de cerâmica folha (15,95?),
Passadeira Allegra (50,60 numa embalagem Pinheiro ao lado), Kit varão
cromado Adomes (111,95 num pacote, sem saber se 2 m ou 3 m) e todas as
caixas de cristaleria sem etiqueta (Bohemia Veronica e Crex flute,
faqueiros Valência e Mother Pearl, jarra Praga, garrafas Buffalo e 850 ml,
açucareiros, travessa e potiche Lys, Coupe Lily, centro de mesa, Red
Cherry, Lotus, Mega Star, Lyor parede dupla, canecas pastel, sousplats
exceto Merida, tapetes/varões exceto VIP Design e pelúcia, espelhos,
quadros, pillow top, ralador, amassador…). No admin, filtrar por preço 0.

Fotos descartadas: 2 da loja rabiscadas, 1 print de login, 1 print de
conversa de WhatsApp, 1 dos pés e 2 de ambiente da loja (essas duas podem
servir pra seção "Sobre a loja"). Não cadastrado por falta de
identificação: um tapete creme com relevo "pedras" que aparece ao fundo
em 3 fotos sem etiqueta.

Sugestão pra depois: criar uma categoria **"Mesa Posta"** (sousplats,
toalhas de mesa, argolas, cristaleria de servir) — hoje esses itens estão
espalhados entre Cozinha, Pratos e Cama/Mesa/Banho.

### Fotos anexadas e produtos novos (2026-10-29)

A cliente mandou fotos de produto (Google/sites) pelos Downloads, uma por
vez, com o nome do item no arquivo. **Fotos anexadas** a produtos que já
existiam: Protetor de travesseiro Glacial; Jogo de banho Buddemeyer
(Branco bordado); Protetor de colchão Premium (4 tamanhos — fotos de
cama + gotas em todos, embalagem própria no Casal e no Queen); Protetor
matelassê Casal (embalagem laranja); Cesta de piquenique (Grande e
Pequena); Almofada pelúcia chevron (3 cores, Rosa virou a 1ª variação);
Edredom Adomes Rosa; Peseira Vermont; Cobertor Lili Katz **Bege** (fotos
tiradas de uma página da Cassol salva em HTML); Saia box Square (Fendi =
foto marrom; Branco Queen usa as fotos da Matelassada, a pedido); Saia
box Matelassada (Solteiro e King); Cortinas Messina, Malta Branca,
Santorini Rosa, Nature (2 tamanhos) e Chicago. A Cortina Blackout
4,30x2,60 Döhler foi renomeada para **Alice com ilhós cromado**.

**Produtos novos, sem preço (R$ 0):** Jogo de panelas Cook Quartzo 6
peças - Mimo Style; Toalha de rosto Lollipop veludo 48x80 - Buddemeyer
(Prata); Lixeira Inox 3L com pedal - Powermaid; Cortina Blackout Aneliza
5,40x2,50 - Döhler (Natural); Cortina Blackout Lore 3,00x2,60 (Cinza).

**Confirmar com a cliente:** a Lore pode ser a mesma "Blackout Decora
3,00x2,60" (mesmo tamanho, cinza — mas a Decora diz "estampa digital");
a marca da Lore; as 2 fotos `cortinaquartoesala200x180dohler` (mesma sala
das fotos da Messina) — são da Cortina Renove?

**Contagem no fim do dia:** 204 produtos / 349 variações. Só 39 produtos
completos (foto + preço em todas as variações). 146 produtos sem nenhuma
foto (Cozinha 62, Cama/Mesa/Banho 35, Decoração 27, Pratos 11, Pijamas 11)
e 77 sem nenhum preço (107 variações a R$ 0).

### Fotos de produto — sessões de 2026-11-04 e 2026-11-06

Mesmo fluxo de 29/10 (cliente salva a foto em Downloads com o nome do
item; anexamos ao produto/variação certo, foto ambientada primeiro).
Cerca de 55 produtos ganharam foto: passadeira Allegra (Azul e Cinza,
com o desenho de medidas), tapete Guarujá Pinheiro, tapetes Comfort
Adomes (retangular e redondo), tapete VIP Design, varões (poliuretano e
cromado, todos os tamanhos), toalhas de mesa (Istambul, rendada PVC,
Jacquard Flora, Renova Hércules), vaso espelhado, sousplats (35 cm,
Martelado, Merida, Moon, Balls), espelho Moldurart, trio de quadros
Talheres, colcha Neo Clássico, pillow top, jarra Banana Leaf, canecas
(Pink neon, Rosa alça coração, Grafite, PS Secret Inside), xícaras de
parede dupla (Coração e Canelada), caneca mixer, prato Bee, copos
Mandala, potiche Lys, bule Sonetto, garrafa Onix, amassador, conjunto
churrasco, capas de cadeira (Cinza, Verde oliva, assento Palha), ralador
Tramontina, kit luva (2 estampas), kit pano de copa, kit tábua (2
cores), panelas Safira, faqueiros Bon Gourmet e Mother Pearl, boleira
Bangkok.

**Ajustes feitos com base nas fotos/nomes da cliente:** VIP Design cor
Rosé → **Nude**; caneca fosca Cinza → **Grafite**; renomeados: Tapete
Guarujá Renaissance (Pinheiro), Jarra Banana Leaf 18x11x23, Caneca PS
Secret Inside 350 ml Lyor, Bule Sonetto 750 ml, Ralador universal inox
Utilitá (era "3 faces"), Prato para bolo Bangkok 29x21 (era "boleira
canelada"), Colcha Velvet Neo Clássico (sem "King" no nome). Kit tábua
voltou a "4 peças" (a "faca pequena" era a capa da faca). Xícara parede
dupla: "Lisa (2 un)" era a de **coração** (cliente confirmou) — virou
"Coração (2 un) 80 ml"; "Canelada" virou "Canelada (2 un) 80 ml".
Ordem de variação trocada pra a 1ª ter foto/preço: sousplat 35 cm
(Branco/prata 1º), garrafa Soprano (Preto/Onix 1º).

**Novos (sem preço):** variação **Queen** na colcha Neo Clássico (foto
da embalagem diz Queen; a etiqueta da loja dizia King 467,14) e produto
**Coador de café de vidro com jarra**.

**Fotos não usadas de propósito** (enganariam o cliente): embalagem do
*caminho de mesa* Istambul 0,40x1,50 (não é a toalha); banner "100%
algodão 200 fios" no pillow top (embalagem da loja diz 100% poliéster);
jogo Safira com panela de pressão (8 peças); kit de 9 panos de copa (a
loja vende o de 3); termômetro -20/+150 °C da xícara não foi pra
descrição.

**Correção no site (commit 7ae8779):** o card da vitrine usava só a foto
da 1ª variação; quando ela não tinha foto, o card ficava vazio mesmo com
outras cores fotografadas. Agora usa a 1ª variação que tiver foto.

**Confirmar com a cliente:** colcha Neo Clássico é King, Queen ou as
duas (e a cor — cadastrada Cinza, fotos parecem bege); Bangkok vem com
cúpula?; Toalha Jacquard Flora é 8 lugares (embalagem) ou 4 (nome do
arquivo)?; faqueiro rosa é Lyor Mother Pearl (caixa da loja) ou Bon
Gourmet?; espelho Moldurart tem as outras cores da foto de amostras?;
Tapete Comfort redondo = 244,53?; Jarra Banana Leaf = 15,95?; Bule
Sonetto 36,00 ou 41,65?; preço dos varões (2 m e 3 m). A foto do
**Faqueiro Decor Provençal** (Simonaggio) não chegou nos Downloads.

**Contagem no fim de 06/11:** 205 produtos / 351 variações; 57
produtos completos (eram 39); 102 sem nenhuma foto (eram 146) — Cozinha
44, Cama/Mesa/Banho 26, Decoração 15, Pijamas 11, Pratos 6; 78 sem
nenhum preço (109 variações a R$ 0).

## 11. Pendências / próximos passos

Estado em 2026-11-09 (noite): catálogo com **187 produtos, todos com foto**.
O único buraco é **preço**. Falta, em ordem:

**Catálogo**
- [ ] **Preços**: **76 produtos** a R$ 0 aguardando a cliente alinhar — ao
      receber, colocar preço e estoque 20. Lista em `scratchpad/recon/
      precos_a_definir.txt`/`.csv` (enquanto a sessão existir).

**Pagamento e entrega**
- [ ] Trocar as credenciais do **Mercado Pago** pela conta real da cliente
      (seção 5, "Contas de teste").
- [ ] Trocar as credenciais do **Melhor Envio** (frete) pela conta da cliente.
- [ ] Apagar na Vercel as variáveis de ambiente órfãs da **InfinitePay**.
- [ ] Avaliar se **cartão/boleto** (Payment Brick do Mercado Pago) entra como
      opção além do Pix.

**E-mail (no final, junto com o domínio)**
- [ ] **Domínio + Resend**: pegar/verificar o domínio da loja, verificá-lo no
      Resend (registros DNS) e configurar `RESEND_API_KEY`/`RESEND_FROM_EMAIL`/
      `CRON_SECRET` na Vercel. Sem isso o lembrete de carrinho (seção 8) não
      envia. Decisão da cliente: pegar o domínio por último.

**Segurança (ver SEGURANCA.md; cliente escolheu opção B = aplicar na finalização)**
- [ ] No painel Supabase: desligar "Allow new users to sign up" e rodar
      `supabase/seguranca_admin.sql` no SQL Editor.
- [x] Commit + deploy das correções de segurança (CSP, limites) + remoção da
      política de troca: feito e publicado em 2026-11-09 (commit 5e220f0). A CSP
      está no ar — testar uma compra ponta a ponta para garantir que não quebrou.
- [ ] Conferir na Vercel que as chaves secretas não têm prefixo `VITE_` e que
      Preview Deployments estão protegidos. Opcional: voltar o repo a privado.

**Config / verificação**
- [ ] Confirmar `LOJA_CIDADE_ORIGEM`/`LOJA_ESTADO_ORIGEM` batem com o ViaCEP.
- [ ] Depois do deploy, testar uma compra ponta a ponta (a CSP nova não deve
      quebrar nada).

**Housekeeping**
- [ ] Limpar imagens órfãs no Storage (fotos da loja que subi e depois removi,
      e imagens dos produtos apagados em 11-09).

**Concluído em 2026-11-09**
- [x] Nota fiscal: fica só o comprovante em PDF (seção 3), sem NF-e.
- [x] Fotos + limpa final do catálogo (seção 12): 0 produto sem foto.
- [x] Pijamas/camisola: Camisetão margarida removido; "manga curta love" = P;
      divertido/margarida já tinham tamanho.

## 12. Reconciliação fotos×catálogo e limpa final (2026-11-09)

Pré-entrega para a cliente. Transcrevi as **399 fotos** de `produtos2/3/4`
(não existe `produtos1`) com workflows de visão e casei contra o catálogo em
duas passadas (foto→catálogo e catálogo→foto), com verificação adversarial.
Backup antes: `backups/*_20261109_044634.json`.

- **Removidos 10 produtos** (regra: só os SEM foto que não aparecem nas fotos
  da loja): almofada tricô waffle, argola de guardanapo, bowl de cerâmica,
  espelho oval dourado, jogo Provença King, jogo Spider-Man, kit fronha Priori,
  lençol Priori, lençol vira Percal 180, vaso de vidro canelado. Produtos sem
  correspondência mas **com** foto foram mantidos a pedido da cliente.
- **Tentativa de cadastrar 19 "novos" — REVERTIDA.** Cadastrei 19 produtos que
  pareciam faltar, mas a cliente apontou dois erros: (1) usei a **foto da loja**
  (WhatsApp) como imagem do produto, o que não deve ser feito; (2) vários eram
  **duplicatas** de itens que já existiam no catálogo com foto do Google, só que
  com outro nome (ex.: faqueiro, travessa, sobremesa, xícara, centro de mesa).
  Ação corretiva no mesmo dia: removi as fotos de loja de 39 produtos e apaguei
  os 19 novos. Os originais (com foto do Google) ficaram intactos. Ficou mantida
  só a cor Branco da Cortina Alice (foto web legítima) como variante do produto
  existente, mais fotos web do lençol Toque de Seda e do Prato Pearl.
- A pedido da cliente ("faltar só preço"), **removidos também os 19 produtos que
  ficaram sem foto**.
- **Catálogo final: 187 produtos, TODOS com foto.** Único buraco: **preço** em
  **76 produtos**, aguardando a cliente. (Descrições foram melhoradas de passagem.)
- LIÇÃO para a próxima: casar "faltantes" com rigor muito maior contra o catálogo
  (nome/linha diferentes escondem o mesmo produto) e **nunca** usar a foto da loja
  como imagem final sem aprovação da cliente.
- Scripts da operação em `scratchpad/recon/` (não versionados).

---

*Última atualização: 2026-11-09.*

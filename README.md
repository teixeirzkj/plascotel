# Plascotel — E-commerce de móveis

Loja completa em React + TypeScript + Tailwind CSS + Framer Motion, com
painel administrativo protegido por login (Supabase Auth) e estoque
automático (dá baixa quando alguém compra, devolve se o pedido for
cancelado).

## Rodando localmente

```bash
npm install
npm run dev
```

O site abre em `http://localhost:5173`. Sem nenhuma configuração, ele já
funciona com produtos de exemplo (arquivo `src/data/products.ts`) — é só
para você navegar e ver o layout. Para vender de verdade, siga o passo a
passo abaixo.

## Configuração da loja (arquivo `.env`)

Copie `.env.example` para `.env` e preencha:

| Variável | Para que serve |
|---|---|
| `VITE_WHATSAPP_NUMBER` | Número do WhatsApp da loja, só dígitos com DDI+DDD (ex: `5511999999999`). Enquanto vazio, os botões de WhatsApp ficam ocultos. |
| `VITE_INSTAGRAM_URL` | Link do Instagram da loja. Enquanto vazio, os ícones/seções de Instagram ficam ocultos. |
| `VITE_STORE_EMAIL`, `VITE_STORE_ADDRESS`, `VITE_STORE_HOURS` | Aparecem no rodapé e na página de contato. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Conectam o banco de dados (veja abaixo). |

Depois de editar o `.env`, reinicie o `npm run dev`.

## Como conectar o Supabase (banco de dados + login do admin + estoque automático)

### 1. Criar o projeto

1. Crie uma conta em [supabase.com](https://supabase.com) e crie um novo projeto.
2. Em **Project Settings → API**, copie a **Project URL** e a chave
   **anon public**.
3. Cole esses dois valores em `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` no seu `.env`.

### 2. Criar as tabelas e as regras de estoque

1. No painel do Supabase, abra o **SQL Editor**.
2. Cole todo o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql) deste projeto e clique em **Run**.

Isso cria:
- as tabelas `categorias`, `produtos`, `pedidos` e `pedido_itens`;
- a função `criar_pedido`, que registra o pedido inteiro e **desconta o
  estoque automaticamente**, de forma segura mesmo se dois clientes
  comprarem ao mesmo tempo;
- um gatilho que **devolve o estoque automaticamente** sempre que um
  pedido é marcado como "cancelado" no painel administrativo (e desconta
  de novo se o pedido for reaberto);
- as políticas de segurança (RLS): qualquer visitante pode ver produtos e
  categorias, mas só um administrador logado pode criar, editar ou
  excluir produtos/categorias, e só ele pode ver a lista de pedidos.

### 3. Criar o bucket de imagens (upload de fotos pelo admin)

1. No **SQL Editor**, cole todo o conteúdo do arquivo
   [`supabase/storage.sql`](supabase/storage.sql) e clique em **Run**.

Isso cria um bucket público chamado `imagens` no Supabase Storage. Com
ele, o painel administrativo (`/admin/produtos` e `/admin/categorias`)
ganha um botão **Enviar imagens** que faz upload do arquivo direto do seu
computador — não é mais preciso colar um link de imagem hospedada em
outro lugar.

### 4. Criar o(s) usuário(s) administrador(es)

O login do painel usa o sistema de autenticação do próprio Supabase
(e-mail e senha) — não existe cadastro público, só o administrador tem
acesso.

1. No painel do Supabase, vá em **Authentication → Users → Add user**.
2. Preencha e-mail e senha e marque **Auto Confirm User**.
3. Pronto: esse e-mail/senha já funcionam em `/admin/login`.

Você pode criar quantos usuários administradores quiser dessa mesma
forma.

### 5. Cadastrar os produtos

Depois de rodar o `schema.sql`, as tabelas `categorias` e `produtos`
começam vazias. Você pode:

- Cadastrar tudo pelo próprio painel administrativo do site
  (`/admin/categorias` e `/admin/produtos` — crie primeiro as
  categorias, depois os produtos); ou
- Gerar `insert`s a partir de `src/data/categories.ts` e
  `src/data/products.ts` para popular o banco de uma vez, caso queira
  aproveitar os textos de exemplo.

Assim que existir pelo menos um produto/categoria no banco, o site
automaticamente passa a exibir os dados do Supabase em vez dos dados de
exemplo — nenhuma página precisa ser alterada para isso (veja
`src/data/repository.ts`).

### 6. Testar o fluxo de estoque

1. Cadastre um produto com estoque, por exemplo, `2`.
2. Compre esse produto pelo site (`Adicionar ao carrinho` →
   `Finalizar compra`).
3. No painel (`/admin/produtos`), o estoque já aparece descontado.
4. Em `/admin/pedidos`, mude o status desse pedido para `cancelado` — o
   estoque do produto volta a subir automaticamente.

## Painel administrativo

Acesse em `/admin/login`. Depois de logado:

- `/admin` — dashboard com totais e alerta de estoque baixo;
- `/admin/produtos` — listar, criar, editar e excluir produtos;
- `/admin/categorias` — listar, criar, editar e excluir categorias;
- `/admin/pedidos` — ver pedidos recebidos e mudar o status (o estoque
  reage automaticamente ao cancelamento).

## Pagamento (Mercado Pago Pix)

O checkout online gera um pagamento Pix pela API do Mercado Pago
(`api/_lib/mercadoPago.ts`): a cada pedido, o site cria a cobrança com o
valor exato do carrinho e mostra o QR code + código "copia e cola" direto
na própria página de confirmação (`src/pages/OrderSuccessPage.tsx`) — o
cliente nunca é redirecionado para outro site. Precisa de um
`MERCADOPAGO_ACCESS_TOKEN` (Suas integrações → seu aplicativo →
Credenciais, em mercadopago.com.br/developers), configurado só no
servidor (variável sem prefixo `VITE_`).

Se o pedido não conseguir gerar o Pix (ex: instabilidade do Mercado
Pago), o pedido já fica salvo e o cliente é orientado a combinar o
pagamento pelo WhatsApp informando o número do pedido.

### Confirmação automática do pagamento

Um pedido pago via Pix entra no banco com status
`aguardando_pagamento` — ele já aparece em `/admin/pedidos`, mas não é
tratado como um pedido pronto pra despachar até o pagamento ser
confirmado de verdade. Isso acontece assim:

1. Ao gerar o Pix, o site também passa uma `notification_url` apontando
   pra `api/mercadopago-webhook.ts`.
2. Quando o cliente paga, o Mercado Pago chama esse webhook.
3. A função **não confia** só no que chega no webhook — ela consulta de
   volta a própria API do Mercado Pago (`GET /v1/payments/{id}`) pra
   confirmar que o pagamento realmente foi aprovado.
4. Só depois dessa confirmação o pedido vira `confirmado` no banco
   (usando a Service Role Key do Supabase, configurada em
   `SUPABASE_SERVICE_ROLE_KEY` — variável só do servidor, nunca exposta
   ao navegador).

Se o pedido ficar parado em "aguardando pagamento" por muito tempo (ex:
cliente desistiu no meio do pagamento), o admin pode mudar o status
manualmente em `/admin/pedidos`.

## Logo oficial

O componente `src/components/Logo.tsx` hoje mostra um placeholder com o
nome "Plascotel". Quando a logo definitiva estiver pronta, troque o
conteúdo desse componente por uma tag `<img>` apontando para o arquivo —
o restante do site (header, footer, admin) não precisa de nenhuma outra
alteração.

## Build de produção

```bash
npm run build
```

Gera os arquivos estáticos em `dist/`, prontos para publicar em
qualquer serviço de hospedagem (Vercel, Netlify, etc.). Lembre-se de
configurar as mesmas variáveis de ambiente (`VITE_...`) no painel do
serviço de hospedagem escolhido.

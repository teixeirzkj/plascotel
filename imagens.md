# Imagens do site — análise e prompts de geração

Este arquivo documenta a análise das fotos em `meus produtos/`, do site
de referência (layout "Shop EMPIRE" usado para redesenhar a Home) e da
identidade visual da Plascotel, e a partir disso define um **prompt
pronto para colar no ChatGPT/DALL·E** para cada produto que precisa de
foto nova ou melhorada.

## O que encontrei na pasta `meus produtos/`

~60 arquivos, todos batizados "WhatsApp Image ...", sem organização por
produto. Depois de abrir todos, são **45 produtos distintos** em duas
linhas bem diferentes:

**Cama, Mesa e Banho** (25 produtos) — fotos já em boa qualidade,
vindas de catálogo de fabricante: fundo branco de estúdio + 1-2 fotos
de ambiente (quarto decorado) por produto. Linhas: colcha piquet
estampada (floral, corações), colcha piquet lisa (verde, rosa, cinza,
terracota), colcha com relevo de rosas (bordô, verde-sálvia, malva),
colcha xadrez, colcha floral toile azul, lençol liso, manta/toalha de
tecido natural com franjas, cobertor fleece (poá e xadrez).

**Perfumaria / Aromatizador — linha ViaAroma** (20 produtos) — fotos
tiradas por vocês mesmos, sempre no mesmo fundo (uma superfície de
pedra/cortiça cinza com manchas douradas), celular, enquadramento
vertical, produto centralizado. Linhas: Home Spray 200ml e 60ml, Óleo
Essencial 10ml, Blend de aromaterapia 10ml, Aromatizador Elétrico
"Standard Click".

Não havia fotos de pratos nesta pasta (apesar de termos discutido
"pratos" como exemplo antes) — se vocês tiverem um lote de fotos de
pratos separado, me mandem que eu faço a mesma análise.

Várias fotos são o mesmo produto em ângulos diferentes (produto isolado
+ foto de ambiente + close). Nesses casos, um produto = um prompt só
(não repeti prompt idêntico pra cada ângulo do mesmo item).

## Onde cada imagem aparece no site (estrutura das seções)

| Local | Componente | Proporção usada |
|---|---|---|
| Card de produto na listagem/Home (`ProductCard.tsx`) | `imagens[0]` como principal, `imagens[1]` ao passar o mouse | `aspect-[4/5]` (retrato) |
| Página do produto (`ProductDetail.tsx`) | imagem principal + miniaturas de toda a lista `imagens[]` | `aspect-[5/4]` no celular, quadrada (`1:1`) no desktop |
| Miniaturas da galeria | mesmas imagens, em `64–80px` | recorte quadrado |
| Carrinho / resumo do pedido | `imagens[0]` | quadrado pequeno |

**Na prática:** cada produto precisa de pelo menos **2 imagens**: uma
principal (retrato, é a que aparece nos cards) e uma segunda (para o
efeito de hover no card e para a galeria da página do produto). Gerar
em alta resolução, próximo de **1:1 (quadrado)**, cobre bem os dois
recortes (`4:5` e `5:4`/quadrado) sem esticar nem cortar demais o
produto — é a proporção pedida em todos os prompts abaixo.

## Identidade visual da Plascotel (`src/index.css`)

- Fonte única: **Poppins** (títulos e texto).
- Paleta: creme (`#faf7f2`), areia (`#e8dfd0`), madeira em tons de bege
  a marrom (`#f6f1ea` → `#7a5636`), grafite quase preto (`#201c18`),
  dourado (`#b6893f`). Nada de cores saturadas ou neon — tom quente,
  natural, "casa aconchegante".
- Cards com cantos bem arredondados e sombra suave — as fotos precisam
  ter fundo/composição que não brigue com esse fundo creme claro.

## Prompt base (usar em todos os prompts abaixo)

Cole isso **no início de todo prompt**, antes da parte específica do
produto:

> Fotografia de produto profissional, em altíssima definição, foco
> nítido no produto do início ao fim (sem desfoque), iluminação suave
> e natural (sem sombras duras nem reflexos de flash). Sem texto,
> marca d'água, logotipo adicional ou elementos gráficos sobrepostos
> na imagem. O produto deve ser reproduzido **fielmente** à foto de
> referência anexada — mesma cor, mesmo padrão/estampa, mesmas
> proporções e mesmos detalhes (etiquetas, texto de rótulo, textura do
> tecido) — não invente um produto diferente, apenas fotografe-o
> melhor. Imagem em proporção quadrada (1:1), resolução mínima de
> 1600×1600px, sem cortar nenhuma parte do produto.

---

## A) Cama, Mesa e Banho — estilo "quarto bonito e arrumado"

Para esta linha, o cenário é um quarto de casa decorado, claro,
aconchegante — como as próprias fotos de ambiente que o fabricante já
manda, só que eu vou pedir pra IA recriar/theming em cima da cor real
de cada produto quando não existir uma foto de ambiente pra aquela cor
específica.

### 1. Colcha piquet floral (creme com flores vermelhas e mostarda)
**Categoria:** Cama, Mesa e Banho · **Referência:** `WhatsApp Image 2026-09-01 at 10.30.58.jpeg` (produto isolado) + `10.30.59.jpeg` (ambiente)
Prompt: [prompt base] + "Uma colcha piquet branca estampada com flores
miúdas vermelhas, mostarda e folhas verde-oliva, sobre uma cama de
casal arrumada, em um quarto claro e aconchegante — parede em tom
neutro claro, luz de janela lateral suave, um abajur pequeno de mesa
de cabeceira aceso, uma xícara e um vaso com flores frescas ao lado.
A colcha deve estar bem esticada e as almofadas arrumadas, como em uma
foto de decoração de revista. Enquadramento levemente de cima,
mostrando o pé da cama até a cabeceira."
**Usar em:** card do produto (retrato) + página do produto (imagem 2, ambiente).

### 2. Colcha piquet corações (coral e cinza sobre branco)
**Referência:** `10.31.40 (1).jpeg`, `10.31.40 (2).jpeg`, `10.31.40 (3).jpeg`
Prompt: [prompt base] + "Colcha piquet branca com estampa miúda de
corações nas cores coral e cinza, arrumada sobre uma cama de casal em
um quarto claro e romântico, parede em tom rosado-claro, cortinas de
linho branco translúcido, uma poltrona estofada ao fundo, luz natural
suave de janela. Foco na textura do tecido waffle e no padrão de
corações."

### 3. Colcha piquet lisa verde-menta
**Referência:** `10.37.28.jpeg`
Prompt: [prompt base] + "Colcha piquet lisa em verde-menta suave sobre
uma cama de casal, em um quarto com parede de tijolinho branco pintado,
planta grande ao lado da cama, luz natural entrando pela janela,
criado-mudo escuro com livros empilhados. Foco na textura waffle do
tecido, sem estampa."

### 4. Colcha piquet lisa rosa-blush
**Referência:** `WhatsApp Image 2026-09-01 at 10.46.49 (1).jpeg`
Prompt: [prompt base] + "Colcha piquet lisa rosa-blush claro sobre
cama de casal, quarto elegante com cabeceira estofada cinza, parede em
tom areia, tapete cinza claro, luminária de mesa branca acesa,
decoração em tons neutros com um toque dourado. Foco na textura waffle
do tecido rosa."

### 5. Colcha piquet lisa cinza-claro / branco gelo
**Referência:** `10.46.49.jpeg`
Prompt: [prompt base] + "Colcha piquet lisa cinza muito claro (quase
branco) sobre cama de casal, quarto com parede de tijolinho branco,
planta ao lado da janela, luz natural, banco preto com livros ao lado
da cama. Foco na textura waffle sutil do tecido claro."

### 6. Colcha piquet lisa terracota
**Referência:** `10.31.40.jpeg` (ambiente) + `10.31.40 (1).jpeg` (produto)
Prompt: [prompt base] + "Colcha piquet lisa em terracota/telha sobre
cama de casal com cabeceira estofada cinza capitonê, quarto sofisticado
com detalhe decorativo dourado circular na parede, puff estofado aos
pés da cama, luz quente de abajur combinando com o tom terracota do
tecido."

### 7. Colcha com relevo floral bordô
**Referência:** `WhatsApp Image 2026-09-02 at 09.24.27 (1).jpeg`
Prompt: [prompt base] + "Colcha matelassê bordô escuro com estampa em
relevo (jacquard) de rosas e pontilhado geométrico, dobrada mostrando a
textura em relevo do tecido, fotografada de perto sobre uma cama
arrumada, fundo em tom neutro desfocado, luz suave lateral que realça o
relevo do bordado. Foco total na textura em relevo."

### 8. Colcha com relevo floral verde-sálvia
**Referência:** `09.24.27.jpeg`
Prompt: mesmo prompt do item 7, trocando a cor para verde-sálvia
acinzentado, mantendo o mesmo padrão de rosas em relevo.

### 9. Colcha com relevo floral malva
**Referência:** `09.24.28 (1).jpeg`
Prompt: mesmo prompt do item 7, trocando a cor para malva/rosa-antigo,
com a mesma composição de canto dobrado mostrando porta-travesseiro e
colcha.

### 10. Colcha xadrez marrom e preto (padrão tartan)
**Referência:** `09.24.28.jpeg`
Prompt: [prompt base] + "Colcha xadrez tartan em tons de marrom, preto
e bege sobre cama de casal com cabeceira estofada bege, quarto
aconchegante estilo rústico-moderno, luminária pendente redonda acesa,
mesa de cabeceira clara com vaso de flores secas, luz quente de fim de
tarde."

### 11. Colcha xadrez gingham verde
**Referência:** `10.12.04.jpeg`
Prompt: [prompt base] + "Colcha xadrez gingham (padrão diagonal
quadriculado) em dois tons de verde sobre cama de casal, quarto claro e
minimalista com cabeceira bege, planta ao lado da janela com cortina
branca, luz natural suave e uniforme."

### 12. Colcha floral toile azul
**Referência:** `10.59.56.jpeg`
Prompt: [prompt base] + "Colcha piquet azul-claro estampada com
buquês florais em tons de azul-marinho e branco (estilo toile), sobre
cama de casal em quarto claro e delicado, cabeceira estofada bege, vaso
com flores secas na mesa de cabeceira, luz natural suave."

### 13. Lençol liso cinza/taupe
**Referência:** `WhatsApp Image 2026-09-03 at 08.34.21.jpeg`
Prompt: [prompt base] + "Jogo de lençol liso na cor taupe/cinza-pardo,
levemente amassado de forma natural sobre cama de casal, quarto
moderno com vista de janela para paisagem urbana desfocada ao fundo,
duas luminárias de mesa iguais nos dois criados-mudos, luz de dia
neutra."

### 14. Lençol liso branco
**Referência:** `08.34.21 (1).jpeg`
Prompt: mesmo prompt do item 13, trocando a cor para branco puro, num
quarto claro e clean com parede de tijolinho branco e piso de madeira
clara.

### 15. Lençol liso rosa
**Referência:** `08.34.22.jpeg`
Prompt: mesmo prompt do item 13, trocando a cor para rosa-claro suave,
num quarto delicado com criado-mudo espelhado e luminária de mesa
clássica.

### 16. Manta/toalha de tecido natural com franjas — mostarda
**Referência:** `09.00.17.jpeg`
Prompt: [prompt base] + "Manta de tecido natural (textura tipo linho
grosso) na cor mostarda/dourado-queimado, com franjas nas duas
extremidades, dobrada em quadrado sobre fundo branco de estúdio,
mostrando bem a textura tecida e o acabamento das franjas. Foto de
still-life de produto, sem cenário de ambiente."

### 17. Manta/toalha de tecido natural com franjas — marrom
**Referência:** `09.00.17 (1).jpeg`
Prompt: mesmo prompt do item 16, trocando a cor para marrom-café.

### 18. Manta/toalha de tecido natural com franjas — bege
**Referência:** `09.00.17 (2).jpeg`
Prompt: mesmo prompt do item 16, trocando a cor para bege-areia.

### 19. Manta/toalha de tecido natural com franjas — off-white
**Referência:** `09.00.17 (3).jpeg`
Prompt: mesmo prompt do item 16, trocando a cor para off-white/cru.

### 20. Manta de tecido natural com franjas — verde, em ambiente
**Referência:** `09.00.18.jpeg` (still) + `09.00.18 (1).jpeg` (ambiente)
Prompt: [prompt base] + "Manta de tecido natural verde-sálvia com
franjas, jogada displicentemente sobre uma poltrona estofada bege com
braços de madeira clara, ao lado de uma mesinha com vaso de flores
secas douradas e livros empilhados, luz quente de sol da tarde entrando
pela janela, piso de madeira clara. Ambiente aconchegante de sala de
estar."

### 21. Cobertor fleece poá — malva e branco
**Referência:** `09.16.59 (2).jpeg`
Prompt: [prompt base] + "Cobertor de fleece macio malva/rosa-antigo com
bolinhas brancas grandes, dobrado em retângulo sobre fundo branco de
estúdio, mostrando a textura felpuda e macia do tecido e o padrão de
poá. Still-life de produto."

### 22. Cobertor fleece poá — vermelho e branco
**Referência:** `09.17.00 (1).jpeg`
Prompt: mesmo prompt do item 21, trocando a cor para vermelho-bordô com
bolinhas brancas.

### 23. Cobertor fleece poá — azul-acinzentado e branco
**Referência:** `09.17.00.jpeg`
Prompt: mesmo prompt do item 21, trocando a cor para azul-acinzentado
com bolinhas brancas.

### 24. Cobertor fleece xadrez herringbone — bege e branco
**Referência:** `09.16.59.jpeg`
Prompt: [prompt base] + "Cobertor de fleece macio com estampa xadrez
buffalo em tecido espinha-de-peixe (herringbone), nas cores bege e
branco-gelo, dobrado em retângulo sobre fundo branco de estúdio,
mostrando bem a textura felpuda e o desenho do xadrez. Still-life de
produto."

### 25. Cobertor fleece xadrez — rosa, bege e branco
**Referência:** `09.16.59 (1).jpeg`
Prompt: mesmo prompt do item 24, trocando as cores do xadrez para
rosa-antigo, bege e branco.

---

## B) Perfumaria / Aromatizador ViaAroma — fiel ao original

Aqui o pedido foi manter bem próximo da foto real (rótulo, cor do
líquido, formato do frasco) — só deixar a foto mais limpa e
profissional, sem inventar cenário novo. Uso o mesmo fundo de
pedra/cortiça cinza que vocês já usam, mas com iluminação e nitidez
melhores.

**Prompt-base específico desta seção** (usar no lugar do prompt base
geral acima, já que aqui a cor do fundo é parte da identidade visual
que vocês já construíram):

> Fotografia de still-life de produto extremamente nítida e bem
> iluminada, frasco centralizado, sobre uma superfície e um fundo de
> textura de pedra/cortiça cinza-claro com pequenas manchas douradas
> (o mesmo tipo de fundo da foto de referência anexada), luz suave e
> uniforme sem reflexo duro de flash, leve sombra natural do frasco no
> chão. Reproduza o frasco, a tampa, a cor do líquido e o rótulo
> **exatamente** como na foto de referência — mesmo texto, mesma
> paleta de cores do rótulo, mesma proporção do frasco — apenas com
> foto mais nítida e bem enquadrada. Sem texto ou elemento extra
> sobreposto à imagem. Proporção quadrada (1:1), resolução mínima de
> 1600×1600px.

### 26. Home Spray Jasmim Branco 200ml
**Referência:** `WhatsApp Image 2026-09-02 at 10.12.04.jpeg`
Prompt: [prompt-base da seção B] + "Frasco Home Spray 200ml, líquido
transparente, tampa e gatilho pretos, rótulo rosa-antigo com padrão
geométrico dourado e a etiqueta central 'Jasmim Branco — Home Spray —
200ml — ViaAroma'."

### 27. Home Spray Maçã com Canela 200ml
**Referência:** `WhatsApp Image 2026-09-02 at 10.59.56.jpeg`
Prompt: [prompt-base B] + "Frasco Home Spray 200ml, líquido levemente
amarelado, tampa e gatilho pretos, rótulo vermelho-tijolo com padrão de
losangos dourados e etiqueta 'Maçã com Canela — Home Spray — 200ml —
ViaAroma'."

### 28. Home Spray Maçã com Canela 60ml
**Referência:** `WhatsApp Image 2026-09-02 at 11.02.47.jpeg`
Prompt: [prompt-base B] + "Frasco Home Spray 60ml (menor e mais
estreito que o de 200ml), líquido levemente amarelado, tampa preta
comprida, rótulo vermelho-tijolo com padrão de estrelas douradas e
etiqueta 'Maçã com Canela — Home Spray — 60ml — ViaAroma'."

### 29. Home Spray Baby 200ml
**Referência:** `WhatsApp Image 2026-09-02 at 10.59.57.jpeg`
Prompt: [prompt-base B] + "Frasco Home Spray 200ml, líquido
transparente, tampa e gatilho pretos, rótulo azul-turquesa com padrão
de gotas douradas e etiqueta 'Baby — Home Spray — 200ml — ViaAroma'."

### 30. Home Spray Capim Limão 200ml
**Referência:** `WhatsApp Image 2026-09-02 at 10.59.56 (1).jpeg`
Prompt: [prompt-base B] + "Frasco Home Spray 200ml, líquido
transparente, tampa e gatilho pretos, rótulo verde-claro com padrão
losangular dourado e etiqueta 'Capim Limão — Home Spray — 200ml —
ViaAroma'."

### 31. Home Spray Breeze 200ml
**Referência:** `WhatsApp Image 2026-09-02 at 10.59.56 (2).jpeg`
Prompt: [prompt-base B] + "Frasco Home Spray 200ml, líquido
transparente, tampa e gatilho pretos, rótulo verde-azulado com listras
douradas onduladas e etiqueta 'Breeze — Home Spray — 200ml —
ViaAroma'."

### 32. Home Spray Breeze 60ml
**Referência:** `WhatsApp Image 2026-09-02 at 11.02.48 (3).jpeg`
Prompt: [prompt-base B] + "Frasco Home Spray 60ml, líquido
transparente, tampa preta comprida, rótulo verde-azulado com listras
douradas onduladas e etiqueta 'Breeze — Home Spray — 60ml —
ViaAroma'."

### 33. Home Spray Black Vanilla 200ml
**Referência:** `WhatsApp Image 2026-09-02 at 10.59.56 (3).jpeg`
Prompt: [prompt-base B] + "Frasco Home Spray 200ml, líquido dourado
translúcido, tampa e gatilho pretos, rótulo bordô com padrão floral
geométrico dourado e etiqueta 'Black Vanilla — Home Spray — 200ml —
ViaAroma'."

### 34. Home Spray Black Vanilla 60ml
**Referência:** `WhatsApp Image 2026-09-02 at 11.02.48.jpeg`
Prompt: [prompt-base B] + "Frasco Home Spray 60ml, líquido dourado
translúcido, tampa preta comprida, rótulo bordô com padrão floral
geométrico dourado e etiqueta 'Black Vanilla — Home Spray — 60ml —
ViaAroma'."

### 35. Home Spray Peônia Garden 200ml
**Referência:** `WhatsApp Image 2026-09-02 at 10.59.56 (4).jpeg`
Prompt: [prompt-base B] + "Frasco Home Spray 200ml, líquido
transparente, tampa e gatilho pretos, rótulo rosa-chiclete com padrão
geométrico dourado e florzinhas, etiqueta 'Peônia Garden — Home Spray
— 200ml — ViaAroma'."

### 36. Home Spray Lavanda 60ml
**Referência:** `WhatsApp Image 2026-09-02 at 11.02.48 (1).jpeg`
Prompt: [prompt-base B] + "Frasco Home Spray 60ml, líquido
transparente, tampa preta comprida, rótulo lilás/roxo com padrão
geométrico dourado e etiqueta 'Lavanda — Home Spray — 60ml —
ViaAroma'."

### 37. Home Spray Wood 60ml
**Referência:** `WhatsApp Image 2026-09-02 at 11.02.48 (2).jpeg`
Prompt: [prompt-base B] + "Frasco Home Spray 60ml, líquido
transparente, tampa preta comprida, rótulo marrom-café com padrão de
círculos concêntricos dourados e etiqueta 'Wood — Home Spray — 60ml —
ViaAroma'."

### 38. Home Spray Alecrim Silvestre 60ml
**Referência:** `WhatsApp Image 2026-09-02 at 11.02.48 (4).jpeg`
Prompt: [prompt-base B] + "Frasco Home Spray 60ml, líquido
transparente, tampa preta comprida, rótulo verde-oliva claro com padrão
hexagonal dourado e etiqueta 'Alecrim Silvestre — Home Spray — 60ml —
ViaAroma'."

### 39. Óleo Essencial Gerânio 10ml
**Referência:** `WhatsApp Image 2026-09-02 at 11.09.24.jpeg`
Prompt: [prompt-base B] + "Frasquinho de vidro âmbar escuro 10ml com
conta-gotas, tampa preta rosqueada, rótulo bege com detalhe rosa e
faixa lateral, texto 'ViaAroma — Óleo Essencial — Gerânio — 100% Puro
Vegano — 10ml/0.34Fl.oz'. Frasco bem pequeno, ocupando o centro do
quadro."

### 40. Óleo Essencial Citronela 10ml
**Referência:** `WhatsApp Image 2026-09-02 at 11.06.04.jpeg`
Prompt: mesmo prompt do item 39, trocando o rótulo para bege com faixa
verde-oliva e texto 'Citronela'.

### 41. Óleo Essencial Eucalipto Citriodora 10ml
**Referência:** `WhatsApp Image 2026-09-02 at 11.06.04 (1).jpeg`
Prompt: mesmo prompt do item 39, trocando o rótulo para bege com faixa
bordô e texto 'Eucalipto Citriodora'.

### 42. Óleo Essencial Menta Piperita 10ml
**Referência:** `WhatsApp Image 2026-09-02 at 11.06.04 (2).jpeg`
Prompt: mesmo prompt do item 39, trocando o rótulo para bege com faixa
azul-petróleo e texto 'Menta Piperita'.

### 43. Blend Aromaterapia "Respira Bem" 10ml
**Referência:** `WhatsApp Image 2026-09-02 at 11.06.03.jpeg`
Prompt: [prompt-base B] + "Frasquinho de vidro âmbar escuro 10ml com
conta-gotas, tampa preta rosqueada, rótulo bege claro estilo kraft com
ícone de folha e faixa vermelha lateral, texto 'Aromatherapy — Respira
Bem — Limão Siciliano, Eucalipto Globulus, Copaíba Branca & Lavanda —
10ml Blend Rely — ViaAroma'."

### 44. Blend Aromaterapia "Hora de Dormir" 10ml
**Referência:** `WhatsApp Image 2026-09-02 at 11.06.05.jpeg`
Prompt: mesmo prompt do item 43, trocando a faixa lateral para
azul-lavanda e o texto para 'Hora de Dormir — Lavanda, Camomila &
Funcho'.

### 45. Aromatizador Elétrico "Standard Click"
**Referência:** `WhatsApp Image 2026-09-02 at 11.09.25.jpeg`
Prompt: [prompt-base B] + "Caixa de produto retangular na cor
roxo-berinjela escuro, com etiqueta cinza-clara 'ViaAroma —
Aromatizador Elétrico — Standard Click' na parte de cima e o plugue
elétrico branco visível através de um recorte transparente na
embalagem, selo 'Com botão liga/desliga' e 'Garantia 2 anos' no canto
inferior. Caixa apoiada de leve encostada na parede, levemente
inclinada, como still-life de produto de prateleira."

---

## Observações finais

- **Hero da Home** (`public/hero/*.webp`): já são fotos de ambiente
  genéricas (sala/quarto), não retratam produtos específicos do
  catálogo — não precisam de prompt novo agora. Se um dia vocês
  quiserem heróis com produtos reais da Plascotel (ex: uma das colchas
  na cama do banner), me avisem que gero prompts pra isso também,
  usando o mesmo "prompt base" da seção A.
- **Depois de gerar as imagens**: salve os arquivos, entre em
  `/admin/produtos`, edite cada produto e suba as fotos geradas em
  "Imagens" (a primeira da lista vira a foto principal do card).
- Se algum produto ainda não estiver cadastrado no admin, cadastre
  primeiro (nome, categoria, preço, estoque) e depois volte pra
  adicionar as fotos.

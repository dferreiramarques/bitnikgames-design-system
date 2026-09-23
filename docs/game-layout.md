# Layout de jogos e conversão para mobile

Como está organizado o ecrã de um jogo do catálogo "jogar online" da bitnikgames em desktop, e como se converte para telemóvel (vertical e horizontal) sem o espremer.

Está escrito em termos genéricos (**mesa**, **peças ativas**, **mão**, **adversários**) para servir a qualquer jogo. Há duas implementações de referência, que aparecem aqui só como exemplo, com os seus IDs e classes nos snippets — troca-os pelos do teu jogo:

- [Bulbous](https://github.com/dferreiramarques/bulbous) (ficheiro único `client.html`; commits `953d526`, `81e8169`, `02f1532`) — a primeira; jogo de vazas com mão, barra de ações e adversários à parte (`#centre-area`, `#my-area`…).
- [Capivaras](https://github.com/dferreiramarques/capivaras) (`server.js`, cliente na string `CLIENT_HTML`, secções "LAYOUT DE JOGO EM TELEMÓVEL", "COMPACTO" e "TELEMÓVEL NA HORIZONTAL") — a segunda; sem mão nem barra de ações, 2 a 6 jogadores, o ecrã de jogo era uma página com scroll (ver [variantes](#variantes-de-estrutura) e [diagnóstico](#2-diagnóstico-que-motivou-a-conversão)).

Isto é **só estrutura e comportamento**. As cores de cada jogo são a skin dele (ver `README.md` → "Fazer uma skin"); não há tokens novos aqui.

A parte que é igual em todos os jogos já está em [`src/game-ui.css`](../src/game-ui.css), na secção "Layout de jogo em telemóvel" (ver [Reutilizável](#9-o-que-já-está-no-game-uicss)). O resto fica como receita neste documento, porque depende da estrutura HTML de cada jogo.

## Índice

1. [Anatomia em desktop (referência)](#1-anatomia-em-desktop-referência)
2. [Diagnóstico que motivou a conversão](#2-diagnóstico-que-motivou-a-conversão)
3. [Princípios transversais (aplicar sempre)](#3-princípios-transversais-aplicar-sempre)
4. [Modo compacto (telemóvel) — um só critério em CSS e JS](#4-modo-compacto-telemóvel--um-só-critério-em-css-e-js)
5. [Telemóvel na horizontal — 2 colunas](#5-telemóvel-na-horizontal--2-colunas)
6. [Comportamentos de jogo](#6-comportamentos-de-jogo)
7. [Assets](#7-assets)
8. [Checklist de testes](#8-checklist-de-testes-antes-de-dar-por-feito)
9. [O que já está no `game-ui.css`](#9-o-que-já-está-no-game-uicss)

---

## 1. Anatomia em desktop (referência)

### Ecrãs

**nome → lobby → espera → jogo**

| Ecrã | Layout |
|---|---|
| Nome | logo + input + botões, centrado na vertical e na horizontal |
| Lobby | cartão centrado `width: min(560px, 100%)`, encostado ao topo; a lista de mesas faz scroll interno (o cartão não cresce para lá do ecrã) |
| Espera | cartão centrado `width: min(400px, 92vw)` |
| Jogo | ver abaixo |

### Ecrã de jogo

Coluna flex a 100% da altura, `overflow: hidden` — a página nunca faz scroll; cada zona faz o seu, se precisar.

```css
#screen-game.active { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
#centre-area        { flex: 1; min-height: 0; }   /* a mesa fica com o que sobra */
#game-header, #opponents-area, #my-area { flex-shrink: 0; }
```

| Zona | Papel | Comportamento |
|---|---|---|
| Cabeçalho | fase, ronda, baralho, Regras, Sair | uma linha, `flex-shrink: 0` |
| Faixa de adversários | um painel por adversário: nome na cor, nº de cartas, ação atual, miniaturas das peças | `flex-shrink: 0` |
| Mesa (centro) | as peças em disputa | `flex: 1; min-height: 0` — fica com o espaço que sobra |
| A minha área | estado, as minhas peças, barra de ações, mão | `flex-shrink: 0` |
| Sobreposições | revelação, desempate, fim de jogo, regras | modal centrado com fundo desfocado (`.modal-overlay` + `.modal-box`) |
| Tutorial | spotlight (`box-shadow` gigante) + balão de explicação | posicionado por JS em relação ao alvo |

O spotlight do tutorial é um só elemento `position: fixed` com uma sombra que cobre o ecrã todo à volta do alvo:

```css
#tut-spot {
  position: fixed; pointer-events: none; border-radius: var(--radius-md);
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, .62), 0 0 0 2px var(--brand-primary);
  transition: top .25s ease, left .25s ease, width .25s ease, height .25s ease;
}
```

### Variantes de estrutura

Nem todos os jogos têm as cinco zonas. A mais comum é esta:

**"Eu" estou na faixa de adversários, e não há mão nem barra de ações.** Há um painel por jogador, incluindo o meu (destacado), e joga-se tocando diretamente numa peça da mesa (p.ex. o Capivaras: cada jogador aposta numa das cartas da mesa). Mapeia-se assim para os termos deste guia:

| Termo do guia | Neste tipo de jogo |
|---|---|
| Faixa de adversários | faixa de **jogadores** — a mesma receita (grelha de colunas iguais, secção 4), com o meu painel lá dentro |
| Mesa | as peças em que se joga; o toque numa peça **é** a jogada |
| A minha área | estado ("A tua vez", "Apostaste na carta B") + as peças que já ganhei, em miniatura |
| Mão, barra de ações | não existem — **6.1 e 6.2 não se aplicam** |

Como não há mão a disputar altura, a mesa fica com quase todo o ecrã — e é exatamente por isso que o tamanho das peças tem de vir do espaço real (secção 4) e que o balão do tutorial precisa dos passos extra de 6.4.

### Regra de estabilidade

**Nada que mude de estado pode mudar de altura.** Se uma peça "ativa" ganha um `border` mais grosso, ou uma linha de indicadores só aparece às vezes, a mesa salta para cima e para baixo a cada jogada.

- Para "ativo/selecionado" usa `outline` (ou `box-shadow`), não `border`.
- Reserva sempre a linha de indicadores (etiqueta do dono, número de ordem), mesmo vazia — `min-height: 1.1em` ou um `&nbsp;`.
- Texto de estado que muda muito de comprimento ("A tua vez" / "Mariana Albuquerque apostou; faltam 3 jogadores") vai numa caixa de altura fixa, não numa que cresce (receita na secção 4).
- Uma fila que pode estar vazia ou cheia (as peças que já ganhei) tem `min-height` igual à da peça que lá entra — a versão vazia e a cheia ficam com a mesma altura.

---

## 2. Diagnóstico que motivou a conversão

### Bulbous (390×844, antes da conversão)

- Não havia nenhum `@media`: o layout de desktop era só espremido.
- A mesa — a zona mais importante — ficava com 200px de 844; a minha área ocupava 52% do ecrã.
- Filas com `justify-content: center` + `overflow-x: auto` transbordavam para os dois lados: o 1.º adversário e a 1.ª carta ficavam inalcançáveis.
- Na horizontal a mesa ficava com ~0px.
- Num telemóvel real (com a barra do browser) a altura útil é bem menor do que no emulador: as filas da minha área ficavam esmagadas em linhas finas.

### Capivaras (sintomas novos)

- **O ecrã de jogo era uma página que faz scroll** (`min-height: 100vh`), não uma coluna de altura fixa. A conversão faz-se **só no modo compacto** — `height: 100dvh; overflow: hidden` no ecrã de jogo, a mesa com `flex: 1; min-height: 0` (receita na secção 4) — e o desktop fica como estava.
- **Tamanho das peças por orçamento fixo**, p.ex. `calc((100vh - 610px) * 5 / 7)` ("a altura do ecrã menos o que as outras zonas ocupam"). Abaixo de ~650px de altura o orçamento dá negativo e as peças ficavam com **4px de largura**. Qualquer número mágico que desconta alturas de outras zonas parte assim; a solução é medir a célula da mesa (container queries, secção 4).
- **Painéis de regras em acordeão dentro do ecrã de jogo**, no fundo da página. Numa coluna de altura fixa não há "fundo da página": no compacto passam a bottom sheet aberta por um botão 📖 no cabeçalho (receita em 6.3).
- Com 6 jogadores, uma fila de painéis de jogador ficava com painéis de 58px, ilegíveis.

**Mede a largura das peças, não só se estão visíveis.** No Capivaras as cartas estavam todas "dentro do ecrã" — com 4px. Um teste que só verifica `left ≥ 0` e `bottom ≤ innerHeight` dá tudo verde (ver as medidas na secção 8).

Se o teu jogo tem algum destes sintomas, esta é a receita.

---

## 3. Princípios transversais (aplicar sempre)

### 3.1 Viewport

```html
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover">
```

`viewport-fit=cover` é o que permite ao jogo desenhar por baixo do notch quando está em ecrã inteiro — e é por isso que depois é preciso o `html.edge` (3.3).

### 3.2 Altura real *(no `game-ui.css`)*

```css
html, body { height: 100%; }
@supports (height: 100dvh) { html, body { height: 100dvh; } }
body   { -webkit-tap-highlight-color: transparent; overscroll-behavior: none; }
button { touch-action: manipulation; }
```

Qualquer `100vh` / `52vh` no jogo ganha a versão `dvh` logo a seguir (o browser que não conhece `dvh` fica com a primeira):

```css
max-height: 88vh; max-height: 88dvh;
```

`html, body { height: 100% }` é seguro mesmo em jogos cujas páginas fazem scroll (lobby longo, ou o ecrã de jogo em desktop, como no Capivaras): o conteúdo transborda do `body` e o documento continua a fazer scroll como antes. Confirmado com comparação de píxeis entre a versão antiga e a nova (secção 8).

### 3.3 Safe areas só quando a página ocupa o ecrã todo *(regra `html.edge` no `game-ui.css`)*

No browser normal é o próprio browser que reserva o notch e a barra de estado. Aplicar `env(safe-area-inset-*)` aí cria faixas vazias (visto em Android). Por isso as margens de topo e laterais só entram com a classe `html.edge`, posta por JS quando a página está instalada como app ou em ecrã inteiro:

```js
function isPwaInstalled() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}
function syncEdge() {
  document.documentElement.classList.toggle('edge', isPwaInstalled() || !!document.fullscreenElement);
}
document.addEventListener('fullscreenchange', syncEdge);
syncEdge();
```

```css
html.edge #game-header {           /* no game-ui.css: html.edge .game-header */
  padding-top: max(4px, env(safe-area-inset-top));
  padding-left: max(10px, env(safe-area-inset-left));
  padding-right: max(10px, env(safe-area-inset-right));
}
html.edge #screen-lobby { padding-top: max(24px, env(safe-area-inset-top)); }
```

A margem de baixo (`env(safe-area-inset-bottom)`, a barra do "home" do iPhone) pode ficar sempre — no browser normal vale 0.

### 3.4 Ecrã inteiro para esconder a barra do browser

- Em dispositivos táteis, pedir ecrã inteiro no toque que entra numa mesa / no tutorial. Tem de ser dentro de um gesto do utilizador — daí o listener `click` em fase de captura.
- Um botão ⛶ no cabeçalho, visível só no modo compacto (secção 4; como escondê-lo fora do compacto sem partir o `hidden` está em 3.9).
- **No iPhone não existe** `requestFullscreen` para páginas. A única via é instalar como PWA (`"display": "standalone"` no manifest).

```js
const canFullscreen = () =>
  !!document.documentElement.requestFullscreen && document.fullscreenEnabled && !isPwaInstalled();

function goFullscreen() {
  if (!canFullscreen() || document.fullscreenElement) return;
  document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
}

// Entra sozinho no toque que abre uma mesa / o tutorial (só em ecrã tátil).
document.addEventListener('click', e => {
  if (matchMedia('(pointer: coarse)').matches &&
      e.target.closest('.table-btn, #btn-start, #btn-tutorial, #btn-play-again'))
    goFullscreen();
}, true);

// Botão ⛶ / 🗗 no cabeçalho (acrescentar ao syncEdge):
btnFullscreen.hidden = !canFullscreen() || !isCompact();
btnFullscreen.textContent = document.fullscreenElement ? '🗗' : '⛶';
btnFullscreen.onclick = () => document.fullscreenElement
  ? document.exitFullscreen().catch(() => {})
  : goFullscreen();
```

### 3.5 Hover só em quem faz hover *(no `game-ui.css` para `.game-card` e `.hand-toggle`)*

Todos os `:hover` — sobretudo os que levantam cartas com `transform` — vão para dentro de `@media (hover: hover)`. Num ecrã tátil o `:hover` fica "preso" depois do toque, com a carta levantada até se tocar noutro sítio.

```css
@media (hover: hover) {
  .piece.clickable:hover { transform: translateY(-6px); box-shadow: var(--shadow-card-hover); }
  .btn-ghost:hover       { border-color: var(--brand-primary); }
}
```

Num ficheiro grande, organizado por componente, não juntes os `:hover` todos num bloco no fim: envolve cada um no próprio sítio, a seguir à regra do componente. Fica mais fácil de manter e o desktop não muda (em desktop `(hover: hover)` é verdade, as regras aplicam-se como antes).

```css
.btn-primary { background: var(--brand-primary); }
@media (hover: hover) { .btn-primary:hover { background: var(--brand-primary-hover); } }
```

### 3.6 Alvos de toque ≥ 44px *(no `game-ui.css` para `.btn`, `.tab`, `.hand-toggle`, `.recap-pill`)*

Botões, separadores, fechar, links de "saltar" — tudo o que se toca:

```css
@media (pointer: coarse) {
  .btn-action, .btn-close, .rules-tab, .tut-skip, #btn-leave { min-height: 44px; }
}
```

**Especificidade:** a regra genérica `(pointer: coarse) .btn { min-height: 44px }` perde para uma regra mais específica do compacto, como `.game-header .btn-sm { min-height: 34px }`. É intencional — os botões só com ícone do cabeçalho ficam a 34px para o cabeçalho caber em ~40px, e têm `min-width` igual, por isso continuam fáceis de acertar — mas é uma exceção consciente: não copies o padrão para botões de jogada.

### 3.7 Filas com scroll horizontal: margens automáticas, nunca `justify-content: center` *(no `game-ui.css` como `.game-row`)*

```css
.row > :first-child { margin-left: auto; }
.row > :last-child  { margin-right: auto; }
```

Centra quando cabe, encosta à esquerda quando não cabe. Com `justify-content: center` o conteúdo largo transborda para os dois lados e o scroll não chega ao lado esquerdo.

Para wraps verticais (várias linhas que podem transbordar):

```css
justify-content: safe center; align-content: safe center;
```

### 3.8 Nada espremido

Dentro de colunas flex com altura limitada, os filhos não encolhem — é o contentor que faz scroll se for preciso:

```css
#my-area > * { flex-shrink: 0; }
```

Sem isto, quando falta altura, o flex esmaga cada fila (mão, ações) numa linha fina em vez de fazer scroll.

### 3.9 Botões só do compacto *(`.hdr-compact` no `game-ui.css`)*

Botões que só fazem sentido no telemóvel (⛶ ecrã inteiro, 📖 regras quando em desktop as regras estão sempre visíveis): `display: none` fora dos `@media` e visíveis dentro do compacto.

**Armadilha:** o `display: inline-flex` do compacto anula o atributo `hidden` (o `display: none` de `[hidden]` vem da folha de estilos do browser, e qualquer `display` do autor ganha-lhe). O ⛶ é escondido por JS com `hidden` onde não há `requestFullscreen` (iPhone, PWA); sem a segunda regra aparecia na mesma.

```css
.hdr-compact { display: none; }
@media (max-width: 640px), (orientation: landscape) and (max-height: 500px) {
  .hdr-compact         { display: inline-flex; }
  .hdr-compact[hidden] { display: none; }
}
```

### 3.10 Copiar o `game-ui.css` para um jogo com outros nomes de tokens

A secção de telemóvel do `game-ui.css` usa os tokens do design system (`--brand-primary`, `--text-muted`, `--bg-alt`, `--color-white`, `--border`, `--radius-*`, `--font-*`, `--shadow-color-rgb`). Um jogo que já tinha a sua paleta com outros nomes (o Capivaras usa `--amber`, `--muted`, `--panel`…) tem duas saídas:

1. **Definir os tokens do design system a apontar para os do jogo**, no `:root` do jogo (`--brand-primary: var(--amber); --text-muted: var(--muted); …`), e usar o `game-ui.css` sem mexer;
2. **Copiar a secção** "Layout de jogo em telemóvel" e trocar os tokens pelos equivalentes, com esta correspondência:

| Token do design system | Papel nesta secção | Exemplo (Capivaras) |
|---|---|---|
| `--brand-primary` | realce de `.hand-toggle` ao tocar/passar | `--amber` |
| `--text-muted` | texto do `.hand-toggle` | `--muted` |
| `--bg-alt` | fundo da `.recap-pill` | `--panel` |
| `--color-white` | fundo do `.modal-box` e da `.game-sheet` | `--panel-b` |
| `--border` | contornos | `--border` |
| `--shadow-color-rgb` | fundo escurecido da `.game-sheet` | `46, 26, 10` (o rgb de `--ink`) |

Não há fallbacks no `game-ui.css` do tipo `var(--brand-primary, var(--accent))`: `--accent` seria um nome inventado, que não existe em nenhum dos dois lados, e esconderia o esquecimento em vez de o mostrar.

---

## 4. Modo compacto (telemóvel) — um só critério em CSS e JS

O mesmo critério nos dois lados, para o CSS e o JS nunca discordarem:

```css
@media (max-width: 640px), (orientation: landscape) and (max-height: 500px) { /* COMPACTO */ }
```

```js
const COMPACT_MQ = matchMedia('(max-width: 640px), (orientation: landscape) and (max-height: 500px)');
const isCompact = () => COMPACT_MQ.matches;
COMPACT_MQ.addEventListener('change', () => { syncEdge(); if (state) renderGame(state); });
```

**O CSS muda o layout; o JS decide o que desenhar** (miniaturas em vez de cartas grandes, textos curtos). Ao rodar o telemóvel o `change` redesenha.

### Se o ecrã de jogo era uma página com scroll

Converte-o em coluna de altura fixa **só dentro do compacto**; em desktop fica a página que era:

```css
/* dentro do @media COMPACTO */
#screen-game.active {
  height: 100vh; height: 100dvh; min-height: 0;
  padding: 0; overflow: hidden; align-items: stretch;
}
#screen-game.active > * { flex-shrink: 0; max-width: none; }   /* nada espremido… */
#screen-game .table-area { flex: 1 1 0; min-height: 0; margin: 0; }  /* …só a mesa encolhe */
```

(`max-width: none` e `margin: 0` desfazem o "cartão centrado" que as zonas tinham na página de desktop.)

### Cabeçalho numa linha (~40px)

- Durante a jogada, em vez do nome do jogo, mostra o progresso ("Vaza 2/4").
- Ronda e baralho em texto pequeno, `white-space: nowrap`.
- Botões só com ícone (⛶ 📖 ✕). O texto vai num `<span class="hdr-lbl">`, escondido em compacto e visível em desktop. Botões que só existem no compacto levam `.hdr-compact` (3.9).

```html
<button id="btn-rules" aria-label="Regras">📖<span class="hdr-lbl"> Regras</span></button>
```

```css
/* dentro do @media COMPACTO */
#game-header { min-height: 0; padding: 4px 8px; gap: 8px; }
.hdr-phase   { font-size: .95rem; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hdr-info    { font-size: .75rem; white-space: nowrap; }
.hdr-lbl     { display: none; }
#game-header button { min-height: 34px; min-width: 34px; padding: 0 6px;
                      display: inline-flex; align-items: center; justify-content: center; }
```

### Adversários: grelha de colunas iguais, sem scroll

Painel com 3 linhas curtas: "nome  nºcartas" / "ação" / "miniaturas".

- Nº de cartas abreviado (`🂠7`).
- Miniaturas `flex: 1 1 0` com máximo de 64px, sem o contador de texto.
- Tirar ruído ("— aguarda —"); manter o que é decisão ("⏳ A pensar…", resultado da vaza).

```css
#opponents-area {
  display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr);
  gap: 5px; padding: 5px 6px; overflow: visible;
}
.opponent-panel {
  min-width: 0; padding: 3px 6px 4px; gap: 1px 4px;
  display: grid; grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: "name meta" "action action" "pieces pieces";
}
.opp-name   { grid-area: name; font-size: .78rem; }
.opp-meta   { grid-area: meta; font-size: .72rem; }
.opp-action { grid-area: action; font-size: .72rem; min-height: 1.1em; line-height: 1.1;
              white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.opp-pieces { grid-area: pieces; display: flex; flex-wrap: nowrap; gap: 3px; margin-top: 2px; }
.mini-piece { flex: 1 1 0; min-width: 0; max-width: 64px; height: 18px; }
.mini-count { display: none; }
```

(Se o painel tinha `margin` para as margens automáticas da fila de desktop, anula-a aqui: `#opponents-area > * { margin: 0; }`.)

**Até 6 jogadores:** `grid-auto-flow: column` põe-nos todos numa linha — com 6 a 390px, painéis de 58px. Usa `auto-fit` com um mínimo legível; com 6 na vertical parte em 2 linhas de 3, na horizontal (coluna mais larga) cabem numa:

```css
.players-bar { display: grid; grid-template-columns: repeat(auto-fit, minmax(84px, 1fr)); gap: 5px; }
```

### Mesa: as peças ativas numa só fila, tamanho tirado do espaço real

A ordem de jogo lê-se da esquerda para a direita. O tamanho das peças sai do espaço que a célula da mesa tem de facto, via container queries — funciona igual na vertical e na grelha da horizontal (secção 5):

```css
#centre-area { container-type: size; flex-wrap: nowrap; gap: 10px; padding: 6px 10px; overflow: hidden; }
#centre-area .piece {
  /* 4 peças, 3 gaps de 10px = 30px; rácio 9:15; 34px = etiqueta + indicadores */
  --cw: min(calc((100cqw - 30px) / 4), calc((100cqh - 34px) * 9 / 15));
  width: var(--cw); height: calc(var(--cw) * 15 / 9);
}
#centre-area .owner-label { max-width: calc((100cqw - 30px) / 4); font-size: .7rem; }
```

Adapta ao teu jogo: `4` → nº de peças ativas, `30px` → `(n − 1) × gap`, `9 / 15` → o rácio largura/altura da peça, `34px` → a altura de tudo o que está por cima/baixo da peça dentro da célula.

`container-type: size` precisa de que a célula tenha altura definida pelo layout (`flex: 1; min-height: 0` ou uma linha de grelha) — é o caso da mesa.

### Mesa com nº de peças variável: 1 ou 2 linhas

Quando o nº de peças na mesa depende do nº de jogadores (p.ex. n de 2 a 6) **e a ordem não tem significado** (as peças identificam-se por letra, não por posição), uma fila só desperdiça a altura: 6 cartas lado a lado numa mesa alta ficam estreitas. Calcula as duas opções — uma fila de n, ou 2 linhas de ⌈n/2⌉ — e fica com a que der peças maiores:

```
--cw1: min( (100cqw − PAD − (n − 1)·GAP) / n ,        (100cqh − PADV − INFO) · RÁCIO )
--cw2: min( (100cqw − PAD − (⌈n/2⌉ − 1)·GAP) / ⌈n/2⌉ , ((100cqh − PADV − GAP) / 2 − INFO) · RÁCIO )
width: max(--cw1, --cw2)
```

`PAD`/`PADV` = padding horizontal/vertical da mesa, `GAP` = espaço entre peças, `INFO` = altura de tudo o que está na peça além da arte (faixa de informação + bordas), `RÁCIO` = largura/altura da arte. O n vem de uma variável posta pelo JS no `renderGame` (`--n-cards`), e ⌈n/2⌉ de outra (`--n-half`) — o CSS não sabe arredondar para cima.

```css
/* dentro do @media COMPACTO — exemplo do Capivaras: arte 5:7, INFO 30px, GAP 6px, padding 6px 10px */
.table-area { container-type: size; overflow: hidden; }
.table-cards {
  display: flex; flex-wrap: wrap; gap: 6px; height: 100%; padding: 6px 10px;
  justify-content: safe center; align-content: safe center;
  --cw1: min(calc((100cqw - 20px - (var(--n-cards, 3) - 1) * 6px) / var(--n-cards, 3)),
             calc((100cqh - 12px - 30px) * 5 / 7));
  --cw2: min(calc((100cqw - 20px - (var(--n-half, 2) - 1) * 6px) / var(--n-half, 2)),
             calc(((100cqh - 18px) / 2 - 30px) * 5 / 7));
}
.table-cards .card { flex: none; width: max(var(--cw1), var(--cw2)); }
```

```js
// no renderGame
area.style.setProperty('--n-cards', n);
area.style.setProperty('--n-half', Math.ceil(n / 2));
```

O `flex-wrap` com `safe center` faz o resto: não é preciso decidir em JS quantas linhas há.

**Porque nunca passa de 2 linhas:** as duas larguras são limitadas pela largura e pela altura da sua própria configuração. Se ganha `--cw1`, as n peças cabem numa fila; se ganha `--cw2`, cabem pelo menos ⌈n/2⌉ por linha, e ⌈n/2⌉ × 2 ≥ n. Em nenhum caso sobram peças para uma 3.ª linha — e a altura de 2 linhas já está contada em `--cw2`.

Números do Capivaras a 390×844 com 6 cartas: numa fila, **52px** de largura; com a fórmula, 2 linhas de 3 a **119px**.

**Faixa de informação de altura fixa.** A fórmula só funciona se `INFO` for uma constante. Etiquetas de texto ("Amarelo", "Vermelho", "Pássaro") partem linha consoante a largura da peça e o conteúdo; no compacto passam a uma faixa de **uma linha com altura fixa** — número + bolinhas de cor + ícone — desenhada pelo JS quando `isCompact()`:

```css
/* dentro do @media COMPACTO */
.card-info { height: 24px; padding: 0 6px; display: flex; align-items: center; gap: 4px;
             white-space: nowrap; overflow: hidden; }
```

### A minha área

- **As minhas peças**: faixa de miniaturas (as mesmas dos adversários), exceto na fase em que tenho de escolher uma — aí voltam as cartas grandes. Decidido em JS com `isCompact()`.
- **Menos texto**: sem crachá com o meu nome (já sei quem sou), sem rótulo "Mão"; o estado ("A tua vez") numa linha pequena.
- **Barra de ações numa linha.**
- **Mão**: cartas mais pequenas (`--card-w: 64px; --card-h: 90px`); na vertical sobra altura e sobe para 74×104.

```css
/* dentro do @media COMPACTO */
:root { --card-w: 64px; --card-h: 90px; }
#my-area { max-height: none; gap: 5px; padding: 6px 10px; padding-bottom: max(6px, env(safe-area-inset-bottom)); }
#my-area > * { flex-shrink: 0; }
#my-name-badge, #hand-label { display: none; }
#my-status  { font-size: .8rem; line-height: 1.25; }
#action-bar { flex-wrap: nowrap; gap: 6px; }
#action-bar .btn-action { flex: 1 1 auto; min-width: 0; padding: 0 6px; min-height: 42px; white-space: nowrap; }

/* Vertical: a mesa é limitada pela largura, a altura que sobra vai para a mão */
@media (max-width: 640px) and (orientation: portrait) {
  :root { --card-w: 74px; --card-h: 104px; }
}
```

**Estabilidade da minha área** (regra da secção 1, aplicada):

```css
/* dentro do @media COMPACTO */
/* Estado: sempre 2 linhas de altura, cortado com reticências se for mais comprido */
.status-text {
  min-width: 0; font-size: .78rem; line-height: 1.25; height: 2.5em;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
}
/* As minhas peças: a fila vazia tem a altura da cheia (= altura da miniatura) */
.my-scored { min-height: 60px; align-items: center; }
```

### Orçamento de altura

Vertical, 412×730 (Android com a barra do browser):

| Zona | Altura |
|---|---|
| Cabeçalho | ~40 |
| Adversários | ~64 |
| **Mesa** | **o resto (~300)** |
| Estado | 18 |
| Minhas miniaturas | 24 |
| Ações | 42 |
| Mão | ~120 |

Se a mesa ficar abaixo de ~140px num ecrã de 360×600, corta primeiro texto, depois moldura (paddings, bordas) — nunca a mesa.

---

## 5. Telemóvel na horizontal — 2 colunas

Com 300–390px de altura não dá para empilhar. Esquerda: adversários + mesa (a fórmula `--cw` continua a funcionar porque mede a célula). Direita: estado, minhas miniaturas, ações, mão.

```css
@media (orientation: landscape) and (max-height: 500px) {
  :root { --card-w: 58px; --card-h: 81px; }
  #screen-game.active {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 38%);
    grid-template-rows: auto auto minmax(0, 1fr);
    grid-template-areas: "header header" "opps my" "centre my";
  }
  html.edge #screen-game.active { padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right); }
  #game-header    { grid-area: header; padding-top: 2px; padding-bottom: 2px; }
  #opponents-area { grid-area: opps; }
  #centre-area    { grid-area: centre; }
  #my-area {
    grid-area: my; min-height: 0; overflow-y: auto;
    border-top: 0; border-left: 1px solid var(--border);
    justify-content: center;
  }
}
```

Testado a 900×300 (Android deitado com a barra) sem scroll. Se um jogo não couber de todo na horizontal, a alternativa é trancar a orientação no manifest: `"orientation": "portrait"`.

### Quando o estado e a minha área são irmãos

No Bulbous o estado está **dentro** da minha área, por isso a coluna da direita é uma só célula. Se no teu jogo o estado é um irmão da minha área (como no Capivaras, onde a barra de estado fica entre a mesa e as minhas peças), dá-lhe a sua própria célula, ao lado dos jogadores:

```css
@media (orientation: landscape) and (max-height: 500px) {
  #screen-game.active {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 34%);
    grid-template-rows: auto auto minmax(0, 1fr);
    grid-template-areas: "header header" "players status" "table my";
  }
  .players-bar { grid-area: players; }
  .table-area  { grid-area: table; }
  .status-bar  { grid-area: status; align-self: center; }
  .my-area     { grid-area: my; min-height: 0; overflow-y: auto; border-left: 1px solid var(--border); }
}
```

Valores de referência do Capivaras: coluna da direita `minmax(240px, 34%)` (sem mão, precisa de menos do que os 38% do Bulbous). Com 6 cartas a 667×375 a fórmula dá **63px** de largura — é o limite físico (6 cartas numa fila em ~430px, ou 2 linhas em ~300px de altura), e mesmo assim legível; não compensou trancar em vertical.

### Fim de jogo com muitos jogadores em ~300px

Com 6 linhas de resultado, cada píxel de altura conta:

- nome e detalhe (a contagem de peças, bónus) **na mesma linha**, com `flex-wrap` para voltar a partir se não couber: `display: flex; flex-wrap: wrap; align-items: baseline; column-gap: 8px`;
- linhas com `padding: 2px 0`;
- título a `1.15rem`, botões a `min-height: 38px`.

---

## 6. Comportamentos de jogo

### 6.1 Mão colapsável *(`.hand-toggle` no `game-ui.css`)*

Durante uma jogada, mostrar só as cartas jogáveis no alvo atual + um botão tracejado do tamanho de uma carta, "+N outras", que expande.

- Expandida: as não jogáveis ficam esbatidas (`opacity: .45`) e o botão passa a "− recolher".
- Sem nenhuma jogável: botão largo "Nenhuma carta jogável · Ver mão (7)" (`.hand-toggle.wide`).
- Mão **sempre completa** nas ações que precisam dela (trocar, descartar).
- Volta a colapsar a cada jogada nova (chave `ronda-vaza`).
- Animar só as cartas que entram (as que não estavam visíveis no render anterior).

```js
let handExpanded = false, handKey = '';

function renderHand(st) {
  const key = `${st.round}-${st.trickNo}`;
  if (key !== handKey) { handKey = key; handExpanded = false; }  // jogada nova → colapsa

  const filterable = isPlayingOnTarget(st);          // não em trocar/descartar
  const playable   = st.myHand.filter(c => canPlay(c, st.target));
  const collapsed  = filterable && !handExpanded;
  const shown      = collapsed ? playable : st.myHand;
  const hiddenN    = st.myHand.length - playable.length;

  const prevShown = new Set([...row.children].map(n => n.dataset.id));
  row.innerHTML = '';
  for (const c of shown) {
    const card = mkCard(c);
    if (filterable && !canPlay(c, st.target)) card.classList.add('unplayable');
    if (prevShown.size && !prevShown.has(c.id)) card.classList.add('hand-in');
    row.appendChild(card);
  }

  if (filterable && hiddenN > 0) {
    const none = playable.length === 0;
    const btn = document.createElement('button');
    btn.className = 'hand-toggle' + (none && collapsed ? ' wide' : '');
    btn.innerHTML = collapsed
      ? (none ? `<small>Nenhuma carta jogável</small><b>Ver mão (${st.myHand.length})</b>`
              : `<b>+${hiddenN}</b><small>outras</small>`)
      : `<b>−</b><small>recolher</small>`;
    btn.setAttribute('aria-expanded', String(!collapsed));
    btn.onclick = () => { handExpanded = !handExpanded; renderHand(st); };
    row.appendChild(btn);
  }
}
```

```css
.unplayable { opacity: .45; }
.hand-in    { animation: handIn .18s ease; }
@keyframes handIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }
```

### 6.2 Resumo automático em vez de "Continuar" *(`.recap-pill` + `.recap-timer` no `game-ui.css`)*

No fim de cada vaza, a barra de ações mostra "🏆 X ganhou a vaza" com uma barra de tempo que se esvazia (`transform: scaleX(1 → 0)`, 3s) e fecha sozinha; tocar salta.

- **Não reconstruir o elemento em cada re-render** — os bots continuam a jogar e cada estado novo redesenha a barra. Marca-o com `data-key` e sai cedo se já existe, senão a animação recomeça do zero.
- **No tutorial mantém o botão explícito** ("▶ Continuar"), porque os passos do tutorial esperam por esse evento.

```js
const RECAP_MS = 3000;

function renderRecapBar(st) {
  const bar = actionBar;
  if (!inTutorial && bar.querySelector(`.recap-pill[data-key="${recapKey}"]`)) return;  // já lá está
  bar.innerHTML = '';
  if (inTutorial) { bar.appendChild(mkBtn('▶ Continuar', closeRecap)); return; }

  const w = st.lastTrick.winner;
  const pill = document.createElement('button');
  pill.className = 'recap-pill';
  pill.textContent = w ? `🏆 ${w.name} ganhou a vaza` : 'Ninguém ganhou esta vaza';
  if (w) pill.style.color = w.colorHex;             // a barra de tempo segue (currentColor)
  const timer = document.createElement('span');
  timer.className = 'recap-timer';
  timer.style.animationDuration = RECAP_MS + 'ms';
  pill.appendChild(timer);
  pill.dataset.key = recapKey;
  pill.onclick = closeRecap;
  bar.appendChild(pill);
}
// ao abrir o resumo: if (!inTutorial) recapTimeout = setTimeout(closeRecap, RECAP_MS);
// closeRecap() faz clearTimeout(recapTimeout) — tocar e o tempo acabar vão dar ao mesmo sítio.
```

### 6.3 Sobreposições *(regras de bottom sheet no `game-ui.css` para `.modal-overlay` / `.modal-box`)*

- **Vertical compacto** (`max-width: 640px`): passam a bottom sheets — encostadas em baixo (na zona do polegar), cantos de cima arredondados, `padding-bottom` com `env(safe-area-inset-bottom)`, a subir com uma animação.
- **Horizontal**: menos moldura, linhas de tabela a 3px, `max-height: calc(100dvh - 12px)`. O fim de jogo com resultado por equipas tem de caber em 300px de altura.

Se o jogo usa classes próprias em vez de `.modal-box`, a receita é:

```css
@media (max-width: 640px) {
  .overlay { justify-content: flex-end; align-items: stretch; }
  .reveal-box, .gameover-box, .rules-box {
    width: 100%; max-width: 100%;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    border-left: 0; border-right: 0; border-bottom: 0;
    padding: 20px 16px calc(20px + env(safe-area-inset-bottom));
    max-height: 88vh; max-height: 88dvh;
    animation: sheetUp .25s ease;           /* @keyframes sheetUp no game-ui.css */
  }
}
@media (orientation: landscape) and (max-height: 500px) {
  .reveal-box, .gameover-box, .rules-box {
    max-height: calc(100vh - 12px); max-height: calc(100dvh - 12px);
    padding: 10px 18px; gap: 8px;
  }
  .score-table th, .score-table td { padding: 3px 8px; }
}
```

#### Painel não modal que passa a bottom sheet *(`.game-sheet` no `game-ui.css`)*

Um painel que em desktop está sempre no ecrã de jogo (regras em acordeão, histórico) não tem onde ficar numa coluna de altura fixa. No compacto some do fluxo e abre como bottom sheet, com um botão no cabeçalho (📖, `.hdr-compact`):

- a **mesma função** que abre/fecha o acordeão em desktop põe `.open` no painel — em desktop a classe não faz nada, e os dois modos nunca ficam dessincronizados;
- o fundo escurecido é uma sombra de `100vmax` no próprio painel — não precisa de um elemento de fundo à parte;
- se o painel tem um cabeçalho que deve ficar sempre visível (o botão de fechar do acordeão), o scroll vai para o corpo em vez do painel.

```js
function toggleRules() {
  const open = rulesBody.classList.toggle('open');       // acordeão de desktop
  rulesPanel.classList.toggle('open', open);             // no compacto: bottom sheet
}
```

```html
<section class="rules-panel game-sheet">…</section>
```

### 6.4 Balão do tutorial

Ordem de tentativa, por esta ordem:

1. por baixo do alvo;
2. por cima;
3. ao lado — se nenhum dos anteriores couber e houver ≥ 240px de largura livre; largura = `min(420, espaço)`, na coluna com mais espaço, centrado na vertical com o alvo;
4. encostado (em cima ou em baixo) ao lado com mais espaço.

Sem o passo 3, na horizontal o balão tapa exatamente o que está a explicar.

```js
function placeCoach(box, r /* rect do alvo, já com padding */) {
  const vw = innerWidth, vh = innerHeight, gap = 12;
  Object.assign(box.style, { left: '', width: '', transform: '' });
  const h = box.offsetHeight;
  const sideL = r.left - gap * 2, sideR = vw - r.right - gap * 2;
  let top;
  if (vh - r.bottom >= h + gap * 2)      top = r.bottom + gap;        // 1. por baixo
  else if (r.top >= h + gap * 2)         top = r.top - h - gap;       // 2. por cima
  else if (Math.max(sideL, sideR) >= 240) {                           // 3. ao lado
    const w = Math.min(420, Math.max(sideL, sideR));
    Object.assign(box.style, {
      width: w + 'px', transform: 'none',
      left: (sideR >= sideL ? r.right + gap : r.left - gap - w) + 'px',
    });
    const h2 = box.offsetHeight;
    top = Math.min((r.top + r.bottom) / 2 - h2 / 2, vh - h2 - gap);
  }
  else top = (r.top > vh - r.bottom) ? gap : vh - h - gap;            // 4. lado com mais espaço
  box.style.top = Math.max(gap, top) + 'px';
}
addEventListener('resize', () => placeCoach(/* … */));
```

O balão em si: `width: min(420px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); overflow-y: auto`, centrado com `left: 50%; transform: translateX(-50%)` por omissão.

#### Quando a mesa ocupa o ecrã todo: mais passos antes de tapar o alvo

Num jogo sem mão (secção 1, variantes) a mesa fica com quase todo o ecrã, e os passos 1–4 não chegam: não sobra altura nem por baixo nem por cima, nem largura ao lado com o balão na largura normal, e o passo 4 acaba a tapar o alvo. Entre o passo 3 e o 4, tenta, por esta ordem:

- **a) ao lado dos alvos, mais estreito** — largura = o espaço livre ao lado, se for ≥ 240px (se o teu passo 3 já ajusta a largura ao espaço, como o snippet acima, é o mesmo);
- **b) com vários alvos: por baixo/por cima de UM deles**, com a largura desse alvo menos ~20px. Os alvos vizinhos (p.ex. cartas lado a lado) tocam-se por causa do padding do spotlight; com a largura toda do balão, ao ficar por baixo de um, tapava o do lado;
- **c) no lado com mais espaço, mais baixo**: `max-height` = esse espaço, com scroll interno, e a barra de botões com `position: sticky; bottom: 0` para "Seguinte" ficar sempre visível.

Só depois disto o passo 4 — e, com vários alvos, melhor do que "o lado com mais espaço" é a posição que tapa menos área dos alvos.

```js
// Excerto do Capivaras (tutPlace). u = união dos alvos, rects = cada alvo (com o padding do spotlight),
// m = margem ao ecrã, maxW = largura normal do balão, ok(p) = cabe no ecrã sem tapar nenhum alvo,
// midY(r) / centreX(r) = posição centrada com o alvo, já limitada ao ecrã.
if (!hit) {                                           // a) e b): mais estreito
  const sL = u.x - m * 2, sR = vw - u.x - u.w - m * 2;
  const narrow = [[Math.max(sL, sR), () => [midY(u), sR >= sL ? u.x + u.w + 8 : u.x - cw - 8]]];
  if (rects.length > 1) rects.forEach(r => {
    const w = Math.min(r.x + r.w, vw - m) - Math.max(r.x, m) - 20;   // largura do alvo, com folga
    narrow.push([w, () => [r.y + r.h + 8, centreX(r)]], [w, () => [r.y - ch - 8, centreX(r)]]);
  });
  for (const [w, pos] of narrow) {
    if (w < 240) continue;
    box.style.width = Math.min(w, maxW) + 'px';
    cw = box.offsetWidth; ch = box.offsetHeight;      // mais estreito = mais alto: medir outra vez
    const p = pos(); if (ok(p)) { hit = p; break; }
  }
  if (!hit) { box.style.width = ''; cw = box.offsetWidth; ch = box.offsetHeight; }
}
if (!hit) {                                           // c) mais baixo, com scroll interno
  const below = vh - m - (u.y + u.h + 8), above = u.y - 8 - m;
  const sp = Math.floor(Math.max(below, above));      // Math.floor: ver abaixo
  if (sp >= 180) {
    box.style.maxHeight = sp + 'px'; ch = box.offsetHeight;
    const p = [below >= above ? u.y + u.h + 8 : u.y - ch - 8, centreX(u)];
    if (ok(p)) hit = p; else { box.style.maxHeight = ''; ch = box.offsetHeight; }
  }
}
```

```css
.tut-actions { position: sticky; bottom: 0; background: var(--color-white); }   /* a cor de fundo do balão */
```

Duas armadilhas:

- **Arredondamento.** O espaço calculado a partir de `getBoundingClientRect()` é fracionário (p.ex. 213,6px); `offsetHeight` é inteiro e arredonda para cima (214). Sem `Math.floor` no `max-height`, o teste "cabe?" falha por 0,4px e o passo c) nunca acontece.
- **Largura que fica de uma vez para a outra.** O posicionamento corre de novo a cada 250ms (os alvos mexem-se com animações e re-renders). Repõe `style.width = ''` e `style.maxHeight = ''` **no início de cada posicionamento**, e volta a medir `offsetWidth`/`offsetHeight` depois de cada tentativa — senão o balão fica preso na largura estreita de um passo anterior.

#### Ajustar o layout só enquanto o tutorial está ativo

Às vezes é o layout que tem de ceder um pouco, não o balão. Com `body:has(.tut-coach.active)` as regras só valem durante o tutorial e o jogo normal fica intocado:

```css
/* dentro do @media COMPACTO: mesa numa só fila e encostada em cima — sobra espaço por baixo para o balão */
body:has(.tut-coach.active) .table-cards        { align-content: safe flex-start; }
body:has(.tut-coach.active) .table-cards .card  { width: var(--cw1); }

/* Vertical: peças com no máximo ~40% da altura da mesa, para o balão caber por baixo num ecrã de 600px */
@media (max-width: 640px) and (orientation: portrait) {
  body:has(.tut-coach.active) .table-cards .card { width: min(var(--cw1), calc((40cqh - 30px) * 5 / 7)); }
}

/* Horizontal: mesa encostada à esquerda com uma margem extra, para o balão caber ao lado das peças */
@media (orientation: landscape) and (max-height: 500px) {
  body:has(.tut-coach.active) .table-cards { justify-content: safe flex-start; --tut-gutter: 50px; }
  /* modal no tutorial: à esquerda e mais estreito, o balão vai ao lado */
  body:has(.tut-coach.active) .overlay { justify-content: flex-start; }
  body:has(.tut-coach.active) .modal   { max-width: min(420px, 55vw); }
  /* balão mais largo e com menos moldura: com ~300px de altura cada linha conta */
  .tut-coach { width: min(460px, calc(100vw - 24px)); padding: 10px 14px 8px; }
}
```

A margem `--tut-gutter` entra na fórmula de `--cw1` (secção 4) a subtrair à largura — `calc((100cqw - 20px - var(--tut-gutter, 0px) - …) / n)` — com `0px` por omissão, para fora do tutorial não mudar nada.

#### Passos cujo alvo muda entre desktop e telemóvel

Um passo "as regras estão aqui" aponta, em desktop, para o painel de regras e, no telemóvel, para o botão 📖 (o painel está escondido até se abrir). Em vez de um alvo, cada passo tem uma **lista de alternativas**; as que têm tamanho 0 (escondidas) são filtradas e fica o que estiver visível:

```js
{ id: 'regras', title: 'Regras sempre à mão', target: ['.rules-panel', '#btn-rules-game'], … }

function tutTargets() {
  const s = TUT_STEPS[tut.step]; if (!s?.target) return [];
  return s.target.flatMap(sel => [...document.querySelectorAll(sel)])
    .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
}
```

---

## 7. Assets

- **Servir imagens ao tamanho de ecrã, não de impressão.** O Bulbous tinha PNG de 900px (0,7–1,3MB cada, 35MB no total) para cartas mostradas a 60–130px. WebP redimensionado (peças grandes a 400px de largura, cartas a 270px, qualidade 82) → 767KB no total, 46× menos.
- **Mas mede o maior tamanho a que a peça aparece, não só no telemóvel.** Abre o jogo em desktop grande (1920×1080) e vê a largura CSS máxima da peça; a largura da imagem é essa × o DPR que queres servir bem (2). No Capivaras as cartas chegam a 300px CSS em desktop, por isso 600px de largura em WebP q82 é o certo: 15,3MB → 672KB (24×), sem baixar a resolução em lado nenhum.
- **Um ícone grande reutilizado como imagem pequena.** O `bird.png` do Capivaras (512px, 374KB — o ícone da app) aparecia na interface a 22px. Gera uma versão pequena (64px WebP, ~1KB) para a interface e deixa a grande só para o manifest e o `apple-touch-icon`.
- **O áudio também conta.** Um som ambiente de 25MB a 320kbps com `preload="auto"` era o maior peso da página do Capivaras — descarregado por quem nunca o ligou. 96kbps chega para ambiente (7,2MB), e `preload="none"`: o `play()` carrega quando é preciso.
- **Originais de alta resolução fora da pasta servida** (`art/<coisa>-original/`, `art/audio-original/`).
- **Coordenadas medidas nas imagens sempre em percentagem**, para sobreviverem ao redimensionamento.
- **Service worker cache-first**: mudar o nome da cache quando os assets mudam, senão os telemóveis ficam com as imagens antigas. Se o service worker **não guarda cache** (só existe para a app ser instalável, como no Capivaras), não há nome de cache para mudar; e mudar a extensão (`.png` → `.webp`) é um URL novo, o que também contorna o `Cache-Control` do browser.

Exemplo com `cwebp` (ou `sharp`/ImageMagick, o que houver):

```bash
cwebp -q 82 -resize 270 0 art/cartas-original/carta-01.png -o public/cards/carta-01.webp
```

Sem `cwebp`, o Pillow também faz WebP (com `method=6` é lento: ~2 min para 19 imagens grandes):

```python
from PIL import Image
im = Image.open('art/cards-original/carta-01.png')
im.thumbnail((600, 10_000), Image.LANCZOS)
im.save('public/cards/carta-01.webp', 'WEBP', quality=82, method=6)
```

E o áudio, p.ex. com `ffmpeg`:

```bash
ffmpeg -i art/audio-original/ambient.mp3 -b:a 96k public/ambient.mp3
```

---

## 8. Checklist de testes (antes de dar por feito)

**Tamanhos:** 390×844, 412×730 (Android com barra), 360×600, 844×390, 900×300 (Android deitado com barra), 667×375, e desktop 1280×800.

**Cenários** (em cada tamanho): jogada com o nº **máximo** de jogadores e nomes compridos, revelação/resumo, fim de jogo, regras abertas, e o tutorial percorrido **passo a passo** (cada passo verificado, não só o primeiro).

Em cada um:

- [ ] `document.documentElement.scrollWidth === innerWidth` (sem scroll horizontal da página);
- [ ] sem scroll vertical da página no compacto (para jogos cujo ecrã de jogo era uma página);
- [ ] a minha área: `scrollHeight === clientHeight` (sem scroll);
- [ ] o 1.º adversário e a 1.ª carta começam em `left ≥ 0`;
- [ ] todas as peças da mesa visíveis, **com uma largura legível** (medida, não só "dentro do ecrã" — secção 2), e os indicadores legíveis;
- [ ] sobreposições (sobretudo o fim de jogo com equipas / com o máximo de jogadores) sem scroll interno;
- [ ] balão do tutorial sem sobrepor os anéis do spotlight, em todos os passos;
- [ ] alturas de cada zona (cabeçalho, jogadores, estado, a minha área) iguais entre estados — a regra de estabilidade verificada, não só lida;
- [ ] desktop igual ao de antes, **com diferença de píxeis** (ver abaixo).

**Num telemóvel real:** ecrã inteiro ao entrar numa mesa, sem faixas vazias, imagens a carregar rápido.

Para colar na consola do browser (IDs do Bulbous — troca pelos do teu jogo):

```js
(() => {
  const d = document.documentElement, q = s => document.querySelector(s), my = q('#my-area');
  const first = s => q(s)?.getBoundingClientRect().left;
  const h = s => Math.round(q(s)?.getBoundingClientRect().height);
  const modal = q('.modal-overlay.active .modal-box'), coach = q('#tut-coach.active');
  let coachOverlap = null;                            // balão × anéis do spotlight, tolerância 6px
  if (coach) {
    const c = coach.getBoundingClientRect(), t = 6;
    coachOverlap = [...document.querySelectorAll('.tut-ring, #tut-spot')].some(el => {
      const r = el.getBoundingClientRect();
      return !(c.bottom <= r.top + t || c.top >= r.bottom - t || c.right <= r.left + t || c.left >= r.right - t);
    });
  }
  return {
    size: `${innerWidth}×${innerHeight}`,
    coarse: matchMedia('(pointer: coarse)').matches, hover: matchMedia('(hover: hover)').matches,
    pageNoHScroll: d.scrollWidth === innerWidth,
    pageVScroll: Math.max(0, d.scrollHeight - innerHeight),
    myAreaNoScroll: my.scrollHeight === my.clientHeight,
    firstOpponentLeft: first('#opponents-area > :first-child'),
    firstCardLeft: first('#my-hand-row > :first-child'),
    centreHeight: q('#centre-area').clientHeight,
    pieceW: Math.round(q('#centre-area .piece')?.getBoundingClientRect().width),
    modalScroll: modal ? modal.scrollHeight - modal.clientHeight : null,
    coachOverlap,
    heights: { header: h('#game-header'), opps: h('#opponents-area'), my: h('#my-area') },  // comparar entre estados
  };
})()
```

### Harness reprodutível: [`tools/layout-check.js`](../tools/layout-check.js)

Medir à mão na consola não escala para 8 tamanhos × 6 cenários × os passos todos do tutorial. O `tools/layout-check.js` faz tudo isto com Chrome headless por CDP — sem Playwright nem dependências (Node ≥ 22, `WebSocket` nativo). Cada jogo só escreve uma configuração com os seus seletores e cenários:

```bash
node ../bitnikgames-design-system/tools/layout-check.js tools/layout-check.config.mjs --tag antes
```

```bash
node ../bitnikgames-design-system/tools/layout-check.js compare tools/layout-check/antes tools/layout-check/depois
```

A 1.ª corrida arranca o servidor do jogo (se a configuração tiver `server`), mede os tamanhos do guia mais 1920×1080 em cada cenário, percorre o tutorial e escreve as capturas, um `metrics.json` e a lista de falhas (termina com código 1 se houver). A 2.ª compara duas corridas píxel a píxel (para o "desktop igual ao de antes") e guarda as diferenças a vermelho. `--help` mostra as opções (`--url`, `--sizes`, `--scenarios`, `--tut-shots`…).

A configuração é um módulo ES. As funções correm **dentro da página** (são serializadas), por isso usam as globais do jogo e não podem usar variáveis de fora delas:

```js
export default {
  server: { cmd: 'node', args: ['server.js'], cwd: '..', env: { PORT: '3027' } },
  url: 'http://localhost:3027/',
  storage: { jogo_tut_hint_off: '1' },          // localStorage limpo e posto assim antes de cada página
  ready: () => typeof tutStart === 'function',
  selectors: {
    screen: '#s-game.active',                   // se o ecrã faz scroll por dentro (overflow-y: auto)
    zones: { cabecalho: '.gtop', jogadores: '#pbar', mesa: '.gboard', mao: '.hand-footer' },
    rows: ['#pbar > :first-child', '#hcards > :first-child'],   // têm de começar em left ≥ 0
    noScroll: ['.hand-footer'],
    pieces: { mesa: '#bwrap svg g[onclick]', carta: '#hcards .card' },  // largura mínima + dentro do ecrã
    modal: '.overlay.on .modal',
    coach: '#tut-coach.on', rings: '.tut-ring',
  },
  minPieceWidth: { mesa: 44, carta: 40 },
  stableAcross: ['inicio', 'meio', 'cheio'],   // alturas das zonas iguais entre estes cenários
  scenarios: {
    meio: () => { tutStart(); /* esconder o balão */ tutLoad(tutMidGame('Maximiliano Albu')); },
    // …
  },
  tutorial: {
    start: () => tutStart(),
    step: () => TUT ? TUT_STEPS[TUT.i].id : null,
    last: () => TUT.i === TUT_STEPS.length - 1,
    advance: () => { const b = [...document.querySelectorAll('#tut-acts .btn')].pop(); b?.click(); return !!b; },
  },
};
```

Exemplo completo: `tools/layout-check.config.mjs` no repositório do Catania.

O que o harness faz por dentro — útil se precisares de o adaptar:

1. Arranca o Chrome com `--headless=new --remote-debugging-port=0` e um perfil temporário (a porta escolhida vem no ficheiro `DevToolsActivePort` do perfil).
2. Abre um separador: `PUT http://127.0.0.1:<porta>/json/new?about:blank` → `webSocketDebuggerUrl`.
3. Em cada tamanho, emula um telemóvel **de facto** — não só a largura:

```js
await cmd('Emulation.setDeviceMetricsOverride', {
  width: w, height: h, deviceScaleFactor: 1, mobile: w < 1000,
  screenOrientation: w > h ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 },
});
// maxTouchPoints tem de ser ≥ 1 mesmo em desktop (com enabled: false), senão dá erro
await cmd('Emulation.setTouchEmulationEnabled', { enabled: w < 1000, maxTouchPoints: w < 1000 ? 5 : 1 });
```

   Assim `(pointer: coarse)` e `(hover: none)` ficam ativos como num telemóvel — o harness confirma-o com `matchMedia` em cada medida e dá falha se não, senão estarias a testar regras de toque que nunca se aplicaram.

4. Em cada cenário: `Page.navigate`, correr o cenário com `Runtime.evaluate` (`awaitPromise: true`), esperar pelas animações e pelas imagens visíveis, medir, `Page.captureScreenshot`. O service worker e a cache HTTP ficam desligados (`Network.setBypassServiceWorker`, `Network.setCacheDisabled`), para medir sempre os ficheiros atuais.
5. **Scroll dentro do ecrã, não só do documento.** Se o ecrã de jogo tem `overflow-y: auto` (o Catania, antes da conversão), o documento não faz scroll e `scrollHeight − innerHeight` dá 0. Mede também o próprio ecrã (`selectors.screen`).

**Cenários deterministas, montados no cliente.** Jogos aleatórios contra bots não dão o pior caso quando é preciso (6 jogadores, o nome mais comprido, a fila das minhas peças cheia). Se o jogo tem um tutorial com estado fictício (o Capivaras monta estados com o próprio motor do jogo), usa-o: arranca o tutorial, esconde o balão, e escreve diretamente no estado (jogadores, mesa, peças ganhas, fase) antes de chamar o render. Para o tutorial, percorre todos os passos com a função que avança de passo e mede o balão em cada um.

**Esperar pelo fim das animações** antes de medir posições: as bottom sheets sobem em `.25s` (`sheetUp`), e um spotlight medido a meio da subida aponta para o sítio errado. O harness espera por `document.getAnimations()` (animações e transições CSS finitas) e mais dois frames; à mão, ~350ms depois de o cenário estar montado chega.

**Desktop "igual ao de antes" com diferença de píxeis.** Corre a versão original (p.ex. um `git worktree` do commit anterior, noutra porta, com `--url`) e a nova, a 1280×800 e 1920×1080, com os mesmos cenários, e compara as capturas (`layout-check.js compare`, ou o Pillow: `ImageChops.difference(a, b).getbbox()` — `None` = iguais). Cuidados:

- se os **assets** também mudaram (WebP no lugar de PNG), põe a versão original a servir os assets novos — senão a diferença das imagens esconde a do layout;
- o `localStorage` é **por origem**: portas diferentes = estado diferente. Avisos de "primeira vez", sons ligados, nome guardado, dão falsas diferenças — o harness limpa-o e põe o `storage` da configuração antes de cada página;
- se já houver um servidor na porta da configuração (outro jogo, uma versão antiga ainda a correr), o harness recusa-se a medir em vez de medir o servidor errado.

---

## 9. O que já está no `game-ui.css`

Secção "Layout de jogo em telemóvel" no fim de [`src/game-ui.css`](../src/game-ui.css). Usa só tokens existentes e classes genéricas; vem de graça ao importar o ficheiro:

| Regra / classe | Secção deste documento |
|---|---|
| `html, body` a `100dvh`, tap-highlight, `overscroll-behavior`, `touch-action` | 3.2 |
| `.game-card.is-clickable:hover` dentro de `@media (hover: hover)` | 3.5 |
| `min-height: 44px` em `(pointer: coarse)` para `.btn`, `.tab`, `.hand-toggle`, `.recap-pill` | 3.6 |
| `.game-row` (fila com scroll e margens automáticas) | 3.7 |
| `html.edge .game-header` | 3.3 |
| `.hdr-compact` (+ a regra do `[hidden]` dentro do compacto) | 3.9 |
| `.hand-toggle` (+ `.wide`) | 6.1 |
| `.recap-pill` + `.recap-timer` + `@keyframes recapDrain` | 6.2 |
| `.modal-overlay` / `.modal-box` como bottom sheet (vertical) e com menos moldura (horizontal) + `@keyframes sheetUp` | 6.3 |
| `.game-sheet` + `.open`: painel não modal como bottom sheet no compacto, fundo escurecido com sombra de `100vmax` | 6.3 |

Fica **só como receita** (depende da estrutura HTML de cada jogo): a coluna/grelha do ecrã de jogo e a conversão de página em coluna (1, 4, 5), as fórmulas `--cw` / `--cw1` / `--cw2` da mesa (4), os painéis de adversário/jogador (4), o cabeçalho compacto (4), a caixa de estado de 2 linhas (4), os ajustes com `body:has(.tut-coach.active)` (6.4), o JS de ecrã inteiro, mão colapsável, resumo e balão (3.4, 6) — incluindo a barra de botões `sticky` do balão, porque o balão em si não está no `game-ui.css`.

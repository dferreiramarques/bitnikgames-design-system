# Layout de jogos e conversão para mobile

Como está organizado o ecrã de um jogo do catálogo "jogar online" da bitnikgames em desktop, e como se converte para telemóvel (vertical e horizontal) sem o espremer.

Está escrito em termos genéricos (**mesa**, **peças ativas**, **mão**, **adversários**) para servir a qualquer jogo. A implementação de referência é o [Bulbous](https://github.com/dferreiramarques/bulbous) (ficheiro único `client.html`; commits `953d526`, `81e8169`, `02f1532`) — aparece aqui só como exemplo, com os seus IDs (`#centre-area`, `#my-area`…) nos snippets. Troca-os pelos do teu jogo.

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

### Regra de estabilidade

**Nada que mude de estado pode mudar de altura.** Se uma peça "ativa" ganha um `border` mais grosso, ou uma linha de indicadores só aparece às vezes, a mesa salta para cima e para baixo a cada jogada.

- Para "ativo/selecionado" usa `outline` (ou `box-shadow`), não `border`.
- Reserva sempre a linha de indicadores (etiqueta do dono, número de ordem), mesmo vazia — `min-height: 1.1em` ou um `&nbsp;`.

---

## 2. Diagnóstico que motivou a conversão

Bulbous a 390×844, antes da conversão:

- Não havia nenhum `@media`: o layout de desktop era só espremido.
- A mesa — a zona mais importante — ficava com 200px de 844; a minha área ocupava 52% do ecrã.
- Filas com `justify-content: center` + `overflow-x: auto` transbordavam para os dois lados: o 1.º adversário e a 1.ª carta ficavam inalcançáveis.
- Na horizontal a mesa ficava com ~0px.
- Num telemóvel real (com a barra do browser) a altura útil é bem menor do que no emulador: as filas da minha área ficavam esmagadas em linhas finas.

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
- Um botão ⛶ no cabeçalho, visível só no modo compacto (secção 4).
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

### 3.6 Alvos de toque ≥ 44px *(no `game-ui.css` para `.btn`, `.tab`, `.hand-toggle`, `.recap-pill`)*

Botões, separadores, fechar, links de "saltar" — tudo o que se toca:

```css
@media (pointer: coarse) {
  .btn-action, .btn-close, .rules-tab, .tut-skip, #btn-leave { min-height: 44px; }
}
```

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

### Cabeçalho numa linha (~40px)

- Durante a jogada, em vez do nome do jogo, mostra o progresso ("Vaza 2/4").
- Ronda e baralho em texto pequeno, `white-space: nowrap`.
- Botões só com ícone (⛶ 📖 ✕). O texto vai num `<span class="hdr-lbl">`, escondido em compacto e visível em desktop.

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

---

## 7. Assets

- **Servir imagens ao tamanho de ecrã, não de impressão.** O Bulbous tinha PNG de 900px (0,7–1,3MB cada, 35MB no total) para cartas mostradas a 60–130px. WebP redimensionado (peças grandes a 400px de largura, cartas a 270px, qualidade 82) → 767KB no total, 46× menos.
- **Originais de alta resolução fora da pasta servida** (`art/<coisa>-original/`).
- **Coordenadas medidas nas imagens sempre em percentagem**, para sobreviverem ao redimensionamento.
- **Service worker cache-first**: mudar o nome da cache quando os assets mudam, senão os telemóveis ficam com as imagens antigas.

Exemplo com `cwebp` (ou `sharp`/ImageMagick, o que houver):

```bash
cwebp -q 82 -resize 270 0 art/cartas-original/carta-01.png -o public/cards/carta-01.webp
```

---

## 8. Checklist de testes (antes de dar por feito)

**Tamanhos:** 390×844, 412×730 (Android com barra), 360×600, 844×390, 900×300 (Android deitado com barra), 667×375, e desktop 1280×800.

Em cada um, **durante uma jogada**:

- [ ] `document.documentElement.scrollWidth === innerWidth` (sem scroll horizontal da página);
- [ ] a minha área: `scrollHeight === clientHeight` (sem scroll);
- [ ] o 1.º adversário e a 1.ª carta começam em `left ≥ 0`;
- [ ] todas as peças da mesa visíveis, com os indicadores legíveis;
- [ ] sobreposições (sobretudo o fim de jogo com equipas) sem scroll;
- [ ] balão do tutorial sem sobrepor o spotlight;
- [ ] desktop visualmente igual ao de antes.

**Num telemóvel real:** ecrã inteiro ao entrar numa mesa, sem faixas vazias, imagens a carregar rápido.

Para colar na consola do browser (IDs do Bulbous — troca pelos do teu jogo):

```js
(() => {
  const d = document.documentElement, my = document.querySelector('#my-area');
  const first = s => document.querySelector(s)?.getBoundingClientRect().left;
  return {
    size: `${innerWidth}×${innerHeight}`,
    pageNoHScroll: d.scrollWidth === innerWidth,
    myAreaNoScroll: my.scrollHeight === my.clientHeight,
    firstOpponentLeft: first('#opponents-area > :first-child'),
    firstCardLeft: first('#my-hand-row > :first-child'),
    centreHeight: document.querySelector('#centre-area').clientHeight,
  };
})()
```

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
| `.hand-toggle` (+ `.wide`) | 6.1 |
| `.recap-pill` + `.recap-timer` + `@keyframes recapDrain` | 6.2 |
| `.modal-overlay` / `.modal-box` como bottom sheet (vertical) e com menos moldura (horizontal) + `@keyframes sheetUp` | 6.3 |

Fica **só como receita** (depende da estrutura HTML de cada jogo): a coluna/grelha do ecrã de jogo (1, 5), a fórmula `--cw` da mesa (4), os painéis de adversário (4), o cabeçalho compacto (4), o JS de ecrã inteiro, mão colapsável, resumo e balão (3.4, 6).

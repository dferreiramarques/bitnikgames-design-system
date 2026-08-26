# @bitnikgames/design-system

Tokens e componentes base do design system da bitnikgames, extraídos do site oficial (`bitnikgames.vercel.app`) para reutilizar noutros projetos e manter consistência visual entre eles.

CSS puro, zero dependências, zero build step obrigatório — funciona em qualquer projeto (Astro, React, Vue, HTML simples, o que for).

## Instalar

### Via npm (num projeto com bundler)

```bash
npm install git+https://github.com/dferreiramarques/bitnikgames-design-system.git
```

```css
@import "@bitnikgames/design-system/src/index.css";
```

### Sem npm (HTML simples)

Copia a pasta `src/` para o teu projeto, ou aponta um `<link>` para os ficheiros publicados (ex. via jsDelivr a partir do GitHub):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/dferreiramarques/bitnikgames-design-system@main/src/index.css" />
```

## Carregar as fontes

O CSS só define a *stack* (`--font-display`, `--font-body`) — não carrega as fontes. Adiciona isto ao `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

## Fazer uma "skin"

Tudo o que precisas de mudar para adaptar isto a outra marca está em `src/tokens.css` — os outros dois ficheiros (`base.css`, `components.css`) nunca têm cores/fontes fixas, só referenciam os tokens. Usa a [página de skin picker](skin-builder/index.html) (abre `skin-builder/index.html` no browser, ou publica-a via GitHub Pages) para escolher paleta e Google Fonts visualmente e exportar um `tokens.css` novo.

Skinar à mão é só substituir os valores no topo do ficheiro:

```css
:root {
  --color-yellow: #e8a93b;   /* cor 1 da paleta */
  --color-orange: #ea7c2e;   /* cor 2 da paleta */
  --color-brick: #b8461f;    /* cor 3 da paleta — vira --brand-primary */
  --color-cream: #fbf3e4;    /* fundo */
  --color-ink: #2b1b12;      /* texto */
  --font-display: "Baloo 2", sans-serif;
  --font-body: "Inter", sans-serif;
}
```

## Tokens

| Token | Valor por omissão | Uso |
|---|---|---|
| `--color-yellow` / `--color-yellow-deep` | `#e8a93b` / `#c4841f` | acentos, hover |
| `--color-orange` / `--color-orange-deep` | `#ea7c2e` / `#c85f1d` | secundário, gradientes |
| `--color-brick` / `--color-brick-deep` | `#b8461f` / `#8f3417` | primário (`--brand-primary`) |
| `--color-cream` / `--color-cream-soft` / `--color-cream-strong` | `#fbf3e4` / `#f3e4cb` / `#ecd6ac` | fundo, fundo alt, contornos |
| `--color-ink` / `--color-ink-soft` | `#2b1b12` / `#5b4636` | texto principal / secundário |
| `--color-white` | `#fffaf1` | branco quente (cartões) |
| `--radius-sm` / `--radius-md` / `--radius-lg` / `--radius-pill` | `8px` / `14px` / `24px` / `999px` | cantos |
| `--shadow-card` / `--shadow-card-hover` | — | sombra de cartões, deriva de `--shadow-color-rgb` |
| `--font-display` | `"Baloo 2"` | títulos |
| `--font-body` | `"Inter"` | corpo de texto |
| `--container-width` | `1120px` | largura máxima do `.container` |

Tokens semânticos (`--bg`, `--text`, `--brand-primary`, etc.) apontam para os tokens de cor acima — muda a cor de base, o semântico segue.

## Componentes incluídos

- **Layout**: `.container`, `.section`, `.section-head`, `.eyebrow`, `.grid` / `.grid-3` / `.grid-4` (responsivo)
- **Botões**: `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-outline` / `.btn-ghost` / `.btn-block`
- **Badges**: `.badge` + `.badge-accent` / `.badge-primary` / `.badge-secondary` / `.badge-outline` / `.badge-ink`
- **Cartões**: `.card`, `.card-media`, `.card-body`, `.card-meta`, `.card-title`, `.card-excerpt`, `.card-footer`
- **Páginas de detalhe** (opcional): `.detail-grid`, `.detail-media`, `.back-link`, `.detail-lede`, `.detail-tags`, `.detail-content`

Nota sobre os badges: no site da bitnikgames os nomes são específicos ao domínio (`badge-free`, `badge-paid`, `badge-pwyw`...). Aqui generalizei para nomes semânticos (`badge-accent`, `badge-primary`...) para o pacote fazer sentido fora do contexto de "jogos". Se importares isto de volta para o site da bitnikgames, os nomes não batem certo — usa um mapeamento ou ajusta as classes lá.

## Camada opcional: UI de jogo (`game-ui.css`)

Não é importada por `index.css` — só faz sentido em projetos com UI de jogo (tabuleiro, cartas). Extraída do primeiro jogo integrado no catálogo "jogar online" da bitnikgames ([Bulbous](https://github.com/dferreiramarques/bulbous)).

```css
@import "@bitnikgames/design-system/src/game-ui.css";
```

- **`.chip` + `.chip-1..4`** — pill de 3 tons (contorno + fundo diluído + texto na cor), para referenciar cor de equipa/jogador/naipe. Usa os tokens `--game-color-1..4` (por omissão apontam para as 3 cores de marca + `--text-muted`; sobrescreve-os por jogo).
- **`.game-card`** (+ `.is-clickable` / `.is-selected` / `.is-disabled`) e **`.game-card-bar`** — carta/peça com imagem, hover-lift, anel de seleção, barra inferior de info.
- **`.badge-circle`** — numeração circular sobreposta a uma peça (ordem de jogo, prioridade).
- **`.modal-overlay`** + **`.modal-box`** — modal genérico (fundo desfocado + caixa centrada).
- **`.tabs`** + **`.tab`** (`.active`) — tabs simples, mesmo padrão já usado na Bitnik Box Machine.
- **`.toast`** — notificação transitória, centrada em baixo.

## Estrutura

```
src/
  tokens.css       — cor, tipografia, forma, sombra (a única camada "skinnable")
  base.css          — reset + elementos base (body, headings, links, focus)
  components.css     — layout, botões, badges, cartões
  game-ui.css         — opcional: cartas, chips, modais, tabs, toasts (jogos)
  index.css          — importa tokens+base+components, pela ordem certa (não inclui game-ui.css)
skin-builder/
  index.html         — gerador visual de skins (escolhe paleta + Google Fonts, exporta tokens.css)
```

## Jogos integrados

- [Bulbous](https://github.com/dferreiramarques/bulbous) — cores próprias (tema escuro, acento lilás `#c084fc`, 4 cores de peça vermelho/azul/verde/amarelo), tipografia/raio/sombra do design system partilhado.
- [Capivaras](https://github.com/dferreiramarques/capivaras) — cores próprias (tema claro e quente, âmbar `#c47c28` + teal `#5bbfb6`), tipografia/raio/sombra do design system partilhado. Primeiro jogo a usar `--shadow-color-rgb` corretamente (sombra tingida ao `--ink` claro da skin, em vez de preto fixo).
- [Catania](https://github.com/dferreiramarques/catania-v2) — cores próprias (tema antigo/dourado, `#c9a84c` sobre quase-preto `#0d0b08`), tipografia/raio/sombra do design system partilhado. Tem texto desenhado em SVG (o mapa de hexágonos do tabuleiro) — `var(--font-display)` funciona normalmente num atributo `font-family` de SVG, desde que o SVG esteja inserido no documento via `innerHTML` (não um `.svg` externo).

## Origem

Extraído de [bitnikgames.vercel.app](https://bitnikgames.vercel.app) em 2026, para manter consistência visual entre esse site e outros projetos futuros.

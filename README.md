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
- **Botões**: `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-outline` / `.btn-block`
- **Badges**: `.badge` + `.badge-accent` / `.badge-primary` / `.badge-secondary` / `.badge-outline` / `.badge-ink`
- **Cartões**: `.card`, `.card-media`, `.card-body`, `.card-meta`, `.card-title`, `.card-excerpt`, `.card-footer`
- **Páginas de detalhe** (opcional): `.detail-grid`, `.detail-media`, `.back-link`, `.detail-lede`, `.detail-tags`, `.detail-content`

Nota sobre os badges: no site da bitnikgames os nomes são específicos ao domínio (`badge-free`, `badge-paid`, `badge-pwyw`...). Aqui generalizei para nomes semânticos (`badge-accent`, `badge-primary`...) para o pacote fazer sentido fora do contexto de "jogos". Se importares isto de volta para o site da bitnikgames, os nomes não batem certo — usa um mapeamento ou ajusta as classes lá.

## Estrutura

```
src/
  tokens.css       — cor, tipografia, forma, sombra (a única camada "skinnable")
  base.css          — reset + elementos base (body, headings, links, focus)
  components.css     — layout, botões, badges, cartões
  index.css          — importa os três, pela ordem certa
skin-builder/
  index.html         — gerador visual de skins (escolhe paleta + Google Fonts, exporta tokens.css)
```

## Origem

Extraído de [bitnikgames.vercel.app](https://bitnikgames.vercel.app) em 2026, para manter consistência visual entre esse site e outros projetos futuros.

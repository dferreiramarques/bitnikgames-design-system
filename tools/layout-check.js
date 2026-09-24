#!/usr/bin/env node
// layout-check — mede o layout de um jogo em vários tamanhos de ecrã, com
// Chrome headless por CDP. Receita e medidas em docs/game-layout.md, secção 8.
//
//   node tools/layout-check.js <config.mjs> [opções]
//   node tools/layout-check.js compare <pastaA> <pastaB> [--out <pasta>]
//
// Opções:
//   --url <url>          sobrepõe config.url (e não arranca config.server)
//   --out <pasta>        onde ficam capturas e metrics.json (omissão: layout-check/<tag>)
//   --tag <nome>         nome desta corrida (omissão: "atual")
//   --sizes 390x844,...  tamanhos (omissão: config.sizes ou a lista do guia)
//   --scenarios a,b      cenários (omissão: todos os de config.scenarios + "tutorial")
//   --tut-shots          uma captura por passo do tutorial (omissão: só as medidas)
//   --dpr <n>            deviceScaleFactor (omissão: 1)
//
// Falhas: scroll da página/ecrã no compacto, peças estreitas ou fora do ecrã,
// linhas que começam fora do ecrã, modais com scroll, texto cortado
// (selectors.noTruncate), balão sobre um alvo do tutorial, zonas que mudam de
// altura entre cenários (stableAcross), e toque que não ficou emulado.
//
// Requisitos: Node >= 22 (WebSocket nativo) e Chrome/Chromium/Edge instalado
// (ou o caminho em CHROME=...). Sem dependências.
//
// A configuração é um módulo ES que exporta um objeto (ver o exemplo em
// docs/game-layout.md). As funções de cenário, ready, tutorial.* e extra
// correm DENTRO da página: são serializadas com toString(), por isso não
// podem usar variáveis de fora delas.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const COMPACT = '(max-width: 640px), (orientation: landscape) and (max-height: 500px)';
const SIZES = ['390x844', '412x730', '360x600', '844x390', '900x300', '667x375', '1280x800', '1920x1080'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------- argumentos
const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf('--' + name); return i < 0 ? def : argv[i + 1]; };
const flag = name => argv.includes('--' + name);

if (typeof WebSocket === 'undefined') {
  console.error('Precisa de Node >= 22 (WebSocket nativo). Tens ' + process.version + '.');
  process.exit(2);
}
if (!argv[0] || argv[0] === '--help' || argv[0] === '-h') {
  // a ajuda é o comentário do cabeçalho, até à primeira linha que não é comentário
  const head = fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1);
  console.log(head.slice(0, head.findIndex(l => !l.startsWith('//'))).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}

// ------------------------------------------------------------------- Chrome
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const c = {
    win32: [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    ],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ],
    linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'],
  }[process.platform] || [];
  const found = c.find(p => fs.existsSync(p));
  if (!found) throw new Error('Não encontrei o Chrome. Indica o caminho com CHROME=...');
  return found;
}

async function launchChrome() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'layout-check-'));
  const proc = spawn(findChrome(), [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', 'about:blank',
  ], { stdio: 'ignore' });
  // Com a porta 0 o Chrome escolhe uma livre e escreve-a em DevToolsActivePort
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
  if (!fs.existsSync(portFile)) { proc.kill(); throw new Error('O Chrome não arrancou.'); }
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0].trim();
  const close = () => {
    proc.kill();
    setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} }, 500);
  };
  return { port, close };
}

async function openPage(port) {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = m => {
    const o = JSON.parse(m.data);
    if (o.id && pending.has(o.id)) { pending.get(o.id)(o); pending.delete(o.id); }
    else listeners.forEach(fn => fn(o));
  };
  const cmd = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, o => o.error ? rej(new Error(`${method}: ${o.error.message}`)) : res(o.result));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const once = method => new Promise(res => { const fn = o => { if (o.method === method) { listeners.splice(listeners.indexOf(fn), 1); res(o.params); } }; listeners.push(fn); });
  const ev = async expr => {
    const r = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 500));
    return r.result.value;
  };
  await cmd('Page.enable'); await cmd('Runtime.enable'); await cmd('Network.enable');
  return { cmd, ev, once, close: () => ws.close() };
}

const shot = async (page, file) => {
  const s = await page.cmd('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(file, Buffer.from(s.data, 'base64'));
};

// ------------------------------------------------------------- modo compare
// Diferença de píxeis entre duas pastas de capturas (mesmos nomes de ficheiro),
// feita no próprio Chrome com <canvas> — sem dependências de imagem.
if (argv[0] === 'compare') {
  const [, a, b] = argv;
  const out = opt('out', path.join(b, 'diff'));
  fs.mkdirSync(out, { recursive: true });
  const { port, close } = await launchChrome();
  const page = await openPage(port);
  const rows = [];
  for (const f of fs.readdirSync(a).filter(f => f.endsWith('.png'))) {
    if (!fs.existsSync(path.join(b, f))) { rows.push({ file: f, result: 'só em A' }); continue; }
    const da = 'data:image/png;base64,' + fs.readFileSync(path.join(a, f)).toString('base64');
    const db = 'data:image/png;base64,' + fs.readFileSync(path.join(b, f)).toString('base64');
    const r = await page.ev(`(async () => {
      const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      const [A, B] = await Promise.all([load(${JSON.stringify(da)}), load(${JSON.stringify(db)})]);
      if (A.width !== B.width || A.height !== B.height) return { size: A.width + 'x' + A.height + ' vs ' + B.width + 'x' + B.height };
      const w = A.width, h = A.height, c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d');
      x.drawImage(A, 0, 0); const pa = x.getImageData(0, 0, w, h).data;
      x.drawImage(B, 0, 0); const img = x.getImageData(0, 0, w, h), pb = img.data;
      let n = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let i = 0; i < pa.length; i += 4) {
        if (pa[i] !== pb[i] || pa[i + 1] !== pb[i + 1] || pa[i + 2] !== pb[i + 2]) {
          n++; const p = i / 4, px = p % w, py = (p / w) | 0;
          x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
          pb[i] = 255; pb[i + 1] = 0; pb[i + 2] = 0;               // diferença a vermelho
        } else { pb[i + 3] = 60; }                                 // o resto esbatido
      }
      if (!n) return { n };
      x.clearRect(0, 0, w, h); x.putImageData(img, 0, 0);
      return { n, pct: +(n / (w * h) * 100).toFixed(3), bbox: [x0, y0, x1, y1].join(','), png: c.toDataURL('image/png') };
    })()`);
    if (r.png) fs.writeFileSync(path.join(out, f), Buffer.from(r.png.split(',')[1], 'base64'));
    rows.push({ file: f, result: r.size ? 'tamanhos diferentes: ' + r.size : r.n ? `${r.n} px (${r.pct}%)` : 'igual', bbox: r.bbox || '' });
  }
  console.table(rows);
  console.log(`Imagens das diferenças em ${out}`);
  page.close(); close();
  process.exit(rows.some(r => r.result !== 'igual') ? 1 : 0);
}

// ------------------------------------------------------------ configuração
const cfgPath = path.resolve(argv[0]);
const cfg = (await import(pathToFileURL(cfgPath).href)).default;
const sel = cfg.selectors || {};
const fnSrc = f => (typeof f === 'function' ? `(${f.toString()})()` : String(f));
const TAG = opt('tag', 'atual');
const OUT = path.resolve(opt('out', path.join(path.dirname(cfgPath), 'layout-check', TAG)));
const SZ = (opt('sizes') || (cfg.sizes || SIZES).join(',')).split(',');
const allScn = [...Object.keys(cfg.scenarios || {}), ...(cfg.tutorial ? ['tutorial'] : [])];
const SCN = opt('scenarios') ? opt('scenarios').split(',') : allScn;
const DPR = Number(opt('dpr', 1));
let URL_ = opt('url') || cfg.url;
fs.mkdirSync(OUT, { recursive: true });

// Servidor do jogo (opcional): arranca, espera por HTTP 200, desliga no fim
let server = null;
if (cfg.server && !opt('url')) {
  // Se já há alguma coisa nesta porta, as medidas seriam de outro servidor (outro jogo, ou uma versão antiga)
  let busy = false;
  try { await fetch(URL_); busy = true; } catch {}
  if (busy) {
    console.error(`Já há um servidor em ${URL_}. Para-o, muda a porta na configuração, ou usa --url para medir esse.`);
    process.exit(2);
  }
  const s = cfg.server;
  // Sem shell: com shell o kill() matava só o shell e o servidor ficava pendurado
  server = spawn(s.cmd === 'node' ? process.execPath : s.cmd, s.args || [], {
    cwd: path.resolve(path.dirname(cfgPath), s.cwd || '.'),
    env: { ...process.env, ...(s.env || {}) }, stdio: 'ignore',
  });
  process.on('exit', () => server.kill());
  let up = false;
  for (let i = 0; i < 100 && !up; i++) { await sleep(150); try { up = (await fetch(URL_)).ok; } catch {} }
  if (!up) { server.kill(); throw new Error(`O servidor não respondeu em ${URL_}`); }
}

// --------------------------------------------------------- código na página
// Medidas: tudo por seletores da configuração. Ver docs/game-layout.md, secção 8.
const DIAG = `(() => {
  const S = ${JSON.stringify(sel)}, COMPACT = ${JSON.stringify(cfg.compact || COMPACT)};
  const d = document.documentElement, q = s => s && document.querySelector(s);
  const vis = e => e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const R = e => e.getBoundingClientRect(), r0 = n => Math.round(n);
  const inView = r => r.top >= -0.5 && r.left >= -0.5 && r.bottom <= innerHeight + 0.5 && r.right <= innerWidth + 0.5;
  const out = {
    size: innerWidth + 'x' + innerHeight,
    compact: matchMedia(COMPACT).matches,
    coarse: matchMedia('(pointer: coarse)').matches,
    hover: matchMedia('(hover: hover)').matches,
    hScroll: Math.max(0, d.scrollWidth - innerWidth),
    vScroll: Math.max(0, d.scrollHeight - innerHeight),
    zones: {}, scroll: {}, rows: {}, pieces: {}, modalScroll: null, coachOverlap: null, coachOut: null, truncated: [],
  };
  // Texto cortado (ellipsis ou overflow escondido): o conteúdo é mais largo do que a caixa
  for (const s of S.noTruncate || []) for (const e of document.querySelectorAll(s))
    if (vis(e) && e.scrollWidth > e.clientWidth + 1) out.truncated.push(s + ': ' + e.textContent.trim().slice(0, 30));
  // Ecrãs que fazem scroll por dentro (overflow-y: auto no ecrã) não mexem no scroll do documento
  const scr = [...document.querySelectorAll(S.screen || ':not(*)')].find(vis);
  out.screenScroll = scr ? Math.max(0, scr.scrollHeight - scr.clientHeight) : null;
  for (const [k, s] of Object.entries(S.zones || {})) { const e = q(s); out.zones[k] = vis(e) ? r0(R(e).height) : null; }
  for (const s of S.noScroll || []) { const e = q(s); if (vis(e)) out.scroll[s] = Math.max(0, e.scrollHeight - e.clientHeight, e.scrollWidth - e.clientWidth); }
  for (const s of S.rows || []) { const e = q(s); if (vis(e)) out.rows[s] = r0(R(e).left); }
  for (const [k, s] of Object.entries(S.pieces || {})) {
    const els = [...document.querySelectorAll(s)].filter(vis);
    if (els.length) out.pieces[k] = { n: els.length, minW: r0(Math.min(...els.map(e => R(e).width))), minH: r0(Math.min(...els.map(e => R(e).height))), allInView: els.every(e => inView(R(e))) };
  }
  const m = [...document.querySelectorAll(S.modal || ':not(*)')].find(vis);
  if (m) out.modalScroll = Math.max(0, m.scrollHeight - m.clientHeight);
  const c = q(S.coach);
  if (vis(c)) {
    const cr = R(c), t = ${cfg.coachTolerance ?? 6};
    out.coachOut = !inView(cr);
    out.coachOverlap = [...document.querySelectorAll(S.rings || ':not(*)')].filter(vis).some(el => {
      const r = R(el); return !(cr.bottom <= r.top + t || cr.top >= r.bottom - t || cr.right <= r.left + t || cr.left >= r.right - t);
    });
  }
  ${cfg.extra ? `out.extra = ${fnSrc(cfg.extra)};` : ''}
  return out;
})()`;

// Espera pelo fim das animações/transições finitas (sheetUp, balão a deslizar…)
// (em ciclo: o fim de uma animação pode começar outra, p.ex. a sheet sobe e o balão desliza)
const SETTLE = `(async () => {
  const run = () => document.getAnimations().filter(a => a.playState === 'running' && isFinite(a.effect?.getComputedTiming().endTime));
  const t0 = performance.now();
  while (run().length && performance.now() - t0 < 2000) {
    await Promise.race([Promise.all(run().map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 2000))]);
    await new Promise(r => requestAnimationFrame(r));
  }
  await Promise.all([...document.images].filter(i => i.getClientRects().length && !i.complete)
    .map(i => new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 4000); })));
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
})()`;

// ------------------------------------------------------------------- checks
function check(m, scn) {
  const fails = [], mobile = m.w < 1000;
  if (mobile !== m.coarse) fails.push(`(pointer: coarse) = ${m.coarse} — a emulação de toque não pegou`);
  if (m.hScroll) fails.push(`scroll horizontal da página: ${m.hScroll}px`);
  if (m.compact && !(cfg.allowPageScroll || []).includes(scn)) {
    if (m.vScroll) fails.push(`scroll vertical da página no compacto: ${m.vScroll}px`);
    if (m.screenScroll > 1) fails.push(`o ecrã faz scroll por dentro no compacto: ${m.screenScroll}px`);
  }
  for (const [s, v] of Object.entries(m.scroll)) if (v > 1) fails.push(`${s} faz scroll (${v}px)`);
  for (const [s, v] of Object.entries(m.rows)) if (v < 0) fails.push(`${s} começa fora do ecrã (left ${v})`);
  for (const [k, p] of Object.entries(m.pieces)) {
    const min = (cfg.minPieceWidth || {})[k];
    if (min && p.minW < min) fails.push(`${k}: ${p.minW}px de largura (mínimo ${min})`);
    if (!p.allInView) fails.push(`${k}: há peças fora do ecrã`);
  }
  if (m.modalScroll > 1) fails.push(`modal com scroll interno (${m.modalScroll}px)`);
  for (const t of m.truncated || []) fails.push(`texto cortado — ${t}`);
  if (m.coachOverlap) fails.push('balão sobre um alvo do spotlight');
  if (m.coachOut) fails.push('balão fora do ecrã');
  return fails;
}

// ------------------------------------------------------------------ corrida
const { port, close } = await launchChrome();
const page = await openPage(port);
await page.cmd('Network.setBypassServiceWorker', { bypass: true });
await page.cmd('Network.setCacheDisabled', { cacheDisabled: true });
// localStorage por origem: limpo e igual em todas as corridas (portas diferentes = estado diferente)
await page.cmd('Page.addScriptToEvaluateOnNewDocument', {
  source: `try { localStorage.clear(); sessionStorage.clear();
    for (const [k, v] of Object.entries(${JSON.stringify(cfg.storage || {})})) localStorage.setItem(k, v); } catch (e) {}`,
});

const results = [];
const record = async (w, h, scn, extraName) => {
  await page.ev(SETTLE);
  const m = await page.ev(DIAG);
  Object.assign(m, { w, scn: extraName || scn });
  m.fails = check(m, scn);
  results.push(m);
  return m;
};

try {
  for (const sz of SZ) {
    const [w, h] = sz.split('x').map(Number);
    const mobile = w < 1000;
    await page.cmd('Emulation.setDeviceMetricsOverride', {
      width: w, height: h, deviceScaleFactor: DPR, mobile,
      screenOrientation: w > h ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 },
    });
    // maxTouchPoints >= 1 mesmo com enabled: false, senão o CDP dá erro
    await page.cmd('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });

    for (const scn of SCN) {
      const loaded = page.once('Page.loadEventFired');
      await page.cmd('Page.navigate', { url: URL_ });
      await loaded;
      for (let i = 0; i < 50 && cfg.ready && !(await page.ev(fnSrc(cfg.ready))); i++) await sleep(100);

      if (scn === 'tutorial') {
        // Percorre o tutorial passo a passo: mede cada passo e avança como o jogador
        const T = cfg.tutorial;
        await page.ev(fnSrc(T.start));
        let prev = null, stuck = 0;
        for (let i = 0; i < (T.maxSteps || 80); i++) {
          await sleep(T.settleMs ?? 250);
          const id = await page.ev(fnSrc(T.step));
          if (id == null) break;
          if (id !== prev) {
            const m = await record(w, h, scn, `tut:${id}`);
            if (flag('tut-shots')) await shot(page, path.join(OUT, `tut-${String(i).padStart(2, '0')}-${id}_${sz}.png`));
            stuck = 0;
            if (m && T.last && await page.ev(fnSrc(T.last))) break;
          }
          prev = id;
          // passos que esperam (bots a jogar): tenta de novo até haver botão
          const moved = await page.ev(fnSrc(T.advance));
          if (!moved && ++stuck > (T.patience || 40)) {
            results.push({ w, size: sz, scn: `tut:${id}`, fails: ['tutorial parado neste passo'], zones: {}, pieces: {} });
            break;
          }
        }
        continue;
      }

      await page.ev(fnSrc(cfg.scenarios[scn]));
      await record(w, h, scn);
      await shot(page, path.join(OUT, `${scn}_${sz}.png`));
    }
  }
} finally {
  page.close(); close();
  if (server) server.kill();
}

// Estabilidade: alturas das zonas iguais entre os cenários de jogo, no mesmo tamanho
const stable = cfg.stableAcross || [];
for (const sz of SZ) {
  const rs = results.filter(r => r.size === sz && stable.includes(r.scn));
  for (const z of Object.keys(sel.zones || {})) {
    if (cfg.stableIgnore?.includes(z)) continue;
    const hs = [...new Set(rs.map(r => r.zones[z]).filter(v => v != null))];
    if (hs.length > 1 && Math.max(...hs) - Math.min(...hs) > 1)
      rs[0].fails.push(`altura de "${z}" muda entre ${stable.join('/')}: ${hs.join(' / ')}px`);
  }
}

fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(results, null, 1));
const pc = p => p ? `${p.minW}${p.allInView ? '' : '!'}` : '';
console.table(results.map(r => ({
  cenário: r.scn, tamanho: r.size, compacto: r.compact, coarse: r.coarse,
  hScr: r.hScroll, vScr: r.vScroll || r.screenScroll || 0,
  ...Object.fromEntries(Object.keys(sel.pieces || {}).map(k => [k + 'W', pc(r.pieces?.[k])])),
  ...Object.fromEntries(Object.entries(r.zones || {}).map(([k, v]) => [k, v])),
  modal: r.modalScroll, balão: r.coachOverlap == null ? '' : r.coachOverlap ? 'TAPA' : 'ok',
  falhas: r.fails?.length || 0,
})));
const bad = results.filter(r => r.fails?.length);
for (const r of bad) console.log(`✗ ${r.scn} @ ${r.size}\n    ${r.fails.join('\n    ')}`);
console.log(`\n${results.length - bad.length}/${results.length} sem falhas · capturas e metrics.json em ${OUT}`);
process.exit(bad.length ? 1 : 0);

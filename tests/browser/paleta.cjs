/**
 * A PALETA, MEDIDA NA TELA
 *
 * Os testes de fonte provam que o CSS diz as cores certas. Isso não é o
 * mesmo que a tela mostrar as cores certas: variável sobrescrita, regra
 * mais específica por cima, estilo em linha posto pelo JavaScript — há três
 * modos de a cor certa não chegar. Aqui a medição é do computed style.
 *
 * O jeito de medir importa. A primeira versão desta checagem procurava
 * "azulado" (blue > red + 12) e deixava passar um lilás cujo azul e
 * vermelho eram quase iguais. Agora cada cor pintada é comparada com a
 * paleta inteira por distância, que não tem como ser enganada por um tom.
 *
 * Rodar com o Vite de pé:  node tests/browser/paleta.cjs
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const URL = process.env.URL || 'http://localhost:5173/tests/browser/casca-topo.html';

/* As cinco que Gabriel deu, mais os tons derivados que o tema declara.
   Tudo que for pintado tem de cair perto de um destes. */
const PALETA = {
  carvao: '#100D0C', sangue: '#60191D', latao: '#B08A53',
  pergaminho: '#D8C5A4', cinza: '#77716D',
  carvaoClaro: '#1B1715', carvaoFundo: '#0A0807', couroClaro: '#241E1A',
  sangueEscuro: '#3A0F12', sangueClaro: '#8A2730',
  lataoClaro: '#D8B57A', pergaminhoEscuro: '#B5A183',
};

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const ALVOS = Object.entries(PALETA).map(([nome, hex]) => ({ nome, hex, rgb: rgb(hex) }));

/** Distância no cubo RGB. 28 deixa passar antialias e mistura de camada,
 *  e não deixa passar um tom que não é da paleta. */
function maisPerto(cor) {
  const m = String(cor).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return { nome: '?', dist: Infinity, transparente: false };
  const alfa = m[4] === undefined ? 1 : Number(m[4]);
  if (alfa < 0.06) return { nome: 'transparente', dist: 0, transparente: true };
  const [r, g, b] = [1, 2, 3].map(i => Number(m[i]));
  let melhor = { nome: '?', dist: Infinity };
  for (const a of ALVOS) {
    const d = Math.hypot(r - a.rgb[0], g - a.rgb[1], b - a.rgb[2]);
    if (d < melhor.dist) melhor = { nome: a.nome, dist: d };
  }
  return { ...melhor, transparente: false };
}

(async () => {
  const navegador = await chromium.launch({
    executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const erros = [];
  const p = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(500);

  const lido = await p.evaluate(() => {
    const raiz = getComputedStyle(document.documentElement);
    const variaveis = {};
    for (const v of ['--mor-carvao', '--mor-sangue', '--mor-latao', '--mor-pergaminho',
      '--mor-cinza', '--accent', '--fundo-mesa', '--ink-mesa', '--superficie-mesa']) {
      variaveis[v] = raiz.getPropertyValue(v).trim();
    }
    /* Tudo que é visível e tem texto ou fundo próprio. Pegar o documento
       inteiro em vez de uma lista de seletores é de propósito: lista de
       seletores foi como o lilás do título passou na primeira tentativa. */
    const pintados = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none') continue;
      const onde = `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(/\s+/).filter(Boolean).slice(0, 2).join('.')}`;
      const temTexto = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (temTexto) pintados.push({ onde, prop: 'color', valor: s.color });
      pintados.push({ onde, prop: 'background-color', valor: s.backgroundColor });
      if (s.borderTopWidth !== '0px') pintados.push({ onde, prop: 'border-color', valor: s.borderTopColor });
      // O gradiente do título é onde o lilás morava: `color` sozinho não o
      // mostra quando o texto é pintado por background-clip.
      if (s.webkitTextFillColor && s.webkitTextFillColor !== s.color) {
        pintados.push({ onde, prop: 'text-fill', valor: s.webkitTextFillColor });
      }
      if (s.backgroundImage !== 'none') {
        for (const m of s.backgroundImage.matchAll(/rgba?\([^)]+\)/g)) {
          pintados.push({ onde, prop: 'background-image', valor: m[0] });
        }
      }
    }
    return { variaveis, pintados };
  });

  for (const [v, valor] of Object.entries(lido.variaveis)) {
    if (!valor) erros.push(`${v} não resolveu`);
  }

  const fora = [];
  for (const { onde, prop, valor } of lido.pintados) {
    const perto = maisPerto(valor);
    if (perto.transparente) continue;
    if (perto.dist > 28) fora.push(`${onde} ${prop}=${valor} (${Math.round(perto.dist)} de ${perto.nome})`);
  }
  const unicos = [...new Set(fora)];

  console.log('variáveis:', Object.entries(lido.variaveis).map(([k, v]) => `${k}=${v}`).join(' '));
  console.log(`medidos: ${lido.pintados.length} · fora da paleta: ${unicos.length}`);
  for (const f of unicos.slice(0, 12)) console.log('  ·', f);

  if (unicos.length) erros.push(`${unicos.length} cores fora da paleta`);
  if (erros.length) {
    console.error('\nFALHOU:\n' + erros.join('\n'));
    await navegador.close();
    process.exit(1);
  }
  console.log('\nA paleta chega à tela.');
  await navegador.close();
})().catch(e => { console.error(e); process.exit(1); });

/**
 * AS OTIMIZAÇÕES NÃO PODEM SE DESFAZER SOZINHAS
 *
 * Otimização tem um jeito próprio de morrer: ninguém a apaga de
 * propósito, ela só deixa de ser aplicada no código novo. A imagem que
 * alguém acrescenta sem `loading`, a busca que volta a filtrar a cada
 * tecla. Estes testes são o que impede isso.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = new URL('../', import.meta.url).pathname;
const ler = f => readFileSync(join(RAIZ, f), 'utf8');

function jsx(dir = 'src', achados = []) {
  for (const nome of readdirSync(join(RAIZ, dir))) {
    const rel = `${dir}/${nome}`;
    if (statSync(join(RAIZ, rel)).isDirectory()) jsx(rel, achados);
    else if (rel.endsWith('.jsx')) achados.push(rel);
  }
  return achados;
}

/* Acima da dobra o lazy ATRASA o que a pessoa veio ver: o retrato do
   personagem e a marca do topo aparecem antes de qualquer rolagem. */
const ACIMA_DA_DOBRA = ['ad-portrait', 'brand-', 'hero', 'capa', 'splash', 'viewer-hero'];

/**
 * Acha onde a tag `<img` fecha de verdade.
 *
 * `/<img[\s\S]*?>/` parece servir e não serve: ela para no `>` de
 * `onError={() => …}`, lê metade da tag e acusa de faltar o que está na
 * outra metade. Foi o mesmo engano que, numa substituição automática,
 * transformou `displayMaxHp > 0` em código quebrado. JSX precisa de
 * contagem de chaves.
 */
function tags(fonte) {
  const achadas = [];
  for (let i = fonte.indexOf('<img'); i >= 0; i = fonte.indexOf('<img', i + 4)) {
    let chaves = 0, aspas = null, j = i;
    for (; j < fonte.length; j++) {
      const c = fonte[j];
      if (aspas) { if (c === aspas) aspas = null; continue; }
      if (c === '"' || c === "'" || c === '`') aspas = c;
      else if (c === '{') chaves++;
      else if (c === '}') chaves--;
      else if (c === '>' && chaves === 0) break;
    }
    achadas.push(fonte.slice(i, j + 1));
  }
  return achadas;
}

test('toda imagem fora da dobra espera para carregar', () => {
  const soltas = [];
  for (const f of jsx()) {
    const s = ler(f);
    for (const tag of tags(s)) {
      if (tag.includes('loading=')) continue;
      if (ACIMA_DA_DOBRA.some(c => tag.includes(c))) continue;
      soltas.push(`${f}: ${tag.slice(0, 90).replace(/\s+/g, ' ')}`);
    }
  }
  assert.deepEqual(soltas, [], `imagens sem loading:\n${soltas.join('\n')}`);
});

test('toda busca filtra com atraso, e só o filtro', () => {
  for (const f of jsx()) {
    const s = ler(f);
    if (!/value=\{(busca|filtro|termo|query|search)\}/.test(s)) continue;
    assert.match(s, /useBuscaAdiada/, `${f} filtra a cada tecla`);
    // E o campo continua mostrando a letra na hora: se o `value` passar a
    // usar o termo adiado, a digitação parece travada — que é o bug que
    // este tipo de correção costuma trazer junto.
    assert.ok(!/value=\{\w+Adiado\}/.test(s),
      `${f} adiou a LETRA no campo, não só o filtro`);
  }
});

test('os estáticos têm cache, e o /assets é imutável', () => {
  const v = JSON.parse(ler('vercel.json'));
  const porFonte = Object.fromEntries(v.headers.map(h => [h.source,
    Object.fromEntries(h.headers.map(c => [c.key, c.value]))]));
  assert.match(porFonte['/assets/:path*']['Cache-Control'], /immutable/);
  for (const caminho of ['/media/:path*', '/archives/:path*']) {
    assert.match(porFonte[caminho]?.['Cache-Control'] || '', /max-age=\d{5,}/,
      `${caminho} sem cache — 14MB de cenário revalidados a cada visita`);
  }
});

test('o que é pesado só chega quando é usado', () => {
  // Three.js e o motor de dados somam ~975KB. Carregados no primeiro
  // acesso, seriam mais da metade do que a pessoa baixa para ver a tela
  // inicial — que não tem globo nem dado nenhum.
  assert.match(ler('src/shell/DiceWidget.jsx'), /lazy\(\(\) => import\(/);
  assert.match(ler('src/features/mapa-mundi/MapaMundiPage.jsx'), /lazy\(\(\) => import\(/);
  for (const f of jsx()) {
    const s = ler(f);
    if (/^import \* as THREE from 'three'/m.test(s)) {
      assert.ok(/GlobeView|FloatingDie/.test(f),
        `${f} puxa three direto — vai parar no pacote de todo mundo`);
    }
  }
});

test('não há dependência pendurada sem uso', () => {
  const pkg = JSON.parse(ler('package.json'));
  const fontes = jsx().concat(
    ['src/core/useBuscaAdiada.js'],
  ).map(ler).join('\n');
  const tudo = fontes + jsx().map(f => ler(f)).join('\n');
  for (const dep of Object.keys(pkg.dependencies || {})) {
    if (dep === 'react-dom') continue; // entra pelo main, não por import nomeado
    assert.ok(tudo.includes(dep) || ler('src/main.jsx').includes(dep),
      `${dep} está no package.json e não é usado`);
  }
});

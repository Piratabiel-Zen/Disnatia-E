import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { ATMOSFERAS, PADROES_DE_LUZ, atmosferaDe, compassoDaLuz, graosDeAreia, listaDeAtmosferas } from '../src/features/mapa-batalha/atmosferas.mjs';
import { MAPAS_PRONTOS, mapasProntosDe } from '../src/features/mapa-batalha/mapasProntos.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('a Pirâmide tem sol que respira e areia cruzando o terreno', () => {
  const deserto = atmosferaDe('deserto');
  assert.ok(deserto.luz.respiro > 0, 'o sol precisa subir e descer');
  assert.equal(deserto.sombra.respiro, deserto.luz.respiro, 'sombra e luz andam no mesmo compasso');
  assert.ok(deserto.areia.length >= 3, 'mais de uma camada de areia, ou não parece vento');
  // Velocidades diferentes entre as faixas: é a diferença que lê como vento.
  const duracoes = new Set(deserto.areia.map(faixa => faixa.duracao));
  assert.equal(duracoes.size, deserto.areia.length, 'faixas em sincronia pareceriam uma esteira');
  assert.ok(deserto.graos.quantidade > 0);
});

test('a areia anda da esquerda para a direita', () => {
  const css = read('../src/features/mapa-batalha/atmosfera.css');
  const veu = css.match(/@keyframes atmAreia\{\s*from\{background-position:(-?\d+)%[\s\S]*?to\{background-position:(-?\d+)%/);
  assert.ok(veu, 'falta a animação das faixas de areia');
  assert.ok(Number(veu[1]) < Number(veu[2]), 'a areia precisa ir da esquerda para a direita');
  const grao = css.match(/@keyframes atmGrao\{[\s\S]*?100%\{transform:translate3d\((\d+)vw/);
  assert.ok(grao && Number(grao[1]) > 0, 'os grãos também vão para a direita');
});

test('o Instituto é noturno, com postes acesos e vento', () => {
  const noite = atmosferaDe('instituto');
  assert.ok(noite.noite.forca > 0 && noite.brilho < 1, 'a cena precisa escurecer');
  assert.ok(noite.luar.forca > 0, 'a lua ilumina a cena');
  assert.equal(noite.luzes.length, 6, 'um poço de luz para cada poste do desenho');
  assert.ok(noite.vento.forca > 0 && noite.vento.borda > 0, 'o vento precisa de força e de uma borda para recortar');
});

test('toda luz cai dentro do mapa e usa um padrão que existe', () => {
  for (const atm of listaDeAtmosferas()) {
    for (const luz of atm.luzes || []) {
      assert.ok(luz.x > 0 && luz.x < 100, `luz fora do mapa em ${atm.id}`);
      assert.ok(luz.y > 0 && luz.y < 100, `luz fora do mapa em ${atm.id}`);
      assert.ok(luz.raio > 0 && luz.forca > 0, `luz sem brilho em ${atm.id}`);
      assert.ok(PADROES_DE_LUZ[luz.padrao], `padrão desconhecido "${luz.padrao}" em ${atm.id}`);
    }
  }
});

test('duas lâmpadas iguais nunca piscam juntas', () => {
  const luzes = atmosferaDe('arcadia').luzes;
  const compassos = luzes.map((luz, index) => compassoDaLuz(luz, index));
  const assinaturas = new Set(compassos.map(c => `${c.duracao}:${c.atraso}`));
  assert.equal(assinaturas.size, luzes.length, 'em sincronia viraria pisca-pisca de festa');
  // E o compasso é estável entre renders, ou a cena tremeria a cada repintura.
  assert.deepEqual(compassos, luzes.map((luz, index) => compassoDaLuz(luz, index)));
});

test('cada padrão de luz tem a sua animação em CSS', () => {
  const css = read('../src/features/mapa-batalha/atmosfera.css');
  for (const padrao of Object.keys(PADROES_DE_LUZ)) {
    if (padrao === 'estavel') continue;
    assert.match(css, new RegExp(`\\.mapa-atm-luz\\.padrao-${padrao}\\{animation:`), `falta a animação de ${padrao}`);
  }
  // A lâmpada quebrada corta seco: fluorescente com defeito não tem transição.
  assert.match(css, /\.mapa-atm-luz\.padrao-falha\{animation:atmFalha var\(--dur\) steps\(1,end\)/);
});

test('a tumba é quente e enigmática, não assombrada', () => {
  const tumba = atmosferaDe('tumba');
  assert.ok(tumba.brilho > 1, 'a câmara é iluminada, não sombria');
  assert.ok(tumba.noite.forca < 0.4, 'o escuro entra só o bastante para o fogo brilhar');
  assert.ok(!tumba.presenca, 'nada de vulto rondando a tumba');
  const tochas = tumba.luzes.filter(luz => luz.padrao === 'tocha');
  assert.ok(tochas.length >= 9, 'o fogo é a única luz da câmara');
  assert.ok(tumba.poeira && tumba.ouro, 'poeira no ar e ouro respondendo ao fogo');
});

test('o Arcádia é escuro, pisca sem parar e tem algo rondando', () => {
  const arcadia = atmosferaDe('arcadia');
  assert.ok(arcadia.brilho < 0.75 && arcadia.noite.forca > 0.6, 'a cena precisa ser escura');
  const quebradas = arcadia.luzes.filter(luz => luz.padrao === 'falha' || luz.padrao === 'glitch');
  assert.ok(quebradas.length >= 8, 'o terror vem das lâmpadas falhando sem parar');
  assert.ok(arcadia.luzes.some(luz => luz.padrao === 'pulso'), 'faltam as luzes de emergência');
  assert.ok(arcadia.luzes.some(luz => luz.padrao === 'frio'), 'falta o frio do laboratório');
  assert.ok(arcadia.presenca && arcadia.respiracao, 'falta o elemento paranormal');
});

test('o vento usa a própria arte, recortada só nas bordas', () => {
  const kit = read('../src/features/mapa-batalha/MapAtmosphere.jsx');
  assert.match(kit, /backgroundImage: `url\(\$\{img\}\)`/);
  const css = read('../src/features/mapa-batalha/atmosfera.css');
  assert.match(css, /\.mapa-atm-vento\{[\s\S]*?mask-image:/);
  // Sem a imagem não há camada de vento: nada de um retângulo vazio balançando.
  assert.match(kit, /preset\.vento && img &&/);
});

test('as camadas ficam entre a arte e os tokens, sem receber clique', () => {
  const css = read('../src/features/mapa-batalha/atmosfera.css');
  assert.match(css, /\.mapa-atm\{[\s\S]*?pointer-events:none/);
  const page = read('../src/features/mapa-batalha/BattleMapPage.jsx');
  const arte = page.indexOf('alt="mapa de batalha"');
  const camada = page.indexOf('<MapAtmosphere');
  const tokens = page.indexOf('{(currentMap.tokens || []).map(token =>');
  assert.ok(arte > 0 && camada > arte && tokens > camada, 'a ordem precisa ser arte, atmosfera, tokens');
});

test('a atmosfera cede quando pedem menos movimento ou modo Leve', () => {
  const css = read('../src/features/mapa-batalha/atmosfera.css');
  assert.match(css, /html\[data-motion="reduced"\] \.mapa-atm \*[\s\S]{0,80}animation:none!important/);
  assert.match(css, /html\[data-quality="light"\] \.mapa-atm-vento/);
  assert.match(css, /html\[data-away="true"\] \.mapa-atm \*/);
});

test('os mapas prontos guardam o caminho da arte, não a imagem inteira', () => {
  assert.equal(MAPAS_PRONTOS.length, 4);
  for (const mapa of MAPAS_PRONTOS) {
    assert.match(mapa.img, /^\/media\/mapas\/.+\.webp$/, 'a arte é servida pelo site');
    assert.ok(atmosferaDe(mapa.atmosfera), `${mapa.nome} sem atmosfera válida`);
    const arquivo = new URL('../public' + mapa.img, import.meta.url);
    const bytes = statSync(arquivo).size;
    assert.ok(bytes > 50_000, `${mapa.img} parece vazio`);
    // Acima de 1 MB o Firestore recusaria o documento, que é justamente o
    // motivo de a arte morar em arquivo e não dentro do mapa.
    assert.ok(bytes < 1_000_000, `${mapa.img} está pesado demais (${bytes} bytes)`);
  }
  assert.deepEqual(MAPAS_PRONTOS.map(m => m.nome), [
    'Pirâmide de Salomão',
    'Instituto Arcádia — Entrada',
    'Pirâmide de Salomão — Interior',
    'Instituto Arcádia',
  ]);
  assert.equal(new Set(MAPAS_PRONTOS.map(m => m.id)).size, MAPAS_PRONTOS.length, 'ids repetidos sobrescreveriam o mapa anterior');
});

test('os mapas da Dinastia E só aparecem na Dinastia E', () => {
  assert.equal(mapasProntosDe({ id: 'dinastia-e', primary: true }).length, 4);
  assert.equal(mapasProntosDe({ id: 'arquivo-de-veneza' }).length, 0);
});

test('adicionar um mapa pronto não apaga os tokens que já estavam nele', () => {
  const page = read('../src/features/mapa-batalha/BattleMapPage.jsx');
  assert.match(page, /if \(!existente\) await setDoc\(docIn\('battlemap_tokens', id\), \{ tokens: \[\] \}\)/);
  assert.match(page, /setDoc\(docIn\('battlemaps', id\), meta, \{ merge: true \}\)/);
});

test('o Mestre escolhe a atmosfera de qualquer mapa', () => {
  const page = read('../src/features/mapa-batalha/BattleMapPage.jsx');
  assert.match(page, /updCurrentMap\(\{ atmosfera: e\.target\.value \}\)/);
  assert.match(page, /<option value="">Sem atmosfera<\/option>/);
  assert.equal(listaDeAtmosferas().length, Object.keys(ATMOSFERAS).length);
  assert.equal(atmosferaDe(''), null);
  assert.equal(atmosferaDe('constructor'), null, 'nome herdado não pode virar atmosfera');
});

test('os grãos de areia caem sempre nos mesmos lugares', () => {
  const primeira = graosDeAreia(26);
  assert.equal(primeira.length, 26);
  assert.deepEqual(primeira, graosDeAreia(26), 'posições precisam ser estáveis entre renders');
  for (const grao of primeira) {
    assert.ok(grao.topo >= 0 && grao.topo <= 100);
    assert.ok(grao.duracao > 0);
  }
  assert.deepEqual(graosDeAreia(0), []);
});

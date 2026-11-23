/**
 * O ACERVO DE CADA MESA
 *
 * Mesa nenhuma vê mapa de outra. A pirâmide e o posto de gasolina são
 * cenário da Dinastia E: mostrá-los numa mesa de CAIN ou numa noite de
 * terror quebra a ficção antes de a sessão começar.
 *
 * É a mesma família dos vazamentos que já aconteceram neste projeto — o
 * mural, os documentos, o tema — e todos eles passaram despercebidos até
 * alguém abrir a mesa errada. Este teste existe para o próximo sistema
 * nascer sem acervo em vez de nascer com o da Dinastia E.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import { MAPAS_PRONTOS, mapasProntosDe } from '../src/features/mapa-batalha/mapasProntos.mjs';
import { MAPAS as MAPAS_DA_CASA } from '../src/features/oneshot/mapasDaCasa.mjs';

const fonte = c => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8');

test('a Dinastia E vê o acervo dela', () => {
  assert.ok(mapasProntosDe({ primary: true }).length > 0);
  assert.deepEqual(mapasProntosDe({ primary: true }), MAPAS_PRONTOS);
});

test('nenhuma outra mesa vê os mapas da Dinastia E', () => {
  const deOutras = [
    { id: 'veneza', sistema: 'cain', name: 'Estrela de Absinto' },
    { id: 'noite', sistema: 'oneshot', name: 'Relatos do Macabro' },
    { id: 'qualquer', name: 'Mesa nova' },
  ];
  const idsDaDinastia = new Set(MAPAS_PRONTOS.map(m => m.id));
  for (const mesa of deOutras) {
    for (const mapa of mapasProntosDe(mesa)) {
      assert.ok(!idsDaDinastia.has(mapa.id),
        `a mesa ${mesa.id} está vendo "${mapa.nome}", que é da Dinastia E`);
    }
  }
});

test('mesa sem acervo declarado nasce vazia', () => {
  // Só aparece o que o próprio Mestre subir — que é o caso normal.
  assert.deepEqual(mapasProntosDe({ id: 'mesa-nova' }), []);
  assert.deepEqual(mapasProntosDe({ id: 'x', sistema: 'cain' }), []);
  assert.deepEqual(mapasProntosDe(null), []);
  assert.deepEqual(mapasProntosDe(undefined), []);
});

test('a mesa de uma noite vê a casa do avô, e só ela', () => {
  const daNoite = mapasProntosDe({ id: 'noite', sistema: 'oneshot' });
  assert.equal(daNoite.length, MAPAS_DA_CASA.length);
  assert.deepEqual(daNoite.map(m => m.id).sort(), MAPAS_DA_CASA.map(m => m.id).sort());
  for (const m of daNoite) {
    assert.match(m.img, /^\/media\/mapas\/casa\//, `${m.id} não aponta para a casa`);
    assert.ok(m.nome && m.descricao, `${m.id} incompleto`);
  }
});

test('o acervo é uma tabela, e não uma condição por sistema espalhada', () => {
  /* Condição espalhada é como o vazamento volta: alguém acrescenta um
     sistema e esquece de um dos lugares. Tabela num arquivo só tem um lugar
     para esquecer, e ele está aqui. */
  const mjs = semComentarios(fonte('src/features/mapa-batalha/mapasProntos.mjs'));
  assert.match(mjs, /const ACERVOS = Object\.freeze\(/);
  // E a busca tenta o id da mesa antes do sistema, para um conjunto poder
  // ser amarrado a UMA mesa específica.
  assert.match(mjs, /ACERVOS\[String\(campaign\?\.id \|\| ''\)\]/);
});

test('a barra de contexto da Dinastia E não aparece na noite', () => {
  /* "EXPLORAÇÃO · LOCAL ATUAL · OBJETIVO" é vocabulário de outra mesa: numa
     noite de terror o lugar é o mapa aberto, e dizer o objetivo em cima da
     tela entrega o que a mesa tem que descobrir. */
  const css = semComentarios(fonte('src/features/oneshot/mortalha-casca.css'));
  assert.match(css, /html\[data-tema-mesa="mortalha"\] \.g3-top-context\{display:none !important\}/);
  // E some só na mortalha: as outras duas mesas dependem dela.
  const jsx = semComentarios(fonte('src/experience/GameExperience3.jsx'));
  assert.match(jsx, /g3-top-context/, 'o componente foi removido em vez de escondido');
});

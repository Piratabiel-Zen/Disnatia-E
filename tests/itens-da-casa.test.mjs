/**
 * OS DEZESSEIS ITENS E A BOLSA DA MESA
 *
 * A regra que estes testes existem para guardar é uma só, e é a mesma que
 * vale para o inspetor: O VERSO NÃO VAZA. O que está escrito atrás de uma
 * foto, dentro de um caderno ou no fundo de um amuleto só chega à mesa
 * quando alguém virar o objeto. Se o verso entrar na descrição, a descoberta
 * vira legenda e a cena inteira perde o motivo de existir.
 *
 * A segunda regra: a lista completa nunca aparece para o jogador. Dezesseis
 * espaços vazios é o mapa do que falta, e aí a mesa joga para preencher
 * espaços em vez de procurar numa casa.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  ITENS, AMULETOS, itemPorId, itensDoMapa, itemComoObjeto,
} from '../src/features/oneshot/itensDaCasa.mjs';
import {
  registroDeAchado, itensAchados, jaAchou, porEntregar, contagemDosAmuletos,
} from '../src/features/oneshot/achadosDaCasa.mjs';
import { MAPAS } from '../src/features/oneshot/mapasDaCasa.mjs';
import { temVerso, ehDesenhado, objetoInspecionavel } from '../src/features/oneshot/inspecao.mjs';

const fonte = c => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8');

test('os dezesseis itens estão todos lá, numerados sem buraco', () => {
  assert.equal(ITENS.length, 16);
  const numeros = ITENS.map(i => i.numero).sort((a, b) => a - b);
  assert.deepEqual(numeros, Array.from({ length: 16 }, (_, n) => n + 1));
});

test('cada item tem id próprio e frente e verso escritos', () => {
  const ids = new Set();
  for (const item of ITENS) {
    assert.ok(item.id && !ids.has(item.id), `id repetido ou vazio: ${item.id}`);
    ids.add(item.id);
    assert.ok(item.nome, `item ${item.id} sem nome`);
    assert.ok(item.frente, `item ${item.id} sem frente`);
    assert.ok(item.verso, `item ${item.id} sem verso — nada para descobrir`);
    assert.ok(item.forma, `item ${item.id} sem forma — não dá para desenhar`);
  }
});

test('todo item está num mapa que existe', () => {
  const mapas = new Set(MAPAS.map(m => m.id));
  for (const item of ITENS) {
    assert.ok(mapas.has(item.onde), `item ${item.id} está em mapa inexistente: ${item.onde}`);
  }
});

test('os cinco amuletos são cinco e têm selos diferentes', () => {
  assert.equal(AMULETOS.length, 5);
  const selos = AMULETOS.map(a => a.selo);
  assert.equal(new Set(selos).size, 5, 'dois amuletos com o mesmo selo');
});

test('o verso NUNCA entra na descrição do objeto', () => {
  for (const item of ITENS) {
    const objeto = itemComoObjeto(item);
    assert.equal(objeto.descricao, item.frente);
    assert.equal(objeto.versoTexto, item.verso);
    assert.ok(!objeto.descricao.includes(item.verso),
      `o verso de ${item.id} vazou para a descrição`);
  }
});

test('todo item sobrevive à conversão e continua virável e desenhado', () => {
  for (const item of ITENS) {
    const objeto = objetoInspecionavel(itemComoObjeto(item));
    assert.ok(temVerso(objeto), `${item.id} perdeu o verso na conversão`);
    assert.ok(ehDesenhado(objeto), `${item.id} perdeu a forma e virou foto`);
    assert.equal(objeto.forma, item.forma);
  }
});

test('item inexistente não vira objeto nem registro', () => {
  assert.equal(itemPorId('nada'), null);
  assert.equal(itemComoObjeto(null), null);
  assert.equal(registroDeAchado('nada'), null);
});

test('itensDoMapa só devolve os daquele mapa', () => {
  for (const mapa of MAPAS) {
    for (const item of itensDoMapa(mapa.id)) {
      assert.equal(item.onde, mapa.id);
    }
  }
  assert.deepEqual(itensDoMapa('inexistente'), []);
});

test('o achado entra na bolsa e sai na ordem em que foi achado', () => {
  const registros = [
    { item: 'amuleto-sangue', em: 300 },
    { item: ITENS[0].id, em: 100 },
  ];
  const achados = itensAchados(registros);
  assert.equal(achados.length, 2);
  assert.equal(achados[0].id, ITENS[0].id, 'a bolsa devia estar em ordem de achado');
});

test('registro duplicado ou podre não quebra a bolsa', () => {
  const achados = itensAchados([
    { item: ITENS[0].id, em: 1 },
    { item: ITENS[0].id, em: 2 },
    { item: 'item-que-nao-existe-mais', em: 3 },
    null,
    {},
  ]);
  assert.equal(achados.length, 1);
});

test('a bolsa vazia é vazia, não é a lista inteira', () => {
  assert.deepEqual(itensAchados([]), []);
  assert.deepEqual(itensAchados(), []);
});

test('o que falta entregar exclui o que já foi achado', () => {
  const registros = ITENS.slice(0, 3).map(i => ({ item: i.id, em: 1 }));
  const falta = porEntregar(registros, 'porao');
  assert.equal(falta.length, 13);
  for (const item of falta) assert.ok(!jaAchou(registros, item.id));
});

test('o que é deste mapa vem primeiro na lista do mestre', () => {
  const falta = porEntregar([], 'porao');
  const doPorao = itensDoMapa('porao').length;
  assert.ok(doPorao > 0, 'o porão precisa ter item para este teste valer');
  for (let n = 0; n < doPorao; n += 1) {
    assert.equal(falta[n].onde, 'porao',
      'o mestre entrega no meio da cena: o item daqui tem de estar no topo');
  }
  // Mas o resto continua entregável: a mesa inventa caminho que ninguém previu.
  assert.equal(falta.length, 16);
});

test('o contador de amuletos conta amuleto e ignora o resto', () => {
  const comuns = ITENS.filter(i => i.forma !== 'amuleto').slice(0, 4)
    .map(i => ({ item: i.id, em: 1 }));
  const zero = contagemDosAmuletos(comuns);
  assert.equal(zero.achados, 0);
  assert.equal(zero.faltam, 5);
  assert.equal(zero.completo, false);

  const todos = AMULETOS.map(a => ({ item: a.id, em: 1 }));
  const cheio = contagemDosAmuletos([...comuns, ...todos]);
  assert.equal(cheio.achados, 5);
  assert.equal(cheio.faltam, 0);
  assert.equal(cheio.completo, true);
});

test('o jogador não recebe a lista do que falta', () => {
  const codigo = semComentarios(fonte('src/features/oneshot/AchadosDaCasa.jsx'));
  // A lista só é montada sob a condição de mestre; sem isso o React a
  // calcularia para todos e bastaria o devtools para ver a casa inteira.
  assert.match(codigo, /porEntregar\(achados, idDoMapa\)\s*:\s*\[\]/,
    'porEntregar precisa ficar atrás da condição de mestre');
  assert.match(codigo, /mestre\s*\?\s*porEntregar/);
});

test('o mestre entrega, o jogador não', () => {
  const codigo = semComentarios(fonte('src/features/oneshot/AchadosDaCasa.jsx'));
  for (const trecho of ['aoEntregar', 'aoDevolver']) {
    const antes = codigo.slice(0, codigo.indexOf(trecho + '?.'));
    assert.ok(/mestre &&/.test(antes.slice(-900)),
      `${trecho} precisa estar dentro de um bloco de mestre`);
  }
});

test('entregar duas vezes não cria dois achados', () => {
  const codigo = semComentarios(fonte('src/features/mapa-batalha/BattleMapPage.jsx'));
  // O id do documento é o id do item; addDoc criaria um segundo registro a
  // cada clique e a bolsa encheria de cópias.
  assert.match(codigo, /setDoc\(docIn\('achados', registro\.item\), registro\)/);
  assert.ok(!/addDoc\(col\('achados'\)/.test(codigo));
});

test('os achados são da mesa, dentro da mesa', () => {
  const codigo = semComentarios(fonte('src/features/mapa-batalha/BattleMapPage.jsx'));
  // `col` e `docIn` são os que já põem o caminho da mesa. Coleção solta
  // vazaria os achados de uma mesa para outra.
  assert.match(codigo, /onSnapshot\(col\('achados'\)/);
  assert.ok(!/collection\(db,\s*'achados'/.test(codigo));
});

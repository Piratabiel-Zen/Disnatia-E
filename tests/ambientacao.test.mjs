/**
 * A AMBIENTAÇÃO DO MAPA
 *
 * O teste que mais importa aqui é o da lâmpada apagada: ela precisa
 * CONTINUAR na tela. É o que faz o gerador do galpão valer alguma coisa —
 * a mesa tem que ter visto o poste apagado antes para que acender
 * signifique algo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TIPOS, TAMANHO, FORCA, AJUSTE, LIMITE_POR_MAPA,
  tipoDe, ehLuz, pecaNova, comTamanho, comForca, alternarLigada, movida,
  pecasDoMapa, cabeMais, pecaEm, ajusteDoMapa, filtroDoAjuste,
} from '../src/features/oneshot/ambientacao.mjs';

const nova = (tipo, x = 50, y = 50, mapa = 'porao') => pecaNova({ tipo, x, y, mapa });

test('todo tipo é luz ou coisa, e tem nome e resumo', () => {
  for (const t of TIPOS) {
    assert.ok(['luz', 'coisa'].includes(t.grupo), `${t.id} sem grupo`);
    assert.ok(t.nome && t.resumo, `${t.id} sem nome ou resumo`);
    assert.match(t.cor, /^#[0-9A-F]{6}$/i, `${t.id} sem cor`);
  }
  // Ids únicos: dois iguais e o Mestre põe um e vê o outro.
  assert.equal(new Set(TIPOS.map(t => t.id)).size, TIPOS.length);
});

test('a peça nasce acesa, no tamanho e na força de fábrica', () => {
  const p = nova('lampada', 30, 70);
  assert.equal(p.ligada, true, 'nasce apagada e o Mestre toca duas vezes para conferir');
  assert.equal(p.tamanho, TAMANHO.padrao);
  assert.equal(p.forca, FORCA.padrao);
  assert.equal(p.x, 30);
  assert.equal(p.y, 70);
});

test('peça sem tipo ou sem mapa não existe', () => {
  assert.equal(pecaNova({ tipo: 'inventado', x: 1, y: 1, mapa: 'porao' }), null);
  assert.equal(pecaNova({ tipo: 'lampada', x: 1, y: 1, mapa: '' }), null);
});

test('a posição fica dentro do mapa', () => {
  const p = nova('pedra', -30, 220);
  assert.equal(p.x, 0);
  assert.equal(p.y, 100);
  assert.deepEqual([movida(p, { x: 150, y: -5 }).x, movida(p, { x: 150, y: -5 }).y], [100, 0]);
});

test('desligar NÃO apaga a peça da lista — é o ponto do gerador', () => {
  const apagada = alternarLigada(nova('lampada'));
  assert.equal(apagada.ligada, false);
  // Continua no mapa, para a mesa ver o poste apagado.
  assert.equal(pecasDoMapa([apagada], 'porao').length, 1);
  assert.equal(alternarLigada(apagada).ligada, true, 'e volta a acender');
});

test('tamanho e força respeitam os limites', () => {
  const p = nova('lampiao');
  assert.equal(comTamanho(p, 99).tamanho, TAMANHO.max);
  assert.equal(comTamanho(p, -4).tamanho, TAMANHO.min);
  assert.equal(comForca(p, 99).forca, FORCA.max);
  assert.equal(comForca(p, 0).forca, FORCA.min);
  // Lixo não zera a peça: volta ao padrão.
  assert.equal(comTamanho(p, 'abc').tamanho, TAMANHO.padrao);
  assert.equal(comForca(p, undefined).forca, FORCA.padrao);
});

test('as luzes são desenhadas por último', () => {
  // Luz desenhada antes da grama ficaria por baixo do mato.
  const pecas = [nova('lampada'), nova('grama'), nova('vela'), nova('pedra')];
  const ordem = pecasDoMapa(pecas, 'porao').map(p => ehLuz(p));
  assert.deepEqual(ordem, [false, false, true, true]);
});

test('cada mapa só mostra as suas', () => {
  const pecas = [nova('grama', 1, 1, 'porao'), nova('grama', 2, 2, 'sotao')];
  assert.equal(pecasDoMapa(pecas, 'porao').length, 1);
  assert.deepEqual(pecasDoMapa(pecas, ''), []);
});

test('há um teto de peças por mapa', () => {
  const muitas = Array.from({ length: LIMITE_POR_MAPA + 10 }, () => nova('grama'));
  assert.equal(pecasDoMapa(muitas, 'porao').length, LIMITE_POR_MAPA);
  assert.equal(cabeMais(muitas, 'porao'), false);
  assert.equal(cabeMais([nova('grama')], 'porao'), true);
});

test('peça grande é mais fácil de acertar com o dedo', () => {
  const pequena = comTamanho(nova('vela', 20, 20), 0.5);
  const grande = comTamanho(nova('lampiao', 70, 70), 3);
  // A 8% de distância: pega a grande, não pega a pequena.
  assert.equal(pecaEm([pequena], { x: 28, y: 20 }, 'porao'), null);
  assert.ok(pecaEm([grande], { x: 78, y: 70 }, 'porao'));
});

test('o ajuste do mapa fica nos limites e vira filtro', () => {
  const a = ajusteDoMapa({ brilho: 9, contraste: -3, saturacao: 0.5 });
  assert.equal(a.brilho, AJUSTE.brilho.max);
  assert.equal(a.contraste, AJUSTE.contraste.min);
  assert.equal(a.saturacao, 0.5);
  assert.match(filtroDoAjuste(a), /brightness\(1\.4\) contrast\(0\.6\) saturate\(0\.5\)/);
});

test('mapa sem ajuste não ganha filtro nenhum', () => {
  // `filter` em qualquer valor cria uma camada de composição nova, e num
  // mapa do tamanho da tela isso custa memória de vídeo à toa.
  assert.equal(filtroDoAjuste(null), '');
  assert.equal(filtroDoAjuste({ brilho: 1, contraste: 1, saturacao: 1 }), '');
});

test('peça quebrada não derruba o mapa', () => {
  assert.deepEqual(pecasDoMapa([null, {}, { tipo: 'nada', mapa: 'porao' }], 'porao'), []);
  assert.equal(alternarLigada(null), null);
  assert.equal(comTamanho(null, 2), null);
});

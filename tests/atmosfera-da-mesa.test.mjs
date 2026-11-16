/* SISTEMA E ATMOSFERA SÃO COISAS SEPARADAS
   Misturá-las foi engano meu. O sistema CAIN entrega tudo sozinho — ficha,
   perícias, reserva de d6, mural, Pecados — e não depende de tema, de mundo
   nem de preset. A atmosfera é o clima visual de UMA campanha. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ATMOSFERAS_POR_MESA, temAtmosferaPropria, temaDaMesa } from '../src/core/atmosferaDaMesa.mjs';
import { navegacaoDoSistema, sistemaDe } from '../src/core/sistemas/index.mjs';

test('a Estrela de Absinto tem o clima dela pelo nome', () => {
  assert.equal(temaDaMesa({ name: 'Estrela de Absinto' }), 'veneziano');
  // Mesmo que o seletor tenha ficado no padrão na hora de criar.
  assert.equal(temaDaMesa({ name: 'Estrela de Absinto', theme: 'sombrio' }), 'veneziano');
  assert.equal(temAtmosferaPropria({ name: 'Estrela de Absinto' }), true);
});

test('o nome casa com acento, caixa e espaço de sobra', () => {
  // Ninguém digita duas vezes exatamente igual.
  for (const nome of ['ESTRELA DE ABSINTO', '  estrela de absinto  ', 'Estrela  de  Absinto']) {
    assert.equal(temaDaMesa({ name: nome }), 'veneziano', `"${nome}" não casou`);
  }
});

test('qualquer outra mesa usa o tema que escolheu', () => {
  assert.equal(temaDaMesa({ name: 'Outra Campanha', theme: 'moderno' }), 'moderno');
  assert.equal(temaDaMesa({ name: 'Outra Campanha' }), 'sombrio', 'sem escolha, o padrão');
  assert.equal(temAtmosferaPropria({ name: 'Outra Campanha' }), false);
  assert.equal(temaDaMesa(null), 'sombrio');
});

test('CAIN funciona sem tema, sem mundo e sem preset nenhum', () => {
  // Uma mesa de CAIN só com o sistema escolhido: nada mais declarado.
  const crua = { sistema: 'cain' };
  const sistema = sistemaDe(crua);

  assert.equal(sistema.id, 'cain');
  assert.equal(sistema.dados.notacao, 'd6');
  assert.equal(sistema.pericias.length, 10);
  assert.ok(sistema.blocosDaFicha.length > 0, 'a ficha sumiu sem tema');
  assert.equal(typeof sistema.dados.rolar, 'function');

  // E a reserva de d6 rola igual, sem nada configurado.
  const r = sistema.dados.rolar({ pericia: 2, sorteio: () => 0.99 });
  assert.equal(r.sucessos, 2);

  // As abas do sistema também vêm todas.
  const abas = navegacaoDoSistema(crua, []).flatMap(g => g.items.map(i => i.id));
  for (const aba of ['fichas', 'investigacao', 'pecados', 'documentos']) {
    assert.ok(abas.includes(aba), `a aba "${aba}" dependia de algo além do sistema`);
  }
});

test('o mundo é da campanha e o clima é do nome: não se confundem', () => {
  // A Estrela de Absinto se passa na Terra Dourada, com visual vitoriano.
  const mesa = { sistema: 'cain', name: 'Estrela de Absinto', world: 'Terra Dourada' };
  assert.equal(temaDaMesa(mesa), 'veneziano', 'o clima vem do nome');
  const mapa = navegacaoDoSistema(mesa, []).flatMap(g => g.items).find(i => i.id === 'mapamundi');
  assert.equal(mapa.label, 'Mapa de Terra Dourada', 'o mapa vem do mundo, não do clima');
});

test('a ligação mora num lugar só, em vez de espalhada em ifs', () => {
  assert.equal(Object.keys(ATMOSFERAS_POR_MESA).length, 1);
  // Acrescentar outra mesa com clima próprio é acrescentar uma linha.
  assert.equal(ATMOSFERAS_POR_MESA['estrela de absinto'], 'veneziano');
});

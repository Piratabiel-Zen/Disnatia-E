/**
 * A CASA DO AVÔ HIROSHI
 *
 * O guia de ambientação virado em dados. O que estes testes guardam são as
 * duas regras da mesa que viraram regra do código, e que se perdem calado
 * numa refatoração:
 *
 *  1. a Yamauba NÃO está nas imagens — ela é camada temporária, para a mesa
 *     nunca ter certeza de ter visto alguma coisa;
 *  2. a barreira segue os MUROS, não as paredes: o galpão está dentro da
 *     propriedade e ir até lá não quebra proteção nenhuma.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  MAPAS, FASES, CAMADAS, atmosferaDoMapa, fasePorId, mapaPorId,
  mapasEmOrdem, quebraABarreira,
} from '../src/features/oneshot/mapasDaCasa.mjs';

const fonte = c => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8');

test('são os sete mapas, em ordem, e cada imagem existe', () => {
  assert.equal(MAPAS.length, 7);
  const ordem = mapasEmOrdem().map(m => m.id);
  assert.deepEqual(ordem,
    ['patio', 'terreo', 'quartos', 'sotao', 'porao', 'ritual', 'galpao']);
  for (const m of MAPAS) {
    const arquivo = `public${m.imagem}`;
    assert.ok(existsSync(new URL(`../${arquivo}`, import.meta.url)), `falta ${arquivo}`);
  }
});

test('todo mapa diz o que tem dentro, como é a luz e qual é o evento', () => {
  for (const m of MAPAS) {
    assert.ok(m.nome && m.onde, `${m.id} sem nome ou lugar`);
    assert.ok(m.elementos?.length >= 4, `${m.id} com poucos elementos`);
    assert.ok(m.luz?.trim(), `${m.id} sem descrição de luz`);
    assert.ok(m.efeitos?.length, `${m.id} sem efeitos`);
    assert.ok(m.evento?.nome && m.evento?.texto, `${m.id} sem evento especial`);
  }
});

test('a Yamauba não está em mapa nenhum', () => {
  /* Os mapas precisam parecer abandonados e ameaçadores mesmo sem ela: a
     criatura é camada temporária, para a mesa nunca saber se viu algo. Um
     campo de criatura fixa no mapa seria o começo do erro. */
  for (const m of MAPAS) {
    assert.equal(m.criatura, undefined, `${m.id} ganhou criatura fixa`);
    const texto = JSON.stringify({ ...m, evento: { nome: m.evento.nome } });
    assert.ok(!/yamauba/i.test(texto),
      `${m.id} cita a Yamauba fora do texto do evento`);
  }
  // E o único mapa que a mostra, mostra por camada temporária.
  assert.equal(mapaPorId('quartos').evento.usaAparicao, true);
});

test('a barreira segue os muros: o galpão está dentro', () => {
  // Ir ao galpão não quebra proteção; só ultrapassar o portão quebra.
  assert.equal(quebraABarreira('galpao'), false);
  assert.equal(mapaPorId('galpao').dentroDaBarreira, true);
  // E o pátio é o mapa que tem o limite.
  assert.equal(mapaPorId('patio').temLimite, true);
});

test('as três fases da noite escurecem e desestabilizam na ordem', () => {
  assert.equal(FASES.length, 3);
  for (let i = 1; i < FASES.length; i += 1) {
    assert.ok(FASES[i].escuridao > FASES[i - 1].escuridao, 'a noite não escurece');
    assert.ok(FASES[i].nevoa >= FASES[i - 1].nevoa, 'a névoa não aumenta');
    assert.ok(FASES[i].instabilidade > FASES[i - 1].instabilidade, 'as luzes não pioram');
  }
  for (const f of FASES) assert.ok(f.horas && f.etapa && f.resumo, `${f.id} incompleta`);
});

test('a fase vale para os sete mapas, e a conta mora num lugar só', () => {
  // Escrever os três estados em cada mapa daria 21 lugares para desencontrar.
  for (const m of MAPAS) {
    const calma = atmosferaDoMapa(m.id, 'estranheza');
    const cacada = atmosferaDoMapa(m.id, 'cacada');
    assert.ok(cacada.escuridao > calma.escuridao, `${m.id} não escurece na caçada`);
    assert.deepEqual(calma.efeitos, m.efeitos, `${m.id} perdeu os efeitos dele`);
  }
  assert.equal(atmosferaDoMapa('nao-existe', 'cacada'), null);
  assert.equal(fasePorId('inventada').id, 'estranheza');
});

test('todo efeito nomeado tem camada, ou é vazio de propósito', () => {
  /* Efeito sem camada não desenha nada — e é isso que permite mapa novo
     entrar sem quebrar tela. Mas o buraco tem que aparecer AQUI e não na
     mesa, então a tradução precisa conhecer todo efeito que existe. */
  const jsx = semComentarios(fonte('src/features/oneshot/AtmosferaDaCasa.jsx'));
  for (const m of MAPAS) {
    for (const efeito of m.efeitos) {
      assert.ok(jsx.includes(`'${efeito}'`),
        `o efeito "${efeito}" do mapa ${m.id} não foi traduzido em camada`);
    }
  }
});

test('toda camada citada existe no CSS', () => {
  const css = semComentarios(fonte('src/features/oneshot/atmosfera-da-casa.css'));
  const jsx = semComentarios(fonte('src/features/oneshot/AtmosferaDaCasa.jsx'));
  for (const m of jsx.matchAll(/'(atm-[a-z-]+)'/g)) {
    assert.ok(css.includes(`.${m[1]}`), `falta a regra .${m[1]} no CSS`);
  }
});

test('a pilha de camadas é a do guia', () => {
  assert.deepEqual(CAMADAS.map(c => c.id),
    ['base', 'escuridao', 'luzes', 'nevoa', 'sombras', 'aparicoes']);
  assert.equal(CAMADAS[0].fixa, true, 'o mapa base tem que ficar intacto');
});

test('a atmosfera não rouba o clique do mapa', () => {
  // O mapa continua sendo operado por baixo.
  const css = semComentarios(fonte('src/features/oneshot/atmosfera-da-casa.css'));
  assert.match(css.match(/\.atm\{[^}]*\}/)[0], /pointer-events:\s*none/);
  assert.match(css.match(/\.atm i\{[^}]*\}/)[0], /pointer-events:\s*none/);
});

test('o modo leve e o movimento reduzido param tudo', () => {
  const css = semComentarios(fonte('src/features/oneshot/atmosfera-da-casa.css'));
  assert.match(css, /html\[data-quality="light"\] \.atm i/);
  assert.match(css, /html\[data-motion="reduced"\] \.atm i/);
  assert.ok(!/prefers-reduced-motion/.test(css));
});

test('o apagão do ritual tem hora para acabar', () => {
  // Três segundos, como no guia: é o único efeito que tapa o mapa inteiro.
  assert.equal(mapaPorId('ritual').evento.escuridaoTotalMs, 3000);
  assert.equal(mapaPorId('ritual').nichos, 5);
});

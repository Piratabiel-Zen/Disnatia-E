/**
 * O SOM DA CASA
 *
 * O som é o único recurso aqui que a pessoa ouve sem olhar, e por isso é o
 * mais fácil de estragar: alto demais vira música de fundo e a mesa desliga;
 * previsível demais vira loop e o cérebro para de ouvir em dois minutos.
 *
 * O que estes testes guardam:
 *  - o volume NUNCA chega ao máximo por pressão — a casa pode apertar, não
 *    gritar; som que satura não sobra para o susto;
 *  - os eventos ficam mais FREQUENTES com a pressão, nunca mais raros;
 *  - cada mapa tem receita própria, porque sótão e porão soando igual é o
 *    jeito mais rápido de a casa inteira parecer um só corredor;
 *  - nada de arquivo de áudio: a CSP é estreita e cada host novo já quebrou
 *    alguma coisa nesta mesa.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  AMBIENTES, MULTIPLICADOR_MAXIMO, ambienteDoMapa, pressaDoAmbiente, proximoIntervalo,
} from '../src/features/oneshot/somDaCasa.mjs';
import { MAPAS } from '../src/features/oneshot/mapasDaCasa.mjs';
import { ORDEM_DAS_FASES, atmosferaComPressao } from '../src/features/oneshot/pressaoDaNoite.mjs';

const fonte = c => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8');

test('todo mapa da casa tem som', () => {
  for (const mapa of MAPAS) {
    const amb = ambienteDoMapa(mapa.id);
    assert.ok(amb, `mapa sem ambiente: ${mapa.id}`);
    assert.ok(amb.cama, `mapa sem cama de som: ${mapa.id}`);
    assert.ok(amb.zumbido, `mapa sem zumbido: ${mapa.id}`);
  }
});

test('cada mapa soa diferente do outro', () => {
  const assinaturas = Object.values(AMBIENTES)
    .map(a => JSON.stringify([a.cama, a.zumbido]));
  assert.equal(new Set(assinaturas).size, assinaturas.length,
    'dois mapas com a mesma receita de som');
});

test('mapa desconhecido não inventa som', () => {
  assert.equal(ambienteDoMapa('inexistente'), null);
});

test('a pressão aperta a casa sem subir o volume de verdade', () => {
  const calmo = pressaDoAmbiente(0, 1);
  const no_fim = pressaDoAmbiente(1, 3);
  assert.ok(no_fim.aperto > calmo.aperto, 'pressão devia encurtar as esperas');
  // O volume é multiplicador: subir muito cansa a mesa em vinte minutos.
  assert.ok(no_fim.volume / calmo.volume < 1.5,
    'o volume está sendo usado como intensidade, e é a frequência que cresce');
});

test('volume e aperto ficam na faixa com qualquer entrada', () => {
  for (const p of [-5, 0, 0.3, 1, 7, NaN, undefined]) {
    for (const i of [-2, 0, 0.5, 1, 9, NaN, undefined]) {
      const r = pressaDoAmbiente(p, i);
      assert.ok(Number.isFinite(r.volume) && r.volume >= 1 && r.volume <= 1.3,
        `volume fora da faixa com ${p}/${i}: ${r.volume}`);
      assert.ok(Number.isFinite(r.aperto) && r.aperto > 0
        && r.aperto <= MULTIPLICADOR_MAXIMO,
        `aperto fora da faixa com ${p}/${i}: ${r.aperto}`);
    }
  }
});

test('a noite só acelera, nunca desacelera', () => {
  // `aperto` é divisor: abaixo de 1 ele ESTICA as esperas, e isso é de
  // propósito na primeira fase — a estranheza é mais lenta que a receita
  // base, e é daí que vem a sensação de aceleração depois. O que não pode é
  // andar para trás: cada fase aperta mais que a anterior.
  const apertoDa = (fase, p) =>
    pressaDoAmbiente(p, atmosferaComPressao(fase, p).instabilidade).aperto;

  for (const p of [0, 0.5, 1]) {
    let anterior = 0;
    for (const fase of ORDEM_DAS_FASES) {
      const agora = apertoDa(fase, p);
      assert.ok(agora >= anterior, `${fase} ficou mais calma que a fase anterior`);
      anterior = agora;
    }
  }

  // A primeira fase estica no máximo uns poucos por cento: esticar muito
  // deixaria o mapa mudo justo quando a mesa está decidindo se tem medo.
  assert.ok(apertoDa(ORDEM_DAS_FASES[0], 0) > 0.9);
  // E a última, com a mesa no fim, aperta de verdade.
  assert.ok(apertoDa(ORDEM_DAS_FASES[ORDEM_DAS_FASES.length - 1], 1) > 1.2);
});

test('sob pressão os eventos chegam mais perto um do outro', () => {
  const faixa = [20, 60];
  const frouxo = proximoIntervalo(faixa, 1, () => 0.5);
  const apertado = proximoIntervalo(faixa, MULTIPLICADOR_MAXIMO, () => 0.5);
  assert.ok(apertado < frouxo, 'pressão devia encurtar a espera');
  assert.ok(apertado > 0);
});

test('o intervalo nunca encosta no zero', () => {
  for (const aperto of [0, 0.5, 1, 4]) {
    for (const sorte of [0, 0.5, 1]) {
      const s = proximoIntervalo([1, 2], aperto, () => sorte);
      assert.ok(s >= 0.4, `evento quase instantâneo: ${s}s`);
    }
  }
});

test('o intervalo varia: dois sorteios não dão o mesmo tempo', () => {
  const a = proximoIntervalo([10, 40], 1, () => 0.1);
  const b = proximoIntervalo([10, 40], 1, () => 0.9);
  assert.notEqual(a, b, 'sem variação o som vira metrônomo');
});

test('os eventos de cada mapa combinam com o lugar', () => {
  // O porão goteja e o sótão estala: se isto trocar, a casa inteira soa
  // igual e a mesa deixa de saber onde está pelo ouvido.
  const tipos = id => (ambienteDoMapa(id).eventos || []).map(e => e.tipo);
  assert.ok(tipos('porao').includes('goteira'));
  assert.ok(tipos('sotao').includes('estalo'));
  assert.ok(tipos('patio').includes('rajada'));
});

test('o som é sintetizado, não baixado', () => {
  for (const arquivo of [
    'src/features/oneshot/somDaCasa.mjs',
    'src/features/oneshot/motorDoAmbiente.mjs',
    'src/features/oneshot/AmbienteDaCasa.jsx',
  ]) {
    const codigo = semComentarios(fonte(arquivo));
    assert.ok(!/\.(mp3|ogg|wav|m4a)\b/i.test(codigo),
      `${arquivo} referencia arquivo de áudio`);
    assert.ok(!/new Audio\b|<audio/i.test(codigo),
      `${arquivo} usa a tag de áudio em vez de síntese`);
  }
});

test('o motor libera tudo o que criou', () => {
  const codigo = semComentarios(fonte('src/features/oneshot/motorDoAmbiente.mjs'));
  assert.match(codigo, /vivos/, 'o motor precisa registrar os nós que cria');
  assert.match(codigo, /\bparar\s*\(\s*\)\s*\{/,
    'sem parar() o som sobrevive à troca de mapa e empilha');
  assert.match(codigo, /disconnect\(\)/, 'nó não desconectado vaza');
});

test('nada toca antes de um gesto da pessoa', () => {
  const codigo = semComentarios(fonte('src/features/oneshot/AmbienteDaCasa.jsx'));
  assert.ok(/onClick/.test(codigo),
    'o ambiente precisa de um clique: navegador nenhum deixa tocar sozinho');
  assert.ok(!/autoPlay|autoplay/.test(codigo));
});

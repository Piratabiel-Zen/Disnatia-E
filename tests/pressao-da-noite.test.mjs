/**
 * A PRESSÃO DA NOITE E O RELÓGIO
 *
 * A queixa que gerou isto: o mapa é bonito mas não dá medo. O diagnóstico
 * foi que a atmosfera era CONSTANTE e só mudava quando o Mestre apertava um
 * botão — então o cenário ficava igual enquanto a cena piorava.
 *
 * O que estes testes guardam é a direção da mecânica: a pressão NUNCA
 * clareia a casa. Uma mesa calma vê a noite que o Mestre marcou; uma mesa
 * apavorada vê pior. O contrário — a casa melhorando porque todos estão
 * bem — tiraria a única direção que isto tem.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  MINUTOS_POR_FASE, ORDEM_DAS_FASES, PESO_DA_PRESSAO,
  atmosferaComPressao, faseDoRelogio, minutosAteVirar, pressaoDaMesa,
} from '../src/features/oneshot/pressaoDaNoite.mjs';
import { PAVOR_MAXIMO, SANIDADE_MAXIMA } from '../src/features/oneshot/fichaOneShot.mjs';

const fonte = c => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8');
const calma = { pavor: 0, sanidade: 0 };
const noFim = { pavor: PAVOR_MAXIMO, sanidade: SANIDADE_MAXIMA };

test('mesa inteira não gera pressão nenhuma', () => {
  assert.equal(pressaoDaMesa([calma, calma, calma]), 0);
  assert.equal(pressaoDaMesa([]), 0);
  assert.equal(pressaoDaMesa(null), 0);
});

test('mesa no fim gera pressão máxima', () => {
  assert.equal(pressaoDaMesa([noFim, noFim]), 1);
});

test('é a média da mesa, não o pior caso', () => {
  /* Uma criança apavorada no porão não deveria escurecer a casa para os
     quatro primos que estão bem na cozinha. */
  const umaSo = pressaoDaMesa([noFim, calma, calma, calma, calma]);
  const todas = pressaoDaMesa([noFim, noFim, noFim, noFim, noFim]);
  assert.ok(umaSo > 0 && umaSo < 0.3, `uma só apavorada deu ${umaSo}`);
  assert.equal(todas, 1);
});

test('o Pavor pesa mais que a Sanidade', () => {
  /* Pavor enche rápido e esvazia: é ele que acompanha a cena. Sanidade é o
     estrago que fica; pesando igual, a casa escureceria de vez na primeira
     visão e nunca mais aliviaria. */
  const soPavor = pressaoDaMesa([{ pavor: PAVOR_MAXIMO, sanidade: 0 }]);
  const soSanidade = pressaoDaMesa([{ pavor: 0, sanidade: SANIDADE_MAXIMA }]);
  assert.ok(soPavor > soSanidade, 'a Sanidade passou a pesar tanto quanto o Pavor');
});

test('a pressão só escurece, nunca clareia', () => {
  // É a única direção que esta mecânica tem.
  for (const fase of ORDEM_DAS_FASES) {
    const semMesa = atmosferaComPressao(fase, 0);
    const comMedo = atmosferaComPressao(fase, 1);
    assert.ok(comMedo.escuridao > semMesa.escuridao, `${fase}: não escureceu`);
    assert.ok(comMedo.nevoa > semMesa.nevoa, `${fase}: a névoa não aumentou`);
    assert.ok(comMedo.instabilidade > semMesa.instabilidade, `${fase}: as luzes não pioraram`);
  }
});

test('a hora continua mandando na estrutura da noite', () => {
  // 22h é diferente de 3h da manhã, aconteça o que acontecer: mesmo com a
  // mesa calma, a Caçada é mais escura que a Estranheza apavorada.
  const cacadaCalma = atmosferaComPressao('cacada', 0);
  const estranhezaApavorada = atmosferaComPressao('estranheza', 1);
  assert.ok(cacadaCalma.escuridao > estranhezaApavorada.escuridao);
});

test('a noite escurece de verdade, hora após hora', () => {
  // O pedido foi "muito mais escuro conforme vai passando". O que torna
  // isso verificável não é o número de uma camada, é a DISTÂNCIA entre a
  // primeira hora e a última: se a casa termina parecida com o começo, a
  // passagem do tempo não está sendo sentida.
  const cedo = atmosferaComPressao('estranheza', 0);
  const tarde = atmosferaComPressao('cacada', 1);
  assert.ok(tarde.escuridao - cedo.escuridao > 0.4,
    `a noite mal escureceu: ${cedo.escuridao} para ${tarde.escuridao}`);
  assert.ok(PESO_DA_PRESSAO.escuridao > 0);
});

test('e as luzes queimam mais forte à medida que a casa afunda', () => {
  // Escurecer sozinho faz mapa ilegível, que irrita em vez de assustar. O
  // que salva a leitura é a luz restante ganhar força junto — lâmpada acesa
  // dentro de quarto escuro, e não quarto escuro e mais nada.
  let anterior = 0;
  for (const fase of ORDEM_DAS_FASES) {
    const atm = atmosferaComPressao(fase, 0);
    assert.ok(atm.brilho > anterior, `${fase} não ficou mais brilhante`);
    anterior = atm.brilho;
  }
  const pior = atmosferaComPressao('cacada', 1);
  assert.ok(pior.brilho >= 2, `luz fraca demais para vencer o escuro: ${pior.brilho}`);
  assert.ok(pior.nevoa <= 0.42);
});

test('o tremor das luzes cresce com a noite e tem teto', () => {
  // Piscar é o que ele pediu; piscar sem teto é estroboscópio, e isso passa
  // de assustador para fisicamente ruim de olhar.
  const cedo = atmosferaComPressao('estranheza', 0);
  const tarde = atmosferaComPressao('cacada', 1);
  assert.ok(tarde.tremor > cedo.tremor * 1.8, 'a última hora tinha de piscar bem mais');
  assert.ok(tarde.tremor <= 0.9, `tremor ${tarde.tremor} apaga a casa inteira`);
  assert.ok(cedo.tremor < 0.35, 'a primeira hora não é para piscar muito');
});

/* ─── O relógio ───────────────────────────────────────────────────────── */

test('a noite anda sozinha, uma hora por vez', () => {
  const inicio = Date.now();
  const minuto = m => inicio + m * 60000;
  assert.equal(faseDoRelogio(inicio, minuto(0)), 'estranheza');
  assert.equal(faseDoRelogio(inicio, minuto(MINUTOS_POR_FASE - 1)), 'estranheza');
  assert.equal(faseDoRelogio(inicio, minuto(MINUTOS_POR_FASE)), 'assombracao');
  assert.equal(faseDoRelogio(inicio, minuto(MINUTOS_POR_FASE * 2)), 'cacada');
});

test('depois da Caçada vem o amanhecer, não mais uma volta', () => {
  // O amanhecer é o fim da sessão, não outra volta no relógio.
  const inicio = Date.now();
  assert.equal(faseDoRelogio(inicio, inicio + 60000 * 60 * 9), 'cacada');
  assert.equal(minutosAteVirar(inicio, inicio + 60000 * 60 * 9), null);
});

test('relógio não iniciado não faz a noite andar', () => {
  // Ele é opcional: parado, a hora é a que o Mestre marcou.
  assert.equal(faseDoRelogio(0), 'estranheza');
  assert.equal(faseDoRelogio(null), 'estranheza');
  assert.equal(faseDoRelogio(NaN), 'estranheza');
});

test('o Mestre continua mandando no relógio', () => {
  /* Automatismo que tira o controle de quem narra é automatismo errado:
     virar a hora na mão para a contagem. */
  const mapa = semComentarios(fonte('src/features/mapa-batalha/BattleMapPage.jsx'));
  assert.match(mapa, /if \(noiteComecouEm\) setNoiteComecouEm\(0\)/);
  assert.match(mapa, /setNoiteComecouEm\(v => \(v \? 0 : Date\.now\(\)\)\)/);
});

/* ─── O que quebra a constância ───────────────────────────────────────── */

test('a atmosfera tem o que quebra, e não só o que dura', () => {
  /* Constância vira papel de parede em dois minutos, por mais bem feita que
     seja. O que assusta é o que quebra. */
  const css = semComentarios(fonte('src/features/oneshot/atmosfera-da-casa.css'));
  for (const quebra of ['atmPisca', 'atmPassa', 'atmRespira']) {
    assert.match(css, new RegExp(`@keyframes ${quebra}`), `falta ${quebra}`);
  }
  // E a pressão deixa marca de estado, não mais um efeito piscando.
  assert.match(css, /\.atm-pressao\{[\s\S]*?opacity:var\(--atm-pressao/);
});

test('a pressão chega na tela pela raiz da camada', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/AtmosferaDaCasa.jsx'));
  assert.match(jsx, /'--atm-pressao': atm\.pressao/);
  assert.match(jsx, /atmosferaComPressao\(fase, pressao\)/);
});

test('o modo leve e o movimento reduzido param até a respiração', () => {
  // Ela vive na raiz da camada e não num filho, então precisa de regra
  // própria — a de `.atm i` não a alcança.
  const css = semComentarios(fonte('src/features/oneshot/atmosfera-da-casa.css'));
  assert.match(css, /html\[data-quality="light"\] \.atm,\s*\n?html\[data-motion="reduced"\] \.atm\{animation:none/);
});

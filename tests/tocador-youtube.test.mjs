/**
 * O TOCADOR PRECISA DIZER QUANDO NÃO TOCA
 *
 * A música era um <iframe> escondido com autoplay=1. Quando não soava, não
 * havia nada a observar — nem erro, nem estado. E "não soa" tem três causas
 * comuns, todas mudas: o navegador barra áudio sem um toque da pessoa; o
 * vídeo proíbe reprodução fora do YouTube, que é a regra em clipe de
 * gravadora; ou o vídeo foi removido.
 *
 * A API do YouTube devolve código para cada uma. Estes testes guardam a
 * tradução e o fato de o componente ter deixado de adivinhar.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { estaTocando, motivoDoErro } from '../src/shell/tocadorDoYoutube.mjs';

test('cada recusa do YouTube vira uma frase que diz o que fazer', () => {
  // 101 e 150 são o mesmo caso e o mais comum: clipe de gravadora.
  for (const codigo of [101, 150]) {
    assert.match(motivoDoErro(codigo), /fora do YouTube/, `código ${codigo}`);
    assert.match(motivoDoErro(codigo), /outra versão/, 'não diz o que fazer');
  }
  assert.match(motivoDoErro(100), /removido ou privado/);
  assert.match(motivoDoErro(2), /endereço/);
  assert.match(motivoDoErro(5), /não toca no navegador/);
  // Código desconhecido ainda assim orienta, em vez de mostrar um número.
  assert.match(motivoDoErro(999), /Escolha outro/);
  assert.ok(!/\d/.test(motivoDoErro(999)), 'o código cru vazou para a tela');
});

test('só PLAYING conta como som saindo', () => {
  // BUFFERING (3) parece sucesso e ainda pode terminar em erro. Se ele
  // contasse, o botão de destravar sumiria antes de a música existir.
  assert.equal(estaTocando(1), true);
  for (const estado of [-1, 0, 2, 3, 5]) assert.equal(estaTocando(estado), false, `estado ${estado}`);
});

test('o componente usa a API e não um iframe cego', () => {
  const fonte = readFileSync(new URL('../src/shell/AmbientSoundPlayer.jsx', import.meta.url), 'utf8');
  assert.match(fonte, /montarTocador/, 'o tocador voltou a ser um iframe solto');
  assert.ok(!/embedDoYoutube/.test(fonte), 'o endereço de embed cru voltou ao componente');
  assert.ok(!/sendCmd/.test(fonte), 'os comandos voltaram a ser postMessage no escuro');
  // O botão de destravar só aparece quando a API confirma que não há som.
  assert.match(fonte, /!soando && !erroDoVideo/, 'o botão de destravar voltou a adivinhar');
  // Pedir play de dentro do clique é o que o navegador exige.
  assert.match(fonte, /const destravarSom = \(\) => \{[\s\S]{0,180}playVideo/);
});

test('o aviso de faixa recusada é só para quem pode trocar a faixa', () => {
  const fonte = readFileSync(new URL('../src/shell/AmbientSoundPlayer.jsx', import.meta.url), 'utf8');
  assert.match(fonte, /erroDoVideo && masterMode &&/,
    'a mesa inteira voltou a receber aviso que só o Mestre resolve');
});

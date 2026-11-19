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
  // O quadro fica VISÍVEL até o YouTube confirmar que saiu som, e só então
  // se recolhe. Tocar escondido falhou duas vezes, e falhou calado.
  assert.match(fonte, /ambient-palco\$\{soando \? ' tocando' : ''\}/,
    'o tocador voltou a nascer escondido');
  assert.match(fonte, /\{!soando && \(\s*<div className="ambient-palco-aviso">/,
    'sumiu o aviso que explica por que o quadro está à vista');
});

test('a faixa recusada é explicada a quem ficou sem som, não só ao Mestre', () => {
  // Era só para o Mestre, por ser quem troca a faixa. Mas quem fica sem som
  // é o jogador, e ele ficava sem explicação nenhuma — concluindo que o site
  // estava quebrado.
  const fonte = readFileSync(new URL('../src/shell/AmbientSoundPlayer.jsx', import.meta.url), 'utf8');
  assert.match(fonte, /\{erroDoVideo && createPortal\(/);
  assert.ok(!/erroDoVideo && masterMode/.test(fonte));
});

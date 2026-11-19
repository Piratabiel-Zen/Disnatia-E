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
  // O quadro nasce escondido e tenta tocar sozinho. Só vem à frente se o
  // navegador tiver barrado — barrar é a exceção, não a regra: quem aperta
  // "Tocar" já deu o gesto que o navegador pede.
  assert.match(fonte, /ambient-palco\$\{precisaDeToque && !soando \? '' : ' tocando'\}/,
    'o quadro voltou a aparecer para todo mundo, sempre');
  assert.match(fonte, /\{precisaDeToque && !soando && \(\s*<div className="ambient-palco-aviso">/,
    'sumiu o aviso que explica por que o quadro apareceu');
});

test('a faixa recusada é explicada a quem ficou sem som, não só ao Mestre', () => {
  // Era só para o Mestre, por ser quem troca a faixa. Mas quem fica sem som
  // é o jogador, e ele ficava sem explicação nenhuma — concluindo que o site
  // estava quebrado.
  const fonte = readFileSync(new URL('../src/shell/AmbientSoundPlayer.jsx', import.meta.url), 'utf8');
  assert.match(fonte, /\{erroDoVideo && createPortal\(/);
  assert.ok(!/erroDoVideo && masterMode/.test(fonte));
});

test('o bloqueio é detectado por silêncio, não presumido', () => {
  const fonte = readFileSync(new URL('../src/shell/AmbientSoundPlayer.jsx', import.meta.url), 'utf8');
  // Dois segundos: o YouTube avisa PLAYING assim que o som sai, sem esperar
  // o buffer encher, então silêncio depois disso é bloqueio e não lentidão.
  assert.match(fonte, /setTimeout\(\(\) => \{[\s\S]{0,260}setPrecisaDeToque\(true\)[\s\S]{0,80}\}, 2000\)/,
    'o tocador voltou a adivinhar se foi barrado');
  // E o relógio precisa morrer com a faixa, senão a faixa seguinte herda
  // um aviso de bloqueio da anterior.
  assert.match(fonte, /clearTimeout\(relogio\)/);
  // Tocou: o quadro some, mesmo que tenha vindo à frente.
  assert.match(fonte, /if \(tocando\) setPrecisaDeToque\(false\)/);
});

test('cada faixa começa sem a marca de bloqueio da anterior', () => {
  const fonte = readFileSync(new URL('../src/shell/AmbientSoundPlayer.jsx', import.meta.url), 'utf8');
  const efeito = fonte.slice(fonte.indexOf('let vivo = true;'));
  assert.match(efeito.slice(0, 220), /setPrecisaDeToque\(false\)/,
    'o aviso de bloqueio ficaria pendurado na faixa seguinte');
});

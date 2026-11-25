/**
 * A PALETA DA MESA DE TERROR
 *
 *   preto carvão   #100D0C   o fundo de tudo
 *   sangue seco    #60191D   superfícies e o que está ativo
 *   ouro antigo    #B08A53   fios, títulos, o que chama
 *   pergaminho     #D8C5A4   o texto que se lê
 *   cinza fúnebre  #77716D   o texto que só acompanha
 *
 * O tema vinha de "sombrio", que é AZULADO no fundo e tem um vermelho de
 * sinalização — juntos davam ar de interface de alarme. A paleta é quente e
 * apagada: carvão em vez de azul, sangue SECO em vez de sangue fresco, que é
 * a diferença entre uma casa velha e um aviso de incêndio.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

const css = () => semComentarios(
  readFileSync(new URL('../src/features/oneshot/mortalha-casca.css', import.meta.url), 'utf8'),
);

const PALETA = Object.freeze({
  '--mor-carvao': '#100D0C',
  '--mor-sangue': '#60191D',
  '--mor-latao': '#B08A53',
  '--mor-pergaminho': '#D8C5A4',
  '--mor-cinza': '#77716D',
});

test('as cinco cores estão escritas exatamente como foram dadas', () => {
  const folha = css();
  for (const [nome, cor] of Object.entries(PALETA)) {
    assert.match(folha, new RegExp(`${nome}:${cor};`), `${nome} não é ${cor}`);
  }
});

test('o tema do app passa a vir da paleta', () => {
  const folha = css();
  /* As cores do app são escritas pelo JavaScript direto no elemento, então
     precisam de `!important` aqui: regra de folha não vence estilo em linha
     sem isso, e a troca não chegaria à tela. */
  for (const variavel of ['--accent', '--fundo-mesa', '--ink-mesa', '--superficie-mesa']) {
    const linha = folha.match(new RegExp(`${variavel}:[^;]+;`))?.[0] || '';
    assert.match(linha, /var\(--mor-/, `${variavel} não sai da paleta`);
    assert.match(linha, /!important/, `${variavel} não vence o estilo em linha`);
  }
});

test('nenhuma cor nova entra por fora das cinco', () => {
  /* Cada tom derivado é uma das cinco mais clara ou mais escura. É o que
     impede a paleta de virar sete cores em duas semanas — e o bloco de
     variáveis é o único lugar onde cor literal pode aparecer. */
  const folha = css();
  const bloco = folha.slice(folha.indexOf('html[data-tema-mesa="mortalha"]{'));
  const fim = bloco.indexOf('}');
  const declaradas = bloco.slice(0, fim);
  const resto = bloco.slice(fim);

  const literais = [...resto.matchAll(/#[0-9A-Fa-f]{6}/g)].map(m => m[0].toUpperCase());
  const permitidas = new Set([
    ...Object.values(PALETA).map(c => c.toUpperCase()),
    ...[...declaradas.matchAll(/#[0-9A-Fa-f]{6}/g)].map(m => m[0].toUpperCase()),
  ]);
  const intrusas = [...new Set(literais)].filter(c => !permitidas.has(c));
  assert.deepEqual(intrusas, [], `cores fora da paleta: ${intrusas.join(', ')}`);
});

test('o azul e o vermelho de sinalização foram embora', () => {
  const folha = css();
  // Os dois tons que davam o ar de alarme.
  for (const velha of ['#C8102E', '#FF4D5E', '#8E1F2B', '#C4414F', '#B08A42']) {
    assert.ok(!folha.includes(velha), `o tom antigo ${velha} ficou`);
  }
  // E os rgba() dos tons antigos também, que é por onde cor velha costuma
  // sobreviver: ninguém procura cor em `rgba(142,31,43,.5)`.
  for (const velha of ['142,31,43', '227,199,130', '201,168,106']) {
    assert.ok(!folha.includes(velha), `o rgba antigo ${velha} ficou`);
  }
  /* E o carvão pinta a RAIZ, não a casca. A casca fica transparente de
     propósito: o cenário da mesa é desenhado atrás dela, e casca com
     fundo opaco some com a mansão inteira — foi o que aconteceu quando
     esta paleta entrou. */
  assert.match(folha, /html\[data-tema-mesa="mortalha"\]\{\s*background:var\(--mor-carvao\);/);
  assert.match(folha, /\.adventure-shell[\s\S]{0,200}background:transparent !important/);
});

test('o cinza fúnebre tem um lugar, e é o texto de apoio', () => {
  const folha = css();
  // Ele dá ~3,5:1 sobre o carvão: serve para acompanhar, não para ler.
  assert.match(folha, /\.ad-companion-class\{color:var\(--mor-cinza\)/);
  assert.match(folha, /\.sessao-vazio\{color:var\(--mor-cinza\)/);
  // E não é usado como cor de título em lugar nenhum.
  assert.ok(!/h1\{[^}]*var\(--mor-cinza\)/.test(folha));
  assert.ok(!/h2\{[^}]*var\(--mor-cinza\)/.test(folha));
});

test('o cartão do personagem perdeu a cor de classe da Dinastia E', () => {
  const folha = css();
  // O verde-água vinha de uma cor de classe que nesta mesa não quer dizer
  // nada — e cor que não quer dizer nada é cor que atrapalha.
  assert.match(folha, /\.ad-companion\{[^}]*border-color:var\(--mor-latao-fraco\) !important/);
  assert.match(folha, /\.ad-portrait\{[^}]*color:var\(--mor-latao\) !important/);
});

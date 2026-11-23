/**
 * A CASCA DO GRIMÓRIO
 *
 * Esta é a camada de maior risco do projeto inteiro: ela repinta a CASCA —
 * barra do topo, navegação, página inicial — que é compartilhada pelas três
 * mesas. Um seletor sem o tema vaza para a Dinastia E e para o CAIN, e o
 * estrago aparece numa mesa que ninguém abriu para testar.
 *
 * Por isso o teste principal daqui não é de aparência: é que NADA escape do
 * `html[data-tema-mesa="mortalha"]`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

const fonte = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');
const casca = () => semComentarios(fonte('src/features/oneshot/mortalha-casca.css'));

/** As regras do arquivo, uma a uma, já sem comentário. */
function regras(css) {
  const corpo = css.replace(/@media[^{]*\{/g, '').replace(/@keyframes[^{]*\{[\s\S]*?\n\}/g, '');
  return [...corpo.matchAll(/([^{}]+)\{[^{}]*\}/g)]
    .map(m => m[1].trim())
    .filter(sel => sel && !sel.startsWith('@') && !/^\d/.test(sel));
}

test('nenhuma regra escapa do tema da mortalha', () => {
  /* O teste que justifica o arquivo. Um seletor sem o tema repinta a
     Dinastia E e o CAIN junto, e isso só se descobre abrindo uma mesa que
     ninguém ia abrir hoje. */
  const vazando = [];
  for (const seletor of regras(casca())) {
    for (const parte of seletor.split(',')) {
      const s = parte.trim();
      if (!s) continue;
      // `html[data-tema-mesa="mortalha"]` em qualquer posição do seletor,
      // inclusive combinado com data-motion ou data-quality.
      if (!/\[data-tema-mesa="mortalha"\]/.test(s)) vazando.push(s);
    }
  }
  assert.deepEqual(vazando, [],
    `estas regras valem para TODA mesa:\n  ${vazando.join('\n  ')}`);
});

test('a fita só existe no desktop; no celular a barra de baixo manda', () => {
  // Repintar a fita no celular criaria uma SEGUNDA navegação em cima da
  // barra de baixo, que já resolve.
  const css = casca();
  const estreito = css.match(/@media \(max-width:900px\)\{[\s\S]*?\n\}/);
  assert.ok(estreito, 'sumiu a regra de celular');
  assert.match(estreito[0], /\.grim-nav\{display:none !important\}/);
});

test('o palco perde a margem do trilho quando a navegação sobe', () => {
  // A margem de 76px existia para o trilho vertical; mantida com a fita no
  // topo, deixaria uma faixa vazia na esquerda da mesa inteira.
  const css = casca();
  assert.match(css, /\.immersive-stage\{margin-left:0 !important\}/);
  // E o conteúdo desce o bastante para não ficar embaixo da fita.
  assert.match(css, /padding-top:calc\(var\(--mor-topo\) \+ var\(--mor-fita\)/);
});

test('o rótulo aparece na fita', () => {
  /* O trilho mostrava só ícone porque tinha 76px de largura. Numa fita
     horizontal sobra largura, e ícone sozinho obrigaria a decorar símbolo —
     o contrário do que a referência pede. */
  const css = casca();
  assert.match(css, /\.grim-link \.grim-label\{[^}]*display:inline !important/);
});

test('o lacre cabe dentro do recorte do pergaminho', () => {
  /* O `clip-path` que faz o rasgo do papel corta os pseudoelementos junto:
     um lacre com `top` negativo aparecia pela metade, como se estivesse
     quebrado. */
  const css = casca();
  const lacre = css.match(/\.ad-scene-copy::before\{[^}]*\}/)[0];
  const top = lacre.match(/top:(-?[\d.]+)px/);
  assert.ok(top, 'o lacre perdeu a posição');
  assert.ok(Number(top[1]) >= 0,
    `o lacre está em ${top[1]}px e vai ser cortado pelo recorte do papel`);
});

test('a perfumaria anima só transform e opacity', () => {
  /* Animar `padding`, `width` ou `height` num botão empurra o texto ao lado
     e força recálculo de layout a cada quadro. Numa tela que já tem mapa,
     tokens e mural, isso custa quadro — e o brinde passa a atrapalhar
     exatamente a mesa que ele deveria enfeitar. */
  const css = casca();
  const proibidas = /\b(width|height|padding|margin|top|left|font-size)\s*:/;
  for (const bloco of css.match(/@keyframes[^{]*\{[\s\S]*?\n\}/g) || []) {
    const passos = bloco.match(/\{[^{}]*\}/g) || [];
    for (const passo of passos) {
      assert.ok(!proibidas.test(passo),
        `uma animação mexe em layout: ${passo.trim().slice(0, 70)}`);
    }
  }
});

test('nenhum brinde passa de 700ms', () => {
  // O jogador clica nesses botões centenas de vezes numa noite: brinde que
  // demora vira atraso.
  const css = casca();
  for (const m of css.matchAll(/(?:transition|animation)[^;]*?([\d.]+)s/g)) {
    assert.ok(Number(m[1]) <= 0.7, `há um efeito de ${m[1]}s na casca`);
  }
});

test('quem pediu menos movimento fica sem brinde, e com tudo funcionando', () => {
  const css = casca();
  assert.match(css, /html\[data-motion="reduced"\]\[data-tema-mesa="mortalha"\]/);
  // E sem media query: `movimento.mjs` já escreve `data-motion`, e repetir
  // aqui passaria por cima de quem religou o movimento na mesa.
  assert.ok(!/prefers-reduced-motion/.test(css));
});

test('o foco continua visível apesar da perfumaria', () => {
  // Enfeite não pode custar o teclado.
  assert.match(casca(), /:focus-visible\{[\s\S]{0,120}?outline:2px solid/);
});

test('a casca é carregada uma vez, na sessão', () => {
  const sessao = semComentarios(fonte('src/AuthenticatedSession.jsx'));
  assert.match(sessao, /mortalha-casca\.css/);
});

test('o tema da mortalha continua sendo o da mesa de uma noite', () => {
  // Se o tema mudar de nome, esta casca inteira deixa de valer — calada.
  const sistema = semComentarios(fonte('src/core/sistemas/oneshot/index.mjs'));
  assert.match(sistema, /mortalha/);
});

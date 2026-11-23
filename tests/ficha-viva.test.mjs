/**
 * A FICHA QUE REAGE AO ESTADO
 *
 * O que estes testes guardam é uma inversão, e é a armadilha inteira desta
 * feature: Vida CAI e Pavor e Sanidade ENCHEM. Então "pior" é número baixo
 * num caso e alto nos outros, e um `>` trocado deixa a ficha sangrenta quando
 * o personagem está inteiro — um bug que ninguém nota olhando o código e que
 * só aparece na mesa, no meio da cena.
 *
 * Por isso `deterioracao()` é a única coisa no sistema que conhece a direção,
 * e o CSS só lê os níveis de 0 a 3 que ela devolve.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  PAVOR_MAXIMO, SANIDADE_MAXIMA, deterioracao, retratoPerturbado, fichaNova,
} from '../src/features/oneshot/fichaOneShot.mjs';

const fonte = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');
const adulto = extra => ({ idade: '34', pv: 5, pavor: 0, sanidade: 0, ...extra });

test('ficha inteira não tem reação nenhuma', () => {
  const nada = deterioracao(adulto());
  assert.deepEqual({ ...nada }, { ferida: 0, pavor: 0, sanidade: 0 });
});

test('a direção está certa: vida cai, os medidores enchem', () => {
  // É ISTO que o teste existe para guardar. Invertido, a ficha fica
  // sangrenta com o personagem inteiro e limpa com ele morrendo.
  assert.ok(deterioracao(adulto({ pv: 1 })).ferida > deterioracao(adulto({ pv: 5 })).ferida,
    'vida baixa tem que ferir MAIS que vida cheia');
  assert.ok(
    deterioracao(adulto({ pavor: PAVOR_MAXIMO })).pavor > deterioracao(adulto({ pavor: 0 })).pavor,
    'pavor cheio tem que reagir MAIS que pavor vazio');
  assert.ok(
    deterioracao(adulto({ sanidade: SANIDADE_MAXIMA })).sanidade
      > deterioracao(adulto({ sanidade: 0 })).sanidade,
    'sanidade cheia tem que reagir MAIS que sanidade vazia');
});

test('a vida conta pela fração que sobrou, não pelo número', () => {
  // 2 de 3 e 2 de 5 são situações bem diferentes na mesa: a criança de 3 PV
  // com 2 está melhor que o adulto de 5 com 2.
  const crianca = { idade: '10', pv: 2, pavor: 0, sanidade: 0 };
  const adultoFerido = { idade: '34', pv: 2, pavor: 0, sanidade: 0 };
  assert.ok(deterioracao(crianca).ferida < deterioracao(adultoFerido).ferida);
});

test('vida zerada é o fim da escala', () => {
  assert.equal(deterioracao(adulto({ pv: 0 })).ferida, 3);
});

test('o nível máximo é 3 e o mínimo é 0, sempre', () => {
  // O CSS tem regra para 1, 2 e 3. Um 4 escaparia sem estilo nenhum e um -1
  // viraria seletor inválido.
  const extremos = [
    adulto({ pv: -9, pavor: 99, sanidade: 99 }),
    adulto({ pv: 999, pavor: -5, sanidade: -5 }),
    fichaNova(),
  ];
  for (const ficha of extremos) {
    for (const [nome, n] of Object.entries(deterioracao(ficha))) {
      assert.ok(Number.isInteger(n) && n >= 0 && n <= 3, `${nome} saiu ${n}`);
    }
  }
});

test('o medidor cheio avisa antes de encher', () => {
  // Se o aviso só chega no cheio, ele chega junto com a visão e não avisa
  // nada: a mesa precisa ver a ficha piorando antes do estouro.
  assert.ok(deterioracao(adulto({ pavor: PAVOR_MAXIMO - 1 })).pavor >= 1);
  assert.ok(deterioracao(adulto({ sanidade: SANIDADE_MAXIMA - 2 })).sanidade >= 1);
});

/* ─── O retrato ───────────────────────────────────────────────────────── */

test('o retrato só se altera com a sanidade no fim', () => {
  assert.equal(retratoPerturbado(adulto({ sanidade: 0 })), false);
  assert.equal(retratoPerturbado(adulto({ sanidade: SANIDADE_MAXIMA })), true);
});

test('o Mestre desliga o retrato perturbador por ficha', () => {
  // Mexer na cara do personagem de alguém sem avisar cai mal com quem não
  // pediu, então a chave existe e desligada ela MANDA.
  const noFim = adulto({ sanidade: SANIDADE_MAXIMA });
  assert.equal(retratoPerturbado({ ...noFim, retratoPerturbador: false }), false);
  // Ligado é o padrão: ficha antiga, sem o campo, continua reagindo.
  assert.equal(retratoPerturbado(noFim), true);
  assert.equal(fichaNova().retratoPerturbador, true);
});

test('a ficha sem retrato não se perturba', () => {
  // Quadrado vazio com olhos escurecendo não é susto, é defeito.
  const ficha = semComentarios(fonte('src/features/oneshot/FichaOneShot.jsx'));
  assert.match(ficha, /data-perturbado=\{ficha\.retrato && retratoPerturbado\(ficha\)/);
});

/* ─── As camadas ──────────────────────────────────────────────────────── */

test('as camadas leem o nível, nunca o valor cru', () => {
  /* Regra de CSS olhando `pv` ou `pavor` direto é como a inversão volta: o
     arquivo passa a ter a direção escrita nele, em dezenas de seletores. */
  const css = semComentarios(fonte('src/features/oneshot/ficha-viva.css'));
  for (const nivel of ['ferida', 'pavor', 'sanidade']) {
    for (const n of [1, 2, 3]) {
      assert.ok(css.includes(`[data-${nivel}="${n}"]`), `falta regra para ${nivel} ${n}`);
    }
  }
});

test('nenhuma camada rouba o clique da ficha', () => {
  // Ficha bonita que não deixa clicar no campo é ficha quebrada.
  const css = semComentarios(fonte('src/features/oneshot/ficha-viva.css'));
  const camada = css.match(/\.osf-vivo\{[^}]*\}/)[0];
  assert.match(camada, /pointer-events:\s*none/);
  const retrato = css.match(/\.osf-retrato\[data-perturbado\]::after\{[^}]*\}/)[0];
  assert.match(retrato, /pointer-events:\s*none/);
});

test('o modo leve e quem pediu menos movimento não ganham animação', () => {
  const css = semComentarios(fonte('src/features/oneshot/ficha-viva.css'));
  assert.match(css, /html\[data-quality="light"\][\s\S]{0,200}?animation:\s*none/);
  assert.match(css, /html\[data-motion="reduced"\][\s\S]{0,200}?animation:\s*none/);
  // E NÃO por media query: `movimento.mjs` já lê o sistema e escreve
  // `data-motion`, então repetir aqui passaria por cima da pessoa que
  // religou o movimento na mesa. Há teste no projeto inteiro para isso.
  assert.ok(!/prefers-reduced-motion/.test(css),
    'a media query voltou: ela tira do jogador a escolha que é dele');
});

test('a ficha carrega as camadas e marca os níveis na raiz', () => {
  const ficha = semComentarios(fonte('src/features/oneshot/FichaOneShot.jsx'));
  assert.match(ficha, /ficha-viva\.css/);
  for (const nivel of ['ferida', 'pavor', 'sanidade']) {
    assert.match(ficha, new RegExp(`data-${nivel}=\\{estado\\.${nivel}`),
      `a raiz não marca ${nivel}`);
  }
  // Nível 0 não vira atributo: `data-pavor="0"` casaria com seletor de
  // presença e acenderia a camada na ficha inteira.
  assert.match(ficha, /estado\.ferida \|\| undefined/);
});

test('a dica da competência diz de onde vem o número', () => {
  const ficha = semComentarios(fonte('src/features/oneshot/FichaOneShot.jsx'));
  assert.match(ficha, /osf-dica/);
  assert.match(ficha, /NOME_DO_ATRIBUTO\[id\]\}\s*\$\{valorDoAtributo\(ficha, id\)/);
  const css = semComentarios(fonte('src/features/oneshot/ficha-one-shot.css'));
  assert.match(css, /li:hover \.osf-dica[\s\S]{0,80}?display:block/);
  // Em tela de toque a dica viraria um quadro preto tapando a de baixo.
  assert.match(css, /@media \(hover:none\)[\s\S]{0,120}?display:none/);
});

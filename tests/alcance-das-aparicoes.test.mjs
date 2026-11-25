/**
 * QUEM VÊ A APARIÇÃO
 *
 * Três alcances: NINGUÉM, A MESA, ALGUNS.
 *
 * A regra que estes testes guardam acima de todas: `liberadoPara` é o que o
 * BANCO obedece. A tela do jogador não filtra nada em JavaScript — ela
 * pergunta ao Firestore por `liberadoParaTodos == true` e por
 * `liberadoPara` contendo o uid dela. Quem está nessa lista RECEBE o
 * documento, e nenhum cuidado no código adiantaria depois disso.
 *
 * Por isso a escolha do Mestre (`alcance`, `plateia`) é separada do efeito
 * (`liberadoParaTodos`, `liberadoPara`): a plateia pode ficar guardada sem
 * estar valendo, que era o que faltava.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  ALCANCES, aparicaoNova, alcanceDa, plateiaDa, comAlcance, alternarPessoa,
  revelarParaTodos, estaRevelada, quemVe, ehAlcance, cartaoDeAparicao,
} from '../src/features/oneshot/aparicoes.mjs';
import {
  avisoDeAssombracao, assombracaoEhMinha,
} from '../src/features/oneshot/assombracao.mjs';

const fonte = c => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8');

/** O que o banco entrega, dado um documento e quem está perguntando. */
const quemRecebe = (ap, uids) => uids.filter(uid =>
  ap.liberadoParaTodos === true
  || (Array.isArray(ap.liberadoPara) && ap.liberadoPara.map(String).includes(String(uid))));

const TODOS = ['ana', 'bia', 'caio'];

test('os três alcances existem e nada além deles', () => {
  assert.deepEqual(ALCANCES.map(a => a.id), ['ninguem', 'mesa', 'alguns']);
  for (const a of ALCANCES) assert.ok(a.nome && a.resumo);
  assert.equal(ehAlcance('inventado'), false);
});

test('a aparição nasce para ninguém', () => {
  // Aparição que nasce revelada estraga a cena antes de ela existir, e é o
  // erro que não dá para desfazer numa mesa de terror.
  const nova = aparicaoNova('vulto');
  assert.equal(alcanceDa(nova), 'ninguem');
  assert.deepEqual(quemRecebe(nova, TODOS), []);
  assert.equal(estaRevelada(nova), false);
});

test('ninguém significa ninguém, inclusive no banco', () => {
  const ap = comAlcance(aparicaoNova(), 'ninguem');
  assert.equal(ap.liberadoParaTodos, false);
  assert.deepEqual(ap.liberadoPara, []);
  assert.deepEqual(quemRecebe(ap, TODOS), []);
});

test('a mesa significa todos', () => {
  const ap = comAlcance(aparicaoNova(), 'mesa');
  assert.equal(ap.liberadoParaTodos, true);
  assert.deepEqual(quemRecebe(ap, TODOS), TODOS);
  assert.equal(quemVe(ap), 'A mesa inteira');
});

test('alguns significa só quem foi apontado', () => {
  let ap = alternarPessoa(aparicaoNova(), 'bia');
  assert.equal(alcanceDa(ap), 'alguns');
  assert.deepEqual(quemRecebe(ap, TODOS), ['bia']);
  ap = alternarPessoa(ap, 'caio');
  assert.deepEqual(quemRecebe(ap, TODOS).sort(), ['bia', 'caio']);
  assert.equal(quemVe(ap, { bia: 'Mika', caio: 'Takuro' }), 'Mika, Takuro');
});

/* ─── O que faltava: a plateia sobrevive ─── */

test('recolher para ninguém não apaga a plateia escolhida', () => {
  /* Era o defeito do controle anterior: "Recolher" zerava `liberadoPara`,
     então montar a plateia, guardar e soltar depois obrigava a remontar a
     lista inteira. */
  let ap = alternarPessoa(alternarPessoa(aparicaoNova(), 'bia'), 'caio');
  ap = comAlcance(ap, 'ninguem');
  assert.deepEqual(plateiaDa(ap).sort(), ['bia', 'caio'], 'a plateia foi perdida');
  // Mas guardada não é valendo: o banco não entrega para ninguém.
  assert.deepEqual(quemRecebe(ap, TODOS), []);
  // E volta inteira ao soltar.
  assert.deepEqual(quemRecebe(comAlcance(ap, 'alguns'), TODOS).sort(), ['bia', 'caio']);
});

test('passar pela mesa também não apaga a plateia', () => {
  let ap = alternarPessoa(aparicaoNova(), 'ana');
  ap = comAlcance(ap, 'mesa');
  assert.deepEqual(plateiaDa(ap), ['ana']);
  // Na mesa, porém, a lista específica NÃO pode estar no campo do banco:
  // ela só confundiria quem for ler o documento depois.
  assert.deepEqual(ap.liberadoPara, []);
  assert.deepEqual(quemRecebe(comAlcance(ap, 'alguns'), TODOS), ['ana']);
});

test('marcar alguém já revela para essa pessoa', () => {
  // Apontar uma pessoa e a aparição continuar invisível para ela seria a
  // pior surpresa possível no meio de uma cena.
  const ap = alternarPessoa(comAlcance(aparicaoNova(), 'ninguem'), 'ana');
  assert.equal(alcanceDa(ap), 'alguns');
  assert.deepEqual(quemRecebe(ap, TODOS), ['ana']);
});

test('tirar o último da plateia volta para ninguém', () => {
  // Alcance "alguns" com a lista vazia é um estado que não quer dizer nada.
  let ap = alternarPessoa(aparicaoNova(), 'ana');
  ap = alternarPessoa(ap, 'ana');
  assert.equal(alcanceDa(ap), 'ninguem');
  assert.deepEqual(quemRecebe(ap, TODOS), []);
  assert.equal(quemVe(ap), 'Ninguém ainda');
});

test('a mesma pessoa não entra duas vezes', () => {
  const ap = comAlcance({ ...aparicaoNova(), plateia: ['ana', 'ana', 'bia'] }, 'alguns');
  assert.deepEqual(ap.liberadoPara.sort(), ['ana', 'bia']);
});

test('alcance inválido cai em ninguém, e não na mesa', () => {
  // Errar para o lado de não revelar: revelar sem querer não tem desfazer.
  for (const ruim of ['', null, undefined, 'todos', 42]) {
    const ap = comAlcance(aparicaoNova(), ruim);
    assert.equal(alcanceDa(ap), 'ninguem', `${String(ruim)} virou outra coisa`);
    assert.deepEqual(quemRecebe(ap, TODOS), []);
  }
});

/* ─── Aparições antigas ─── */

test('aparição antiga continua valendo, sem conversão', () => {
  // Documentos já gravados não têm `alcance` nem `plateia`: o alcance é
  // deduzido do efeito que elas já tinham.
  assert.equal(alcanceDa({ liberadoParaTodos: true }), 'mesa');
  assert.equal(alcanceDa({ liberadoParaTodos: false, liberadoPara: ['ana'] }), 'alguns');
  assert.equal(alcanceDa({ liberadoParaTodos: false, liberadoPara: [] }), 'ninguem');
  assert.equal(alcanceDa({}), 'ninguem');
  // E a plateia antiga era a própria lista de liberados.
  assert.deepEqual(plateiaDa({ liberadoPara: ['ana', 'bia'] }), ['ana', 'bia']);
});

test('o alcance gravado manda mais que o efeito antigo', () => {
  const ap = { alcance: 'ninguem', plateia: ['ana'], liberadoParaTodos: false, liberadoPara: [] };
  assert.equal(alcanceDa(ap), 'ninguem');
  assert.deepEqual(plateiaDa(ap), ['ana']);
});

test('revelarParaTodos continua funcionando para quem já chamava', () => {
  const ap = revelarParaTodos(aparicaoNova(), true);
  assert.equal(alcanceDa(ap), 'mesa');
  assert.equal(alcanceDa(revelarParaTodos(ap, false)), 'ninguem');
});

/* ─── O mural ─── */

test('pregar no mural herda a mesma plateia, pela mesma conta', () => {
  // Pregar uma aparição que só um primo viu não pode mostrá-la aos outros.
  const so = alternarPessoa(aparicaoNova(), 'bia');
  const cartao = cartaoDeAparicao(so, { id: 'c1' });
  assert.deepEqual(quemRecebe(cartao, TODOS), ['bia']);

  const guardada = comAlcance(so, 'ninguem');
  assert.deepEqual(quemRecebe(cartaoDeAparicao(guardada, { id: 'c2' }), TODOS), [],
    'o cartão revelou o que a aparição estava guardando');

  const aberta = comAlcance(so, 'mesa');
  assert.deepEqual(quemRecebe(cartaoDeAparicao(aberta, { id: 'c3' }), TODOS), TODOS);
});

/* ─── A tela ─── */

test('tudo que muda quem vê passa pela mesma função', () => {
  const mjs = semComentarios(fonte('src/features/oneshot/aparicoes.mjs'));
  // Escrever `liberadoPara` à mão em qualquer outro lugar é como o
  // vazamento acontece.
  const escritas = (mjs.match(/liberadoPara:/g) || []).length;
  assert.equal(escritas, 2, 'alguém voltou a montar `liberadoPara` fora de comEfeito/cartão');
  assert.match(mjs, /function comEfeito/);
});

test('a página não mexe nos campos do banco por fora', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/AparicoesPage.jsx'));
  assert.ok(!/liberadoPara:/.test(jsx), 'a página está montando a liberação à mão');
  assert.ok(!/liberadoParaTodos:/.test(jsx));
  // Ela escolhe o alcance e aponta pessoas; o resto é consequência.
  assert.match(jsx, /comAlcance\(a, al\.id\)/);
  assert.match(jsx, /alternarPessoa\(aberta, f\.dono\)/);
});

test('os três alcances ficam à vista na linha, juntos', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/AparicoesPage.jsx'));
  // A pergunta no meio da cena não é "revelo?", é "para quem?".
  assert.match(jsx, /ALCANCES\.map\(al => \(/);
  assert.match(jsx, /data-ligado=\{alcanceDa\(a\) === al\.id/);
  const css = semComentarios(fonte('src/features/oneshot/aparicoes.css'));
  assert.match(css, /\.apa-alcance\{[^}]*display:flex/);
});

test('escolher "Alguns" abre a plateia', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/AparicoesPage.jsx'));
  // Escolher o alcance sem escolher as pessoas não revela para ninguém, e
  // o Mestre acharia que revelou.
  assert.match(jsx, /if \(al\.id === 'alguns'\) \{/);
  assert.match(jsx, /setEscolhendoPlateia\(String\(a\.id\)\)/);
});

test('o mestre é avisado quando a plateia não está valendo', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/AparicoesPage.jsx'));
  assert.match(jsx, /alcanceDa\(aberta\) !== 'alguns' && plateiaDa\(aberta\)\.length > 0/);
  assert.match(jsx, /alcanceDa\(aberta\) === 'alguns' && plateiaDa\(aberta\)\.length === 0/);
  // E quando não há a quem apontar, porque quem vê é decidido pelo uid.
  assert.match(jsx, /fichas\.some\(f => f\.dono\) \? \(/);
});

/* ─── A assombração ─── */

test('o susto segue o alcance da aparição', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/AparicoesPage.jsx'));
  /* Antes isto revelava para a mesa inteira, SEMPRE. Fazia sentido quando
     revelar era sim ou não, e deixou de fazer com o alcance "alguns": o
     Mestre apontava dois primos e o susto entregava a coisa para os cinco. */
  assert.match(jsx, /const alvo = alcance === 'alguns' \? plateiaDa\(aparicao\) : \[\];/);
  assert.match(jsx, /para: alvo/);
  // "Ninguém" é o único caso em que a ação muda a escolha do Mestre, e por
  // um motivo de cena: susto que não deixa nada para examinar frustra.
  assert.match(jsx, /if \(alcance === 'ninguem'\) \{/);
  assert.ok(!/if \(!aparicao\?\.liberadoParaTodos\) \{/.test(jsx),
    'voltou a forçar a revelação para todos');
});

test('quem não está na plateia não leva o susto', () => {
  const mjs = semComentarios(fonte('src/features/oneshot/assombracao.mjs'));
  assert.match(mjs, /export function assombracaoEhMinha/);
  const jsx = semComentarios(fonte('src/features/oneshot/Assombracao.jsx'));
  assert.match(jsx, /if \(!assombracaoEhMinha\(novo, uid\)\) return;/);
  // A sobreposição precisa saber quem está olhando, senão não tem como
  // conferir coisa nenhuma.
  assert.match(semComentarios(fonte('src/AuthenticatedSession.jsx')), /<Assombracao uid=/);
});

test('lista vazia quer dizer a mesa inteira', () => {
  // É como era antes, e continua sendo o caso comum: aparição revelada à
  // mesa assombra a mesa.
  const paraTodos = avisoDeAssombracao({ aparicao: { titulo: 'x' } });
  assert.deepEqual(paraTodos.para, []);
  for (const uid of [...TODOS, '', undefined]) {
    assert.equal(assombracaoEhMinha(paraTodos, uid), true, `${String(uid)} ficou de fora`);
  }
});

test('com plateia, só a plateia leva o susto', () => {
  const so = avisoDeAssombracao({ aparicao: { titulo: 'x' }, para: ['bia', 'bia', ''] });
  assert.deepEqual(so.para, ['bia']);
  assert.equal(assombracaoEhMinha(so, 'bia'), true);
  assert.equal(assombracaoEhMinha(so, 'ana'), false);
  assert.equal(assombracaoEhMinha(so, ''), false);
  // Dois primos veem a tela escurecer enquanto os outros três não veem
  // nada: é uma cena difícil de conseguir de qualquer outro jeito.
  assert.deepEqual(TODOS.filter(u => assombracaoEhMinha(so, u)), ['bia']);
});

test('o limite da assombração está escrito', () => {
  // O canal vivo entrega a todo mundo e não tem consulta por destinatário
  // como o Firestore das aparições: o recorte é de tela. Quem for mexer
  // nisto depois precisa saber disso antes de confiar demais.
  assert.match(fonte('src/features/oneshot/assombracao.mjs'), /o recorte aqui é de TELA/);
});

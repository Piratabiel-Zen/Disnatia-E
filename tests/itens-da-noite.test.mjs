/**
 * OS ITENS DA NOITE
 *
 * O que não pode quebrar: o corte da descrição (é o que Gabriel pediu com
 * nome e sobrenome) e a amarração entre o alcance e o que o banco entrega.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TAMANHO_DA_DESCRICAO, ALCANCES_DE_ITEM, resumoCurto, foiCortada,
  itemNovo, comDonos, alternarDono, donosDe, alcanceDe, quemTem, bolsaDe,
} from '../src/features/oneshot/itens.mjs';

test('descrição curta passa inteira, sem reticências', () => {
  assert.equal(resumoCurto('Uma lanterna de pilha.'), 'Uma lanterna de pilha.');
  assert.equal(foiCortada('Uma lanterna de pilha.'), false);
});

test('descrição longa é cortada no espaço, com "…"', () => {
  const longa = 'Uma lanterna de pilha que o avô guardava na gaveta da cozinha, '
    + 'com a lente trincada e o corpo amassado de tanto cair no chão de pedra.';
  const curta = resumoCurto(longa);
  assert.ok(curta.length <= TAMANHO_DA_DESCRICAO + 1, `ficou com ${curta.length}`);
  assert.ok(curta.endsWith('…'));
  // Não parte palavra no meio.
  assert.ok(longa.startsWith(curta.slice(0, -1)), 'o corte não bate com o texto');
  assert.ok(!/\s…$/.test(curta), 'sobrou espaço antes das reticências');
  assert.equal(foiCortada(longa), true);
});

test('palavra única e enorme é cortada mesmo assim', () => {
  // Voltar até o espaço aqui deixaria o cartão vazio.
  const r = resumoCurto('A'.repeat(300), 20);
  assert.equal(r, 'A'.repeat(20) + '…');
});

test('espaços e quebras viram um espaço só', () => {
  assert.equal(resumoCurto('  uma   chave\n\n  enferrujada  '), 'uma chave enferrujada');
});

test('o alcance e o que o banco entrega andam juntos', () => {
  const daMesa = itemNovo({ nome: 'Chave', alcance: 'mesa', donos: ['a', 'b'] });
  assert.equal(daMesa.liberadoParaTodos, true);
  assert.deepEqual(daMesa.liberadoPara, [], 'item da mesa não precisa de lista');

  const deAlguem = itemNovo({ nome: 'Lanterna', alcance: 'alguns', donos: ['a', 'a', 'b'] });
  assert.equal(deAlguem.liberadoParaTodos, false);
  assert.deepEqual(deAlguem.liberadoPara, ['a', 'b'], 'repetido não vira dois');
});

test('item sem nome não existe', () => {
  for (const vazio of ['', '   ', null, undefined]) {
    assert.equal(itemNovo({ nome: vazio }), null);
  }
});

test('item sem dono some da tela de todos — é rascunho do Mestre', () => {
  const r = comDonos({ nome: 'x' }, 'alguns', []);
  assert.equal(r.liberadoParaTodos, false);
  assert.deepEqual(r.liberadoPara, []);
  assert.equal(quemTem(r), 'Ninguém ainda');
});

test('apontar e desapontar uma pessoa', () => {
  const um = alternarDono({ nome: 'Lanterna' }, 'uid-1');
  assert.deepEqual(donosDe(um), ['uid-1']);
  assert.deepEqual(um.liberadoPara, ['uid-1']);
  const nenhum = alternarDono(um, 'uid-1');
  assert.deepEqual(nenhum.liberadoPara, []);
  assert.equal(alcanceDe(nenhum), 'alguns');
});

test('trocar para "da mesa" apaga a lista de donos', () => {
  const pessoal = itemNovo({ nome: 'Chave', alcance: 'alguns', donos: ['a'] });
  const agora = comDonos(pessoal, 'mesa', donosDe(pessoal));
  assert.deepEqual(agora.liberadoPara, []);
  assert.equal(agora.liberadoParaTodos, true);
  assert.equal(quemTem(agora), 'A mesa inteira');
});

test('a bolsa põe o que é só meu na frente', () => {
  const itens = [
    { nome: 'Mapa', alcance: 'mesa' },
    { nome: 'Lanterna', alcance: 'alguns' },
    { nome: 'Caderno', alcance: 'alguns' },
    { nome: '', alcance: 'alguns' },
  ];
  assert.deepEqual(bolsaDe(itens).map(i => i.nome), ['Caderno', 'Lanterna', 'Mapa']);
});

test('são dois alcances, e só dois', () => {
  assert.deepEqual(ALCANCES_DE_ITEM.map(a => a.id), ['alguns', 'mesa']);
});

test('quem tem sai com nome quando o Mestre tem os nomes', () => {
  const item = comDonos({ nome: 'x' }, 'alguns', ['u1', 'u2']);
  assert.equal(quemTem(item, { u1: 'Mika', u2: 'Takuro' }), 'Mika, Takuro');
});

test('as regras entregam o item só a quem tem', async () => {
  const { readFileSync } = await import('node:fs');
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

  const seletivo = regras.slice(
    regras.indexOf('function acessoSeletivo'),
    regras.indexOf('function daMesaComum'),
  );
  assert.match(seletivo, /c__\[a-z0-9-\]\+__itens/,
    'itens ficou como coleção da mesa comum — todo mundo leria tudo');

  const concessao = regras.slice(regras.indexOf('// Documentos liberados por pessoa'));
  assert.match(concessao, /c__\[a-z0-9-\]\+__itens/);
  // E escrever continua sendo só do Mestre: item é material dele.
  const escrita = concessao.slice(concessao.indexOf('allow write'));
  assert.match(escrita, /itens[\s\S]*?mestre\(/);
});

test('a bolsa é lida pela consulta, não filtrada na tela', async () => {
  const { readFileSync } = await import('node:fs');
  const tela = readFileSync(new URL('../src/features/oneshot/ItensDaNoite.jsx', import.meta.url), 'utf8');
  assert.match(tela, /observarLiberados\('itens'/,
    'voltou a ler a coleção inteira — o filtro tem de ser do banco');
  assert.ok(!/onSnapshot\(\s*col\('itens'/.test(tela));
});

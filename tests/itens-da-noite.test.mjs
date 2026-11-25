/**
 * A BOLSA DO JOGADOR
 *
 * Os itens são as aparições de tipo "item". Houve uma coleção própria por
 * um dia, e ela significava cadastrar a mesma lanterna duas vezes — uma
 * para aparecer na tela, outra para entrar na bolsa. Duas cópias da mesma
 * coisa é como elas saem de sincronia.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TIPO_DE_ITEM, bolsaDeItens, nomeDoItem, ehDaMesa } from '../src/features/oneshot/itens.mjs';

const ler = rel => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('só as aparições de tipo item entram na bolsa', () => {
  const tudo = [
    { id: '1', tipo: 'item', titulo: 'Lanterna' },
    { id: '2', tipo: 'criatura', titulo: 'O vulto' },
    { id: '3', tipo: 'cenario', titulo: 'O porão' },
    { id: '4', tipo: TIPO_DE_ITEM, titulo: 'Chave' },
  ];
  assert.deepEqual(bolsaDeItens(tudo).map(i => i.titulo), ['Chave', 'Lanterna']);
});

test('a ordem é alfabética, com acento no lugar certo', () => {
  const itens = [
    { tipo: 'item', titulo: 'Zarabatana' },
    { tipo: 'item', titulo: 'Âncora' },
    { tipo: 'item', titulo: 'Bússola' },
  ];
  assert.deepEqual(bolsaDeItens(itens).map(i => i.titulo),
    ['Âncora', 'Bússola', 'Zarabatana']);
});

test('item sem nome e sem foto não ocupa espaço na grade', () => {
  const itens = [
    { tipo: 'item', titulo: '  ', imagem: '' },
    { tipo: 'item', titulo: '', imagem: 'data:image/webp;base64,xx' },
    { tipo: 'item', titulo: 'Caderno' },
  ];
  // O sem nada some; o que tem só foto fica, porque a foto já diz o que é.
  assert.equal(bolsaDeItens(itens).length, 2);
  assert.equal(nomeDoItem({ titulo: '' }), 'Sem nome');
});

test('o selo "da mesa" sai do mesmo campo que o banco usa', () => {
  // E não de um campo próprio: dois campos para a mesma verdade é como
  // o selo passa a mentir depois que alguém troca o alcance.
  assert.equal(ehDaMesa({ liberadoParaTodos: true }), true);
  assert.equal(ehDaMesa({ liberadoParaTodos: false, alcance: 'mesa' }), false);
});

test('lista quebrada não derruba a bolsa', () => {
  assert.deepEqual(bolsaDeItens([null, undefined, {}, { tipo: 'item' }]), []);
  assert.deepEqual(bolsaDeItens(null), []);
});

test('a bolsa lê pela consulta, nunca filtra dono na tela', () => {
  const tela = ler('../src/features/oneshot/ItensDaNoite.jsx');
  assert.match(tela, /observarLiberados\('aparicoes'/);
  assert.ok(!/onSnapshot\(\s*col\(/.test(tela),
    'voltou a ler coleção direto — o filtro tem de ser do banco');
  // E não há mais cadastro aqui: o item nasce nas Aparições.
  assert.ok(!/addDoc|setDoc|deleteDoc/.test(tela),
    'a bolsa voltou a criar ou apagar item — isso é das Aparições');
});

test('a coleção `itens` não existe mais nas regras', () => {
  const regras = ler('../firestore.rules');
  assert.ok(!/__itens'/.test(regras),
    'sobrou regra para uma coleção que nada escreve');
  // E as aparições seguem com o acesso seletivo, que é o que protege o item.
  assert.match(regras, /c__\[a-z0-9-\]\+__aparicoes/);
});

test('o número no botão sai da mesma leitura que a gaveta', () => {
  const mapa = ler('../src/features/mapa-batalha/BattleMapPage.jsx');
  assert.match(mapa, /observarLiberados\('aparicoes', membro,[\s\S]{0,120}bolsaDeItens/,
    'o contador voltou a contar outra coisa que não os itens da bolsa');
});

/**
 * A BIBLIOTECA DE TOKENS É FERRAMENTA DE NARRAÇÃO
 *
 * Ela é usada com a mesa esperando: o Mestre precisa pôr cinco figuras no
 * mapa e voltar a falar. O que conta é quantos gestos cada token custa.
 *
 * Antes: grade de três colunas com retratos grandes (seis tokens por tela,
 * o resto rolando), um clique por token, e cada clique fechava a gaveta —
 * cinco tokens eram cinco idas e vindas. E havia no alto uma faixa de fotos
 * de perfil das fichas que criava "tokens" de rosto recortado em círculo,
 * irreconhecíveis no mapa.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mapa = readFileSync(new URL('../src/features/mapa-batalha/BattleMapPage.jsx', import.meta.url), 'utf8');
const gaveta = readFileSync(new URL('../src/features/mapa-batalha/BibliotecaDeTokens.jsx', import.meta.url), 'utf8');

test('a faixa de fotos de perfil das fichas saiu', () => {
  assert.ok(!/ADICIONAR TOKEN DE PERSONAGEM/.test(mapa),
    'o atalho que criava token com foto de perfil voltou');
  // E nada ficou criando token a partir do retrato da ficha.
  assert.ok(!/addLibraryToken\(\{nome:sheet\.nome/.test(mapa));
});

test('dá para colocar vários tokens de uma vez', () => {
  assert.match(mapa, /const addLibraryTokens = async \(lista\)/,
    'a colocação em lote sumiu');
  assert.match(gaveta, /Colocar \$\{escolhidos\.length\} no mapa/);
});

test('os tokens em lote não caem empilhados no mesmo ponto', () => {
  // Cinco no centro viram um só visualmente, e desempilhar custa mais tempo
  // do que escolher em lote economizou.
  const bloco = mapa.slice(mapa.indexOf('const addLibraryTokens'), mapa.indexOf('const deleteLibraryToken'));
  assert.match(bloco, /coluna - recuo/, 'os tokens voltaram a ser postos todos no mesmo lugar');
  // E dentro do mapa: token colocado fora da borda fica inalcançável.
  assert.match(bloco, /Math\.min\(93, Math\.max\(7,/);
});

test('o lote vai ao servidor numa gravação só', () => {
  // Um por um, eles apareciam aos poucos na tela da mesa.
  const bloco = mapa.slice(mapa.indexOf('const addLibraryTokens'), mapa.indexOf('const deleteLibraryToken'));
  assert.match(bloco, /writeLiveTokens\(mapId, novos, true\)/);
  assert.equal((bloco.match(/writeLiveTokens/g) || []).length, 1);
});

test('a ficha amarrada vai junto com o token colocado', () => {
  // É o que faz o token chegar com vida e talismã, que é a razão de existir
  // da biblioteca em vez de criar um token novo a cada cena.
  const bloco = mapa.slice(mapa.indexOf('const addLibraryTokens'), mapa.indexOf('const deleteLibraryToken'));
  for (const campo of ['sheetId', 'enemyId', 'controllerSheetId', 'hp', 'maxHp']) {
    assert.match(bloco, new RegExp(`${campo}:`), `${campo} não é levado para o token`);
  }
});

test('a busca só aparece quando há lista para filtrar', () => {
  // Abaixo de oito, ela rouba uma linha da lista que deveria ajudar.
  assert.match(gaveta, /const BUSCA_A_PARTIR_DE = 8/);
  assert.match(gaveta, /tokens\.length >= BUSCA_A_PARTIR_DE/);
});

test('a busca encontra pelo nome do personagem, não só pelo do token', () => {
  // O Mestre lembra "o token do Dominic", não como ele batizou o arquivo.
  assert.match(gaveta, /\$\{t\.nome \|\| ''\} \$\{ficha\}/);
});

test('os campos de seleção do Mestre deixaram de ser caixa branca do sistema', () => {
  // Eram <select> crus com fontSize:10, desenhados pelo sistema em branco
  // sobre painel escuro — era isso que deixava os painéis com cara de
  // inacabado.
  assert.ok(!/style=\{\{width:'100%',marginTop:4,fontSize:10\}\}/.test(mapa),
    'os selects voltaram ao estilo em linha sem pele');
  assert.ok(mapa.includes('className="mapa-campo"'), 'os campos perderam a classe comum');
  const folha = readFileSync(new URL('../src/features/mapa-batalha/campos-do-mapa.css', import.meta.url), 'utf8');
  // 12px: abaixo disso o iOS dá zoom ao focar e desalinha a página.
  assert.match(folha, /font-size:12px/);
  assert.match(folha, /\.mapa-campo option,\.mapa-campo optgroup\{background:/,
    'sem cor nas opções, alguns navegadores mostram texto branco em fundo branco');
});

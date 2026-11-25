/**
 * A SENHA DA FICHA
 *
 * O Mestre define uma senha por ficha; quem souber abre aquela ficha.
 *
 * O QUE ESTES TESTES GUARDAM, acima de tudo: o texto da senha não fica
 * guardado. Ele ficava — num campo `senha` do próprio documento da ficha, em
 * texto puro — e as regras deixam qualquer membro da mesa ler qualquer ficha
 * dela. A senha de cada primo estava legível para todos os outros, e senha de
 * mesa de RPG é senha que as pessoas reaproveitam em outros lugares.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  VERSAO_COM_SAL, camposDaSenha, conferirSenha, temSenha, estadoDaSenha,
  RECADOS_DO_ESTADO, resumoComSal,
} from '../src/features/sheets/senhaDaFicha.mjs';

const fonte = c => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8');

test('o texto da senha não é guardado em lugar nenhum', () => {
  return camposDaSenha('porao').then(campos => {
    const gravado = JSON.stringify(campos);
    assert.ok(!gravado.includes('porao'), `a senha vazou para o documento: ${gravado}`);
    assert.equal(campos.senha, '', 'o campo antigo precisa ficar vazio');
    assert.equal(campos.senhaVersao, VERSAO_COM_SAL);
    assert.ok(campos.senhaHash.length === 64, 'o resumo não parece um SHA-256');
  });
});

test('definir uma senha nova apaga o texto puro que estava lá', async () => {
  // Sem isto a mesa carregaria a senha velha, legível, para sempre.
  const antiga = { senha: 'segredo-em-texto-puro' };
  const nova = { ...antiga, ...(await camposDaSenha('outra')) };
  assert.equal(nova.senha, '');
  assert.ok(!JSON.stringify(nova).includes('segredo-em-texto-puro'));
});

test('cada ficha tem o próprio sal', async () => {
  const a = await camposDaSenha('1234');
  const b = await camposDaSenha('1234');
  assert.notEqual(a.senhaSal, b.senhaSal, 'duas fichas receberam o mesmo sal');
  // Mesma senha, resumos diferentes: é isto que impede uma lista pronta de
  // resolver as cinco fichas de uma vez.
  assert.notEqual(a.senhaHash, b.senhaHash);
});

test('a senha certa abre e a errada não', async () => {
  const ficha = await camposDaSenha('sotao');
  assert.equal(await conferirSenha(ficha, 'sotao'), true);
  for (const errada of ['Sotao', 'sotao ', 'sota', '', '1234']) {
    if (errada.trim() === 'sotao') continue;
    assert.equal(await conferirSenha(ficha, errada), false, `"${errada}" abriu`);
  }
});

test('espaço em volta não reprova ninguém', async () => {
  // O jogador digita no celular, com teclado que põe espaço sozinho.
  const ficha = await camposDaSenha('  sotao  ');
  assert.equal(await conferirSenha(ficha, 'sotao'), true);
  assert.equal(await conferirSenha(ficha, ' sotao '), true);
});

test('ficha sem senha abre para quem clicar', async () => {
  for (const aberta of [{}, { senha: '' }, { senha: '   ' }, await camposDaSenha('')]) {
    assert.equal(await conferirSenha(aberta, ''), true);
    assert.equal(temSenha(aberta), false);
  }
});

test('tirar a senha deixa a ficha aberta de novo', async () => {
  const comSenha = await camposDaSenha('x');
  assert.equal(temSenha(comSenha), true);
  const semSenha = { ...comSenha, ...(await camposDaSenha('')) };
  assert.equal(temSenha(semSenha), false);
  assert.equal(await conferirSenha(semSenha, ''), true);
});

/* ─── Mesas que já existem ─── */

test('a ficha antiga, com texto puro, continua abrindo', async () => {
  /* Recusá-la trancaria jogadores para fora sem aviso no meio de uma
     sessão. A migração acontece quando o Mestre redefinir a senha, e não
     às custas de quem só queria entrar. */
  const antiga = { senha: 'mansao' };
  assert.equal(await conferirSenha(antiga, 'mansao'), true);
  assert.equal(await conferirSenha(antiga, 'outra'), false);
  assert.equal(temSenha(antiga), true);
});

test('o resumo manda mais que o texto puro que sobrou', async () => {
  // Documento meio migrado: tem os dois. Vale o resumo, senão uma senha
  // trocada continuaria aceitando a antiga.
  const meio = { ...(await camposDaSenha('nova')), senha: 'velha' };
  assert.equal(await conferirSenha(meio, 'nova'), true);
  assert.equal(await conferirSenha(meio, 'velha'), false);
});

test('o mestre vê como cada senha está guardada', () => {
  assert.equal(estadoDaSenha({}), 'aberta');
  assert.equal(estadoDaSenha({ senha: 'x' }), 'antiga');
  assert.equal(estadoDaSenha({ senhaHash: 'a'.repeat(64) }), 'protegida');
  // E o recado da antiga precisa dizer o que fazer, não só que está ruim.
  assert.match(RECADOS_DO_ESTADO.antiga, /Defina-a de novo/);
  assert.match(RECADOS_DO_ESTADO.antiga, /texto puro/);
});

/* ─── Onde a senha é conferida ─── */

test('ninguém mais compara a senha em texto', () => {
  for (const arquivo of [
    'src/features/sheets/SheetsPage.jsx',
    'src/features/mapa-batalha/BattleMapPage.jsx',
    'src/experience/PlayerAccess.jsx',
  ]) {
    const codigo = semComentarios(fonte(arquivo));
    assert.ok(!/pwInput === s\.senha|!== expected/.test(codigo),
      `${arquivo} ainda compara a senha em texto`);
    assert.match(codigo, /conferirSenha\(/, `${arquivo} não confere senha nenhuma`);
  }
});

test('a porta trancada olha os dois formatos', () => {
  // `!s.senha` só enxergava o texto puro: ficha com senha nova entraria
  // direto, sem pedir nada.
  for (const arquivo of [
    'src/features/sheets/SheetsPage.jsx',
    'src/features/mapa-batalha/BattleMapPage.jsx',
  ]) {
    const codigo = semComentarios(fonte(arquivo));
    assert.ok(!/\|\| !s\.senha \|\|/.test(codigo), `${arquivo} ainda testa só o campo antigo`);
    assert.match(codigo, /!temSenha\(s\)/);
  }
});

test('o cain guarda o resumo, e não grava a cada tecla', () => {
  const codigo = semComentarios(fonte('src/features/cain/FichasCainPage.jsx'));
  assert.match(codigo, /await camposDaSenha\(senha\)/);
  // Uma escrita por letra gravaria oito senhas diferentes para "esqueleto"
  // e só a última valeria — confuso de depurar e caro à toa.
  assert.ok(!/onChange=\{e => definirSenha\(/.test(codigo));
  assert.match(codigo, /onChange=\{e => setRascunhoDaSenha\(e\.target\.value\)\}/);
  // E trocar de ficha limpa o rascunho, senão a senha de uma aparece na outra.
  assert.match(codigo, /setRascunhoDaSenha\(''\);\s*setAbertaId/);
});

/* ─── O painel do mestre ─── */

test('o painel é do mestre e grava só os campos da senha', () => {
  const pagina = semComentarios(fonte('src/features/sheets/SheetsPage.jsx'));
  assert.match(pagina, /\{masterMode && loaded && \(\s*<SenhasDasFichas/);
  // `merge: true` e só os campos da senha: gravar a ficha inteira daqui
  // sobrescreveria o que o jogador estiver editando na mesma hora.
  assert.match(pagina, /setDoc\(docIn\('sheets', String\(id\)\), campos, \{ merge: true \}\)/);
});

test('a tela diz que a senha não dá para ver depois', () => {
  const jsx = fonte('src/features/sheets/SenhasDasFichas.jsx');
  // Ela não existe mais em lugar nenhum — e isso precisa estar dito, senão
  // o Mestre procura.
  // O texto quebra linha no JSX, daí o \s+ no lugar do espaço.
  assert.match(jsx, /não\s+fica guardada em lugar nenhum/);
  assert.match(jsx, /defina outra/i);
});

test('o limite está escrito nos três lugares que importam', () => {
  // No módulo, para quem for mexer; na tela, para quem usa; nas regras,
  // para quem for fechar a dívida.
  assert.match(fonte('src/features/sheets/senhaDaFicha.mjs'), /conferência continua sendo DE TELA/);
  assert.match(fonte('src/features/sheets/SenhasDasFichas.jsx'), /conferência é de tela/);
  const regras = fonte('firestore.rules');
  assert.match(regras, /A SENHA DA FICHA NÃO É CONFERIDA AQUI/);
  // E o caminho para fechar, com o truque que faz a senha da mesa funcionar.
  assert.match(regras, /campaigns\/\{cid\}\/posse\/\{uid\}/);
});

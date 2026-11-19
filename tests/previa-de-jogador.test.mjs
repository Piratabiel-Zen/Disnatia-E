/**
 * O ADMIN PRECISA CONSEGUIR OLHAR PELOS OLHOS DE UM EXORCISTA
 *
 * Quem criou a mesa não conseguia testar o que o jogador vê, e o motivo é
 * estrutural: quem é Mestre no servidor é Mestre em toda tela. Entrar pela
 * porta escolhendo a própria ficha muda só a etiqueta local — o papel
 * gravado continua mestre, e as telas leem o papel gravado. Então o Admin
 * abria a ficha de todo mundo e via o arquivo inteiro, e concluía que as
 * regras de acesso não estavam funcionando.
 *
 * A prévia troca o registro que as telas recebem. Não é segurança: o
 * navegador do Admin continua recebendo os dados, porque para o servidor ele
 * continua Mestre. Ela serve para conferir a REGRA — o documento certo
 * chegou a quem devia? — e não para medir segredo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { membroEfetivo } from '../src/features/acesso/previaDeJogador.mjs';
import { podeAbrirFicha, podeVerDocumento } from '../src/core/acesso.mjs';

const admin = { uid: 'u-admin', papel: 'mestre' };
const jogador = { uid: 'u-ana', papel: 'jogador' };
const previaDaAna = { fichaId: 'f1', nome: 'Ana', uid: 'u-ana' };

test('em prévia, o Admin vira jogador para as telas', () => {
  const efetivo = membroEfetivo(admin, previaDaAna);
  assert.equal(efetivo.papel, 'jogador');
  assert.equal(efetivo.uid, 'u-ana');
  assert.equal(efetivo.emPrevia, true);
});

test('sem prévia, o registro passa intacto', () => {
  assert.equal(membroEfetivo(admin, null), admin);
  assert.equal(membroEfetivo(jogador, null), jogador);
  assert.equal(membroEfetivo(null, previaDaAna), null);
});

test('jogador não entra em prévia', () => {
  // Deixar a porta aberta seria convidar alguém a tentar virar outra pessoa
  // por aqui — e, pior, dar a impressão de que isso significa alguma coisa.
  assert.equal(membroEfetivo(jogador, { fichaId: 'f9', nome: 'X', uid: 'u-outro' }), jogador);
});

test('a prévia fecha de verdade o que o Admin via aberto', () => {
  const minha = { id: 'f1', dono: 'u-ana' };
  const alheia = { id: 'f2', dono: 'u-bob' };
  const guardado = { id: 'd1', liberadoParaTodos: false, liberadoPara: ['u-bob'] };
  const meu = { id: 'd2', liberadoParaTodos: false, liberadoPara: ['u-ana'] };

  // Sem prévia o Admin abre tudo. É esse o comportamento que confundia.
  assert.equal(podeAbrirFicha(alheia, admin), true);
  assert.equal(podeVerDocumento(guardado, admin), true);

  // Em prévia ele vê exatamente o que a Ana vê.
  const comoAna = membroEfetivo(admin, previaDaAna);
  assert.equal(podeAbrirFicha(minha, comoAna), true);
  assert.equal(podeAbrirFicha(alheia, comoAna), false);
  assert.equal(podeVerDocumento(meu, comoAna), true);
  assert.equal(podeVerDocumento(guardado, comoAna), false);
});

test('ficha sem dono dá uma prévia que não é de ninguém', () => {
  // É o caso real de uma ficha que o Admin preparou e não entregou: o certo
  // é mostrar o que ela mostraria, que é quase nada.
  const efetivo = membroEfetivo(admin, { fichaId: 'f7', nome: 'Rascunho', uid: 'previa:f7' });
  assert.equal(podeAbrirFicha({ id: 'f7', dono: '' }, efetivo), false);
  assert.equal(podeVerDocumento({ liberadoPara: ['u-ana'] }, efetivo), false);
});

test('o aviso de prévia vale para a mesa inteira, não só para as fichas', () => {
  // Numa aba só, o Admin navega para os Documentos, esquece, e conclui que o
  // site escondeu dele um documento que ele mesmo criou.
  const sessao = readFileSync(new URL('../src/AuthenticatedSession.jsx', import.meta.url), 'utf8');
  assert.match(sessao, /<BarraDePrevia previa=\{previa\} \/>/);
  const barra = readFileSync(new URL('../src/features/acesso/BarraDePrevia.jsx', import.meta.url), 'utf8');
  // E precisa dizer o que não é, senão vira prova de segredo na cabeça de quem lê.
  assert.match(barra, /Quem impede de verdade é o servidor/);
});

test('as telas recebem o registro já com a prévia aplicada', () => {
  const gancho = readFileSync(new URL('../src/features/acesso/useMembro.js', import.meta.url), 'utf8');
  assert.match(gancho, /membro: membroEfetivo\(membro, previa\)/,
    'useMembro voltou a entregar o registro cru e as telas deixaram de ver a prévia');
  assert.match(gancho, /membroReal: membro/, 'sumiu o registro real, que a barra precisa');
});

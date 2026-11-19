/**
 * QUEM CRIA A MESA PRECISA CONSEGUIR JOGAR NELA
 *
 * Criar a mesa grava papel de Mestre no servidor, e é o certo. Mas deixa o
 * criador sem como jogar com a própria conta: ele vê toda ficha, todo
 * documento guardado e todo cartão restrito, porque para o servidor ele É o
 * Mestre. Nenhuma escolha na porta de entrada muda isso — o papel gravado é
 * o que as regras leem, e a etiqueta local não chega ao servidor.
 *
 * "Sair do comando" grava outro papel. Depois disso o servidor recusa de
 * verdade: os dados nem chegam ao navegador, ao contrário da prévia, que só
 * esconde na tela.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const auth = readFileSync(new URL('../src/core/auth.js', import.meta.url), 'utf8');
const pagina = readFileSync(new URL('../src/features/cain/FichasCainPage.jsx', import.meta.url), 'utf8');
const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

test('sair do comando grava papel de jogador no próprio registro', () => {
  const trecho = auth.slice(auth.indexOf('export async function sairDoComando'));
  assert.match(trecho, /papel: 'jogador'/);
  assert.match(trecho, /membroRef\(campanhaId, usuario\.uid\)/,
    'passou a escrever no registro de outra pessoa');
});

test('o registro rebaixado não carrega o resumo da senha de Mestre', () => {
  // Guardar a credencial de Mestre dentro de um registro de jogador seria
  // deixá-la onde ela não precisa estar — e esse registro é legível por
  // quem o possui.
  const trecho = auth.slice(auth.indexOf('export async function sairDoComando'),
                            auth.indexOf('Acompanha o meu registro'));
  assert.match(trecho, /senhaHash: ''/);
});

test('as regras deixam o dono da mesa reescrever o próprio papel', () => {
  // É o que garante que ninguém se tranca para fora: mesmo esquecendo a
  // senha de Mestre, quem criou a mesa volta ao comando.
  assert.match(
    regras,
    /allow create, update: if logado\(\)[\s\S]{0,400}request\.auth\.uid == donoDaMesa\(cid\)/,
    'a porta do dono sumiu das regras e o criador pode se trancar fora',
  );
});

test('só o Admin de verdade vê o botão, e não durante a prévia', () => {
  // Em prévia ele já está fingindo ser jogador; oferecer ali a troca de
  // papel de verdade é convite a confundir ensaio com mudança.
  assert.match(pagina, /\{ehMestre\(membroReal\) && !previa && \(\s*<div className="registro-comando">/);
});

test('a confirmação diz como voltar antes de deixar sair', () => {
  const trecho = pagina.slice(pagina.indexOf('registro-comando-confirma'));
  assert.match(trecho, /senha de Mestre/, 'a confirmação não diz como voltar ao comando');
  assert.match(trecho, /Cancelar/, 'troca de papel sem saída é armadilha');
  // Dois cliques: a troca é real e não pode acontecer por engano.
  assert.match(pagina, /setConfirmandoSaida\(true\)/);
});

test('depois de rebaixar, a porta de entrada é perguntada de novo', () => {
  // Sem isso a etiqueta local continuaria dizendo "mestre" e a tela abriria
  // controles que o servidor passou a negar — o pior dos dois mundos.
  const trecho = pagina.slice(pagina.indexOf('sairDoComando(campanha?.id)'));
  assert.match(trecho.slice(0, 200), /clearStoredAccess\(\)/);
  assert.match(trecho.slice(0, 260), /location\.reload\(\)/);
});

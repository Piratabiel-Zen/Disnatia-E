/**
 * ENTREGAR A FICHA PELA PESSOA CERTA
 *
 * O Mestre combina a mesa por fora — WhatsApp, e-mail — e depois precisa
 * ligar cada ficha a quem chegou. O nome não serve: numa mesa de primos
 * aparecem dois "Gabriel" e um "gabriel", e o uid não diz nada a
 * ninguém. O e-mail é o único identificador que ele reconhece.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = rel => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('o e-mail entra no documento do membro, em minúsculas', () => {
  const auth = ler('../src/core/auth.js');
  assert.match(auth, /email: String\(usuario\.email \|\| ''\)\.trim\(\)\.toLowerCase\(\)/);
  /* Minúsculas porque e-mail não diferencia caixa e o Mestre vai
     comparar com o olho: "Gabriel@" e "gabriel@" lado a lado na lista
     parecem duas pessoas. */
});

test('a entrega mostra nome e e-mail juntos', () => {
  const pagina = ler('../src/features/oneshot/FichasOneShotPage.jsx');
  assert.match(pagina, /\{m\.nome \|\| 'sem nome'\}/);
  assert.match(pagina, /m\.email \? ` — \$\{m\.email\}` : ''/);
});

test('quem já tem ficha vai para o fim da lista, marcado', () => {
  // O Mestre está quase sempre procurando quem FALTA.
  const pagina = ler('../src/features/oneshot/FichasOneShotPage.jsx');
  assert.match(pagina, /const donos = new Set\(fichas\.map/);
  assert.match(pagina, /\.sort\(\(a, b\) => \(a\.jaTem - b\.jaTem\)/);
  assert.match(pagina, /\{m\.jaTem \? '• ' : ''\}/);
});

test('o Mestre é avisado de quem ainda não tem e-mail guardado', () => {
  /* Quem entrou na mesa antes desta mudança não tem o campo: o documento
     do membro só é reescrito na próxima entrada. Sem o aviso, o Mestre
     veria uma linha sem e-mail e concluiria que a pessoa não entrou. */
  const pagina = ler('../src/features/oneshot/FichasOneShotPage.jsx');
  assert.match(pagina, /const semEmail = membrosOrdenados\.filter\(m => !m\.email\)\.length/);
  assert.match(pagina, /entrarem na mesa de novo/);
});

test('a ficha nova nasce com id próprio — nome igual não religa nada', () => {
  /* Resposta a uma pergunta de mesa: apagar uma ficha e criar outra com
     o MESMO NOME não devolve o vínculo. O id vem do relógio, o token
     guarda o id, e nome não entra na conta em lugar nenhum. É o
     comportamento certo (dois personagens podem se chamar igual), mas
     precisa estar dito em algum lugar além da cabeça de quem escreveu. */
  const pagina = ler('../src/features/oneshot/FichasOneShotPage.jsx');
  assert.match(pagina, /const id = `f\$\{Date\.now\(\)\.toString\(36\)\}`/);

  const mapa = ler('../src/features/mapa-batalha/BattleMapPage.jsx');
  assert.match(mapa, /sheetId: tpl\.sheetId \|\| ''/);

  /* O seletor do token guarda o ID da ficha, nunca o nome — e é por isso
     que o vínculo não volta sozinho depois de apagar e recriar. É o
     comportamento certo: dois personagens podem se chamar igual, e ligar
     por nome faria o token de um seguir a ficha do outro.

     A verificação é pelo `value` do seletor, e não por uma busca solta
     no arquivo: a primeira versão deste teste procurava "nome perto de
     sheetId" numa linha de 900 caracteres e acusou código que estava
     certo. Procurar por forma vaga em arquivo grande acha o que não
     existe. */
  assert.match(mapa, /value=\{`sheet:\$\{s\.id\}`\}/,
    'o seletor do token deixou de ligar pela id da ficha');
});

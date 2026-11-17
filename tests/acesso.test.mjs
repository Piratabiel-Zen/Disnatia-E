/* QUEM VÊ O QUÊ
   O Mestre vai guardar documentos para liberar na hora certa, e um deles vai
   ser a reviravolta da campanha. Se esta lógica errar, o erro tem nome:
   mostrar ao jogador o que ainda não era para ele ver. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join as joinPath } from 'node:path';
import {
  PAPEIS, documentosVisiveis, ehMestre, normalizarPapel, podeEditarFicha,
  podeNaMesa, podeVerDocumento, podeVerSegredosDaFicha, resumoDaLiberacao,
} from '../src/core/acesso.mjs';

const mestre = { uid: 'm1', papel: 'mestre' };
const ana = { uid: 'a1', papel: 'jogador' };
const beto = { uid: 'b1', papel: 'jogador' };

test('papel desconhecido vira jogador, nunca mestre', () => {
  assert.equal(normalizarPapel('mestre'), 'mestre');
  assert.equal(normalizarPapel('admin'), 'jogador');
  assert.equal(normalizarPapel(undefined), 'jogador');
  assert.equal(normalizarPapel('MESTRE'), 'jogador', 'nada de promoção por maiúscula');
  assert.deepEqual(PAPEIS, ['mestre', 'jogador']);
});

test('documento sem nada marcado fica guardado: o padrão é fechado', () => {
  const guardado = { id: 'd1' };
  assert.equal(podeVerDocumento(guardado, ana), false);
  assert.equal(podeVerDocumento(guardado, mestre), true, 'o Mestre vê o que preparou');
});

test('liberado para a mesa chega a todo membro', () => {
  const aberto = { id: 'd2', liberadoParaTodos: true };
  assert.equal(podeVerDocumento(aberto, ana), true);
  assert.equal(podeVerDocumento(aberto, beto), true);
});

test('liberado para alguém chega só a esse alguém', () => {
  const carta = { id: 'd3', liberadoPara: ['a1'] };
  assert.equal(podeVerDocumento(carta, ana), true);
  assert.equal(podeVerDocumento(carta, beto), false);
  assert.equal(podeVerDocumento(carta, mestre), true);
});

test('sem estar logado não se vê nada, nem o que está aberto', () => {
  assert.equal(podeVerDocumento({ liberadoParaTodos: true }, null), false);
  assert.equal(podeVerSegredosDaFicha({ dono: 'a1' }, null), false);
  assert.equal(podeEditarFicha({}, null), false);
  assert.equal(podeNaMesa(null, 'criar-ficha'), false);
});

test('lixo no lugar da lista não abre o documento', () => {
  assert.equal(podeVerDocumento({ liberadoPara: 'a1' }, ana), false, 'string não é lista');
  assert.equal(podeVerDocumento({ liberadoParaTodos: 'sim' }, ana), false, 'só true vale');
  assert.equal(podeVerDocumento({ liberadoParaTodos: 1 }, ana), false);
  assert.equal(podeVerDocumento(null, ana), false);
});

test('os segredos da ficha são do dono e do Mestre', () => {
  const ficha = { id: 'f1', dono: 'a1' };
  assert.equal(podeVerSegredosDaFicha(ficha, ana), true);
  assert.equal(podeVerSegredosDaFicha(ficha, beto), false);
  assert.equal(podeVerSegredosDaFicha(ficha, mestre), true);
});

test('o jogador edita só a ficha que lhe foi entregue', () => {
  assert.equal(podeEditarFicha({ dono: 'a1' }, ana), true);
  assert.equal(podeEditarFicha({ dono: 'a1' }, beto), false);
  assert.equal(podeEditarFicha({ dono: 'a1' }, mestre), true);
});

test('ficha sem dono é rascunho do Mestre, não é de quem pegar', () => {
  // O Mestre cria a ficha e depois escolhe quem joga com ela. Até nomear
  // alguém, nenhum jogador escreve nela — nem o primeiro que abrir a aba.
  assert.equal(podeEditarFicha({}, beto), false, 'ficha sem dono fechada para o jogador');
  assert.equal(podeEditarFicha({ dono: '' }, ana), false);
  assert.equal(podeEditarFicha({}, mestre), true, 'o Mestre monta o rascunho');
});

test('o que é do Mestre não é do jogador', () => {
  assert.equal(podeNaMesa(ana, 'liberar-documento'), false);
  assert.equal(podeNaMesa(ana, 'revelar-local'), false);
  assert.equal(podeNaMesa(ana, 'promover-membro'), false);
  assert.equal(podeNaMesa(mestre, 'liberar-documento'), true);
  // O que não está na lista o jogador faz: mover token, criar pista, anotar.
  assert.equal(podeNaMesa(ana, 'mover-token'), true);
  assert.equal(podeNaMesa(ana, 'criar-pista'), true);
});

test('a lista filtrada é o que a tela deve iterar', () => {
  const docs = [
    { id: '1', liberadoParaTodos: true },
    { id: '2', liberadoPara: ['a1'] },
    { id: '3', liberadoPara: ['b1'] },
    { id: '4' },
  ];
  assert.deepEqual(documentosVisiveis(docs, ana).map(d => d.id), ['1', '2']);
  assert.deepEqual(documentosVisiveis(docs, beto).map(d => d.id), ['1', '3']);
  assert.deepEqual(documentosVisiveis(docs, mestre).map(d => d.id), ['1', '2', '3', '4']);
  assert.deepEqual(documentosVisiveis(null, ana), []);
});

test('o Mestre lê num relance para quem cada documento foi', () => {
  const nomes = { a1: 'Ana', b1: 'Beto' };
  assert.equal(resumoDaLiberacao({ liberadoParaTodos: true }, nomes), 'Liberado para a mesa');
  assert.equal(resumoDaLiberacao({}, nomes), 'Guardado');
  assert.equal(resumoDaLiberacao({ liberadoPara: ['a1'] }, nomes), 'Só para Ana');
  assert.equal(resumoDaLiberacao({ liberadoPara: ['a1', 'b1'] }, nomes), 'Só para Ana e Beto');
});

/* As regras do servidor são a defesa de verdade. O módulo acima só evita que
   a tela ofereça o que o servidor vai negar. Então o arquivo precisa existir,
   e precisa manter as três decisões que sustentam o segredo. */
test('as regras do Firestore guardam a senha num lugar que ninguém lê', () => {
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(regras, /match \/privado\/\{doc\}[\s\S]{0,80}allow read: if false/,
    'a senha da mesa voltou a ser legível pelo cliente');
  assert.match(regras, /request\.resource\.data\.get\('senhaHash', ''\) == senhaDaMesa\(cid\)/,
    'entrar na mesa deixou de exigir a senha certa');
  assert.match(regras, /allow update, delete: if mestre\(cid\)/,
    'o Mestre deixou de poder rebaixar ou remover alguém');
  // O get() num documento inexistente derruba a avaliação inteira da regra.
  // Foi assim que a Estrela de Absinto nasceu trancada: as senhas estavam no
  // registro público, as regras liam o documento privado, e o privado nunca
  // tinha sido escrito. Toda senha certa era recusada sem explicação.
  assert.match(regras, /function temAcesso\(cid\)[\s\S]{0,160}exists\(/,
    'o get() das senhas voltou a rodar sem conferir se o documento existe');
  // Mesa sem senha gravada não vira mesa de porta aberta.
  assert.match(regras, /senhaDaMesa\(cid\) != ''/,
    'uma mesa sem senha gravada aceitaria qualquer hash vazio');
  assert.match(regras, /request\.auth\.uid in resource\.data\.get\('liberadoPara', \[\]\)/,
    'o servidor parou de filtrar documentos por pessoa');
});

test('as regras não trancam a Dinastia E no meio da campanha', () => {
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

  // A primeira versão listava as coleções à mão e esquecia 26 das 32 que o
  // site usa — o mapa de batalha, a névoa, o bestiário, os dados públicos.
  // A regra agora é invertida: aberto é tudo o que não é de uma campanha
  // nova. Lista escrita à mão é um erro esperando a próxima coleção.
  assert.match(
    regras,
    /allow read, write: if !colecao\.matches\('c__\.\*'\)[\s\S]{0,120}colecao != 'campaigns'[\s\S]{0,60}colecao != 'users'/,
    'voltou a liberar a mesa antiga por lista, em vez de por exclusão',
  );
  assert.match(regras, /dívida conhecida/i, 'a dívida deixou de estar declarada no arquivo');
});

test('toda coleção que o site usa hoje continua alcançável', () => {
  // O teste que faltava quando eu escrevi a lista à mão: conferir as regras
  // contra o que o código realmente abre.
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const fonte = [];
  const varrer = dir => {
    for (const nome of readdirSync(dir)) {
      const caminho = joinPath(dir, nome);
      if (statSync(caminho).isDirectory()) varrer(caminho);
      else if (/\.(js|jsx|mjs)$/.test(nome)) fonte.push(readFileSync(caminho, 'utf8'));
    }
  };
  varrer(new URL('../src/', import.meta.url).pathname);

  const colecoes = new Set();
  for (const texto of fonte) {
    for (const m of texto.matchAll(/\b(?:col|docIn)\(\s*'([a-zA-Z_]+)'/g)) colecoes.add(m[1]);
  }
  assert.ok(colecoes.size > 20, `só ${colecoes.size} coleções encontradas — a varredura quebrou`);

  // Nenhuma delas pode cair na exclusão da regra aberta.
  for (const colecao of colecoes) {
    assert.ok(!colecao.startsWith('c__'), `"${colecao}" colide com o prefixo de campanha`);
    assert.ok(colecao !== 'campaigns' && colecao !== 'users',
      `"${colecao}" é escopada por campanha e ficaria inacessível na mesa antiga`);
  }
  assert.ok(regras.includes("colecao.matches('c__.*')"));
});

/* O NÓ QUE EU DEI E DESFIZ
   As regras exigem ser membro da mesa para escrever qualquer coisa. Virar
   membro exigia a senha da mesa. A senha só o Admin pode definir. E para ser
   Admin era preciso ser membro. Resultado: quem criava uma campanha ficava
   trancado para fora dela — não criava ficha, não mexia no mural, e nem
   conseguia apagar a mesa. */
test('quem cria a mesa entra nela como Admin, sem senha nenhuma', () => {
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(regras, /request\.resource\.data\.criadoPor == request\.auth\.uid/,
    'criar mesa deixou de registrar quem criou');
  assert.match(regras, /request\.auth\.uid == donoDaMesa\(cid\)/,
    'o criador voltou a precisar de uma senha que ainda não existe');
});

test('mesa órfã pode ser assumida e apagada, senão fica para sempre', () => {
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  // As mesas feitas antes do campo de dono existir não têm Admin nenhum.
  assert.match(regras, /mesaSemDono\(cid\)/);
  assert.match(regras, /allow delete: if mestre\(cid\) \|\| \(logado\(\) && mesaSemDono\(cid\)\)/);
});

test('ninguém se promove a Admin de mesa alheia', () => {
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  // Entrar continua exigindo uma das portas, e nenhuma delas é "pedir".
  assert.match(regras, /request\.resource\.data\.get\('senhaHash', ''\) == senhaDaMesa\(cid\)/);
  // Mudar o papel de OUTRO membro continua sendo só do Admin.
  assert.match(regras, /allow update, delete: if mestre\(cid\)/);

  // A porta larga não abre a sala estreita: a senha de entrada dá jogador.
  // Sem esta linha, quem soubesse só a senha da mesa escreveria o próprio
  // registro já como Mestre e assumiria a campanha de outra pessoa.
  assert.match(
    regras,
    /request\.resource\.data\.papel == 'jogador'\s*\n\s*&& senhaDaMesa\(cid\) != ''/,
    'a senha de entrada voltou a poder gravar papel de Mestre',
  );
  // E virar Mestre exige a senha de Mestre daquela mesa, não a de outra.
  assert.match(
    regras,
    /request\.resource\.data\.papel == 'mestre'[\s\S]{0,200}senhaDeMestre\(cid\)/,
    'promover a Mestre deixou de exigir a senha de Mestre da mesa',
  );
});

test('a senha de Mestre promove no servidor, não só na tela', () => {
  // O sintoma em produção: o amigo entrava com a senha de Mestre, via os
  // botões de Mestre e o servidor negava cada um deles — porque o papel
  // nunca saía do navegador.
  const toggle = readFileSync(new URL('../src/shell/MasterToggle.jsx', import.meta.url), 'utf8');
  assert.match(toggle, /entrarNaMesa/, 'a senha de Mestre voltou a ser só um interruptor de tela');
  assert.match(toggle, /papel:\s*'mestre'/);

  // E a senha da mesa precisa criar o registro de membro, senão a pessoa
  // atravessa o portal e cai numa mesa que não carrega nada.
  const gate = readFileSync(new URL('../src/features/campanhas/CampaignGate.jsx', import.meta.url), 'utf8');
  assert.match(gate, /entrarNaMesa\(\{\s*campanhaId: campaign\.id/,
    'acertar a senha voltou a não criar membro nenhum');
  assert.match(gate, /definirSegredosDaMesa/,
    'a mesa nova voltou a nascer sem as senhas no lugar que as regras leem');
});

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

test('quem criou a mesa sempre consegue apagá-la', () => {
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

  // O ESTRAGO QUE ISTO EVITA, e que já aconteceu:
  //
  // Apagar dependia só de mestre(cid), que por sua vez depende do registro
  // de membro trazer papel de Mestre. Criar uma mesa é uma sequência de
  // escritas, e a última — a que grava esse registro — pode falhar sozinha.
  // Quando falhava, a pessoa ficava com uma mesa criada por ela que nem ela
  // nem ninguém conseguia remover. Mesas de teste encalhadas para sempre.
  //
  // criadoPor é o campo mais confiável que existe aqui: é gravado no mesmo
  // ato de criação, e as regras exigem que seja o próprio autor.
  assert.match(regras, /allow delete: if mestre\(cid\)\s*\n\s*\|\| \(logado\(\) && request\.auth\.uid == donoDaMesa\(cid\)\)/,
    'quem criou a mesa voltou a depender do registro de membro para apagá-la');

  // E as mesas feitas antes do campo de dono existir continuam removíveis:
  // ninguém é Admin delas, e sem esta porta ficariam na lista para sempre.
  assert.match(regras, /\|\| \(logado\(\) && mesaSemDono\(cid\)\)/);
});

test('apagar a mesa não joga fora a própria autoridade no meio do caminho', () => {
  // O ERRO QUE ISTO EVITA, e que foi parar em produção:
  //
  // A limpeza apagava o registro de MEMBRO antes do registro da mesa. Só que
  // é esse registro de membro que diz que a pessoa é Mestre, e é por ele que
  // o servidor autoriza apagar a mesa. Apagando primeiro, o código tirava a
  // autoridade de que precisava no passo seguinte — e o Firestore recusava a
  // remoção da mesa que a própria pessoa tinha criado.
  //
  // Ordem certa: senha (que precisa da mesa viva para ser autorizada), depois
  // a mesa, e o registro de membro só no fim, como faxina.
  const gate = readFileSync(
    new URL('../src/features/campanhas/CampaignGate.jsx', import.meta.url), 'utf8');
  const trecho = gate.slice(gate.indexOf('const removeCampaign'), gate.indexOf('} catch (erro)', gate.indexOf('const removeCampaign')));
  const senha = trecho.indexOf("'privado', 'acesso'");
  const mesa = trecho.indexOf("globalDoc('campaigns', campaign.id))");
  const membro = trecho.indexOf("'membros', conta.uid");
  assert.ok(senha > 0 && mesa > 0 && membro > 0, 'sumiu uma das etapas da remoção');
  assert.ok(senha < mesa, 'a senha precisa sair enquanto a mesa ainda existe');
  assert.ok(mesa < membro,
    'o registro de membro voltou a ser apagado antes da mesa, o que derruba a permissão');
});

test('um registro de membro sem papel não tranca a mesa inteira', () => {
  // Ler um campo inexistente não devolve vazio nas regras: derruba a
  // avaliação toda. Como mestre(cid) é o primeiro termo de vários "ou", um
  // registro antigo sem papel negaria até os caminhos que nem dependem de
  // ser Mestre — inclusive apagar a própria mesa.
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(regras, /function papel\(cid\)[\s\S]{0,220}\.data\.get\('papel', ''\)/,
    'papel() voltou a ler o campo direto');
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

/* ───────────── duas chaves para a mesma ficha ───────────── */

test('a senha da ficha abre a ficha, mesmo sem conta amarrada', () => {
  // É o fluxo da Dinastia E que a mesa já conhece: o Admin registra a ficha
  // no nome de alguém, define uma senha e passa a senha para essa pessoa.
  // Quem abriu por ela na porta joga por ela — mesmo de outro aparelho, ou
  // antes de a mesa inteira se cadastrar.
  const ficha = { id: 'f7', dono: '' };
  assert.equal(podeEditarFicha(ficha, beto), false, 'sem a senha, continua fechada');
  assert.equal(podeEditarFicha(ficha, beto, 'f7'), true, 'abriu com a senha da ficha');
  assert.equal(podeVerSegredosDaFicha(ficha, beto, 'f7'), true);
});

test('abrir uma ficha não abre as outras', () => {
  // O erro que isto pega: tratar "está logado como jogador" como se fosse
  // "é dono de tudo", e o jogador passar a editar a ficha do colega.
  const outra = { id: 'f8', dono: 'a1' };
  assert.equal(podeEditarFicha(outra, beto, 'f7'), false);
  assert.equal(podeVerSegredosDaFicha(outra, beto, 'f7'), false);
  assert.equal(podeEditarFicha(outra, ana, 'f7'), true, 'a dona continua dona');
});

test('ficha liberada vazia não libera ficha sem id', () => {
  // Um id vazio batendo com outro id vazio abriria tudo de uma vez.
  assert.equal(podeEditarFicha({ dono: '' }, beto, ''), false);
  assert.equal(podeVerSegredosDaFicha({ dono: '' }, beto, ''), false);
});

/* ───────── trocar a senha tem que trocar nos dois lugares ───────── */

test('trocar a senha grava também onde o servidor confere', () => {
  // O SINTOMA: trocar a senha e ela "não salvar".
  //
  // Ela salvava — só que no lugar errado. O registro público é o que a TELA
  // consulta para saber se pede senha; o documento privado é o que as REGRAS
  // leem para deixar entrar. Gravando só o público, a tela passava a aceitar
  // a senha nova enquanto o servidor continuava conferindo a antiga: a pessoa
  // digitava certo e era recusada sem explicação nenhuma.
  const botao = readFileSync(
    new URL('../src/shell/CampaignPasswordButton.jsx', import.meta.url), 'utf8');
  assert.match(botao, /definirSegredosDaMesa\(campaign\.id, \{ senhaMestreHash: passwordHash \}\)/,
    'a senha de Mestre não chega ao documento que as regras leem');
  assert.match(botao, /definirSegredosDaMesa\(campaign\.id, \{ senhaMesaHash: passwordHash \}\)/,
    'a senha de entrada não chega ao documento que as regras leem');
  // E as duas continuam indo para o registro público, que é o que a tela lê.
  assert.match(botao, /masterPinHash: passwordHash/);
  assert.match(botao, /\{ passwordHash, passwordUpdatedAt/);
});

test('o diálogo da senha sai para fora da barra do topo', () => {
  // Dentro da barra ele vira refém da pilha dela: por mais z-index que tenha,
  // não consegue passar na frente de quem está acima da barra inteira.
  const botao = readFileSync(
    new URL('../src/shell/CampaignPasswordButton.jsx', import.meta.url), 'utf8');
  assert.match(botao, /createPortal\(/);
  assert.match(botao, /document\.body,/);
});

/* ───────── quem cria, quem manda, e quem só joga ───────── */

test('o botão de remover só aparece na mesa que a conta criou', () => {
  // Entrar no modo de gerência não é passe para apagar a mesa dos outros.
  // Antes bastava estar gerenciando: o botão aparecia em todas.
  const gate = readFileSync(
    new URL('../src/features/campanhas/CampaignGate.jsx', import.meta.url), 'utf8');
  assert.match(gate, /const souQuemCriou = Boolean\(contaUid\) && String\(campaign\.criadoPor \|\| ''\) === String\(contaUid\)/);
  assert.match(gate, /const podeRemover = canManage && !campaign\.primary && \(souQuemCriou \|\| mesaOrfa\)/);
  assert.ok(!/\{canManage && !campaign\.primary \?/.test(gate),
    'o botão voltou a aparecer em qualquer mesa durante a gerência');
  // E a mesa sai da lista no clique, sem esperar a volta do servidor.
  assert.match(gate, /setRows\(atuais => atuais\.filter/);
});

test('ser Mestre vale por senha, não por ter criado a mesa', () => {
  // O pedido: quem tiver a senha de Mestre daquela mesa entra com todo o
  // acesso, seja quem for que a criou. Nas regras, tudo que é do Mestre
  // passa por mestre(cid) — que olha o papel no registro de membro, e não
  // quem criou. O criador vira Mestre por outro caminho; chegando lá, os
  // dois são a mesma coisa.
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(regras, /function mestre\(cid\) \{\s*return membro\(cid\) && papel\(cid\) == 'mestre';/,
    'ser Mestre deixou de ser uma questão de papel');
  // Atualizar a mesa, trocar as senhas e mexer nos membros: tudo por papel.
  assert.match(regras, /allow update: if mestre\(cid\)/);
  assert.match(regras, /allow write: if mestre\(cid\) \|\| \(logado\(\) && request\.auth\.uid == donoDaMesa\(cid\)\)/);
  assert.match(regras, /allow update, delete: if mestre\(cid\)/);
});

test('o jogador alcança o que é da mesa e o que o Mestre liberou', () => {
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  // Mapa, fichas, manual, crônicas: basta ser da mesa.
  assert.match(regras, /allow read: if daMesaComum\(colecao\) && membro\(idNaColecao\(colecao\)\)/);
  // Documento guardado, não. Esse só chega a quem foi nomeado.
  assert.match(regras, /request\.auth\.uid in resource\.data\.get\('liberadoPara', \[\]\)/);
});

/* ───────── o buraco das regras que se somam ───────── */

test('as coleções de acesso seletivo ficam FORA da regra geral', () => {
  // O ERRO QUE ISTO EVITA, e que esteve em produção:
  //
  // As regras do Firestore se SOMAM. Basta um match autorizar para a
  // operação passar — não existe match que restrinja o que outro liberou.
  //
  // A primeira versão tinha a regra estreita dos documentos ao lado da regra
  // geral "membro da mesa lê tudo da mesa". A geral já liberava, então a
  // estreita não restringia nada: qualquer jogador lia, pelo console,
  // documento que o Mestre nunca tinha revelado. Era segredo de tela,
  // exatamente o que aquela regra existia para evitar.
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

  assert.match(regras, /function acessoSeletivo\(colecao\)/,
    'sumiu a lista de coleções que a regra geral precisa pular');
  assert.match(regras, /function daMesaComum\(colecao\)[\s\S]{0,140}!acessoSeletivo\(colecao\)/,
    'a regra geral voltou a cobrir as coleções de acesso seletivo');

  // E a regra geral precisa usar daMesaComum, não colecaoDeCampanha cru.
  assert.match(regras, /allow read: if daMesaComum\(colecao\) && membro\(idNaColecao\(colecao\)\)/,
    'a regra geral voltou a liberar tudo para qualquer membro');
  assert.ok(!/allow (read|write): if colecaoDeCampanha\(colecao\) && membro\(/.test(regras),
    'sobrou uma regra geral que cobre também as coleções seletivas');

  // Documentos e cartões do mural são as duas coleções seletivas de hoje.
  assert.match(regras, /c__\[a-z0-9-\]\+__documentos/);
  assert.match(regras, /c__\[a-z0-9-\]\+__mural_cartoes/);
});

test('no mural, só o Mestre muda quem vê — mas todos movem cartão', () => {
  // O mural é de todos: jogador prega, move e liga. O que não pode é um
  // jogador editar o próprio cartão trancado para se liberar.
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const bloco = regras.slice(regras.indexOf("mural_cartoes"));
  assert.match(bloco, /allow write: if colecao\.matches\('c__\[a-z0-9-\]\+__mural_cartoes'\)[\s\S]{0,200}membro\(idNaColecao\(colecao\)\)/,
    'escrever no mural voltou a ser só do Mestre');
  assert.match(bloco, /request\.resource\.data\.get\('liberadoPara', \[\]\)\s*\n?\s*== resource\.data\.get\('liberadoPara', \[\]\)/,
    'o jogador voltou a poder mexer em quem vê o cartão');
  // Cartão antigo, sem campo de liberação, continua legível por todos.
  assert.match(bloco, /!\('liberadoParaTodos' in resource\.data\)/,
    'o mural antigo sumiria para os jogadores na primeira publicação');
});

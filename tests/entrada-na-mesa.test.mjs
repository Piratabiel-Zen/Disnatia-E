/**
 * ENTRAR NUMA MESA É VIRAR MEMBRO NO SERVIDOR
 *
 * Um amigo logou com o Gmail, digitou a senha de Mestre da Estrela de Absinto
 * e caiu numa mesa completamente vazia, com "Desconectado" no canto. Ele não
 * estava desconectado: estava sem registro de membro. As regras só entregam
 * os dados de uma campanha para quem tem esse registro, e sem ele o navegador
 * pedia tudo e o servidor negava tudo, sem nenhum erro aparecer na tela.
 *
 * Eram três buracos somados, e cada teste aqui tranca um:
 *
 *  1. O portão deixava entrar sem registrar — bastava a mesa não ter senha,
 *     ou o aparelho já ter guardado o resumo de uma visita anterior.
 *  2. A tela lia o registro uma vez só. Quem entrava e SÓ DEPOIS virava
 *     Mestre continuava vendo "entre na campanha", já sendo membro.
 *  3. O selo de sincronização, recusado uma vez, nunca mais tentava — então
 *     dizia "Desconectado" para sempre, mesmo depois de a permissão existir.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = caminho => readFileSync(new URL(caminho, import.meta.url), 'utf8');

test('o portão só entrega a mesa depois de garantir o registro de membro', () => {
  const portao = ler('../src/features/campanhas/CampaignGate.jsx');

  // A forma antiga: destrancado, entra, e ninguém registra ninguém.
  assert.ok(
    !/const enter = \(\) => \{\s*if \(locked\) \{ setAsking\(true\); return; \}\s*onEnter\(campaign\);/.test(portao),
    'o portão voltou a entregar a mesa sem passar pelo servidor',
  );
  assert.match(portao, /const enter = async/, 'entrar deixou de conferir o registro no servidor');
  assert.match(portao, /lerMembro\(campaign\.id/, 'o portão parou de perguntar se a pessoa já é membro');
  assert.match(portao, /semSenha: true/, 'mesa sem senha voltou a admitir gente sem registrar');
  // Aparelho que guardou a senha mas não tem registro: a senha é pedida de
  // novo. Entrar assim seria entrar num cômodo que o servidor não abre.
  assert.match(portao, /rememberUnlock\(campaign\.id, ''\)/,
    'o portão voltou a confiar no cache do aparelho em vez do servidor');
});

test('a tela acompanha o registro de membro em vez de lê-lo uma vez', () => {
  const gancho = ler('../src/features/acesso/useMembro.js');
  assert.match(gancho, /observarMembro/, 'useMembro voltou à leitura única');
  assert.ok(!/lerMembro/.test(gancho), 'useMembro ainda faz a leitura de uma vez só');

  const auth = ler('../src/core/auth.js');
  assert.match(auth, /export function observarMembro/, 'o observador do registro sumiu');
  assert.match(auth, /onSnapshot\(\s*membroRef/, 'observarMembro deixou de ouvir o documento');
});

test('o selo de sincronização tenta de novo depois de ser recusado', () => {
  const selo = ler('../src/experience/ConnectionHealth.jsx');
  assert.match(selo, /setTimeout\(ouvir/, 'o selo voltou a desistir no primeiro erro');
  assert.match(selo, /ESPERA_MAXIMA/, 'a espera entre tentativas deixou de ter teto');
  // Sem teto e sem crescimento, uma mesa à qual a pessoa não pertence vira um
  // pedido por segundo contra as regras, para sempre.
  assert.match(selo, /2 \*\* tentativa\.current/, 'as tentativas pararam de espaçar');
});

test('as regras admitem na mesa sem senha quem a tela já deixa entrar', () => {
  const regras = ler('../firestore.rules');
  assert.match(regras, /function mesaSemSenha\(cid\)/, 'a mesa sem senha voltou a não ter porta no servidor');
  // Exigir as duas vazias é o que impede confundir "mesa aberta" com "mesa
  // cujas senhas ainda não foram copiadas para privado/acesso".
  assert.match(
    regras,
    /function mesaSemSenha\(cid\)[\s\S]{0,260}senhaDaMesa\(cid\) == ''[\s\S]{0,200}passwordHash', ''\) == ''/,
    'mesa sem senha deixou de conferir as duas senhas',
  );
  // E a porta só dá jogador. Mestre continua exigindo a senha de Mestre.
  assert.match(
    regras,
    /request\.resource\.data\.papel == 'jogador'\s*&& mesaSemSenha\(cid\)/,
    'a porta da mesa sem senha deixou de limitar o papel a jogador',
  );
});

test('a senha de Mestre continua sendo a única porta para o papel de Mestre', () => {
  const regras = ler('../firestore.rules');
  assert.match(
    regras,
    /request\.resource\.data\.papel == 'mestre'\s*&& senhaDeMestre\(cid\) != ''\s*&& request\.resource\.data\.get\('senhaHash', ''\) == senhaDeMestre\(cid\)/,
    'virar Mestre deixou de exigir a senha de Mestre conferida no servidor',
  );
  // Nenhuma das portas novas pode dar 'mestre' sem senha: só o dono da mesa e
  // a mesa órfã entram por outro caminho, e isso é anterior a esta mudança.
  const semSenhaDaMestre = regras.match(/&& mesaSemSenha\(cid\)/g) || [];
  assert.equal(semSenhaDaMestre.length, 1, 'mesaSemSenha passou a abrir mais de uma porta');
});

test('entrar sem senha manda resumo vazio, não o resumo do texto vazio', () => {
  const auth = ler('../src/core/auth.js');
  assert.match(auth, /semSenha \? '' : \(senhaHash \|\| await hashDaSenha\(senha\)\)/,
    'mesa aberta voltou a mandar um resumo que não bate com senha nenhuma');
});

/**
 * QUEM TEM A SENHA DE MESTRE MANDA NA MESA, NÃO SÓ NA TELA
 *
 * Um amigo com a senha de Mestre da Estrela de Absinto via a mesa inteira e
 * não conseguia editar nada, criar ficha nem acrescentar Pecado. O criador da
 * mesa conseguia. A diferença não era de senha: era que só o criador tinha
 * papel de Mestre gravado no servidor.
 *
 * A causa foi uma comparação estrita: `campaign.primary === false`. NENHUMA
 * mesa guarda primary como false — o campo só é escrito, e só como true, na
 * campanha principal. Nas outras ele não existe. Então o trecho que promovia
 * a pessoa a Mestre no servidor nunca rodava, e a senha de Mestre virava um
 * interruptor de tela: via tudo, porque membro lê a mesa toda, e escrevia
 * nada, porque para o servidor era jogador.
 *
 * Por isso o teste não protege só a linha corrigida — ele proíbe a forma.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const raiz = new URL('../src/', import.meta.url).pathname;

function arquivosDeCodigo(pasta) {
  return readdirSync(pasta).flatMap(nome => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivosDeCodigo(caminho);
    return /\.(jsx?|mjs)$/.test(nome) ? [caminho] : [];
  });
}

test('ninguém volta a comparar primary com false ou true', () => {
  const culpados = arquivosDeCodigo(raiz).filter(caminho => {
    const fonte = readFileSync(caminho, 'utf8');
    // Dentro de comentário é o relato do erro, não o erro.
    const semComentarios = fonte.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    return /\.primary\s*===\s*(false|true)/.test(semComentarios);
  });
  assert.deepEqual(
    culpados.map(c => c.slice(raiz.length)),
    [],
    'mesa nova não guarda primary; comparar com false aqui é sempre falso',
  );
});

test('a criação da mesa continua sem escrever primary', () => {
  // Se um dia a criação passar a gravar `primary: false`, a comparação
  // estrita deixa de ser um erro — e o teste acima deixa de fazer sentido.
  // Enquanto ela não grava, a forma `!campaign.primary` é a única correta.
  const portao = readFileSync(new URL('../src/features/campanhas/CampaignGate.jsx', import.meta.url), 'utf8');
  const criacao = portao.slice(portao.indexOf("setDoc(globalDoc('campaigns', id)"));
  const payload = criacao.slice(0, criacao.indexOf('});'));
  assert.ok(!/\bprimary\b/.test(payload), 'a criação passou a gravar primary — reveja a regra acima');
});

test('acertar a senha de Mestre grava o papel no servidor', () => {
  const porta = readFileSync(new URL('../src/experience/PlayerAccess.jsx', import.meta.url), 'utf8');
  const trecho = porta.slice(porta.indexOf('const enterMaster'));
  assert.match(trecho, /if \(campaign && !campaign\.primary\)/,
    'a promoção a Mestre voltou a depender de uma condição que nunca é verdadeira');
  assert.match(trecho, /entrarNaMesa\(\{ campanhaId: campaign\.id, senhaHash: digest, papel: 'mestre' \}\)/,
    'a porta de acesso parou de registrar o papel de Mestre no servidor');
  // E, falhando, a pessoa precisa saber: ficar com a tela de Mestre e sem o
  // papel foi exatamente o que custou esta noite.
  assert.match(trecho, /setError\(/, 'a recusa do servidor voltou a passar em silêncio');
});

test('o botão de Mestre da sessão usa a forma correta desde sempre', () => {
  const botao = readFileSync(new URL('../src/shell/MasterToggle.jsx', import.meta.url), 'utf8');
  assert.match(botao, /if\(!mesa\?\.primary\)/, 'o botão de Mestre adotou a comparação estrita');
  assert.match(botao, /entrarNaMesa\(\{campanhaId:mesa\.id,senhaHash:digest,papel:'mestre'\}\)/,
    'o botão de Mestre parou de registrar o papel no servidor');
});

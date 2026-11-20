/**
 * A POLÍTICA DE SEGURANÇA PRECISA DEIXAR ENTRAR O QUE O SITE USA
 *
 * A música não tocou por dias, e a causa não era nenhuma das que eu persegui.
 * Ao endurecer a segurança do site, a política de conteúdo passou a listar
 * de onde o navegador pode carregar coisa — e o YouTube não entrou na lista.
 * Com isso o navegador recusava o tocador antes de ele existir.
 *
 * O pior desse tipo de falha é que ela não se parece com ela mesma: o quadro
 * simplesmente não aparecia, sem erro na tela, e cada tentativa de consertar
 * olhava para o lado errado — o link, o bloqueio de autoplay, o modo de
 * montar o tocador.
 *
 * Então o teste não guarda a lista: guarda a RELAÇÃO entre o que o código
 * embute e o que a política permite. Alguém que amanhã troque o YouTube por
 * outro serviço descobre aqui, e não no meio de uma sessão.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const politica = (() => {
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const regra = vercel.headers
    .flatMap(h => h.headers)
    .find(h => h.key === 'Content-Security-Policy');
  assert.ok(regra, 'a política de segurança sumiu do vercel.json');
  return Object.fromEntries(
    regra.value.split(';').map(p => p.trim()).filter(Boolean)
      .map(p => { const [nome, ...fontes] = p.split(/\s+/); return [nome, fontes]; }),
  );
})();

const permite = (diretiva, host) => (politica[diretiva] || []).some(
  fonte => fonte === host || (fonte.startsWith('https://*.') && host.endsWith(fonte.slice(9))),
);

test('o tocador do YouTube pode ser carregado e exibido', () => {
  // O script da API: sem isto, o tocador nem chega a ser construído.
  assert.ok(permite('script-src', 'https://www.youtube.com'),
    'a API do YouTube voltou a ser barrada pela política — a música não toca');
  // E o quadro onde o vídeo roda.
  assert.ok(permite('frame-src', 'https://www.youtube.com'),
    'o quadro do YouTube voltou a ser barrado pela política');
});

test('o tocador do Spotify pode ser exibido', () => {
  assert.ok(permite('frame-src', 'https://open.spotify.com'),
    'o quadro do Spotify voltou a ser barrado pela política');
});

test('tudo que o código embute está liberado na política', () => {
  // A relação, e não a lista: trocar de serviço sem mexer na política passa
  // a falhar aqui, e não no meio de uma sessão.
  const musica = readFileSync(new URL('../src/shell/linkDeMusica.mjs', import.meta.url), 'utf8');
  const tocador = readFileSync(new URL('../src/shell/tocadorDoYoutube.mjs', import.meta.url), 'utf8');

  const hosts = [...`${musica}\n${tocador}`.matchAll(/https:\/\/([a-z0-9.-]+)\//g)]
    .map(m => `https://${m[1]}`);
  assert.ok(hosts.length >= 2, 'nenhum endereço encontrado — o teste parou de olhar o lugar certo');

  for (const host of new Set(hosts)) {
    assert.ok(
      permite('frame-src', host) || permite('script-src', host),
      `${host} é usado pelo tocador e não está liberado na política de segurança`,
    );
  }
});

test('a política continua fechada para o que o site não usa', () => {
  // Abrir para o YouTube não pode virar abrir para qualquer um.
  for (const diretiva of ['frame-src', 'script-src', 'default-src']) {
    assert.ok(!(politica[diretiva] || []).includes('*'),
      `${diretiva} foi aberta para qualquer origem`);
    assert.ok(!(politica[diretiva] || []).includes("'unsafe-eval'"),
      `${diretiva} passou a permitir eval`);
  }
  assert.deepEqual(politica['object-src'], ["'none'"]);
  assert.deepEqual(politica['frame-ancestors'], ["'none'"]);
});

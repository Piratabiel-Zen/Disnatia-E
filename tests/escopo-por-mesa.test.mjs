/* CADA MESA NO SEU CANTO
   O Arquivo de Veneza abriu mostrando "A Divisão dos Portadores" e os mapas da
   Dinastia E. Não era o Firestore: eram três caches de localStorage com uma
   chave só para o site inteiro. A tela nasce lendo o cache, e a mesa nova não
   tem documento de sessão para sobrescrever — então ficava assim.

   Estes testes seguram as duas pontas: nenhuma chave volta a ser global, e a
   campanha principal continua sem sufixo, para quem já estava dentro não
   perder o que tinha guardado. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  PRIMARY_CAMPAIGN_ID, caminhoEscopado, definirEscopo, ehCampanhaPrincipal,
  escopoAtivo, storageSuffix,
} from '../src/core/escopo.mjs';
import { readSessionCache, writeSessionCache } from '../src/adventure/sessionCache.js';

test('a campanha principal não ganha sufixo nem prefixo', () => {
  definirEscopo(PRIMARY_CAMPAIGN_ID);
  assert.equal(storageSuffix(), '', 'quem já estava dentro perderia o que tinha guardado');
  assert.equal(caminhoEscopado('sheets'), 'sheets', 'os caminhos antigos não podem mudar');
  assert.equal(ehCampanhaPrincipal(), true);
});

test('mesa nova fica num canto só dela', () => {
  definirEscopo('arquivo-de-veneza');
  assert.equal(storageSuffix(), ':arquivo-de-veneza');
  assert.equal(caminhoEscopado('sheets'), 'c__arquivo-de-veneza__sheets');
  assert.equal(escopoAtivo(), 'arquivo-de-veneza');
  assert.equal(ehCampanhaPrincipal(), false);
  definirEscopo(PRIMARY_CAMPAIGN_ID);
});

test('o cache da sessão não atravessa de uma mesa para outra', () => {
  // O caminho exato do defeito relatado, reproduzido.
  const guardado = new Map();
  const fake = {
    getItem: k => (guardado.has(k) ? guardado.get(k) : null),
    setItem: (k, v) => guardado.set(k, v),
    removeItem: k => guardado.delete(k),
  };

  definirEscopo(PRIMARY_CAMPAIGN_ID);
  writeSessionCache({ active: true, title: 'A Divisão dos Portadores', location: 'Brasil | Egito' }, fake);
  assert.equal(readSessionCache(fake).title, 'A Divisão dos Portadores');

  definirEscopo('arquivo-de-veneza');
  assert.equal(readSessionCache(fake).title, '', 'a mesa nova abriu com a sessão da Dinastia E');

  // E o que a mesa nova escreve não contamina a antiga.
  writeSessionCache({ active: true, title: 'O silêncio dos canais' }, fake);
  definirEscopo(PRIMARY_CAMPAIGN_ID);
  assert.equal(readSessionCache(fake).title, 'A Divisão dos Portadores', 'a mesa antiga foi sobrescrita');
});

test('nenhum cache do site voltou a ter chave global', () => {
  // O teste que faltava: varre o código atrás de chave de localStorage escrita
  // como literal, sem sufixo de mesa.
  const raiz = new URL('../src/', import.meta.url).pathname;
  const suspeitos = [];
  (function varrer(dir) {
    for (const nome of readdirSync(dir)) {
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) { varrer(caminho); continue; }
      if (!/\.(js|jsx|mjs)$/.test(nome)) continue;
      const texto = readFileSync(caminho, 'utf8');
      for (const m of texto.matchAll(/localStorage\.[gs]etItem\(\s*'([^']+)'/g)) {
        suspeitos.push(`${caminho.slice(raiz.length)} → '${m[1]}'`);
      }
    }
  })(raiz);

  // As que sobram de propósito: escolhas do aparelho, não da mesa.
  const porAparelho = ['dinastia_quality_v1', 'dinastia_player_preferences_v1', 'dinastia_safe_graphics_v1'];
  const vazando = suspeitos.filter(s => !porAparelho.some(p => s.includes(p)));
  assert.deepEqual(
    vazando, [],
    `chave de localStorage sem sufixo de mesa:\n  ${vazando.join('\n  ')}\n` +
    'Use storageSuffix() de core/escopo.mjs, senão os dados de uma mesa aparecem na outra.',
  );
});

test('escopo.mjs não arrasta o Firebase junto', () => {
  // É por isso que ele existe: os caches precisam saber a mesa, e importar
  // campaign.js traria o Firestore inteiro para dentro de um teste de cache.
  const fonte = readFileSync(new URL('../src/core/escopo.mjs', import.meta.url), 'utf8');
  assert.ok(!/from\s+['"]firebase/.test(fonte), 'escopo.mjs voltou a importar o Firebase');
  assert.ok(!/from\s+['"]\.\/firebase/.test(fonte));
});

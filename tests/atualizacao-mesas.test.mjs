import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PRIMARY_DEFAULT_PASSWORD_HASH, hashPassword, isUnlocked, rememberUnlock, requiredPasswordHash, tryUnlock,
} from '../src/core/campaignPassword.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const fakeStorage = () => { const data = new Map(); return { getItem: k => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: k => data.delete(k) }; };
const primary = { id: 'dinastia-e', primary: true };

test('a Dinastia E nasce com a senha "estrelas"', async () => {
  assert.equal(await hashPassword('estrelas'), PRIMARY_DEFAULT_PASSWORD_HASH);
  assert.equal(requiredPasswordHash(primary), PRIMARY_DEFAULT_PASSWORD_HASH);
  // Maiúsculas e espaços em volta não derrubam quem digitou certo.
  assert.equal(await hashPassword('  Estrelas '), PRIMARY_DEFAULT_PASSWORD_HASH);
});

test('a senha certa abre o portal e a errada não', async () => {
  const storage = fakeStorage();
  assert.equal(isUnlocked(primary, storage), false);
  assert.equal(await tryUnlock(primary, 'lua', storage), false);
  assert.equal(isUnlocked(primary, storage), false);
  assert.equal(await tryUnlock(primary, 'estrelas', storage), true);
  assert.equal(isUnlocked(primary, storage), true);
});

test('quando o Mestre troca a senha, quem estava dentro volta para a porta', async () => {
  const storage = fakeStorage();
  await tryUnlock(primary, 'estrelas', storage);
  const changed = { ...primary, passwordHash: await hashPassword('cometa') };
  assert.equal(isUnlocked(changed, storage), false);
  assert.equal(await tryUnlock(changed, 'estrelas', storage), false);
  assert.equal(await tryUnlock(changed, 'cometa', storage), true);
});

test('mesa nova sem senha fica aberta; o aparelho do Mestre lembra a senha que ele acabou de criar', async () => {
  const storage = fakeStorage();
  assert.equal(isUnlocked({ id: 'arquivo-de-veneza' }, storage), true);
  const hash = await hashPassword('veneza');
  rememberUnlock('arquivo-de-veneza', hash, storage);
  assert.equal(isUnlocked({ id: 'arquivo-de-veneza', passwordHash: hash }, storage), true);
});

test('o banco guarda só o resumo da senha e a troca não apaga o registro da mesa', () => {
  const button = read('../src/shell/CampaignPasswordButton.jsx');
  assert.match(button, /setDoc\(globalDoc\('campaigns', campaign\.id\), \{ passwordHash, passwordUpdatedAt: Date\.now\(\) \}, \{ merge: true \}\)/);
  assert.doesNotMatch(button, /password:\s*(clean|word)/);
  // Só o Mestre, com o modo mestre ligado, vê o botão.
  assert.match(read('../src/AuthenticatedSession.jsx'), /access\.role === 'master' && masterMode && <CampaignPasswordButton/);
});

test('o globo é a Terra de verdade, com o universo ao fundo', () => {
  const globe = read('../src/features/mapa-mundi/GlobeView.jsx');
  assert.match(globe, /\/media\/terra\/dia\.jpg/);
  assert.match(globe, /uNight/);
  assert.match(globe, /new THREE\.Points\(starGeometry, starMaterial\)/);
  assert.match(read('../src/features/mapa-mundi/MapaMundiPage.jsx'), /<GlobeView\s+earth/);
});

test('cada linhagem tem o seu cenário', () => {
  const css = read('../src/features/classes/cenarios.css');
  const data = read('../src/data/gameData.jsx');
  const ids = [...data.slice(data.indexOf('const DINASTIA_E_CLASSES'), data.indexOf('export const ATTRS')).matchAll(/^    "id": "([^"]+)"/gm)].map(match => match[1]);
  assert.ok(ids.length >= 9, 'a lista de classes não foi lida');
  for (const id of ids) assert.match(css, new RegExp(`\\.scene-${id}[ .]`), `falta o cenário de ${id}`);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('a força da habilidade escala a resposta ao mouse', () => {
  const css = read('../src/features/sheets/habilidades-vivas.css');
  for (const tier of ['passiva', 'normal', 'especial', 'combinada']) {
    assert.match(css, new RegExp(`\\.ability-row\\[data-ability-tier="${tier}"\\]:hover`), `falta a resposta de ${tier}`);
  }
  const lift = tier => Number((css.match(new RegExp(`\\.ability-row\\[data-ability-tier="${tier}"\\]:hover\\{\\s*transform:translateY\\((-?\\d+)px\\)`)) || [])[1]);
  assert.ok(Math.abs(lift('combinada')) > Math.abs(lift('especial')) && Math.abs(lift('especial')) > Math.abs(lift('normal')));
  const sheet = read('../src/features/sheets/SheetComponents.jsx');
  assert.match(sheet, /className="ability-row" data-ability-tier=\{isCombined\?'combinada':type\}/);
  assert.match(sheet, /className="sheet-awakening"/);
});

test('as invocações usam a mesma leitura da ficha e aparecem no mapa', () => {
  const sheet = read('../src/features/sheets/SheetComponents.jsx');
  assert.match(sheet, /<SummonAttrRows source=\{summon\}\/>/);
  assert.match(sheet, /<SummonAbilityRow key=/);
  const rack = read('../src/experience/SummonCombatRack.jsx');
  assert.match(rack, /<SummonAttrRows source=\{memory\|\|record\} compact\/>/);
  // O Mestre acompanha as invocações de todos os necromantes.
  assert.match(rack, /const overseeing=Boolean\(masterMode\|\|access\?\.role==='master'\)/);
});

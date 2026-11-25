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

test('o banco guarda só o resumo das duas senhas, e cada mesa tem as suas', () => {
  const button = read('../src/shell/CampaignPasswordButton.jsx');
  // A senha de entrada e a de Mestre, cada uma no seu campo.
  assert.match(button, /\{ passwordHash, passwordUpdatedAt: Date\.now\(\) \}, \{ merge: true \}/);
  assert.match(button, /\{ masterPinHash: passwordHash, masterPinUpdatedAt: Date\.now\(\) \}, \{ merge: true \}/);
  // O texto da senha nunca vai para o banco.
  assert.doesNotMatch(button, /password:\s*(clean|word)/);

  // Dois botões, não um seletor: um Mestre com pressa trocaria a errada.
  const sessao = read('../src/AuthenticatedSession.jsx');
  assert.match(sessao, /masterMode && <><CampaignPasswordButton/);
  assert.match(sessao, /tipo="mestre"/);
});

test('a senha de Mestre deixou de ser uma só para o site inteiro', () => {
  // Estava fixa no código em quatro arquivos: quem a soubesse virava Mestre
  // de QUALQUER mesa, inclusive de uma que acabou de conhecer.
  for (const arquivo of ['../src/experience/PlayerAccess.jsx', '../src/shell/MasterToggle.jsx']) {
    const fonte = read(arquivo);
    assert.doesNotMatch(fonte, /f0b20bb6d6fad7901c81dcd90cd10fa59d889be1bfb7653efc36d0e9944e3311/,
      `${arquivo} voltou a ter a senha de Mestre fixa no código`);
    assert.match(fonte, /requiredMasterHash/, `${arquivo} não consulta a senha da mesa`);
  }
  // A mesa nova nasce com as duas senhas, senão nasceria aberta e sem Mestre.
  const gate = read('../src/features/campanhas/CampaignGate.jsx');
  assert.match(gate, /passwordHash: await hashPassword\(senhaMesa\)/);
  assert.match(gate, /masterPinHash: await hashPassword\(senhaMestre\)/);
  assert.match(gate, /as duas senhas precisam ser diferentes/i);
});

test('o globo é a Terra de verdade, com o universo ao fundo', () => {
  const globe = read('../src/features/mapa-mundi/GlobeView.jsx');
  assert.match(globe, /\/media\/terra\/dia\.webp/);
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
  assert.match(css, /html\[data-motion="reduced"\]/);
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

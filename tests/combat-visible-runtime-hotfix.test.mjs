import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const patch = fs.readFileSync(new URL('../scripts/combat-visible-runtime-hotfix-2026-09-22.mjs', import.meta.url), 'utf8');
const vite = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');

test('o hotfix roda por último no pipeline modular', () => {
  const visible = vite.indexOf('visible-update-proof-patch.mjs');
  const hotfix = vite.indexOf('combat-visible-runtime-hotfix-2026-09-22.mjs');
  assert.ok(visible >= 0 && hotfix > visible);
});

test('o HUD realmente exibido recebe orbes líquidos de HP e VC', () => {
  assert.match(patch, /function CombatResourceOrb/);
  assert.match(patch, /CombatResourceOrb value=\{hp\}/);
  assert.match(patch, /CombatResourceOrb value=\{vc\}/);
  assert.match(patch, /combat-orb-wave/);
});

test('atalhos 1 a 4 acionam somente habilidades habilitadas', () => {
  assert.match(patch, /function CombatHotkeys/);
  assert.match(patch, /if\(!button\|\|button\.disabled\)return/);
  assert.match(patch, /aria-keyshortcuts=\{i<4\?String\(i\+1\):undefined\}/);
});

test('dano flutuante usa a camada global e encontra HUD ou token', () => {
  assert.match(patch, /function FloatingDamageLayer/);
  assert.match(patch, /\[data-entity-id\],\[data-combat-entity-id\]/);
  assert.match(patch, /data-combat-entity-id=/);
  assert.match(patch, /z-index:30000/);
});

test('a habilidade mantém apenas ícone, nome compacto e pulsação', () => {
  assert.match(patch, /combat-action-pulse compact/);
  assert.match(patch, /combat-action-class-icon/);
  assert.doesNotMatch(patch.match(/const compactPulse = `[\s\S]*?`;\nkit = replaceSection/)?.[0] || '', /actorName/);
  assert.doesNotMatch(patch.match(/const compactPulse = `[\s\S]*?`;\nkit = replaceSection/)?.[0] || '', /targetName/);
});

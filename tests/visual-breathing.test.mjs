import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const adventure = fs.readFileSync(new URL('../src/adventure/AdventureSession.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/adventure/adventure.css', import.meta.url), 'utf8');
const background = fs.readFileSync(new URL('../src/experience/CosmicLivingBackground.jsx', import.meta.url), 'utf8');
const starsPatch = fs.readFileSync(new URL('../scripts/cronicas-clean-modern-stars-patch.mjs', import.meta.url), 'utf8');
const parityPatch = fs.readFileSync(new URL('../scripts/immersive-cross-browser-parity-patch.mjs', import.meta.url), 'utf8');

test('a sessão usa uma companhia horizontal compacta sem remover ações', () => {
  assert.match(css, /VISUAL BREATHING PASS 2026-09-25/);
  assert.match(css, /\.ad-companion\{flex:1 0 206px;max-width:260px;height:82px/);
  for (const panel of ['sheet', 'abilities', 'inventory', 'journal']) assert.match(adventure, new RegExp(`panel: '${panel}'`));
  assert.doesNotMatch(adventure, /<small>\{item\.hint\}<\/small>/);
  assert.match(parityPatch, /\.ad-party-row\{[\s\S]*?min-height:90px/);
  assert.match(parityPatch, /\.ad-companion\{[\s\S]*?display:grid!important;[\s\S]*?height:82px/);
  assert.doesNotMatch(parityPatch, /\.ad-companion\{[\s\S]*?flex:0 0 134px!important/);
});

test('o modo leve desliga decoração contínua e o imersivo usa menos camadas', () => {
  assert.match(css, /html\[data-quality="light"\] \.grim-link::after\{display:none!important\}/);
  assert.match(background, /BRIGHT_STAR_COUNT = 7/);
  assert.match(background, /SHOOTING_STAR_COUNT = 2/);
  assert.match(starsPatch, /SHOOTING_STAR_COUNT = 2/);
});

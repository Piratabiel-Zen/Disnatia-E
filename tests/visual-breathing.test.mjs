import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const adventure = fs.readFileSync(new URL('../src/adventure/AdventureSession.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/adventure/adventure.css', import.meta.url), 'utf8');
const background = fs.readFileSync(new URL('../src/experience/CosmicLivingBackground.jsx', import.meta.url), 'utf8');
const rail = fs.readFileSync(new URL('../src/experience/GameExperience3.jsx', import.meta.url), 'utf8');
const playerDock = fs.readFileSync(new URL('../src/experience/PlayerComfort.jsx', import.meta.url), 'utf8');

test('a sessão usa uma companhia horizontal compacta sem perder os painéis', () => {
  assert.match(css, /VISUAL BREATHING PASS 2026-09-25/);
  assert.match(css, /\.ad-companion\{flex:1 0 206px;max-width:260px;height:82px/);
  // Os quatro painéis seguem a um clique: trilho lateral no desktop, dock no mobile.
  for (const panel of ['sheet', 'abilities', 'inventory', 'journal']) {
    assert.match(rail, new RegExp(`toggle\\('${panel}'\\)`));
    assert.match(playerDock, new RegExp(`'${panel}'`));
  }
  // A tela inicial não repete esses mesmos atalhos uma terceira vez.
  assert.doesNotMatch(adventure, /ad-action-dock/);
  // Nem exibe faixa decorativa ou rodapé de frase.
  assert.doesNotMatch(adventure, /ad-chapter-line|ad-footer/);
});

test('o modo leve desliga decoração contínua e o imersivo usa menos camadas', () => {
  assert.match(css, /html\[data-quality="light"\] \.grim-link::after\{display:none!important\}/);
  const count = name => (background.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n\\];`))?.[1].match(/^\s*\[/gm) || []).length;
  assert.ok(count('BRIGHT_STARS') <= 10);
  assert.ok(count('SHOOTING_STARS') <= 3);
});

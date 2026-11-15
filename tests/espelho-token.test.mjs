import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/features/mapa-batalha/BattleMapPage.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/features/mapa-batalha/tokens-vivos.css', import.meta.url), 'utf8');

test('todo token nasce sem espelhamento', () => {
  assert.match(page, /const newToken = id => \(\{.*flipped: false.*\}\)/);
});

test('o espelhamento entra no transform da arte, nao no invólucro que respira', () => {
  const matches = page.match(/rotateY\(\$\{token\.flipped/g) || [];
  assert.equal(matches.length, 2, 'a foto e o emoji de fallback precisam espelhar juntos');
});

test('quem controla o token pode espelhar, nao apenas o mestre', () => {
  const button = page.slice(page.indexOf('battlemap-flip-dial'));
  assert.match(page, /\(isSelected \|\| draggingId === token\.id \|\| rotatingId === token\.id\) && canDrag && !multiSelectMode && \(\s*<button/);
  assert.match(button, /onClick=\{e=>\{e\.stopPropagation\(\);toggleTokenFlip\(token\);\}\}/);
});

test('o espelhamento viaja pelo canal ao vivo e chega nos outros aparelhos', () => {
  assert.match(page, /flipped: Boolean\(flipped\)/);
  assert.match(page, /if \(typeof data\.flipped === 'boolean'\)/);
  assert.match(page, /\.\.\.\(hasFlip \? \{ flipped: patch\.flipped \} : \{\}\)/);
});

test('o giro do botao respeita quem pediu menos movimento', () => {
  const reduced = css.slice(css.lastIndexOf('prefers-reduced-motion'));
  assert.match(reduced, /battlemap-flip-dial\[data-spinning="true"\] span\{animation:none;\}/);
});

test('a respiracao do token continua viva', () => {
  assert.match(css, /\.map-token-body/);
  assert.match(page, /--breath-delay/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const gesture = read('../src/experience/useThrowGesture.js');
const tray = read('../src/experience/PhysicalDiceTray.jsx');
const widget = read('../src/shell/DiceWidget.jsx');

test('o gesto decide o voo, nunca o resultado', () => {
  // A notação com @valores continua sendo quem define as faces.
  assert.match(tray, /const notation = `\$\{safeValues\.length\}d\$\{safeSides\}@\$\{safeValues\.join\(','\)\}`/);
  // O gesto entra só na direção e na força do lançamento.
  assert.match(tray, /box\.startClickThrow = notation =>/);
  assert.match(tray, /return box\.getNotationVectors\(notation, direction, impulse, reach\)/);
  // Sem gesto (replay de outro jogador, clique simples), a biblioteca decide.
  assert.match(tray, /return originalThrow\(notation\)/);
});

test('a força e a direção saem do movimento real da mão', () => {
  // Só o fim do movimento conta: o começo lento não deve roubar força.
  assert.match(gesture, /MAX_SAMPLES = 6/);
  assert.match(gesture, /const speed = distance \/ elapsed/);
  // A força fica dentro de limites: nem um lance morto, nem um foguete.
  assert.match(gesture, /MIN_POWER = 0\.45/);
  assert.match(gesture, /MAX_POWER = 2\.2/);
  // A tela cresce para baixo e a mesa da física cresce para cima.
  assert.match(gesture, /y: Math\.max\(-1, Math\.min\(1, -dy/);
  // Um toque curto não vira arremesso.
  assert.match(gesture, /if \(distance < MIN_SWIPE\) return/);
  // A direção é normalizada pelo tamanho da área, para valer o mesmo em
  // qualquer tela.
  assert.match(gesture, /dx \/ Math\.max\(60, bounds\.width \/ 2\)/);
});

test('o clique de sempre continua funcionando', () => {
  assert.match(widget, /onClick=\{\(\) => \{ if \(!holding && !physicalRolling\) roll\(null\); \}\}/);
  // E o teclado também abre o lançamento.
  assert.match(widget, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.match(widget, /role="button"/);
});

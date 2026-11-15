import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// A faixa de personagens mudou de arquivo quando a tela inicial virou
// "onde a companhia está", mas o contrato é o mesmo: quem rola é o
// viewport, nunca a linha flex — misturar os dois já quebrou a faixa antes.
const component = fs.readFileSync('src/adventure/SessionHome.jsx', 'utf8');
// O retrato em si continua no AdventureSession, que é quem o entrega ao
// SessionHome.
const portrait = fs.readFileSync('src/adventure/AdventureSession.jsx', 'utf8');
const css = fs.readFileSync('src/adventure/adventure.css', 'utf8');

test('party strip separates the scroll viewport from the flex row', () => {
  assert.match(component, /className="ad-party-viewport"[\s\S]*className="ad-party-row"/);
  assert.match(css, /\.ad-party-viewport\{[^}]*overflow-x:auto/);
  assert.match(css, /\.ad-party-row\{[^}]*width:max-content/);
  assert.doesNotMatch(css, /\.ad-party-row\{[^}]*overflow-x:auto/);
});

test('party portraits paint immediately and retain a text fallback', () => {
  assert.match(portrait, /className="ad-portrait-fallback"/);
  assert.match(portrait, /loading="eager"/);
  assert.doesNotMatch(portrait, /loading="lazy"/);
  assert.match(css, /\.ad-portrait>img\{[^}]*content-visibility:visible!important/);
});

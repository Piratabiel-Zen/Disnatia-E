import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const component = fs.readFileSync('src/adventure/AdventureSession.jsx', 'utf8');
const css = fs.readFileSync('src/adventure/adventure.css', 'utf8');
const parityPatch = fs.readFileSync('scripts/immersive-cross-browser-parity-patch.mjs', 'utf8');

test('party strip separates the scroll viewport from the flex row', () => {
  assert.match(component, /className="ad-party-viewport"[\s\S]*className="ad-party-row"/);
  assert.match(css, /\.ad-party-viewport\{[^}]*overflow-x:auto/);
  assert.match(css, /\.ad-party-row\{[^}]*width:max-content/);
  assert.doesNotMatch(css, /\.ad-party-row\{[^}]*overflow-x:auto/);
});

test('party portraits paint immediately and retain a text fallback', () => {
  assert.match(component, /className="ad-portrait-fallback"/);
  assert.match(component, /loading="eager"/);
  assert.doesNotMatch(component, /loading="lazy"/);
  assert.match(css, /\.ad-portrait>img\{[^}]*content-visibility:visible!important/);
});

test('desktop parity guard includes the complete party paint surface', () => {
  for (const selector of ['.ad-party-viewport', '.ad-party-row', '.ad-companion', '.ad-portrait>img']) {
    assert.ok(parityPatch.includes(selector), `${selector} ausente da proteção de paridade`);
  }
});

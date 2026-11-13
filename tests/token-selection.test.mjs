import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenIdsInMarquee } from '../src/adventure/tokenSelection.mjs';

test('marquee selects token centers in either drag direction and respects ownership', () => {
  const tokens = [
    { id: 'one', x: 20, y: 30 },
    { id: 'two', x: 80, y: 70 },
    { id: 'outside', x: 90, y: 90 },
  ];
  assert.deepEqual(tokenIdsInMarquee(tokens, { left: 85, top: 75, right: 10, bottom: 20 }, token => token.id !== 'two'), ['one']);
});

test('marquee skips invalid token coordinates', () => {
  assert.deepEqual(tokenIdsInMarquee([{ id: 'bad', x: NaN, y: 50 }], { left: 0, top: 0, right: 100, bottom: 100 }), []);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { d20CriticalOutcome } from '../src/adventure/diceCritical.mjs';

test('only a single natural d20 20 or 1 is critical', () => {
  assert.deepEqual(d20CriticalOutcome({ sides:20, count:1, values:[20], total:27 }), { outcome:'positive', natural:20 });
  assert.deepEqual(d20CriticalOutcome({ sides:20, count:1, values:[1], total:8 }), { outcome:'negative', natural:1 });
  assert.equal(d20CriticalOutcome({ sides:20, count:1, values:[19], total:26 }), null);
  assert.equal(d20CriticalOutcome({ sides:20, count:2, values:[20,4], base:24 }), null);
  assert.equal(d20CriticalOutcome({ sides:6, count:1, values:[1] }), null);
  assert.equal(d20CriticalOutcome({ count:1, base:20 }), null);
});

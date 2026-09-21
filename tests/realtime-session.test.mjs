import test from 'node:test';
import assert from 'node:assert/strict';
import { remainingLiveEventMs } from '../src/experience/liveEventTiming.js';

test('a client joining during a reveal receives only its remaining shared time', () => {
  const event = { createdAt: 10_000, expiresAt: 18_500, durationMs: 8_500 };
  assert.equal(remainingLiveEventMs(event, 8_500, 13_000), 5_500);
});

test('historical reveals never replay when a client opens the site later', () => {
  const event = { createdAt: 10_000, durationMs: 8_500 };
  assert.equal(remainingLiveEventMs(event, 8_500, 30_000), 0);
});

test('future-skewed expiry is capped to one animation duration', () => {
  const event = { createdAt: 50_000, expiresAt: 90_000, durationMs: 8_500 };
  assert.equal(remainingLiveEventMs(event, 8_500, 10_000), 8_500);
});


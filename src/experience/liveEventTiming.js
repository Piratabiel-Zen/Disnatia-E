const numberTime = value => {
  if (value && typeof value.toMillis === 'function') return Number(value.toMillis()) || 0;
  return Number(value || 0);
};

const clampDuration = (value, fallback) => Math.min(
  30000,
  Math.max(1000, Number(value || fallback) || fallback),
);

// Returns only the portion of a shared animation that is still live.  A client
// that connects halfway through a reveal joins the same timeline instead of
// replaying the animation from the beginning, while historical events stay off.
export function remainingLiveEventMs(event, fallbackDuration, now = Date.now()) {
  if (!event) return 0;
  const duration = clampDuration(event.durationMs, fallbackDuration);
  const startedAt = numberTime(event.startedAt || event.createdAt);
  const explicitExpiry = numberTime(event.expiresAt);
  const expiresAt = explicitExpiry || (startedAt ? startedAt + duration : 0);
  if (!expiresAt) return 0;
  return Math.max(0, Math.min(duration, expiresAt - Number(now || 0)));
}


// Lease expiry uses elapsed observation time, never a participant's wall clock.
export function createLeaseTracker(now = () => performance.now(), ttl = 6500) {
  const observed = new Map();
  return {
    observe(key, row) {
      if (!row?.active) { observed.delete(key); return; }
      const version = String(row.version || '');
      if (observed.get(key)?.version !== version) observed.set(key, { ...row, version, seen: now() });
    },
    owner(key, ownClient = '') {
      const row = observed.get(key);
      return row && row.clientId !== ownClient && now() - row.seen < ttl ? row : null;
    },
    clear() { observed.clear(); },
  };
}

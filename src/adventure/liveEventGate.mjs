// Cached state and the first authoritative snapshot are history, not actions.
// Metadata delivery must be enabled by the caller. No client clock is involved.
export function createLiveEventGate() {
  let ready = false;
  const seen = new Set();
  return (snapshot, entries) => {
    if (snapshot.metadata?.fromCache) return [];
    if (!ready) {
      entries.forEach(entry => seen.add(entry.key));
      ready = true;
      return [];
    }
    return entries.filter(entry => {
      if (!entry.key || seen.has(entry.key)) return false;
      seen.add(entry.key);
      return true;
    });
  };
}

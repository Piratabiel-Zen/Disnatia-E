export function createSyncState() {
  const sources = new Map(), listeners = new Set();
  let value = { state: 'connecting', pending: 0, error: '', sources: 0 };
  function emit() {
    const entries = [...sources.values()];
    const pending = entries.filter(row => row.pending).length;
    const error = entries.find(row => row.error)?.error || '';
    const state = error ? 'error' : pending ? 'saving' : entries.some(row => row.cache) ? 'cache' : entries.length ? 'live' : 'connecting';
    if (value.state === state && value.pending === pending && value.error === error && value.sources === entries.length) return;
    value = { state, pending, error, sources: entries.length };
    listeners.forEach(listener => listener());
  }
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot() { return value; },
    update(key, row) { sources.set(key, row); emit(); },
    remove(key) { sources.delete(key); emit(); },
  };
}
export const syncState = createSyncState();

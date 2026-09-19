// One transport subscription per equivalent query. No global cross-user cache.
export function createSnapshotPool(subscribe, equals) {
  const entries = new Set();
  return function listen(ref, ...args) {
    const options = typeof args[0] === 'object' && !('next' in args[0]) ? args.shift() : {};
    const observer = typeof args[0] === 'function' ? { next: args[0], error: args[1] } : args[0];
    if (!observer?.next) throw new TypeError('Snapshot callback is required');
    const metadata = !!options.includeMetadataChanges;
    let entry = [...entries].find(e => e.metadata === metadata && equals(e.ref, ref));
    const fresh = !entry;
    if (fresh) {
      entry = { ref, metadata, consumers: new Set(), hasValue: false, value: null, error: null, stop: null };
      entries.add(entry);
    }
    const consumer = { next: observer.next, error: observer.error };
    entry.consumers.add(consumer);
    if (fresh) {
      try {
        entry.stop = subscribe(ref, options, value => {
          entry.value = value;
          entry.hasValue = true;
          for (const sub of [...entry.consumers]) sub.next(value);
        }, error => {
          entry.error = error;
          entries.delete(entry); // A later subscriber may retry a terminated listener.
          for (const sub of [...entry.consumers]) sub.error?.(error);
        });
      } catch (error) {
        entries.delete(entry);
        throw error;
      }
    } else if (entry.hasValue) {
      const cached = entry.value;
      queueMicrotask(() => {
        if (entry.consumers.has(consumer) && entry.value === cached) consumer.next(cached);
      });
    }
    return () => {
      entry.consumers.delete(consumer);
      // React StrictMode's immediate remount can reuse the existing transport.
      queueMicrotask(() => {
        if (entry.consumers.size) return;
        entry.stop?.();
        entry.stop = null;
        entries.delete(entry);
      });
    };
  };
}

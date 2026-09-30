// Token images and mutable fields are stored independently, never in one map-sized blob.
export const tokenRecordId = (mapId, tokenId) => `token_v2:${encodeURIComponent(String(mapId))}:${encodeURIComponent(String(tokenId))}`;

export function tokenChanges(previous = [], next = []) {
  const before = new Map(previous.map(token => [String(token.id), token]));
  return next.flatMap(token => {
    const old = before.get(String(token.id));
    const patch = { id: token.id };
    for (const [field, value] of Object.entries(token)) {
      if (value !== undefined && JSON.stringify(value) !== JSON.stringify(old?.[field])) patch[field] = value;
    }
    return !old || Object.keys(patch).length > 1 ? [patch] : [];
  });
}

export function resolveTokenRoster(legacy = [], records = [], pending = []) {
  const tokens = new Map(legacy.map(token => [String(token.id), token]));
  const deleted = new Set();
  for (const record of records) {
    const id = String(record.tokenId);
    if (record.deleted) { deleted.add(id); tokens.delete(id); }
    else tokens.set(id, { ...tokens.get(id), ...record.token, id: record.token?.id ?? id });
  }
  for (const operation of pending) {
    const id = String(operation.tokenId);
    if (operation.deleted) { deleted.add(id); tokens.delete(id); }
    else if (!deleted.has(id)) tokens.set(id, { ...tokens.get(id), ...operation.token });
  }
  for (const id of deleted) tokens.delete(id);
  return [...tokens.values()];
}

export function createTokenOutbox() {
  const entries = new Map();
  const sending = new Map();
  const listeners = new Set();
  let sequence = 0;
  const client = Math.random().toString(36).slice(2);
  const emit = () => listeners.forEach(listener => listener());
  const keyOf = (mapId, tokenId) => tokenRecordId(mapId, tokenId);
  const flush = async key => {
    if (sending.has(key)) return sending.get(key);
    const work = (async () => {
      while (entries.has(key)) {
        const entry = entries.get(key);
        const operation = entry.operation;
        entry.status = 'saving'; emit();
        try {
          await entry.write(key, operation);
          if (entries.get(key)?.operation.mutationId === operation.mutationId) {
            // The Firestore write promise resolves only after server acceptance.
            // A watch can coalesce this version with another player's write;
            // waiting for the exact mutationId would leave the HUD pending forever.
            entries.delete(key); emit();
          }
        } catch (error) {
          const current = entries.get(key);
          if (current) { current.status = 'failed'; current.error = error; }
          emit(); throw error;
        }
      }
    })();
    sending.set(key, work);
    try { await work; } finally {
      sending.delete(key);
      if (entries.get(key)?.status === 'queued') await flush(key);
    }
  };
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    operations(mapId) { return [...entries.values()].filter(entry => entry.operation.mapId === String(mapId)).map(entry => entry.operation); },
    status(mapId) {
      const values = [...entries.values()].filter(entry => entry.operation.mapId === String(mapId));
      return { count: values.length, failed: values.some(entry => entry.status === 'failed') };
    },
    acknowledge(record) {
      const key = keyOf(record.mapId, record.tokenId);
      if (entries.get(key)?.operation.mutationId === record.mutationId) { entries.delete(key); emit(); }
    },
    async enqueue(mapId, tokenId, token, deleted, write) {
      const key = keyOf(mapId, tokenId);
      const prior = entries.get(key)?.operation;
      const operation = { recordType: 'token-v2', mapId: String(mapId), tokenId: String(tokenId),
        token: { ...prior?.token, ...token }, mutationId: `${client}_${++sequence}`,
        ...(deleted || prior?.deleted ? { deleted: true } : {}), updatedAt: Date.now() };
      entries.set(key, { operation, status: 'queued', write }); emit();
      await flush(key);
    },
    async retry(mapId) {
      const work = [];
      for (const [key, entry] of entries) {
        if (entry.operation.mapId !== String(mapId) || entry.status !== 'failed') continue;
        entry.status = 'queued'; work.push(flush(key));
      }
      await Promise.all(work);
    },
  };
}

// Survives route changes in the same browser session while Firestore reconnects.
export const tokenOutbox = createTokenOutbox();

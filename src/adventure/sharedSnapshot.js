import { onSnapshot as subscribe, queryEqual, refEqual } from 'firebase/firestore';
import { createSnapshotPool } from './snapshotPool';
import { syncState } from './syncState.mjs';

function trackedSubscribe(ref, options, next, error) {
  const key = Symbol(ref.path || 'query');
  const name = ref.path || ref._query?.path?.canonicalString?.() || '';
  const tracked = /^(config|sheets|combat_summons|battlemap_tokens|battlemap_live_positions)(\/|$)/.test(name);
  const stop = subscribe(ref, { ...options, includeMetadataChanges: true }, snap => {
    if (tracked) syncState.update(key, { cache: !!snap.metadata.fromCache, pending: !!snap.metadata.hasPendingWrites });
    next(snap);
  }, issue => {
    if (tracked) syncState.update(key, { error: issue.code || 'Conexão indisponível' });
    error(issue);
  });
  return () => { stop(); syncState.remove(key); };
}
export const onSnapshot = createSnapshotPool(trackedSubscribe, (a, b) => {
  if (a.type === 'document' || b.type === 'document') return a.type === b.type && refEqual(a, b);
  return queryEqual(a, b);
});

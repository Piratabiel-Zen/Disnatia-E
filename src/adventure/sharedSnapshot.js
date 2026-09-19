import { onSnapshot as subscribe, queryEqual, refEqual } from 'firebase/firestore';
import { createSnapshotPool } from './snapshotPool';

export const onSnapshot = createSnapshotPool(subscribe, (a, b) => {
  if (a.type === 'document' || b.type === 'document') return a.type === b.type && refEqual(a, b);
  return queryEqual(a, b);
});

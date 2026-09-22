export function createLiveSnapshotGate() {
  let authoritative = false;

  return {
    shouldDeliver(metadata = {}) {
      if (metadata.fromCache) {
        authoritative = false;
        return false;
      }
      if (!authoritative) {
        authoritative = true;
        return false;
      }
      return true;
    },
    isAuthoritative() {
      return authoritative;
    },
  };
}

export function isNewLiveDocument(change) {
  return change?.type === 'added';
}

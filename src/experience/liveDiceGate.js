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

export const LIVE_DICE_MAX_AGE_MS = 20000;
export const LIVE_DICE_JOIN_GRACE_MS = 2500;

export function isLiveDicePayload(payload, {
  joinedAt = Date.now(),
  now = Date.now(),
  maxAge = LIVE_DICE_MAX_AGE_MS,
  joinGrace = LIVE_DICE_JOIN_GRACE_MS,
} = {}) {
  const timestamp = Number(payload?.ts || 0);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return false;

  // A barreira do snapshot impede o bootstrap normal. Esta janela temporal e
  // uma segunda defesa para cache persistente, retomada de aba e reconexoes:
  // um evento antigo jamais pode entrar na fila visual do usuario.
  return timestamp >= Number(joinedAt) - joinGrace
    && timestamp >= Number(now) - maxAge
    && timestamp <= Number(now) + maxAge;
}

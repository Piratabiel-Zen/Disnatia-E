// Canal vivo da mesa: Firebase Realtime Database para o que é efêmero
// (posição de token durante o arraste, pings, presença). O Firestore continua
// sendo a memória: posição final, fichas, mapas. Este módulo carrega o SDK do
// Realtime Database sob demanda e cai no caminho antigo (Firestore) quando o
// banco não responde, para que a mesa nunca fique sem movimento.
const DEFAULT_URL = 'https://dinastia-e-a4b28-default-rtdb.firebaseio.com';
export const LIVE_DB_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RTDB_URL) || DEFAULT_URL;
const CONNECT_TIMEOUT_MS = 4000;

// Carregador padrão: SDK do Realtime Database + app Firebase já inicializado.
const defaultLoader = async () => {
  const [sdk, core] = await Promise.all([import('firebase/database'), import('./firebase.js')]);
  return { ...sdk, app: core.firebaseApp };
};
let sdkLoader = defaultLoader;
let sdkPromise = null;
let database = null;
let connected = false;
let connectionKnown = false;
const connectionListeners = new Set();

function notify() {
  for (const listener of [...connectionListeners]) listener(connected);
}

async function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = Promise.resolve().then(sdkLoader).then(sdk => {
      database = sdk.getDatabase(sdk.app, LIVE_DB_URL);
      sdk.onValue(sdk.ref(database, '.info/connected'), snap => {
        connected = snap.val() === true;
        connectionKnown = true;
        notify();
      });
      return sdk;
    }).catch(error => {
      console.warn('Canal vivo indisponível; usando o Firestore para movimento.', error);
      connected = false;
      connectionKnown = true;
      notify();
      return null;
    });
  }
  return sdkPromise;
}

/** Resolve `true` quando o Realtime Database conecta; `false` se não responder a tempo. */
export function liveChannelReady(timeout = CONNECT_TIMEOUT_MS) {
  return new Promise(resolve => {
    let done = false;
    const finish = value => { if (done) return; done = true; connectionListeners.delete(listener); clearTimeout(timer); resolve(value); };
    const listener = value => { if (value) finish(true); };
    const timer = setTimeout(() => finish(connected), timeout);
    connectionListeners.add(listener);
    loadSdk().then(sdk => { if (!sdk) finish(false); else if (connected) finish(true); });
  });
}

export const liveChannelConnected = () => connected;
export const liveChannelKnown = () => connectionKnown;

export function onLiveConnection(listener) {
  connectionListeners.add(listener);
  loadSdk();
  if (connectionKnown) listener(connected);
  return () => connectionListeners.delete(listener);
}

const mapPath = mapId => `live/maps/${encodeURIComponent(String(mapId))}`;
const tokenPath = (mapId, tokenId) => `${mapPath(mapId)}/tokens/${encodeURIComponent(String(tokenId))}`;

/** Posição ao vivo de um token (durante o arraste). Resolve `false` se o canal não está disponível. */
export async function publishTokenMotion(mapId, tokenId, payload) {
  const sdk = await loadSdk();
  if (!sdk || !connected) return false;
  await sdk.set(sdk.ref(database, tokenPath(mapId, tokenId)), { ...payload, updatedAt: sdk.serverTimestamp() });
  return true;
}

export async function clearTokenMotion(mapId, tokenId) {
  const sdk = await loadSdk();
  if (!sdk || !connected) return false;
  await sdk.remove(sdk.ref(database, tokenPath(mapId, tokenId)));
  return true;
}

/**
 * Observa posições ao vivo do mapa. O primeiro valor (estado já gravado) é
 * ignorado: a posição canônica vem do Firestore. Só mudanças posteriores
 * chegam ao callback, uma por token: cb(tokenId, data).
 */
export function subscribeTokenMotion(mapId, cb) {
  let stop = null;
  let cancelled = false;
  loadSdk().then(sdk => {
    if (!sdk || cancelled) return;
    const seen = new Map();
    let primed = false;
    stop = sdk.onValue(sdk.ref(database, `${mapPath(mapId)}/tokens`), snap => {
      const value = snap.val() || {};
      for (const [tokenId, data] of Object.entries(value)) {
        const stamp = `${data?.clientId || ''}:${data?.seq || 0}:${data?.updatedAt || 0}`;
        if (seen.get(tokenId) === stamp) continue;
        seen.set(tokenId, stamp);
        if (primed) cb(decodeURIComponent(tokenId), data || {});
      }
      primed = true;
    }, error => console.warn('Canal vivo de tokens indisponível:', error));
  });
  return () => { cancelled = true; if (stop) stop(); };
}

export async function publishPing(ping) {
  const sdk = await loadSdk();
  if (!sdk || !connected) return false;
  await sdk.set(sdk.ref(database, 'live/ping'), { ...ping, publishedAt: sdk.serverTimestamp() });
  return true;
}

/** Último ping da mesa (o payload carrega o mapId); o valor já existente ao assinar é ignorado. cb(ping). */
export function subscribePing(cb) {
  let stop = null;
  let cancelled = false;
  loadSdk().then(sdk => {
    if (!sdk || cancelled) return;
    let primed = false;
    stop = sdk.onValue(sdk.ref(database, 'live/ping'), snap => {
      const value = snap.val();
      if (primed && value) cb(value);
      primed = true;
    }, error => console.warn('Canal vivo de pings indisponível:', error));
  });
  return () => { cancelled = true; if (stop) stop(); };
}

/** Somente para testes: troca o carregador do SDK e zera o estado do módulo. */
export function __resetLiveChannelForTests(loader) {
  sdkLoader = loader || defaultLoader;
  sdkPromise = null;
  database = null;
  connected = false;
  connectionKnown = false;
  connectionListeners.clear();
}

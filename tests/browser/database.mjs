// Dublagem isolada do canal ao vivo. Nunca abre conexão com o Firebase.
//
// O `liveChannel.js` importa o `firebase/database` por import dinâmico, e isso
// escapava do desvio da bancada: a tela de teste abria um WebSocket contra o
// banco DE PRODUÇÃO. Aqui falhava no proxy e passava batido; numa máquina com
// rede aberta, falaria com a mesa de verdade. A bancada não toca em dado real.
//
// O canal vive em memória, só nesta aba, e entrega para quem está ouvindo.

const valores = new Map();
const ouvintes = new Map();

const caminho = r => (typeof r === 'string' ? r : r?.caminho || '');

const avisar = chave => {
  for (const fn of ouvintes.get(chave) || []) {
    fn({ val: () => (chave in Object.fromEntries(valores) ? valores.get(chave) : null), key: chave.split('/').pop() });
  }
};

export const app = {};
export const getDatabase = () => ({});
export const ref = (_db, caminhoDoNo = '') => ({ caminho: String(caminhoDoNo) });
export const serverTimestamp = () => Date.now();

export const set = async (r, valor) => {
  const chave = caminho(r);
  valores.set(chave, valor);
  avisar(chave);
};

export const remove = async r => {
  const chave = caminho(r);
  valores.delete(chave);
  avisar(chave);
};

export function onValue(r, callback) {
  const chave = caminho(r);
  if (!ouvintes.has(chave)) ouvintes.set(chave, new Set());
  ouvintes.get(chave).add(callback);
  queueMicrotask(() => callback({ val: () => (valores.has(chave) ? valores.get(chave) : null), key: chave.split('/').pop() }));
  return () => ouvintes.get(chave)?.delete(callback);
}

export const onDisconnect = () => ({ remove: async () => {}, set: async () => {} });
export const goOffline = () => {};
export const goOnline = () => {};

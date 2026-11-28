// Dublagem isolada do login. Nunca fala com o Firebase nem com conta real.
//
// O `core/auth.js` de verdade continua sendo usado nos testes — o que esta
// dublagem troca é só a camada de baixo, o `firebase/auth`. Sem ela,
// `getAuth(appFalso)` estourava em `getProvider` e a página nascia em branco:
// o teste passava a acusar a interface quando o defeito era a dublagem.
//
// A conta de teste é fixa e local. Quem precisar de outro uid escreve
// `window.__fixtureConta = { uid, email, displayName }` antes de abrir a tela.

const CONTA_PADRAO = { uid: 'fix-mestre', email: 'mestre@teste.local', displayName: 'Mestre de teste' };
const ouvintes = new Set();

const conta = () => (typeof window === 'undefined' ? CONTA_PADRAO : (window.__fixtureConta || CONTA_PADRAO));

const usuario = () => {
  const base = conta();
  return { ...base, getIdToken: async () => 'token-de-teste', providerData: [] };
};

export const getAuth = () => ({
  get currentUser() { return usuario(); },
  signOut: async () => {},
});

export function onAuthStateChanged(_auth, callback) {
  ouvintes.add(callback);
  queueMicrotask(() => callback(usuario()));
  return () => ouvintes.delete(callback);
}

const entrada = async () => ({ user: usuario() });

export const signInWithEmailAndPassword = entrada;
export const createUserWithEmailAndPassword = entrada;
export const signInWithPopup = entrada;
export const signInWithRedirect = async () => {};
export const getRedirectResult = async () => null;
export const signOut = async () => { for (const ouvinte of ouvintes) ouvinte(null); };
export const updateProfile = async () => {};

export class GoogleAuthProvider {
  setCustomParameters() { return this; }
  addScope() { return this; }
}
GoogleAuthProvider.credentialFromResult = () => null;

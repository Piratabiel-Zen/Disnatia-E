// CONTA E ENTRADA NA MESA
//
// Duas coisas diferentes que as pessoas confundem:
//
//   • A CONTA é da pessoa: e-mail e senha dela, vale para o site inteiro. É o
//     que dá identidade — sem isso não existe "liberar este documento para a
//     Ana", porque o site não saberia quem é a Ana.
//   • A SENHA DA MESA é da campanha: uma só, combinada entre a mesa, usada
//     uma vez para entrar. Depois disso a pessoa já é membro e não precisa
//     mais dela.
//
// É por isso que as duas coexistem: o jogador pediu login próprio e senha
// única, e cada uma resolve um problema que a outra não resolve.
//
// A conferência da senha acontece no servidor, nas regras: o cliente manda o
// hash e o Firestore compara com o que está guardado num documento que ninguém
// consegue ler. Ver firestore.rules.

import {
  createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword,
  signOut as firebaseSignOut, getAuth, updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firebaseApp, db } from './firebase';
import { normalizarPapel } from './acesso.mjs';

export const auth = getAuth(firebaseApp);

/** Hash da senha da mesa. O mesmo que CampaignPasswordButton já usava. */
export async function hashDaSenha(texto) {
  const dados = new TextEncoder().encode(String(texto || ''));
  const digest = await crypto.subtle.digest('SHA-256', dados);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ─────────────────────────── conta ─────────────────────────── */

export async function criarConta({ email, senha, nome }) {
  const credencial = await createUserWithEmailAndPassword(auth, String(email).trim(), senha);
  const apelido = String(nome || '').trim();
  if (apelido) await updateProfile(credencial.user, { displayName: apelido });
  await setDoc(doc(db, 'users', credencial.user.uid), {
    nome: apelido, email: String(email).trim().toLowerCase(), criadoEm: serverTimestamp(),
  }, { merge: true });
  return credencial.user;
}

export const entrar = (email, senha) =>
  signInWithEmailAndPassword(auth, String(email).trim(), senha).then(c => c.user);

export const sair = () => firebaseSignOut(auth);

export const aoMudarConta = callback => onAuthStateChanged(auth, callback);

/* ─────────────────────────── mesa ─────────────────────────── */

const membroRef = (campanhaId, uid) => doc(db, 'campaigns', String(campanhaId), 'membros', String(uid));
const acessoRef = campanhaId => doc(db, 'campaigns', String(campanhaId), 'privado', 'acesso');

/**
 * Define a senha da mesa. Só o Mestre consegue, pelas regras.
 *
 * Fica num subdocumento que nenhum cliente lê. As regras ainda o consultam por
 * get(), que roda no servidor — é essa assimetria que permite conferir uma
 * senha sem servidor próprio e sem expô-la.
 */
export async function definirSenhaDaMesa(campanhaId, senha) {
  await setDoc(acessoRef(campanhaId), {
    senhaHash: await hashDaSenha(senha),
    atualizadoEm: serverTimestamp(),
  });
}

/**
 * Entra numa mesa com a senha dela.
 *
 * O servidor recusa se o hash não bater, então uma senha errada não cria
 * membro nenhum — a mensagem de erro aqui é só tradução da recusa.
 */
export async function entrarNaMesa({ campanhaId, senha, papel = 'jogador', nome }) {
  const usuario = auth.currentUser;
  if (!usuario) throw new Error('Entre na sua conta antes de entrar na mesa.');
  try {
    await setDoc(membroRef(campanhaId, usuario.uid), {
      uid: usuario.uid,
      nome: String(nome || usuario.displayName || '').trim(),
      papel: normalizarPapel(papel),
      senhaHash: await hashDaSenha(senha),
      entrouEm: serverTimestamp(),
    });
  } catch (erro) {
    if (erro?.code === 'permission-denied') {
      const e = new Error('Senha da mesa incorreta.');
      e.code = 'senha-incorreta';
      throw e;
    }
    throw erro;
  }
  return lerMembro(campanhaId, usuario.uid);
}

/** O registro de membro desta pessoa nesta mesa, ou null se não for membro. */
export async function lerMembro(campanhaId, uid = auth.currentUser?.uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(membroRef(campanhaId, uid));
    if (!snap.exists()) return null;
    const dados = snap.data();
    return { ...dados, uid, papel: normalizarPapel(dados.papel) };
  } catch (erro) {
    // Negado é a resposta correta para quem não é da mesa: não é membro.
    if (erro?.code === 'permission-denied') return null;
    throw erro;
  }
}

/** Mensagens do Firebase traduzidas para o que a pessoa precisa fazer. */
export function mensagemDeErro(erro) {
  switch (erro?.code) {
    case 'auth/invalid-email': return 'Esse e-mail não parece válido.';
    case 'auth/email-already-in-use': return 'Já existe uma conta com esse e-mail. Tente entrar.';
    case 'auth/weak-password': return 'A senha precisa de pelo menos 6 caracteres.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'E-mail ou senha incorretos.';
    case 'auth/too-many-requests': return 'Muitas tentativas. Espere um momento e tente de novo.';
    case 'auth/network-request-failed': return 'Sem conexão com o servidor.';
    case 'senha-incorreta': return 'Senha da mesa incorreta.';
    case 'permission-denied': return 'Você não tem acesso a isso nesta mesa.';
    default: return erro?.message || 'Não foi possível concluir. Tente de novo.';
  }
}

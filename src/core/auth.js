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
  GoogleAuthProvider, createUserWithEmailAndPassword, getRedirectResult,
  onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup,
  signInWithRedirect, signOut as firebaseSignOut, getAuth, updateProfile,
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

/**
 * Entrar com a conta Google.
 *
 * Para a mesa é o caminho mais curto: ninguém inventa nem esquece senha. O
 * registro em `users` é gravado igual ao do e-mail, para o resto do site não
 * precisar saber por onde a pessoa entrou.
 */
async function registrarUsuario(usuario) {
  await setDoc(doc(db, 'users', usuario.uid), {
    nome: usuario.displayName || '',
    email: (usuario.email || '').toLowerCase(),
    criadoEm: serverTimestamp(),
  }, { merge: true });
  return usuario;
}

export async function entrarComGoogle() {
  const provedor = new GoogleAuthProvider();
  // Pedir a conta toda vez evita o caso chato de ficar preso numa conta
  // Google antiga que a pessoa nem lembra que estava logada.
  provedor.setCustomParameters({ prompt: 'select_account' });
  try {
    const credencial = await signInWithPopup(auth, provedor);
    return registrarUsuario(credencial.user);
  } catch (erro) {
    // O popup falha por motivos que não são culpa da conta: bloqueador,
    // navegador que barra janela de terceiros, celular. Nesses casos o
    // redirecionamento funciona, e é o mesmo login.
    const caiParaRedirecionamento = [
      'auth/popup-blocked',
      'auth/cancelled-popup-request',
      'auth/operation-not-supported-in-this-environment',
      'auth/web-storage-unsupported',
    ].includes(erro?.code);
    if (caiParaRedirecionamento) {
      await signInWithRedirect(auth, provedor);
      return null;
    }
    throw erro;
  }
}

/**
 * Conclui um login que saiu por redirecionamento.
 *
 * Chamado uma vez quando o site abre: se a pessoa voltou do Google, é aqui que
 * o registro dela é gravado.
 */
export async function concluirLoginPorRedirecionamento() {
  try {
    const resultado = await getRedirectResult(auth);
    if (resultado?.user) return registrarUsuario(resultado.user);
  } catch (_) { /* não havia redirecionamento pendente */ }
  return null;
}

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

/**
 * Assume a mesa como Admin.
 *
 * Usado por quem acabou de criar a campanha, e por quem está resgatando uma
 * mesa órfã — feita antes de existir o campo de dono, e que por isso não tem
 * Admin nenhum e não poderia nem ser apagada.
 *
 * Não manda senha: as regras deixam passar pelo campo `criadoPor` ou pela
 * ausência dele. Uma senha ainda nem existe neste momento.
 */
export async function assumirMesa(campanhaId, nome = '') {
  const usuario = auth.currentUser;
  if (!usuario) throw new Error('Entre na sua conta antes.');
  await setDoc(membroRef(campanhaId, usuario.uid), {
    uid: usuario.uid,
    nome: String(nome || usuario.displayName || '').trim(),
    papel: 'mestre',
    entrouEm: serverTimestamp(),
  });
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
    case 'auth/popup-closed-by-user': return 'A janela do Google foi fechada antes de concluir.';
    case 'auth/popup-blocked': return 'O navegador bloqueou a janela do Google. Libere e tente de novo.';
    // Este é o erro que aparece quando o site está num domínio que o Firebase
    // não conhece — o caso mais comum, e o único que o jogador não resolve
    // sozinho. A mensagem diz exatamente onde arrumar.
    case 'auth/unauthorized-domain':
      return 'Este endereço do site ainda não foi liberado no Firebase. '
        + 'No Console → Authentication → Settings → Authorized domains, adicione o domínio desta página.';
    case 'auth/operation-not-allowed':
      return 'O login com Google não está ativado no Firebase para este projeto.';
    case 'auth/internal-error':
      return 'O Google recusou o login. Em geral é o domínio do site não estar liberado no Firebase '
        + '(Authentication → Settings → Authorized domains).';
    case 'auth/account-exists-with-different-credential':
      return 'Já existe uma conta com esse e-mail, criada por outro caminho de login.';
    case 'senha-incorreta': return 'Senha da mesa incorreta.';
    case 'permission-denied': return 'Você não tem acesso a isso nesta mesa.';
    default: return erro?.message || 'Não foi possível concluir. Tente de novo.';
  }
}

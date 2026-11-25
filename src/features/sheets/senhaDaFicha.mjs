/**
 * A SENHA DA FICHA
 *
 * O Mestre define uma senha por ficha; quem souber a senha abre aquela
 * ficha e joga com ela.
 *
 * ──────────────────────────────────────────────────────────────────────
 * O QUE ESTAVA ERRADO E ESTE ARQUIVO CONSERTA
 *
 * A senha já existia, num campo `senha` do próprio documento da ficha, EM
 * TEXTO PURO. E as regras do Firestore deixam qualquer membro da mesa ler
 * qualquer ficha da mesa — é assim que o mural, o mapa e a sessão
 * funcionam. Ou seja: a senha de cada primo estava escrita, legível, num
 * documento que todos os outros primos recebiam.
 *
 * Isso é pior do que parece, porque senha de mesa de RPG é senha que as
 * pessoas reaproveitam. O conserto não é esconder o campo na tela: é não
 * guardar mais o texto. Agora vai o resumo (SHA-256) com um sal próprio de
 * cada ficha, e o texto é descartado no instante em que o Mestre o digita.
 *
 * O sal existe porque senha de mesa é curta — "porao", "1234", o nome do
 * gato. Sem sal, um resumo desses se acha numa lista pronta em segundos;
 * com um sal diferente por ficha, nenhuma lista pronta serve.
 *
 * ──────────────────────────────────────────────────────────────────────
 * O LIMITE, QUE PRECISA ESTAR ESCRITO
 *
 * A conferência continua sendo DE TELA. As regras do servidor não sabem
 * desta senha: elas deixam todo membro escrever em toda ficha da mesa. Um
 * primo com o console aberto ainda consegue abrir uma ficha que não é
 * dele — o que ele não consegue mais é LER a senha e sair usando.
 *
 * Fechar isso de verdade pede uma regra no Firestore, nos moldes da senha
 * da mesa (resumo num documento privado, conferido no servidor). O
 * caminho está descrito no fim de `firestore.rules`.
 */

export const VERSAO_COM_SAL = 2;

const hex = bytes => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');

function sorteioDeSal() {
  const bytes = new Uint8Array(12);
  // `crypto.getRandomValues` existe em todo navegador que roda este site; o
  // `Math.random` abaixo é só para o Node dos testes, e um sal previsível
  // ainda é melhor que sal nenhum.
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return hex(bytes);
}

async function resumo(texto) {
  const dados = new TextEncoder().encode(String(texto));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', dados);
  return hex(new Uint8Array(digest));
}

/** O resumo de uma senha com o sal de uma ficha. */
export const resumoComSal = (texto, sal) => resumo(`${String(sal || '')}:${String(texto || '')}`);

/** Esta ficha pede senha para abrir? */
export const temSenha = ficha =>
  Boolean(String(ficha?.senhaHash || '').trim() || String(ficha?.senha || '').trim());

/**
 * Os campos a gravar para definir (ou tirar) a senha de uma ficha.
 *
 * Devolve `senha: ''` sempre, de propósito: definir uma senha nova é
 * também a hora de apagar o texto puro que ficou lá da versão antiga. Sem
 * isso a mesa carregaria a senha velha, legível, para sempre.
 */
export async function camposDaSenha(texto) {
  const limpo = String(texto || '').trim();
  if (!limpo) return { senha: '', senhaHash: '', senhaSal: '', senhaVersao: 0 };
  const sal = sorteioDeSal();
  return {
    senha: '',
    senhaHash: await resumoComSal(limpo, sal),
    senhaSal: sal,
    senhaVersao: VERSAO_COM_SAL,
  };
}

/**
 * A senha digitada abre esta ficha?
 *
 * Aceita os dois formatos. Ficha de mesa antiga ainda tem o texto puro, e
 * recusá-la trancaria jogadores para fora sem aviso no meio de uma sessão
 * — a migração acontece quando o Mestre redefinir a senha, e não às custas
 * de quem só queria entrar.
 */
export async function conferirSenha(ficha, texto) {
  const tentativa = String(texto || '').trim();
  const guardado = String(ficha?.senhaHash || '').trim();

  if (guardado) {
    if (!tentativa) return false;
    return await resumoComSal(tentativa, ficha?.senhaSal || '') === guardado;
  }

  const antiga = String(ficha?.senha || '').trim();
  if (!antiga) return true;      // ficha sem senha abre para quem clicar
  return tentativa === antiga;
}

/** Como a senha desta ficha está guardada, para o Mestre ver de relance. */
export function estadoDaSenha(ficha) {
  if (String(ficha?.senhaHash || '').trim()) return 'protegida';
  if (String(ficha?.senha || '').trim()) return 'antiga';
  return 'aberta';
}

export const RECADOS_DO_ESTADO = Object.freeze({
  aberta: 'Sem senha: abre para quem clicar.',
  protegida: 'Com senha.',
  // O aviso precisa dizer o que fazer, e não só que está ruim.
  antiga: 'Senha antiga, guardada em texto puro e visível para a mesa. '
    + 'Defina-a de novo aqui para trocá-la por uma guardada em resumo.',
});

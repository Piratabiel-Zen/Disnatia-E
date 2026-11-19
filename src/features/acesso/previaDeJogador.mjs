/**
 * VER A MESA PELOS OLHOS DE UM EXORCISTA
 *
 * O Admin não consegue testar o que o jogador vê, e o motivo é estrutural:
 * quem é Mestre no servidor é Mestre em toda tela, sempre. Entrar pela porta
 * como "jogador" muda só a etiqueta local — o papel gravado continua mestre,
 * e as telas leem o papel gravado, não a etiqueta. Então quem criou a mesa
 * abre a ficha de todo mundo e vê o arquivo inteiro, por mais que tenha
 * entrado escolhendo a própria ficha.
 *
 * Isto resolve: enquanto a prévia está ligada, as telas passam a receber um
 * registro de jogador no lugar do de Mestre — o do dono da ficha escolhida.
 * O Admin vê exatamente o que aquela pessoa vê, e sai quando quiser.
 *
 * O QUE ISTO NÃO É. Não é segurança, é ensaio. O navegador do Admin continua
 * recebendo os dados da mesa, porque para o servidor ele continua Mestre —
 * a prévia esconde, não impede. Quem impede é firestore.rules, e é por isso
 * que a prévia serve para conferir a REGRA (o documento certo chegou a quem
 * devia?) e não para medir o segredo.
 *
 * Mora fora do React, como as preferências, porque a barra de prévia e as
 * páginas precisam da mesma resposta sem uma passar prop para a outra.
 */
const EVENTO = 'dinastia:previa-de-jogador';

let previaAtual = null;

/** { fichaId, nome, uid } da ficha em prévia, ou null. */
export const previaDeJogador = () => previaAtual;

export function verComoJogador(ficha) {
  if (!ficha) { previaAtual = null; }
  else {
    previaAtual = {
      fichaId: String(ficha.id || ''),
      nome: String(ficha.nome || 'exorcista sem nome'),
      // Sem dono amarrado, a prévia usa um uid que não é de ninguém: é o
      // caso real de uma ficha que o Admin preparou e ainda não entregou,
      // e o certo é ver o que ela mostraria — quase nada.
      uid: String(ficha.dono || `previa:${ficha.id}`),
    };
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: previaAtual }));
  }
  return previaAtual;
}

export const sairDaPrevia = () => verComoJogador(null);

export function aoMudarPrevia(ouvinte) {
  if (typeof window === 'undefined') return () => {};
  const repassar = evento => ouvinte(evento.detail ?? null);
  window.addEventListener(EVENTO, repassar);
  return () => window.removeEventListener(EVENTO, repassar);
}

/**
 * O registro que as telas devem usar.
 *
 * Só o Mestre pode entrar em prévia — para um jogador isto não teria efeito
 * nenhum além de confundir, e deixar a porta aberta seria convidar alguém a
 * tentar virar outra pessoa por aqui.
 */
export function membroEfetivo(membroReal, previa) {
  if (!membroReal || membroReal.papel !== 'mestre' || !previa) return membroReal;
  return { uid: previa.uid, nome: previa.nome, papel: 'jogador', emPrevia: true };
}

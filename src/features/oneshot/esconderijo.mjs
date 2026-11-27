/**
 * O ESCONDERIJO
 *
 * A regra do Ao Oni é de uma linha só: entrar no armário encerra a
 * perseguição — mas se a coisa estiver no mesmo cômodo e te vir entrando,
 * ela te mata assim mesmo.
 *
 * Numa mesa não dá para usar a posição da coisa, porque o vulto aqui é
 * momentâneo: aparece e some, e na maior parte do tempo não está em lugar
 * nenhum. Então o risco vem de onde ele realmente está na ficção — DE QUÃO
 * PERTO ELA ESTÁ, e isso o relógio da caçada já diz.
 *
 * Esconder no começo da caçada é seguro: ela ainda vem longe, ninguém vê
 * você entrar. Esconder nos últimos segundos é quase suicídio: ela está em
 * cima, e a porta do armário fechando é a última coisa que ela precisava
 * ver.
 *
 * É por isso que o relógio de Nira Oni fica à vista. Sem ele, esconder é
 * sorte. Com ele, esconder é uma DECISÃO — e a pessoa que esperou demais
 * sabe exatamente por que foi pega.
 */

/** Dez por cento de chance de dar errado mesmo no melhor momento. */
export const RISCO_MINIMO = 0.1;
/** E dez por cento de chance de dar certo mesmo no pior. */
export const ESPERANCA_MINIMA = 0.1;

/** Quanto tempo a pessoa fica no escuro antes de saber o que aconteceu. */
export const SEGUNDOS_DE_ESPERA = 3.4;

/**
 * A chance de passar despercebido, de 0 a 1.
 *
 * Desce com a tensão da caçada, que por sua vez já cresce ao quadrado — ou
 * seja, a janela boa para se esconder fecha rápido no fim. Os dois limites
 * existem para que nenhuma das duas pontas seja certeza: certeza tira a
 * decisão, e sem decisão isto vira um botão que a pessoa aperta sempre.
 */
/**
 * A chance de achar onde se enfiar a tempo.
 *
 * SORTE ENTRA AQUI, e só aqui. Era o único atributo que não escalava
 * nada: como reforço de duas competências ela ligava um +1 no 3 e o
 * quarto e o quinto ponto não faziam diferença nenhuma.
 *
 * Este é o lugar certo para ela porque é o único do sistema que já era
 * puro acaso — a mesma chance para todo mundo, viesse quem viesse. "O que
 * não se explica, às vezes é tudo o que resta" é literalmente procurar um
 * armário no escuro com uma coisa subindo a escada.
 *
 * E não dá pontos de sorte. O ponto de sorte rerrola QUALQUER teste, então
 * comprá-lo com atributo faria Sorte valer mais que todos os outros
 * juntos, e a mesa inteira despejaria pontos ali. Um por pessoa, para
 * todo mundo, e acabou.
 */
export function chanceDePassar(cacada, sorte = 0) {
  // Ninguém caçando: esconder não tem risco porque não tem de quem.
  if (!cacada?.ativa) return 1;

  /* Cada ponto de Sorte vale 4 pontos percentuais. Parece pouco e não é:
     na tensão alta, onde a chance cai para perto do piso, são eles que
     decidem. E é pouco o bastante para o primo sem Sorte nenhuma ainda
     ter o que tentar — Sorte não pode virar pedágio para se esconder. */
  const ajuda = Math.min(5, Math.max(0, Number(sorte) || 0)) * 0.04;

  /* NO CERCO, ESCONDER É A SAÍDA.
     É a caçada de que não se foge — a de Nira Oni, em que correr não
     resolve e só barricar resolve. Se esconder também falhasse aqui, a
     mesa ficaria sem nenhuma saída, e cena sem saída não é terror: é
     espera. Ainda assim não é garantido, senão o Cerco viraria a caçada
     mais fácil das duas. */
  if (cacada.inescapavel) return Math.min(1 - RISCO_MINIMO, 0.78 + ajuda);

  const tensao = Math.min(1, Math.max(0, Number(cacada.tensao) || 0));
  return Math.min(1 - RISCO_MINIMO, Math.max(ESPERANCA_MINIMA, 1 - tensao + ajuda));
}

/**
 * O que aconteceu, e por quê.
 *
 * `sorteio` entra de fora para o teste poder fixar o resultado — e porque
 * um dia o Mestre vai querer decidir isto na mão, e o dia em que ele
 * quiser a função já está pronta para receber.
 */
export function resolverEsconderijo(cacada, sorteio = Math.random, sorte = 0) {
  const chance = chanceDePassar(cacada, sorte);
  const tirou = Number(sorteio());
  const passou = (Number.isFinite(tirou) ? tirou : 1) < chance;
  return Object.freeze({
    passou,
    chance,
    // O motivo é texto de cena e não diagnóstico: é o que o jogador lê
    // quando as portas abrem, e "falhou no teste" não assusta ninguém.
    motivo: motivoDe(cacada, passou),
  });
}

function motivoDe(cacada, passou) {
  if (!cacada?.ativa) {
    return passou
      ? 'Você fica no escuro. Nada vem.'
      : 'Você fica no escuro. Nada vem.';
  }
  if (cacada.inescapavel) {
    return passou
      ? 'Você escora o que dá contra a porta. Do outro lado, aquilo empurra, '
        + 'desiste, e some pelo corredor.'
      : 'Você escora o que dá contra a porta. Não foi o bastante.';
  }
  return passou
    ? 'Passos. Perto, depois longe. A casa volta a ficar quieta.'
    : 'A porta para de se mexer. Alguma coisa viu você entrar.';
}

/** O registro que vai para a mesa, para o Mestre saber o que aconteceu. */
export function registroDoEsconderijo({ quem, resultado, agora = Date.now() }) {
  const ficha = String(quem || '').trim();
  if (!ficha || !resultado) return null;
  return {
    quem: ficha,
    passou: Boolean(resultado.passou),
    em: Number(agora) || 0,
  };
}

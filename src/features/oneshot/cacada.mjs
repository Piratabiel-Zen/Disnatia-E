/**
 * A CAÇADA
 *
 * Em Ao Oni o Oni entra pela porta, corre atrás de você por volta de vinte
 * segundos e some quando você atravessa a porta seguinte — como se você
 * tivesse escapado. Nira Oni acrescentou a parte que parece errada e é a
 * melhor: um medidor que diz EXATAMENTE quanto tempo ainda falta.
 *
 * Parece que mostrar o tempo estragaria a tensão. Faz o contrário. Pânico
 * sem relógio é só barulho, e o jogador desiste de pensar; com relógio vira
 * "aguento mais oito segundos ou corro agora?", que é uma decisão. Medo que
 * cabe numa decisão é medo que a pessoa leva para casa.
 *
 * Aqui a caçada acaba de três jeitos, e os três são do mundo da ficção e
 * não da interface:
 *   - o tempo fecha (escaparam),
 *   - a mesa troca de mapa (atravessaram a porta),
 *   - o Mestre encerra (pegou alguém, ou a cena mudou de assunto).
 */

export const SEGUNDOS_PADRAO = 20;
export const SEGUNDOS_MINIMO = 5;
export const SEGUNDOS_MAXIMO = 90;

/**
 * Caçadas que não se vencem correndo.
 *
 * Nira Oni tem um oni impossível de superar na corrida: só dá para
 * barricar. O valor disso não é a dificuldade — é QUEBRAR O PADRÃO que o
 * próprio jogo ensinou. Depois de três caçadas em que correr funcionou, a
 * quarta em que não funciona vale por qualquer susto.
 */
export const MODOS = Object.freeze({
  corrida: {
    id: 'corrida',
    nome: 'Corrida',
    dica: 'Acaba sozinha no tempo, ou quando a mesa troca de cômodo.',
    inescapavel: false,
  },
  cerco: {
    id: 'cerco',
    nome: 'Cerco',
    dica: 'Não acaba sozinha. Só barricando, escondendo, ou você encerrando.',
    inescapavel: true,
  },
});

export const modoDaCacada = id => MODOS[String(id)] || MODOS.corrida;

const inteiro = (v, padrao) => (Number.isFinite(Number(v)) ? Number(v) : padrao);
const entre = (v, min, max) => Math.min(max, Math.max(min, v));

/** O documento da caçada, como vai para o banco. */
export function cacadaParaComecar({
  oQue = '', mapa = '', segundos = SEGUNDOS_PADRAO, modo = 'corrida', agora = Date.now(),
} = {}) {
  return {
    ativa: true,
    oQue: String(oQue || '').slice(0, 60),
    mapa: String(mapa || ''),
    modo: MODOS[String(modo)] ? String(modo) : 'corrida',
    segundos: entre(Math.round(inteiro(segundos, SEGUNDOS_PADRAO)), SEGUNDOS_MINIMO, SEGUNDOS_MAXIMO),
    comecouEm: inteiro(agora, Date.now()),
  };
}

/**
 * Onde a caçada está, agora, para quem está olhando este mapa.
 *
 * `restante` é o que vai na tela. `tensao` vai de 0 a 1 e é o que a
 * encenação consome: ela não cresce em linha reta, cresce ao quadrado, para
 * que os últimos segundos pesem muito mais que os primeiros — que é como o
 * tempo passa quando alguém está correndo atrás de você.
 *
 * `desvio` é quanto o relógio DESTE aparelho está adiantado em relação ao
 * de quem soltou a caçada, em milissegundos. Existe porque `comecouEm` é o
 * `Date.now()` do Mestre, e comparar isso com o relógio de outro aparelho
 * era o defeito que tirava o contador da tela da mesa: um celular 25
 * segundos adiantado, numa caçada de 20, calculava que o tempo já tinha
 * acabado e não mostrava NADA — o Mestre com a caçada correndo e os primos
 * sem relógio. Quem lê mede o próprio desvio ao ver a caçada começar
 * (useCacadaDaMesa) e desconta aqui.
 */
export function estadoDaCacada(doc, { agora = Date.now(), mapaAtual = '', desvio = 0 } = {}) {
  const parada = Object.freeze({ ativa: false, restante: 0, fracao: 0, tensao: 0, escapou: false });
  if (!doc?.ativa) return parada;

  const modo = modoDaCacada(doc.modo);

  /* A PORTA. Trocou de cômodo, acabou — mesmo com tempo de sobra. É a regra
     do Ao Oni, e ela é boa porque dá à mesa uma saída que depende de
     decisão e não de sorte: alguém tem de escolher o corredor.
     No Cerco não vale: é justamente a caçada de que não se foge. */
  if (!modo.inescapavel && doc.mapa && mapaAtual && String(doc.mapa) !== String(mapaAtual)) {
    return { ...parada, escapou: true };
  }

  const total = entre(inteiro(doc.segundos, SEGUNDOS_PADRAO), SEGUNDOS_MINIMO, SEGUNDOS_MAXIMO);
  const decorrido = (inteiro(agora, Date.now()) - inteiro(desvio, 0) - inteiro(doc.comecouEm, 0)) / 1000;

  // O Cerco não tem fim próprio: o relógio dele conta PARA CIMA e nunca
  // chega a zero, porque esperar não é mais a saída.
  if (modo.inescapavel) {
    return {
      ativa: true, inescapavel: true,
      restante: Math.max(0, Math.round(decorrido)),
      fracao: 1, tensao: 1, escapou: false,
    };
  }

  const restante = total - decorrido;
  if (restante <= 0) return { ...parada, escapou: true };

  const fracao = entre(restante / total, 0, 1);
  return {
    ativa: true,
    inescapavel: false,
    restante: Math.max(0, Math.ceil(restante)),
    fracao,
    // Ao quadrado: os últimos segundos pesam muito mais que os primeiros.
    tensao: entre((1 - fracao) ** 2, 0, 1),
    escapou: false,
  };
}

/**
 * O intervalo entre duas batidas do coração, em milissegundos.
 *
 * Começa em repouso e termina em pânico. Isto é número e não CSS porque a
 * batida precisa bater junto com o relógio — e relógio e batida em arquivos
 * diferentes dessincronizam na primeira vez que alguém mexe num deles.
 */
export const batidaEmMs = tensao =>
  // `inteiro` antes de `entre` porque `Math.min` com NaN devolve NaN, e NaN
  // aqui vira `--cac-batida: NaNms`, que o navegador descarta inteiro — a
  // batida simplesmente não acontece, sem erro nenhum no console.
  Math.round(980 - entre(inteiro(tensao, 0), 0, 1) * 560);

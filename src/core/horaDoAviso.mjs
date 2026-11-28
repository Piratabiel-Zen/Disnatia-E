/**
 * QUE HORAS COMEÇOU, PARA QUEM ESTÁ VENDO
 *
 * Todo aviso ao vivo — a assombração, o vulto, a caçada — nasce com o
 * `Date.now()` de quem o disparou. Quem recebe media a duração comparando
 * esse carimbo com o PRÓPRIO relógio, e aí está o defeito: são dois
 * relógios diferentes. O do Mestre e o do celular do primo não batem, e
 * não têm obrigação de bater.
 *
 * O estrago não era um número torto, era a coisa não acontecer:
 *
 *  - a assombração só valia se tivesse começado há menos de 1,5s. Um
 *    aparelho 2 segundos adiantado descartava TODO susto. O Mestre via, a
 *    mesa não — e ninguém tinha como desconfiar do relógio;
 *  - o vulto, igual;
 *  - a caçada calculava tempo decorrido com a diferença entre os dois
 *    relógios, então um aparelho atrasado mostrava 90 segundos numa
 *    caçada de 20, e um adiantado concluía que já tinha acabado e não
 *    mostrava relógio nenhum.
 *
 * A correção é parar de comparar relógios. O aviso chega pelo canal ao
 * vivo em milissegundos: a hora da CHEGADA, lida no relógio de quem
 * recebe, é a hora de começo para aquela tela. Dois instantes do mesmo
 * relógio — a única subtração que faz sentido.
 *
 * O carimbo do Mestre continua viajando no aviso: serve para ordenar e
 * para depurar. Só não serve para contar tempo na máquina alheia.
 */

/** Marca o aviso com a hora local de chegada, sem mexer no resto. */
export const carimbarChegada = (aviso, agora = Date.now()) =>
  (aviso && typeof aviso === 'object' ? { ...aviso, recebidoEm: agora } : aviso);

/**
 * Quando este aviso começou, no relógio desta tela.
 *
 * Usa a chegada quando ela existe. O `comecouEm` fica como reserva para
 * avisos antigos, gravados antes deste carimbo existir, e para os testes
 * que montam o aviso na mão.
 */
export function inicioLocalDoAviso(aviso) {
  const chegada = Number(aviso?.recebidoEm);
  if (Number.isFinite(chegada) && chegada > 0) return chegada;
  const origem = Number(aviso?.comecouEm);
  return Number.isFinite(origem) ? origem : 0;
}

// A ATMOSFERA DE UMA MESA ESPECÍFICA
//
// Sistema e atmosfera são coisas separadas, e misturá-las foi engano meu.
//
// O sistema CAIN já entrega tudo sozinho: ficha de exorcista, perícias,
// reserva de d6, mural de investigação, Pecados. Nada disso depende de tema,
// de mundo ou de preset — escolher o sistema basta, e uma mesa de CAIN em
// Hong Kong funciona igualzinho a uma em outro lugar qualquer.
//
// A atmosfera é outra camada: é o clima visual de UMA campanha. A Estrela de
// Absinto se passa na Terra Dourada e tem cara vitoriana sombria; outra mesa
// de CAIN pode ter cara nenhuma em comum com ela.
//
// Por isso a ligação é pelo NOME da mesa, e mora aqui num lugar só, em vez de
// espalhada em ifs pelas telas. Acrescentar outra mesa com clima próprio é
// acrescentar uma linha.

/** Tira acento, caixa e espaço de sobra, para "ESTRELA DE ABSINTO " casar. */
import { sistemaDe } from './sistemas/index.mjs';

const chave = nome => String(nome || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .trim().toLowerCase().replace(/\s+/g, ' ');

/** Mesas que têm clima próprio, pelo nome. */
export const ATMOSFERAS_POR_MESA = Object.freeze({
  'estrela de absinto': 'veneziano',
});

/**
 * O tema que esta mesa deve usar.
 *
 * O nome manda sobre o que foi escolhido no formulário: se a mesa é a Estrela
 * de Absinto, ela tem o clima dela mesmo que alguém tenha deixado o seletor no
 * padrão na hora de criar. Para qualquer outra mesa, vale a escolha feita.
 */
export function temaDaMesa(campanha) {
  const própria = ATMOSFERAS_POR_MESA[chave(campanha?.name)];
  if (própria) return própria;
  // Depois do nome vem o SISTEMA. Alguns sistemas trazem a paleta junto, do
  // mesmo jeito que trazem a marca e os dados: uma mesa de One Shot Terror é
  // preto e cinza porque o sistema é isso, não porque alguém escolheu no
  // formulário. Só a seguir vale a escolha feita na criação.
  const doSistema = sistemaDe(campanha)?.tema;
  return doSistema || campanha?.theme || 'sombrio';
}

/** Esta mesa tem clima próprio, definido pelo nome? */
export const temAtmosferaPropria = campanha =>
  Boolean(ATMOSFERAS_POR_MESA[chave(campanha?.name)]);

/**
 * O CENÁRIO DE FUNDO DE UMA MESA
 *
 * Algumas campanhas têm um lugar, e o lugar merece estar atrás de tudo — não
 * só na capa. A Estrela de Absinto se passa numa praça alagada da Terra
 * Dourada onde nunca para de chover, e essa praça fica de fundo em todas as
 * abas: ficha, mural, documentos, manual.
 *
 * `chuva` liga a animação de gotas. Não é enfeite: naquele mundo está sempre
 * chovendo, e uma imagem parada de uma praça molhada não diz isso.
 *
 * `escurecer` é o quanto de preto entra entre a foto e o conteúdo. Sem isso,
 * o texto fica ilegível em cima de uma imagem de contraste alto — e esta tem
 * céu vermelho vivo com pedra quase preta, que é o pior caso.
 */
export const CENARIOS_POR_MESA = Object.freeze({
  'estrela de absinto': Object.freeze({
    imagem: '/media/mesas/terra-dourada.webp',
    alternativa: '/media/mesas/terra-dourada.jpg',
    descricao: 'Uma praça alagada da Terra Dourada sob céu vermelho, com a chuva que nunca para.',
    chuva: true,
    escurecer: 0.62,
    posicao: 'center 42%',
  }),
});

/**
 * Cenário que vem do SISTEMA, e não do nome da mesa.
 *
 * A Estrela de Absinto tem a praça dela porque é aquela campanha. Uma mesa de
 * One Shot Terror não tem nome fixo — cada noite é uma casa diferente —, mas
 * todas se passam no mesmo tipo de lugar. Então o cenário acompanha o
 * sistema, e qualquer one-shot nasce com a casa e a névoa sem configurar nada.
 */
const CENARIOS_POR_SISTEMA = Object.freeze({
  oneshot: Object.freeze({
    imagem: '/media/mesas/casa-do-horror.webp',
    alternativa: '/media/mesas/casa-do-horror.jpg',
    descricao: 'Um casarão atrás do portão de ferro, sob lua cheia, com o cemitério tomado de névoa.',
    nevoa: true,
    // Mais escuro que a praça veneziana: aqui a imagem é noite, e o texto da
    // mesa precisa se ler por cima dela sem concorrência.
    escurecer: 0.72,
    posicao: 'center 38%',
  }),
});

/** O cenário de fundo desta mesa, ou nada se ela não tiver um. */
export const cenarioDaMesa = campanha =>
  CENARIOS_POR_MESA[chave(campanha?.name)]
  || CENARIOS_POR_SISTEMA[sistemaDe(campanha)?.id]
  || null;

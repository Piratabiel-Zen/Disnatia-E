/**
 * INSPEÇÃO DE OBJETOS
 *
 * A fotografia, a chave, a página do diário. O jogador amplia, gira, vira o
 * objeto do outro lado — e às vezes acha uma coisa que não estava à vista.
 *
 * A REGRA QUE SUSTENTA ISTO: o detalhe escondido só aparece quando a pessoa
 * procura. Não é um segundo texto embaixo da imagem, que todo mundo lê de
 * passagem; é uma coisa que exige aproximar ou virar. Se bastasse abrir, não
 * seria escondido — seria legenda, e legenda não dá susto nenhum.
 *
 * Duas formas de esconder, porque são dois gestos diferentes na mesa:
 *
 *  - PERTO: o detalhe está na própria imagem e aparece passando do limite de
 *    zoom. É o "espera aí, tem alguém na janela do fundo".
 *  - ATRÁS: o objeto tem verso, e o verso é outra coisa. É o bilhete atrás do
 *    retrato, a data no verso da foto, a marca gravada embaixo da chave.
 *
 * O Mestre escreve os dois ao preparar. O que ele não escrever simplesmente
 * não existe: objeto sem detalhe e sem verso ainda amplia e gira, e continua
 * valendo a pena — ampliar uma foto velha já é metade da cena.
 */

/** Quanto dá para aproximar. Além de 4x a imagem de documento vira borrão. */
export const ZOOM_MINIMO = 1;
export const ZOOM_MAXIMO = 4;
export const ZOOM_PASSO = 0.35;

/**
 * A partir de quanto o que está escondido "perto" se revela.
 *
 * 2.2 e não 1.5: tem que ser um zoom que a pessoa só alcança querendo. No
 * primeiro clique de aproximar o detalhe ainda não vem, e é isso que faz a
 * descoberta ser dela e não da interface.
 */
export const ZOOM_QUE_REVELA = 2.2;

export const limitarZoom = valor => {
  const n = Number(valor);
  if (!Number.isFinite(n)) return ZOOM_MINIMO;
  return Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, n));
};

/**
 * O ÂNGULO DO GIRO, e de que lado o objeto está.
 *
 * Virar deixou de ser trocar de imagem e passou a ser um giro de verdade,
 * com espessura. Então o estado não é mais "virado sim ou não": é um
 * ÂNGULO, e o lado que se vê sai dele.
 *
 * Entre 90 e 270 graus é o verso. O limite em 90 e não em 180 porque é aos
 * noventa que a face da frente some de vista — depois disso o que está na
 * tela já é o outro lado, e esperar até 180 deixaria meio giro mostrando a
 * face errada.
 */
export const estaNoVerso = graus => {
  const a = ((Number(graus) || 0) % 360 + 360) % 360;
  return a > 90 && a < 270;
};

/** O quanto o objeto mostra de superfície, de 0 (perfil) a 1 (de frente). */
export const faceAoSol = graus => Math.abs(Math.cos((Number(graus) || 0) * Math.PI / 180));

/** Giro em passos de 90°, sempre entre 0 e 270. */
export const girar = (graus, passo = 90) => {
  const n = Number(graus);
  const base = Number.isFinite(n) ? n : 0;
  return ((base + passo) % 360 + 360) % 360;
};

/**
 * O que o objeto tem para ser achado.
 *
 * Separado do componente de propósito: é isto que o Mestre preenche e é isto
 * que o teste cobra. A tela só desenha.
 */
export const objetoInspecionavel = (fonte = {}) => ({
  titulo: String(fonte.titulo || ''),
  imagem: String(fonte.imagem || ''),
  descricao: String(fonte.descricao || ''),
  // O que aparece ao aproximar além do limite.
  detalheDePerto: String(fonte.detalheDePerto || ''),
  // O outro lado. Pode ser imagem, texto, ou os dois.
  versoImagem: String(fonte.versoImagem || ''),
  versoTexto: String(fonte.versoTexto || ''),
  // Objetos desenhados (os itens da casa) trazem uma forma em vez de imagem:
  // é ela que diz qual desenho usar, e é ela que liga o palco de três
  // dimensões, porque só desenho tem frente e verso vetoriais para girar.
  forma: String(fonte.forma || ''),
  selo: String(fonte.selo || ''),
});

/** Desenhado em vetor, e não uma foto: ganha espessura e giro. */
export const ehDesenhado = objeto => Boolean(objeto?.forma);

/** O objeto esconde alguma coisa? Decide se a tela oferece virar e avisar. */
export const temVerso = objeto =>
  Boolean(objeto?.versoImagem || objeto?.versoTexto || objeto?.forma);
export const temDetalheDePerto = objeto => Boolean(objeto?.detalheDePerto);
export const escondeAlgo = objeto => temVerso(objeto) || temDetalheDePerto(objeto);

/**
 * O estado da inspeção agora: o que está à mostra e o que já foi achado.
 *
 * `achou` é o que a tela usa para marcar a descoberta — e é só verdadeiro
 * quando a pessoa chegou lá, nunca quando o objeto simplesmente tem detalhe.
 */
export function estadoDaInspecao({ zoom = ZOOM_MINIMO, virado = false, objeto = {} } = {}) {
  const z = limitarZoom(zoom);
  const dePerto = !virado && temDetalheDePerto(objeto) && z >= ZOOM_QUE_REVELA;
  return Object.freeze({
    zoom: z,
    virado: Boolean(virado),
    // Virado mostra o verso; de frente e perto, o detalhe.
    mostrandoDetalhe: dePerto,
    mostrandoVerso: Boolean(virado) && temVerso(objeto),
    // Já dá para aproximar mais?
    podeAproximar: z < ZOOM_MAXIMO,
    podeAfastar: z > ZOOM_MINIMO,
    achou: dePerto || (Boolean(virado) && temVerso(objeto)),
  });
}

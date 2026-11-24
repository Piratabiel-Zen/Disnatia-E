import { COMPOSICAO, visaoDaMesa } from './exploracao.mjs';
import './exploracao.css';

/**
 * O ESCURO POR CIMA DO MAPA
 *
 * Uma camada preta com buracos onde a mesa já esteve e onde cada criança
 * está agora. Feita com `mask`: o navegador compõe na GPU e o custo não
 * cresce com o tamanho do mapa, ao contrário de desenhar isto num canvas e
 * repintar a cada passo de token.
 *
 * O MESTRE VÊ O QUE A MESA VÊ. Esta parte já errou duas vezes em direções
 * opostas, e vale registrar as duas:
 *
 *   1. No começo ele não recebia névoa nenhuma. Pintava às cegas, nada
 *      mudava na tela dele, e a conclusão óbvia era que revelar não
 *      funcionava.
 *   2. Depois ele passou a receber a névoa a 50%. Agora ele ENXERGAVA o
 *      mapa inteiro por baixo — e julgou, com razão, que a névoa não
 *      tapava nada, porque na tela dele realmente não tapava.
 *
 * O acerto é a névoa cheia, igual à dos jogadores, mais um botão para
 * espiar por baixo quando ele precisa narrar o que tem lá. Assim o que ele
 * vê por padrão É o que a mesa vê, que é a única referência honesta para
 * decidir se a névoa está boa.
 *
 * E a camada não pega clique: os tokens continuam sendo arrastados por
 * baixo dela, inclusive sobre o que ainda está escuro — o Mestre move a
 * criança para dentro do escuro e a visão dela abre o caminho.
 */
export default function NevoaDeExploracao({
  mestre = false, clareiras = [], tokens = [], dono = '', aspecto = 2,
  espiando = false,
}) {
  const { tudoVisivel, previa, mascara } = visaoDaMesa({ mestre, clareiras, tokens, dono, aspecto });
  if (tudoVisivel) return null;

  // Sem clareira e sem token, o escuro é inteiro: é o começo da noite, com
  // a casa toda por descobrir.
  /* SÓ AS PROPRIEDADES PADRÃO. Declarar `WebkitMaskComposite` junto fazia o
     caminho antigo do WebKit vencer o `mask-composite`, e os buracos paravam
     de somar. O `-webkit-mask-image` fica, que é só a imagem e é inofensivo. */
  const estilo = mascara
    ? {
      maskImage: mascara,
      WebkitMaskImage: mascara,
      maskComposite: COMPOSICAO,
    }
    : undefined;

  // `previa` continua marcando que quem olha é o Mestre; o que muda a
  // opacidade é ele PEDIR para espiar, e não o fato de ser o Mestre.
  return (
    <div
      className="nev"
      data-previa={previa ? '' : undefined}
      data-espiando={previa && espiando ? '' : undefined}
      aria-hidden="true" style={estilo}
    />
  );
}

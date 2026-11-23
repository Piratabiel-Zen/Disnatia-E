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
 * O MESTRE NÃO LEVA NÉVOA. Ele precisa do mapa inteiro para conduzir, e
 * esconder dele seria esconder do narrador.
 *
 * E a camada não pega clique: os tokens continuam sendo arrastados por
 * baixo dela, inclusive sobre o que ainda está escuro — o Mestre move a
 * criança para dentro do escuro e a visão dela abre o caminho.
 */
export default function NevoaDeExploracao({
  mestre = false, clareiras = [], tokens = [], dono = '', aspecto = 2,
}) {
  const { tudoVisivel, mascara } = visaoDaMesa({ mestre, clareiras, tokens, dono, aspecto });
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

  return <div className="nev" aria-hidden="true" style={estilo} />;
}

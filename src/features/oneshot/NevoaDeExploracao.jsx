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
 * O MESTRE VÊ UMA PRÉVIA ESMAECIDA, e não o nada. Antes ele não recebia
 * névoa nenhuma, e o resultado foi pior que esconder: pintava às cegas,
 * clicava para revelar, nada mudava na tela dele, e a conclusão óbvia era
 * que revelar não funcionava.
 *
 * E a camada não pega clique: os tokens continuam sendo arrastados por
 * baixo dela, inclusive sobre o que ainda está escuro — o Mestre move a
 * criança para dentro do escuro e a visão dela abre o caminho.
 */
export default function NevoaDeExploracao({
  mestre = false, clareiras = [], tokens = [], dono = '', aspecto = 2,
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

  // Na prévia do Mestre o escuro é fraco: ele lê o mapa por baixo e ainda
  // sabe o que a mesa não viu.
  return <div className="nev" data-previa={previa ? '' : undefined} aria-hidden="true" style={estilo} />;
}

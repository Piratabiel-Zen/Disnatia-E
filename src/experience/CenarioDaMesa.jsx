import { cenarioDaMesa } from '../core/atmosferaDaMesa.mjs';
import './cenario-da-mesa.css';

/**
 * O CENÁRIO DA MESA
 *
 * A foto do lugar onde a campanha se passa, atrás de tudo, em todas as abas.
 * Fica fora do fluxo e sem pegar clique: é parede, não conteúdo.
 *
 * Três camadas, e cada uma resolve um problema:
 *
 *  1. a foto, com `cover` — ela é 16:9, então em monitor comum encaixa
 *     inteira, e em tela mais larga ou mais alta ela corta pelas bordas em
 *     vez de distorcer;
 *  2. o véu escuro por cima — sem ele o texto some, porque esta foto tem céu
 *     vermelho vivo ao lado de pedra quase preta e não existe uma cor de
 *     letra que funcione nas duas;
 *  3. a chuva ou a névoa, conforme a mesa pedir.
 *
 * A chuva é feita de três camadas de gradiente repetido, cada uma com
 * velocidade e inclinação próprias, deslizando. Não é uma gota por elemento:
 * seriam centenas de nós para o navegador animar numa tela que já tem mapa,
 * tokens e mural. Com gradiente, são três `background-position` animados — o
 * compositor resolve na GPU e o custo não cresce com a quantidade de gotas.
 */
export default function CenarioDaMesa({ campaign }) {
  const cenario = cenarioDaMesa(campaign);
  if (!cenario) return null;

  return (
    <div
      className="cenario-mesa"
      aria-hidden="true"
      style={{ '--cenario-veu': cenario.escurecer ?? 0.55 }}
    >
      <picture className="cenario-mesa-foto">
        <source srcSet={cenario.imagem} type="image/webp" />
        <img
          src={cenario.alternativa || cenario.imagem}
          alt=""
          loading="eager"
          decoding="async"
          style={{ objectPosition: cenario.posicao || 'center' }}
        />
      </picture>
      <span className="cenario-mesa-veu" />
      {/* A NÉVOA mora aqui dentro, e não solta na página, porque a casca da
          sessão tem fundo opaco próprio: tudo que for desenhado FORA dela
          fica atrás desse fundo e some. Foi exatamente isso que fez a chave
          de névoa não ter efeito nenhum — ela ligava, gravava, e a camada
          nascia atrás de uma parede.

          Ela também só aparece no modo imersivo. Quem põe a mesa em "Leve"
          está pedindo menos coisa na tela, e névoa é a primeira a sair. */}
      {cenario.nevoa && (
        <span className="cenario-mesa-nevoa">
          <i className="cenario-nevoa-fundo" />
          <i className="cenario-nevoa-meio" />
          <i className="cenario-nevoa-frente" />
        </span>
      )}

      {cenario.chuva && (
        <span className="cenario-mesa-chuva">
          <i className="cenario-chuva-fundo" />
          <i className="cenario-chuva-meio" />
          <i className="cenario-chuva-frente" />
        </span>
      )}
    </div>
  );
}

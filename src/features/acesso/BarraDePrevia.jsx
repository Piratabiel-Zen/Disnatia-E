import { createPortal } from 'react-dom';
import { sairDaPrevia } from './previaDeJogador.mjs';
import './previa-de-jogador.css';

/**
 * A FAIXA DE PRÉVIA
 *
 * Fica presa no alto enquanto o Admin está vendo a mesa pelos olhos de um
 * exorcista. Precisa ser impossível de ignorar: um Admin que esquece que
 * está em prévia conclui que o site escondeu dele um documento que ele mesmo
 * criou, e vai atrás de um bug que não existe.
 *
 * Diz também o que a prévia não é, em uma linha, porque a tentação de tratar
 * isto como prova de segredo é grande e o engano seria caro.
 */
export default function BarraDePrevia({ previa }) {
  if (!previa) return null;
  return createPortal(
    <div className="previa-barra" role="status">
      <span className="previa-olho" aria-hidden="true">◉</span>
      <div className="previa-texto">
        <b>Vendo a mesa como {previa.nome}</b>
        <small>Mostra o que essa pessoa vê. Quem impede de verdade é o servidor.</small>
      </div>
      <button type="button" onClick={() => sairDaPrevia()}>Sair da prévia</button>
    </div>,
    document.body,
  );
}

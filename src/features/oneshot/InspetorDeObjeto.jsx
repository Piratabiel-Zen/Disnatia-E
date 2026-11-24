import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ZOOM_MINIMO, ZOOM_PASSO, estadoDaInspecao, girar, limitarZoom,
  objetoInspecionavel, escondeAlgo, temVerso,
} from './inspecao.mjs';
import './inspecao.css';

/**
 * O OBJETO NA MÃO
 *
 * Abre por cima de tudo, escuro, com o objeto no meio. Amplia, gira, vira.
 *
 * O QUE ESTE COMPONENTE NÃO FAZ: contar para a pessoa que existe algo
 * escondido. Não há "este objeto tem um segredo" em lugar nenhum — teria o
 * efeito contrário do pretendido, porque aí a mesa inteira fica caçando em
 * vez de jogar. O que existe é um objeto que dá para examinar; quem examinar
 * acha.
 *
 * O botão de virar aparece sempre que há verso, e isso é diferente: virar uma
 * foto é um gesto que a pessoa conhece do mundo, e não saber que dá para
 * virar seria interface ruim, não suspense.
 *
 * Arrastar só funciona com a imagem ampliada, senão o objeto escorrega da
 * tela ao primeiro toque e a pessoa não consegue trazer de volta.
 */
export default function InspetorDeObjeto({ objeto: bruto, aoFechar }) {
  const objeto = objetoInspecionavel(bruto || {});
  const [zoom, setZoom] = useState(ZOOM_MINIMO);
  const [graus, setGraus] = useState(0);
  const [virado, setVirado] = useState(false);
  const [arrasto, setArrasto] = useState({ x: 0, y: 0 });
  const puxando = useRef(null);
  const palco = useRef(null);
  const virarRef = useRef(null);

  const mostrandoOVerso = virado;
  const estado = estadoDaInspecao({ zoom, virado, objeto });

  const aproximar = useCallback(n => {
    setZoom(z => {
      const novo = limitarZoom(z + n);
      // Voltar ao tamanho natural recentraliza: imagem pequena arrastada
      // para fora da tela não tem como ser trazida de volta.
      if (novo <= ZOOM_MINIMO) setArrasto({ x: 0, y: 0 });
      return novo;
    });
  }, []);

  // Esc fecha, e as setas do teclado também servem — a mesa usa notebook.
  useEffect(() => {
    const noTeclado = e => {
      if (e.key === 'Escape') { aoFechar?.(); return; }
      if (e.key === '+' || e.key === '=') { aproximar(ZOOM_PASSO); e.preventDefault(); }
      if (e.key === '-' || e.key === '_') { aproximar(-ZOOM_PASSO); e.preventDefault(); }
      if (e.key.toLowerCase() === 'r') setGraus(g => girar(g));
      if (e.key.toLowerCase() === 'v' && temVerso(objeto)) virarRef.current?.();
    };
    window.addEventListener('keydown', noTeclado);
    return () => window.removeEventListener('keydown', noTeclado);
  }, [aoFechar, aproximar, objeto]);

  const rolar = e => {
    e.preventDefault();
    aproximar(e.deltaY < 0 ? ZOOM_PASSO : -ZOOM_PASSO);
  };

  /* Arrastar só com a imagem ampliada: senão o objeto escorrega para fora
     da tela ao primeiro toque e não tem como ser trazido de volta. */
  const pegar = e => {
    if (zoom <= ZOOM_MINIMO) return;
    puxando.current = { x: e.clientX - arrasto.x, y: e.clientY - arrasto.y };
    palco.current?.setPointerCapture?.(e.pointerId);
  };
  const puxar = e => {
    if (!puxando.current) return;
    setArrasto({ x: e.clientX - puxando.current.x, y: e.clientY - puxando.current.y });
  };
  const soltar = () => { puxando.current = null; };

  const virar = () => {
    setVirado(v => !v);
    // Virar devolve o tamanho natural: o verso é outra imagem, e herdar o
    // zoom da frente abre o verso já cortado no meio.
    setZoom(ZOOM_MINIMO);
    setArrasto({ x: 0, y: 0 });
  };
  // O atalho de teclado chama pela referência: posta aqui, a versão atual
  // entra no ouvinte sem que ele seja trocado a cada grau girado.
  virarRef.current = virar;

  const imagem = estado.mostrandoVerso ? (objeto.versoImagem || objeto.imagem) : objeto.imagem;

  return (
    <div className="insp" role="dialog" aria-modal="true" aria-label={objeto.titulo || 'Objeto'}>
      {/* Clicar no fundo fecha, como em toda tela cheia do site. */}
      <button type="button" className="insp-fundo" onClick={aoFechar} aria-label="Fechar" />

      <div className="insp-caixa">
        <header className="insp-barra">
          <h3>{objeto.titulo || 'Objeto'}</h3>
          <div className="insp-botoes">
            <button type="button" onClick={() => aproximar(-ZOOM_PASSO)} disabled={!estado.podeAfastar} title="Afastar (−)">−</button>
            <span className="insp-zoom">{Math.round(estado.zoom * 100)}%</span>
            <button type="button" onClick={() => aproximar(ZOOM_PASSO)} disabled={!estado.podeAproximar} title="Aproximar (+)">+</button>
            <button type="button" onClick={() => setGraus(g => girar(g))} title="Girar (R)">⟳</button>
            {temVerso(objeto) && (
              <button type="button" onClick={virar} data-virado={mostrandoOVerso ? '' : undefined} title="Virar (V)">
                {mostrandoOVerso ? 'Frente' : 'Virar'}
              </button>
            )}
            <button type="button" className="insp-fechar" onClick={aoFechar} title="Fechar (Esc)">✕</button>
          </div>
        </header>

        <div
          ref={palco}
          className="insp-palco"
          data-arrastavel={estado.zoom > ZOOM_MINIMO ? '' : undefined}
          onWheel={rolar}
          onPointerDown={pegar}
          onPointerMove={puxar}
          onPointerUp={soltar}
          onPointerCancel={soltar}
        >
          {imagem ? (
            <img
              src={imagem} alt={objeto.titulo || ''} draggable="false"
              style={{
                transform: `translate(${arrasto.x}px, ${arrasto.y}px) scale(${estado.zoom}) rotate(${graus}deg)`,
              }}
            />
          ) : (
            <p className="insp-sem-imagem">Sem imagem. O que há deste objeto está escrito abaixo.</p>
          )}

          {/* O verso só de texto: bilhete atrás do retrato, data a lápis. */}
          {estado.mostrandoVerso && objeto.versoTexto && (
            <div className="insp-verso-texto"><p>{objeto.versoTexto}</p></div>
          )}
        </div>

        {/* O que foi achado. Entra por baixo, com calma, e some ao afastar —
            achado que fica preso na tela vira legenda, e legenda não assusta. */}
        {estado.mostrandoDetalhe && (
          <p className="insp-achado" role="status">{objeto.detalheDePerto}</p>
        )}

        <footer className="insp-pe">
          {objeto.descricao && <p className="insp-descricao">{objeto.descricao}</p>}
          <p className="insp-ajuda">
            Roda do mouse ou + e − para aproximar. R gira
            {temVerso(objeto) ? ', V vira' : ''}. Esc fecha.
            {estado.zoom > ZOOM_MINIMO && ' Arraste para percorrer.'}
          </p>
        </footer>
      </div>
    </div>
  );
}

export { escondeAlgo };

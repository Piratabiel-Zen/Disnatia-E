import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ZOOM_MINIMO, ZOOM_PASSO, estadoDaInspecao, girar, limitarZoom,
  objetoInspecionavel, escondeAlgo, temVerso, estaNoVerso, faceAoSol, ehDesenhado,
} from './inspecao.mjs';
import FaceDeItem from './FaceDeItem.jsx';
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

  /* Objeto desenhado gira de verdade; foto continua sendo foto, que gira no
     plano e troca de lado com o botão. Um `rotateY` numa fotografia digital
     não acrescenta nada: ela não tem espessura para mostrar. */
  const tridimensional = ehDesenhado(objeto);
  // Com espessura, o lado à mostra sai do ângulo, não de um estado separado.
  const mostrandoOVerso = tridimensional ? estaNoVerso(graus) : virado;

  const estado = estadoDaInspecao({ zoom, virado: mostrandoOVerso, objeto });

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

  /* UM ARRASTO, DOIS SENTIDOS. No tamanho natural, puxar de lado roda o
     objeto desenhado — é isto que faz ele parecer ter espessura em vez de
     trocar de slide. Ampliado, puxar percorre a superfície, porque aí o que a
     pessoa quer é chegar num canto do papel, não girar. */
  const girando = useRef(null);

  const pegar = e => {
    if (zoom <= ZOOM_MINIMO) {
      if (!tridimensional) return;
      girando.current = { x: e.clientX, base: graus };
      palco.current?.setPointerCapture?.(e.pointerId);
      return;
    }
    puxando.current = { x: e.clientX - arrasto.x, y: e.clientY - arrasto.y };
    palco.current?.setPointerCapture?.(e.pointerId);
  };
  const puxar = e => {
    if (girando.current) {
      // Meio grau por pixel: a tela inteira dá pouco mais de uma volta, que é
      // o que faz o giro parecer preso ao dedo.
      setGraus(girando.current.base + (e.clientX - girando.current.x) * 0.5);
      return;
    }
    if (!puxando.current) return;
    setArrasto({ x: e.clientX - puxando.current.x, y: e.clientY - puxando.current.y });
  };
  const soltar = () => {
    puxando.current = null;
    if (!girando.current) return;
    girando.current = null;
    // Assenta na face mais próxima: objeto parado de perfil não se lê.
    setGraus(g => Math.round(g / 180) * 180);
  };

  const virar = () => {
    if (tridimensional) { setGraus(g => Math.round(g / 180) * 180 + 180); return; }
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
          data-arrastavel={estado.zoom > ZOOM_MINIMO || tridimensional ? '' : undefined}
          data-tridimensional={tridimensional ? '' : undefined}
          onWheel={rolar}
          onPointerDown={pegar}
          onPointerMove={puxar}
          onPointerUp={soltar}
          onPointerCancel={soltar}
        >
          {tridimensional ? (
            <>
              <div
                className="insp-objeto"
                data-puxando={girando.current ? '' : undefined}
                style={{
                  '--insp-giro': String(Math.round(graus)),
                  transform: `translate(${arrasto.x}px, ${arrasto.y}px)`
                    + ` scale(${estado.zoom}) rotateY(${graus}deg)`,
                }}
              >
                <div className="insp-face">
                  <FaceDeItem forma={objeto.forma} selo={objeto.selo} lado="frente" />
                </div>
                <div className="insp-face insp-face-verso">
                  <FaceDeItem
                    forma={objeto.forma} selo={objeto.selo} lado="verso"
                    semEscritaFingida={Boolean(objeto.versoTexto)}
                  />
                  {/* O que está escrito atrás fica ESCRITO ATRÁS, sobre o
                      papel, e não numa placa por cima dele: virar a foto e
                      achar um cartão flutuando na frente desfaz justamente a
                      ilusão de estar com o objeto na mão. */}
                  {objeto.versoTexto && (
                    <p className="insp-escrito">{objeto.versoTexto}</p>
                  )}
                </div>
                <span className="insp-borda insp-borda-e" />
                <span className="insp-borda insp-borda-d" />
                <span className="insp-borda insp-borda-c" />
                <span className="insp-borda insp-borda-b" />
              </div>
              {/* A sombra encolhe quando o objeto fica de perfil: é por ela
                  que a espessura se lê como espessura e não como truque. */}
              <span className="insp-sombra" style={{ '--insp-chao': faceAoSol(graus).toFixed(3) }} />
            </>
          ) : imagem ? (
            <img
              src={imagem} alt={objeto.titulo || ''} draggable="false"
              style={{
                transform: `translate(${arrasto.x}px, ${arrasto.y}px) scale(${estado.zoom}) rotate(${graus}deg)`,
              }}
            />
          ) : (
            <p className="insp-sem-imagem">Sem imagem. O que há deste objeto está escrito abaixo.</p>
          )}

          {/* O verso só de texto: bilhete atrás do retrato, data a lápis.
              Só para foto — no objeto desenhado o texto já está no papel. */}
          {!tridimensional && estado.mostrandoVerso && objeto.versoTexto && (
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
            {estado.zoom > ZOOM_MINIMO
              ? ' Arraste para percorrer.'
              : tridimensional && ' Arraste de lado para virar na mão.'}
          </p>
        </footer>
      </div>
    </div>
  );
}

export { escondeAlgo };

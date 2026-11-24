import { useEffect, useRef, useState } from 'react';
import { ligarAmbiente } from './motorDoAmbiente.mjs';
import { ambienteDoMapa } from './somDaCasa.mjs';

/**
 * A CASA SOANDO
 *
 * Liga o ambiente do mapa aberto e troca quando a mesa muda de andar.
 *
 * PRECISA DE UM GESTO. O navegador bloqueia áudio que começa sozinho, e
 * tentar forçar só enche o console. Então há um botão: a pessoa liga o som
 * uma vez e, dali em diante, trocar de andar troca o ambiente sozinho.
 *
 * O botão é pequeno e fica no canto porque ele é um interruptor, não uma
 * funcionalidade — depois do primeiro clique ninguém olha mais para ele.
 */
export default function AmbienteDaCasa({ mapa, pressao = 0, instabilidade = 1 }) {
  const [ligado, setLigado] = useState(false);
  const ctxRef = useRef(null);
  const ambienteRef = useRef(null);

  // Troca de andar: desliga o anterior e liga o novo. Sem isto, os sete
  // ambientes acabariam tocando juntos.
  useEffect(() => {
    if (!ligado) return undefined;
    const ctx = ctxRef.current;
    if (!ctx) return undefined;
    ambienteRef.current?.parar();
    ambienteRef.current = ligarAmbiente(ctx, mapa, { pressao, instabilidade });
    return () => { ambienteRef.current?.parar(); ambienteRef.current = null; };
    // `pressao` fica de fora de propósito: ela se ajusta no efeito abaixo,
    // sem recomeçar o ambiente a cada ponto de Pavor da mesa.
  }, [ligado, mapa]);

  // A pressão só aperta os eventos; não recomeça nada.
  useEffect(() => {
    ambienteRef.current?.ajustar({ pressao, instabilidade });
  }, [pressao, instabilidade]);

  const alternar = async () => {
    if (ligado) {
      ambienteRef.current?.parar();
      ambienteRef.current = null;
      setLigado(false);
      return;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      if (!ctxRef.current) ctxRef.current = new Ctor();
      // O gesto é agora: é aqui que o navegador libera o áudio.
      await ctxRef.current.resume();
      setLigado(true);
    } catch { /* sem áudio: a casa fica muda e o resto funciona igual */ }
  };

  if (!ambienteDoMapa(mapa)) return null;

  return (
    <button
      type="button" className="amb" data-ligado={ligado ? '' : undefined}
      onClick={alternar}
      title={ligado ? 'Silenciar a casa' : 'Ouvir a casa'}
      aria-pressed={ligado}
    >
      <span aria-hidden="true">{ligado ? '♪' : '♪'}</span>
      {ligado ? 'A casa' : 'Ouvir a casa'}
    </button>
  );
}

import { useEffect, useRef, useState } from 'react';
import { ligarSomDaNoite } from './somDaNoite.mjs';
import './chave-da-noite.css';

/**
 * A CHAVE DO SOM DA NOITE
 *
 * Vento, coruja e sussurro, sintetizados na hora. Cada pessoa liga o seu,
 * de propósito: som é a coisa mais pessoal da mesa — alguém está de fone,
 * alguém está com criança dormindo do lado, alguém já põe a própria trilha.
 * Ligar isso para todo mundo a partir da tela do Mestre seria invadir o
 * cômodo das outras pessoas.
 *
 * E o botão é obrigatório, não é preguiça: o navegador não libera áudio sem
 * um gesto, e aqui não existe tocador visível para a pessoa apertar. O clique
 * neste botão É o gesto.
 */
export default function ChaveDaNoite() {
  const [ligado, setLigado] = useState(false);
  const desligar = useRef(null);

  useEffect(() => () => { desligar.current?.(); }, []);

  const alternar = () => {
    if (ligado) {
      desligar.current?.();
      desligar.current = null;
      setLigado(false);
      return;
    }
    desligar.current = ligarSomDaNoite({ volume: 1 });
    setLigado(true);
  };

  return (
    <button
      type="button" className="noite-chave" data-ligado={ligado ? 'sim' : 'nao'}
      onClick={alternar}
      title={ligado ? 'Silenciar a noite' : 'Vento, corujas e sussurros — só no seu aparelho'}
    >
      <span aria-hidden="true">{ligado ? '♪' : '☾'}</span>
      {ligado ? 'Noite no ar' : 'Som da noite'}
    </button>
  );
}

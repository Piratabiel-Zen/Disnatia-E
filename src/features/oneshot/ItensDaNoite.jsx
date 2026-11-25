/**
 * A BOLSA — consulta rápida dentro do mapa.
 *
 * Abre pelo botão no canto, acima dos bilhetes. Mostra a foto pequena e o
 * nome de cada item que o Mestre entregou na aba Aparições. Nada mais: no
 * meio de uma cena a pessoa precisa LEMBRAR que tem a lanterna, não
 * estudá-la. O resto está nas Aparições, que é onde se lê com calma.
 *
 * A foto é 3x4 — retrato, como um instantâneo —, e tem tamanho fixo no
 * CSS. Sem o tamanho, cada imagem que chega empurra a grade e o dedo erra
 * o que estava mirando.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { observarLiberados } from '../acesso/observarLiberados';
import { bolsaDeItens, nomeDoItem, ehDaMesa } from './itens.mjs';
import './itens-da-noite.css';

export default function ItensDaNoite({ membro, aoFechar }) {
  const [aparicoes, setAparicoes] = useState([]);

  useEffect(() => {
    if (!membro) return undefined;
    return observarLiberados('aparicoes', membro, setAparicoes,
      erro => console.error('Erro ao abrir a bolsa:', erro));
  }, [membro?.uid, membro?.papel]);

  const bolsa = useMemo(() => bolsaDeItens(aparicoes), [aparicoes]);

  return (
    <div className="itn-fundo" role="dialog" aria-label="Seus itens" onClick={aoFechar}>
      <section className="itn" onClick={e => e.stopPropagation()}>
        <header className="itn-topo">
          <h3>O que você tem</h3>
          <button type="button" className="itn-fechar" onClick={aoFechar} aria-label="Fechar">✕</button>
        </header>

        {!bolsa.length ? (
          <p className="itn-vazio" role="status">Suas mãos estão vazias.</p>
        ) : (
          <ul className="itn-grade">
            {bolsa.map(item => (
              <li key={item.id} className={`itn-carta${ehDaMesa(item) ? ' itn-mesa' : ''}`}>
                {item.imagem
                  ? <img className="itn-foto" src={item.imagem} alt="" loading="lazy" decoding="async" />
                  : <span className="itn-foto itn-foto-vazia" aria-hidden="true">◈</span>}
                <b className="itn-nome">{nomeDoItem(item)}</b>
                {ehDaMesa(item) && <span className="itn-selo">da mesa</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

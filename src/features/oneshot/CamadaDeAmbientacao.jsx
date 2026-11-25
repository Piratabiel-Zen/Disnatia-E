/**
 * O QUE O MESTRE PÔS, DESENHADO SOBRE O MAPA
 *
 * Cada peça é um `<span>` posicionado em porcentagem, pintado só com CSS.
 * Nenhuma imagem: um tufo de grama em PNG seria mais um arquivo para
 * baixar, e em gradiente ele acompanha o tamanho sem borrar.
 *
 * O tamanho e a força entram como variáveis CSS em vez de estilo pronto.
 * Assim a folha de estilo decide o que cada tipo FAZ com eles — uma vela
 * cresce pouco e brilha muito, uma pedra cresce e não brilha nada — sem
 * que este arquivo precise saber de nenhum dos dois.
 */
import React from 'react';
import { pecasDoMapa, ehLuz, filtroDoAjuste } from './ambientacao.mjs';
import './camada-de-ambientacao.css';

export default function CamadaDeAmbientacao({ pecas, mapaId, ajuste, selecionada, editando }) {
  const visiveis = pecasDoMapa(pecas, mapaId);
  const filtro = filtroDoAjuste(ajuste);
  if (!visiveis.length && !filtro) return null;

  return (
    <div
      className={`amb${editando ? ' amb-editando' : ''}`}
      style={filtro ? { filter: filtro } : undefined}
      aria-hidden="true"
    >
      {visiveis.map(p => {
        const luz = ehLuz(p);
        /* A coisa desligada some de verdade; a luz desligada FICA, escura.
           É o que faz acender o gerador significar alguma coisa: a mesa
           precisa ter visto o poste apagado antes. */
        if (!p.ligada && !luz) return null;
        return (
          <span
            key={p.id || `${p.tipo}-${p.x}-${p.y}`}
            className={[
              'amb-peca', `amb-${p.tipo}`,
              p.ligada ? 'amb-on' : 'amb-off',
              selecionada === p.id ? 'amb-escolhida' : '',
            ].filter(Boolean).join(' ')}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              '--amb-t': p.tamanho ?? 1,
              '--amb-f': p.ligada ? (p.forca ?? 1) : 0,
            }}
          />
        );
      })}
    </div>
  );
}

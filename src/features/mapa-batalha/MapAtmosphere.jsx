import { atmosferaDe, compassoDaLuz, graosDeAreia } from './atmosferas.mjs';
import './atmosfera.css';

// As camadas que dão vida ao mapa.
//
// Ficam entre a arte e os tokens: nenhuma recebe clique, nenhuma muda o
// tamanho do tabuleiro, e todas desaparecem quando o jogador pede menos
// movimento. O cálculo é só de composição — nada aqui roda por quadro em JS.
export default function MapAtmosphere({ atmosfera, img }) {
  const preset = atmosferaDe(atmosfera);
  if (!preset) return null;

  return (
    <div className={`mapa-atm mapa-atm-${preset.id}`} aria-hidden="true" style={{ '--brilho': preset.brilho ?? 1 }}>
      {/* ---- Deserto ---- */}
      {preset.luz && (
        <div
          className="mapa-atm-sol"
          style={{
            '--lx': `${preset.luz.x}%`, '--ly': `${preset.luz.y}%`,
            '--luz-cor': preset.luz.cor, '--luz-forca': preset.luz.forca,
            '--respiro': `${preset.luz.respiro}s`,
          }}
        />
      )}
      {preset.sombra && (
        <div
          className="mapa-atm-sombra"
          style={{
            '--sombra-cor': preset.sombra.cor, '--sombra-forca': preset.sombra.forca,
            '--respiro': `${preset.sombra.respiro}s`,
          }}
        />
      )}
      {(preset.areia || []).map((faixa, index) => (
        <div
          key={`areia-${index}`}
          className="mapa-atm-areia"
          style={{
            top: `${faixa.topo}%`, height: `${faixa.altura}%`,
            '--dur': `${faixa.duracao}s`, '--atraso': `${faixa.atraso}s`,
            '--op': faixa.opacidade, '--escala': faixa.escala,
          }}
        />
      ))}
      {preset.graos && (
        <div className="mapa-atm-graos">
          {graosDeAreia(preset.graos.quantidade).map((grao, index) => (
            <i
              key={`grao-${index}`}
              style={{
                top: `${grao.topo}%`,
                '--dur': `${grao.duracao}s`,
                '--atraso': `${grao.atraso}s`,
                '--escala': grao.escala,
              }}
            />
          ))}
        </div>
      )}

      {/* ---- Noite ---- */}
      {preset.noite && (
        <div className="mapa-atm-noite" style={{ '--noite-cor': preset.noite.cor, '--noite-forca': preset.noite.forca }} />
      )}
      {preset.luar && (
        <div
          className="mapa-atm-luar"
          style={{
            '--lx': `${preset.luar.x}%`, '--ly': `${preset.luar.y}%`,
            '--luz-cor': preset.luar.cor, '--luz-forca': preset.luar.forca,
            '--respiro': `${preset.luar.respiro}s`,
          }}
        />
      )}
      {(preset.luzes || []).map((luz, index) => {
        const compasso = compassoDaLuz(luz, index);
        return (
          <div
            key={`luz-${index}`}
            className={`mapa-atm-luz padrao-${compasso.padrao}`}
            style={{
              left: `${luz.x}%`, top: `${luz.y}%`,
              '--raio': `${luz.raio}%`, '--forca': luz.forca,
              '--cor': luz.cor || '#FFC46E',
              '--dur': `${compasso.duracao}s`,
              '--atraso': `${compasso.atraso}s`,
            }}
          />
        );
      })}
      {/* A escuridão dos cantos avança e recua: a sala respira. */}
      {preset.respiracao && (
        <div className="mapa-atm-respiracao" style={{ '--dur': `${preset.respiracao.duracao}s`, '--forca': preset.respiracao.forca }} />
      )}
      {/* Algo atravessa a cena. Sem forma definida, de propósito. */}
      {preset.presenca && (
        <div className="mapa-atm-presenca" style={{ '--dur': `${preset.presenca.duracao}s`, '--op': preset.presenca.opacidade }} />
      )}
      {/* Poeira suspensa: em lugar fechado ela paira, não atravessa. */}
      {preset.poeira && (
        <div
          className="mapa-atm-poeira"
          style={{ '--op': preset.poeira.opacidade, ...(preset.poeira.cor ? { '--cor': preset.poeira.cor, '--halo': preset.poeira.halo || preset.poeira.cor } : {}) }}
        >
          {graosDeAreia(preset.poeira.quantidade).map((mota, index) => (
            <i
              key={`mota-${index}`}
              style={{
                top: `${mota.topo}%`, left: `${mota.esquerda}%`,
                '--dur': `${(preset.poeira.duracao * (0.6 + mota.escala * 0.4)).toFixed(2)}s`,
                '--atraso': `${mota.atraso}s`,
                '--escala': mota.escala,
              }}
            />
          ))}
        </div>
      )}
      {/* O ouro responde ao fogo: um brilho lento percorrendo a câmara. */}
      {preset.ouro && (
        <div
          className="mapa-atm-ouro"
          style={{
            '--dur': `${preset.ouro.duracao}s`, '--op': preset.ouro.opacidade,
            ...(preset.ouro.cor ? { '--cor': preset.ouro.cor, '--brilho-cor': preset.ouro.brilho || preset.ouro.cor } : {}),
          }}
        />
      )}
      {/* O vento usa a própria arte: uma cópia das bordas, onde só há
          folhagem, balançando de leve. Mascarada e com movimento de poucos
          pixels, lê como vento — não como a imagem escorregando. */}
      {preset.vento && img && (
        <div
          className="mapa-atm-vento"
          style={{
            backgroundImage: `url(${img})`,
            '--forca': `${preset.vento.forca}px`,
            '--dur': `${preset.vento.duracao}s`,
            '--borda': `${preset.vento.borda}%`,
          }}
        />
      )}
      {preset.folhagem && (
        <div
          className="mapa-atm-folhas"
          style={{ '--dur': `${preset.folhagem.duracao}s`, '--op': preset.folhagem.opacidade }}
        />
      )}
    </div>
  );
}

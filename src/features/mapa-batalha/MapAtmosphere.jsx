import { atmosferaDe, graosDeAreia } from './atmosferas.mjs';
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
      {(preset.postes || []).map((poste, index) => (
        <div
          key={`poste-${index}`}
          className="mapa-atm-poste"
          style={{
            left: `${poste.x}%`, top: `${poste.y}%`,
            '--raio': `${poste.raio}%`, '--forca': poste.forca,
            // Cada lâmpada treme no seu próprio compasso; em sincronia
            // pareceria um pisca-pisca, não iluminação.
            '--atraso': `${-(index * 1.37).toFixed(2)}s`,
          }}
        />
      ))}
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

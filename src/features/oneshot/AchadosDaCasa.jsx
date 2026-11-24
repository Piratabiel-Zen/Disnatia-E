import { useState } from 'react';
import { itensAchados, porEntregar, contagemDosAmuletos } from './achadosDaCasa.mjs';
import { itemComoObjeto } from './itensDaCasa.mjs';
import FaceDeItem from './FaceDeItem.jsx';
import InspetorDeObjeto from './InspetorDeObjeto.jsx';
import './achados.css';

/**
 * A BOLSA DA MESA
 *
 * Fica no mapa, recolhida, e abre com o que já foi achado. Clicar num item
 * põe ele na mão: amplia, gira, vira.
 *
 * O mestre tem a lista inteira para entregar; os jogadores têm só o que
 * existe. Esta é a diferença de tela mais importante do componente, e é por
 * isso que ela está logo no topo do render e não enterrada numa condição.
 */
export default function AchadosDaCasa({
  achados = [], mestre = false, idDoMapa = '', aoEntregar, aoDevolver,
}) {
  const [aberta, setAberta] = useState(false);
  const [examinando, setExaminando] = useState(null);
  const [entregando, setEntregando] = useState(false);

  const itens = itensAchados(achados);
  const amuletos = contagemDosAmuletos(achados);
  const faltando = mestre ? porEntregar(achados, idDoMapa) : [];

  return (
    <>
      <div className="ach" data-aberta={aberta ? '' : undefined}>
        <button
          type="button" className="ach-puxador"
          onClick={() => setAberta(a => !a)}
          aria-expanded={aberta}
          title={aberta ? 'Fechar a bolsa' : 'Abrir a bolsa'}
        >
          <span className="ach-selo" aria-hidden="true">✦</span>
          Achados
          {itens.length > 0 && <span className="ach-conta">{itens.length}</span>}
        </button>

        {aberta && (
          <div className="ach-painel">
            {/* Os amuletos têm contador porque faltar dois é pressão. */}
            <p className="ach-amuletos" data-completo={amuletos.completo ? '' : undefined}>
              Amuletos {amuletos.achados} de {amuletos.total}
              {amuletos.completo && ' — dá para fechar o círculo.'}
            </p>

            {itens.length === 0 ? (
              <p className="ach-vazio">A casa ainda não deu nada.</p>
            ) : (
              <ul className="ach-grade">
                {itens.map(item => (
                  <li key={item.id}>
                    <button
                      type="button" className="ach-item"
                      onClick={() => setExaminando(itemComoObjeto(item))}
                      title={`Examinar: ${item.nome}`}
                    >
                      <span className="ach-desenho" aria-hidden="true">
                        <FaceDeItem forma={item.forma} selo={item.selo} lado="frente" />
                      </span>
                      <span className="ach-nome">{item.nome}</span>
                    </button>
                    {mestre && (
                      <button
                        type="button" className="ach-tirar"
                        onClick={() => aoDevolver?.(item.id)}
                        title="Tirar da mesa"
                      >✕</button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {mestre && (
              <div className="ach-mestre">
                <button
                  type="button" className="ach-abrir-lista"
                  onClick={() => setEntregando(e => !e)}
                  aria-expanded={entregando}
                >
                  {entregando ? 'Fechar a lista' : `Entregar item (${faltando.length})`}
                </button>
                {entregando && (
                  <ul className="ach-lista">
                    {faltando.map(item => (
                      <li key={item.id}>
                        <button
                          type="button" data-aqui={item.aqui ? '' : undefined}
                          onClick={() => { aoEntregar?.(item.id); setEntregando(false); }}
                        >
                          <strong>{item.nome}</strong>
                          <em>{item.local}</em>
                        </button>
                      </li>
                    ))}
                    {faltando.length === 0 && <li className="ach-vazio">A casa está vazia.</li>}
                  </ul>
                )}
                <p className="ach-nota">
                  Entregue quando eles procurarem no lugar certo. O verso de
                  cada item só aparece para quem virar.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {examinando && (
        <InspetorDeObjeto objeto={examinando} aoFechar={() => setExaminando(null)} />
      )}
    </>
  );
}

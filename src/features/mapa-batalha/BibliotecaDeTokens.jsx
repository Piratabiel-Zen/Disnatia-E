import { SPRITES, recorteDoQuadro, spriteDe } from '../oneshot/sprites.mjs';
import { useMemo, useState } from 'react';
import './biblioteca-de-tokens.css';
import { useBuscaAdiada } from '../../core/useBuscaAdiada';

/**
 * A BIBLIOTECA DE TOKENS
 *
 * Isto é usado com a mesa esperando. O Mestre está narrando, precisa pôr
 * cinco figuras no mapa e voltar a falar — então o que conta aqui é quantos
 * gestos cada token custa, não quanto a gaveta é bonita.
 *
 * O que mudou, e por quê:
 *
 * GRADE DE FOTOS VIROU LISTA. Três colunas de retratos grandes mostravam seis
 * tokens por vez e obrigavam a rolar. Em linha, com a miniatura pequena ao
 * lado do nome, cabem três vezes mais na mesma altura — e nome se lê mais
 * rápido do que se reconhece um rosto de 44 pixels.
 *
 * UM POR VEZ VIROU VÁRIOS. Antes cada token era um clique que fechava a
 * gaveta: cinco tokens eram cinco idas e vindas. Agora marca-se os cinco e
 * põe-se todos de uma vez, espalhados para não caírem empilhados.
 *
 * SAIU O ATALHO DE FICHA. Havia uma faixa de retratos das fichas no alto, que
 * criava um token com a foto de perfil do personagem. Não era token: era um
 * rosto recortado em círculo, que no mapa fica irreconhecível. O caminho bom
 * sempre foi salvar o token de verdade e amarrá-lo à ficha, que é o que traz
 * vida e talismã junto.
 *
 * A busca aparece a partir de oito tokens. Abaixo disso ela só rouba uma
 * linha da lista que ela deveria ajudar a filtrar.
 */
const BUSCA_A_PARTIR_DE = 8;

export default function BibliotecaDeTokens({
  tokens = [], fichas = [], aoColocar, aoExcluir, aoFechar, aoCriarNovo,
  comSprites = false,
}) {
  const [busca, setBusca] = useState('');
  // O filtro espera o dedo parar; a letra no campo, não.
  const buscaAdiado = useBuscaAdiada(busca);
  const [marcados, setMarcados] = useState(() => new Set());

  const nomeDaFicha = useMemo(() => {
    const mapa = new Map();
    for (const f of fichas) mapa.set(String(f.id), f.nome || 'Personagem');
    return mapa;
  }, [fichas]);

  const visiveis = useMemo(() => {
    const termo = buscaAdiado.trim().toLowerCase();
    if (!termo) return tokens;
    return tokens.filter(t => {
      const ficha = t.sheetId ? nomeDaFicha.get(String(t.sheetId)) || '' : '';
      return `${t.nome || ''} ${ficha}`.toLowerCase().includes(termo);
    });
  }, [tokens, busca, nomeDaFicha]);

  const alternar = id => setMarcados(atuais => {
    const proximos = new Set(atuais);
    if (proximos.has(id)) proximos.delete(id); else proximos.add(id);
    return proximos;
  });

  const colocar = lista => {
    if (!lista.length) return;
    aoColocar?.(lista);
    setMarcados(new Set());
  };

  const escolhidos = tokens.filter(t => marcados.has(String(t.id)));

  return (
    <div className="bib-tokens">
      <header className="bib-cabeca">
        <span>Biblioteca de tokens</span>
        <button type="button" onClick={aoFechar} title="Fechar">✕</button>
      </header>

      {/* OS PERSONAGENS QUE ANDAM, antes da lista de sempre.
          Ficam em cima porque são a escolha mais provável numa mesa de
          terror: são os primos. Os tokens salvos à mão vêm depois. */}
      {comSprites && (
        <section className="bib-sprites">
          <h4>Personagens</h4>
          <div className="bib-sprite-fila">
            {SPRITES.map(sp => (
              <button key={sp.id} type="button" className="bib-sprite"
                title={`Pôr ${sp.nome} no mapa`}
                onClick={() => aoColocar?.([{ nome: sp.nome, sprite: sp.id, tipo: 'jogador', size: 84 }])}>
                <span className="bib-sprite-arte" style={(() => {
                  const r = recorteDoQuadro(spriteDe(sp.id), 'frente', 0);
                  return {
                    backgroundImage: `url(${sp.arquivo})`,
                    backgroundSize: r.tamanho,
                    backgroundPosition: `${r.x}% ${r.y}%`,
                    aspectRatio: `${sp.largura} / ${sp.altura}`,
                  };
                })()} />
                <b>{sp.nome}</b>
              </button>
            ))}
          </div>
          <p className="bib-sprite-nota">
            Depois de pôr no mapa, ligue a uma ficha: quem tem a ficha
            passa a mover o token.
          </p>
        </section>
      )}

      {tokens.length >= BUSCA_A_PARTIR_DE && (
        <input
          className="bib-busca" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou personagem…" autoComplete="off"
        />
      )}

      {tokens.length === 0 ? (
        <p className="bib-vazia">
          Nenhum token salvo ainda. Crie um token novo e salve na biblioteca para
          reaproveitá-lo nas próximas sessões.
        </p>
      ) : (
        <ul className="bib-lista">
          {visiveis.map(t => {
            const id = String(t.id);
            const ficha = t.sheetId ? nomeDaFicha.get(String(t.sheetId)) : '';
            return (
              <li key={id} data-marcado={marcados.has(id) ? 'sim' : 'nao'}>
                {/* A linha inteira marca: alvo grande é o que permite marcar
                    cinco tokens sem olhar, enquanto se narra. */}
                <button type="button" className="bib-linha" onClick={() => alternar(id)}>
                  <span className="bib-marca" aria-hidden="true" />
                  {t.foto
                    ? <img src={t.foto} alt="" className="bib-mini" loading="lazy" decoding="async" />
                    : <span className="bib-mini bib-mini-vazia">{String(t.nome || '?').slice(0, 1)}</span>}
                  <span className="bib-nomes">
                    <b>{t.nome || 'Token'}</b>
                    {ficha && <em>{ficha}</em>}
                  </span>
                </button>
                {/* Colocar só este, sem passar pela marcação: é o caso de um
                    token só, que é o mais comum no meio de uma cena. */}
                <button
                  type="button" className="bib-so-este" onClick={() => colocar([t])}
                  title="Colocar só este no mapa"
                >→</button>
                <button
                  type="button" className="bib-excluir" onClick={() => aoExcluir?.(t.id)}
                  title="Excluir da biblioteca"
                >✕</button>
              </li>
            );
          })}
          {visiveis.length === 0 && <li className="bib-sem-resultado">Nenhum token com esse nome.</li>}
        </ul>
      )}

      <footer className="bib-rodape">
        <button type="button" className="bib-novo" onClick={aoCriarNovo}>＋ Token novo</button>
        <button
          type="button" className="bib-colocar"
          disabled={escolhidos.length === 0}
          onClick={() => colocar(escolhidos)}
        >
          {escolhidos.length > 1 ? `Colocar ${escolhidos.length} no mapa` : 'Colocar no mapa'}
        </button>
      </footer>
    </div>
  );
}

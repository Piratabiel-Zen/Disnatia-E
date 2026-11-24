import { useEffect, useRef, useState } from 'react';
import { bilhetesDe, porAbrir } from './bilhete.mjs';
import './bilhete.css';

/**
 * O PAPEL QUE CHEGA PARA UM SÓ
 *
 * A animação aqui não é enfeite: ela é a metade do efeito. Um bilhete que
 * simplesmente aparece em texto é informação; um bilhete que SOBE dobrado,
 * com lacre inteiro, e exige que a pessoa quebre o lacre para ler, é um
 * objeto — e objeto a pessoa hesita antes de abrir.
 *
 * A hesitação é o ponto. Nesses segundos ela já sabe que os outros não
 * receberam nada, e já está decidindo se vai contar.
 *
 * Em três tempos:
 *   1. o papel sobe de baixo, dobrado, com o lacre pulsando devagar;
 *   2. o clique quebra o lacre — as duas metades giram para fora — e o
 *      papel se desdobra em três partes, de cima para baixo;
 *   3. o texto aparece linha a linha, no ritmo de quem lê.
 */
export default function BilheteSecreto({ bilhetes = [], sheetId, aoAbrir }) {
  const meus = bilhetesDe(bilhetes, sheetId);
  const fechados = porAbrir(bilhetes, sheetId);
  const [lendo, setLendo] = useState(null);
  const [fase, setFase] = useState('dobrado');
  const [guardados, setGuardados] = useState(false);
  const tempos = useRef([]);

  /* TROCOU DE FICHA, LARGA O PAPEL.
     Achado no navegador: o bilhete era da Mika, a tela passou para o
     Takuro e o papel continuou aberto na frente dele — porque `lendo` é
     estado do componente e sobrevive à troca. Numa mesa isso acontece de
     verdade: quem entra olhando pode ter mais de uma ficha na mão.

     É a única regra em que esta mecânica inteira se apoia, então ela é
     verificada DUAS vezes: aqui, limpando ao trocar, e na hora de
     desenhar, conferindo o destinatário. Uma trava só, numa coisa dessas,
     é trava nenhuma. */
  useEffect(() => { setLendo(null); setFase('dobrado'); setGuardados(false); }, [sheetId]);

  // O bilhete novo entra sozinho: esperar a pessoa achar um ícone é perder
  // justamente o instante em que ela ainda não sabe o que é aquilo.
  useEffect(() => {
    if (lendo || !fechados.length) return;
    setLendo(fechados[0]);
    setFase('dobrado');
  }, [fechados, lendo]);

  useEffect(() => () => tempos.current.forEach(clearTimeout), []);

  const quebrarOLacre = () => {
    if (fase !== 'dobrado') return;
    setFase('quebrando');
    // Os tempos acompanham a animação do CSS. Ficam aqui, e não lá, porque
    // é o JavaScript que decide quando o texto pode ser lido — e texto que
    // aparece antes do papel abrir estraga a encenação inteira.
    tempos.current.push(setTimeout(() => setFase('abrindo'), 520));
    tempos.current.push(setTimeout(() => {
      setFase('aberto');
      if (lendo?.id) aoAbrir?.(lendo.id);
    }, 1180));
  };

  const guardar = () => {
    setFase('guardando');
    tempos.current.push(setTimeout(() => { setLendo(null); setFase('dobrado'); }, 420));
  };

  const linhas = String(lendo?.texto || '').split(/(?<=[.!?])\s+/).filter(Boolean);
  // A segunda conferência: o papel na mão tem de ser desta ficha.
  const meuMesmo = lendo && String(lendo.para) === String(sheetId || '');

  return (
    <>
      {meuMesmo && (
        <div className="blt" data-fase={fase} role="dialog" aria-label="Bilhete">
          <div className="blt-palco">
            <button
              type="button" className="blt-papel"
              onClick={quebrarOLacre}
              disabled={fase !== 'dobrado'}
              aria-label={fase === 'dobrado' ? 'Quebrar o lacre e ler' : 'Bilhete'}
            >
              {/* As três dobras. Só a do meio tem texto: as outras duas são
                  o papel virando, e é o movimento delas que vende a dobra. */}
              <span className="blt-dobra blt-dobra-cima" aria-hidden="true" />
              <span className="blt-dobra blt-dobra-meio">
                <span className="blt-texto">
                  {linhas.map((linha, n) => (
                    <span key={linha.slice(0, 18) + n} style={{ '--n': n }}>{linha} </span>
                  ))}
                </span>
              </span>
              <span className="blt-dobra blt-dobra-baixo" aria-hidden="true" />

              {/* O lacre: duas metades que giram para lados opostos, e um
                  punhado de lascas que salta no momento da quebra. */}
              <span className="blt-lacre" aria-hidden="true">
                <i className="blt-lacre-a" />
                <i className="blt-lacre-b" />
                {[0, 1, 2, 3, 4, 5].map(n => (
                  <i key={n} className="blt-lasca" style={{ '--l': n }} />
                ))}
              </span>
            </button>

            {fase === 'dobrado' && (
              <p className="blt-aviso">Só você recebeu isto. Toque no lacre.</p>
            )}
            {fase === 'aberto' && (
              <div className="blt-pe">
                <button type="button" onClick={guardar}>Guardar no bolso</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* O bolso. Depois de lido o papel não some: fica numa aba discreta,
          porque a pessoa vai querer reler antes de decidir o que faz com
          aquilo — e reler é onde a decisão realmente acontece. */}
      {!lendo && meus.length > 0 && (
        <div className="blt-bolso" data-aberto={guardados ? '' : undefined}>
          <button type="button" onClick={() => setGuardados(g => !g)}>
            ✉ {meus.length}
          </button>
          {guardados && (
            <ul>
              {meus.map(b => (
                <li key={b.id}>
                  <button type="button" onClick={() => { setLendo(b); setFase('aberto'); setGuardados(false); }}>
                    {String(b.texto).slice(0, 52)}…
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

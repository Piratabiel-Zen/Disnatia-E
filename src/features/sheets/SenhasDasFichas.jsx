import { useState } from 'react';
import {
  camposDaSenha, estadoDaSenha, RECADOS_DO_ESTADO, temSenha,
} from './senhaDaFicha.mjs';
import './senhas-das-fichas.css';

/**
 * O PAINEL DE SENHAS
 *
 * Uma lista das fichas da mesa, uma senha em cada. É aqui que o Mestre
 * passa cinco minutos antes da sessão e não volta mais.
 *
 * Duas decisões que valem explicação:
 *
 * A SENHA APARECE ENQUANTO ELE DIGITA, e não em bolinhas. Ele está
 * escolhendo uma senha para DITAR a outra pessoa — esconder do próprio
 * autor, numa tela que ele abriu sozinho, só atrapalha. O campo limpa
 * sozinho assim que grava.
 *
 * NÃO HÁ COMO VER A SENHA DEPOIS. Ela não existe mais em lugar nenhum:
 * foi gravado o resumo dela. Se o Mestre esquecer, define outra — o que é
 * exatamente o que se espera de um lugar que guarda senha direito, e
 * precisa estar dito na tela para ele não procurar.
 */
export default function SenhasDasFichas({ fichas = [], aoGravar }) {
  const [digitando, setDigitando] = useState({});
  const [salvando, setSalvando] = useState('');
  const [feito, setFeito] = useState('');
  const [erro, setErro] = useState('');

  const gravar = async (ficha, texto) => {
    setSalvando(String(ficha.id));
    setErro('');
    try {
      await aoGravar?.(String(ficha.id), await camposDaSenha(texto));
      setDigitando(d => ({ ...d, [ficha.id]: '' }));
      setFeito(String(ficha.id));
      setTimeout(() => setFeito(''), 2400);
    } catch (e) {
      setErro(e?.message || 'Não deu para gravar a senha.');
    } finally {
      setSalvando('');
    }
  };

  return (
    <section className="snf">
      <header>
        <h3>Senhas das fichas</h3>
        <p>
          Quem souber a senha de uma ficha abre e joga com ela. A senha não
          fica guardada em lugar nenhum depois — só o resumo dela. Se
          esquecer, defina outra.
        </p>
      </header>

      {fichas.length === 0 && <p className="snf-vazio">Nenhuma ficha na mesa ainda.</p>}

      <ul>
        {fichas.map(f => {
          const estado = estadoDaSenha(f);
          const texto = digitando[f.id] ?? '';
          const ocupado = salvando === String(f.id);
          return (
            <li key={f.id} data-estado={estado}>
              <div className="snf-quem">
                <strong>{f.nome || 'Ficha sem nome'}</strong>
                <em>{RECADOS_DO_ESTADO[estado]}</em>
              </div>
              <div className="snf-campo">
                <input
                  // Visível enquanto digita: ele vai ditar esta senha para
                  // alguém, e está sozinho na própria tela.
                  type="text" value={texto} disabled={ocupado}
                  placeholder={temSenha(f) ? 'trocar a senha…' : 'definir uma senha…'}
                  onChange={e => setDigitando(d => ({ ...d, [f.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' && texto.trim()) gravar(f, texto); }}
                />
                <button
                  type="button" disabled={ocupado || !texto.trim()}
                  onClick={() => gravar(f, texto)}
                >{ocupado ? '…' : 'Gravar'}</button>
                {temSenha(f) && (
                  <button
                    type="button" className="snf-tirar" disabled={ocupado}
                    onClick={() => gravar(f, '')}
                    title="Deixar a ficha aberta para quem clicar"
                  >Tirar</button>
                )}
              </div>
              {feito === String(f.id) && <span className="snf-feito">Gravada.</span>}
            </li>
          );
        })}
      </ul>

      {erro && <p className="snf-erro">{erro}</p>}

      {/* O mesmo limite que está escrito no módulo, dito para quem usa. */}
      <p className="snf-limite">
        A conferência é de tela: a senha impede que outro primo entre na
        ficha pela porta normal, mas não substitui as regras do servidor.
      </p>
    </section>
  );
}

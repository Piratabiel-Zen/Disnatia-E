import { useState } from 'react';
import { TALENTOS, TALENTOS_POR_PERSONAGEM } from './talentosOneShot.mjs';
import './paginas-one-shot.css';
import './talentos-one-shot.css';
import { useBuscaAdiada } from '../../core/useBuscaAdiada';

/**
 * OS TALENTOS DA NOITE
 *
 * Mesma forma da página de Regras, de propósito: é texto para ler antes de
 * começar e consultar com a mesa esperando. A busca no alto e tudo aberto —
 * sanfona economiza tela e custa o relance, e aqui o relance é o que importa,
 * porque o jogador escolhe comparando os dez.
 *
 * Cada talento mostra o EFEITO e o QUANDO separados. O quando é o que evita a
 * discussão no susto: quase todos exigem ser declarados antes do dado sair da
 * mão, e quem lê isso na hora da escolha não tenta usar depois.
 */
export default function TalentosOneShotPage() {
  const [busca, setBusca] = useState('');
  // O filtro espera o dedo parar; a letra no campo, não.
  const buscaAdiado = useBuscaAdiada(busca);
  const termo = buscaAdiado.trim().toLowerCase();
  const lista = termo
    ? TALENTOS.filter(t => `${t.nome} ${t.resumo} ${t.efeito}`.toLowerCase().includes(termo))
    : TALENTOS;

  return (
    <div className="ost">
      <header className="ost-barra">
        <div>
          <h2>Talentos Especiais</h2>
          <p>
            Dez talentos. Cada pessoa fica com {TALENTOS_POR_PERSONAGEM === 1 ? 'um' : TALENTOS_POR_PERSONAGEM},
            e dois personagens da mesma mesa não deveriam repetir — é a única coisa
            que diferencia duas fichas de gente comum.
          </p>
        </div>
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar nos talentos…" autoComplete="off"
        />
      </header>

      {lista.length === 0 && (
        <p className="ost-nada">Nenhum talento fala disso. O Mestre pode inventar um — a ficha aceita texto livre.</p>
      )}

      <ul className="ost-lista">
        {lista.map((talento, i) => (
          /* O índice vira variável CSS: é o que faz a lanterna passar de
             cartão em cartão, em ordem, em vez de acender todos juntos. */
          <li key={talento.id} className="ost-carta" style={{ '--ost-i': i }}>
            <header>
              <h3>{talento.nome}</h3>
              <span className="ost-limite">{talento.limite}</span>
            </header>
            <p className="ost-resumo">{talento.resumo}</p>
            <p className="ost-efeito">{talento.efeito}</p>
            <p className="ost-quando"><span>Quando</span> {talento.quando}</p>
          </li>
        ))}
      </ul>

      <p className="ost-pe">
        Talento não é número a mais: é permissão para quebrar uma regra, quase
        sempre uma vez só. Guardá-lo até a hora certa costuma valer mais do que
        gastá-lo cedo.
      </p>
    </div>
  );
}

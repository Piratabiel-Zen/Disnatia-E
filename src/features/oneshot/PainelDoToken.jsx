/**
 * O TOKEN ESCOLHIDO — painel curto, só do Mestre.
 *
 * O mapa já tinha um painel de token, completo, com cor de classe, modo
 * de vida, vínculo com inimigo e meia dúzia de campos da Dinastia E. Ele
 * fica escondido na mesa de terror de propósito: ali não há classe nem
 * inimigo com ficha, e o painel inteiro seria ruído sobre a cena.
 *
 * Só que escondê-lo levou junto o tamanho e o excluir, que fazem falta em
 * qualquer mesa. Este painel traz os dois, mais as duas coisas que são
 * desta mesa: a ficha que controla o token e o lado para onde o sprite
 * olha.
 */
import React from 'react';
import { spriteDe } from './sprites.mjs';
import './painel-do-token.css';

const TAMANHOS = Object.freeze({ min: 24, max: 260, passo: 6, padrao: 70 });

export default function PainelDoToken({ token, fichas, aoMudar, aoExcluir, aoFechar }) {
  if (!token) return null;
  const tamanho = Number(token.size) || TAMANHOS.padrao;
  const sprite = spriteDe(token.sprite);

  const redimensionar = n => aoMudar(token.id, {
    size: Math.round(Math.min(TAMANHOS.max, Math.max(TAMANHOS.min, n))),
  });

  return (
    <section className="ptk" aria-label="Token escolhido">
      <header className="ptk-topo">
        <b>{token.nome || 'Token'}</b>
        <button type="button" className="ptk-fechar" onClick={aoFechar} aria-label="Fechar">✕</button>
      </header>

      <label className="ptk-campo">
        <span>Tamanho<b>{tamanho}</b></span>
        <span className="ptk-controles">
          <button type="button" onClick={() => redimensionar(tamanho - TAMANHOS.passo)}
            aria-label="Diminuir">−</button>
          <input type="range" min={TAMANHOS.min} max={TAMANHOS.max} step={2}
            value={tamanho} onChange={e => redimensionar(Number(e.target.value))} />
          <button type="button" onClick={() => redimensionar(tamanho + TAMANHOS.passo)}
            aria-label="Aumentar">+</button>
        </span>
      </label>

      <label className="ptk-campo">
        <span>Controlado por</span>
        {/* O vínculo é pela ID da ficha, nunca pelo nome: dois primos podem
            criar personagens homônimos, e por nome o token de um passaria a
            seguir a ficha do outro. É também por isso que apagar a ficha e
            criar outra igual não devolve o vínculo — refaz-se aqui. */}
        <select value={token.sheetId || ''}
          onChange={e => aoMudar(token.id, {
            sheetId: e.target.value, controllerSheetId: e.target.value,
          })}>
          <option value="">Ninguém — só você move</option>
          {(fichas || []).map(f => (
            <option key={f.id} value={f.id}>{f.nome || 'sem nome'}</option>
          ))}
        </select>
      </label>

      {sprite && (
        <button type="button"
          className={`ptk-lados${token.spriteEspelhado ? ' is-on' : ''}`}
          onClick={() => aoMudar(token.id, { spriteEspelhado: !token.spriteEspelhado })}>
          ⇄ Trocar os lados
          <em>Se ele anda olhando para o lado errado.</em>
        </button>
      )}

      <button type="button" className="ptk-excluir" onClick={() => aoExcluir(token.id)}>
        Tirar da cena
      </button>
    </section>
  );
}

import { useEffect } from 'react';
import { usePlayerPreferences } from '../adventure/usePlayerPreferences';

export function PreferenceSurface() {
  const [preferences] = usePlayerPreferences();
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.effects = preferences.effects;
    root.dataset.textSize = preferences.textSize;
    root.style.setProperty('--player-effect-opacity', preferences.effects === 'subtle' ? '.45' : '1');
  }, [preferences.effects, preferences.textSize]);
  return null;
}

export function ComfortPanel() {
  const [preferences, update] = usePlayerPreferences();
  return <div className="player-comfort">
    <p>Estas preferências se aplicam somente a você. A cena e os acontecimentos continuam compartilhados.</p>
    <label>Efeitos visuais<select aria-label="Efeitos visuais" value={preferences.effects} onChange={event => update({ effects: event.target.value })}><option value="normal">Imersivos</option><option value="subtle">Discretos</option><option value="reduced">Movimento reduzido</option></select></label>
    <label>Tamanho do texto<select aria-label="Tamanho do texto" value={preferences.textSize} onChange={event => update({ textSize: event.target.value })}><option value="standard">Padrão</option><option value="large">Maior</option></select></label>
    {[['music', 'Música'], ['ambience', 'Ambiente'], ['interface', 'Interface']].map(([key, label]) => <label key={key}>{label}<span><input aria-label={`Volume de ${label.toLowerCase()}`} type="range" min="0" max="100" value={preferences[key]} onChange={event => update({ [key]: Number(event.target.value) })}/><output>{preferences[key]}%</output></span></label>)}
    <details><summary>Atalhos e controles</summary><dl><dt>C</dt><dd>Ficha e atributos</dd><dt>H</dt><dd>Habilidades e descrições</dd><dt>I</dt><dd>Inventário</dd><dt>J</dt><dd>Diário</dd><dt>1 a 4</dt><dd>Quatro habilidades rápidas, durante seu turno</dd><dt>Esc</dt><dd>Fechar painel ou cancelar seleção</dd></dl><p>Ao escrever, os atalhos ficam suspensos. No celular, use os botões inferiores.</p></details>
  </div>;
}

export function PlayerDock({ panel, onPanel, onNavigate }) {
  return <nav className="player-dock" aria-label="Ações do jogador">
    {[['sheet', '\u25C6', 'Ficha'], ['abilities', '\u2694', 'Habilidades'], ['inventory', '\u265C', 'Itens'], ['journal', '\u2637', 'Diário'], ['more', '\u22EF', 'Mais']].map(([id, icon, label]) => <button key={id} aria-pressed={panel === id} onClick={() => onPanel(panel === id ? '' : id)}><span aria-hidden="true">{icon}</span><small>{label}</small></button>)}
  </nav>;
}

export function MorePanel({ onNavigate, onPreferences }) {
  return <div className="player-more-grid">{[['session','Sessão atual'],['mapabatalha','Mapa de combate'],['mapamundi','Atlas'],['cronicas','Crônicas e OVA'],['fichas','Ficha completa'],['livro','Livro da Mandíbula'],['personagens','Personagens'],['bestiario','Bestiário'],['regras','Regras'],['classes','Classes'],['prologo','Prólogo']].map(([id, label]) => <button key={id} onClick={() => onNavigate(id)}>{label}</button>)}<button onClick={onPreferences}>Conforto e atalhos</button></div>;
}

import { useState } from 'react';
import './forja.css';

// A forja de linhagens: onde o Mestre de uma mesa própria cria as classes
// dela. O formato é exatamente o das linhagens embutidas, então uma classe
// criada aqui funciona na ficha, no mapa e nos dados sem nenhum caso especial.
const BLANK_ABILITY = () => ({ name: '', desc: '', cost: '', cooldown: '', dano: '' });

function AbilityFields({ list, onChange, label, withReq = false }) {
  const update = (index, patch) => onChange(list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <section className="forja-block">
      <header>
        <h4>{label}</h4>
        <button type="button" onClick={() => onChange([...list, BLANK_ABILITY()])}>＋ Adicionar</button>
      </header>
      {list.length === 0 && <p className="forja-empty">Nenhuma registrada.</p>}
      {list.map((ability, index) => (
        <article key={index} className="forja-ability">
          <input value={ability.name} placeholder="Nome da habilidade" onChange={e => update(index, { name: e.target.value })} />
          <textarea value={ability.desc} rows={2} placeholder="O que ela faz" onChange={e => update(index, { desc: e.target.value })} />
          <div className="forja-ability-meta">
            <input value={ability.cost} placeholder="Custo (VC)" onChange={e => update(index, { cost: e.target.value })} />
            <input value={ability.cooldown} placeholder="Recarga" onChange={e => update(index, { cooldown: e.target.value })} />
            <input value={ability.dano} placeholder="Dano" onChange={e => update(index, { dano: e.target.value })} />
            {withReq && <input value={ability.req || ''} placeholder="Nível mínimo" onChange={e => update(index, { req: e.target.value })} />}
            <button type="button" className="is-danger" onClick={() => onChange(list.filter((_, i) => i !== index))}>Remover</button>
          </div>
        </article>
      ))}
    </section>
  );
}

export default function ClassForge({ draft, onSave, onCancel }) {
  const [entry, setEntry] = useState(() => ({ ...draft, passive: { name: '', desc: '', ...(draft.passive || {}) } }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = patch => setEntry(current => ({ ...current, ...patch }));

  const submit = async event => {
    event.preventDefault();
    if (!String(entry.name || '').trim()) { setError('Dê um nome à linhagem.'); return; }
    setSaving(true); setError('');
    try { await onSave({ ...entry, name: entry.name.trim() }); }
    catch (problem) { setError(problem?.message || 'Não foi possível salvar a linhagem.'); }
    finally { setSaving(false); }
  };

  return (
    <form className="classe-page forja" onSubmit={submit}>
      <header className="classe-intro">
        <span className="classe-intro-kicker">Forja de linhagens</span>
        <h2>{draft.name ? `Editar ${draft.name}` : 'Nova linhagem'}</h2>
        <p>Isto vale só para esta mesa. Os jogadores vão escolher entre as linhagens que você criar aqui.</p>
      </header>

      <section className="forja-block">
        <header><h4>Identidade</h4></header>
        <div className="forja-grid">
          <label>Nome<input value={entry.name} autoFocus onChange={e => set({ name: e.target.value })} placeholder="Ex.: Guardiões da Névoa" /></label>
          <label>Papel<input value={entry.role} onChange={e => set({ role: e.target.value })} placeholder="Ex.: Tanque · Protetor" /></label>
          <label>Símbolo<input value={entry.icon} maxLength={4} onChange={e => set({ icon: e.target.value })} placeholder="◆" /></label>
          <label>Cor<input type="color" value={entry.color} onChange={e => set({ color: e.target.value })} /></label>
          <label>Alcance<input value={entry.alcance} onChange={e => set({ alcance: e.target.value })} placeholder="Ex.: 2m" /></label>
          <label>Ordem na lista<input type="number" value={entry.ordem ?? 0} onChange={e => set({ ordem: Number(e.target.value) || 0 })} /></label>
        </div>
        <label className="forja-wide">História<textarea rows={4} value={entry.lore} onChange={e => set({ lore: e.target.value })} placeholder="De onde vem esta linhagem e o que ela representa no seu mundo." /></label>
      </section>

      <section className="forja-block">
        <header><h4>Passiva da linhagem</h4></header>
        <div className="forja-grid">
          <label>Nome<input value={entry.passive.name} onChange={e => set({ passive: { ...entry.passive, name: e.target.value } })} /></label>
        </div>
        <label className="forja-wide">Efeito<textarea rows={2} value={entry.passive.desc} onChange={e => set({ passive: { ...entry.passive, desc: e.target.value } })} /></label>
      </section>

      <AbilityFields label="Habilidades" list={entry.normal || []} onChange={normal => set({ normal })} />
      <AbilityFields label="Especiais" list={entry.specials || []} onChange={specials => set({ specials })} withReq />

      {error && <p className="forja-error" role="alert">{error}</p>}
      <div className="forja-actions">
        <button type="button" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="is-primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar linhagem'}</button>
      </div>
    </form>
  );
}

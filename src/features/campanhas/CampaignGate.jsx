// Antes de entrar na mesa: escolher a campanha.
// A Dinastia E existe sempre, mesmo que o Firestore esteja vazio. O Mestre pode
// criar outras mesas, cada uma com seu tema e seu conjunto de dados.
import { useEffect, useMemo, useState } from 'react';
import { deleteDoc, setDoc } from 'firebase/firestore';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { globalCol, globalDoc } from '../../core/campaign';
import {
  CAMPAIGN_THEMES, PRIMARY_CAMPAIGN, PRIMARY_CAMPAIGN_ID, campaignSlug, campaignTheme,
} from '../../core/campaign';
import PasswordVisibilityInput from '../../experience/PasswordVisibilityInput';
import './campanhas.css';

const MASTER_PIN_SHA256 = 'b1e87e31fe1147efac5412f9fc1c744753aa903395d57e51033b31d9223a61b1';

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value || '').trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function CampaignCard({ campaign, onEnter, onRemove, canManage }) {
  const theme = campaignTheme(campaign);
  return (
    <article
      className={`campaign-card${campaign.primary ? ' is-primary' : ''}`}
      style={{ '--campaign-accent': theme.accent, '--campaign-soft': theme.accentSoft, '--campaign-bg': theme.bg }}
    >
      <div className="campaign-card-sigil" aria-hidden="true">{campaign.sigil || theme.sigil}</div>
      <div className="campaign-card-body">
        <span className="campaign-card-genre">{campaign.genre || theme.label}</span>
        <h2>{campaign.name}</h2>
        {campaign.world ? <span className="campaign-card-world">⌖ {campaign.world}</span> : null}
        <p>{campaign.tagline || 'Uma mesa à espera da primeira cena.'}</p>
      </div>
      <div className="campaign-card-actions">
        <button className="campaign-enter" onClick={() => onEnter(campaign)}>
          Entrar <span aria-hidden="true">→</span>
        </button>
        {canManage && !campaign.primary ? (
          <button className="campaign-remove" onClick={() => onRemove(campaign)} title="Remover esta mesa da lista">
            Remover
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function CampaignGate({ onChoose }) {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [manage, setManage] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ name: '', genre: '', world: '', tagline: '', theme: 'sombrio' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(globalCol('campaigns'), snap => {
      setRows(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoaded(true);
    }, () => setLoaded(true));
    return () => unsub();
  }, []);

  // A campanha principal nunca depende do banco: se não houver registro, ela existe de todo modo.
  const campaigns = useMemo(() => {
    const stored = rows.filter(row => row.active !== false && row.id !== PRIMARY_CAMPAIGN_ID);
    const primaryRow = rows.find(row => row.id === PRIMARY_CAMPAIGN_ID);
    const primary = { ...PRIMARY_CAMPAIGN, ...(primaryRow || {}), primary: true };
    return [primary, ...stored.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'))];
  }, [rows]);

  const unlockManage = async () => {
    if (await sha256(pin) !== MASTER_PIN_SHA256) { setError('Senha do Mestre incorreta.'); return; }
    setManage(true); setPin(''); setError('');
  };

  const createCampaign = async () => {
    const name = draft.name.trim();
    if (!name || busy) return;
    setBusy(true); setError('');
    const id = campaignSlug(name);
    try {
      if (id === PRIMARY_CAMPAIGN_ID || campaigns.some(c => c.id === id)) {
        setError('Já existe uma mesa com esse nome.');
        return;
      }
      await setDoc(globalDoc('campaigns', id), {
        name,
        genre: draft.genre.trim() || CAMPAIGN_THEMES[draft.theme].label,
        world: draft.world.trim(),
        tagline: draft.tagline.trim(),
        theme: draft.theme,
        sigil: CAMPAIGN_THEMES[draft.theme].sigil,
        active: true,
        createdAt: Date.now(),
      });
      setDraft({ name: '', genre: '', world: '', tagline: '', theme: 'sombrio' });
    } catch {
      setError('Não foi possível criar a mesa. Confira sua conexão.');
    } finally { setBusy(false); }
  };

  const removeCampaign = async campaign => {
    if (campaign.primary) return;
    // Só sai da lista: os dados da mesa continuam guardados e voltam se ela for recriada.
    try { await deleteDoc(globalDoc('campaigns', campaign.id)); }
    catch { setError('Não foi possível remover a mesa.'); }
  };

  return (
    <div className="campaign-gate">
      <div className="campaign-stars" aria-hidden="true" />
      <section className="campaign-panel">
        <header className="campaign-head">
          <span className="campaign-kicker">AS MESAS</span>
          <h1>Qual história começa agora?</h1>
          <p>Cada mesa guarda seus próprios personagens, mapas e crônicas.</p>
        </header>

        <div className="campaign-grid">
          {campaigns.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEnter={onChoose}
              onRemove={removeCampaign}
              canManage={manage}
            />
          ))}
        </div>

        {!loaded ? <p className="campaign-loading">Consultando as mesas...</p> : null}

        {manage ? (
          <section className="campaign-new">
            <h3>Abrir uma nova mesa</h3>
            <div className="campaign-new-grid">
              <label>Nome
                <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Arquivo de Veneza" />
              </label>
              <label>Tipo
                <select value={draft.theme} onChange={e => setDraft({ ...draft, theme: e.target.value })}>
                  {Object.entries(CAMPAIGN_THEMES).map(([key, theme]) => (
                    <option key={key} value={key}>{theme.sigil} {theme.label}</option>
                  ))}
                </select>
              </label>
              <label>Mundo
                <input value={draft.world} onChange={e => setDraft({ ...draft, world: e.target.value })} placeholder="Onde se passa" />
              </label>
              <label className="campaign-new-wide">Chamada
                <input value={draft.tagline} onChange={e => setDraft({ ...draft, tagline: e.target.value })} placeholder="Uma linha que resume a mesa" />
              </label>
            </div>
            <button className="campaign-create" disabled={!draft.name.trim() || busy} onClick={createCampaign}>
              {busy ? 'Criando...' : 'Criar mesa'}
            </button>
          </section>
        ) : (
          <div className="campaign-manage-toggle">
            <label className="campaign-field">
              Senha do Mestre para gerenciar as mesas
              <PasswordVisibilityInput
                value={pin}
                onChange={e => { setPin(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && unlockManage()}
                placeholder="Apenas para criar ou remover mesas"
              />
            </label>
            <button disabled={!pin} onClick={unlockManage}>Gerenciar</button>
          </div>
        )}

        {error ? <div className="campaign-error" role="alert">{error}</div> : null}
      </section>
    </div>
  );
}

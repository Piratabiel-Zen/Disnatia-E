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
import { isUnlocked, requiredPasswordHash, tryUnlock } from '../../core/campaignPassword.mjs';
import './campanhas.css';
import './portais.css';
import { SISTEMA_PADRAO, listaDeSistemas } from '../../core/sistemas/index.mjs';
import PortaDeEntrada from '../acesso/PortaDeEntrada';

const MASTER_PIN_SHA256 = 'b1e87e31fe1147efac5412f9fc1c744753aa903395d57e51033b31d9223a61b1';

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value || '').trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Cada mesa é um portal: um astrolábio que gira devagar em volta do sigilo.
// Escolher a mesa abre o portal; se ela tem senha, é ali mesmo que se diz a
// palavra de passagem.
function CampaignPortal({ campaign, onEnter, onRemove, canManage }) {
  const theme = campaignTheme(campaign);
  const locked = Boolean(requiredPasswordHash(campaign)) && !isUnlocked(campaign);
  const [asking, setAsking] = useState(false);
  const [word, setWord] = useState('');
  const [wrong, setWrong] = useState(false);
  const [checking, setChecking] = useState(false);

  const enter = () => {
    if (locked) { setAsking(true); return; }
    onEnter(campaign);
  };
  const speak = async event => {
    event?.preventDefault();
    if (!word || checking) return;
    setChecking(true);
    const ok = await tryUnlock(campaign, word);
    setChecking(false);
    if (ok) { onEnter(campaign); return; }
    setWrong(true); setWord('');
  };

  return (
    <article
      className={`portal${campaign.primary ? ' is-primary' : ''}${asking ? ' is-asking' : ''}${wrong ? ' is-wrong' : ''}`}
      style={{ '--portal-accent': theme.accent, '--portal-soft': theme.accentSoft }}
    >
      <button type="button" className="portal-orbit" onClick={enter} aria-label={`Entrar na mesa ${campaign.name}`}>
        <span className="portal-ring portal-ring-a" aria-hidden="true" />
        <span className="portal-ring portal-ring-b" aria-hidden="true" />
        <span className="portal-ring portal-ring-c" aria-hidden="true" />
        <span className="portal-core" aria-hidden="true">{campaign.sigil || theme.sigil}</span>
      </button>
      <div className="portal-text">
        <h2>{campaign.name}</h2>
        <span className="portal-where">{[campaign.genre || theme.label, campaign.world].filter(Boolean).join(', em ')}</span>
        <p>{campaign.tagline || 'Uma mesa à espera da primeira cena.'}</p>
      </div>
      {asking ? (
        <form className="portal-word" onSubmit={speak}>
          <label>
            Palavra de passagem
            <PasswordVisibilityInput
              value={word}
              autoFocus
              onChange={event => { setWord(event.target.value); setWrong(false); }}
              placeholder="Diga a palavra para atravessar"
            />
          </label>
          {wrong ? <span className="portal-word-error" role="alert">O portal não reconheceu essa palavra. Tente de novo.</span> : null}
          <div className="portal-word-actions">
            <button type="submit" className="portal-enter" disabled={!word || checking}>{checking ? 'Abrindo...' : 'Atravessar'}</button>
            <button type="button" className="portal-back" onClick={() => { setAsking(false); setWord(''); setWrong(false); }}>Voltar</button>
          </div>
        </form>
      ) : (
        <div className="portal-actions">
          <button type="button" className="portal-enter" onClick={enter}>{locked ? 'Entrar com senha' : 'Entrar na mesa'}</button>
          {canManage && !campaign.primary ? (
            <button type="button" className="portal-back" onClick={() => onRemove(campaign)} title="Remover esta mesa da lista">Remover</button>
          ) : null}
        </div>
      )}
    </article>
  );
}

export default function CampaignGate({ onChoose }) {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [manage, setManage] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ name: '', genre: '', world: '', tagline: '', theme: 'sombrio', sistema: SISTEMA_PADRAO });
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
        // O sistema decide ficha, dados, condições e vocabulário da mesa.
        sistema: draft.sistema,
        sigil: CAMPAIGN_THEMES[draft.theme].sigil,
        active: true,
        createdAt: Date.now(),
      });
      setDraft({ name: '', genre: '', world: '', tagline: '', theme: 'sombrio', sistema: SISTEMA_PADRAO });
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
      <div className="portal-sky" aria-hidden="true"><i /><i /><i /></div>
      <section className="campaign-panel">
        <header className="portal-head">
          <h1>Escolha a mesa</h1>
          <p>Cada portal leva a um mundo, com seus personagens, mapas e crônicas.</p>
        </header>

        {/* A conta fica aqui, não barrando a porta: a Dinastia E é anterior a
            isto e não vai parar no meio da campanha para alguém se cadastrar.
            Mesas novas é que precisam dela, porque sem identidade não existe
            "liberar este documento só para a Ana". */}
        <div className="campaign-conta">
          <PortaDeEntrada />
        </div>

        <div className={`portal-row${campaigns.length === 1 ? ' is-single' : ''}`}>
          {campaigns.map(campaign => (
            <CampaignPortal
              key={campaign.id + ':' + requiredPasswordHash(campaign)}
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
              <label>Sistema
                <select value={draft.sistema} onChange={e => setDraft({ ...draft, sistema: e.target.value })}>
                  {listaDeSistemas().map(sistema => (
                    <option key={sistema.id} value={sistema.id}>{sistema.nome} · {sistema.dados.notacao}</option>
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

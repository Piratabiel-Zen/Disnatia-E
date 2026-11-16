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
import LegalPage from '../legal/LegalPage';
import { aoMudarConta, assumirMesa, auth, mensagemDeErro } from '../../core/auth';

// Gerenciar a lista de mesas continua pedindo a senha da campanha principal:
// é a chave de quem administra o site, não a de nenhuma mesa específica.
import { PRIMARY_MASTER_PIN_HASH, hashPassword, normalizePassword } from '../../core/campaignPassword.mjs';

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
  const [draft, setDraft] = useState({ name: '', genre: '', world: '', tagline: '', theme: 'sombrio', sistema: SISTEMA_PADRAO, senhaMesa: '', senhaMestre: '' });
  const [conta, setConta] = useState(() => auth.currentUser);
  const [legal, setLegal] = useState(null);
  useEffect(() => aoMudarConta(setConta), []);
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
    if (await sha256(pin) !== PRIMARY_MASTER_PIN_HASH) { setError('Senha do Mestre incorreta.'); return; }
    setManage(true); setPin(''); setError('');
  };

  const createCampaign = async () => {
    const name = draft.name.trim();
    if (!name || busy) return;
    // Sem conta não dá para criar: a mesa precisa de um Admin, e Admin é uma
    // pessoa identificada. Sem isso ela nasceria sem dono e trancada.
    if (!conta) { setError('Entre na sua conta para criar uma mesa.'); return; }
    // As duas senhas são pedidas aqui porque depois não há como pedir: a mesa
    // nasceria aberta a qualquer um que tenha o link, e sem ninguém capaz de
    // virar Mestre por senha.
    const senhaMesa = normalizePassword(draft.senhaMesa);
    const senhaMestre = normalizePassword(draft.senhaMestre);
    if (senhaMesa.length < 3) { setError('A senha de entrada precisa de pelo menos 3 letras ou números.'); return; }
    if (senhaMestre.length < 3) { setError('A senha de Mestre precisa de pelo menos 3 letras ou números.'); return; }
    if (senhaMesa === senhaMestre) { setError('As duas senhas precisam ser diferentes: uma abre a mesa, a outra dá o comando dela.'); return; }
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
        // Quem criou é o Admin. Sem este campo, as regras não teriam como
        // deixar o criador entrar na própria mesa: elas exigem ser membro, e
        // virar membro exigiria uma senha que só o Admin pode definir.
        criadoPor: conta.uid,
        // A senha de entrada e a de Mestre, cada mesa com as suas. Só os
        // resumos; o texto nunca vai para o banco.
        passwordHash: await hashPassword(senhaMesa),
        masterPinHash: await hashPassword(senhaMestre),
        createdAt: Date.now(),
      });
      // E vira Admin dela no mesmo gesto, senão a mesa nasce trancada.
      await assumirMesa(id, conta.displayName || conta.email || '');
      setDraft({ name: '', genre: '', world: '', tagline: '', theme: 'sombrio', sistema: SISTEMA_PADRAO, senhaMesa: '', senhaMestre: '' });
    } catch {
      setError('Não foi possível criar a mesa. Confira sua conexão.');
    } finally { setBusy(false); }
  };

  const removeCampaign = async campaign => {
    if (campaign.primary) return;
    // Só sai da lista: os dados da mesa continuam guardados e voltam se ela for recriada.
    try { await deleteDoc(globalDoc('campaigns', campaign.id)); }
    catch (erro) {
      setError(erro?.code === 'permission-denied'
        ? 'Só o Admin da mesa pode removê-la. Entre na conta que a criou.'
        : mensagemDeErro(erro));
    }
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
              <label>Senha de entrada
                <input
                  value={draft.senhaMesa} type="text" autoComplete="off"
                  onChange={e => setDraft({ ...draft, senhaMesa: e.target.value })}
                  placeholder="O que os jogadores digitam"
                />
              </label>
              <label>Senha de Mestre
                <input
                  value={draft.senhaMestre} type="text" autoComplete="off"
                  onChange={e => setDraft({ ...draft, senhaMestre: e.target.value })}
                  placeholder="Só você"
                />
              </label>
              <label className="campaign-new-wide">Chamada
                <input value={draft.tagline} onChange={e => setDraft({ ...draft, tagline: e.target.value })} placeholder="Uma linha que resume a mesa" />
              </label>
            </div>
            <button
              className="campaign-create"
              disabled={!draft.name.trim() || busy || !conta}
              title={conta ? undefined : 'Entre na sua conta primeiro'}
              onClick={createCampaign}
            >
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
        {/* Documentos legais: precisam ser alcançáveis sem login, porque quem
            ainda não criou conta é justamente quem precisa lê-los antes. */}
        <footer className="campaign-legal">
          <a href="#privacidade" onClick={e => { e.preventDefault(); setLegal('privacidade'); }}>Privacidade</a>
          <i aria-hidden="true">·</i>
          <a href="#termos" onClick={e => { e.preventDefault(); setLegal('termos'); }}>Termos de uso</a>
        </footer>
      </section>

      {legal && (
        <div className="campaign-legal-janela" role="dialog" aria-modal="true" aria-label="Documentos legais">
          <button type="button" className="campaign-legal-fechar" onClick={() => setLegal(null)}>Fechar</button>
          <LegalPage inicial={legal} />
        </div>
      )}
    </div>
  );
}

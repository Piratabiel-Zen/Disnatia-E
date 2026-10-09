import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../core/firebase';
import { isVisitorSheet, verifyVisitorPassword } from '../adventure/visitorAccess.mjs';
import './visitor-summons.css';
import { CLASSES, getSheetMaxHp } from '../data/gameData';

const ACCESS_KEY = 'dinastia_access_v1';
const PLAYER_SHEET_KEY = 'dinastia_player_sheet';
const MASTER_PIN_SHA256 = 'b1e87e31fe1147efac5412f9fc1c744753aa903395d57e51033b31d9223a61b1';

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value || '').trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
}

export function loadStoredAccess() {
  try {
    const raw = localStorage.getItem(ACCESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !['player','master','visitor'].includes(parsed.role)) return null;
    if(parsed.role==='visitor'&&!parsed.visitorId)return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

export function saveStoredAccess(access) {
  try {
    if (!access) localStorage.removeItem(ACCESS_KEY);
    else localStorage.setItem(ACCESS_KEY, JSON.stringify(access));
  } catch (_) {}
}

export function clearStoredAccess() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(PLAYER_SHEET_KEY);
  } catch (_) {}
}

export function PlayerAccessGate({ access, onAccess, onLogout, masterMode, setMasterMode }) {
  const [sheets, setSheets] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('player');
  const [visitors,setVisitors]=useState([]);
  const [visitorId,setVisitorId]=useState('');
  const [visitorsLoaded,setVisitorsLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    if(mode!=='visitor')return;
    return onSnapshot(collection(db,'visitors'),snap=>{setVisitors(snap.docs.map(item=>({id:item.id,...item.data()})).filter(row=>row.active!==false));setVisitorsLoaded(true);},()=>{setVisitorsLoaded(true);setError('Não foi possível consultar os visitantes. Confira sua conexão.');});
  },[mode]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'sheets'), snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(sheet=>!isVisitorSheet(sheet));
      setSheets(rows);
      setLoaded(true);
      setSelectedId(prev => prev || String(rows[0]?.id || ''));
    }, () => setLoaded(true));
    return () => unsub();
  }, []);

  const selected = useMemo(
    () => sheets.find(s => String(s.id) === String(selectedId)) || null,
    [sheets, selectedId]
  );

  useEffect(() => {
    if (!loaded || !access) return;
    if (access.role === 'player') {
      const exists = sheets.some(s => String(s.id) === String(access.sheetId));
      if (!exists) onLogout?.();
    }
    if (access.role === 'master' && !masterMode) onLogout?.();
  }, [loaded, access, sheets, masterMode, onLogout]);

  if (access?.role === 'player' && sheets.some(s => String(s.id) === String(access.sheetId))) return null;
  if (access?.role === 'master' && masterMode) return null;

  const enterPlayer = () => {
    if (!selected) return;
    const expected = String(selected.senha || '').trim();
    if (expected && String(pin).trim() !== expected) {
      setError('Senha incorreta para esta ficha.');
      return;
    }
    const payload = {
      role: 'player',
      sheetId: String(selected.id),
      name: selected.nome || 'Personagem',
      photo: selected.foto || '',
      ts: Date.now(),
    };
    try { localStorage.setItem(PLAYER_SHEET_KEY, String(selected.id)); } catch (_) {}
    saveStoredAccess(payload);
    setError('');
    onAccess?.(payload);
  };

  const enterVisitor = async () => {
    const visitor=visitors.find(row=>row.id===visitorId);
    if(!visitor||busy)return;
    setBusy(true);setError('');
    try{
      if(!await verifyVisitorPassword(pin,visitor.password)){setError('Senha incorreta para este visitante.');return;}
      const payload={role:'visitor',visitorId:visitor.id,name:visitor.name,authVersion:Number(visitor.authVersion||1),ts:Date.now()};
      saveStoredAccess(payload);onAccess?.(payload);
    }catch{setError('Não foi possível entrar. Tente novamente.');}
    finally{setBusy(false);}
  };

  const enterMaster = async () => {
    const digest = await sha256(pin);
    if (digest !== MASTER_PIN_SHA256) {
      setError('Senha do Mestre incorreta.');
      return;
    }
    setMasterMode?.(true);
    const payload = { role: 'master', name: 'Mestre', ts: Date.now() };
    saveStoredAccess(payload);
    setError('');
    onAccess?.(payload);
  };

  const cls = CLASSES.find(c => c.id === selected?.classe);
  const maxHp = selected ? getSheetMaxHp(selected) : 0;

  return (
    <div className="access-gate">
      <div className="access-stars" />
      <section className="access-panel">
        <div className="access-sigil">✦</div>
        <div className="access-kicker">DINASTIA E · ACESSO À CAMPANHA</div>
        <h1>Quem atravessa o Véu?</h1>
        <p>Escolha seu personagem. A partir daqui, sua experiência fica vinculada à sua própria ficha.</p>

        <div className="access-mode-tabs">
          <button className={mode === 'player' ? 'active' : ''} onClick={() => { setMode('player'); setPin(''); setError(''); }}>Jogador</button>
          <button className={mode === 'visitor'?'active':''} onClick={()=>{setMode('visitor');setPin('');setError('');}}>Visitante</button>
          <button className={mode === 'master' ? 'active' : ''} onClick={() => { setMode('master'); setPin(''); setError(''); }}>Mestre</button>
        </div>

        {mode === 'player' ? (
          <>
            <div className="access-character-strip">
              {sheets.map(s => {
                const c = CLASSES.find(x => x.id === s.classe);
                return (
                  <button key={s.id} className={String(selectedId) === String(s.id) ? 'active' : ''} onClick={() => { setSelectedId(String(s.id)); setPin(''); setError(''); }} style={{ '--char-color': c?.color || '#A855F7' }}>
                    <span>{s.foto ? <img src={s.foto} alt="" /> : (s.nome?.[0] || '?')}</span>
                    <b>{s.nome || 'Personagem'}</b>
                    <small>{c?.name || 'Classe personalizada'}</small>
                  </button>
                );
              })}
            </div>

            {selected && (
              <div className="access-selected" style={{ '--char-color': cls?.color || '#A855F7' }}>
                <div className="access-selected-portrait">{selected.foto ? <img src={selected.foto} alt="" /> : (selected.nome?.[0] || '?')}</div>
                <div>
                  <strong>{selected.nome || 'Personagem'}</strong>
                  <span>{cls?.name || 'Classe personalizada'} · Nível {selected.nivel || 1}</span>
                  <small>❤ {selected.hp || 0}/{maxHp} · ✦ {selected.vigos || 0} VC</small>
                </div>
              </div>
            )}

            {selected?.senha ? (
              <label className="access-field">Senha da ficha<input type="password" value={pin} onChange={e => { setPin(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && enterPlayer()} placeholder="Digite sua senha..." autoFocus /></label>
            ) : (
              <div className="access-open-note">Esta ficha não possui senha definida e pode ser acessada diretamente.</div>
            )}

            <button className="access-enter" disabled={!selected} onClick={enterPlayer}>Entrar como {selected?.nome || 'Jogador'} <span>→</span></button>
          </>
        ) : mode === 'visitor' ? (
          <div className="access-visitor-login"><h2>Entrada de visitantes</h2><p>Entre pelo seu nome. Seus personagens são definidos pelo Mestre.</p><label className="access-field">Nome do visitante<select aria-label="Nome do visitante" value={visitorId} onChange={event=>{setVisitorId(event.target.value);setPin('');setError('');}}><option value="">Selecione seu nome</option>{visitors.map(visitor=><option key={visitor.id} value={visitor.id}>{visitor.name}</option>)}</select></label><label className="access-field">Senha do visitante<input type="password" value={pin} onChange={event=>{setPin(event.target.value);setError('');}} onKeyDown={event=>event.key==='Enter'&&enterVisitor()} autoComplete="current-password"/></label><button className="access-enter" disabled={busy||!visitorId||!pin} onClick={enterVisitor}>{busy?'Verificando...':'Entrar como visitante'}</button>{!visitorsLoaded&&<p>Consultando visitantes...</p>}{visitorsLoaded&&!visitors.length&&<p>O Mestre ainda não cadastrou visitantes.</p>}</div>
        ) : (
          <div className="access-master-login">
            <div className="access-master-orb">✦</div>
            <h2>Mesa do Mestre</h2>
            <p>Use a senha do Mestre para liberar controles narrativos e administrativos.</p>
            <label className="access-field">Senha do Mestre<input type="password" value={pin} onChange={e => { setPin(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && enterMaster()} placeholder="Senha do Mestre..." autoFocus /></label>
            <button className="access-enter master" onClick={enterMaster}>Abrir a Mesa do Mestre <span>→</span></button>
          </div>
        )}

        {error && <div className="access-error">{error}</div>}
        {!loaded && <div className="access-loading">Consultando as fichas...</div>}
      </section>
    </div>
  );
}

export function PlayerIdentityChip({ access, onLogout }) {
  if (!access) return null;
  return (
    <button className={'player-identity-chip'+(access.role==='master'?' is-master':'')} onClick={onLogout} title="Trocar usuário">
      <span>{access.role === 'master' ? 'M' : access.photo ? <img src={access.photo} alt="" /> : (access.name?.[0] || '?')}</span>
      <div><b>{access.name || (access.role === 'master' ? 'Mestre' : 'Jogador')}</b><small>{access.role === 'master' ? 'Mesa do Mestre' : 'Trocar usuário'}</small></div>
    </button>
  );
}

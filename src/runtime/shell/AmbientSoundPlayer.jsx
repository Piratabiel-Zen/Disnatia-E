import { onSnapshot } from '../adventure/sharedSnapshot';
import { useEffect,useRef,useState } from "react";
import { createPortal } from "react-dom";
import { doc,getDocFromServer,setDoc } from "firebase/firestore";
import { db } from "../core/firebase";
import { pushToast } from "../core/toast";
const SOUND_CATEGORIES = [
  { id: 'calmaria', label: 'Calmaria', icon: '🌤️', color: '#4ADE80' },
  { id: 'dialogos', label: 'Tristeza', icon: '🌧️', color: '#1EC8FF' },
  { id: 'ambiente', label: 'Ambiente', icon: '🌫️', color: '#A855F7' },
  { id: 'enigmas', label: 'Enigmas', icon: '🧩', color: '#E8A020' },
  { id: 'combate', label: 'Combate', icon: '⚔️', color: '#E8193C' },
  { id: 'terror', label: 'Terror', icon: '💀', color: '#6E6E80' },
  { id: 'sfx', label: 'Sound Effects', icon: '🔊', color: '#FF6B9D' },
];
import { usePlayerPreferences } from '../adventure/usePlayerPreferences';
export default function AmbientSoundPlayer({ masterMode }) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('calmaria');
  const [playlists, setPlaylists] = useState({});
  const [current, setCurrent] = useState(null);
  const [userMuted, setUserMuted] = useState(false);
  const [preferences,updatePreferences]=usePlayerPreferences();
  const volume=preferences.music;
  const setVolume=value=>updatePreferences({music:value});
  const [novoNome, setNovoNome] = useState('');
  const [novoLink, setNovoLink] = useState('');
  const iframeRef = useRef(null);
  const lastTs = useRef(0);
  const lastAmbientRevisionRef = useRef(0);
  const [combatActive, setCombatActive] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'combat'), snap => {
      if (snap.exists()) setCombatActive(snap.data().active || false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'ambient_playlists'), snap => {
      if (snap.exists()) setPlaylists(snap.data() || {});
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const ambientRef = doc(db, 'config', 'ambient');
    const applyAmbient = (d) => {
      if (!d) return;
      const eventId = String(d.commandId || d.revision || d.ts || ((d.videoId || '') + ':' + (d.playing ? '1' : '0')));
      setCurrent(d);
      if (eventId && eventId !== String(lastTs.current || '')) {
        lastTs.current = eventId;
      }
    };
    const unsub = onSnapshot(ambientRef, snap => {
      if (snap.exists()) applyAmbient(snap.data());
    }, err => console.error('Erro ao sincronizar música:', err));
    const refreshFromServer = async () => {
      try { const snap = await getDocFromServer(ambientRef); if (snap.exists()) applyAmbient(snap.data()); } catch (_) {}
    };
    const onVisible = () => { if (document.visibilityState === 'visible') refreshFromServer(); };
    window.addEventListener('online', refreshFromServer);
    window.addEventListener('focus', refreshFromServer);
    document.addEventListener('visibilitychange', onVisible);
    return () => { unsub(); window.removeEventListener('online', refreshFromServer); window.removeEventListener('focus', refreshFromServer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const extractId = (url) => {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return m ? m[1] : url.trim();
  };

  const sendCmd = (func, args = []) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args }), '*'
      );
    } catch (_) {}
  };

  useEffect(()=>{sendCmd('setVolume',[volume]);},[volume]);
  const handleVolumeChange = (e) => { const v = Number(e.target.value); setVolume(v); sendCmd('setVolume', [v]); };

  const playTrack = async (track, categoria) => {
    const now = Date.now();
    const nextAmbient = {
      videoId: track.videoId,
      nome: track.nome,
      categoria,
      playing: true,
      ts: now,
      revision: now * 1000 + Math.floor(Math.random() * 1000),
      commandId: 'ambient_' + now + '_' + Math.random().toString(36).slice(2, 9),
    };

    // Latency compensation: o emissor muda imediatamente; os demais recebem
    // o mesmo comando pelo snapshot sem aguardar qualquer comparação de relógio.
    setCurrent(nextAmbient);
    setUserMuted(false);
    lastTs.current = nextAmbient.commandId;
    setDoc(doc(db, 'config', 'ambient'), nextAmbient).catch(async error => {
      console.error('Erro ao publicar música:', error);
      try {
        const snap = await getDocFromServer(doc(db, 'config', 'ambient'));
        if (snap.exists()) setCurrent(snap.data());
      } catch (_) {}
    });

    const catColor = SOUND_CATEGORIES.find(c => c.id === categoria)?.color || '#4ADE80';
    pushToast(`🎵 Tocando agora: ${track.nome}`, '🎵', catColor);
  };

  const stopAll = async () => {
    const now = Date.now();
    const nextAmbient = {
      videoId: '', nome: '', categoria: '', playing: false,
      ts: now,
      revision: now * 1000 + Math.floor(Math.random() * 1000),
      commandId: 'ambient_stop_' + now + '_' + Math.random().toString(36).slice(2, 9),
    };
    setCurrent(nextAmbient);
    lastTs.current = nextAmbient.commandId;
    setDoc(doc(db, 'config', 'ambient'), nextAmbient).catch(error => console.error('Erro ao parar música:', error));
  };

  const addTrack = async () => {
    const id = extractId(novoLink.trim());
    if (!id || !novoNome.trim()) return;
    const atuais = playlists[activeCategory] || [];
    const nova = { id: Date.now(), nome: novoNome.trim(), videoId: id };
    const updated = { ...playlists, [activeCategory]: [...atuais, nova] };
    await setDoc(doc(db, 'config', 'ambient_playlists'), updated);
    setNovoNome(''); setNovoLink('');
  };

  const deleteTrack = async (categoria, trackId) => {
    const atuais = playlists[categoria] || [];
    const updated = { ...playlists, [categoria]: atuais.filter(t => t.id !== trackId) };
    await setDoc(doc(db, 'config', 'ambient_playlists'), updated);
  };

  const isPlaying = current?.playing && current?.videoId && !userMuted;
  const embedSrc = current?.videoId ? `https://www.youtube.com/embed/${current.videoId}?autoplay=1&loop=1&playlist=${current.videoId}&enablejsapi=1&controls=0` : '';
  const volIcon = userMuted ? '🔇' : volume === 0 ? '🔇' : volume < 40 ? '🔈' : volume < 75 ? '🔉' : '🔊';
  const catInfo = SOUND_CATEGORIES.find(c => c.id === current?.categoria);

  return (
    <div className="ambient-topbar-player" style={{ position: 'relative', zIndex: 100, flexShrink: 0 }}>
      {isPlaying && volume > 0 && embedSrc && (
        <div style={{ position: 'fixed', bottom: -400, left: -400, width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
          <iframe key={`${current?.videoId || 'none'}_${current?.revision || current?.ts || 0}`} ref={iframeRef} src={embedSrc} width="1" height="1" allow="autoplay; encrypted-media" onLoad={() => setTimeout(() => sendCmd('setVolume', [volume]), 1800)} />
        </div>
      )}
      {!open && (
        <div className="ambient-topbar-closed" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {current?.videoId && (
            <button onClick={() => setUserMuted(m => !m)} title={userMuted ? 'Ativar som' : 'Silenciar para mim'} className="ambient-mute-button" style={{ width: 36, height: 36, borderRadius: '50%', background: isPlaying ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isPlaying ? 'rgba(74,222,128,0.55)' : 'rgba(255,255,255,0.14)'}`, color: isPlaying ? '#4ADE80' : '#7A6A8A', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter:'none', boxShadow: isPlaying ? '0 0 18px rgba(74,222,128,0.28)' : 'none', transition: 'all 0.3s', animation: isPlaying ? 'pulse 2.5s ease-in-out infinite' : 'none' }}>{volIcon}</button>
          )}
          {current?.videoId && (
            <div className="ambient-track-pill" style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(10,12,28,0.92)', border: `1px solid ${catInfo ? catInfo.color+'44' : 'rgba(74,222,128,0.25)'}`, borderRadius: 24, padding: '6px 14px', backdropFilter:'none', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', maxWidth: 180 }}>
              <span style={{ fontSize: 13 }}>{catInfo?.icon || '🎵'}</span>
              <span style={{ fontSize: 11, color: catInfo?.color || '#4ADE80', fontFamily: 'Cinzel,serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{current.nome || 'Som ambiente'}</span>
              {isPlaying && (
                <input type="range" min={0} max={100} step={5} value={volume} onChange={handleVolumeChange} style={{ width: 60, accentColor: catInfo?.color || '#4ADE80', cursor: 'pointer', border: 'none', background: 'transparent', padding: 0 }} />
              )}
            </div>
          )}
          {masterMode && (
            <button onClick={() => setOpen(true)} title="Playlists de ambiente" className="ambient-playlist-button" style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#5A5070', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter:'none', transition: 'all 0.2s' }}>🎼</button>
          )}
        </div>
      )}
      {open && masterMode && createPortal(
        <div className="ambient-playlist-overlay" style={{ position: 'fixed', top: 72, bottom: 18, left: 'calc(var(--grim-w) + 16px)', width: 'min(440px, calc(100vw - var(--grim-w) - 32px))', minHeight: 0, background: 'rgba(8,10,24,0.985)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 16, padding: 16, display:'flex', flexDirection:'column', boxShadow: '0 18px 52px rgba(0,0,0,0.88)', backdropFilter:'none', zIndex: 4700 }}>          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink:0 }}>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 13, color: '#4ADE80', letterSpacing: '0.1em' }}>🎼 Playlists de Ambiente</div>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: '#5A5070', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12, flexShrink:0 }}>
            {SOUND_CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setActiveCategory(c.id)} style={{
                padding: '5px 10px', borderRadius: 16, fontFamily: 'Cinzel,serif', fontSize: 10.5, letterSpacing:'0.03em',
                border: `1px solid ${activeCategory === c.id ? c.color + '77' : 'rgba(255,255,255,0.09)'}`,
                background: activeCategory === c.id ? `${c.color}18` : 'rgba(255,255,255,0.02)',
                color: activeCategory === c.id ? c.color : '#6A5A7A', cursor: 'pointer', transition:'all 0.15s',
              }}>{c.icon} {c.label}</button>
            ))}
          </div>

          <div style={{ overflowY: 'auto', flex:1, marginBottom: 10, display:'flex', flexDirection:'column', gap:9 }}>
            {(playlists[activeCategory] || []).length === 0 && (
              <div style={{ fontSize: 11, color: '#4A4050', fontFamily: 'Cinzel,serif', textAlign: 'center', padding: '14px 0', fontStyle:'italic' }}>Nenhuma música nesta categoria ainda.</div>
            )}
            {(playlists[activeCategory] || []).map(track => {
              const isCurrent = current?.videoId === track.videoId && current?.playing;
              const catColor = SOUND_CATEGORIES.find(c=>c.id===activeCategory)?.color || '#4ADE80';
              return (
                <div key={track.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:9, background: isCurrent ? `${catColor}18` : 'rgba(255,255,255,0.03)', border:`1px solid ${isCurrent ? catColor+'55' : 'rgba(255,255,255,0.07)'}` }}>
                  <button onClick={() => playTrack(track, activeCategory)} title="Tocar para todos" style={{ background:'none', border:'none', color: isCurrent ? catColor : '#8A7A6A', cursor:'pointer', fontSize:17, flexShrink:0 }}>{isCurrent ? '▶' : '▷'}</button>
                  <span style={{ flex:1, fontSize:13, color: isCurrent ? catColor : '#C8B8A0', fontFamily:'Cinzel,serif', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{track.nome}</span>
                  <button onClick={() => deleteTrack(activeCategory, track.id)} style={{ background:'none', border:'none', color:'rgba(232,25,60,0.5)', cursor:'pointer', fontSize:13, flexShrink:0, padding:4 }}>✕</button>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, flexShrink:0 }}>
            <label style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(74,222,128,0.65)', fontFamily: 'Cinzel,serif', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Adicionar Música — {SOUND_CATEGORIES.find(c=>c.id===activeCategory)?.label}</label>
            <input value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Nome da música/tema..." style={{ width: '100%', fontSize: 12, marginBottom: 6 }} />
            <input value={novoLink} onChange={e => setNovoLink(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTrack()} placeholder="Link do YouTube..." style={{ width: '100%', fontSize: 12, marginBottom: 8 }} />
            <button onClick={addTrack} disabled={!novoNome.trim() || !novoLink.trim()} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.45)', background: 'rgba(74,222,128,0.12)', color: '#4ADE80', cursor: (novoNome.trim()&&novoLink.trim()) ? 'pointer' : 'not-allowed', fontFamily: 'Cinzel,serif', fontSize: 12, letterSpacing: '0.08em', opacity: (novoNome.trim()&&novoLink.trim()) ? 1 : 0.4 }}>✦ Adicionar à Playlist</button>
          </div>

          {current?.videoId && (
            <button onClick={stopAll} style={{ marginTop: 10, width: '100%', padding: '7px', borderRadius: 8, border: '1px solid rgba(232,25,60,0.3)', background: 'rgba(232,25,60,0.08)', color: '#E8193C', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 11, flexShrink:0 }}>⏹ Parar música para todos</button>
          )}

          <div style={{ marginTop: 10, fontSize: 9, color: '#4A4050', fontFamily: 'Cinzel,serif', lineHeight: 1.6, flexShrink:0 }}>Ao tocar, todos ouvem automaticamente. Cada jogador pode silenciar só pra si no botão de volume.</div>
        </div>,
        document.body
      )}
    </div>
  );
}


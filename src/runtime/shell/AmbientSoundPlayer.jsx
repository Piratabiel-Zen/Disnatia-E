import { onSnapshot } from '../adventure/sharedSnapshot';
import { useEffect,useRef,useState } from "react";
import { createPortal } from "react-dom";
import { doc,getDocFromServer,runTransaction,setDoc } from "firebase/firestore";
import { db } from "../core/firebase";
import { pushToast } from "../core/toast";
const SOUND_CATEGORIES = [
  { id: 'calmaria', label: 'Calmaria', icon: '🌤️', color: '#4ADE80' },
  { id: 'dialogos', label: 'Tristeza', icon: '🌧️', color: '#1EC8FF' },
  { id: 'alegria', label: 'Alegria', icon: '☀️', color: '#FFD86B' },
  { id: 'comico', label: 'Cômico', icon: '🎭', color: '#FF9F43' },
  { id: 'inspiracao', label: 'Inspiração', icon: '✨', color: '#C084FC' },
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
  const [spotifyPlayerOpen, setSpotifyPlayerOpen] = useState(false);
  const iframeRef = useRef(null);
  const lastTs = useRef(0);
  const lastAmbientRevisionRef = useRef(0);
  const [combatActive, setCombatActive] = useState(false);

  useEffect(() => {
    if (current?.provider === 'spotify' && current?.spotifyUri && current?.playing) setSpotifyPlayerOpen(true);
    else setSpotifyPlayerOpen(false);
  }, [current?.provider, current?.spotifyUri, current?.revision, current?.playing]);

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

  const parseMediaLink = (value) => {
    const raw = value.trim();
    const spotify = raw.match(/(?:open\.spotify\.com\/(?:embed\/)?)?(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/i)
      || raw.match(/^spotify:(track|album|playlist|episode|show):([A-Za-z0-9]+)$/i);
    if (spotify) return { provider: 'spotify', spotifyUri: 'spotify:' + spotify[1].toLowerCase() + ':' + spotify[2] };
    const youtube = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    const videoId = youtube ? youtube[1] : raw;
    return videoId ? { provider: 'youtube', videoId } : null;
  };

  const spotifyEmbedSrc = (uri) => {
    const match = String(uri || '').match(/^spotify:(track|album|playlist|episode|show):([A-Za-z0-9]+)$/);
    return match ? 'https://open.spotify.com/embed/' + match[1] + '/' + match[2] + '?utm_source=generator&theme=0' : '';
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
      provider: track.provider || (track.spotifyUri ? 'spotify' : 'youtube'),
      videoId: track.videoId || '',
      spotifyUri: track.spotifyUri || '',
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
      provider: '', videoId: '', spotifyUri: '', nome: '', categoria: '', playing: false,
      ts: now,
      revision: now * 1000 + Math.floor(Math.random() * 1000),
      commandId: 'ambient_stop_' + now + '_' + Math.random().toString(36).slice(2, 9),
    };
    setCurrent(nextAmbient);
    lastTs.current = nextAmbient.commandId;
    setDoc(doc(db, 'config', 'ambient'), nextAmbient).catch(error => console.error('Erro ao parar música:', error));
  };

  const addTrack = async () => {
    const media = parseMediaLink(novoLink);
    if (!media || !novoNome.trim()) return;
    const categoria = activeCategory;
    const nova = { id: Date.now(), nome: novoNome.trim(), ...media };
    const playlistRef = doc(db, 'config', 'ambient_playlists');
    try {
      const updated = await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(playlistRef);
        const latest = snapshot.exists() ? (snapshot.data() || {}) : {};
        const atuais = Array.isArray(latest[categoria]) ? latest[categoria] : [];
        const next = { ...latest, [categoria]: [...atuais, nova] };
        transaction.set(playlistRef, next);
        return next;
      });
      setPlaylists(updated);
      setNovoNome(''); setNovoLink('');
    } catch (error) {
      console.error('Erro ao salvar música na playlist:', error);
      pushToast('Não foi possível salvar a música. Tente novamente.', '⚠️', '#E8193C');
    }
  };

  const deleteTrack = async (categoria, trackId) => {
    const playlistRef = doc(db, 'config', 'ambient_playlists');
    try {
      const updated = await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(playlistRef);
        if (!snapshot.exists()) return {};
        const latest = snapshot.data() || {};
        const atuais = Array.isArray(latest[categoria]) ? latest[categoria] : [];
        const next = { ...latest, [categoria]: atuais.filter(track => String(track.id) !== String(trackId)) };
        transaction.set(playlistRef, next);
        return next;
      });
      setPlaylists(updated);
    } catch (error) {
      console.error('Erro ao excluir música da playlist:', error);
      pushToast('Não foi possível excluir a música. Tente novamente.', '⚠️', '#E8193C');
    }
  };

  const isSpotify = current?.provider === 'spotify' && Boolean(current?.spotifyUri);
  const hasCurrentMedia = Boolean(current?.videoId || current?.spotifyUri);
  const isPlaying = current?.playing && hasCurrentMedia && !userMuted;
  const embedSrc = current?.videoId ? `https://www.youtube.com/embed/${current.videoId}?autoplay=1&loop=1&playlist=${current.videoId}&enablejsapi=1&controls=0` : '';
  const spotifySrc = spotifyEmbedSrc(current?.spotifyUri);
  const volIcon = userMuted ? '🔇' : volume === 0 ? '🔇' : volume < 40 ? '🔈' : volume < 75 ? '🔉' : '🔊';
  const catInfo = SOUND_CATEGORIES.find(c => c.id === current?.categoria);

  return (
    <div className="ambient-topbar-player" style={{ position: 'relative', zIndex: 100, flexShrink: 0 }}>
      {isPlaying && volume > 0 && embedSrc && (
        <div style={{ position: 'fixed', bottom: -400, left: -400, width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
          <iframe key={`${current?.videoId || 'none'}_${current?.revision || current?.ts || 0}`} ref={iframeRef} src={embedSrc} width="1" height="1" allow="autoplay; encrypted-media" onLoad={() => setTimeout(() => sendCmd('setVolume', [volume]), 1800)} />
        </div>
      )}
      {isSpotify && spotifyPlayerOpen && spotifySrc && createPortal(
        <div style={{ position: 'fixed', zIndex: 4800, right: 16, bottom: 'calc(104px + env(safe-area-inset-bottom, 0px))', width: 'min(352px, calc(100vw - 32px))', padding: 8, borderRadius: 14, background: 'rgba(8,10,24,0.98)', border: '1px solid rgba(168,85,247,0.55)', boxShadow: '0 12px 38px rgba(0,0,0,0.65)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 5px 7px', color: '#C4A5FF', font: '11px Cinzel,serif' }}>
            <span>♫ Spotify · {current.nome || 'Reprodução'}</span>
            <button onClick={() => setSpotifyPlayerOpen(false)} aria-label="Fechar player do Spotify" style={{ background: 'none', border: 0, color: '#B9A7CC', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
          <iframe title={`Spotify: ${current.nome || 'música'}`} src={spotifySrc} width="100%" height={/^spotify:(playlist|album|show):/.test(current.spotifyUri) ? 352 : 152} style={{ border: 0, borderRadius: 10, display: 'block' }} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
        </div>,
        document.body
      )}
      {!open && (
        <div className="ambient-topbar-closed" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {current?.videoId && (
            <button onClick={() => setUserMuted(m => !m)} title={userMuted ? 'Ativar som' : 'Silenciar para mim'} className="ambient-mute-button" style={{ width: 36, height: 36, borderRadius: '50%', background: isPlaying ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isPlaying ? 'rgba(74,222,128,0.55)' : 'rgba(255,255,255,0.14)'}`, color: isPlaying ? '#4ADE80' : '#7A6A8A', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter:'none', boxShadow: isPlaying ? '0 0 18px rgba(74,222,128,0.28)' : 'none', transition: 'all 0.3s', animation: isPlaying ? 'pulse 2.5s ease-in-out infinite' : 'none' }}>{volIcon}</button>
          )}
          {hasCurrentMedia && (
            <div className="ambient-track-pill" onClick={() => isSpotify && setSpotifyPlayerOpen(true)} title={isSpotify ? 'Abrir player do Spotify' : undefined} style={{ cursor: isSpotify ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(10,12,28,0.92)', border: `1px solid ${catInfo ? catInfo.color+'44' : 'rgba(74,222,128,0.25)'}`, borderRadius: 24, padding: '6px 14px', backdropFilter:'none', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', maxWidth: 180 }}>
              <span style={{ fontSize: 13 }}>{catInfo?.icon || '🎵'}</span>
              <span style={{ fontSize: 11, color: catInfo?.color || '#4ADE80', fontFamily: 'Cinzel,serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{current.nome || 'Som ambiente'}</span>
              {isPlaying && current?.videoId && (
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
              const isCurrent = current?.playing && (track.spotifyUri ? current?.spotifyUri === track.spotifyUri : current?.videoId === track.videoId);
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
            <input value={novoLink} onChange={e => setNovoLink(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTrack()} placeholder="Link do YouTube ou Spotify..." style={{ width: '100%', fontSize: 12, marginBottom: 8 }} />
            <button onClick={addTrack} disabled={!novoNome.trim() || !novoLink.trim()} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.45)', background: 'rgba(74,222,128,0.12)', color: '#4ADE80', cursor: (novoNome.trim()&&novoLink.trim()) ? 'pointer' : 'not-allowed', fontFamily: 'Cinzel,serif', fontSize: 12, letterSpacing: '0.08em', opacity: (novoNome.trim()&&novoLink.trim()) ? 1 : 0.4 }}>✦ Adicionar à Playlist</button>
          </div>

          {hasCurrentMedia && (
            <button onClick={stopAll} style={{ marginTop: 10, width: '100%', padding: '7px', borderRadius: 8, border: '1px solid rgba(232,25,60,0.3)', background: 'rgba(232,25,60,0.08)', color: '#E8193C', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 11, flexShrink:0 }}>⏹ Parar música para todos</button>
          )}

          <div style={{ marginTop: 10, fontSize: 9, color: '#4A4050', fontFamily: 'Cinzel,serif', lineHeight: 1.6, flexShrink:0 }}>O YouTube sincroniza e toca para todos. No Spotify, cada jogador inicia a reprodução nos controles do player; a faixa selecionada é compartilhada.</div>
        </div>,
        document.body
      )}
    </div>
  );
}


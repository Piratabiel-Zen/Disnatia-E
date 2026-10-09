import MapSheetDock from '../../experience/MapSheetDock';
import { hasIndividualHp, enemyTokenVitals, initializeEnemyToken } from '../../adventure/tokenVitals.mjs';
import { createLeaseTracker } from '../../adventure/tokenLease.mjs';
import { tokenChanges, resolveTokenRoster, tokenOutbox } from '../../adventure/tokenPersistence.mjs';
import { onSnapshot, onSnapshot as liveSnapshot } from '../../adventure/sharedSnapshot';
import { useEffect,useRef,useState } from "react";
import { collection,deleteDoc,doc,getDocFromServer,getDocs,runTransaction,query,serverTimestamp,setDoc,where } from "firebase/firestore";
import { db } from "../../core/firebase";
import { compressImage,compressImagePNG } from "../../core/media";
import { pushToast } from "../../core/toast";
import { CLASSES,ATTRS,SHEET_COLORS,STATUS_LIST,getSheetMaxHp } from "../../data/gameData";
import { hpColor } from "../../core/ui";
import { resolveEquipIcon,HabilidadesPanel,StatusPanel,VigosWithLocked,newSheet } from "../sheets/SheetComponents";
import { FloatingEnemyPanel } from "../../experience/BattleMapEnemySheet.jsx";
import useMapFullscreen from '../../experience/useMapFullscreen';
import { fitMapWithReference } from '../../adventure/mapFit.mjs';
import '../../experience/map-fullscreen.css';
// ─── 🗡️ MAPA DE BATALHA — tipos e estruturas básicas ───────────────────────
// Estas constantes precisam existir antes de BattleMapSection. A ausência delas
// causava ReferenceError ao abrir a aba e deixava a aplicação totalmente branca.
const TOKEN_TYPES = {
  jogador: { label: 'Jogador', color: '#4ADE80', ring: 'rgba(74,222,128,0.6)' },
  inimigo: { label: 'Inimigo', color: '#E8193C', ring: 'rgba(232,25,60,0.6)' },
};
const newToken = id => ({ id, nome: '', foto: '', tipo: 'jogador', x: 50, y: 50, size: 70, locked: false, hp: 0, maxHp: 0, status: {}, rangeMeters: 0, rotation: 0 });
const newBattleMap = id => ({ id, nome: 'Novo Mapa', img: '', tokens: [] });

function EquipMiniList({ sheet, color }) {
  const slots = [
    { key: 'equip_mao_esq', label: 'Mão Esq.' },
    { key: 'equip_mao_dir', label: 'Mão Dir.' },
    { key: 'equip_corpo',   label: 'Corpo' },
  ];
  return (
    <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {slots.map(s => {
        const d = sheet[s.key] || {};
        const icon = resolveEquipIcon(d.tipo || '');
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 7, background: `${color}08`, border: `1px solid ${color}20` }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: 9, color: `${color}99`, fontFamily: 'Cinzel,serif', letterSpacing: '0.04em', flexShrink: 0, minWidth: 46 }}>{s.label}</span>
            <span style={{ fontSize: 11, color: '#C8B8A0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome || '—'}</span>
            {d.dano && <span style={{ fontSize: 10, color: 'rgba(255,200,80,0.85)', fontFamily: 'Cinzel,serif', background: 'rgba(255,200,80,0.08)', border: '1px solid rgba(255,200,80,0.22)', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>⚔ {d.dano}</span>}
          </div>
        );
      })}
    </div>
  );
}

function BattleMapCharPanel({ sheet, customAbilities, onSaveCustomAbilities, onChangeSheet }) {
  const cls = CLASSES.find(c => c.id === sheet.classe) || CLASSES[0];
  const sheetColor = SHEET_COLORS[sheet.classe] || cls.color;
  const f = (k, v) => onChangeSheet({ ...sheet, [k]: v });
  const hp = sheet.hp || 0;
  const hpBonus = sheet.hp_bonus || 0;
  const maxHp = getSheetMaxHp(sheet);
  const attrPoints = sheet.attrPoints || 0;
  const sheetCooldowns = sheet.cooldowns || {};
  const handleUpdateCooldown = (abilityId, turns) => f('cooldowns', { ...sheetCooldowns, [abilityId]: turns });
  const handleSpendPoint = (attrKey, newVal) => {
    if (attrPoints <= 0) return;
    onChangeSheet({ ...sheet, [attrKey]: newVal, attrPoints: attrPoints - 1 });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
        {sheet.foto
          ? <img src={sheet.foto} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', border: `1.5px solid ${sheetColor}55`, flexShrink: 0 }} />
          : <div style={{ width: 36, height: 36, borderRadius: 8, background: `${sheetColor}15`, border: `1.5px dashed ${sheetColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{cls.icon}</div>}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 13, fontWeight: 700, color: sheetColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sheet.nome || 'Sem nome'}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cinzel,serif' }}>{cls.icon} {cls.name} · Nv {sheet.nivel || 1}</div>
        </div>
      </div>

      <EquipMiniList sheet={sheet} color={sheetColor} />

      <div style={{ background: 'rgba(232,25,60,0.06)', border: '1px solid rgba(232,25,60,0.18)', borderRadius: 12, padding: '11px 12px', marginBottom: 12 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.25em', color: '#E8193C', fontFamily: 'Cinzel,serif', marginBottom: 8, textTransform: 'uppercase', textAlign: 'center' }}>❤️ Vida</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
          <button onClick={() => f('hp', Math.max(0, hp - 1))} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(232,25,60,0.4)', background: 'rgba(232,25,60,0.15)', color: '#E8193C', cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: 0 }}>−</button>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 27, fontWeight: 900, color: hpColor(hp, maxHp || 1), minWidth: 44, textAlign: 'center' }}>{hp}</div>
          <button onClick={() => f('hp', Math.min(maxHp, hp + 1))} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.15)', color: '#4ADE80', cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: 0 }}>+</button>
        </div>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[-10, -5].map(v => <button key={v} onClick={() => f('hp', Math.max(0, hp + v))} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(232,25,60,0.3)', background: 'rgba(232,25,60,0.1)', color: '#E8193C', cursor: 'pointer', fontSize: 10 }}>{v}</button>)}
          {[5, 10].map(v => <button key={v} onClick={() => f('hp', Math.min(maxHp, hp + v))} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.1)', color: '#4ADE80', cursor: 'pointer', fontSize: 10 }}>+{v}</button>)}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.25em', color: sheetColor, fontFamily: 'Cinzel,serif', marginBottom: 6, textTransform: 'uppercase' }}>Vigor Cósmico</div>
        <VigosWithLocked value={sheet.vigos || 0} nivel={sheet.nivel || 1} color={sheetColor} onChange={v => f('vigos', v)} />
      </div>

      <StatusPanel sheet={sheet} onChange={onChangeSheet} />

      {attrPoints > 0 && (
        <div style={{ marginBottom: 12, padding: '9px 10px', border: '1px solid rgba(168,85,247,0.5)', borderRadius: 9, background: 'rgba(168,85,247,0.08)', animation: 'bannerGlow 2s ease-in-out infinite', fontSize: 11, color: '#C8A8E8', fontFamily: 'Cinzel,serif', lineHeight: 1.5 }}>
          ✨ {attrPoints} ponto{attrPoints > 1 ? 's' : ''} de atributo disponíve{attrPoints > 1 ? 'is' : 'l'}! Use na aba "Fichas" para distribuir.
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.25em', color: '#5A5070', fontFamily: 'Cinzel,serif', marginBottom: 7, textTransform: 'uppercase' }}>Bônus de Atributos</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {ATTRS.map(a => {
            const bonus = Math.floor((sheet[a.key] || 0) / 2);
            return (
              <div key={a.key} style={{ textAlign: 'center', padding: '7px 4px', borderRadius: 8, background: `${a.color}0D`, border: `1px solid ${a.color}28` }}>
                <div style={{ fontSize: 8, fontFamily: 'Cinzel,serif', color: a.color, letterSpacing: '0.03em', marginBottom: 3, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</div>
                <div style={{ fontSize: 15, fontFamily: 'Cinzel,serif', fontWeight: 700, color: bonus > 0 ? a.color : 'rgba(255,255,255,0.15)' }}>{bonus > 0 ? `+${bonus}` : '—'}</div>
              </div>
            );
          })}
        </div>
      </div>

      {cls.id !== 'personalizado' && (
        <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cls.specials.map((sp, i) => {
            const key = i === 0 ? 'especial1' : 'especial2';
            const unlocked = sheet[key];
            const canUnlock = i === 0 ? sheet.nivel >= 3 : sheet.nivel >= 7;
            return (
              <button key={i} onClick={() => f(key, !unlocked)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 7, border: `1px solid ${unlocked ? sheetColor + '55' : 'rgba(255,255,255,0.09)'}`, background: unlocked ? `${sheetColor}14` : 'rgba(255,255,255,0.02)', cursor: canUnlock ? 'pointer' : 'not-allowed', opacity: canUnlock ? 1 : 0.5, transition: 'all 0.2s', textAlign: 'left' }}>
                <span style={{ fontSize: 11 }}>{unlocked ? '✦' : '○'}</span>
                <div>
                  <div style={{ fontSize: 10.5, color: unlocked ? sheetColor : '#6A5A6A', fontFamily: 'Cinzel,serif' }}>{sp.name}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)' }}>Nível {sp.req}+</div>
                </div>
              </button>
            );
          })}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 7, border: `1px solid ${sheetColor}33`, background: `${sheetColor}0A` }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'Cinzel,serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Alcance</span>
            <span style={{ fontSize: 13, fontFamily: 'Cinzel,serif', color: sheetColor, fontWeight: 700 }}>{cls.alcance}</span>
          </div>
        </div>
      )}

      <HabilidadesPanel
        cls={cls}
        sheet={sheet}
        customAbilities={customAbilities || []}
        masterMode={false}
        onSaveCustomAbilities={onSaveCustomAbilities}
        sheetCooldowns={sheetCooldowns}
        onUpdateCooldown={handleUpdateCooldown}
        currentVigos={sheet.vigos ?? 0}
        onSpendVC={(cost, abilityId, turns) => onChangeSheet({ ...sheet, vigos: Math.max(0, (sheet.vigos ?? 0) - cost), cooldowns: { ...(sheet.cooldowns || {}), ...(turns > 0 ? { [abilityId]: turns } : {}) } })}
        characterName={sheet.nome || 'Personagem'}
      />

      </div>
  );
}

function BattleMapSection({ masterMode, playerSheetId, access }) {
  const [maps, setMaps] = useState([]);
  // BATTLEMAP ORIGINAL QUALITY 2026-09-12
  const [originalMapImages, setOriginalMapImages] = useState({});
  const sortBattleMaps = rows => [...(rows || [])].sort((a,b) => {
    const ao=Number(a?.order), bo=Number(b?.order);
    const ah=Number.isFinite(ao)&&ao>0, bh=Number.isFinite(bo)&&bo>0;
    if(ah&&bh&&ao!==bo)return ao-bo;
    if(ah!==bh)return ah?-1:1;
    return String(a?.id||'').localeCompare(String(b?.id||''),'pt-BR',{numeric:true});
  });
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [draggingId, setDraggingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formTipo, setFormTipo] = useState('jogador');
  const [formFoto, setFormFoto] = useState('');
  const [formSheetId, setFormSheetId] = useState('');
  const [formEnemyId, setFormEnemyId] = useState('');
  const [showMapNameEdit, setShowMapNameEdit] = useState(false);
  const [zoom, setZoom] = useState(1);
  const mapScreen=useMapFullscreen();
  const [baseSize, setBaseSize] = useState({ w: 0, h: 0 });
  const frameRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0, pointerId: null });
  const naturalSizeRef = useRef({ w: 0, h: 0 });
  const normalFrameRef = useRef(null);
  const recomputeFit = () => {
    const frame = frameRef.current;
    const nat = naturalSizeRef.current;
    if (!frame || !nat.w || !nat.h) return;
    const frameW = frame.clientWidth;
    const frameH = frame.clientHeight;
    if (!frameW || !frameH) return;
    // Ajusta a imagem inteira dentro da área disponível, sem cortar as bordas.
    if (!document.documentElement.classList.contains('dinastia-map-fullscreen')) {
      normalFrameRef.current = { w: frameW, h: frameH };
    }
    setBaseSize(fitMapWithReference(nat, { w: frameW, h: frameH }, normalFrameRef.current));
  };
  const handleMapImgLoad = (e) => {
    naturalSizeRef.current = { w: e.target.naturalWidth, h: e.target.naturalHeight };
    recomputeFit();
  };
  const mapRef = useRef(null);
  const fileRef = useRef(null);
  const tokenFileRef = useRef(null);
  const moved = useRef(false);
  // REMOTE TOKEN LEASE 2026-09-19
  const draggingIdRef = useRef(null);
  const tokenInteractionRef = useRef({ id: null, pointerId: null });
  const remoteTokenLeaseRef = useRef({});
  useEffect(()=>{ draggingIdRef.current = draggingId; },[draggingId]);
  const mapsRef = useRef([]);
  const saveTimeout = useRef({});
  const lastTokenWriteRef = useRef({});

  const [sheets, setSheets] = useState([]);
  const [sheetVitals, setSheetVitals] = useState({});
  const [customAbilities, setCustomAbilities] = useState({});
  const [floatingSheets, setFloatingSheets] = useState([]); // {sheetId, x, y, z}
  const [enemies, setEnemies] = useState([]);
  const [floatingEnemies, setFloatingEnemies] = useState([]); // {enemyId, x, y, z}
  const zTopRef = useRef(60);
  const [unlockedIds, setUnlockedIds] = useState({});
  const [pwTarget, setPwTarget] = useState(null);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [mapTokens, setMapTokens] = useState({});
  const [, setTokenSyncRevision] = useState(0);
  useEffect(() => tokenOutbox.subscribe(() => setTokenSyncRevision(value => value + 1)), []); // { [mapId]: tokens[] }
  const [fogByMap, setFogByMap] = useState({});
  const [fogMode, setFogMode] = useState('off'); // off | add | erase
  const [fogBrush, setFogBrush] = useState(12);
  const fogDrawingRef = useRef(false);
  const fogSaveTimerRef = useRef(null);
  const [tokenLibrary, setTokenLibrary] = useState([]);
  const [showTokenLibrary, setShowTokenLibrary] = useState(false);
  const [rulerMode, setRulerMode] = useState(false);
  const [pingMode, setPingMode] = useState(false);
  const [tokenControllers,setTokenControllers]=useState({});
  const [claimingToken,setClaimingToken]=useState('');
  const leaseTrackerRef=useRef(createLeaseTracker());
  const leaseTimersRef=useRef(new Map());
  const localLeaseRef=useRef(null);
  const claimRef=useRef(false);
  const mountedMapRef=useRef(true);
  const mapIdentityRef=useRef('');
  const PING_META = {
    look:{label:'Olhe aqui',icon:'◎',color:'#b99ad9'},
    danger:{label:'Perigo',icon:'⚠',color:'#ef5872'},
    attack:{label:'Atacar',icon:'⚔',color:'#ff8a62'},
    move:{label:'Mover',icon:'➜',color:'#68d5ff'},
  };
  const [pingType, setPingType] = useState('look');
  const [battlePing, setBattlePing] = useState(null);
  const pingTimerRef = useRef(null);
  const [ruler, setRuler] = useState(null);
  const [pixelsPerMeter, setPixelsPerMeter] = useState(70);
  const [floatingEffects, setFloatingEffects] = useState([]);
  const rulerDrawingRef = useRef(false);

  useEffect(() => {
    const onPingType = event => {
      const type = String(event?.detail?.type || 'look');
      if (['look','danger','attack','move'].includes(type)) setPingType(type);
    };
    window.addEventListener('dinastia:ping-type', onPingType);
    return () => window.removeEventListener('dinastia:ping-type', onPingType);
  }, []);

  useEffect(() => {
    const subscribedAt = Date.now();
    let configPrimed = false;
    let feedPrimed = false;
    const seenPingIds = new Set();

    const remember = id => {
      if (!id) return;
      seenPingIds.add(id);
      if (seenPingIds.size > 80) {
        const recent = Array.from(seenPingIds).slice(-40);
        seenPingIds.clear();
        recent.forEach(value => seenPingIds.add(value));
      }
    };

    const isFreshAtSubscribe = row => {
      const createdAt = Number(row?.publishedAt || row?.createdAt || 0);
      if (!createdAt) return false;
      const age = subscribedAt - createdAt;
      return age >= -30000 && age <= 6500;
    };

    const receivePing = row => {
      const id = String(row?.id || '');
      if (!id || seenPingIds.has(id)) return;
      remember(id);
      setBattlePing(row);
      clearTimeout(pingTimerRef.current);
      pingTimerRef.current = setTimeout(() => setBattlePing(null), 5200);
    };

    // Assinaturas diretas: ações efêmeras nunca reutilizam um snapshot guardado
    // por outra montagem da tela.
    const uConfig = liveSnapshot(doc(db,'config','battlemap_ping'), snap => {
      if (!snap.exists()) return;
      const row = snap.data() || {};
      if (!configPrimed) {
        configPrimed = true;
        if (isFreshAtSubscribe(row)) receivePing(row);
        else remember(String(row.id || ''));
        return;
      }
      receivePing(row);
    }, error => console.error('Erro no canal direto do ping:', error));

    const uFeed = liveSnapshot(collection(db,'battlemap_ping_live'), snap => {
      if (!feedPrimed) {
        feedPrimed = true;
        const initialRows = snap.docs.map(entry => entry.data() || {});
        const freshest = initialRows
          .filter(isFreshAtSubscribe)
          .sort((a, b) => Number(b.publishedAt || b.createdAt || 0) - Number(a.publishedAt || a.createdAt || 0))[0];
        initialRows.forEach(row => {
          if (!freshest || String(row.id || '') !== String(freshest.id || '')) remember(String(row.id || ''));
        });
        if (freshest) receivePing(freshest);
        return;
      }
      snap.docChanges().forEach(change => {
        if (change.type !== 'removed') receivePing(change.doc.data() || {});
      });
    }, error => console.error('Erro no canal direto rápido do ping:', error));

    return () => {
      uConfig();
      uFeed();
      clearTimeout(pingTimerRef.current);
    };
  }, []);

  useEffect(() => { mapsRef.current = maps; }, [maps]);
  const mapTokensRef = useRef({});
  const canonicalRosterReadyRef = useRef(false);
  const addingLibraryTokenRef = useRef(false);
  const liveTokenVersionRef = useRef({});
  // Canal ultraleve por token: transmite somente x/y durante o arraste.
  // Isso evita regravar o array completo de tokens a cada movimento do mouse.
  const livePositionVersionRef = useRef({});
  const liveClientIdRef = useRef(`client_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const liveSequenceRef = useRef(0);
  const livePositionWriteStateRef = useRef({});
  const remotePositionQueueRef = useRef(new Map());
  const remotePositionFrameRef = useRef(0);
  const authoritativePositionRef = useRef({});
  const authoritativeRotationRef = useRef({});
  const remoteMotionVersionRef = useRef({});
  const rotationLastWriteRef = useRef({});
  const rotationPointerRef = useRef({ tokenId: null, element: null });
  const [rotatingId, setRotatingId] = useState(null);
  const activeMapRevisionRef = useRef(0);

  const mergeIncomingTokenState = (mapId, incomingTokens, previousTokens = []) => {
    const id = String(mapId);
    const prevById = new Map((previousTokens || []).map(token => [String(token.id), token]));
    return (incomingTokens || []).map(token => {
      const tid = String(token.id);
      const live = authoritativePositionRef.current[`${id}:${tid}`];
      const previous = prevById.get(tid);
      const liveRotation = authoritativeRotationRef.current[`${id}:${tid}`];
      const rotationPatch = Number.isFinite(liveRotation) ? { rotation: liveRotation } : {};
      if (live && Number.isFinite(live.x) && Number.isFinite(live.y)) {
        return { ...token, x: live.x, y: live.y, ...rotationPatch };
      }
      if (previous && Number.isFinite(Number(previous.x)) && Number.isFinite(Number(previous.y))) {
        return { ...token, x: Number(previous.x), y: Number(previous.y), ...rotationPatch };
      }
      return Number.isFinite(liveRotation) ? { ...token, rotation: liveRotation } : token;
    });
  };

  useEffect(() => { mapTokensRef.current = mapTokens; }, [mapTokens]);

  useEffect(() => {
    setZoom(1);
    recomputeFit();
    const t = setTimeout(recomputeFit, 150);
    window.addEventListener('resize', recomputeFit);
    return () => { clearTimeout(t); window.removeEventListener('resize', recomputeFit); };
  }, [editingId, activeId, masterMode]);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'battlemaps'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMaps(sortBattleMaps(data)); setLoaded(true);
    });
    const u1b = liveSnapshot(collection(db, 'battlemap_tokens'), { includeMetadataChanges: true }, snap => {
      if (snap.metadata?.fromCache && canonicalRosterReadyRef.current) return;
      if (!snap.metadata?.fromCache) canonicalRosterReadyRef.current = true;
      const incoming = {};
      const records = {};
      const deletedByMap = {};
      snap.docs.forEach(entry => {
        const data = entry.data() || {};
        if (data.recordType === 'token-v2' && data.mapId != null && data.tokenId != null) {
          (records[String(data.mapId)] ||= []).push(data);
          if (!entry.metadata.hasPendingWrites && !entry.metadata.fromCache) tokenOutbox.acknowledge(data);
        } else if (Array.isArray(data.tokens)) {
          deletedByMap[String(entry.id)] = (data.deletedTokenIds || []).map(String);
          incoming[String(entry.id)] = data.tokens.filter(token => !(data.deletedTokenIds || []).map(String).includes(String(token.id)));
        }
      });
      setMapTokens(prev => {
        const next = { ...prev };
        for (const mapId of new Set([...Object.keys(prev), ...Object.keys(incoming), ...Object.keys(records)])) {
          // Previous render/boot data supplies positions only, never roster membership.
          // The complete canonical snapshot and explicit pending edits own the count.
          const legacy = (incoming[mapId] || []).filter(token => !(deletedByMap[mapId] || []).includes(String(token.id)));
          const tokens = resolveTokenRoster(legacy, records[mapId] || [], tokenOutbox.operations(mapId));
          next[mapId] = mergeIncomingTokenState(mapId, tokens, prev[mapId] || []);
        }
        mapTokensRef.current = next;
        return next;
      });
    }, error => console.error('Erro no realtime canônico dos tokens:', error));
    // Canal leve de sincronização ao vivo. O documento contém apenas o mapa ativo
    // e as posições dos tokens, sem carregar novamente a imagem do mapa.
    // Historical battlemap_live_tokens is not a roster authority. Movement stays
    // on battlemap_live_positions; archived boot arrays can contain removed copies.

    const activeMapRef = doc(db, 'config', 'battlemap_active');
    const applyActiveMap = (data) => {
      // A ordem de snapshots do Firestore é a autoridade. Nunca rejeitar uma
      // troca de mapa por revision/updatedAt produzidos em outro computador.
      setActiveId(data?.activeId || '');
    };
    const u2 = onSnapshot(activeMapRef, snap => {
      if (snap.exists()) applyActiveMap(snap.data());
    }, err => console.error('Erro ao sincronizar mapa ativo:', err));
    const u3 = onSnapshot(access?.role==='visitor'?query(collection(db,'sheets'),where('visitorId','==',String(access.visitorId||'invalid'))):collection(db,'sheets'), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const vitals = {};
      all.forEach(s => { vitals[String(s.id)] = { id:String(s.id), nome:s.nome||'', foto:s.foto||'', classe:s.classe||'', hp:Number(s.hp||0), maxHp:getSheetMaxHp(s) }; });
      setSheetVitals(vitals);
      setSheets(!masterMode && playerSheetId ? all.filter(s => String(s.id) === String(playerSheetId)) : all);
    });
    const u4 = onSnapshot(doc(db, 'config', 'customAbilities'), snap => {
      if (snap.exists()) setCustomAbilities(snap.data() || {});
    });
    const uEnemies = onSnapshot(collection(db, 'enemies'), snap => {
      setEnemies(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    });
    const uFog = onSnapshot(collection(db, 'battlemap_fog'), snap => {
      const next = {};
      snap.docs.forEach(d => { next[String(d.id)] = Array.isArray(d.data()?.patches) ? d.data().patches : []; });
      setFogByMap(next);
    });
    const uLibrary = onSnapshot(collection(db, 'battlemap_token_library'), snap => {
      setTokenLibrary(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    });
    const uFx = onSnapshot(doc(db,'config','battlemap_effect'), snap => {
      if(!snap.exists()) return; const fx=snap.data();
      if(!fx?.id || Date.now()-(fx.ts||0)>5000) return;
      setFloatingEffects(prev=>[...prev.filter(x=>x.id!==fx.id),fx]);
      setTimeout(()=>setFloatingEffects(prev=>prev.filter(x=>x.id!==fx.id)),2800);
    });
    return () => { u1(); u1b(); u2(); u3(); u4(); uEnemies(); uFog(); uLibrary(); uFx(); };
  }, []);


  useEffect(()=>{
    if(maps.length) try{localStorage.setItem('dinastia_cache_battlemaps',JSON.stringify(maps));}catch(_){}
  },[maps]);
  useEffect(()=>{
    if(sheets.length) try{localStorage.setItem('dinastia_cache_sheets',JSON.stringify(sheets));}catch(_){}
  },[sheets]);
  useEffect(()=>{
    if(loaded || maps.length) return;
    try{const cached=JSON.parse(localStorage.getItem('dinastia_cache_battlemaps')||'[]');if(cached.length){setMaps(cached);setLoaded(true);}}catch(_){}
  },[loaded,maps.length]);

  useEffect(() => {
    if (!masterMode) return;
    if (!editingId && activeId) setEditingId(activeId);
    if (!editingId && !activeId && maps.length > 0) setEditingId(maps[0].id);
  }, [masterMode, activeId, maps, editingId]);

  const currentMapId = masterMode ? (editingId || activeId) : activeId;
  mapIdentityRef.current=String(currentMapId);
  const currentMapRaw = maps.find(m => String(m.id) === String(currentMapId));
  const currentOriginalImage = currentMapRaw ? originalMapImages[String(currentMapRaw.id)] : '';
  const currentMap = currentMapRaw ? { ...currentMapRaw, img: currentOriginalImage || currentMapRaw.img || '', tokens: resolveTokenRoster(mapTokens[String(currentMapRaw.id)] || [], [], tokenOutbox.operations(currentMapRaw.id)) } : null;

  // O Firestore limita cada documento a ~1 MiB. O preview continua no documento do mapa,
  // mas a imagem original é dividida em chunks separados e remontada sem recompressão
  // somente para o mapa aberto. Assim o battlemap exibe exatamente os pixels importados.
  useEffect(() => {
    const mapId = String(currentMapId || '');
    const uploadId = String(currentMapRaw?.imgUploadId || '');
    const chunkCount = Number(currentMapRaw?.imgChunkCount || 0);
    if (!mapId || !uploadId || !chunkCount) return;
    const chunksQuery = query(collection(db, 'battlemap_media_chunks'), where('mapId', '==', mapId));
    return onSnapshot(chunksQuery, snap => {
      const chunks = [];
      snap.docs.forEach(d => {
        const row = d.data() || {};
        if (String(row.uploadId || '') !== uploadId) return;
        const index = Number(row.index);
        if (!Number.isInteger(index) || index < 0 || index >= chunkCount || typeof row.data !== 'string') return;
        chunks[index] = row.data;
      });
      if (chunks.length < chunkCount) return;
      const ordered = Array.from({ length: chunkCount }, (_, index) => chunks[index] || '');
      if (ordered.some(chunk => !chunk)) return;
      const original = ordered.join('');
      setOriginalMapImages(prev => prev[mapId] === original ? prev : { ...prev, [mapId]: original });
    }, err => console.error('Erro ao carregar imagem original do mapa:', err));
  }, [currentMapId, currentMapRaw?.imgUploadId, currentMapRaw?.imgChunkCount]);

  // Escuta somente as posições do mapa aberto. Canal low-latency em slots por token.
  useEffect(() => {
    if (!currentMapId) return;
    remotePositionQueueRef.current.clear();
    if (remotePositionFrameRef.current) cancelAnimationFrame(remotePositionFrameRef.current);
    remotePositionFrameRef.current = 0;

    const flushRemotePositions = () => {
      remotePositionFrameRef.current = 0;
      if (!remotePositionQueueRef.current.size) return;
      const patchMap = new Map(remotePositionQueueRef.current);
      remotePositionQueueRef.current.clear();

      setMapTokens(prev => {
        const currentTokens = prev[String(currentMapId)] || [];
        let changed = false;
        const nextTokens = currentTokens.map(token => {
          const patch = patchMap.get(String(token.id));
          if (!patch) return token;
          const hasPosition = Number.isFinite(patch.x) && Number.isFinite(patch.y);
          const hasRotation = Number.isFinite(patch.rotation);
          const sameX = !hasPosition || Math.abs(Number(token.x || 0) - patch.x) < 0.00001;
          const sameY = !hasPosition || Math.abs(Number(token.y || 0) - patch.y) < 0.00001;
          const sameRotation = !hasRotation || Math.abs(Number(token.rotation || 0) - patch.rotation) < 0.01;
          if (sameX && sameY && sameRotation) return token;
          changed = true;
          return {
            ...token,
            ...(hasPosition ? { x: patch.x, y: patch.y } : {}),
            ...(hasRotation ? { rotation: patch.rotation } : {}),
          };
        });
        if (!changed) return prev;
        const next = { ...prev, [String(currentMapId)]: nextTokens };
        mapTokensRef.current = next;
        return next;
      });
    };

    const scheduleRemoteFlush = () => {
      if (remotePositionFrameRef.current) return;
      remotePositionFrameRef.current = requestAnimationFrame(flushRemotePositions);
    };

    const acceptPositionVersion = (tokenId, data) => {
      const key = String(currentMapId) + ':' + String(tokenId);
      const source = String(data.motionSession || data.clientId || 'legacy');
      const seq = Number(data.seq || 0);
      const updatedAt = Number(data.updatedAt || 0);
      const previous = remoteMotionVersionRef.current[key];

      if (previous && source === previous.source && seq && previous.seq && seq <= previous.seq) return false;
      remoteMotionVersionRef.current[key] = { source, seq, updatedAt, receivedAt: performance.now() };
      return true;
    };

    const positionsQuery = query(collection(db, 'battlemap_live_positions'), where('mapId', '==', String(currentMapId)));
    // Movimento usa transporte direto, como o dado 3D compartilhado.
    const unsub = liveSnapshot(positionsQuery, snap => {
      const orderedPositionChanges = snap.docChanges()
        .filter(change => change.type !== 'removed')
        .filter(change => {
          const row = change.doc.data() || {};
          const channel = String(row.channel || '');
          if (channel !== 'motion-v2' && channel !== 'position-final-v1' && channel !== 'control-lease-v1') return false;
          if (/_p[3-5]$/.test(change.doc.id)) return false;
          return true;
        })
        .sort((a, b) => {
          const aFinal = String((a.doc.data() || {}).channel || '') === 'position-final-v1' ? 1 : 0;
          const bFinal = String((b.doc.data() || {}).channel || '') === 'position-final-v1' ? 1 : 0;
          return aFinal - bFinal;
        });
      orderedPositionChanges.forEach(change => {
        if (change.type === 'removed') return;
        const data = change.doc.data() || {};
        if (String(data.mapId) !== String(currentMapId) || data.tokenId === undefined) return;

        // O token local já acompanha o ponteiro imediatamente. Ignorar o próprio
        // eco impede o ACK remoto de disputar com a posição da mão do jogador.
        const tokenId = String(data.tokenId);
        if(data.channel==='control-lease-v1'){
          const leaseKey=String(currentMapId)+':'+tokenId;
          leaseTrackerRef.current.observe(leaseKey,data);
          clearTimeout(leaseTimersRef.current.get(leaseKey));
          const owner=leaseTrackerRef.current.owner(leaseKey,String(liveClientIdRef.current));
          setTokenControllers(previous=>({...previous,[tokenId]:owner?owner.name||'Outro participante':''}));
          if(owner)leaseTimersRef.current.set(leaseKey,setTimeout(()=>setTokenControllers(previous=>({...previous,[tokenId]:''})),6500));
          return;
        }
        const remoteClientId = String(data.clientId || '');
        const ownClientId = String(liveClientIdRef.current);
        if (remoteClientId && remoteClientId !== ownClientId && String(data.channel || '') === 'motion-v2') {
          remoteTokenLeaseRef.current[String(currentMapId) + ':' + tokenId] = { clientId: remoteClientId, until: Date.now() + 1200 };
        }
        if (remoteClientId === ownClientId) return;
        // Enquanto este cliente arrasta o token, snapshots de outro cliente nunca
        // disputam o mesmo estado React. Após o pointerup o próximo snapshot remoto
        // volta a ser aceito normalmente.
        if (String(draggingIdRef.current || '') === tokenId) return;
        const currentPatch = remotePositionQueueRef.current.get(tokenId) || {};
        const nextPatch = { ...currentPatch };
        let changed = false;

        const x = Number(data.x);
        const y = Number(data.y);
        if (Number.isFinite(x) && Number.isFinite(y) && acceptPositionVersion(tokenId, data)) {
          authoritativePositionRef.current[String(currentMapId) + ':' + tokenId] = { x, y };
          nextPatch.x = x;
          nextPatch.y = y;
          changed = true;
        }

        const rotation = Number(data.rotation);
        if (Number.isFinite(rotation)) {
          const normalizedRotation = ((rotation % 360) + 360) % 360;
          authoritativeRotationRef.current[String(currentMapId) + ':' + tokenId] = normalizedRotation;
          nextPatch.rotation = normalizedRotation;
          changed = true;
        }

        if (changed) remotePositionQueueRef.current.set(tokenId, nextPatch);
      });
      if (remotePositionQueueRef.current.size) scheduleRemoteFlush();
    }, err => console.error('Erro no canal low-latency do mapa atual:', err));

    return () => {
      unsub();
      if (remotePositionFrameRef.current) cancelAnimationFrame(remotePositionFrameRef.current);
      remotePositionFrameRef.current = 0;
      remotePositionQueueRef.current.clear();
    };
  }, [currentMapId]);

  // Ao recuperar a internet, retornar à aba ou trocar de mapa, busca uma cópia
  // diretamente do servidor para impedir que algum jogador permaneça em estado antigo.
  useEffect(() => {
    if (!activeId) return;
    const refreshActiveState = async () => {
      try {
        const [mapSnap, activeSnap] = await Promise.all([
          getDocFromServer(doc(db, 'battlemaps', String(activeId))),
          getDocFromServer(doc(db, 'config', 'battlemap_active')),
        ]);
        if (activeSnap.exists()) {
          const d = activeSnap.data();
          setActiveId(d.activeId || '');
        }
        if (mapSnap.exists()) setMaps(prev => {
          const map = { id: mapSnap.id, ...mapSnap.data() };
          return prev.some(m => String(m.id) === String(map.id)) ? prev.map(m => String(m.id) === String(map.id) ? map : m) : [...prev, map];
        });

      } catch (_) {}
    };
    refreshActiveState();
    const onVisible = () => { if (document.visibilityState === 'visible') refreshActiveState(); };
    window.addEventListener('online', refreshActiveState);
    window.addEventListener('focus', refreshActiveState);
    document.addEventListener('visibilitychange', onVisible);
    const realtimeHealthPulse = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) refreshActiveState();
    }, 8000);
    return () => { clearInterval(realtimeHealthPulse); window.removeEventListener('online', refreshActiveState); window.removeEventListener('focus', refreshActiveState); document.removeEventListener('visibilitychange', onVisible); };
  }, [activeId]);

  // Referências estáveis evitam que o listener da roda seja recriado a cada mudança de zoom.
  const zoomRef = useRef(1);
  const currentMapRef = useRef(null);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { currentMapRef.current = currentMap; }, [currentMap]);

  // Listener nativo e explicitamente não passivo. Isso evita erros de preventDefault
  // em alguns navegadores e impede que a aba do mapa derrube toda a aplicação.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !currentMap?.img) return;

    const onWheel = (e) => {
      e.preventDefault();
      const map = currentMapRef.current;
      if (!map?.img) return;

      const oldZoom = zoomRef.current;
      const direction = e.deltaY < 0 ? 1 : -1;
      const step = 0.18;
      const nextZoom = Math.max(1, Math.min(4, Number((oldZoom + direction * step).toFixed(2))));
      if (nextZoom === oldZoom) return;

      const rect = frame.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const contentX = frame.scrollLeft + cursorX;
      const contentY = frame.scrollTop + cursorY;
      const ratio = nextZoom / oldZoom;

      zoomRef.current = nextZoom;
      setZoom(nextZoom);

      requestAnimationFrame(() => {
        const updatedFrame = frameRef.current;
        if (!updatedFrame) return;
        if (nextZoom <= 1) {
          updatedFrame.scrollLeft = 0;
          updatedFrame.scrollTop = 0;
          return;
        }
        updatedFrame.scrollLeft = contentX * ratio - cursorX;
        updatedFrame.scrollTop = contentY * ratio - cursorY;
      });
    };

    frame.addEventListener('wheel', onWheel, { passive: false });
    return () => frame.removeEventListener('wheel', onWheel);
  }, [currentMapId, currentMap?.img]);

  // Arraste do mapa ampliado: clique em uma área vazia e puxe em qualquer direção.
  // Os tokens usam stopPropagation, portanto continuam sendo arrastados normalmente.
  const onMapPanStart = (e) => {
    const frame = frameRef.current;
    if (!frame || zoomRef.current <= 1 || e.button > 1) return;
    e.preventDefault();
    panStartRef.current = {
      x: e.clientX, y: e.clientY,
      scrollLeft: frame.scrollLeft, scrollTop: frame.scrollTop,
      pointerId: e.pointerId,
    };
    setIsPanning(true);
    try { frame.setPointerCapture(e.pointerId); } catch (_) {}
  };

  const onMapPanMove = (e) => {
    if (!isPanning) return;
    const frame = frameRef.current;
    if (!frame) return;
    e.preventDefault();
    const start = panStartRef.current;
    frame.scrollLeft = start.scrollLeft - (e.clientX - start.x);
    frame.scrollTop = start.scrollTop - (e.clientY - start.y);
  };

  const endMapPan = (e) => {
    if (!isPanning) return;
    const frame = frameRef.current;
    setIsPanning(false);
    if (frame && e?.pointerId != null) {
      try { frame.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  };

  const rulerPoint = e => {
    const el=mapRef.current;if(!el)return null;const r=el.getBoundingClientRect();return {x:Math.max(0,Math.min(100,((e.clientX-r.left)/r.width)*100)),y:Math.max(0,Math.min(100,((e.clientY-r.top)/r.height)*100))};
  };
  const startRuler = e => { if(!rulerMode)return; e.stopPropagation(); e.preventDefault(); const p=rulerPoint(e); if(!p)return; rulerDrawingRef.current=true; setRuler({start:p,end:p}); };
  const moveRuler = e => { if(!rulerMode||!rulerDrawingRef.current)return; const p=rulerPoint(e); if(p)setRuler(r=>r?{...r,end:p}:r); };
  const endRuler = () => { rulerDrawingRef.current=false; };
  const ownPingSheet = !masterMode && playerSheetId ? sheetVitals[String(playerSheetId)] : null;
  const ownPingClass = ownPingSheet?.classe || '';
  const ownPingClassDef = CLASSES.find(c => c.id === ownPingClass);
  const ownPingColor = masterMode ? '#D6A7FF' : (SHEET_COLORS[ownPingClass] || ownPingClassDef?.color || '#A855F7');
  const ownPingName = masterMode ? 'Mestre' : (ownPingSheet?.nome || 'Jogador');
  const sendMapPing = async e => {
    const pingMeta = PING_META[pingType] || PING_META.look;
    if (!pingMode || !currentMap) return;
    e.preventDefault(); e.stopPropagation();
    const point = rulerPoint(e);
    if (!point) return;
    const ping = {
      id: `ping_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      mapId: String(currentMap.id), x: point.x, y: point.y,
      color: ownPingColor, name: ownPingName, sheetId: String(playerSheetId || ''),
      role: masterMode ? 'master' : 'player', type: pingType, pingLabel: pingMeta.label, icon: pingMeta.icon, createdAt: Date.now(),
    };
    setBattlePing(ping);
    setPingMode(false);
    clearTimeout(pingTimerRef.current);
    pingTimerRef.current = setTimeout(() => setBattlePing(null), 5200);
    const pingSlot = Math.floor(Math.random() * 8);
    Promise.allSettled([
      setDoc(doc(db,'config','battlemap_ping'), ping),
      setDoc(doc(db,'battlemap_ping_live','slot_' + pingSlot), { ...ping, publishedAt: Date.now() }, { merge: true }),
    ]).then(results => {
      if (results.every(result => result.status === 'rejected')) console.error('Erro ao enviar ping no mapa pelos canais realtime.');
    });
  };

  const persistMap = (mapId, data) => {
    const { tokens, ...meta } = data;
    clearTimeout(saveTimeout.current[mapId]);
    saveTimeout.current[mapId] = setTimeout(async () => {
      try { await setDoc(doc(db, 'battlemaps', String(mapId)), meta); } catch (e) { console.error(e); }
    }, 450);
  };

  // Tokens ficam em documento à parte (leve) — grava quase instantaneamente, sem carregar a imagem junto
  // BATTLEMAP DURABLE POSITION COMMIT 2026-09-14
  const writeLiveTokens = async (mapId, tokens, persistArchive = false, removedIds = []) => {
    if (!persistArchive) return true;
    const write = (key, record) => {
      const controlsPosition=['x','y','rotation'].some(field=>record.token[field]!==undefined)&&!!localLeaseRef.current;
      const positionOwner=String(liveClientIdRef.current);
      const baseline = (mapTokensRef.current[record.mapId] || []).find(token => String(token.id) === record.tokenId) || {};
      return runTransaction(db, async transaction => {
        const ref = doc(db, 'battlemap_tokens', key);
        const snapshot = await transaction.get(ref);
        if(controlsPosition){
          const lease=await transaction.get(doc(db,'battlemap_live_positions',String(record.mapId)+'_'+String(record.tokenId)+'_lease'));
          if(lease.exists()&&lease.data().clientId!==positionOwner){const error=new Error('Outro participante assumiu este token. A posição anterior não foi reaplicada.');error.code='token-control-lost';throw error;}
        }
        // First touch copies the legacy token once; later writes carry only the
        // changed fields, so movement never resends all other tokens or photos.
        const token = !snapshot.exists() && !record.deleted ? { ...baseline, ...record.token } : record.token;
        transaction.set(ref, { ...record, token }, { merge: true });
      });
    };
    try {
      await Promise.all([
        ...tokens.map(token => tokenOutbox.enqueue(mapId, token.id, token, false, write)),
        ...removedIds.map(id => tokenOutbox.enqueue(mapId, id, { id }, true, write)),
      ]);
    } catch (error) {
      console.error('battlemap-token-write-failed', { mapId: String(mapId), code: error?.code, message: error?.message });
      pushToast('Token ainda não salvo. A tentativa permanece no mapa; use Tentar novamente.', '\u26A0', '#E8A020');
      throw error;
    }
    return true;
  };

  const writeLivePosition = (mapId, tokenId, x, y) => {
    const id = String(mapId);
    const tid = String(tokenId);
    const key = id + ':' + tid;
    const px = Math.round(Number(x) * 1000) / 1000;
    const py = Math.round(Number(y) * 1000) / 1000;
    if (!Number.isFinite(px) || !Number.isFinite(py)) return;

    authoritativePositionRef.current[key] = { x: px, y: py };
    const state = livePositionWriteStateRef.current[key] || {
      inFlight: 0,
      pending: null,
      motionSession: String(liveClientIdRef.current) + '_' + Date.now().toString(36),
    };
    livePositionWriteStateRef.current[key] = state;
    state.pending = { x: px, y: py };

    const flushLatest = () => {
      if (!state.pending || state.inFlight >= 1) return;
      const point = state.pending;
      state.pending = null;
      state.inFlight += 1;
      liveSequenceRef.current += 1;
      const seq = liveSequenceRef.current;
      const slot = seq % 3;

      setDoc(doc(db, 'battlemap_live_positions', id + '_' + tid + '_p' + slot), {
        mapId: id,
        tokenId: tid,
        x: point.x,
        y: point.y,
        seq,
        motionSession: state.motionSession,
        channel: 'motion-v2',
        clientId: liveClientIdRef.current,
        actorName:masterMode?'Mestre':ownPingName||'Jogador',
        updatedAt: Date.now(),
      }, { merge: true })
        .catch(e => console.error('Erro ao transmitir posição low-latency:', e))
        .finally(() => {
          state.inFlight = Math.max(0, state.inFlight - 1);
          if (state.pending) queueMicrotask(flushLatest);
        });
    };

    flushLatest();
  };

  const commitCanonicalTokenPosition = async (mapId, token) => {
    const id = String(mapId);
    const tid = String(token?.id ?? '');
    const x = Math.round(Number(token?.x) * 1000) / 1000;
    const y = Math.round(Number(token?.y) * 1000) / 1000;
    if (!tid || !Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Posição final inválida');

    const key = id + ':' + tid;
    authoritativePositionRef.current[key] = { x, y };
    const writerState = livePositionWriteStateRef.current[key];
    const motionSession = String(writerState?.motionSession || (String(liveClientIdRef.current) + '_final'));
    const rotation = Number.isFinite(Number(token?.rotation)) ? ((Number(token.rotation) % 360) + 360) % 360 : undefined;

    let commitError = null;
    for (const delay of [0, 90, 260]) {
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      liveSequenceRef.current += 1;
      const seq = liveSequenceRef.current;
      try {
        await setDoc(doc(db, 'battlemap_live_positions', id + '_' + tid + '_final'), {
          mapId: id,
          tokenId: tid,
          x,
          y,
          ...(rotation === undefined ? {} : { rotation }),
          seq,
          motionSession,
          channel: 'position-final-v1',
          clientId: liveClientIdRef.current,
          updatedAt: Date.now(),
        }, { merge: true });
        commitError = null;
        break;
      } catch (error) {
        commitError = error;
      }
    }
    if (commitError) throw commitError;

    // Limpa apenas formatos que a versão atual NUNCA mais escreve. p0..p2 continuam
    // disponíveis para um novo drag imediatamente, evitando corrida com o próximo gesto.
    const obsoleteIds = [
      id + '_' + tid,
      id + '_' + tid + '_p3',
      id + '_' + tid + '_p4',
      id + '_' + tid + '_p5',
    ];
    await Promise.allSettled(obsoleteIds.map(docId => deleteDoc(doc(db, 'battlemap_live_positions', docId))));
    return true;
  };

  const normalizeTokenRotation = value => ((Math.round(Number(value) || 0) % 360) + 360) % 360;

  const writeLiveRotation = (mapId, tokenId, rotation) => {
    const id = String(mapId);
    const tid = String(tokenId);
    const normalized = normalizeTokenRotation(rotation);
    authoritativeRotationRef.current[`${id}:${tid}`] = normalized;
    setDoc(doc(db, 'battlemap_live_positions', `${id}_${tid}`), {
      mapId: id,
      tokenId: tid,
      rotation: normalized,
      clientId: liveClientIdRef.current,
      rotationUpdatedAt: Date.now(),
    }, { merge: true }).catch(e => console.error('Erro ao transmitir rotação:', e));
  };

  const persistTokens = (mapId, tokens) => {
    writeLiveTokens(mapId, tokens, true).catch(() => {});
  };

  const updCurrentMap = (patch) => {
    if (!currentMap) return;
    const updated = { ...currentMap, ...patch };
    if ('tokens' in patch) {
      const changes = tokenChanges(currentMap.tokens || [], updated.tokens);
      mapTokensRef.current = { ...mapTokensRef.current, [String(currentMap.id)]: updated.tokens };
      setMapTokens(prev => ({ ...prev, [String(currentMap.id)]: updated.tokens }));
      persistTokens(currentMap.id, changes);
    }
    const { tokens, ...metaPatch } = patch;
    if (Object.keys(metaPatch).length > 0) {
      setMaps(prev => prev.map(m => m.id === currentMap.id ? { ...m, ...metaPatch } : m));
      persistMap(currentMap.id, { ...currentMap, ...metaPatch });
    }
  };

  const moveMapToPosition = async (mapId,targetIndex) => {
    const ordered=sortBattleMaps(maps);
    const from=ordered.findIndex(m=>String(m.id)===String(mapId));
    if(from<0)return;
    const to=Math.max(0,Math.min(ordered.length-1,Number(targetIndex)||0));
    if(from===to)return;
    const next=[...ordered];const [movedMap]=next.splice(from,1);next.splice(to,0,movedMap);
    const normalized=next.map((map,index)=>({...map,order:index+1}));
    setMaps(normalized);
    try{await Promise.all(normalized.map(map=>setDoc(doc(db,'battlemaps',String(map.id)),{order:map.order},{merge:true})));}
    catch(error){console.error('Erro ao reordenar mapas:',error);pushToast('Não foi possível salvar a nova ordem dos mapas.','⚠️','#E8A020');}
  };

  const splitBattleMapOriginal = (dataUrl, chunkSize = 480000) => {
    const value = String(dataUrl || '');
    const chunks = [];
    for (let offset = 0; offset < value.length; offset += chunkSize) chunks.push(value.slice(offset, offset + chunkSize));
    return chunks;
  };

  const deleteBattleMapChunks = async (mapId, uploadId, chunkCount) => {
    if (!uploadId || !chunkCount) return;
    for (let index = 0; index < Number(chunkCount || 0); index++) {
      const chunkId = `${uploadId}_${String(index).padStart(4, '0')}`;
      await deleteDoc(doc(db, 'battlemap_media_chunks', chunkId)).catch(() => {});
    }
  };

  const makeBattleMapPreview = async original => {
    const presets = [[1800,1800,.90],[1600,1600,.86],[1400,1400,.82],[1200,1200,.78],[1000,1000,.72]];
    let preview = '';
    for (const [w,h,q] of presets) {
      preview = await compressImage(original, w, h, q);
      if (String(preview || '').length < 760000) return preview;
    }
    return preview;
  };

  const addMap = () => {
    const m = { ...newBattleMap(Date.now()), order: maps.length + 1 };
    const { tokens, ...meta } = m;
    setDoc(doc(db, 'battlemaps', String(m.id)), meta);
    setDoc(doc(db, 'battlemap_tokens', String(m.id)), { tokens: tokens || [] });
    setEditingId(String(m.id));
  };
  const deleteMap = async (id) => {
    const doomed = mapsRef.current.find(m => String(m.id) === String(id));
    if (doomed?.imgUploadId && doomed?.imgChunkCount) {
      await deleteBattleMapChunks(String(id), String(doomed.imgUploadId), Number(doomed.imgChunkCount)).catch(() => {});
    }
    setOriginalMapImages(prev => { const next = { ...prev }; delete next[String(id)]; return next; });
    await deleteDoc(doc(db, 'battlemaps', String(id)));
    await deleteDoc(doc(db, 'battlemap_tokens', String(id))).catch(() => {});
    const rows = await getDocs(query(collection(db, 'battlemap_tokens'), where('mapId', '==', String(id))));
    await Promise.all(rows.docs.map(row => deleteDoc(row.ref)));

    if (activeId === String(id)) {
      const revision = Date.now() * 1000 + Math.floor(Math.random() * 1000);
      activeMapRevisionRef.current = revision;
      await setDoc(doc(db, 'config', 'battlemap_active'), {
        activeId: '',
        revision,
        updatedAt: Date.now()
      });
    }

    if (editingId === String(id)) setEditingId('');
  };
  
  const activateMap = async (id) => {
    const revision = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const tokens = mapTokensRef.current[String(id)] || [];
    const activeWrite = setDoc(doc(db, 'config', 'battlemap_active'), { activeId: String(id), revision, updatedAt: Date.now() });
    const tokenWrite = setDoc(doc(db, 'config', 'battlemap_live_tokens'), { mapId: String(id), tokens, updatedAt: Date.now() });
    try { await Promise.all([activeWrite, tokenWrite]); } catch (error) { console.error('Erro ao ativar mapa:', error); return; }
    pushToast('Mapa liberado para os jogadores!', '🗡️', '#E8193C');
  };
  const deactivateMap = async () => {
    try {
      await setDoc(doc(db, 'config', 'battlemap_active'), { activeId: '', revision: Date.now() * 1000 + Math.floor(Math.random() * 1000), updatedAt: Date.now() });
    } catch (error) { console.error('Erro ao ocultar mapa:', error); }
  };

  const handleMapUpload = e => {
    const file = e.target.files[0]; if (!file || !currentMap) return;
    const mapId = String(currentMap.id);
    const oldUploadId = String(currentMapRaw?.imgUploadId || '');
    const oldChunkCount = Number(currentMapRaw?.imgChunkCount || 0);
    const reader = new FileReader();
    reader.onload = async ev => {
      const original = String(ev.target.result || '');
      if (!original) return;
      // Aproximadamente 18 MB de arquivo binário em Data URL. Acima disso, o custo de
      // memória e sincronização no navegador fica alto demais para uma mesa ao vivo.
      if (original.length > 24000000) {
        pushToast('Imagem acima de 18 MB. Use um arquivo menor para preservar 100% da qualidade.', '⚠', '#EAB308');
        return;
      }
      const uploadId = `bm_${mapId}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
      const chunks = splitBattleMapOriginal(original);
      setOriginalMapImages(prev => ({ ...prev, [mapId]: original }));
      pushToast('Salvando mapa na qualidade original…', '✦', '#A855F7');
      try {
        const preview = await makeBattleMapPreview(original);
        for (let index = 0; index < chunks.length; index++) {
          const chunkId = `${uploadId}_${String(index).padStart(4, '0')}`;
          await setDoc(doc(db, 'battlemap_media_chunks', chunkId), {
            mapId, uploadId, index, data: chunks[index], updatedAt: Date.now(),
          });
        }
        const patch = {
          img: preview,
          imgUploadId: uploadId,
          imgChunkCount: chunks.length,
          imgOriginalChars: original.length,
          imgOriginalName: file?.name || '',
          imgOriginalType: file?.type || '',
          imgOriginalQuality: true,
          imgUpdatedAt: Date.now(),
        };
        setMaps(prev => prev.map(m => String(m.id) === mapId ? { ...m, ...patch } : m));
        await setDoc(doc(db, 'battlemaps', mapId), patch, { merge: true });
        if (oldUploadId && oldUploadId !== uploadId && oldChunkCount) {
          await deleteBattleMapChunks(mapId, oldUploadId, oldChunkCount);
        }
        pushToast('Mapa salvo sem perda da qualidade original.', '✦', '#4ADE80');
      } catch (err) {
        console.error('Erro ao preservar imagem original do mapa:', err);
        await deleteBattleMapChunks(mapId, uploadId, chunks.length).catch(() => {});
        setOriginalMapImages(prev => { const next = { ...prev }; delete next[mapId]; return next; });
        pushToast('Não foi possível salvar a imagem original. Tente novamente.', '⚠', '#E8193C');
      }
    };
    reader.readAsDataURL(file); e.target.value = '';
  };

  const handleTokenPhoto = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const compressed = await compressImagePNG(ev.target.result, 320, 320);
      setFormFoto(compressed);
    };
    reader.readAsDataURL(file); e.target.value = '';
  };

  const saveTokenToLibrary = async () => {
    if (!formNome.trim() || !formFoto) return;
    const id=String(Date.now());
    await setDoc(doc(db,'battlemap_token_library',id),{nome:formNome.trim(),foto:formFoto,tipo:formTipo,size:70,sheetId:formSheetId||'',enemyId:formEnemyId||'',createdAt:Date.now()});
    pushToast('Token salvo na biblioteca','📚','#A855F7');
  };
  const addLibraryToken = async (tpl) => {
    if (!currentMap || addingLibraryTokenRef.current) return;
    addingLibraryTokenRef.current = true;
    const mapId = String(currentMap.id);
    const token=initializeEnemyToken({...newToken(crypto.randomUUID()),nome:tpl.nome||'Token',foto:tpl.foto||'',tipo:tpl.tipo||'jogador',size:tpl.size||70,x:50,y:50,hp:tpl.hp||0,maxHp:tpl.maxHp||tpl.hp||0,status:tpl.status||{},rangeMeters:0,sheetId:tpl.sheetId||'',enemyId:tpl.enemyId||''},enemyTemplateForToken(tpl));
    const tokens=[...(mapTokensRef.current[mapId] || currentMap.tokens || []),token];
    mapTokensRef.current = {...mapTokensRef.current,[mapId]:tokens};
    setMapTokens(prev=>({...prev,[mapId]:tokens}));
    setSelectedId(token.id); setShowTokenLibrary(false);
    try { await writeLiveTokens(mapId,[token],true); }
    catch { /* The outbox keeps this exact token visible and retryable. */ }
    finally { addingLibraryTokenRef.current = false; }
  };

  const deleteLibraryToken = async id => { if(confirm('Remover este token salvo?')) await deleteDoc(doc(db,'battlemap_token_library',String(id))); };


  const addToken = () => {
    if (!formNome.trim() || !formFoto || !currentMap) return;
    const nt = initializeEnemyToken({ ...newToken(crypto.randomUUID()), nome: formNome.trim(), tipo: formTipo, foto: formFoto, sheetId: formSheetId || '', enemyId: formEnemyId || '' },enemyTemplateForToken({enemyId:formEnemyId,sheetId:formSheetId}));
    updCurrentMap({ tokens: [...(currentMap.tokens || []), nt] });
    setFormNome(''); setFormFoto(''); setFormSheetId(''); setFormEnemyId(''); setShowAddForm(false);
  };

  const updateToken = (id, data) => {
    if (!currentMap) return;
    const current = mapTokensRef.current[String(currentMap.id)] || currentMap.tokens || [];
    const previous = current.find(token => String(token.id) === String(id));
    if (!previous) return;
    updCurrentMap({ tokens: current.map(t => String(t.id) === String(id) ? { ...t, ...data } : t) });
  };
  const rotationFromPointer = (e, element) => {
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const degrees = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI + 90;
    return normalizeTokenRotation(Math.round(degrees / 5) * 5);
  };

  const applyTokenRotation = (tokenId, rotation, broadcast = true) => {
    if (!currentMap) return;
    const mapId = String(currentMap.id);
    const tid = String(tokenId);
    const normalized = normalizeTokenRotation(rotation);
    authoritativeRotationRef.current[`${mapId}:${tid}`] = normalized;
    const prev = mapTokensRef.current;
    const tokens = (prev[mapId] || []).map(t => String(t.id) === tid ? { ...t, rotation: normalized } : t);
    const next = { ...prev, [mapId]: tokens };
    mapTokensRef.current = next;
    setMapTokens(next);
    if (!broadcast) return;
    const key = `${mapId}:${tid}`;
    const now = performance.now();
    const last = rotationLastWriteRef.current[key] || 0;
    clearTimeout(saveTimeout.current['rot_' + key]);
    if (now - last >= 45) {
      rotationLastWriteRef.current[key] = now;
      writeLiveRotation(mapId, tid, normalized);
    } else {
      saveTimeout.current['rot_' + key] = setTimeout(() => {
        rotationLastWriteRef.current[key] = performance.now();
        writeLiveRotation(mapId, tid, normalized);
      }, 45 - (now - last));
    }
  };

  const startTokenRotation = async (e, token) => {
    if (token.locked && !masterMode) return;
    e.preventDefault();
    e.stopPropagation();
    if(claimRef.current||draggingIdRef.current!=null)return;
    const mapId=currentMap.id;
    const element=e.currentTarget,parent=element.parentElement||element,pointerId=e.pointerId;
    let down=true;const ended=()=>{down=false};window.addEventListener('pointerup',ended,{once:true});window.addEventListener('pointercancel',ended,{once:true});
    claimRef.current=true;
    try{if(!await acquireControl(currentMap.id,token.id))return;if(!down||!mountedMapRef.current||String(mapId)!==mapIdentityRef.current){await releaseControl();return;}}catch(error){pushToast('Não foi possível controlar o token.','\u26A0','#E8A020');return;}finally{claimRef.current=false;window.removeEventListener('pointerup',ended);window.removeEventListener('pointercancel',ended);}
    rotationPointerRef.current = {
      tokenId: token.id,
      element: parent,
      handle: element,
    };
    setRotatingId(token.id);
    try { element.setPointerCapture(pointerId); } catch (_) {}
    // Não altera o ângulo no clique: a rotação começa apenas quando o ponteiro se move.
  };

  const moveTokenRotation = (e) => {
    const state = rotationPointerRef.current;
    if (state.tokenId == null || !state.element) return;
    e.preventDefault();
    e.stopPropagation();
    applyTokenRotation(state.tokenId, rotationFromPointer(e, state.element));
  };

  const endTokenRotation = (e) => {
    const state = rotationPointerRef.current;
    if (state.tokenId == null || !currentMap) return;
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const mapId = String(currentMap.id);
    const tokenId = state.tokenId;
    clearTimeout(saveTimeout.current['rot_' + `${mapId}:${String(tokenId)}`]);
    const latestTokens = mapTokensRef.current[mapId] || [];
    const token = latestTokens.find(t => String(t.id) === String(tokenId));
    if (token) writeLiveRotation(mapId, tokenId, token.rotation || 0);
    writeLiveTokens(mapId, token ? [{ id: token.id, rotation: token.rotation || 0 }] : [], true).catch(err => console.error('Erro ao persistir direção do token:', err)).finally(()=>releaseControl());
    try { state.handle?.releasePointerCapture?.(e.pointerId); } catch (_) {}
    rotationPointerRef.current = { tokenId: null, element: null };
    setRotatingId(null);
  };

  const deleteToken = id => {
    if (!currentMap || !masterMode) return;
    const mapId = String(currentMap.id);
    const tokens = (mapTokensRef.current[mapId] || currentMap.tokens || []).filter(token => String(token.id) !== String(id));
    mapTokensRef.current = { ...mapTokensRef.current, [mapId]: tokens };
    setMapTokens(prev => ({ ...prev, [mapId]: tokens }));
    writeLiveTokens(mapId, [], true, [String(id)]).catch(error => {
      console.error('Erro ao excluir token:', error);
      pushToast('Não foi possível excluir o token. Tente novamente.', '\u26A0', '#E8193C');
    });
    if (selectedId === id) setSelectedId(null);
  };

  const acquireControl=async(mapId,tokenId)=>{
    const record=doc(db,'battlemap_live_positions',String(mapId)+'_'+String(tokenId)+'_lease');
    const key=String(mapId)+':'+String(tokenId);
    const clientId=String(liveClientIdRef.current);
    const version=clientId+'_'+Math.random().toString(36).slice(2);
    const acquired=await runTransaction(db,async transaction=>{
      const snapshot=await transaction.get(record);
      const row=snapshot.exists()?snapshot.data():null;
      leaseTrackerRef.current.observe(key,row);
      if(leaseTrackerRef.current.owner(key,clientId))return false;
      transaction.set(record,{mapId:String(mapId),tokenId:String(tokenId),channel:'control-lease-v1',clientId,name:masterMode?'Mestre':ownPingName||'Jogador',active:true,version,publishedAt:serverTimestamp()});
      return true;
    });
    if(acquired)localLeaseRef.current={record,version,clientId};
    return acquired;
  };
  const releaseControl=async()=>{
    const lease=localLeaseRef.current;if(!lease)return;
    localLeaseRef.current=null;
    try{await runTransaction(db,async transaction=>{
      const snapshot=await transaction.get(lease.record);
      if(snapshot.data()?.version===lease.version)transaction.set(lease.record,{active:false,publishedAt:serverTimestamp()},{merge:true});
    });}catch(error){console.warn('Controle liberado por expiração:',error);}
  };
  useEffect(()=>{
    if(!draggingId&&!rotatingId)return;
    document.documentElement.dataset.tokenDragging='true';
    let inFlight=false;
    const renew=async()=>{
      const lease=localLeaseRef.current;if(!lease||inFlight)return;inFlight=true;
      try{
        const renewed=await runTransaction(db,async transaction=>{
          const snapshot=await transaction.get(lease.record);
          if(snapshot.data()?.version!==lease.version)return false;
          const version=lease.clientId+'_'+Math.random().toString(36).slice(2);
          transaction.set(lease.record,{version,publishedAt:serverTimestamp()},{merge:true});
          return version;
        });
        if(renewed&&localLeaseRef.current===lease)lease.version=renewed;
        else if(!renewed){window.dispatchEvent(new Event('pointercancel'));setDraggingId(null);setRotatingId(null);}
      }catch(error){console.warn('Controle sem confirmação:',error);window.dispatchEvent(new Event('pointercancel'));}
      finally{inFlight=false;}
    };
    const timer=setInterval(renew,2000);
    return()=>{clearInterval(timer);delete document.documentElement.dataset.tokenDragging;};
  },[draggingId,rotatingId]);
  useEffect(()=>{mountedMapRef.current=true;return()=>{mountedMapRef.current=false;claimRef.current=false;leaseTimersRef.current.forEach(clearTimeout);releaseControl();}},[]);
  useEffect(()=>{setTokenControllers({});leaseTrackerRef.current.clear();},[currentMapId]);
  const onTokenPointerDown = async (e, token) => {
    if((token.locked&&!masterMode)||claimRef.current||draggingIdRef.current!=null)return;
    e.stopPropagation();e.preventDefault();
    if(!navigator.onLine){pushToast('Reconecte para mover tokens com o grupo.','\u26A0','#E8A020');return;}
    const mapId=currentMap.id;
    const element=e.currentTarget,pointerId=e.pointerId;
    let down=true;
    const ended=()=>{down=false;};
    window.addEventListener('pointerup',ended,{once:true});window.addEventListener('pointercancel',ended,{once:true});
    try{element.setPointerCapture(pointerId);}catch(_){}
    claimRef.current=true;setClaimingToken(String(token.id));
    setSelectedId(token.id);
    try{
      const acquired=await acquireControl(mapId,token.id);
      if(!acquired){pushToast('Este token está sendo controlado por outro participante.','\u26BF','#E8A020');return;}
      if(!down||!mountedMapRef.current||String(mapId)!==mapIdentityRef.current){await releaseControl();return;}
      moved.current=false;
      tokenInteractionRef.current={id:token.id,pointerId};
      setDraggingId(token.id);
    }catch(error){console.error('Falha ao reservar token:',error);pushToast('Não foi possível obter controle. Confira a conexão.','\u26A0','#E8A020');}
    finally{claimRef.current=false;setClaimingToken('');window.removeEventListener('pointerup',ended);window.removeEventListener('pointercancel',ended);}
  };

 useEffect(() => {
    if (!draggingId || !currentMap) return;
    const mapIdAtDragStart = currentMap.id;
    // TABLETOP REALTIME FAST PATH 2026-09-14
// OWLBEAR-STYLE INTERACTION PIPELINE 2026-09-13
const TOKEN_THROTTLE_MS = 80;

    const throttledTokenWrite = (tokensArr) => {
      const now = Date.now();
      const last = lastTokenWriteRef.current[mapIdAtDragStart] || 0;
      clearTimeout(saveTimeout.current['tok_' + mapIdAtDragStart]);
      if (now - last >= TOKEN_THROTTLE_MS) {
        lastTokenWriteRef.current[mapIdAtDragStart] = now;
        const movedToken = tokensArr.find(t => String(t.id) === String(draggingId));
        if (movedToken) writeLivePosition(mapIdAtDragStart, movedToken.id, movedToken.x, movedToken.y);
      } else {
        saveTimeout.current['tok_' + mapIdAtDragStart] = setTimeout(() => {
          lastTokenWriteRef.current[mapIdAtDragStart] = Date.now();
          const movedToken = tokensArr.find(t => String(t.id) === String(draggingId));
          if (movedToken) writeLivePosition(mapIdAtDragStart, movedToken.id, movedToken.x, movedToken.y);
        }, TOKEN_THROTTLE_MS - (now - last));
      }
    };

    let localFrame = 0;
    let latestPoint = null;
    let dragCommitted = false;

    const applyLocalPoint = () => {
      localFrame = 0;
      if (!latestPoint) return;
      const { x, y } = latestPoint;
      latestPoint = null;
      const prev = mapTokensRef.current;
      const currentTokens = prev[String(mapIdAtDragStart)] || [];
      const updatedTokens = currentTokens.map(t => t.id === draggingId ? { ...t, x, y } : t);
      const next = { ...prev, [String(mapIdAtDragStart)]: updatedTokens };
      mapTokensRef.current = next;
      setMapTokens(next);
      throttledTokenWrite(updatedTokens);
    };

    const move = (e) => {
      if (!mapRef.current) return;
      moved.current = true;
      const rect = mapRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      let x = ((clientX - rect.left) / rect.width) * 100;
      let y = ((clientY - rect.top) / rect.height) * 100;
      x = Math.min(100, Math.max(0, x));
      y = Math.min(100, Math.max(0, y));
      latestPoint = { x, y };
      if (!localFrame) localFrame = requestAnimationFrame(applyLocalPoint);
    };
    const up = () => {
      if (dragCommitted) return;
      dragCommitted = true;
      if (localFrame) { cancelAnimationFrame(localFrame); localFrame = 0; applyLocalPoint(); }
      clearTimeout(saveTimeout.current['tok_' + mapIdAtDragStart]);
      const latestTokens = mapTokensRef.current[String(mapIdAtDragStart)];
      // Um simples clique serve apenas para selecionar. Persistir o array inteiro sem
      // movimento podia sobrescrever a posição que outro cliente ainda estava movendo.
      if (moved.current && latestTokens) {
        const movedToken = latestTokens.find(t => String(t.id) === String(draggingId));
        const durableWrites = [];
        if (movedToken) {
          writeLivePosition(mapIdAtDragStart, movedToken.id, movedToken.x, movedToken.y);
          durableWrites.push(commitCanonicalTokenPosition(mapIdAtDragStart, movedToken));
        }
        lastTokenWriteRef.current[mapIdAtDragStart] = Date.now();
        durableWrites.push(writeLiveTokens(mapIdAtDragStart, movedToken ? [{ id: movedToken.id, x: movedToken.x, y: movedToken.y }] : [], true));
        Promise.allSettled(durableWrites).then(results => {
          const rejected = results.filter(result => result.status === 'rejected');
          if (rejected.length) rejected.forEach(result => console.error('Falha em persistência do token:', result.reason));
          releaseControl();
          if (rejected.length === results.length && results.length) {
            pushToast('Não foi possível salvar a posição do token. Verifique a conexão.', '⚠️', '#F59E0B');
          }
        });
      }
      if (!moved.current) releaseControl();
      if (String(tokenInteractionRef.current.id)===String(draggingId)) tokenInteractionRef.current={id:null,pointerId:null};
      setDraggingId(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('blur', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    window.addEventListener('touchcancel', up);
    return () => {
      if (localFrame) cancelAnimationFrame(localFrame);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      window.removeEventListener('touchcancel', up);
    };
  }, [draggingId, currentMap?.id]);

  const selectedToken = (currentMap?.tokens || []).find(t => t.id === selectedId);

  const saveSheet = sheet => {
    clearTimeout(saveTimeout.current['sheet_' + sheet.id]);
    saveTimeout.current['sheet_' + sheet.id] = setTimeout(async () => {
      try { await setDoc(doc(db, 'sheets', String(sheet.id)), sheet); } catch (e) { console.error(e); }
    }, 700);
  };
  const updSheet = (id, data) => { setSheets(prev => prev.map(s => s.id === id ? data : s)); saveSheet(data); };
  const saveCustomAb = async (sheetId, novas) => {
    if(!masterMode)throw new Error('Apenas o Mestre pode editar habilidades.');
    await setDoc(doc(db, 'config', 'customAbilities'), {[String(sheetId)]:novas}, {merge:true});
  };

  const toggleFloatingSheet = (sid) => {
    setFloatingSheets(prev => {
      const exists = prev.find(p => p.sheetId === sid);
      if (exists) return prev.filter(p => p.sheetId !== sid);
      zTopRef.current += 1;
      const idx = prev.length;
      const baseX = 90 + (idx % 4) * 40;
      const baseY = 70 + (idx % 4) * 40;
      return [...prev, { sheetId: sid, x: baseX, y: baseY, z: zTopRef.current }];
    });
  };
  const bringFloatingToFront = (sid) => {
    zTopRef.current += 1;
    const z = zTopRef.current;
    setFloatingSheets(prev => prev.map(p => p.sheetId === sid ? { ...p, z } : p));
  };
  const moveFloatingSheet = (sid, x, y) => {
    setFloatingSheets(prev => prev.map(p => p.sheetId === sid ? { ...p, x, y } : p));
  };
  const closeFloatingSheet = (sid) => {
    setFloatingSheets(prev => prev.filter(p => p.sheetId !== sid));
  };
  const saveEnemyFromMap = enemy => {
    clearTimeout(saveTimeout.current['enemy_' + enemy.id]);
    saveTimeout.current['enemy_' + enemy.id] = setTimeout(async () => {
      try { await setDoc(doc(db, 'enemies', String(enemy.id)), enemy); } catch (e) { console.error('Erro ao salvar inimigo pelo mapa:', e); }
    }, 520);
  };
  const updEnemyFromMap = (id, data) => {
    setEnemies(prev => prev.map(e => String(e.id) === String(id) ? data : e));
    saveEnemyFromMap(data);
  };
  const enemyMaxHpForToken = enemy => Math.max(1, Number(enemy?.hp_max ?? Math.max(10, Number(enemy?.hp || 10))) + Math.max(0, Number(enemy?.hp_bonus || 0)));
  const enemyTemplateForToken = token => {
    const enemy = token?.enemyId ? enemies.find(e => String(e.id) === String(token.enemyId)) : null;
    if (enemy) return {hp:Number(enemy.hp||0),maxHp:enemyMaxHpForToken(enemy)};
    return token?.sheetId ? sheetVitals[String(token.sheetId)] : null;
  };
  const tokenVitalState = token => {
    if (hasIndividualHp(token)) return enemyTokenVitals(token,enemyTemplateForToken(token));
    const sheet = token?.sheetId ? sheets.find(s => String(s.id) === String(token.sheetId)) : null;
    if (sheet) return { kind:'sheet', entity:sheet, hp:Number(sheet.hp||0), maxHp:getSheetMaxHp(sheet) };
    return { kind:'manual', entity:null, hp:Number(token?.hp||0), maxHp:Number(token?.maxHp||0) };
  };
  // Snapshot legacy enemy health once. Persist only this token's HP fields through
  // the existing outbox; never rewrite the map roster or the shared enemy sheet.
  useEffect(() => {
    if (!masterMode || !currentMap) return;
    const mapId=String(currentMap.id), tokens=mapTokensRef.current[mapId]||currentMap.tokens||[];
    const patches=tokens.flatMap(token=>{
      const next=initializeEnemyToken(token,enemyTemplateForToken(token));
      return next===token?[]:[{id:token.id,hp:next.hp,maxHp:next.maxHp,hpMode:'individual'}];
    });
    if (!patches.length) return;
    const byId=new Map(patches.map(patch=>[String(patch.id),patch]));
    const next=tokens.map(token=>({...token,...byId.get(String(token.id))}));
    mapTokensRef.current={...mapTokensRef.current,[mapId]:next};
    setMapTokens(previous=>({...previous,[mapId]:next}));
    writeLiveTokens(mapId,patches,true).catch(()=>{});
  },[masterMode,currentMapId,mapTokens,enemies,sheetVitals]);
  const lastHpChangeRef = useRef(null);
  const applyTokenLinkedHp = (token, nextHp, recordHistory = true) => {
    const latest=(mapTokensRef.current[String(currentMap?.id)]||[]).find(item=>String(item.id)===String(token.id))||token;
    const vital = tokenVitalState(latest);
    const raw = Math.max(0, Number(nextHp)||0);
    const hp = vital.kind === 'manual' ? raw : Math.min(Math.max(1, vital.maxHp || 1), raw);
    if (recordHistory && hp !== vital.hp) lastHpChangeRef.current = { tokenId:String(token.id), hp:vital.hp };
    if (vital.kind === 'individual') { updateToken(token.id, { hp, maxHp:vital.maxHp, hpMode:'individual' }); return; }
    if (vital.kind === 'sheet') { updSheet(vital.entity.id, { ...vital.entity, hp }); return; }
    updateToken(token.id, { hp });
  };
  const setTokenLinkedHp = (token, nextHp) => applyTokenLinkedHp(token, nextHp, true);
  const adjustTokenHp = (token, delta) => {
    const latest=(mapTokensRef.current[String(currentMap?.id)]||[]).find(item=>String(item.id)===String(token.id))||token;
    applyTokenLinkedHp(latest,tokenVitalState(latest).hp+delta,true);
  };
  const undoTokenHp = token => {
    const last = lastHpChangeRef.current;
    if (!last || String(last.tokenId) !== String(token?.id)) return;
    applyTokenLinkedHp(token, last.hp, false);
    lastHpChangeRef.current = null;
  };

  const toggleFloatingEnemy = eid => {
    setFloatingEnemies(prev => {
      const exists = prev.find(p => p.enemyId === eid);
      if (exists) return prev.filter(p => p.enemyId !== eid);
      zTopRef.current += 1;
      const idx = prev.length + floatingSheets.length;
      return [...prev, { enemyId:eid, x:120 + (idx % 4) * 44, y:85 + (idx % 4) * 38, z:zTopRef.current }];
    });
  };
  const bringEnemyToFront = eid => {
    zTopRef.current += 1;
    const z = zTopRef.current;
    setFloatingEnemies(prev => prev.map(p => p.enemyId === eid ? { ...p, z } : p));
  };
  const moveFloatingEnemy = (eid, x, y) => setFloatingEnemies(prev => prev.map(p => p.enemyId === eid ? { ...p, x, y } : p));
  const closeFloatingEnemy = eid => setFloatingEnemies(prev => prev.filter(p => p.enemyId !== eid));
  const handleSelectSheet = (s) => {
    const sid = String(s.id);
    if (masterMode || access?.role==='visitor'&&String(s.visitorId)===String(access.visitorId) || (playerSheetId && String(playerSheetId) === sid) || !s.senha || unlockedIds[sid]) { toggleFloatingSheet(sid); return; }
    setPwTarget(sid); setPwInput(''); setPwError(false);
  };
  const tryPassword = () => {
    const s = sheets.find(x => String(x.id) === pwTarget);
    if (s && pwInput === s.senha) {
      setUnlockedIds(prev => ({ ...prev, [pwTarget]: true }));
      toggleFloatingSheet(pwTarget);
      setPwTarget(null); setPwInput('');
    } else {
      setPwError(true); setPwInput('');
      setTimeout(() => setPwError(false), 600);
    }
  };


  const saveFog = (mapId, patches) => {
    setFogByMap(prev => ({ ...prev, [String(mapId)]: patches }));
    clearTimeout(fogSaveTimerRef.current);
    fogSaveTimerRef.current = setTimeout(() => {
      setDoc(doc(db, 'battlemap_fog', String(mapId)), { patches, updatedAt: Date.now() }).catch(e => console.error('Erro ao salvar névoa:', e));
    }, 70);
  };

  const editFogAtPointer = (e) => {
    if (!masterMode || fogMode === 'off' || !currentMap || !mapRef.current) return;
    e.preventDefault(); e.stopPropagation();
    const rect = mapRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const id = String(currentMap.id);
    const existing = fogByMap[id] || [];
    if (fogMode === 'add') {
      const last = existing[existing.length - 1];
      if (last && Math.hypot(last.x - x, last.y - y) < fogBrush * .18) return;
      saveFog(id, [...existing, { id: `${Date.now()}_${Math.random()}`, x, y, size: fogBrush }]);
    } else {
      saveFog(id, existing.filter(p => Math.hypot(p.x - x, p.y - y) > Math.max(p.size, fogBrush) * .65));
    }
  };

  const startFogDraw = (e) => { if (fogMode === 'off') return; fogDrawingRef.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {} editFogAtPointer(e); };
  const moveFogDraw = (e) => { if (fogDrawingRef.current) editFogAtPointer(e); };
  const endFogDraw = () => { fogDrawingRef.current = false; };

  const quickAddSheet = () => {
    if (sheets.length >= 15) return;
    const s = newSheet(Date.now());
    setDoc(doc(db, 'sheets', String(s.id)), s);
    toggleFloatingSheet(String(s.id));
  };

  const mapUnitScale = baseSize.normalW > 0 ? baseSize.w / baseSize.normalW : 1;
  const tokenScale = zoom * mapUnitScale;

  const zoomBtnStyle = { width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: '#C8B8A0', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 8px 8px' }}>

      {/* CABEÇALHO COMPACTO */}
      <div className="battlemap-heading" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14 }}>{'\u2694'}</span>
        <h2 style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 14, color: '#E8D8C0', fontWeight: 700, margin: 0, letterSpacing: '0.04em' }}>Mapa de Batalha</h2>
        {masterMode&&<div className="battlemap-master-mark" aria-label="Acesso do Mestre"><span className="master-sigil" aria-hidden="true">M</span><span>MESTRE<small>Conduzindo a mesa</small></span></div>}
        {currentMap?.nome && <span style={{ fontSize: 11, color: '#5A5070', fontFamily: 'Cinzel,serif' }}>· {currentMap.nome}</span>}
        {masterMode && currentMap?.img && !mapScreen.expanded && <button type="button" className="battlemap-screen-button in-heading" aria-pressed={false} onClick={mapScreen.toggle}>Preencher tela completa</button>}
      </div>

      {pwTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9980, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter:'none' }} onClick={() => setPwTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(10,12,28,0.98)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: 16, padding: 28, width: 300, textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <div style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 16, color: '#C8A8E8', marginBottom: 6 }}>Ficha Protegida</div>
            <div style={{ fontSize: 12, color: '#5A5070', fontFamily: 'Cinzel,serif', marginBottom: 18 }}>Digite a senha para acessar esta ficha.</div>
            <input type="password" value={pwInput} onChange={e => setPwInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && tryPassword()} placeholder="Senha..." autoFocus style={{ width: '100%', textAlign: 'center', marginBottom: 12, fontSize: 16, border: `1px solid ${pwError ? 'rgba(232,25,60,0.7)' : 'rgba(168,85,247,0.4)'}`, transition: 'border-color 0.3s' }} />
            {pwError && <div style={{ fontSize: 12, color: '#E8193C', fontFamily: 'Cinzel,serif', marginBottom: 10 }}>Senha incorreta.</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPwTarget(null)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#5A5070', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 12 }}>Cancelar</button>
              <button onClick={tryPassword} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.5)', background: 'rgba(168,85,247,0.12)', color: '#C8A8E8', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 12, fontWeight: 600 }}>Entrar</button>
            </div>
          </div>
        </div>
      )}

      {!loaded && <div style={{ textAlign: 'center', color: '#5A5070', fontFamily: 'Cinzel,serif', fontSize: 13, padding: 40 }}>Carregando o campo de batalha...</div>}

      {loaded && (
        <div className="battlemap-viewport" style={{ position: 'relative', flex: 1, minHeight: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(232,25,60,0.25)', boxShadow: '0 4px 24px rgba(0,0,0,0.6)', background: '#04060F' }}>
          {currentMap?.img&&(!masterMode||mapScreen.expanded)&&<button type="button" className="battlemap-screen-button" aria-pressed={mapScreen.expanded} onClick={mapScreen.toggle}>{mapScreen.expanded?'Sair da tela cheia':'Preencher tela completa'}</button>}
          {mapScreen.notice&&<div className="battlemap-screen-notice" role="status">{mapScreen.notice}</div>}

          {/* BARRA FLUTUANTE DO MESTRE — não empurra o mapa */}
          {masterMode && (
            <div className="battle-master-toolbar" style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 40, display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none' }}>
              <button type="button" className="battle-master-toolbar-handle" title="Ferramentas do Mestre"><span>✦</span><b>Ferramentas</b></button>
              <div className="battle-master-map-tabs" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', pointerEvents: 'auto' }}>
                {maps.map(m => {
                  const isEditing = String(m.id) === String(editingId || activeId);
                  const isActive = String(m.id) === String(activeId);
                  return (
                    <button key={m.id} onClick={() => setEditingId(String(m.id))} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8,
                      border: `1px solid ${isEditing ? 'rgba(232,25,60,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      background: isEditing ? 'rgba(232,25,60,0.15)' : 'rgba(4,6,15,0.7)',
                      color: isEditing ? '#E8193C' : '#C8B8A0', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10,
                      backdropFilter:'none',
                    }}>
                      {isActive && <span title="Visível para jogadores" style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 5px #4ADE80', flexShrink: 0 }} />}
                      {m.nome || 'Mapa'}
                    </button>
                  );
                })}
                <button onClick={addMap} style={{ padding: '5px 10px', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.2)', background: 'rgba(4,6,15,0.7)', color: '#8A7A9A', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10, backdropFilter:'none' }}>＋ Novo cenário</button>
              </div>

              {currentMap && (
                <div className="battle-master-controls" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', pointerEvents: 'auto' }}>
                  {showMapNameEdit ? (
                    <input value={currentMap.nome} onChange={e => updCurrentMap({ nome: e.target.value })} onBlur={() => setShowMapNameEdit(false)} onKeyDown={e => e.key === 'Enter' && setShowMapNameEdit(false)} autoFocus style={{ fontSize: 11, fontFamily: 'Cinzel,serif', width: 140 }} />
                  ) : (
                    <><button onClick={() => setShowMapNameEdit(true)} style={{ ...zoomBtnStyle, width: 'auto', padding: '5px 9px', background: 'rgba(4,6,15,0.7)', backdropFilter:'none' }}>✎ Nome</button><label title="Escolha a posição deste mapa" className="battlemap-order-control">Ordem <select value={Math.max(1,sortBattleMaps(maps).findIndex(m=>String(m.id)===String(currentMap.id))+1)} onChange={e=>moveMapToPosition(currentMap.id,Number(e.target.value)-1)}>{maps.map((_,i)=><option key={i} value={i+1}>{i+1}º</option>)}</select></label></>
                  )}
                  <button onClick={() => fileRef.current?.click()} style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid rgba(232,25,60,0.3)', background: 'rgba(232,25,60,0.12)', color: '#E8193C', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10, backdropFilter:'none' }}>◫ {currentMap.img ? 'Cenário' : 'Adicionar cenário'}</button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleMapUpload} style={{ display: 'none' }} />
                  <button onClick={() => setShowAddForm(o => !o)} style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.12)', color: '#4ADE80', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10, backdropFilter:'none' }}>✦ Token</button>
                  <button onClick={() => setShowTokenLibrary(v=>!v)} style={{ padding:'5px 9px',borderRadius:7,border:'1px solid rgba(168,85,247,.38)',background:showTokenLibrary?'rgba(168,85,247,.2)':'rgba(4,6,15,.7)',color:'#C8A8E8',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10 }}>◇ Biblioteca</button>
                  <button onClick={() => {setPingMode(false);setRulerMode(v=>!v);setFogMode('off');setRuler(null);}} style={{ padding:'5px 9px',borderRadius:7,border:`1px solid ${rulerMode?'rgba(30,200,255,.65)':'rgba(30,200,255,.25)'}`,background:rulerMode?'rgba(30,200,255,.18)':'rgba(4,6,15,.7)',color:'#58D9FF',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10 }}>⌁ Medir</button>
                  <label style={{display:'flex',alignItems:'center',gap:4,padding:'3px 6px',borderRadius:7,background:'rgba(4,6,15,.7)',fontSize:9,color:'#8A7A9A',fontFamily:'Cinzel,serif'}}>1m=<input type='number' min='10' max='300' value={pixelsPerMeter} onChange={e=>setPixelsPerMeter(Math.max(10,Number(e.target.value)||70))} style={{width:45,fontSize:10,padding:'2px 4px'}}/>px</label>
                  <button onClick={() => setFogMode(m => m === 'add' ? 'off' : 'add')} style={{ padding: '5px 9px', borderRadius: 7, border: `1px solid ${fogMode==='add'?'rgba(180,108,232,.7)':'rgba(180,108,232,.3)'}`, background: fogMode==='add'?'rgba(180,108,232,.22)':'rgba(4,6,15,.7)', color:'#D7B6F2', cursor:'pointer', fontFamily:'Cinzel,serif', fontSize:10, backdropFilter:'none' }}>◌ Névoa</button>
                  
                  
                  
                  <button onClick={() => setFogMode(m => m === 'erase' ? 'off' : 'erase')} style={{ padding: '5px 9px', borderRadius: 7, border: `1px solid ${fogMode==='erase'?'rgba(74,222,128,.65)':'rgba(74,222,128,.25)'}`, background: fogMode==='erase'?'rgba(74,222,128,.18)':'rgba(4,6,15,.7)', color:'#8CF0AC', cursor:'pointer', fontFamily:'Cinzel,serif', fontSize:10, backdropFilter:'none' }}>✧ Revelar</button>
                  <label style={{display:'flex',alignItems:'center',gap:4,padding:'3px 6px',borderRadius:7,background:'rgba(4,6,15,.7)',fontSize:9,color:'#8A7A9A',fontFamily:'Cinzel,serif'}}>Pincel <input type="range" min="5" max="30" value={fogBrush} onChange={e=>setFogBrush(Number(e.target.value))} style={{width:70}}/></label>
                  <button onClick={() => { if (confirm('Remover toda a névoa deste mapa?')) saveFog(String(currentMap.id), []); }} style={{ padding:'5px 8px',borderRadius:7,border:'1px solid rgba(232,160,32,.28)',background:'rgba(4,6,15,.7)',color:'#E8A020',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10 }}>☀ Limpar névoa</button>
                  {String(activeId) === String(currentMap.id)
                    ? <button onClick={deactivateMap} style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid rgba(232,160,32,0.35)', background: 'rgba(232,160,32,0.12)', color: '#E8A020', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10, backdropFilter:'none' }}>🙈 Ocultar</button>
                    : <button onClick={() => activateMap(currentMap.id)} style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.15)', color: '#4ADE80', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10, fontWeight: 700, backdropFilter:'none' }}>👁 Revelar</button>
                  }
                  <button onClick={() => deleteMap(currentMap.id)} style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(232,25,60,0.25)', background: 'rgba(4,6,15,0.7)', color: '#7A4040', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10, backdropFilter:'none' }}>🗑</button>
                </div>
              )}
            </div>
          )}

          {currentMap && tokenOutbox.status(currentMap.id).count > 0 && (
            <div role="status" style={{position:'absolute',bottom:12,left:12,zIndex:45,padding:'8px 12px',borderRadius:8,background:'#10121b',color:tokenOutbox.status(currentMap.id).failed?'#E8A020':'#C8A8E8',fontSize:12}}>
              {tokenOutbox.status(currentMap.id).failed ? 'Há tokens aguardando gravação.' : 'Sincronizando tokens...'}
              {tokenOutbox.status(currentMap.id).failed && <button onClick={() => tokenOutbox.retry(currentMap.id).catch(() => {})} style={{marginLeft:10,padding:'6px 10px',cursor:'pointer'}}>Tentar novamente</button>}
            </div>
          )}
          {showTokenLibrary && masterMode && currentMap && (
            <div style={{position:'absolute',top:70,left:10,zIndex:42,width:330,maxHeight:'62%',overflowY:'auto',border:'1px solid rgba(168,85,247,.32)',borderRadius:12,background:'rgba(8,10,20,.97)',padding:12,boxShadow:'0 12px 34px rgba(0,0,0,.7)',backdropFilter:'none'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><span style={{fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'.18em',color:'#C8A8E8'}}>BIBLIOTECA DE TOKENS</span><button onClick={()=>setShowTokenLibrary(false)} style={{background:'none',border:'none',color:'#7A6A8A',cursor:'pointer'}}>✕</button></div>
              {tokenLibrary.length===0?<div style={{padding:18,textAlign:'center',color:'#5A5070',fontSize:11}}>Nenhum token salvo ainda. Crie um token e use “Salvar”.</div>:
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>{tokenLibrary.map(t=><div key={t.id} style={{padding:7,borderRadius:9,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.025)',textAlign:'center',position:'relative'}}>
                <button onClick={()=>addLibraryToken(t)} style={{width:'100%',background:'none',border:'none',cursor:'pointer',color:'#C8B8A0'}}><div style={{height:62,display:'flex',alignItems:'center',justifyContent:'center'}}>{t.foto?<img src={t.foto} alt='' style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>:<span>🎭</span>}</div><div style={{fontSize:9,fontFamily:'Cinzel,serif',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.nome}</div></button>
                <button onClick={()=>deleteLibraryToken(t.id)} title='Excluir salvo' style={{position:'absolute',top:2,right:2,width:18,height:18,borderRadius:'50%',border:'none',background:'rgba(232,25,60,.18)',color:'#E8193C',cursor:'pointer',fontSize:9}}>✕</button>
              </div>)}</div>}
            </div>
          )}

          {/* FORM DE NOVO TOKEN — flutuante */}
          {showAddForm && masterMode && currentMap && (
            <div style={{ position: 'absolute', top: 70, left: 10, zIndex: 41, width: 300, border: '1px solid rgba(74,222,128,0.3)', borderRadius: 12, background: 'rgba(8,10,20,0.96)', backdropFilter:'none', padding: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.6)' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.3em', color: '#4ADE80', fontFamily: 'Cinzel,serif', marginBottom: 10, textTransform: 'uppercase' }}>Novo Token</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div onClick={() => tokenFileRef.current?.click()} style={{ width: 60, height: 60, borderRadius: 10, border: '1px dashed rgba(255,255,255,0.15)', background: formFoto ? `url(${formFoto}) center/contain no-repeat` : 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  {!formFoto && <span style={{ fontSize: 20, opacity: 0.3 }}>🖼️</span>}
                </div>
                <input ref={tokenFileRef} type="file" accept="image/png" onChange={handleTokenPhoto} style={{ display: 'none' }} />
                <div style={{ flex: 1 }}>
                  <input value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="Nome do token..." style={{ width: '100%', fontSize: 12, marginBottom: 6 }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    {Object.entries(TOKEN_TYPES).map(([key, t]) => (
                      <button key={key} onClick={() => setFormTipo(key)} style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: `1px solid ${formTipo === key ? t.color + '77' : 'rgba(255,255,255,0.1)'}`, background: formTipo === key ? `${t.color}18` : 'rgba(255,255,255,0.02)', color: formTipo === key ? t.color : '#6A5A7A', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10 }}>{t.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <label style={{display:'block',marginTop:9,fontSize:9,color:'#7B6D8A',fontFamily:'Cinzel,serif'}}>Ficha de referência<select value={formEnemyId?`enemy:${formEnemyId}`:(formSheetId?`sheet:${formSheetId}`:'')} onChange={e=>{const raw=e.target.value;const idx=raw.indexOf(':');const kind=idx>0?raw.slice(0,idx):'';const id=idx>0?raw.slice(idx+1):'';setFormSheetId(kind==='sheet'?id:'');setFormEnemyId(kind==='enemy'?id:'');}} style={{width:'100%',marginTop:4,fontSize:10}}><option value=''>Nenhuma — HP manual</option><optgroup label='Personagens'>{sheets.map(s=><option key={`sheet_form_${s.id}`} value={`sheet:${s.id}`}>{s.nome||'Personagem'}</option>)}</optgroup>{masterMode&&<optgroup label='Inimigos'>{enemies.map(enemy=><option key={`enemy_form_${enemy.id}`} value={`enemy:${enemy.id}`}>💀 {enemy.nome||'Inimigo'}</option>)}</optgroup>}</select></label>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={saveTokenToLibrary} disabled={!formNome.trim() || !formFoto} style={{padding:'8px 10px',borderRadius:8,border:'1px solid rgba(168,85,247,.4)',background:'rgba(168,85,247,.12)',color:'#C8A8E8',cursor:(formNome.trim()&&formFoto)?'pointer':'not-allowed',fontFamily:'Cinzel,serif',fontSize:11}}>📚 Salvar</button>
                <button onClick={addToken} disabled={!formNome.trim() || !formFoto} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.45)', background: (formNome.trim() && formFoto) ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.02)', color: (formNome.trim() && formFoto) ? '#4ADE80' : '#5A5070', cursor: (formNome.trim() && formFoto) ? 'pointer' : 'not-allowed', fontFamily: 'Cinzel,serif', fontSize: 11 }}>✦ Adicionar</button>
                <button onClick={() => { setShowAddForm(false); setFormNome(''); setFormFoto(''); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#5A5070', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 11 }}>Cancelar</button>
              </div>
            </div>
          )}

          {/* ESTADOS VAZIOS — centralizados dentro do mapa */}
          {!currentMap && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.3 }}>🗺️</div>
              <div style={{ fontFamily: 'Cinzel,serif', fontSize: 14, color: '#6A5A7A', marginBottom: 16 }}>
                {masterMode ? 'Crie um novo mapa para começar.' : 'O Mestre ainda não revelou nenhum mapa de batalha.'}
              </div>
              {masterMode && maps.length === 0 && <button onClick={addMap} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid rgba(232,25,60,0.4)', background: 'rgba(232,25,60,0.1)', color: '#E8193C', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 13, letterSpacing: '0.08em' }}>+ Criar Primeiro Mapa</button>}
            </div>
          )}

          {currentMap && !currentMap.img && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.3 }}>🖼️</div>
              <div style={{ fontFamily: 'Cinzel,serif', fontSize: 14, color: '#6A5A7A', marginBottom: 16 }}>{masterMode ? 'Envie a imagem deste mapa.' : 'Este mapa ainda não possui uma imagem.'}</div>
              {masterMode && <button onClick={() => fileRef.current?.click()} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid rgba(232,25,60,0.4)', background: 'rgba(232,25,60,0.1)', color: '#E8193C', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 13, letterSpacing: '0.08em' }}>📁 Enviar Imagem</button>}
            </div>
          )}

          {/* MAPA — ocupa 100% da área disponível */}
          {currentMap && currentMap.img && (
            <div
              ref={frameRef}
              title={zoom > 1 ? 'Clique e arraste para mover · use a roda para controlar o zoom' : 'Use a roda do mouse para aproximar'}
              onPointerDown={pingMode ? sendMapPing : (rulerMode ? startRuler : onMapPanStart)}
              onPointerMove={rulerMode ? moveRuler : onMapPanMove}
              onPointerUp={rulerMode ? endRuler : endMapPan}
              onPointerCancel={rulerMode ? endRuler : endMapPan}
              onLostPointerCapture={endMapPan}
              style={{
                position: 'absolute', inset: 0,
                display: zoom > 1 ? 'block' : 'flex',
                alignItems: zoom > 1 ? undefined : 'center',
                justifyContent: zoom > 1 ? undefined : 'center',
                overflow: zoom > 1 ? 'auto' : 'hidden',
                overscrollBehavior: 'contain',
                scrollbarGutter: zoom > 1 ? 'stable' : undefined,
                cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in',
                touchAction: 'none',
              }}
            >
              <div
                ref={mapRef}
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  width: baseSize.w ? baseSize.w * zoom : '100%',
                  height: baseSize.h ? baseSize.h * zoom : '100%',
                  userSelect: 'none', touchAction: 'none',
                }}
              >
                <img src={currentMap.img} alt="mapa de batalha" draggable={false} onLoad={handleMapImgLoad} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />
                {ruler && (()=>{const dx=(ruler.end.x-ruler.start.x)/100*(baseSize.w||1)*zoom;const dy=(ruler.end.y-ruler.start.y)/100*(baseSize.h||1)*zoom;const meters=Math.sqrt(dx*dx+dy*dy)/(pixelsPerMeter*tokenScale);return <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:24,overflow:'visible'}}><line x1={`${ruler.start.x}%`} y1={`${ruler.start.y}%`} x2={`${ruler.end.x}%`} y2={`${ruler.end.y}%`} stroke='#58D9FF' strokeWidth={2*zoom} strokeDasharray={`${7*zoom} ${5*zoom}`}/><circle cx={`${ruler.start.x}%`} cy={`${ruler.start.y}%`} r={4*zoom} fill='#58D9FF'/><circle cx={`${ruler.end.x}%`} cy={`${ruler.end.y}%`} r={4*zoom} fill='#58D9FF'/><text x={`${(ruler.start.x+ruler.end.x)/2}%`} y={`${(ruler.start.y+ruler.end.y)/2}%`} fill='#D7F7FF' fontSize={12*zoom} textAnchor='middle' style={{paintOrder:'stroke',stroke:'#02040A',strokeWidth:4*zoom,fontFamily:'Cinzel,serif'}}>{meters.toFixed(1)} m</text></svg>;})()}
                {(currentMap.tokens || []).map(token => {
                  const info = TOKEN_TYPES[token.tipo] || TOKEN_TYPES.jogador;
                  const controller=tokenControllers[String(token.id)]||'';
                  const isSelected = selectedId === token.id;
                  const canDrag = masterMode || !token.locked;
                  const dispSize = (token.size || 70) * tokenScale;
                  const linkedEnemyVitals = token.enemyId ? enemies.find(e => String(e.id) === String(token.enemyId)) : null;
                  const linkedSheetVitals = token.sheetId ? sheetVitals[String(token.sheetId)] : null;
                  const independentVitals = hasIndividualHp(token) ? enemyTokenVitals(token,enemyTemplateForToken(token)) : null;
                  const displayHp = independentVitals ? independentVitals.hp : (linkedSheetVitals ? Number(linkedSheetVitals.hp||0) : Number(token.hp||0));
                  const displayMaxHp = independentVitals ? independentVitals.maxHp : (linkedSheetVitals ? Number(linkedSheetVitals.maxHp||1) : Number(token.maxHp||0));
                  const healthRingColor = displayMaxHp > 0 ? hpColor(displayHp, displayMaxHp) : 'transparent';
                  return (
                    <div
                      key={token.id}
                      data-combat-entity-id={String(token.sheetId||token.enemyId||token.id||'').replace(/^[pe]_/, '')}
                      data-token-id={String(token.id||'')}
                      aria-label={(token.nome||'Token')+(controller?' · controlado por '+controller:'')}
                      onPointerDown={e => pingMode ? sendMapPing(e) : (canDrag && onTokenPointerDown(e, token))}
                      style={{
                        position: 'absolute', left: `${token.x}%`, top: `${token.y}%`,
                        transform: 'translate(-50%, -50%)', cursor: controller ? 'wait' : canDrag ? 'grab' : 'not-allowed',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 * tokenScale,
                        zIndex: draggingId === token.id ? 80 : isSelected ? 15 : 5,
                        touchAction: 'none',
                        transition: draggingId === token.id ? 'none' : 'left 28ms linear, top 28ms linear',
                        willChange: draggingId === token.id ? 'left, top' : 'auto',
                      }}
                    >
                     {isSelected && Number(token.rangeMeters||0)>0 && <div style={{position:'absolute',width:(Number(token.rangeMeters)*pixelsPerMeter*2)*tokenScale,height:(Number(token.rangeMeters)*pixelsPerMeter*2)*tokenScale,borderRadius:'50%',border:`${1.5*tokenScale}px dashed ${info.color}99`,background:`${info.color}0C`,pointerEvents:'none',zIndex:-1}}/>}
                     {displayMaxHp>0 && <>{(masterMode || !hasIndividualHp(token)) && (<div style={{fontSize:9*tokenScale,color:hpColor(displayHp,displayMaxHp),fontFamily:'Cinzel,serif',fontWeight:800,background:'rgba(3,4,10,.76)',borderRadius:5*tokenScale,padding:`${1*tokenScale}px ${6*tokenScale}px`,marginBottom:1*tokenScale,textShadow:'0 1px 4px #000'}}>❤ {displayHp}/{displayMaxHp}</div>)}<div style={{width:Math.max(46*tokenScale,dispSize),height:5*tokenScale,borderRadius:5*tokenScale,overflow:'hidden',background:'rgba(0,0,0,.7)',border:`${.7*tokenScale}px solid rgba(255,255,255,.2)`,marginBottom:1*tokenScale}}><div style={{height:'100%',width:`${Math.max(0,Math.min(100,(displayHp/Math.max(1,displayMaxHp))*100))}%`,background:hpColor(displayHp,displayMaxHp),transition:'width .25s'}}/></div></>}
                     <div style={{
                      width: dispSize, height: dispSize,
                      background: 'transparent', overflow: 'visible',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                     }}>
                      {(controller||claimingToken===String(token.id))&&<span className="token-collaborator">{controller?controller+' movimentando':'Obtendo controle'}</span>}
                        {token.foto
                          ? <img src={token.foto} alt="" draggable={false} style={{
                              width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none',
                              transform: `rotate(${Number(token.rotation || 0)}deg)`, transformOrigin: '50% 50%',
                              /* HP HEALTH CONTOUR 2026-09-17 */
                              filter: draggingId === token.id
                                ? `drop-shadow(0 0 1px rgba(255,255,255,.98)) drop-shadow(0 0 ${Math.max(7,9*tokenScale)}px ${info.color})`
                                : isSelected
                                  ? `drop-shadow(0 0 1px rgba(255,255,255,.96)) drop-shadow(0 0 ${Math.max(5,7*tokenScale)}px ${info.color})`
                                  : (displayMaxHp>0 ? `drop-shadow(0 0 1px ${healthRingColor}) drop-shadow(0 0 ${Math.max(3,4*tokenScale)}px ${healthRingColor}99) drop-shadow(0 2px 4px rgba(0,0,0,.68))` : 'drop-shadow(0 2px 4px rgba(0,0,0,.68))'),
                              transition: (draggingId === token.id || rotatingId === token.id) ? 'none' : 'filter .14s ease, transform .12s linear',
                            }} />
                          : <span style={{ fontSize: dispSize * 0.4, filter: isSelected ? `drop-shadow(0 0 6px ${info.color})` : 'none', transform:`rotate(${Number(token.rotation || 0)}deg)`, transition:rotatingId===token.id?'none':'transform .12s linear' }}>{token.tipo === 'inimigo' ? '💀' : '🧙'}</span>}
                      </div>
                      <div style={{ fontSize: 10 * tokenScale, fontFamily: 'Cinzel,serif', color: info.color, background: 'rgba(4,6,15,0.75)', borderRadius: 5 * tokenScale, padding: `${1 * tokenScale}px ${7 * tokenScale}px`, whiteSpace: 'nowrap', maxWidth: 90 * tokenScale, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {token.nome}{token.locked && ' 🔒'}
                      </div>
                      {(isSelected || draggingId === token.id || rotatingId === token.id) && canDrag && (
                        <div
                          className="battlemap-facing-dial battlemap-facing-dial-subtle"
                          title="Arraste para girar o token"
                          onPointerDown={e=>startTokenRotation(e,token)}
                          onPointerMove={moveTokenRotation}
                          onPointerUp={endTokenRotation}
                          onPointerCancel={endTokenRotation}
                          style={{
                            position:'absolute',left:'50%',top:-Math.max(2,Math.min(7,dispSize*.05)),transform:'translate(-50%,-100%)',
                            width:Math.max(24,Math.min(32,dispSize*.30)),height:Math.max(24,Math.min(32,dispSize*.30)),borderRadius:'50%',
                            display:'grid',placeItems:'center',touchAction:'none',cursor:rotatingId===token.id?'grabbing':'grab',
                            background:'rgba(39,43,57,.88)',border:'1px solid rgba(255,255,255,.16)',
                            boxShadow:'0 3px 9px rgba(0,0,0,.52),0 0 8px rgba(255,255,255,.035)',backdropFilter:'blur(5px)',
                            zIndex:31,pointerEvents:'auto',opacity:rotatingId===token.id?1:.84,transition:'opacity .15s ease,transform .15s ease'
                          }}
                        >
                          <span style={{fontSize:Math.max(13,Math.min(17,dispSize*.16)),lineHeight:1,color:'rgba(255,255,255,.9)',pointerEvents:'none',transform:'translateY(-.5px)'}}>↻</span>
                        </div>
                      )}
                      {token.status && Object.entries(token.status).some(([,v])=>v) && <div style={{display:'flex',gap:2*tokenScale,flexWrap:'wrap',justifyContent:'center',maxWidth:100*tokenScale}}>{STATUS_LIST.filter(st=>token.status?.[st.id]).map(st=><span key={st.id} title={st.label} style={{fontSize:10*tokenScale,filter:'drop-shadow(0 0 3px #000)'}}>{st.icon}</span>)}</div>}
                      {floatingEffects.filter(f=>String(f.mapId)===String(currentMap.id)&&String(f.tokenId)===String(token.id)).map(f=><div key={f.id} style={{position:'absolute',left:'50%',top:-8*tokenScale,color:f.color||'#fff',fontFamily:'Cinzel Decorative,serif',fontWeight:900,fontSize:16*tokenScale,textShadow:'0 2px 6px #000,0 0 10px currentColor',whiteSpace:'nowrap',pointerEvents:'none',animation:'floatingCombatText 2.7s ease-out forwards',zIndex:50}}>{f.text}</div>)}
                    </div>
                  );
                })}
                {battlePing && String(battlePing.mapId)===String(currentMap.id) && (
                  <div key={battlePing.id} className="battlemap-ping" style={{left:`${battlePing.x}%`,top:`${battlePing.y}%`,'--ping-color':battlePing.color||'#A855F7'}} aria-label={`Ping de ${battlePing.name||'jogador'}`}>
                    <i/><i/><i/><span/><em>{battlePing.icon||'◎'}</em><b>{battlePing.name||'Ping'}{battlePing.pingLabel?` · ${battlePing.pingLabel}`:''}</b>
                  </div>
                )}
                <div
                  onPointerDown={startFogDraw}
                  onPointerMove={moveFogDraw}
                  onPointerUp={endFogDraw}
                  onPointerCancel={endFogDraw}
                  style={{position:'absolute',inset:0,zIndex:30,pointerEvents:masterMode&&fogMode!=='off'?'auto':'none',cursor:fogMode==='erase'?'cell':'crosshair',touchAction:'none'}}
                >
                  {(fogByMap[String(currentMap.id)] || []).map(p => (
                    <div key={p.id} style={{position:'absolute',left:`${p.x}%`,top:`${p.y}%`,width:`${p.size}%`,aspectRatio:'1',transform:'translate(-50%,-50%)',borderRadius:'50%',background:'radial-gradient(circle,rgba(0,0,0,.995) 0%,rgba(0,0,0,.995) 68%,rgba(0,0,0,.92) 82%,rgba(0,0,0,0) 100%)',filter:'blur(1px)',pointerEvents:'none'}}/>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PAINEL DO TOKEN SELECIONADO — flutuante, canto superior direito */}
          {selectedToken && masterMode && (
            <div role="region" aria-label={'Controle do token '+selectedToken.nome} style={{ position: 'absolute', top: 10, right: 10, zIndex: 41, width: 280, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, background: 'rgba(10,12,28,0.96)', padding: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', backdropFilter:'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${(TOKEN_TYPES[selectedToken.tipo] || TOKEN_TYPES.jogador).color}55`, flexShrink: 0 }}>
                  {selectedToken.foto && <img src={selectedToken.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                </div>
                <input value={selectedToken.nome} onChange={e => updateToken(selectedToken.id, { nome: e.target.value })} style={{ flex: 1, fontFamily: 'Cinzel,serif', fontSize: 12 }} />
                <button onClick={() => setSelectedId(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#5A5070', borderRadius: 5, cursor: 'pointer', padding: '3px 8px', fontSize: 11 }}>✕</button>
              </div>
              <label style={{display:'block',fontSize:9,color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:10}}>Ficha de referência<select value={selectedToken.enemyId?`enemy:${selectedToken.enemyId}`:(selectedToken.sheetId?`sheet:${selectedToken.sheetId}`:'')} onChange={e=>{const raw=e.target.value;const idx=raw.indexOf(':');const kind=idx>0?raw.slice(0,idx):'';const id=idx>0?raw.slice(idx+1):'';const patch={sheetId:kind==='sheet'?id:'',enemyId:kind==='enemy'?id:''};const next={...selectedToken,...patch};const source=enemyTemplateForToken(next);updateToken(selectedToken.id,{...patch,...(hasIndividualHp(next)&&source?{hp:source.hp,maxHp:source.maxHp,hpMode:'individual'}:{})});}} style={{width:'100%',marginTop:4,fontSize:10}}><option value=''>Nenhuma — HP manual</option><optgroup label='Personagens'>{sheets.map(s=><option key={`sheet_${s.id}`} value={`sheet:${s.id}`}>{s.nome||'Personagem'}</option>)}</optgroup>{masterMode&&<optgroup label='Inimigos'>{enemies.map(enemy=><option key={`enemy_${enemy.id}`} value={`enemy:${enemy.id}`}>💀 {enemy.nome||'Inimigo'} · {Number(enemy.hp||0)}/{enemyMaxHpForToken(enemy)} HP</option>)}</optgroup>}</select><span style={{display:'block',marginTop:4,color:'#51465D',fontSize:8}}>Inimigos têm HP individual. A ficha fornece a vida inicial; alterar este token não altera os demais.</span></label>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: '#7B6D8A', fontFamily: 'Cinzel,serif' }}>Tamanho do token</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <button onClick={() => updateToken(selectedToken.id, { size: Math.max(10, Math.round((selectedToken.size || 70) / 2)) })} title="Reduzir pela metade" style={{ padding: '3px 7px', borderRadius: 5, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.03)', color: '#9A8AA8', cursor: 'pointer', fontSize: 9 }}>½×</button>
                    <input type="number" min={10} max={400} step={5} value={selectedToken.size || 70} onChange={e => updateToken(selectedToken.id, { size: Math.max(10, Math.min(400, Number(e.target.value) || 10)) })} style={{ width: 58, textAlign: 'center', fontSize: 10, padding: '3px 4px' }} />
                    <span style={{ fontSize: 9, color: '#655B72' }}>px</span>
                    <button onClick={() => updateToken(selectedToken.id, { size: Math.min(400, Math.round((selectedToken.size || 70) * 2)) })} title="Dobrar o tamanho" style={{ padding: '3px 7px', borderRadius: 5, border: '1px solid rgba(168,85,247,.3)', background: 'rgba(168,85,247,.08)', color: '#C8A8E8', cursor: 'pointer', fontSize: 9 }}>2×</button>
                  </div>
                </div>
                <input type="range" min={10} max={400} step={5} value={selectedToken.size || 70} onChange={e => updateToken(selectedToken.id, { size: Number(e.target.value) })} style={{ width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 8, color: '#51465D', fontFamily: 'Cinzel,serif' }}><span>Muito pequeno</span><span>Muito grande</span></div>
              </div>
              {(()=>{const vital=tokenVitalState(selectedToken);const linked=vital.kind==='sheet';return <div style={{marginBottom:10,padding:8,borderRadius:8,border:'1px solid rgba(255,255,255,.07)',background:'rgba(255,255,255,.018)'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,marginBottom:7,flexWrap:'wrap'}}>
                  {[-10,-5,-1].map(v=><button key={v} onClick={()=>adjustTokenHp(selectedToken,v)} style={{padding:'3px 7px',borderRadius:6,border:'1px solid rgba(232,25,60,.3)',background:'rgba(232,25,60,.09)',color:'#E8193C',cursor:'pointer',fontSize:9}}>{v}</button>)}
                  <b style={{minWidth:62,textAlign:'center',font:'800 12px Cinzel,serif',color:hpColor(vital.hp,Math.max(1,vital.maxHp))}}>❤ {vital.hp}/{vital.maxHp}</b>
                  {[1,5,10].map(v=><button key={v} onClick={()=>adjustTokenHp(selectedToken,v)} style={{padding:'3px 7px',borderRadius:6,border:'1px solid rgba(74,222,128,.3)',background:'rgba(74,222,128,.09)',color:'#4ADE80',cursor:'pointer',fontSize:9}}>+{v}</button>)}
                </div>
                {masterMode&&lastHpChangeRef.current&&String(lastHpChangeRef.current.tokenId)===String(selectedToken.id)&&<button onClick={()=>undoTokenHp(selectedToken)} style={{width:'100%',margin:'0 0 7px',padding:'5px 8px',borderRadius:7,border:'1px solid rgba(232,160,32,.28)',background:'rgba(232,160,32,.08)',color:'#E8A020',cursor:'pointer',font:'700 8px Cinzel,serif'}}>↩ Desfazer última mudança de HP</button>}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                  <label style={{fontSize:9,color:'#7B6D8A',fontFamily:'Cinzel,serif'}}>HP<input type='number' value={vital.hp} onChange={e=>setTokenLinkedHp(selectedToken,Number(e.target.value))} style={{width:'100%',fontSize:11,marginTop:3}}/></label>
                  <label style={{fontSize:9,color:'#7B6D8A',fontFamily:'Cinzel,serif'}}>HP Máx.<input type='number' value={vital.maxHp} disabled={linked} onChange={e=>updateToken(selectedToken.id,{maxHp:Math.max(0,Number(e.target.value)||0),...(hasIndividualHp(selectedToken)?{hp:Math.min(vital.hp,Math.max(0,Number(e.target.value)||0)),hpMode:'individual'}:{})})} style={{width:'100%',fontSize:11,marginTop:3,opacity:linked?.62:1}}/></label>
                </div>
                {vital.kind==='individual'&&<p style={{fontSize:9,color:'#b69dbe',margin:'5px 0 0'}}>Vida exclusiva deste inimigo.</p>}{linked&&<div style={{marginTop:5,fontSize:8,color:'#665A70',fontFamily:'Cinzel,serif'}}>HP máximo vem da ficha vinculada.</div>}
              </div>})()}
              <label style={{display:'flex',alignItems:'center',gap:7,fontSize:9,color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:9}}>Área/alcance <input type='range' min='0' max='30' step='1' value={selectedToken.rangeMeters||0} onChange={e=>updateToken(selectedToken.id,{rangeMeters:Number(e.target.value)})} style={{flex:1}}/><b style={{color:'#58D9FF'}}>{selectedToken.rangeMeters||0}m</b></label>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => updateToken(selectedToken.id, { locked: !selectedToken.locked })} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: `1px solid ${selectedToken.locked ? 'rgba(232,160,32,0.4)' : 'rgba(255,255,255,0.1)'}`, background: selectedToken.locked ? 'rgba(232,160,32,0.1)' : 'rgba(255,255,255,0.02)', color: selectedToken.locked ? '#E8A020' : '#8A7A6A', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 11 }}>{selectedToken.locked ? '🔒 Travado' : '🔓 Livre'}</button>
                <button onClick={() => deleteToken(selectedToken.id)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(232,25,60,0.3)', background: 'rgba(232,25,60,0.08)', color: '#E8193C', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 11 }}>🗑</button>
              </div>
            </div>
          )}

         {/* PING — disponível para jogador e Mestre */}
          {currentMap?.img && (
            <button
              className={`battlemap-ping-button ${pingMode?'active':''}`}
              onClick={() => { setPingMode(v=>!v); setRulerMode(false); if(masterMode) setFogMode('off'); }}
              title={pingMode?'Clique no mapa para marcar um ponto':'Ping: marque um ponto para toda a mesa'}
              style={{'--ping-color':ownPingColor,position:'absolute',right:14,top:masterMode?72:12,zIndex:47}}
            >
              <span>◎</span><b>{pingMode?'CLIQUE NO MAPA':'PING'}</b>
            </button>
          )}

         {currentMap?.img && pingMode && (
            <div className="battlemap-ping-wheel-inline">
              {Object.entries(PING_META).map(([key,meta]) => (
                <button key={key} className={pingType===key?'active':''} style={{'--ping-choice-color':meta.color}} onClick={() => setPingType(key)}>
                  <span>{meta.icon}</span>{meta.label}
                </button>
              ))}
            </div>
          )}

         {/* CONTROLE DE ZOOM — canto inferior direito, compacto */}
          {currentMap?.img && (
            <div className="battlemap-zoom-controls" style={{ position: 'absolute', right: 92, bottom: 16, zIndex: 40, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(6,8,18,0.82)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '6px 8px', backdropFilter:'none', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
              <span style={{ fontSize: 12 }}>🔍</span>
              <button onClick={() => setZoom(z => Math.max(1, +(z - 0.25).toFixed(2)))} style={zoomBtnStyle}>−</button>
              <span style={{ fontSize: 11, color: '#C8B8A0', fontFamily: 'Cinzel,serif', minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))} style={zoomBtnStyle}>+</button>
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />
              <button onClick={() => setZoom(1)} title="Ajustar à tela" style={zoomBtnStyle}>⤢</button>
              <span title="A roda do mouse também controla o zoom" style={{ fontSize: 9, color: '#655B72', fontFamily: 'Cinzel,serif', whiteSpace: 'nowrap', marginLeft: 2 }}>RODA DO MOUSE</span>
            </div>
          )}

          {/* FICHAS FLUTUANTES */}
          {floatingSheets.map(p => {
            const sheet = sheets.find(s => String(s.id) === p.sheetId);
            if (!sheet) return null;
            const cls = CLASSES.find(c => c.id === sheet.classe) || CLASSES[0];
            const sc = SHEET_COLORS[sheet.classe] || cls.color;
            return (
              <FloatingSheetPanel
                key={p.sheetId}
                sheet={sheet}
                color={sc}
                pos={p}
                zIndex={p.z}
                customAbilities={customAbilities[sheet.id] || []}
                onSaveCustomAbilities={(novas) => saveCustomAb(sheet.id, novas)}
                onChangeSheet={(d) => updSheet(sheet.id, d)}
                onDrag={(x, y) => moveFloatingSheet(p.sheetId, x, y)}
                onFocus={() => bringFloatingToFront(p.sheetId)}
                onClose={() => closeFloatingSheet(p.sheetId)}
              />
            );
          })}

          {/* FICHAS DE INIMIGOS — somente Mestre */}
          {masterMode && floatingEnemies.map(p => {
            const enemy = enemies.find(e => String(e.id) === String(p.enemyId));
            if (!enemy) return null;
            return (
              <FloatingEnemyPanel
                key={`enemy_${p.enemyId}`}
                enemy={enemy}
                pos={p}
                zIndex={p.z}
                onChangeEnemy={data => updEnemyFromMap(enemy.id, data)}
                onDrag={(x,y) => moveFloatingEnemy(p.enemyId,x,y)}
                onFocus={() => bringEnemyToFront(p.enemyId)}
                onClose={() => closeFloatingEnemy(p.enemyId)}
              />
            );
          })}
          <MapSheetDock masterMode={masterMode} sheets={sheets} enemies={enemies} floatingEnemies={floatingEnemies} onSelectSheet={handleSelectSheet} onSelectEnemy={toggleFloatingEnemy} onCreateSheet={quickAddSheet}/>


        </div>
      )}
    </div>
  );
}

function FloatingSheetPanel({ sheet, color, pos, zIndex, customAbilities, onSaveCustomAbilities, onChangeSheet, onDrag, onFocus, onClose }) {
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0, px: 0, py: 0 });

  const onHeaderDown = (e) => {
    onFocus();
    draggingRef.current = true;
    movedRef.current = false;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startRef.current = { x: pos.x, y: pos.y, px: clientX, py: clientY };
  };

  useEffect(() => {
    const move = (e) => {
      if (!draggingRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - startRef.current.px;
      const dy = clientY - startRef.current.py;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
      let nx = startRef.current.x + dx;
      let ny = startRef.current.y + dy;
      nx = Math.min(window.innerWidth - 60, Math.max(-260, nx));
      ny = Math.min(window.innerHeight - 40, Math.max(0, ny));
      onDrag(nx, ny);
    };
    const up = () => {
      if (draggingRef.current && !movedRef.current) onClose();
      draggingRef.current = false;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [onDrag, onClose]);

  return (
    <div className="floating-sheet" onPointerDown={onFocus} style={{ '--class-color':color, position: 'fixed', left: pos.x, top: pos.y, width: 320, maxHeight: '68vh', zIndex, background: 'rgba(8,10,22,0.98)', border: `1px solid ${color}55`, borderRadius: 12, boxShadow: '0 14px 44px rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        onPointerDown={onHeaderDown}
        onTouchStart={onHeaderDown}
        style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, background: `${color}14`, borderBottom: `1px solid ${color}33`, cursor: 'grab', userSelect: 'none', flexShrink: 0 }}
      >
        <span style={{ fontSize: 13, color }}>⠿</span>
        <span style={{ flex: 1, fontFamily: 'Cinzel,serif', fontSize: 12.5, color, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sheet.nome || 'Sem nome'}</span>
        <button onClick={onClose} onPointerDown={e => e.stopPropagation()} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: '#8A7A6A', cursor: 'pointer', fontSize: 11, padding: '2px 7px', borderRadius: 5 }}>✕</button>
      </div>
      <div style={{ overflowY: 'auto', padding: 13, flex: 1 }}>
        <BattleMapCharPanel
          sheet={sheet}
          customAbilities={customAbilities}
          onSaveCustomAbilities={onSaveCustomAbilities}
          onChangeSheet={onChangeSheet}
        />
      </div>
    </div>
  );
}


export default BattleMapSection;

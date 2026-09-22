import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);
const must = (condition, message) => {
  if (!condition) throw new Error(`Visible update proof patch: ${message}`);
};
const replaceOnce = (source, before, after, label) => {
  must(source.includes(before), `${label} não encontrado`);
  return source.replace(before, after);
};
const appendOnce = (source, marker, block) => source.includes(marker) ? source : `${source.trimEnd()}\n\n${block.trim()}\n`;

// A tela de acesso mostra imediatamente o último roster seguro. Senhas nunca
// entram no cache; a entrada continua bloqueada até chegar a ficha autoritativa.
const accessFile = 'src/experience/PlayerAccess.jsx';
let access = read(accessFile);
access = replaceOnce(
  access,
  "import { CLASSES, getSheetMaxHp } from '../data/gameData';",
  "import { CLASSES, getSheetMaxHp } from '../data/gameData';\nimport { readAccessRoster, writeAccessRoster } from './accessRosterCache';",
  'import do roster seguro',
);
access = replaceOnce(
  access,
  `  const [sheets, setSheets] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState('');`,
  `  const cachedRoster = useMemo(() => readAccessRoster(), []);
  const [sheets, setSheets] = useState(() => cachedRoster);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [selectedId, setSelectedId] = useState(() => String(cachedRoster[0]?.id || ''));`,
  'estado inicial do roster',
);
access = replaceOnce(
  access,
  `      return onSnapshot(ownSheetRef, snap => {
        setSheets(snap.exists() ? [{ id: snap.id, ...snap.data() }] : []);
        setLoaded(true);
      }, () => { setSheets([]); setLoaded(true); });`,
  `      return onSnapshot(ownSheetRef, snap => {
        setSheets(snap.exists() ? [{ id: snap.id, ...snap.data(), _cached:false }] : []);
        setSyncError(false);
        setLoaded(true);
      }, () => { setSyncError(true); setLoaded(true); });`,
  'listener da própria ficha',
);
access = replaceOnce(
  access,
  `    const unsub = onSnapshot(collection(db, 'sheets'), snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSheets(rows);
      setLoaded(true);
      setSelectedId(prev => prev || String(rows[0]?.id || ''));
    }, () => setLoaded(true));`,
  `    const unsub = onSnapshot(collection(db, 'sheets'), snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data(), _cached:false }));
      setSheets(rows);
      writeAccessRoster(rows, getSheetMaxHp);
      setSyncError(false);
      setLoaded(true);
      setSelectedId(prev => rows.some(row => String(row.id) === String(prev)) ? prev : String(rows[0]?.id || ''));
    }, () => { setSyncError(true); setLoaded(true); });`,
  'cache do roster ao vivo',
);
access = replaceOnce(
  access,
  `  const enterPlayer = () => {
    if (!selected) return;`,
  `  const enterPlayer = () => {
    if (!selected || selected._cached) {
      setError('Aguarde a sincronização segura desta ficha.');
      return;
    }`,
  'bloqueio de entrada pelo cache',
);
access = replaceOnce(
  access,
  `  const cls = CLASSES.find(c => c.id === selected?.classe);
  const maxHp = selected ? getSheetMaxHp(selected) : 0;`,
  `  const cls = CLASSES.find(c => c.id === selected?.classe);
  const maxHp = selected ? (Number(selected.maxHp) || getSheetMaxHp(selected)) : 0;
  const passwordProtected = selected?._cached ? Boolean(selected.passwordProtected) : Boolean(selected?.senha);`,
  'metadados seguros da ficha',
);
access = replaceOnce(
  access,
  `            <div className="access-character-strip">
              {sheets.map(s => {`,
  `            {!sheets.length && !loaded && <div className="access-roster-skeleton" aria-label="Carregando personagens">{Array.from({length:6}).map((_,index)=><i key={index}/>)}</div>}
            <div className="access-character-strip">
              {sheets.map(s => {`,
  'skeleton do roster',
);
access = replaceOnce(
  access,
  `            {selected?.senha ? (`,
  `            {passwordProtected ? (`,
  'senha pelo resumo seguro',
);
access = replaceOnce(
  access,
  `            <button className="access-enter" disabled={!selected} onClick={enterPlayer}>Entrar como {selected?.nome || 'Jogador'} <span>→</span></button>`,
  `            <button className="access-enter" disabled={!selected || Boolean(selected?._cached) || syncError} onClick={enterPlayer}>{selected?._cached ? 'Sincronizando ficha...' : 'Entrar como '+(selected?.nome || 'Jogador')} <span>\u2192</span></button>`,
  'botão de entrada sincronizado',
);
access = replaceOnce(
  access,
  `        {error && <div className="access-error">{error}</div>}
        {!loaded && <div className="access-loading">Consultando as fichas...</div>}`,
  `        <div className={'access-sync-status '+(syncError?'error':loaded?'ready':'connecting')} role="status"><i/>{syncError?'Sem conexão com o grimório':loaded?'Fichas sincronizadas em tempo real':sheets.length?'Exibindo fichas salvas enquanto sincroniza':'Conectando ao grimório...'}</div>
        {error && <div className="access-error">{error}</div>}`,
  'status de sincronização',
);
write(accessFile, access);

// A atualização passa a se apresentar após o login e o Mestre ganha uma prévia
// local, sem alterar HP, turno ou histórico da campanha.
const gameFile = 'src/experience/GameExperience3.adventure.jsx';
let game = read(gameFile);
const noticeComponent = `
const VISUAL_UPDATE_SESSION_KEY='dinastia_visual_update_2026_09_22_v2';

function SessionUpdateNotice({ready,combat,onClose}){
  const [visible,setVisible]=useState(()=>{try{return sessionStorage.getItem(VISUAL_UPDATE_SESSION_KEY)!=='seen';}catch(_){return true;}});
  useEffect(()=>{
    if(!ready||!visible)return undefined;
    const timer=window.setTimeout(()=>{
      try{sessionStorage.setItem(VISUAL_UPDATE_SESSION_KEY,'seen');}catch(_){}
      setVisible(false);onClose?.();
    },7200);
    return()=>window.clearTimeout(timer);
  },[ready,visible,onClose]);
  if(!ready||!visible)return null;
  const dismiss=()=>{try{sessionStorage.setItem(VISUAL_UPDATE_SESSION_KEY,'seen');}catch(_){}setVisible(false);onClose?.();};
  return <aside className={'g3-update-notice '+(combat?'combat':'')} aria-live="polite">
    <button onClick={dismiss} aria-label="Fechar aviso">{'\\u00D7'}</button>
    <small>{combat?'COMBATE CINEMATOGR\\u00C1FICO':'MESA SINCRONIZADA'}</small>
    <strong>Experi\\u00EAncia visual ativa</strong>
    <div><span>{'\\u2694'} Turnos</span><span>{'\\u2665'} Dano e cura</span><span>{'\\u25C9'} Orbes</span><span>1-4 Atalhos</span></div>
  </aside>;
}
`;
game = replaceOnce(game, '\n\nfunction WorldParticles(', `${noticeComponent}\nfunction WorldParticles(`, 'aviso visual da sessão');
game = replaceOnce(
  game,
  `<span className="g3-presence-label"><i/> {rows.length} online</span>`,
  `<span className="g3-presence-label"><i/> {rows.length} online</span><span className="g3-sync-state"><i/> TEMPO REAL</span>`,
  'estado realtime visível',
);
game = replaceOnce(
  game,
  `function DirectorPanel({game,session,combat,combatState,masterMode,onClose,onPatchGame,onNavigate,onUpdateSession,onStartSession,onEndSession,onNextTurn,onEndCombat,onSoundscape,onCosmic,onAtlas,onJournal,onCreateItem,sheets,directorMedia,onSaveMedia}){`,
  `function DirectorPanel({game,session,combat,combatState,masterMode,onClose,onPatchGame,onNavigate,onUpdateSession,onStartSession,onEndSession,onNextTurn,onEndCombat,onSoundscape,onCosmic,onAtlas,onJournal,onCreateItem,sheets,directorMedia,onSaveMedia,onPreviewFx}){`,
  'prop da prévia visual',
);
game = replaceOnce(
  game,
  `<h3>Evento rápido</h3><div className="g3-event-row">`,
  `<div className="g3-fx-preview"><div><small>VALIDA\\u00C7\\u00C3O VISUAL</small><b>Efeitos cinematogr\\u00E1ficos</b><span>Mostra turno, cr\\u00EDtico e feedback sem alterar a campanha.</span></div><button onClick={onPreviewFx}>Executar pr\\u00E9via nesta tela</button></div><h3>Evento rápido</h3><div className="g3-event-row">`,
  'controle de prévia do Mestre',
);
game = replaceOnce(
  game,
  `  const genericCinematic=effectiveMode==='cinematic'&&!bossVisible;

  return <div`,
  `  const genericCinematic=effectiveMode==='cinematic'&&!bossVisible;
  const previewCombatFx=useCallback(()=>{
    const active=Array.isArray(combatState?.initiative)?combatState.initiative[Number(combatState?.turnIdx||0)]:null;
    const entity=active||selectedSheet||{};
    const entityId=String(entity.id||selectedSheet?.id||'').replace(/^[pe]_/, '');
    const color=entity.color||selectedClass?.color||'#a855f7';
    const ts=Date.now();
    window.dispatchEvent(new CustomEvent('dinastia:cosmic-live',{detail:{id:nowId('fx_preview_turn'),type:'turn_announce',icon:'\\u2694',text:entity.nome||selectedSheet?.nome||'Combatente',subtitle:entity.className||selectedClass?.name||'Aventureiro',color,soft:false,ts}}));
    window.setTimeout(()=>{
      window.dispatchEvent(new CustomEvent('dinastia:hp-change',{detail:{id:nowId('fx_preview_hp'),entityId,name:entity.nome||selectedSheet?.nome||'Combatente',diff:-7,critical:true,death:false,ts:Date.now()}}));
      pushFeedback({kind:'damage',icon:'\\u2726',name:'Cr\\u00EDtico de demonstra\\u00E7\\u00E3o',text:'Pr\\u00E9via local, nenhum HP foi alterado.',value:'\\u22127'});
    },2150);
  },[combatState?.initiative,combatState?.turnIdx,selectedSheet,selectedClass?.color,selectedClass?.name,pushFeedback]);

  return <div`,
  'callback da prévia local',
);
game = replaceOnce(
  game,
  `    <CombatVitalFx ownSheetId={access?.role==='player'?String(access?.sheetId||selectedSheet?.id||''):''}/>
    <TopContext`,
  `    <CombatVitalFx ownSheetId={access?.role==='player'?String(access?.sheetId||selectedSheet?.id||''):''}/>
    <SessionUpdateNotice ready={gameReady} combat={Boolean(combat?.active)}/>
    <TopContext`,
  'montagem do aviso visual',
);
game = replaceOnce(
  game,
  `onCreateItem={createItem} sheets={sheets} directorMedia={directorMedia} onSaveMedia={saveDirectorMedia}/>` ,
  `onCreateItem={createItem} sheets={sheets} directorMedia={directorMedia} onSaveMedia={saveDirectorMedia} onPreviewFx={previewCombatFx}/>` ,
  'prévia no Game Director',
);
write(gameFile, game);

const accessCssFile = 'src/experience/access.css';
let accessCss = read(accessCssFile);
accessCss = appendOnce(accessCss, 'VISIBLE ACCESS SYNC 2026-09-22', `
/* VISIBLE ACCESS SYNC 2026-09-22 */
.access-sync-status{width:max-content;max-width:100%;margin:11px auto 0;display:flex;align-items:center;justify-content:center;gap:7px;padding:6px 10px;border:1px solid rgba(88,217,255,.12);border-radius:999px;background:rgba(88,217,255,.035);font:700 7px/1 'Cinzel',serif;letter-spacing:.08em;color:#6f91a1}.access-sync-status i{width:6px;height:6px;border-radius:50%;background:#58d9ff;box-shadow:0 0 9px rgba(88,217,255,.65);animation:accessSyncPulse 1.25s ease-in-out infinite}.access-sync-status.ready{border-color:rgba(74,222,128,.14);background:rgba(74,222,128,.035);color:#759985}.access-sync-status.ready i{background:#4ADE80;box-shadow:0 0 9px rgba(74,222,128,.65);animation:none}.access-sync-status.error{border-color:rgba(232,25,60,.18);background:rgba(232,25,60,.05);color:#c2707e}.access-sync-status.error i{background:#E8193C;box-shadow:0 0 9px rgba(232,25,60,.55);animation:none}.access-roster-skeleton{display:grid;grid-template-columns:repeat(6,minmax(90px,1fr));gap:9px;margin:3px 0 16px}.access-roster-skeleton i{height:130px;border-radius:13px;border:1px solid rgba(168,85,247,.08);background:linear-gradient(105deg,rgba(255,255,255,.015) 25%,rgba(168,85,247,.06) 45%,rgba(255,255,255,.015) 65%);background-size:220% 100%;animation:accessRosterSweep 1.4s linear infinite}@keyframes accessSyncPulse{50%{opacity:.35;transform:scale(.72)}}@keyframes accessRosterSweep{to{background-position:-220% 0}}@media(max-width:900px){.access-roster-skeleton{grid-template-columns:repeat(2,minmax(0,1fr))}.access-roster-skeleton i{height:116px}}
`);
write(accessCssFile, accessCss);

const gameCssFile = 'src/experience/game-experience-3.css';
let gameCss = read(gameCssFile);
gameCss = appendOnce(gameCss, 'VISIBLE UPDATE PROOF 2026-09-22', `
/* VISIBLE UPDATE PROOF 2026-09-22 */
.g3-sync-state{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border:1px solid rgba(74,222,128,.13);border-radius:999px;background:rgba(74,222,128,.035);font:700 5px/1 'Cinzel',serif;letter-spacing:.08em;color:#71947f;white-space:nowrap}.g3-sync-state i{width:5px;height:5px;border-radius:50%;background:#4ADE80;box-shadow:0 0 8px rgba(74,222,128,.6)}.g3-update-notice{position:fixed;z-index:var(--g3-z-notify,620);left:50%;top:128px;transform:translateX(-50%);width:min(560px,calc(100vw - 40px));padding:13px 42px 13px 16px;border:1px solid rgba(88,217,255,.22);border-radius:14px;background:linear-gradient(135deg,rgba(4,10,18,.96),rgba(11,5,22,.96));box-shadow:0 18px 44px rgba(0,0,0,.48),0 0 30px rgba(88,217,255,.08);pointer-events:auto;animation:g3UpdateReveal .55s cubic-bezier(.2,.8,.2,1) both}.g3-update-notice.combat{border-color:rgba(232,25,60,.27);box-shadow:0 18px 44px rgba(0,0,0,.48),0 0 34px rgba(232,25,60,.1)}.g3-update-notice>button{position:absolute;right:10px;top:9px;width:27px;height:27px;border:0;border-radius:50%;background:rgba(255,255,255,.04);color:#8a7b91;cursor:pointer}.g3-update-notice>small{display:block;font:700 7px/1 'Cinzel',serif;letter-spacing:.22em;color:#58d9ff}.g3-update-notice.combat>small{color:#E8193C}.g3-update-notice>strong{display:block;margin-top:5px;font:800 15px/1.1 'Cinzel Decorative','Cinzel',serif;color:#d8cce0}.g3-update-notice>div{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.g3-update-notice>div span{padding:4px 7px;border:1px solid rgba(255,255,255,.055);border-radius:999px;background:rgba(255,255,255,.02);font:700 6px/1 'Cinzel',serif;color:#817489}.g3-fx-preview{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px;border:1px solid rgba(88,217,255,.13);border-radius:10px;background:linear-gradient(135deg,rgba(88,217,255,.035),rgba(168,85,247,.035))}.g3-fx-preview small,.g3-fx-preview b,.g3-fx-preview span{display:block}.g3-fx-preview small{font:700 6px/1 'Cinzel',serif;letter-spacing:.14em;color:#58d9ff}.g3-fx-preview b{margin-top:4px;font:700 9px/1.1 'Cinzel',serif;color:#b8a7c0}.g3-fx-preview span{margin-top:4px;font-size:8px;color:#62576a}.g3-fx-preview button{min-height:35px;padding:7px 9px;border:1px solid rgba(88,217,255,.2);border-radius:8px;background:rgba(88,217,255,.055);color:#8abed1;cursor:pointer;font:700 6px/1.2 'Cinzel',serif}@keyframes g3UpdateReveal{from{opacity:0;transform:translate(-50%,-12px) scale(.97)}to{opacity:1;transform:translate(-50%,0) scale(1)}}@media(max-width:900px){.g3-update-notice{top:110px;width:calc(100vw - 20px)}.g3-sync-state{display:none}.g3-fx-preview{grid-template-columns:1fr}.g3-fx-preview button{width:100%}}@media(prefers-reduced-motion:reduce){.g3-update-notice,.access-sync-status i{animation-duration:.01ms!important}}
`);
write(gameCssFile, gameCss);

for (const [file, markers] of [
  [accessFile, ['readAccessRoster', 'Fichas sincronizadas em tempo real', 'Sincronizando ficha...']],
  [gameFile, ['function SessionUpdateNotice', 'TEMPO REAL', 'onPreviewFx={previewCombatFx}']],
  [accessCssFile, ['VISIBLE ACCESS SYNC 2026-09-22', '.access-roster-skeleton']],
  [gameCssFile, ['VISIBLE UPDATE PROOF 2026-09-22', '.g3-fx-preview']],
]) {
  const value = read(file);
  markers.forEach(marker => must(value.includes(marker), `${marker} ausente em ${file}`));
}

console.log('Dinastia E: carregamento visível, cache seguro e prévia cinematográfica aplicados.');

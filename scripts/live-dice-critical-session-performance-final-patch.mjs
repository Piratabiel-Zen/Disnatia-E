import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);
const must = (condition, message) => {
  if (!condition) throw new Error(`Live dice/session final patch: ${message}`);
};

const replayFile = 'src/experience/SharedDiceReplay.jsx';
let replay = read(replayFile);
replay = replay.replace(
  "import { db } from '../core/firebase';",
  "import { db } from '../core/firebase';\nimport { createLiveSnapshotGate, isNewLiveDocument } from './liveDiceGate';",
);
const replayEffectStart = replay.indexOf("  useEffect(() => {\n    let feedPrimed = false;");
const replayEffectEnd = replay.indexOf("\n\n  useEffect(() => {\n    if (active || !queue.length) return;", replayEffectStart);
must(replayEffectStart >= 0 && replayEffectEnd > replayEffectStart, 'listener do replay não encontrado');
const replayEffect = `  useEffect(() => {
    // O Firebase pode entregar cache local e servidor em callbacks diferentes.
    // Cada conexão precisa de uma linha de corte confirmada pelo servidor antes
    // de aceitar eventos; reconexões formam uma nova linha de corte silenciosa.
    const feedGate = createLiveSnapshotGate();
    const configGate = createLiveSnapshotGate();
    const feedQuery = query(collection(db, 'public_dice_events'), orderBy('publishedAt', 'desc'), limit(20));

    const unsubFeed = onSnapshot(feedQuery, { includeMetadataChanges: true }, snap => {
      if (!feedGate.shouldDeliver(snap.metadata)) {
        snap.docs.forEach(item => remember(getReplayId({ _feedId: item.id, ...(item.data() || {}) })));
        return;
      }
      snap.docChanges().forEach(change => {
        if (!isNewLiveDocument(change)) return;
        enqueue({ _feedId: change.doc.id, ...(change.doc.data() || {}) });
      });
    }, error => console.error('Falha no feed do replay compartilhado:', error));

    const unsubConfig = onSnapshot(doc(db, 'config', 'public_dice_roll'), { includeMetadataChanges: true }, snap => {
      if (!snap.exists()) return;
      const payload = snap.data() || {};
      if (!configGate.shouldDeliver(snap.metadata)) {
        remember(getReplayId(payload));
        return;
      }
      enqueue(payload);
    }, error => console.error('Falha no fallback compartilhado de dados:', error));

    return () => { unsubFeed(); unsubConfig(); };
  }, [enqueue, remember]);`;
replay = replay.slice(0, replayEffectStart) + replayEffect + replay.slice(replayEffectEnd);
must(replay.includes('{ includeMetadataChanges: true }'), 'snapshot autoritativo do replay ausente');
must(!replay.includes('feedPrimed'), 'gate antigo do replay ainda presente');
write(replayFile, replay);

const critical = `import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../core/firebase';
import { createLiveSnapshotGate, isNewLiveDocument } from './liveDiceGate';
import './dice-critical-fx.css';

const EFFECT_DURATION = 3100;
const firstNameOf = value => {
  const clean = String(value || 'Jogador').trim();
  return clean ? clean.split(/\\s+/)[0] : 'Jogador';
};
const eventIdOf = data => String(
  data?.rollId || data?._feedId
  || [data?.ts || 0, data?.rollerSheetId || '', data?.base || '', data?.total || ''].join('_'),
);
const naturalD20Of = data => {
  const sides = Number(data?.sides || 20);
  const values = Array.isArray(data?.values) && data.values.length
    ? data.values.map(value => Number(value))
    : [Number(data?.base)];
  if (sides !== 20 || values.length !== 1 || !Number.isFinite(values[0])) return null;
  return values[0];
};
const accentOf = data => {
  const color = String(data?.rollerColor || '').trim();
  return color || (data?.rollerRole === 'master' ? '#E8A020' : '#C8A8E8');
};

export default function DiceCriticalFx() {
  const [event, setEvent] = useState(null);
  const seenRef = useRef(new Set());

  const remember = useCallback(id => {
    if (!id) return;
    seenRef.current.add(id);
    if (seenRef.current.size > 240) seenRef.current = new Set(Array.from(seenRef.current).slice(-140));
  }, []);

  const ingest = useCallback(data => {
    if (!data) return;
    const id = eventIdOf(data);
    if (!id || seenRef.current.has(id)) return;
    remember(id);
    const natural = naturalD20Of(data);
    if (natural !== 20 && natural !== 1) return;
    setEvent({
      id,
      positive: natural === 20,
      roller: firstNameOf(data.roller),
      natural,
      color: accentOf(data),
    });
  }, [remember]);

  useEffect(() => {
    const feedGate = createLiveSnapshotGate();
    const configGate = createLiveSnapshotGate();
    const feedQuery = query(collection(db, 'public_dice_events'), orderBy('publishedAt', 'desc'), limit(20));
    const unsubFeed = onSnapshot(feedQuery, { includeMetadataChanges: true }, snap => {
      if (!feedGate.shouldDeliver(snap.metadata)) {
        snap.docs.forEach(item => remember(eventIdOf({ _feedId: item.id, ...(item.data() || {}) })));
        return;
      }
      snap.docChanges().forEach(change => {
        if (isNewLiveDocument(change)) ingest({ _feedId: change.doc.id, ...(change.doc.data() || {}) });
      });
    }, () => {});
    const unsubConfig = onSnapshot(doc(db, 'config', 'public_dice_roll'), { includeMetadataChanges: true }, snap => {
      if (!snap.exists()) return;
      const payload = snap.data() || {};
      if (!configGate.shouldDeliver(snap.metadata)) {
        remember(eventIdOf(payload));
        return;
      }
      ingest(payload);
    }, () => {});
    return () => { unsubFeed(); unsubConfig(); };
  }, [ingest, remember]);

  useEffect(() => {
    const receiveLocalRoll = customEvent => ingest(customEvent.detail);
    window.addEventListener('dinastia:dice-live', receiveLocalRoll);
    return () => window.removeEventListener('dinastia:dice-live', receiveLocalRoll);
  }, [ingest]);

  useEffect(() => {
    if (!event) return undefined;
    const timer = window.setTimeout(() => setEvent(null), EFFECT_DURATION);
    return () => window.clearTimeout(timer);
  }, [event?.id]);

  if (!event) return null;
  const effectColor = event.positive ? event.color : '#ff667d';
  return (
    <div key={event.id} className={'dice-critical-fx ' + (event.positive ? 'positive' : 'negative')}
      style={{ '--crit': effectColor }} aria-live="assertive"
      aria-label={event.positive ? 'Crítico natural, vinte no dado' : 'Falha crítica, um no dado'}>
      <div className="dice-critical-fx-vignette" />
      <div className="dice-critical-fx-ring ring-a" />
      <div className="dice-critical-fx-ring ring-b" />
      <div className="dice-critical-fx-sparks" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, index) => <i key={index} style={{ '--spark-index': index }} />)}
      </div>
      <div className="dice-critical-fx-message">
        <span>{event.positive ? '✦' : '◆'}</span>
        <strong>{event.positive ? 'CRÍTICO NATURAL' : 'FALHA CRÍTICA'}</strong>
        <small>{event.roller} · D20 = {event.natural}</small>
      </div>
    </div>
  );
}
`;
write('src/experience/DiceCriticalFx.jsx', critical);

const widgetFile = 'src/shell/DiceWidget.jsx';
let widget = read(widgetFile);
widget = widget.replace(
  "      rollerColor: rollerProfile.color || '#C8A8E8',",
  "      rollerColor: access?.role === 'master' ? (access?.color || '#E8A020') : (rollerProfile.color || '#C8A8E8'),",
);
widget = widget.replace(
  `    setResult(res);\n    setRevealed(false);\n    try { await publishDiceResult(res); }`,
  `    setResult(res);\n    setRevealed(false);\n    // O autor vê o crítico sem esperar o percurso de rede; o rollId evita duplicar\n    // o efeito quando o mesmo evento retorna pelo Firebase.\n    window.dispatchEvent(new CustomEvent('dinastia:dice-live', { detail: res }));\n    try { await publishDiceResult(res); }`,
);
must(widget.includes("window.dispatchEvent(new CustomEvent('dinastia:dice-live'"), 'efeito crítico local ausente');
must(widget.includes("access?.role === 'master' ? (access?.color || '#E8A020')"), 'cor do Mestre ausente');
write(widgetFile, widget);

const combatEventsFile = 'src/core/combatEvents.js';
let combatEvents = read(combatEventsFile);
combatEvents = combatEvents.replace(
  'import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";',
  'import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";',
);
combatEvents = combatEvents.replace(
  "setDoc(doc(db, 'public_dice_events', String(payload.rollId)), { ...payload, publishedAt: Date.now() }, { merge: true })",
  "setDoc(doc(db, 'public_dice_events', String(payload.rollId)), { ...payload, publishedAt: serverTimestamp() }, { merge: true })",
);
must(combatEvents.includes('publishedAt: serverTimestamp()'), 'ordenação do feed pelo servidor ausente');
write(combatEventsFile, combatEvents);

const criticalCssFile = 'src/experience/dice-critical-fx.css';
let criticalCss = read(criticalCssFile);
criticalCss = criticalCss
  .replace('animation:critFxFade 2.45s ease both', 'animation:critFxFade 3.1s ease both')
  .replace('radial-gradient(circle at 50% 48%,var(--crit-soft),transparent 34%)', 'radial-gradient(circle at 50% 48%,color-mix(in srgb,var(--crit) 23%,transparent),transparent 38%)')
  .replace('animation:critVignette 2.45s ease both', 'animation:critVignette 3.1s ease both')
  .replace('--a:calc(var(--spark-index) * 45deg)', '--a:calc(var(--spark-index) * 30deg)')
  .replace('width:2px;height:24px', 'width:3px;height:32px')
  .replace('animation:critMessage 2.25s cubic-bezier(.18,.72,.2,1) both', 'animation:critMessage 2.9s cubic-bezier(.18,.72,.2,1) both');
criticalCss += `\n/* LIVE D20 CHARACTER-COLOR CRITICAL 2026-09-22 */\n.dice-critical-fx.positive:before{content:'';position:absolute;left:50%;top:50%;width:min(78vw,920px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--crit) 34%,transparent),color-mix(in srgb,var(--crit) 8%,transparent) 32%,transparent 69%);transform:translate(-50%,-50%) scale(.24);opacity:0;animation:critCharacterBurst 1.8s cubic-bezier(.16,.78,.22,1) both}\n.dice-critical-fx.positive .dice-critical-fx-message{border-color:color-mix(in srgb,var(--crit) 48%,rgba(255,255,255,.08));box-shadow:0 12px 42px rgba(0,0,0,.4),0 0 38px color-mix(in srgb,var(--crit) 28%,transparent)}\n@keyframes critCharacterBurst{0%{opacity:0;transform:translate(-50%,-50%) scale(.18)}18%{opacity:.92}100%{opacity:0;transform:translate(-50%,-50%) scale(1.12)}}\n@media(prefers-reduced-motion:reduce){.dice-critical-fx.positive:before{animation-duration:.01ms!important}}\n`;
must(criticalCss.includes('LIVE D20 CHARACTER-COLOR CRITICAL'), 'CSS de destaque crítico ausente');
write(criticalCssFile, criticalCss);

const experienceFile = 'src/experience/ExperienceKit.generated.jsx';
let experience = read(experienceFile);
experience = experience.replace(
  "} from '../data/gameData';",
  "} from '../data/gameData';\nimport { mergeSessionContext, readSessionCache, writeSessionCache } from '../adventure/sessionCache';",
);
experience = experience.replace(
  "  const [session,setSession]=useState({active:false,title:'',location:'',objective:'',subtitle:''});",
  "  const [session,setSession]=useState(()=>readSessionCache());",
);
experience = experience.replace(
  "    unsubscribers.push(onSnapshot(doc(db,'config','session'),{includeMetadataChanges:true},snap=>setSession(normalizeDoc(snap,{active:false,title:'',location:'',objective:'',subtitle:''}))));",
  "    unsubscribers.push(onSnapshot(doc(db,'config','session'),{includeMetadataChanges:true},snap=>{const next=normalizeDoc(snap,{active:false,title:'',location:'',objective:'',subtitle:''});writeSessionCache(next);setSession(next);}));",
);
experience = experience.replace(
`  const updateSession=useCallback(async patch=>{
    const payload={...patch,updatedAt:Date.now()};
    if(patch.active===true && !session.active) payload.startedAt=Date.now();
    await setDoc(doc(db,'config','session'),payload,{merge:true});
  },[session.active]);`,
`  const updateSession=useCallback(async patch=>{
    const payload={...patch,updatedAt:Date.now()};
    if(patch.active===true && !session.active) payload.startedAt=Date.now();
    const next=mergeSessionContext(session,payload);
    writeSessionCache(next);setSession(next);
    await setDoc(doc(db,'config','session'),payload,{merge:true});
  },[session]);`,
);
experience = experience.replace(
`    await setDoc(doc(db,'config','session'),payload,{merge:true});
    await addJournal(\`Sessão iniciada\${payload.title?\`: \${payload.title}\`:''}.\`,'session',{icon:'✦',color:'#A855F7'});`,
`    const next=mergeSessionContext(session,payload);
    writeSessionCache(next);setSession(next);
    await setDoc(doc(db,'config','session'),payload,{merge:true});
    await addJournal(\`Sessão iniciada\${payload.title?\`: \${payload.title}\`:''}.\`,'session',{icon:'✦',color:'#A855F7'});`,
);
experience = experience.replace(
`  const endSession=useCallback(async()=>{
    await setDoc(doc(db,'config','session'),{active:false,endedAt:Date.now(),updatedAt:Date.now()},{merge:true});
    await addJournal('A sessão foi encerrada.','session',{icon:'◌',color:'#6A5A7A',memory:true});
  },[addJournal]);`,
`  const endSession=useCallback(async()=>{
    const payload={active:false,endedAt:Date.now(),updatedAt:Date.now()};
    const next=mergeSessionContext(session,payload);
    writeSessionCache(next);setSession(next);
    await setDoc(doc(db,'config','session'),payload,{merge:true});
    await addJournal('A sessão foi encerrada.','session',{icon:'◌',color:'#6A5A7A',memory:true});
  },[session,addJournal]);`,
);
for (const marker of [
  'useState(()=>readSessionCache())',
  'writeSessionCache(next);setSession(next)',
  "import { mergeSessionContext, readSessionCache, writeSessionCache }",
]) must(experience.includes(marker), `cache da sessão sem ${marker}`);
write(experienceFile, experience);

console.log('Dinastia E: D20 crítico por personagem, feed estritamente ao vivo e contexto instantâneo da sessão aplicados.');

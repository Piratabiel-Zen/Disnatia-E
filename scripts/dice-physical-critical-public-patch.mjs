import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);

let physicalDice = read('src/experience/PhysicalDiceTray.jsx');
physicalDice = physicalDice.replace(
  /const OPERA_GX_SAFE =[^;]+;\n\n/,
  '',
);
physicalDice = physicalDice.replace(
  "if (OPERA_GX_SAFE || document.documentElement.dataset.quality==='light' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {",
  "if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {",
);

if (physicalDice.includes('OPERA_GX_SAFE') || physicalDice.includes("dataset.quality==='light'")) {
  throw new Error('Dice restoration patch: the lightweight 3D bypass is still active');
}
if (!physicalDice.includes("import('@3d-dice/dice-box-threejs')")) {
  throw new Error('Dice restoration patch: physical dice engine is missing');
}
write('src/experience/PhysicalDiceTray.jsx', physicalDice);

const criticalFx = `import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../core/firebase';
import './dice-critical-fx.css';

const EVENT_TTL = 7000;
const EFFECT_DURATION = 2450;

const firstNameOf = value => {
  const clean = String(value || 'Jogador').trim();
  return clean ? clean.split(/\\s+/)[0] : 'Jogador';
};

const eventIdOf = data => String(
  data?.rollId
  || data?._feedId
  || \`\${data?.ts || 0}_\${data?.rollerSheetId || ''}_\${data?.base || ''}_\${data?.total || ''}\`,
);

const naturalD20Of = data => {
  const sides = Number(data?.sides || 20);
  const values = Array.isArray(data?.values) && data.values.length
    ? data.values.map(value => Number(value))
    : [Number(data?.base)];
  if (sides !== 20 || values.length !== 1 || !Number.isFinite(values[0])) return null;
  return values[0];
};

export default function DiceCriticalFx() {
  const [event, setEvent] = useState(null);
  const joinedAtRef = useRef(Date.now());
  const seenRef = useRef(new Set());

  const remember = useCallback(id => {
    if (!id) return;
    seenRef.current.add(id);
    if (seenRef.current.size > 240) {
      seenRef.current = new Set(Array.from(seenRef.current).slice(-140));
    }
  }, []);

  const ingest = useCallback(data => {
    if (!data) return;
    const id = eventIdOf(data);
    if (!id || seenRef.current.has(id)) return;
    remember(id);

    const ts = Number(data.ts || 0);
    if (!ts || Date.now() - ts > EVENT_TTL) return;
    const natural = naturalD20Of(data);
    const positive = !!data.isCrit || natural === 20;
    const negative = !!data.isFail || natural === 1;
    if (!positive && !negative) return;

    setEvent({
      id,
      positive: positive && !negative,
      roller: firstNameOf(data.roller),
      natural: natural ?? (positive ? 20 : 1),
    });
  }, [remember]);

  useEffect(() => {
    let feedPrimed = false;
    let configPrimed = false;
    const feedQuery = query(collection(db, 'public_dice_events'), orderBy('ts', 'desc'), limit(20));

    const unsubFeed = onSnapshot(feedQuery, snap => {
      if (!feedPrimed) {
        feedPrimed = true;
        snap.docs.forEach(item => {
          const payload = { _feedId: item.id, ...(item.data() || {}) };
          if (Number(payload.ts || 0) >= joinedAtRef.current - 1200) ingest(payload);
          else remember(eventIdOf(payload));
        });
        return;
      }
      snap.docChanges().forEach(change => {
        if (change.type !== 'removed') ingest({ _feedId: change.doc.id, ...(change.doc.data() || {}) });
      });
    }, () => {});

    const unsubConfig = onSnapshot(doc(db, 'config', 'public_dice_roll'), snap => {
      if (!snap.exists()) return;
      const payload = snap.data() || {};
      if (!configPrimed) {
        configPrimed = true;
        if (Number(payload.ts || 0) >= joinedAtRef.current - 1200) ingest(payload);
        else remember(eventIdOf(payload));
        return;
      }
      ingest(payload);
    }, () => {});

    return () => { unsubFeed(); unsubConfig(); };
  }, [ingest, remember]);

  useEffect(() => {
    if (!event) return undefined;
    const timer = window.setTimeout(() => setEvent(null), EFFECT_DURATION);
    return () => window.clearTimeout(timer);
  }, [event?.id]);

  if (!event) return null;

  return (
    <div
      key={event.id}
      className={\`dice-critical-fx \${event.positive ? 'positive' : 'negative'}\`}
      aria-live="assertive"
      aria-label={event.positive ? 'Acerto crítico, vinte natural' : 'Falha crítica, um natural'}
    >
      <div className="dice-critical-fx-vignette" />
      <div className="dice-critical-fx-ring ring-a" />
      <div className="dice-critical-fx-ring ring-b" />
      <div className="dice-critical-fx-sparks" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, index) => <i key={index} style={{ '--spark-index': index }} />)}
      </div>
      <div className="dice-critical-fx-message">
        <span>{event.positive ? '✦' : '◆'}</span>
        <strong>{event.positive ? 'ACERTO CRÍTICO' : 'FALHA CRÍTICA'}</strong>
        <small>{event.roller} · {event.natural} natural</small>
      </div>
    </div>
  );
}
`;

write('src/experience/DiceCriticalFx.jsx', criticalFx);

const widget = read('src/shell/DiceWidget.jsx');
if (!widget.includes("rollerRole: access?.role === 'master' ? 'master' : 'player'")) {
  throw new Error('Dice restoration patch: public master identity is missing from DiceWidget');
}

const events = read('src/core/combatEvents.js');
if (!events.includes("doc(db, 'config', 'public_dice_roll')") || !events.includes("doc(db, 'public_dice_events'")) {
  throw new Error('Dice restoration patch: public dice broadcast channels are missing');
}

console.log('Dinastia E: dado físico 3D restaurado, críticos naturais globais e rolagens públicas do Mestre validados.');

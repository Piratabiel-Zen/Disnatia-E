import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection, doc, limit, onSnapshot, orderBy, query, setDoc,
} from 'firebase/firestore';
import { db } from '../core/firebase';
import { DiceTrayVisual } from '../shell/DiceWidget';

const DICE_TTL = 16000;
const COSMIC_TTL = 22000;

function eventId(payload, kind) {
  if (!payload) return '';
  return String(payload.rollId || payload.id || `${kind}_${payload.ts || 0}`);
}

function useDurableChannel({ configId, collectionName, kind, ttl }) {
  const [events, setEvents] = useState([]);
  const seenRef = useRef(new Set());

  const ingest = useCallback((payload) => {
    if (!payload) return;
    const ts = Number(payload.ts || 0);
    if (!ts || Date.now() - ts > ttl) return;
    const id = eventId(payload, kind);
    if (!id || seenRef.current.has(id)) return;

    seenRef.current.add(id);
    if (seenRef.current.size > 250) {
      const recent = Array.from(seenRef.current).slice(-160);
      seenRef.current = new Set(recent);
    }

    const row = { ...payload, _rtId: id };
    setEvents(prev => [...prev, row].sort((a,b) => Number(a.ts||0)-Number(b.ts||0)).slice(-40));

    setTimeout(() => {
      setEvents(prev => prev.filter(item => item._rtId !== id));
    }, ttl);
  }, [kind, ttl]);

  useEffect(() => {
    const configRef = doc(db, 'config', configId);
    const feedQuery = query(collection(db, collectionName), orderBy('ts', 'desc'), limit(20));

    const unsubConfig = onSnapshot(configRef, { includeMetadataChanges: true }, snap => {
      if (!snap.exists()) return;
      const payload = snap.data() || {};
      ingest(payload);

      // Só o navegador que originou a gravação espelha o evento para o feed durável.
      // Os demais clientes apenas consomem, evitando 5 gravações idênticas por evento.
      if (snap.metadata.hasPendingWrites) {
        const id = eventId(payload, kind);
        if (id) {
          setDoc(doc(db, collectionName, id), {
            ...payload,
            mirroredAt: Date.now(),
          }, { merge: true }).catch(() => {});
        }
      }
    }, () => {});

    const unsubFeed = onSnapshot(feedQuery, snap => {
      const rows = snap.docs
        .map(d => ({ _feedId: d.id, ...(d.data() || {}) }))
        .filter(d => Number(d.ts || 0) && Date.now() - Number(d.ts || 0) <= ttl)
        .sort((a,b) => Number(a.ts||0)-Number(b.ts||0));
      rows.forEach(ingest);
    }, () => {});

    return () => { unsubConfig(); unsubFeed(); };
  }, [collectionName, configId, ingest, kind, ttl]);

  return events;
}

function DiceBroadcastCard({ result, index }) {
  const [revealed, setRevealed] = useState(false);
  const isCrit = !!result.isCrit;
  const isFail = !!result.isFail;
  const color = isCrit ? '#4ADE80' : isFail ? '#E8193C' : '#C8A8E8';

  return (
    <div className="rt-dice-card" style={{ '--rt-index': index, '--rt-color': color }}>
      <div className="rt-dice-head">🎲 {result.roller || 'Jogador'} · D{result.sides}</div>
      <DiceTrayVisual
        sides={Number(result.sides || 20)}
        finalValue={Number(result.base || result.total || 0)}
        rollTs={Number(result.ts || Date.now())}
        color={color}
        onSettled={() => setRevealed(true)}
      />
      <div className={`rt-dice-result ${revealed ? 'shown' : ''}`}>
        <strong>{result.total}</strong>
        {Number(result.bonus || 0) !== 0 && <span>{result.base} {Number(result.bonus) >= 0 ? '+' : '−'} {Math.abs(Number(result.bonus))}</span>}
        {(isCrit || isFail) && <b>{isCrit ? 'CRÍTICO!' : 'FALHA!'}</b>}
      </div>
    </div>
  );
}

function CosmicBroadcastQueue({ events }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const queuedRef = useRef(new Set());

  useEffect(() => {
    const fresh = events.filter(e => !queuedRef.current.has(e._rtId));
    if (!fresh.length) return;
    fresh.forEach(e => queuedRef.current.add(e._rtId));
    setQueue(prev => [...prev, ...fresh].sort((a,b) => Number(a.ts||0)-Number(b.ts||0)));
  }, [events]);

  useEffect(() => {
    if (current || !queue.length) return;
    const next = queue[0];
    setCurrent(next);
    setQueue(prev => prev.slice(1));
    const duration = next.soft ? 1700 : 3400;
    const timer = setTimeout(() => setCurrent(null), duration);
    return () => clearTimeout(timer);
  }, [current, queue]);

  if (!current) return null;
  const color = current.color || '#A855F7';
  return (
    <div className={`realtime-cosmic-event rt-${current.type || 'message'} ${current.soft ? 'soft' : ''}`} style={{ '--event-color': color }}>
      <div className="rt-cosmic-grid" />
      <div className="rt-cosmic-ring" />
      <div className="rt-cosmic-message">
        <span>{current.icon || '✦'}</span>
        <strong>{current.text || 'O mundo foi alterado.'}</strong>
      </div>
    </div>
  );
}

export default function RealtimeBroadcasts() {
  const diceEvents = useDurableChannel({
    configId: 'public_dice_roll',
    collectionName: 'public_dice_events',
    kind: 'dice',
    ttl: DICE_TTL,
  });
  const cosmicEvents = useDurableChannel({
    configId: 'cosmic_event',
    collectionName: 'cosmic_events',
    kind: 'cosmic',
    ttl: COSMIC_TTL,
  });

  const visibleDice = diceEvents.slice(-3).reverse();
  return (
    <>
      <div className="rt-dice-stack">
        {visibleDice.map((result, index) => <DiceBroadcastCard key={result._rtId} result={result} index={index} />)}
      </div>
      <CosmicBroadcastQueue events={cosmicEvents} />
    </>
  );
}

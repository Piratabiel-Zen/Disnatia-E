import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection, doc, limit, onSnapshot, orderBy, query, setDoc,
} from 'firebase/firestore';
import { db } from '../core/firebase';
import PhysicalDiceTray from './PhysicalDiceTray';

const DICE_TTL = 16000;
const COSMIC_TTL = 22000;
const DICE_CLIENT_KEY = 'dinastia-dice-client-id';

function getDiceClientId() {
  try {
    let id = localStorage.getItem(DICE_CLIENT_KEY);
    if (!id) {
      id = `dice_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(DICE_CLIENT_KEY, id);
    }
    return id;
  } catch (_) {
    return 'dice-client';
  }
}

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

function DiceBroadcastQueue({ events }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const queuedRef = useRef(new Set());
  const localClientIdRef = useRef(getDiceClientId());
  const settleTimerRef = useRef(0);

  useEffect(() => {
    const fresh = events.filter(e =>
      e?._rtId &&
      !queuedRef.current.has(e._rtId) &&
      (!e.sourceClientId || e.sourceClientId !== localClientIdRef.current)
    );
    if (!fresh.length) return;
    fresh.forEach(e => queuedRef.current.add(e._rtId));
    if (queuedRef.current.size > 240) {
      const recent = Array.from(queuedRef.current).slice(-160);
      queuedRef.current = new Set(recent);
    }
    setQueue(prev => [...prev, ...fresh].sort((a,b) => Number(a.ts||0)-Number(b.ts||0)));
  }, [events]);

  useEffect(() => {
    if (current || !queue.length) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
  }, [current, queue]);

  useEffect(() => () => window.clearTimeout(settleTimerRef.current), []);

  if (!current) return null;
  const isCrit = !!current.isCrit;
  const isFail = !!current.isFail;
  const color = current.rollerColor || (isCrit ? '#4ADE80' : isFail ? '#E8193C' : '#C8A8E8');
  const values = Array.isArray(current.values) && current.values.length ? current.values : [current.base];

  return (
    <div className="rt-dice-replay" style={{ '--rt-color': color }}>
      <PhysicalDiceTray
        sides={Number(current.sides || 20)}
        finalValue={Number(current.base || current.total || 1)}
        finalValues={values}
        rollTs={Number(current.ts || Date.now())}
        color={color}
        total={Number(current.total || 0)}
        bonus={Number(current.bonus || 0)}
        onSettled={() => {
          window.clearTimeout(settleTimerRef.current);
          settleTimerRef.current = window.setTimeout(() => setCurrent(null), 1300);
        }}
      />
    </div>
  );
}

function CosmicBroadcastQueue({ events }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const queuedRef = useRef(new Set());

  useEffect(() => {
    const fresh = events.filter(e => e?._rtId && !queuedRef.current.has(e._rtId));
    if (!fresh.length) return;
    fresh.forEach(e => queuedRef.current.add(e._rtId));
    if (queuedRef.current.size > 240) {
      const recent = Array.from(queuedRef.current).slice(-160);
      queuedRef.current = new Set(recent);
    }
    setQueue(prev => [...prev, ...fresh].sort((a,b) => Number(a.ts||0)-Number(b.ts||0)));
  }, [events]);

  useEffect(() => {
    if (current || !queue.length) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
  }, [current, queue]);

  useEffect(() => {
    if (!current) return undefined;
    const duration = current.soft ? 1900 : (current.type === 'critical' ? 4200 : 3400);
    const timer = window.setTimeout(() => setCurrent(null), duration);
    return () => window.clearTimeout(timer);
  }, [current?._rtId]);

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

  return (
    <>
      <DiceBroadcastQueue events={diceEvents} />
      <CosmicBroadcastQueue events={cosmicEvents} />
    </>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection, limit, onSnapshot, orderBy, query,
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

function useDurableChannel({ collectionName, kind, ttl }) {
  const [events, setEvents] = useState([]);
  const seenRef = useRef(new Set());
  const primedRef = useRef(false);

  const ingest = useCallback((payload) => {
    if (!payload) return;
    const id = eventId(payload, kind);
    if (!id || seenRef.current.has(id)) return;
    seenRef.current.add(id);
    if (seenRef.current.size > 300) {
      const recent = Array.from(seenRef.current).slice(-180);
      seenRef.current = new Set(recent);
    }
    const row = { ...payload, _rtId: id, _receivedAt: Date.now() };
    setEvents(prev => [...prev, row].sort((a,b) => Number(a._receivedAt||0)-Number(b._receivedAt||0)).slice(-40));
    window.setTimeout(() => {
      setEvents(prev => prev.filter(item => item._rtId !== id));
    }, ttl);
  }, [kind, ttl]);

  useEffect(() => {
    primedRef.current = false;
    const feedQuery = query(collection(db, collectionName), orderBy('ts', 'desc'), limit(20));
    return onSnapshot(feedQuery, snap => {
      if (!primedRef.current) {
        primedRef.current = true;
        snap.docs.forEach(d => seenRef.current.add(eventId({ _feedId:d.id, ...(d.data()||{}) }, kind)));
        return;
      }
      snap.docChanges().forEach(change => {
        if (change.type === 'removed') return;
        ingest({ _feedId:change.doc.id, ...(change.doc.data()||{}) });
      });
    }, error => console.error('Falha no feed realtime:', collectionName, error));
  }, [collectionName, ingest, kind]);

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
  // Compatibilidade com o patch legado de identidade:  const color = result.rollerColor || (isCrit ? '#4ADE80' : isFail ? '#E8193C' : '#C8A8E8');
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
  // Mantém o canal de dados ativo para espelhar o evento no feed durável, mas a
  // renderização 3D fica exclusivamente em SharedDiceReplay. Assim não existe um
  // segundo replay concorrendo com a visão local ou com o replay central.
  useDurableChannel({
    collectionName: 'public_dice_events',
    kind: 'dice',
    ttl: DICE_TTL,
  });
  const cosmicEvents = useDurableChannel({
    collectionName: 'cosmic_events',
    kind: 'cosmic',
    ttl: COSMIC_TTL,
  });

  return <CosmicBroadcastQueue events={cosmicEvents} />;
}

/*
Compatibilidade textual para scripts legados de build. Estes trechos ficam apenas em comentário
para que session-ui-patch reconheça os antigos pontos de ancoragem sem alterar o replay 3D real.
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rt-dice-card" style={{ '--rt-index': index, '--rt-color': color }}>
      <div className="rt-dice-head">🎲 {result.roller || 'Jogador'} · D{result.sides}</div>
*/

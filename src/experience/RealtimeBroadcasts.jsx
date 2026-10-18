import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection, limit, onSnapshot, orderBy, query,
} from 'firebase/firestore';
import { db } from '../core/firebase';
import { createLiveEventGate } from '../adventure/liveEventGate.mjs';

const COSMIC_TTL = 22000;

function eventId(payload, kind) {
  if (!payload) return '';
  return String(payload.rollId || payload.id || payload._feedId || `${kind}_${payload.ts || 0}`);
}

function useDurableChannel({ collectionName, kind, ttl }) {
  const [events, setEvents] = useState([]);
  const seenRef = useRef(new Set());

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
    const gate = createLiveEventGate();
    const feedQuery = query(collection(db, collectionName), orderBy('ts', 'desc'), limit(20));
    return onSnapshot(feedQuery, { includeMetadataChanges: true }, snap => {
      const entries = snap.docs.map(d => {
        const payload = { _feedId:d.id, ...(d.data()||{}) };
        return { key:eventId(payload,kind), value:payload };
      });
      gate(snap,entries).forEach(entry=>ingest(entry.value));
    }, error => console.error('Falha no feed realtime:', collectionName, error));
  }, [collectionName, ingest, kind]);

  return events;
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

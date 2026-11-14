import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../core/firebase';
import { createLiveSnapshotGate, isNewLiveDocument } from './liveDiceGate';
import './dice-critical-fx.css';

const EFFECT_DURATION = 3100;
const firstNameOf = value => {
  const clean = String(value || 'Jogador').trim();
  return clean ? clean.split(/\s+/)[0] : 'Jogador';
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

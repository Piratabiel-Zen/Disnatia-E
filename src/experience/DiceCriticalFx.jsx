import { useEffect, useRef, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../core/firebase';
import { d20CriticalOutcome } from '../adventure/diceCritical.mjs';
import './dice-critical-fx.css';

const EVENT_TTL = 7000;
const EFFECT_DURATION = 2450;

const firstNameOf = value => {
  const clean = String(value || 'Jogador').trim();
  return clean ? clean.split(/\s+/)[0] : 'Jogador';
};

export default function DiceCriticalFx() {
  const [event, setEvent] = useState(null);
  const seenRef = useRef(new Set());
  const mountedAtRef = useRef(Date.now());

  useEffect(() => {
    const present = (data, sourceId) => {
      const id = String(data.rollId || sourceId || `${data.ts || 0}_${data.rollerSheetId || ''}_${data.base || ''}`);
      if (!id || seenRef.current.has(id)) return;
      seenRef.current.add(id);
      if (seenRef.current.size > 160) seenRef.current = new Set(Array.from(seenRef.current).slice(-100));
      const ts = Number(data.ts || 0);
      if (!ts || Math.abs(Date.now() - ts) > EVENT_TTL) return;
      const critical = d20CriticalOutcome(data);
      if (!critical) return;

      setEvent({
        id,
        positive: critical.outcome === 'positive',
        roller: firstNameOf(data.roller),
        total: critical.natural,
      });
    };
    let feedPrimed = false;
    let configPrimed = false;
    const feed = query(collection(db, 'public_dice_events'), orderBy('ts', 'desc'), limit(20));
    const unsubFeed = onSnapshot(feed, snapshot => {
      if (!feedPrimed) {
        feedPrimed = true;
        snapshot.docs.forEach(row => {
          const data = row.data() || {};
          if (Number(data.ts || 0) >= mountedAtRef.current) present(data, row.id);
          else seenRef.current.add(String(data.rollId || row.id));
        });
        return;
      }
      snapshot.docChanges().forEach(change => {
        if (change.type !== 'added') return;
        present(change.doc.data() || {}, change.doc.id);
      });
    }, () => {});
    const unsubConfig = onSnapshot(doc(db, 'config', 'public_dice_roll'), snapshot => {
      if (!snapshot.exists()) { configPrimed = true; return; }
      const data = snapshot.data() || {};
      if (!configPrimed) {
        configPrimed = true;
        if (Number(data.ts || 0) >= mountedAtRef.current) present(data);
        else seenRef.current.add(String(data.rollId || `${data.ts || 0}_${data.rollerSheetId || ''}_${data.base || ''}`));
        return;
      }
      present(data);
    }, () => {});
    return () => { unsubFeed(); unsubConfig(); };
  }, []);

  useEffect(() => {
    if (!event) return undefined;
    const timer = window.setTimeout(() => setEvent(null), EFFECT_DURATION);
    return () => window.clearTimeout(timer);
  }, [event?.id]);

  if (!event) return null;

  return (
    <div
      key={event.id}
      className={`dice-critical-fx ${event.positive ? 'positive' : 'negative'}`}
      aria-live="polite"
      aria-label={event.positive ? 'Acerto crítico' : 'Falha crítica'}
    >
      <div className="dice-critical-fx-vignette" />
      <div className="dice-critical-fx-ring ring-a" />
      <div className="dice-critical-fx-ring ring-b" />
      <div className="dice-critical-fx-sparks" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => <i key={i} style={{ '--spark-index': i }} />)}
      </div>
      <div className="dice-critical-fx-message">
        <span>{event.positive ? '✦' : '◆'}</span>
        <b className="dice-critical-fx-number">{event.total}</b>
        <strong>{event.positive ? 'ACERTO CRÍTICO' : 'FALHA CRÍTICA'}</strong>
        <small>{event.roller} · D20 NATURAL</small>
      </div>
    </div>
  );
}

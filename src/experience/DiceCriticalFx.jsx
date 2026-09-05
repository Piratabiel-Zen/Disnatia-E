import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../core/firebase';
import './dice-critical-fx.css';

const EVENT_TTL = 7000;
const EFFECT_DURATION = 2450;

const firstNameOf = value => {
  const clean = String(value || 'Jogador').trim();
  return clean ? clean.split(/\s+/)[0] : 'Jogador';
};

export default function DiceCriticalFx() {
  const [event, setEvent] = useState(null);
  const primedRef = useRef(false);
  const lastIdRef = useRef('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'public_dice_roll'), snap => {
      if (!snap.exists()) return;
      const data = snap.data() || {};
      const id = String(data.rollId || `${data.ts || 0}_${data.rollerSheetId || ''}_${data.base || ''}`);

      if (!primedRef.current) {
        primedRef.current = true;
        lastIdRef.current = id;
        return;
      }
      if (!id || id === lastIdRef.current) return;
      lastIdRef.current = id;

      const ts = Number(data.ts || 0);
      if (!ts || Date.now() - ts > EVENT_TTL) return;
      if (!data.isCrit && !data.isFail) return;

      setEvent({
        id,
        positive: !!data.isCrit,
        roller: firstNameOf(data.roller),
        total: Number(data.total ?? data.base ?? 0),
      });
    }, () => {});
    return () => unsub();
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
        <strong>{event.positive ? 'ACERTO CRÍTICO' : 'FALHA CRÍTICA'}</strong>
        <small>{event.roller}{Number.isFinite(event.total) && event.total ? ` · ${event.total}` : ''}</small>
      </div>
    </div>
  );
}

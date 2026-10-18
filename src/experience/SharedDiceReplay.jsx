import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../core/firebase';
import PhysicalDiceTray from './PhysicalDiceTray';
import './shared-dice-replay.css';

const TAB_CLIENT_KEY = 'dinastia-dice-tab-id';
let fallbackTabClientId = `dice_tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export function getDiceTabClientId() {
  if (typeof window === 'undefined') return fallbackTabClientId;
  try {
    const existing = window.sessionStorage.getItem(TAB_CLIENT_KEY);
    if (existing) return existing;
    const created = `dice_tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    window.sessionStorage.setItem(TAB_CLIENT_KEY, created);
    return created;
  } catch (_) {
    return fallbackTabClientId;
  }
}

const getReplayId = payload => String(
  payload?.rollId
  || payload?._feedId
  || `${payload?.ts || 0}_${payload?.rollerSheetId || ''}_${payload?.base || ''}_${payload?.total || ''}`
);

const firstNameOf = value => {
  const clean = String(value || 'Jogador').trim();
  return clean ? clean.split(/\s+)/[0] : 'Jogador';
};

export default function SharedDiceReplay({ access }) {
  const localClientIdRef = useRef(getDiceTabClientId());
  const seenRef = useRef(new Set());
  const [queue, setQueue] = useState([]);
  const [active, setActive] = useState(null);
  const [settled, setSettled] = useState(false);
  const [overlayTarget, setOverlayTarget] = useState(null);

  const remember = useCallback(id => {
    if (!id) return;
    seenRef.current.add(id);
    if (seenRef.current.size > 240) {
      seenRef.current = new Set(Array.from(seenRef.current).slice(-140));
    }
  }, []);

  const enqueue = useCallback(payload => {
    if (!payload) return;
    const id = getReplayId(payload);
    if (!id || seenRef.current.has(id)) return;
    remember(id);

    // Cada cliente, inclusive quem rolou e o mestre, recebe a animação global.
    setQueue(prev => [...prev, { ...payload, _replayId: id }].slice(-12));
  }, [remember]);

  useEffect(() => {
    const updateOverlayTarget = () => {
      setOverlayTarget(document.fullscreenElement || document.body);
    };
    updateOverlayTarget();
    document.addEventListener('fullscreenchange', updateOverlayTarget);
    return () => document.removeEventListener('fullscreenchange', updateOverlayTarget);
  }, []);

  useEffect(() => {
    let feedPrimed = false;
    let configPrimed = false;
    const feedQuery = query(collection(db, 'public_dice_events'), orderBy('ts', 'desc'), limit(20));

    const unsubFeed = onSnapshot(feedQuery, snap => {
      if (!feedPrimed) {
        feedPrimed = true;
        snap.docs.forEach(d => remember(getReplayId({ _feedId: d.id, ...(d.data() || {}) })));
        return;
      }
      snap.docChanges().forEach(change => {
        if (change.type === 'removed') return;
        enqueue({ _feedId: change.doc.id, ...(change.doc.data() || {}) });
      });
    }, error => console.error('Falha no feed do replay compartilhado:', error));

    const unsubConfig = onSnapshot(doc(db, 'config', 'public_dice_roll'), snap => {
      if (!configPrimed) {
        configPrimed = true;
        if (!snap.exists()) return;
        const payload = snap.data() || {};
        remember(getReplayId(payload));
        return;
      }
      if (!snap.exists()) return;
      enqueue(snap.data() || {});
    }, error => console.error('Falha no fallback compartilhado de dados:', error));

    return () => { unsubFeed(); unsubConfig(); };
  }, [enqueue, remember]);

  useEffect(() => {
    if (active || !queue.length) return;
    setActive(queue[0]);
    setQueue(prev => prev.slice(1));
    setSettled(false);
  }, [active, queue]);

  useEffect(() => {
    if (!active) return undefined;
    const guard = window.setTimeout(() => setActive(null), 14000);
    return () => window.clearTimeout(guard);
  }, [active?._replayId]);

  useEffect(() => {
    if (!active || !settled) return undefined;
    const timer = window.setTimeout(() => setActive(null), 3000);
    return () => window.clearTimeout(timer);
  }, [active?._replayId, settled]);

  if (!active || !overlayTarget) return null;

  const sides = Number(active.sides || 20);
  const values = Array.isArray(active.values) && active.values.length
    ? active.values.slice(0, 5).map(value => Number(value) || 1)
    : [Number(active.base) || 1];
  const bonus = Number(active.bonus || 0);
  const base = values.reduce((sum, value) => sum + value, 0);
  const total = Number.isFinite(Number(active.total)) ? Number(active.total) : base + bonus;
  const color = active.rollerColor || (active.isCrit ? '#4ADE80' : active.isFail ? '#E8193C' : '#C8A8E8');
  const firstName = firstNameOf(active.roller);

  return createPortal(
    <div className="shared-dice-replay" aria-live="polite" aria-label={`${firstName} rolou ${values.length > 1 ? `${values.length} dados` : 'um dado'}`}>
      <div className="shared-dice-replay-card" style={{ '--replay-accent': color }}>
        <div className="shared-dice-replay-kicker">rolagem compartilhada</div>
        <PhysicalDiceTray
          sides={sides}
          finalValue={values[0]}
          finalValues={values}
          rollTs={Number(active.ts || Date.now())}
          color={color}
          total={total}
          bonus={bonus}
          onSettled={() => setSettled(true)}
        />
        <div className="shared-dice-replay-name">{firstName}</div>
        <div className={`shared-dice-replay-result ${settled ? 'is-settled' : ''}`}>
          {settled ? (
            <>
              <div className="shared-dice-replay-faces" aria-label="Faces roladas">
                {values.map((value, index) => (
                  <span
                    key={`${active._replayId}-face-${index}`}
                    className="shared-dice-replay-face"
                    style={{ animationDelay: `${index * 110}ms` }}
                  >
                    {value}
                  </span>
                ))}
              </div>
              {bonus !== 0 && (
                <div className="shared-dice-replay-breakdown">
                  {base} {bonus > 0 ? '+' : '−'} {Math.abs(bonus)} de bônus
                </div>
              )}
              <div className="shared-dice-replay-total" aria-label={`Total ${total}`}>
                <span>Total</span>
                <strong>{total}</strong>
              </div>
            </>
          ) : (
            <span className="shared-dice-replay-wait">
              {values.length > 1 ? `${values.length}D${sides}` : `D${sides}`} em movimento
            </span>
          )}
        </div>
      </div>
    </div>,
    overlayTarget
  );
}

import { onSnapshot } from '../adventure/sharedSnapshot';
import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
const toastListeners=[];
export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const handler = (t) => {
      setToasts(prev => [...prev.slice(-3), { ...t, dying: false }]);
      setTimeout(() => {
        setToasts(prev => prev.map(x => x.id === t.id ? { ...x, dying: true } : x));
        setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 500);
      }, 3500);
    };
    toastListeners.push(handler);
    return () => { const i = toastListeners.indexOf(handler); if (i > -1) toastListeners.splice(i, 1); };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'lastToast'), snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (!d.msg || !d.ts) return;
      if (Date.now() - d.ts > 4000) return;
      const t = { msg: d.msg, icon: d.icon || '✦', color: d.color || '#C8A8E8', id: d.ts + Math.random() };
      setToasts(prev => [...prev.slice(-3), { ...t, dying: false }]);
      setTimeout(() => {
        setToasts(prev => prev.map(x => x.id === t.id ? { ...x, dying: true } : x));
        setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 500);
      }, 3500);
    });
    return () => unsub();
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: 'rgba(8,10,24,0.97)', border: `1px solid ${t.color}55`,
          borderRadius: 12, padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: `0 4px 24px rgba(0,0,0,0.7), 0 0 16px ${t.color}33`,
          animation: t.dying ? 'toastOut 0.4s ease forwards' : 'toastIn 0.4s cubic-bezier(0.2,0.8,0.2,1) forwards',
          backdropFilter: 'blur(12px)', minWidth: 220, maxWidth: 340,
          transform: 'translateX(-50%)',
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{t.icon}</span>
          <span style={{ fontFamily: 'Cinzel,serif', fontSize: 13, color: t.color, letterSpacing: '0.04em', lineHeight: 1.4 }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

export async function pushToast(msg, icon='✦', color='#C8A8E8') {
  try {
    await setDoc(doc(db, 'config', 'lastToast'), { msg, icon, color, ts: Date.now() });
  } catch(e) { console.error(e); }
}


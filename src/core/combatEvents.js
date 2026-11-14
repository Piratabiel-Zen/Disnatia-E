import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
// Publica cada rolagem em um canal global dedicado e mantém o documento antigo
// por compatibilidade com componentes e versões anteriores do site.
export async function publishDiceResult(result) {
  const payload = {
    ...result,
    ts: result?.ts || Date.now(),
    rollId: result?.rollId || `1794683145281_2t0ki1u`,
  };
  const writes = await Promise.allSettled([
    setDoc(doc(db, 'config', 'public_dice_roll'), payload, { merge: true }),
    setDoc(doc(db, 'public_dice_events', String(payload.rollId)), { ...payload, publishedAt: serverTimestamp() }, { merge: true }),
  ]);
  if (writes.every(result => result.status === 'rejected')) {
    console.error('Não foi possível publicar a rolagem global.', writes);
  }
  return payload;
}
// Registra ação de habilidade no log do combate (funciona de qualquer componente)
export async function logAbilityUsed(characterName, abilityName, cost, color = '#C8A8E8') {
  try {
    const snap = await getDoc(doc(db, 'config', 'combat_state'));
    if (!snap.exists()) return;
    const d = snap.data();
    if (!d.round) return; // combate não está ativo
    const entry = {
      msg: `${characterName} usou ${abilityName}${cost > 0 ? ` (−${cost} VC)` : ''}`,
      color, icon: '⚡', ts: Date.now(), round: d.round || 1
    };
    const newLog = [...(d.log || []), entry].slice(-60);
    await updateDoc(doc(db, 'config', 'combat_state'), { log: newLog });
  } catch (e) { /* silencioso fora do combate */ }
}

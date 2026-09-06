import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../core/firebase';

const asNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const statusEnabled = value => {
  if (!value) return false;
  if (typeof value === 'object' && value.active === false) return false;
  return true;
};

const safeDocId = value => String(value || 'combat').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 180);

const reduceCooldowns = cooldowns => {
  const next = {};
  Object.entries(cooldowns || {}).forEach(([key, raw]) => {
    const value = Math.max(0, Math.floor(asNumber(raw, 0)) - 1);
    if (value > 0) next[key] = value;
  });
  return next;
};

const playerMaxVigor = sheet => 5 + (asNumber(sheet?.nivel, 1) >= 8 ? 1 : 0) + (asNumber(sheet?.nivel, 1) >= 18 ? 1 : 0);
const enemyMaxVigor = enemy => Math.max(0, Math.min(10, asNumber(enemy?.vigos_max, 10)));

const participantRef = combatant => {
  const type = String(combatant?.type || '');
  if (type === 'player') return { type, id:String(combatant.id || '').replace(/^p_/, ''), collection:'sheets' };
  if (type === 'enemy') return { type, id:String(combatant.id || '').replace(/^e_/, ''), collection:'enemies' };
  return null;
};

export async function applyRoundAutomation({ initiative = [], round = 1, combatKey = 'combat' } = {}) {
  const normalizedRound = Math.max(1, Math.floor(asNumber(round, 1)));
  const normalizedKey = safeDocId(combatKey || 'combat');
  const markerId = safeDocId(`${normalizedKey}_r${normalizedRound}`);
  const markerRef = doc(db, 'combat_round_automation', markerId);

  const participants = [];
  const seen = new Set();
  for (const combatant of initiative || []) {
    const info = participantRef(combatant);
    if (!info?.id) continue;
    const key = `${info.collection}:${info.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    participants.push({ ...info, combatant, ref:doc(db, info.collection, info.id) });
  }

  return runTransaction(db, async transaction => {
    const markerSnap = await transaction.get(markerRef);
    if (markerSnap.exists()) return { applied:false, effects:[], round:normalizedRound };

    // Firestore exige que todas as leituras da transação ocorram antes das escritas.
    const rows = [];
    for (const participant of participants) {
      const snap = await transaction.get(participant.ref);
      rows.push({ ...participant, snap });
    }

    const effects = [];
    const appliedAt = Date.now();

    for (const row of rows) {
      if (!row.snap.exists()) continue;
      const data = row.snap.data() || {};
      const currentVigor = Math.max(0, asNumber(data.vigos, 0));
      const maxVigor = row.type === 'enemy' ? enemyMaxVigor(data) : playerMaxVigor(data);
      const nextVigor = Math.min(maxVigor, currentVigor + 2);
      const cooldowns = reduceCooldowns(data.cooldowns || {});
      const poisoned = statusEnabled(data.status?.envenenado);
      const bleeding = statusEnabled(data.status?.sangrando);
      const statusDamage = poisoned || bleeding ? 1 : 0;
      const currentHp = Math.max(0, asNumber(data.hp, 0));
      const hpAfter = Math.max(0, currentHp - statusDamage);
      const patch = { cooldowns, vigos:nextVigor };
      if (statusDamage) patch.hp = hpAfter;
      transaction.set(row.ref, patch, { merge:true });

      const reason = poisoned && bleeding ? 'Envenenado + Sangrando' : poisoned ? 'Envenenado' : bleeding ? 'Sangrando' : '';
      const effect = {
        combatantId:String(row.combatant?.id || ''),
        entityType:row.type,
        entityId:row.id,
        sheetId:row.type === 'player' ? row.id : '',
        name:data.nome || row.combatant?.nome || 'Combatente',
        round:normalizedRound,
        vigorBefore:currentVigor,
        vigorAfter:nextVigor,
        vigorGained:Math.max(0, nextVigor - currentVigor),
        hpBefore:currentHp,
        hpAfter,
        damage:statusDamage,
        reason,
      };
      effects.push(effect);

      if (statusDamage) {
        const eventId = safeDocId(`${normalizedKey}_r${normalizedRound}_${row.type}_${row.id}`);
        transaction.set(doc(db, 'combat_effect_events', eventId), {
          id:eventId,
          combatKey:normalizedKey,
          round:normalizedRound,
          ts:appliedAt,
          ...effect,
        }, { merge:true });
      }
    }

    transaction.set(markerRef, {
      combatKey:normalizedKey,
      round:normalizedRound,
      appliedAt,
      participantCount:participants.length,
    });

    return { applied:true, effects, round:normalizedRound };
  });
}

export function vigorCapForSheet(sheet) {
  return playerMaxVigor(sheet);
}

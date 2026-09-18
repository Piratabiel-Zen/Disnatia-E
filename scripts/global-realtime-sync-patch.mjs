import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const must = (ok, msg) => { if (!ok) throw new Error(`Global realtime audit: ${msg}`); };

const combatFile = path.join(root, 'src', 'core', 'combatEvents.js');
const broadcastsFile = path.join(root, 'src', 'experience', 'RealtimeBroadcasts.jsx');
must(fs.existsSync(combatFile), 'combatEvents.js ausente');
must(fs.existsSync(broadcastsFile), 'RealtimeBroadcasts.jsx ausente');

let combat = fs.readFileSync(combatFile, 'utf8');

// O source legado já publica direto no feed. Como proteção contra builds antigos,
// converte a implementação de dois/três documentos para um único documento durável.
const fnStart = combat.indexOf('export async function publishDiceResult(');
const fnEnd = combat.indexOf('\n// Registra ação de habilidade', fnStart);
must(fnStart >= 0 && fnEnd > fnStart, 'publishDiceResult não encontrado');
const fn = combat.slice(fnStart, fnEnd);
if (fn.includes("config', 'public_dice_roll") || fn.includes("config', 'combat_dice")) {
  const replacement = `export async function publishDiceResult(result) {
  const payload = {
    ...result,
    ts: result?.ts || Date.now(),
    rollId: result?.rollId || \`${Date.now()}_${Math.random().toString(36).slice(2, 9)}\`,
  };
  try {
    await setDoc(doc(db, 'public_dice_events', String(payload.rollId)), {
      ...payload,
      publishedAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Não foi possível publicar a rolagem global.', error);
  }
  return payload;
}`;
  combat = combat.slice(0, fnStart) + replacement + combat.slice(fnEnd);
  fs.writeFileSync(combatFile, combat);
}

let broadcasts = fs.readFileSync(broadcastsFile, 'utf8');
must(!broadcasts.includes('includeMetadataChanges: true'), 'metadata listener duplicado ainda presente');
must(!broadcasts.includes('hasPendingWrites'), 'espelhamento por pending write ainda presente');
must(!broadcasts.includes("configId: 'public_dice_roll'"), 'canal legado de dados ainda presente');
must(combat.includes("'public_dice_events'"), 'feed durável de dados ausente');
must(!combat.includes("config', 'combat_dice'"), 'combat_dice legado ainda recebe writes');
must(!combat.includes("config', 'public_dice_roll'"), 'public_dice_roll legado ainda recebe writes');

console.log('Dinastia E: dados usam um único feed durável; listener metadata e canais legados removidos.');

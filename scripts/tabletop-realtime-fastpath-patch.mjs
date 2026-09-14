import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const battleFile = path.join(root, 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
const diceFile = path.join(root, 'src', 'shell', 'DiceWidget.jsx');
const sharedDiceFile = path.join(root, 'src', 'experience', 'SharedDiceReplay.jsx');

const must = (condition, message) => {
  if (!condition) throw new Error(`Tabletop realtime fast-path: ${message}`);
};

const replaceRequired = (source, before, after, label) => {
  if (source.includes(after)) return source;
  must(source.includes(before), `marcador ausente (${label})`);
  return source.replace(before, after);
};

// ── 1) MOVIMENTO: menor latência sem criar fila velha ───────────────────────
// Mantemos ~30 Hz como teto nominal. A melhoria vem de deixar até 3 writes do
// MESMO token em voo. Em conexões Brasil↔Firestore com RTT maior, 2 promises em
// voo podiam reduzir a cadência efetiva abaixo dos 30 Hz. A fila continua
// latest-only: qualquer ponto intermediário antigo é descartado pelo pending.
let battle = fs.readFileSync(battleFile, 'utf8');

battle = replaceRequired(
  battle,
  'if (!state.pending || state.inFlight >= 2) return;',
  'if (!state.pending || state.inFlight >= 3) return;',
  'pipeline de writes concorrentes'
);

// A posição remota continua interpolada para esconder jitter, mas sem manter o
// token visualmente 36 ms atrás do snapshot mais novo.
battle = replaceRequired(
  battle,
  "transition: draggingId === token.id ? 'none' : 'left 36ms linear, top 36ms linear',",
  "transition: draggingId === token.id ? 'none' : 'left 24ms linear, top 24ms linear',",
  'interpolação remota'
);

// Pings do Mestre já carregam role/name. Tornamos a autoria explícita na tela de
// todos para não parecer um marcador anônimo.
battle = replaceRequired(
  battle,
  "<b>{battlePing.name||'Ping'}</b>",
  "<b>{battlePing.role==='master'?'Mestre marcou aqui':(battlePing.name||'Ping')}</b>",
  'rótulo público do ping do Mestre'
);

const FAST_MARKER = 'TABLETOP REALTIME FAST PATH 2026-09-14';
if (!battle.includes(FAST_MARKER)) {
  const anchor = '// OWLBEAR-STYLE INTERACTION PIPELINE 2026-09-13';
  must(battle.includes(anchor), 'pipeline Owlbear final não encontrado');
  battle = battle.replace(anchor, `// ${FAST_MARKER}\n${anchor}`);
}

for (const marker of [
  'const TOKEN_THROTTLE_MS = 33;',
  'state.inFlight >= 3',
  'const slot = seq % 3;',
  "left 24ms linear, top 24ms linear",
  'state.pending = { x: px, y: py };',
  "channel: 'motion-v2'",
  "channel: 'position-final-v1'",
  'Mestre marcou aqui',
]) {
  must(battle.includes(marker), `BattleMap incompleto: ${marker}`);
}
must(!battle.includes('state.inFlight >= 4'), 'boost agressivo de 4 writes reapareceu');
must(!battle.includes('const slot = seq % 6;'), 'seis slots antigos reapareceram');
must(!battle.includes('left 36ms linear, top 36ms linear'), 'interpolação antiga de 36 ms permaneceu');

fs.writeFileSync(battleFile, battle);

// ── 2) DADO DO MESTRE: evento público com autoria explícita ─────────────────
let dice = fs.readFileSync(diceFile, 'utf8');

dice = replaceRequired(
  dice,
  "      roller: rollerProfile.name || access?.name || 'Jogador',",
  "      roller: access?.role === 'master' ? 'Mestre' : (rollerProfile.name || access?.name || 'Jogador'),",
  'nome público do Mestre'
);

dice = replaceRequired(
  dice,
  "      rollerSheetId: access?.sheetId ? String(access.sheetId) : '',\n      sourceClientId,",
  "      rollerSheetId: access?.sheetId ? String(access.sheetId) : '',\n      rollerRole: access?.role === 'master' ? 'master' : 'player',\n      audience: 'table',\n      sourceClientId,",
  'metadados públicos da rolagem'
);

for (const marker of [
  "roller: access?.role === 'master' ? 'Mestre'",
  "rollerRole: access?.role === 'master' ? 'master' : 'player'",
  "audience: 'table'",
]) {
  must(dice.includes(marker), `DiceWidget incompleto: ${marker}`);
}

fs.writeFileSync(diceFile, dice);

// ── 3) REPLAY COMPARTILHADO: Mestre aparece literalmente para os jogadores ──
let shared = fs.readFileSync(sharedDiceFile, 'utf8');

shared = replaceRequired(
  shared,
  "    const samePlayerSheet = !!localSheetId && !!payload.rollerSheetId && String(payload.rollerSheetId) === localSheetId;",
  "    const samePlayerSheet = payload.rollerRole !== 'master' && !!localSheetId && !!payload.rollerSheetId && String(payload.rollerSheetId) === localSheetId;",
  'Mestre nunca filtrado como rolagem da própria ficha'
);

shared = replaceRequired(
  shared,
  "  const firstName = firstNameOf(active.roller);\n\n  return (",
  "  const firstName = firstNameOf(active.roller);\n  const isMasterRoll = active.rollerRole === 'master' || String(active.roller || '').trim().toLowerCase() === 'mestre';\n\n  return (",
  'identidade visual do Mestre'
);

shared = replaceRequired(
  shared,
  "    <div className=\"shared-dice-replay\" aria-live=\"polite\" aria-label={`${firstName} rolou ${values.length > 1 ? `${values.length} dados` : 'um dado'}`}>",
  "    <div className=\"shared-dice-replay\" aria-live=\"polite\" aria-label={`${isMasterRoll ? 'Mestre' : firstName} rolou ${values.length > 1 ? `${values.length} dados` : 'um dado'}`}>",
  'aria da rolagem do Mestre'
);

shared = replaceRequired(
  shared,
  "        <div className=\"shared-dice-replay-kicker\">rolagem compartilhada</div>",
  "        <div className=\"shared-dice-replay-kicker\">{isMasterRoll ? 'rolagem do mestre' : 'rolagem compartilhada'}</div>",
  'kicker da rolagem do Mestre'
);

shared = replaceRequired(
  shared,
  "        <div className=\"shared-dice-replay-name\">{firstName}</div>",
  "        <div className=\"shared-dice-replay-name\">{isMasterRoll ? 'Mestre' : firstName}</div>",
  'nome da rolagem do Mestre'
);

for (const marker of [
  "payload.rollerRole !== 'master'",
  "const isMasterRoll = active.rollerRole === 'master'",
  "rolagem do mestre",
  "{isMasterRoll ? 'Mestre' : firstName}",
]) {
  must(shared.includes(marker), `SharedDiceReplay incompleto: ${marker}`);
}

fs.writeFileSync(sharedDiceFile, shared);

console.log('Dinastia E: fast-path realtime ativo — 3 writes latest-only, interpolação 24ms, dados e pings do Mestre explicitamente públicos.');

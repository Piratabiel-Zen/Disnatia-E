export const DEFAULT_PREFERENCES = Object.freeze({ effects: 'normal', textSize: 'standard', music: 50, ambience: 80, interface: 40 });
export const PREFERENCE_KEY = 'dinastia_player_preferences_v1';
let memoryPreferences = { ...DEFAULT_PREFERENCES };
export function normalizePreferences(input = {}) {
  if (!input || typeof input !== 'object') input = {};
  const value = { ...DEFAULT_PREFERENCES };
  value.effects = ['normal', 'subtle', 'reduced'].includes(input.effects) ? input.effects : value.effects;
  value.textSize = ['standard', 'large'].includes(input.textSize) ? input.textSize : value.textSize;
  for (const key of ['music', 'ambience', 'interface']) {
    if (input[key] != null && Number.isFinite(Number(input[key]))) value[key] = Math.max(0, Math.min(100, Number(input[key])));
  }
  return value;
}
export function readPreferences() {
  try { const saved = localStorage.getItem(PREFERENCE_KEY); if (saved) memoryPreferences = normalizePreferences(JSON.parse(saved)); }
  catch { /* Private storage keeps preferences in memory. */ }
  return memoryPreferences;
}
export function savePreferences(patch) {
  const value = normalizePreferences({ ...readPreferences(), ...patch });
  memoryPreferences = value;
  try { localStorage.setItem(PREFERENCE_KEY, JSON.stringify(value)); } catch { /* Preference still applies to this tab. */ }
  window.dispatchEvent(new CustomEvent('dinastia:preferences', { detail: value }));
  return value;
}
export function abilityAvailability(ability, sheet, { combat = false, myTurn = true, busy = false } = {}) {
  const key = String(ability?.id || ability?.name || ability?.nome || 'habilidade');
  const cost = Math.max(0, Number(ability?.cost ?? ability?.custo ?? 0) || 0);
  const cooldown = Math.max(0, Number(sheet?.cooldowns?.[key] || 0));
  if (busy) return 'Enviando ação';
  if (ability?.tipoHab === 'passiva') return 'Habilidade passiva';
  if (ability?._locked || Number(ability?.req || 1) > Number(sheet?.nivel || 1)) return 'Nível insuficiente';
  if (combat && !myTurn) return 'Aguarde seu turno';
  if (cooldown) return `Em recarga: ${cooldown} turno(s)`;
  if (Number(sheet?.vigos || 0) < cost) return 'VC insuficiente';
  return '';
}
export function isTyping(event) {
  return !!event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
}

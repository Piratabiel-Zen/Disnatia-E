export const ACCESS_ROSTER_CACHE_KEY = 'dinastia_access_roster_v2';

const MAX_ROSTER_SIZE = 80;
const MAX_TEXT_LENGTH = 180;
const MAX_CACHED_PHOTO_LENGTH = 30000;

function cleanText(value, maxLength = MAX_TEXT_LENGTH) {
  return String(value || '').trim().slice(0, maxLength);
}

export function createAccessRoster(rows = [], getMaxHp = () => 0) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, MAX_ROSTER_SIZE).map(row => {
    const photo = cleanText(row?.foto, MAX_CACHED_PHOTO_LENGTH);
    let maxHp = 0;
    try { maxHp = Math.max(0, Number(getMaxHp(row)) || 0); } catch (_) {}
    return {
      id: cleanText(row?.id, 120),
      nome: cleanText(row?.nome),
      foto: photo.length < MAX_CACHED_PHOTO_LENGTH ? photo : '',
      classe: cleanText(row?.classe, 80),
      nivel: Math.max(1, Number(row?.nivel) || 1),
      hp: Number(row?.hp) || 0,
      vigos: Number(row?.vigos) || 0,
      maxHp,
      passwordProtected: Boolean(String(row?.senha || '').trim()),
    };
  }).filter(row => row.id);
}

export function readAccessRoster(storage = globalThis?.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(ACCESS_ROSTER_CACHE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_ROSTER_SIZE).filter(row => row?.id).map(row => ({ ...row, _cached: true }));
  } catch (_) {
    return [];
  }
}

export function writeAccessRoster(rows, getMaxHp, storage = globalThis?.localStorage) {
  const roster = createAccessRoster(rows, getMaxHp);
  try { storage?.setItem(ACCESS_ROSTER_CACHE_KEY, JSON.stringify(roster)); } catch (_) {}
  return roster;
}

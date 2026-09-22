export const EMPTY_SESSION_CONTEXT = Object.freeze({
  active: false,
  title: '',
  subtitle: '',
  location: '',
  objective: '',
});

const CACHE_KEY = 'dinastia-session-context-v1';
const TEXT_LIMIT = 2400;

const text = value => String(value || '').slice(0, TEXT_LIMIT);
const finiteTime = value => Number.isFinite(Number(value)) ? Number(value) : 0;

export function compactSessionContext(value = {}) {
  return {
    active: value.active === true,
    title: text(value.title),
    subtitle: text(value.subtitle),
    location: text(value.location),
    objective: text(value.objective),
    startedAt: finiteTime(value.startedAt),
    endedAt: finiteTime(value.endedAt),
    updatedAt: finiteTime(value.updatedAt),
  };
}

export function mergeSessionContext(current = {}, patch = {}) {
  return { ...EMPTY_SESSION_CONTEXT, ...current, ...patch };
}

export function readSessionCache(storage = globalThis?.localStorage) {
  try {
    const raw = storage?.getItem(CACHE_KEY);
    if (!raw) return { ...EMPTY_SESSION_CONTEXT };
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !parsed.context) return { ...EMPTY_SESSION_CONTEXT };
    return { ...EMPTY_SESSION_CONTEXT, ...compactSessionContext(parsed.context) };
  } catch (_) {
    return { ...EMPTY_SESSION_CONTEXT };
  }
}

export function writeSessionCache(value, storage = globalThis?.localStorage) {
  const context = compactSessionContext(value);
  try {
    storage?.setItem(CACHE_KEY, JSON.stringify({ version: 1, context }));
  } catch (_) {}
  return context;
}

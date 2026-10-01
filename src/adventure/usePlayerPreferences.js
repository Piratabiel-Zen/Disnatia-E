import { useEffect, useState } from 'react';
import { PREFERENCE_KEY, readPreferences, savePreferences } from './playerPreferences.mjs';
export function usePlayerPreferences() {
  const [preferences, setPreferences] = useState(readPreferences);
  useEffect(() => {
    const update = event => setPreferences(event.detail || readPreferences());
    const storage = event => { if (event.key === PREFERENCE_KEY) update({}); };
    window.addEventListener('dinastia:preferences', update);
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener('dinastia:preferences', update); window.removeEventListener('storage', storage); };
  }, []);
  return [preferences, patch => setPreferences(savePreferences(patch))];
}

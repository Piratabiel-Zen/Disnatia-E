// Uma única fonte para "este aparelho não recebe as telas grandes".
//
// O mapa de combate e o Mapa Múndi pedem arrastar, dar zoom e ver o tabuleiro
// inteiro de uma vez. Num celular isso não é difícil, é impossível de jogar —
// então em tela pequena essas telas não existem: não abrem por navegação, não
// abrem quando o mestre puxa a mesa, e o botão nem aparece. Esconder o botão é
// parte da regra: um botão que não faz nada é pior que um botão ausente.

export const MOBILE_QUERY = '(max-width: 900px)';

// Telas que só fazem sentido com mouse e espaço de tela.
export const DESKTOP_ONLY_TABS = Object.freeze(['mapamundi', 'mapabatalha']);

export function isMobileViewport(win = typeof window === 'undefined' ? null : window) {
  if (!win || typeof win.matchMedia !== 'function') return false;
  try { return Boolean(win.matchMedia(MOBILE_QUERY).matches); } catch { return false; }
}

export function isDesktopOnlyTab(id) {
  return DESKTOP_ONLY_TABS.includes(String(id || ''));
}

// Vale para navegação e para o foco que o mestre empurra para a mesa.
export function blockedOnThisDevice(id, mobile) {
  return Boolean(mobile) && isDesktopOnlyTab(id);
}

// Filtra listas de atalhos para que o botão não apareça onde não funciona.
// Aceita ids soltos ou pares [id, rótulo], que é como os menus guardam.
export function visibleTabs(entries, mobile) {
  const idOf = entry => (Array.isArray(entry) ? entry[0] : entry && typeof entry === 'object' ? entry.id : entry);
  return (entries || []).filter(entry => !blockedOnThisDevice(idOf(entry), mobile));
}

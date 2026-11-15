// Senha de entrada de cada mesa.
//
// O banco guarda só o resumo (SHA-256) da senha, nunca o texto. A Dinastia E
// nasce com a senha "estrelas"; quando um Mestre troca, o novo resumo fica no
// registro da mesa e vale para todos. Aparelhos que já tinham entrado com a
// senha antiga voltam para a porta e precisam da nova.
//
// Isto é uma porta de mesa, não um cofre: impede que alguém com o link entre
// sem ser convidado, mas não substitui regras de segurança no banco.

export const PRIMARY_DEFAULT_PASSWORD_HASH = 'bf2f289661aa88b6945d270025d73a5bf6735148a8e95bfa3ff2397e817485b3';
const UNLOCK_PREFIX = 'dinastia_campaign_unlock_v1:';

export const normalizePassword = value => String(value || '').trim().toLowerCase();

export async function hashPassword(value) {
  const bytes = new TextEncoder().encode(normalizePassword(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Resumo exigido para entrar. Texto vazio significa mesa aberta. */
export function requiredPasswordHash(campaign) {
  if (!campaign) return '';
  if (typeof campaign.passwordHash === 'string') return campaign.passwordHash;
  return campaign.primary || campaign.id === 'dinastia-e' ? PRIMARY_DEFAULT_PASSWORD_HASH : '';
}

const safeStorage = storage => storage || (typeof localStorage === 'undefined' ? null : localStorage);

export function isUnlocked(campaign, storage) {
  const required = requiredPasswordHash(campaign);
  if (!required) return true;
  try { return safeStorage(storage)?.getItem(UNLOCK_PREFIX + campaign.id) === required; }
  catch (_) { return false; }
}

export function rememberUnlock(campaignId, hash, storage) {
  try {
    if (hash) safeStorage(storage)?.setItem(UNLOCK_PREFIX + campaignId, hash);
    else safeStorage(storage)?.removeItem(UNLOCK_PREFIX + campaignId);
  } catch (_) {}
}

export async function tryUnlock(campaign, typed, storage) {
  const required = requiredPasswordHash(campaign);
  if (!required) return true;
  const hash = await hashPassword(typed);
  if (hash !== required) return false;
  rememberUnlock(campaign.id, hash, storage);
  return true;
}

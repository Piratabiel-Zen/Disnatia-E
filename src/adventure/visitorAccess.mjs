// Campaign PIN access, matching the existing player access model. This is not
// Firebase Authentication; server authorization must be enforced separately.
export const isVisitorSheet = sheet => sheet?.audience === 'visitor' || Boolean(sheet?.visitorId);
export function visibleSheets(rows, access, masterMode = false) {
  if (masterMode) return rows;
  if (access?.role === 'visitor' && !access.visitorId) return [];
  if (access?.role === 'visitor') return rows.filter(sheet => isVisitorSheet(sheet) && String(sheet.visitorId) === String(access.visitorId || ''));
  return rows.filter(sheet => !isVisitorSheet(sheet));
}
export function ownsVisitorSheet(sheet, access) {
  return access?.role === 'visitor' && Boolean(access.visitorId) && isVisitorSheet(sheet) && String(sheet.visitorId) === String(access.visitorId || '');
}
export async function passwordRecord(password, salt = crypto.randomUUID()) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:210000,hash:'SHA-256'},key,256);
  return {salt,hash:Array.from(new Uint8Array(bits),value=>value.toString(16).padStart(2,'0')).join(''),version:1};
}
export async function verifyVisitorPassword(password, record) {
  if (!record?.salt || !record?.hash || record.version !== 1) return false;
  const candidate = await passwordRecord(password, record.salt);
  return candidate.hash === record.hash;
}

export function canControlToken(token, { masterMode = false, sheetId = '', sheetIds = [] } = {}) {
  if (masterMode) return true;
  if (!token || token.locked) return false;
  const authorizedSheetId = String(
    token.controllerSheetId || token.ownerSheetId || token.sheetId || '',
  );
  if (!authorizedSheetId) return false;
  const allowed = sheetIds instanceof Set ? sheetIds : new Set((Array.isArray(sheetIds) ? sheetIds : []).map(String));
  if (sheetId) allowed.add(String(sheetId));
  return allowed.has(authorizedSheetId);
}

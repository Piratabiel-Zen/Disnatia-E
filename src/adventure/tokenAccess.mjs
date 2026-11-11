export function canControlToken(token, { masterMode = false, sheetId = '' } = {}) {
  if (masterMode) return true;
  if (!token || token.locked) return false;
  const authorizedSheetId = String(
    token.controllerSheetId || token.ownerSheetId || token.sheetId || '',
  );
  return !!sheetId && !!authorizedSheetId && authorizedSheetId === String(sheetId);
}

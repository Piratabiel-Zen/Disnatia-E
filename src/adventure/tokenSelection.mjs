export function tokenIdsInMarquee(tokens, box, canSelect = () => true) {
  const left = Math.min(Number(box?.left) || 0, Number(box?.right) || 0);
  const right = Math.max(Number(box?.left) || 0, Number(box?.right) || 0);
  const top = Math.min(Number(box?.top) || 0, Number(box?.bottom) || 0);
  const bottom = Math.max(Number(box?.top) || 0, Number(box?.bottom) || 0);
  return (Array.isArray(tokens) ? tokens : [])
    .filter(token => token?.id != null && canSelect(token))
    .filter(token => {
      const x = Number(token.x);
      const y = Number(token.y);
      return Number.isFinite(x) && Number.isFinite(y) && x >= left && x <= right && y >= top && y <= bottom;
    })
    .map(token => String(token.id));
}

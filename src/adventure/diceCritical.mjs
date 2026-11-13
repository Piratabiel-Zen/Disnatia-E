export function d20CriticalOutcome(payload) {
  if (Number(payload?.sides ?? payload?.dice) !== 20) return null;
  const values = Array.isArray(payload?.values) ? payload.values : null;
  const count = Number(payload?.count ?? values?.length ?? 1);
  if (count !== 1) return null;
  const natural = Number(values?.[0] ?? payload?.base);
  if (natural === 20) return { outcome: 'positive', natural };
  if (natural === 1) return { outcome: 'negative', natural };
  return null;
}

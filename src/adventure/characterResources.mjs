export const VIGOR_UNLOCK_LEVELS = Object.freeze([8, 18, 23]);
export function characterMaxVigor(sheet) {
 const level = Number(sheet?.nivel) || 1;
 return 5 + VIGOR_UNLOCK_LEVELS.filter(required => level >= required).length;
}

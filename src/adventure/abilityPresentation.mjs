export function abilityType(ability, fallback = 'normal') {
 const type = String(ability?.tipoHab || ability?.tipo || ability?.type || fallback).toLowerCase();
 if (type === 'combinada' || type === 'combined' || type === 'combination') return 'combinada';
 return type === 'combinada' || type === 'combined' ? 'combinada' : type === 'passiva' || type === 'passive' ? 'passiva' : type === 'especial' || type === 'special' ? 'especial' : 'normal';
}
export function replaceCustomAbility(abilities, draft, editingId) {
 const current = Array.isArray(abilities) ? abilities : [];
 const saved = {...draft, nome:String(draft.nome || '').trim(), custo:Math.max(0,Number(draft.custo)||0), req:Math.max(1,Number(draft.req)||1)};
 if ('name' in saved) saved.name=saved.nome;
 if ('desc' in saved) saved.desc=saved.descricao;
 if ('cost' in saved) saved.cost=saved.custo;
 if (!saved.nome) throw new Error('Informe o nome da habilidade.');
 if (editingId == null) return [...current, saved];
 if (!current.some(a => String(a.id) === String(editingId))) throw new Error('A habilidade foi removida. Reabra a ficha.');
 return current.map(a => String(a.id) === String(editingId) ? {...a,...saved,id:a.id} : a);
}

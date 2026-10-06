const ATTRIBUTES = { forca:'Força', durabilidade:'Durabilidade', agilidade:'Agilidade', inteligencia:'Inteligência', percepcao:'Percepção', sorte:'Sorte' };
export function naturalBonus(sheet, attribute) {
  return Math.floor(Math.max(0, Number(sheet?.[attribute]) || 0) / 2);
}
export function artifactRequirements(artifact, sheet) {
  return Object.entries(ATTRIBUTES).filter(([key]) => Number(artifact?.requisitos?.[key+'Bonus']) > 0).map(([key, label]) => ({key, label, required:Number(artifact.requisitos[key+'Bonus']), actual:naturalBonus(sheet,key)}));
}
export function artifactUseReason(artifact, sheet) {
  if (!artifact || sheet?.artefato_id !== artifact.id) return 'Somente o portador pode usar este artefato';
  if (artifactRequirements(artifact,sheet).some(row=>row.actual<row.required)) return 'Atributos naturais insuficientes';
  return '';
}
export function artifactAbilities(artifact, custom = {}) {
  if (!artifact) return [];
  return [...(artifact.builtInPowers||[]), ...(custom[artifact.id]||[])].map((power,index)=>({ ...power, _artifactId:artifact.id, _artifactPowerId:String(power.id??power.nome??index), id:`artifact:${artifact.id}:${power.id??power.nome??index}` }));
}

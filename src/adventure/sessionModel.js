export const SHARED_TABS = new Set(['session', 'mapabatalha', 'mapamundi', 'cronicas', 'livro', 'personagens', 'regras', 'bestiario']);

export function prepareDecision(question, lines, id) {
  const title = String(question || '').trim().slice(0, 240);
  const choices = [...new Set(String(lines || '').split('\n').map(s => s.trim()).filter(Boolean))].slice(0, 6);
  if (!title || choices.length < 2) throw new Error('Escreva a pergunta e pelo menos duas opções diferentes.');
  return { id, question: title, options: choices.map((label, i) => ({ id: String(i), label: label.slice(0, 160) })), status: 'open', votes: {}, result: null };
}

export function recordVote(current, decisionId, playerId, optionId) {
  if (!current || current.id !== decisionId || current.status !== 'open') throw new Error('Esta decisão já mudou ou foi encerrada.');
  if (!playerId || !current.options.some(o => o.id === optionId)) throw new Error('Jogador ou opção inválida.');
  return { ...current.votes, [playerId]: optionId };
}

export function resolveDecision(current, decisionId, optionId) {
  if (!current || current.id !== decisionId || current.status !== 'open') throw new Error('Esta decisão já foi encerrada.');
  const option = current.options.find(o => o.id === optionId);
  if (!option) throw new Error('Selecione uma das opções.');
  return { status: 'resolved', result: option.id, text: `${current.question} → ${option.label}` };
}

export function focusDestination(focus, mobile) {
  if (!SHARED_TABS.has(focus?.tab)) return null;
  return mobile && ['mapamundi', 'mapabatalha'].includes(focus.tab) ? 'session' : focus.tab;
}

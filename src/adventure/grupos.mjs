// As frentes da companhia.
//
// Grupo que se divide é regra em mesa de RPG, não exceção: metade desce na
// cripta enquanto a outra metade segura a porta. A tela inicial precisa
// mostrar os dois lugares ao mesmo tempo, com quem está em cada um.
//
// Sem a divisão ligada, todo mundo está no mesmo lugar e a tela mostra uma
// frente só — é o estado normal, e nenhuma ficha precisa ter grupo marcado.

export const GROUP_KEYS = ['a', 'b'];

/** Lê a configuração de frentes da sessão, com o formato garantido. */
export function readGroups(session) {
  const raw = session?.grupos && typeof session.grupos === 'object' ? session.grupos : {};
  return {
    ativo: Boolean(raw.ativo),
    // A frente A herda o lugar que a sessão já usava, para nada sumir ao ligar os grupos.
    a: { nome: String(raw.a?.nome || 'Grupo A'), local: String(raw.a?.local ?? session?.location ?? '') },
    b: { nome: String(raw.b?.nome || 'Grupo B'), local: String(raw.b?.local || '') },
  };
}

/** Em que frente está cada ficha. Sem divisão, todos estão juntos. */
export function groupOf(sheet, groupsOn) {
  if (!groupsOn) return 'a';
  return String(sheet?.grupo || '') === 'b' ? 'b' : 'a';
}

/** Divide a companhia pelas frentes, preservando a ordem original das fichas. */
export function splitParty(sheets, groups) {
  const list = Array.isArray(sheets) ? sheets : [];
  if (!groups.ativo) return [{ key: 'a', ...groups.a, nome: '', sheets: list }];
  return GROUP_KEYS.map(key => ({ key, ...groups[key], sheets: list.filter(sheet => groupOf(sheet, true) === key) }));
}

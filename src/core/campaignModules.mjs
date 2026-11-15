// O que cada mesa tem.
//
// O Livro da Mandíbula, as Regras e as nove linhagens de Cosmum são conteúdo
// da Dinastia E — não do site. Uma mesa investigativa moderna não tem Livro da
// Mandíbula, e um sistema próprio não tem Assassinos do Fogo Azul. Então uma
// campanha nova nasce sem nada disso e o Mestre monta o que quiser.
//
// A Dinastia E continua com tudo ligado, sem precisar de registro no banco:
// os padrões abaixo já dizem isso. Qualquer mesa pode ligar um módulo depois,
// gravando `modules` no seu registro em `campaigns`.

export const PRIMARY_CAMPAIGN_ID = 'dinastia-e';

/** Abas que carregam conteúdo escrito para uma mesa específica. */
export const LORE_TABS = Object.freeze(['livro', 'regras']);

export const isPrimaryCampaign = campaign =>
  Boolean(campaign?.primary) || String(campaign?.id || '') === PRIMARY_CAMPAIGN_ID;

/**
 * A aba existe nesta campanha? Só as abas de conteúdo escrito precisam de
 * permissão; o resto (fichas, mapas, crônicas) é estrutura do site e vale
 * para qualquer mesa.
 */
export function campaignHasTab(campaign, tabId) {
  const id = String(tabId || '');
  if (!LORE_TABS.includes(id)) return true;
  const modules = campaign?.modules;
  if (modules && typeof modules === 'object' && id in modules) return Boolean(modules[id]);
  return isPrimaryCampaign(campaign);
}

/** As linhagens embutidas valem só para a mesa que elas descrevem. */
export const campaignUsesBuiltInClasses = campaign => isPrimaryCampaign(campaign);

/** Tira dos grupos de navegação as abas que esta campanha não tem. */
export function filterNavGroups(groups, campaign) {
  return (groups || [])
    .map(group => ({ ...group, items: (group.items || []).filter(item => campaignHasTab(campaign, item.id)) }))
    .filter(group => group.items.length > 0);
}

/** Campo de uma linhagem criada pelo Mestre, no mesmo formato das embutidas. */
export function emptyClass(id) {
  return {
    id: String(id),
    name: '',
    role: '',
    icon: '◆',
    color: '#A855F7',
    alcance: '',
    lore: '',
    passive: { name: '', desc: '' },
    normal: [],
    specials: [],
  };
}

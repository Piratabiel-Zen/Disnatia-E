// Campanhas: várias mesas no mesmo site, cada uma com seus dados e sua cara.
//
// A campanha principal (Dinastia E) continua usando exatamente os caminhos que
// o Firestore já tem hoje ('sheets', 'config/session', 'battlemaps'...), então
// nada precisa ser migrado e a mesa em andamento não corre risco. Campanhas
// novas recebem um prefixo no nome da coleção, o que as isola por completo.
//
// A coleção 'campaigns' é global: é a lista de mesas, lida antes de qualquer
// outra coisa, e nunca entra no escopo de uma campanha.
import { collection, doc } from 'firebase/firestore';
import { db } from './firebase';
// O id da mesa ativa mora em escopo.mjs, sem Firebase junto: os caches de
// localStorage precisam dele e não podem arrastar o Firestore para dentro.
import {
  PRIMARY_CAMPAIGN_ID, caminhoEscopado, definirEscopo, ehCampanhaPrincipal,
  escopoAtivo, storageSuffix,
} from './escopo.mjs';
import { temaDaMesa } from './atmosferaDaMesa.mjs';

export { PRIMARY_CAMPAIGN_ID, storageSuffix };
const STORAGE_KEY = 'dinastia_campaign_v1';

/** A campanha que já existe, descrita aqui para o site funcionar mesmo com o Firestore vazio. */
export const PRIMARY_CAMPAIGN = {
  id: PRIMARY_CAMPAIGN_ID,
  name: 'Dinastia E',
  genre: 'Cósmico e mágico',
  tagline: 'O mundo é do mestre. A história é de vocês.',
  world: 'Cosmum',
  theme: 'cosmico',
  sigil: '✦',
  primary: true,
};

/** Temas visuais: a campanha escolhe o seu e a interface inteira acompanha. */
import { CAMPAIGN_THEMES } from './temas.mjs';
export { CAMPAIGN_THEMES };

// O tema vem de atmosferaDaMesa: uma mesa com clima próprio (pelo nome) usa o
// dela; as outras usam o que foi escolhido na criação.
export const campaignTheme = campaign => CAMPAIGN_THEMES[temaDaMesa(campaign)] || CAMPAIGN_THEMES.cosmico;

let activeRecord = PRIMARY_CAMPAIGN;
const listeners = new Set();

/** Prefixo de coleção da campanha ativa. A principal não tem prefixo: usa os caminhos atuais. */
export const scopedPath = caminhoEscopado;

/** Coleção da campanha ativa. Substitui collection(db, 'nome'). */
export function col(name) {
  return collection(db, scopedPath(name));
}

/** Documento dentro da campanha ativa. Substitui doc(db, 'nome', id, ...). */
export function docIn(name, ...segments) {
  return doc(db, scopedPath(name), ...segments);
}

/** Coleção global, fora de qualquer campanha (a própria lista de campanhas). */
export const globalCol = name => collection(db, name);
export const globalDoc = (name, ...segments) => doc(db, name, ...segments);

export const activeCampaignId = escopoAtivo;
export const isPrimaryCampaign = ehCampanhaPrincipal;

/**
 * Troca a campanha ativa. Como os listeners do Firestore já montados apontam
 * para os caminhos antigos, quem chama isto deve remontar a árvore (o App usa
 * a campanha como `key`) ou recarregar a página.
 */
export function setActiveCampaign(campaign) {
  const record = typeof campaign === 'string' ? { id: campaign } : (campaign || {});
  const next = definirEscopo(record.id);
  activeRecord = next === PRIMARY_CAMPAIGN_ID ? { ...PRIMARY_CAMPAIGN, ...record, primary: true } : record;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(activeRecord)); } catch (_) {}
  for (const listener of [...listeners]) listener(activeRecord);
  return activeRecord;
}

/** A campanha ativa com nome, tema e mundo, para a interface. */
export const activeCampaign = () => activeRecord;

export function onCampaignChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Campanha guardada da última visita, se houver. */
export function loadStoredCampaign() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.id ? parsed : null;
  } catch (_) { return null; }
}

export function clearStoredCampaign() {
  definirEscopo(PRIMARY_CAMPAIGN_ID);
  activeRecord = PRIMARY_CAMPAIGN;
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

/**
 * Restaura a campanha da última visita sem avisar ninguém (nada montou ainda).
 * Devolve null quando é a primeira visita, e aí a tela de mesas aparece.
 */
export function restoreCampaignFromStorage() {
  const stored = loadStoredCampaign();
  if (!stored) return null;
  const id = definirEscopo(stored.id);
  activeRecord = id === PRIMARY_CAMPAIGN_ID ? { ...PRIMARY_CAMPAIGN, ...stored, primary: true } : stored;
  return activeRecord;
}


/** Slug para o id de uma campanha nova. */
export function campaignSlug(name) {
  const base = String(name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || `mesa-${Date.now().toString(36)}`;
}

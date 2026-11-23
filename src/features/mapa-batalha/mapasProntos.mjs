// Mapas que já vêm com o site.
//
// A arte mora em public/media/mapas e o mapa guarda só o caminho dela, em vez
// da imagem inteira codificada dentro do documento. Isso importa: um mapa
// desses tem perto de 4 MB como PNG, muito acima do limite de 1 MB por
// documento do Firestore — e mesmo cabendo, engordaria cada leitura da mesa.
// Como arquivo servido pelo site, ele é baixado uma vez e fica em cache.
//
// São mapas da Dinastia E, então só aparecem nela: outra campanha monta o
// próprio acervo.
import { isPrimaryCampaign } from '../../core/campaignModules.mjs';
import { sistemaDe } from '../../core/sistemas/index.mjs';
import { MAPAS as MAPAS_DA_CASA } from '../oneshot/mapasDaCasa.mjs';

export const MAPAS_PRONTOS = [
  {
    id: 'piramide-de-salomao',
    nome: 'Pirâmide de Salomão',
    img: '/media/mapas/piramide-salomao.webp',
    atmosfera: 'deserto',
    descricao: 'A pirâmide e as ruínas ao redor, sob o sol do deserto.',
  },
  {
    id: 'instituto-entrada',
    nome: 'Instituto Arcádia — Entrada',
    img: '/media/mapas/instituto-entrada.webp',
    atmosfera: 'instituto',
    descricao: 'O portão, o pátio e o prédio principal, à noite.',
  },
  {
    id: 'piramide-interior',
    nome: 'Pirâmide de Salomão — Interior',
    img: '/media/mapas/piramide-interior.webp',
    atmosfera: 'tumba',
    descricao: 'A câmara dos sarcófagos, o corredor e o tesouro, à luz das tochas.',
  },
  {
    id: 'instituto-arcadia',
    nome: 'Instituto Arcádia',
    img: '/media/mapas/instituto-arcadia.webp',
    atmosfera: 'arcadia',
    descricao: 'O salão central, o alojamento e o laboratório — depois da catástrofe.',
  },
  {
    id: 'salomao-lago',
    nome: 'Pirâmide de Salomão — O Lago',
    img: '/media/mapas/salomao-lago.webp',
    atmosfera: 'lago',
    descricao: 'A caverna sob a pirâmide: o lago que brilha, os cristais e a carcaça do dragão.',
  },
  {
    id: 'arcadia-arena',
    nome: 'Instituto Arcádia — Sala de Combate',
    img: '/media/mapas/arcadia-arena.webp',
    atmosfera: 'arena',
    descricao: 'A arena do Instituto, em alarme — e o que ela já viu acontecer ali.',
  },
  {
    id: 'posto-estrada',
    nome: 'Posto de Gasolina',
    img: '/media/mapas/posto-estrada.webp',
    atmosfera: 'posto',
    descricao: 'O posto na beira da estrada, de noite, sob a luz das bombas.',
  },
];

/**
 * O ACERVO DE CADA MESA.
 *
 * A regra é que mesa nenhuma vê mapa de outra. A pirâmide e o posto de
 * gasolina são cenário da Dinastia E; mostrá-los numa mesa de CAIN ou numa
 * noite de terror quebra a ficção antes de a sessão começar.
 *
 * Por isso o acervo é uma TABELA e não uma condição: cada conjunto declara a
 * que mesa pertence, e o que não está na tabela não aparece em lugar nenhum.
 * Mesa nova nasce sem acervo e só enxerga o que o próprio Mestre subir —
 * que é o caso normal.
 *
 * Para amarrar um conjunto a UMA mesa específica, e não a um sistema
 * inteiro, a chave pode ser o id da campanha: a busca tenta o id primeiro.
 */
const ACERVOS = Object.freeze({
  // Os sete mapas da casa do avô Hiroshi, do One Shot Terror.
  oneshot: MAPAS_DA_CASA.map(m => ({
    id: m.id,
    nome: m.nome,
    img: m.imagem,
    atmosfera: 'mortalha',
    descricao: `${m.onde} — ${m.luz}`,
  })),
});

export function mapasProntosDe(campaign) {
  // A Dinastia E tem o acervo dela desde antes de existirem outras mesas.
  if (isPrimaryCampaign(campaign)) return MAPAS_PRONTOS;
  const porMesa = ACERVOS[String(campaign?.id || '')];
  if (porMesa) return porMesa;
  return ACERVOS[sistemaDe(campaign)?.id] || [];
}

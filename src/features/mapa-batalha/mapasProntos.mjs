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
];

export function mapasProntosDe(campaign) {
  return isPrimaryCampaign(campaign) ? MAPAS_PRONTOS : [];
}

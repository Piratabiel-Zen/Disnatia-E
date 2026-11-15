// AS ARTES DAS LINHAGENS
//
// Cada linhagem da Dinastia E nasce com a sua ilustração. Elas moram em
// arquivos, não no Firestore: as originais têm entre 2,6 e 4 MB, e um
// documento do Firestore para em 1 MB — foi por isso que os mapas de combate
// também viraram arquivos. Em WebP a 1600px cada uma cai para 240–410 KB, e
// só a linhagem aberta é carregada.
//
// Isto é um padrão, não uma trava: a capa que o Mestre enviar pela própria
// tela continua vencendo. Serve para a mesa nunca aparecer vazia na primeira
// vez que alguém abre Classes.
//
// Vale só para a campanha principal. Outras campanhas começam sem nada, de
// propósito — a arte delas é de quem as criar.

export const ARTES_DAS_LINHAGENS = Object.freeze({
  fogo: '/media/classes/fogo.webp',             // Assassinos do Fogo Azul
  escarlate: '/media/classes/escarlate.webp',   // Cavaleiros Escarlate
  corvos: '/media/classes/corvos.webp',         // Corvos do Horizonte
  magos: '/media/classes/magos.webp',           // Magos do Prólogo do Céu
  marfim: '/media/classes/marfim.webp',         // Cientistas de Marfim
  necromante: '/media/classes/necromante.webp', // Necromantes das Cinzas Eternas
  bardo: '/media/classes/bardo.webp',           // Bardos da Luz
  arcanjo: '/media/classes/arcanjo.webp',       // Arcanjos da Escuridão
});

/**
 * A capa que esta linhagem deve mostrar agora.
 *
 * Ordem: o que o Mestre enviou vence; senão a arte que veio junto; senão
 * nada, e a tela mostra o aviso de ilustração não revelada.
 */
export function capaDaLinhagem(classId, enviadas, campanhaPrincipal) {
  const enviada = enviadas?.[classId];
  if (enviada) return enviada;
  if (!campanhaPrincipal) return '';
  return ARTES_DAS_LINHAGENS[classId] || '';
}

// O LINK DE MÚSICA
//
// Reconhece o que a pessoa colou: um endereço do YouTube em qualquer das
// formas que o site usa, um do Spotify, um URI spotify: puro, ou um id solto.
//
// Mora fora do componente porque é a única parte do tocador que dá para
// quebrar em silêncio: o resto falha na cara, com o vídeo não aparecendo. Um
// recorte errado aqui devolve um id quase certo, o embed carrega vazio, e a
// mesa descobre no meio da sessão.

const FORMAS_DO_SPOTIFY = /(?:open\.spotify\.com\/(?:embed\/)?)?(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/i;
const URI_DO_SPOTIFY = /^spotify:(track|album|playlist|episode|show):([A-Za-z0-9]+)$/i;
// Todas as formas que o YouTube serve hoje, e não só a de colar da barra de
// endereços: /live/ e /shorts/ chegam de compartilhamento pelo celular, que é
// de onde a maioria dos links da mesa vem.
const FORMAS_DO_YOUTUBE = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/|youtube\.com\/shorts\/|youtube\.com\/v\/)([^&\n?#/]+)/;
// Um id de vídeo do YouTube tem exatamente 11 caracteres deste alfabeto.
const ID_DE_VIDEO = /^[A-Za-z0-9_-]{11}$/;
// Playlist do YouTube: o Mestre monta a trilha lá e cola um link só.
const PLAYLIST_DO_YOUTUBE = /[?&]list=([A-Za-z0-9_-]+)/;

export function lerLinkDeMusica(valor) {
  const cru = String(valor || '').trim();
  if (!cru) return null;

  const spotify = cru.match(FORMAS_DO_SPOTIFY) || cru.match(URI_DO_SPOTIFY);
  if (spotify) {
    return { provider: 'spotify', spotifyUri: `spotify:${spotify[1].toLowerCase()}:${spotify[2]}` };
  }

  const youtube = cru.match(FORMAS_DO_YOUTUBE);
  if (youtube) return { provider: 'youtube', videoId: youtube[1] };

  // Link de playlist sem vídeo: toca a lista inteira, na ordem.
  const lista = cru.match(PLAYLIST_DO_YOUTUBE);
  if (lista) return { provider: 'youtube', videoId: '', listaId: lista[1] };

  // Colar só o id é um jeito legítimo de adicionar faixa — mas SÓ se o que
  // sobrou for mesmo um id. Antes, qualquer coisa não reconhecida virava o
  // "id", e o endereço inteiro era costurado dentro do embed. A faixa era
  // salva, aparecia na lista, e não tocava nada: nenhum erro, nenhum aviso,
  // só silêncio no meio da sessão. Recusar aqui é o que faz a tela avisar.
  return ID_DE_VIDEO.test(cru) ? { provider: 'youtube', videoId: cru } : null;
}

export function embedDoSpotify(uri) {
  const m = String(uri || '').match(URI_DO_SPOTIFY);
  return m ? `https://open.spotify.com/embed/${m[1].toLowerCase()}/${m[2]}?utm_source=generator&theme=0` : '';
}

/**
 * O endereço do tocador.
 *
 * Com uma playlist, o YouTube repete a lista sozinho e não se deve repetir o
 * vídeo; com um vídeo só, `loop` precisa do próprio id em `playlist`, que é
 * como o YouTube faz vídeo único repetir.
 */
export function embedDoYoutube(videoId, listaId = '') {
  const base = 'https://www.youtube.com/embed/';
  const comum = 'autoplay=1&enablejsapi=1&controls=0';
  if (listaId) return `${base}videoseries?list=${listaId}&${comum}&loop=1`;
  if (!videoId) return '';
  return `${base}${videoId}?${comum}&loop=1&playlist=${videoId}`;
}

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
const FORMAS_DO_YOUTUBE = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;

export function lerLinkDeMusica(valor) {
  const cru = String(valor || '').trim();
  if (!cru) return null;

  const spotify = cru.match(FORMAS_DO_SPOTIFY) || cru.match(URI_DO_SPOTIFY);
  if (spotify) {
    return { provider: 'spotify', spotifyUri: `spotify:${spotify[1].toLowerCase()}:${spotify[2]}` };
  }

  const youtube = cru.match(FORMAS_DO_YOUTUBE);
  // Sem nenhuma forma reconhecida, o que sobrou é tratado como id de vídeo:
  // colar só o id é um jeito legítimo de adicionar uma faixa.
  const videoId = youtube ? youtube[1] : cru;
  return videoId ? { provider: 'youtube', videoId } : null;
}

export function embedDoSpotify(uri) {
  const m = String(uri || '').match(URI_DO_SPOTIFY);
  return m ? `https://open.spotify.com/embed/${m[1].toLowerCase()}/${m[2]}?utm_source=generator&theme=0` : '';
}

export const embedDoYoutube = videoId => (videoId
  ? `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&enablejsapi=1&controls=0`
  : '');

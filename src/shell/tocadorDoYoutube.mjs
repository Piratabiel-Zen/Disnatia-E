/**
 * O TOCADOR DO YOUTUBE, COM RETORNO.
 *
 * Até aqui a música era um <iframe> com `autoplay=1` escondido fora da tela.
 * Quando funcionava, funcionava; quando não, não havia nada a observar — nem
 * erro, nem estado, nem console. E "não" tem pelo menos três causas comuns,
 * todas silenciosas:
 *
 *   1. O navegador bloqueia áudio sem um toque da pessoa. Quem põe a música
 *      clicou, então para ela toca; para o resto da mesa o comando chega pelo
 *      tempo real, sem clique nenhum, e o som é barrado.
 *   2. Muito clipe oficial de gravadora PROÍBE reprodução fora do YouTube.
 *      O iframe carrega, mostra o aviso, e não emite som. É o caso mais
 *      provável numa playlist de mesa, que é feita de música comercial.
 *   3. Vídeo removido, privado ou com restrição regional.
 *
 * A API devolve tudo isso: estado quando toca, código quando falha. É a
 * diferença entre "a música não funciona" e "este vídeo não deixa tocar fora
 * do YouTube, escolhe outro".
 *
 * Este módulo não é React de propósito: carregar o script uma vez por página
 * e tratar o `window.YT` global é trabalho de fora do ciclo de renderização.
 */

const ENDERECO_DA_API = 'https://www.youtube.com/iframe_api';

let promessaDaApi = null;

/** Carrega o script uma vez por página e resolve quando `YT.Player` existe. */
export function carregarApiDoYoutube() {
  if (typeof window === 'undefined') return Promise.reject(new Error('sem navegador'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (promessaDaApi) return promessaDaApi;

  promessaDaApi = new Promise((resolver, recusar) => {
    // O YouTube chama este global quando termina de carregar. Encadeamos para
    // não pisar em quem já tenha definido um.
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try { anterior?.(); } catch (_) { /* o deles não é problema nosso */ }
      resolver(window.YT);
    };
    const script = document.createElement('script');
    script.src = ENDERECO_DA_API;
    script.async = true;
    script.onerror = () => { promessaDaApi = null; recusar(new Error('A API do YouTube não carregou.')); };
    document.head.appendChild(script);
  });
  return promessaDaApi;
}

/**
 * O que cada código de erro do YouTube quer dizer, em português de mesa.
 *
 * Os textos falam o que fazer, não o que houve: quem lê isto está no meio de
 * uma sessão e quer a música tocando, não um diagnóstico.
 */
export function motivoDoErro(codigo) {
  switch (Number(codigo)) {
    case 2:
      return 'O endereço deste vídeo não é válido. Cole o link de novo.';
    case 5:
      return 'Este vídeo não toca no navegador. Escolha outro.';
    case 100:
      return 'Vídeo removido ou privado. Escolha outro.';
    case 101:
    case 150:
      // De longe o mais comum, e o que mais parecia "o site está quebrado".
      return 'Este vídeo não permite reprodução fora do YouTube — é comum em clipe de gravadora. Procure outra versão da mesma música.';
    default:
      return 'O YouTube recusou este vídeo. Escolha outro.';
  }
}

/** Virou som de verdade? Só PLAYING conta; BUFFERING ainda pode falhar. */
export const estaTocando = estado => Number(estado) === 1;

/**
 * Monta o tocador num elemento e devolve os comandos.
 *
 * `aoEstado` recebe o código de estado do YouTube; `aoErro`, a mensagem já
 * traduzida. Quem chama decide o que mostrar.
 */
export async function montarTocador(elemento, { videoId, listaId, volume, aoEstado, aoErro }) {
  const YT = await carregarApiDoYoutube();
  return new Promise(resolver => {
    const player = new YT.Player(elemento, {
      width: '320',
      height: '180',
      videoId: listaId ? undefined : videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        playsinline: 1,
        ...(listaId ? { list: listaId, listType: 'playlist' } : { loop: 1, playlist: videoId }),
      },
      events: {
        onReady: evento => {
          try {
            evento.target.setVolume(Number(volume) || 0);
            evento.target.playVideo();
          } catch (_) { /* o estado conta a história */ }
          resolver(player);
        },
        onStateChange: evento => aoEstado?.(evento.data),
        onError: evento => aoErro?.(motivoDoErro(evento.data), Number(evento.data)),
      },
    });
  });
}

// O LINK DE MÚSICA
//
// O tocador de ambiente é do Mestre e é usado ao vivo, no meio da cena: ele
// cola um link e espera que toque. É a única parte do tocador que quebra em
// silêncio — um recorte errado devolve um id quase certo, o embed carrega
// vazio, e a descoberta acontece com a mesa esperando.
//
// Estes testes existem para que mexer no resto do site não derrube isso sem
// ninguém notar.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { embedDoSpotify, embedDoYoutube, lerLinkDeMusica } from '../src/shell/linkDeMusica.mjs';

test('reconhece as três formas de endereço do YouTube', () => {
  const esperado = { provider: 'youtube', videoId: 'dQw4w9WgXcQ' };
  for (const link of [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
  ]) {
    assert.deepEqual(lerLinkDeMusica(link), esperado, `não reconheceu ${link}`);
  }
});

test('corta o que vem depois do id', () => {
  // Link copiado do YouTube quase sempre traz tempo, lista e rastreamento
  // grudados. Levar isso junto para o embed dá vídeo que não carrega.
  assert.deepEqual(
    lerLinkDeMusica('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL123'),
    { provider: 'youtube', videoId: 'dQw4w9WgXcQ' },
  );
  assert.deepEqual(
    lerLinkDeMusica('https://youtu.be/dQw4w9WgXcQ?si=abc123'),
    { provider: 'youtube', videoId: 'dQw4w9WgXcQ' },
  );
});

test('espaço sobrando não atrapalha', () => {
  // Ninguém cola limpo quando está narrando.
  assert.deepEqual(
    lerLinkDeMusica('  https://youtu.be/dQw4w9WgXcQ  '),
    { provider: 'youtube', videoId: 'dQw4w9WgXcQ' },
  );
});

test('o id solto continua valendo', () => {
  assert.deepEqual(lerLinkDeMusica('dQw4w9WgXcQ'), { provider: 'youtube', videoId: 'dQw4w9WgXcQ' });
});

test('reconhece o Spotify, por endereço e por URI', () => {
  const esperado = { provider: 'spotify', spotifyUri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT' };
  for (const link of [
    'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT',
    'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
  ]) {
    assert.deepEqual(lerLinkDeMusica(link), esperado, `não reconheceu ${link}`);
  }
  assert.equal(lerLinkDeMusica('https://open.spotify.com/playlist/37i9dQZF1DX').provider, 'spotify');
});

test('vazio não vira faixa', () => {
  for (const nada of ['', '   ', null, undefined]) {
    assert.equal(lerLinkDeMusica(nada), null);
  }
});

test('os endereços de embed saem montados', () => {
  const yt = embedDoYoutube('dQw4w9WgXcQ');
  assert.ok(yt.startsWith('https://www.youtube.com/embed/dQw4w9WgXcQ?'));
  assert.ok(yt.includes('loop=1') && yt.includes('playlist=dQw4w9WgXcQ'),
    'sem playlist igual ao id, o loop do YouTube não repete');
  assert.equal(embedDoYoutube(''), '');

  assert.equal(
    embedDoSpotify('spotify:track:4cOdK2wGLETKBW3PvgPWqT'),
    'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT?utm_source=generator&theme=0',
  );
  assert.equal(embedDoSpotify('qualquer coisa'), '');
});

test('a playlist de música não caiu nas coleções de acesso seletivo', () => {
  // As coleções seletivas ficam FORA da regra geral do Firestore. Se a
  // playlist entrasse nessa lista por engano, o Mestre perderia a escrita e
  // o tocador pararia de salvar faixa — calado, porque o erro só aparece no
  // console.
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const seletivo = regras.slice(regras.indexOf('function acessoSeletivo'),
                                regras.indexOf('function daMesaComum'));
  assert.ok(!seletivo.includes('config'),
    'a playlist de música entrou nas coleções de acesso seletivo');

  const tocador = readFileSync(new URL('../src/shell/AmbientSoundPlayer.jsx', import.meta.url), 'utf8');
  assert.match(tocador, /docIn\('config', 'ambient_playlists'\)/,
    'o tocador mudou de lugar de gravação');
});

/* ───────────────────────────────────────────────────────────────────────
   O SILÊNCIO DE 2026-11-18

   A mesa colava o link, a faixa aparecia na lista e não tocava nada. A
   causa: qualquer endereço não reconhecido virava "id do vídeo", e o
   endereço inteiro ia costurado dentro do embed. Links de /live/ e
   /shorts/ — que é o que o YouTube dá ao compartilhar pelo celular — caíam
   todos nesse buraco, sem erro nenhum.
   ─────────────────────────────────────────────────────────────────────── */

test('as formas que o YouTube serve pelo celular são reconhecidas', () => {
  for (const [link, id] of [
    ['https://www.youtube.com/live/abc123XYZ99', 'abc123XYZ99'],
    ['https://www.youtube.com/shorts/abc123XYZ99', 'abc123XYZ99'],
    ['https://www.youtube.com/v/abc123XYZ99', 'abc123XYZ99'],
    ['https://youtu.be/dQw4w9WgXcQ?si=qualquer', 'dQw4w9WgXcQ'],
    ['https://music.youtube.com/watch?v=dQw4w9WgXcQ&si=x', 'dQw4w9WgXcQ'],
  ]) {
    assert.deepEqual(lerLinkDeMusica(link), { provider: 'youtube', videoId: id }, link);
  }
});

test('link de playlist toca a lista inteira', () => {
  assert.deepEqual(
    lerLinkDeMusica('https://www.youtube.com/playlist?list=PLabc123'),
    { provider: 'youtube', videoId: '', listaId: 'PLabc123' },
  );
  const src = embedDoYoutube('', 'PLabc123');
  assert.match(src, /videoseries\?list=PLabc123/);
  // Playlist não repete vídeo: `playlist=<id>` é o truque de loop de um só.
  assert.ok(!/playlist=&/.test(src));
});

test('o que não é link nem id é recusado, não transformado em id', () => {
  // É esta recusa que faz a tela avisar em vez de salvar uma faixa muda.
  for (const lixo of ['https://www.youtube.com/playlist', 'https://exemplo.com/musica',
                      'tema do combate', 'http://', 'abc']) {
    assert.equal(lerLinkDeMusica(lixo), null, lixo);
  }
});

test('colar só o id continua valendo, se for mesmo um id', () => {
  assert.deepEqual(lerLinkDeMusica('dQw4w9WgXcQ'), { provider: 'youtube', videoId: 'dQw4w9WgXcQ' });
  // Onze caracteres é a medida de um id do YouTube; dez não é.
  assert.equal(lerLinkDeMusica('dQw4w9WgXc'), null);
});

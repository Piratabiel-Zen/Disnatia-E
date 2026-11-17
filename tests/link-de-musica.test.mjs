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

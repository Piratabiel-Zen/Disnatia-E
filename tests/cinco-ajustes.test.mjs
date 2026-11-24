/**
 * OS CINCO AJUSTES DA MESA DE TERROR
 *
 * Cada teste aqui guarda uma queixa concreta, e a queixa está escrita junto
 * porque daqui a seis meses a regra sem o motivo parece capricho.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

const fonte = c => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8');
const casca = () => semComentarios(fonte('src/features/oneshot/mortalha-casca.css'));
const exploracao = () => semComentarios(fonte('src/features/oneshot/exploracao.css'));

/* ─── 1. O CABEÇALHO ─── */

test('o título não é posicionado por cima dos botões', () => {
  const css = casca();
  // Era `position:absolute` no centro enquanto a barra centralizava os
  // botões: os dois disputavam o mesmo ponto e o nome saía por baixo.
  assert.ok(!/\.brand-line\{[^}]*position:absolute/.test(css),
    'tirar o título do fluxo é o que o deixa cair em cima das pastilhas');
  assert.match(css, /\.immersive-topbar\{[^}]*display:grid/,
    'a grade é o que torna a sobreposição impossível, em vez de improvável');
  assert.match(css, /\.brand-line\{[^}]*grid-column:2/);
  assert.match(css, /\.top-actions\{[^}]*grid-column:3/);
});

test('a barra tem a altura em que a fita foi fixada', () => {
  const css = casca();
  // Outra folha força 58px na barra; a fita é posicionada em --mor-topo.
  // Qualquer diferença vira uma tira de fundo atravessando a tela.
  assert.match(css, /\.immersive-topbar\{[^}]*height:var\(--mor-topo\) !important/);
  assert.match(css, /\.grim-nav\{[^}]*top:var\(--mor-topo\) !important/);
});

test('o bloco da marca cabe dentro da barra', () => {
  assert.match(casca(), /\.brand-line\{[^}]*max-height:var\(--mor-topo\)/,
    'nome e subtítulo davam 68px numa barra de 64 e a fita cortava a linha de baixo');
});

test('o título só vai ao centro onde cabe', () => {
  const css = casca();
  const centro = css.indexOf('grid-column:2');
  const media = css.lastIndexOf('@media', centro);
  const largura = Number(css.slice(media, centro).match(/min-width:(\d+)px/)?.[1]);
  // Com sete pastilhas na direita, centrar numa tela estreita faz os botões
  // transbordarem o trilho deles e voltarem a pisar no nome.
  assert.ok(largura >= 1700, `centralizar a partir de ${largura}px volta a sobrepor`);
});

/* ─── 2. A TELA CHEIA ─── */

test('a tela cheia esconde a barra e a fita, mesmo com o tema por cima', () => {
  const css = casca();
  // `map-fullscreen.css` manda esconder, mas esta folha repunha
  // `display:flex !important` com um seletor mais específico e ganhava.
  // A classe vai no próprio <html>, então os dois seletores são do MESMO
  // elemento — sem espaço entre eles, senão a regra não casa com nada.
  for (const alvo of ['.grim-nav', '.immersive-topbar']) {
    const re = new RegExp(`html\\[data-tema-mesa="mortalha"\\]\\.dinastia-map-fullscreen ${alvo.replace('.', '\\.')}`);
    assert.match(css, re, `${alvo} volta a aparecer em tela cheia`);
  }
  const bloco = css.slice(css.indexOf('.dinastia-map-fullscreen .grim-nav'));
  assert.match(bloco.slice(0, 600), /display:none !important/);
});

/* ─── 3. A FICHA DO MESTRE ─── */

test('o mestre vê a ficha do primo, não o painel da Dinastia E', () => {
  const jsx = semComentarios(fonte('src/features/mapa-batalha/BattleMapPage.jsx'));
  assert.match(jsx, /const fichaDoTokenEscolhido = ehNoite && masterMode && selectedToken\?\.sheetId/);
  // O painel antigo some quando há ficha ligada — mas continua para token
  // sem ficha, que é justamente quando o Mestre precisa dele para ligar uma.
  assert.match(jsx, /selectedToken && masterMode && \(!fichaDoTokenEscolhido \|\| painelDoToken\)/);
  assert.match(jsx, /<FichaRapida\s+ficha=\{fichaDoTokenEscolhido\}/);
});

test('a ficha do token é declarada depois do token', () => {
  const linhas = fonte('src/features/mapa-batalha/BattleMapPage.jsx').split('\n');
  const token = linhas.findIndex(l => l.includes('const selectedToken ='));
  const ficha = linhas.findIndex(l => l.includes('const fichaDoTokenEscolhido ='));
  assert.ok(token > -1 && ficha > token,
    'ler um const declarado mais abaixo estoura no render e dá tela preta');
});

test('o mestre não troca a cor da ficha alheia', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/FichaRapida.jsx'));
  // A cor serve para a pessoa se achar no meio de cinco primos parecidos;
  // quem escolhe como se achar é ela.
  assert.match(jsx, /\{aoMudarCor && \(/);
  const mapa = semComentarios(fonte('src/features/mapa-batalha/BattleMapPage.jsx'));
  const uso = mapa.slice(mapa.indexOf('ficha={fichaDoTokenEscolhido}'));
  assert.ok(!uso.slice(0, 200).includes('aoMudarCor'));
});

/* ─── 4. A NÉVOA ─── */

test('a névoa é opaca: não dá para ver o que tem atrás', () => {
  const css = exploracao();
  const bloco = css.slice(css.indexOf('.nev{'), css.indexOf('@keyframes nevVaga'));
  assert.match(bloco, /opacity:1/, 'névoa translúcida convida a apertar os olhos');
  assert.ok(!/opacity:\.9|opacity:0?\.\d/.test(bloco), 'sobrou opacidade parcial');
});

test('a névoa é cinza, e não um preto chapado', () => {
  const css = exploracao();
  const bloco = css.slice(css.indexOf('.nev{'), css.indexOf('@keyframes nevVaga'));
  // Preto chapado o olho lê como "a imagem acabou aqui" e some da cena.
  assert.ok(!/#030205|#000\b/.test(bloco), 'voltou ao preto de antes');
  const cinzas = bloco.match(/#[0-9A-Fa-f]{6}/g) || [];
  assert.ok(cinzas.length >= 2, 'névoa de uma cor só não tem volume');
  for (const cor of cinzas) {
    const v = parseInt(cor.slice(1, 3), 16);
    assert.ok(v > 0x28, `${cor} é escuro demais para passar por neblina`);
  }
});

test('a névoa se mexe, e se mexe sem arrastar os buracos', () => {
  const css = exploracao();
  const bloco = css.slice(css.indexOf('.nev{'), css.indexOf('@keyframes nevVaga'));
  assert.match(bloco, /animation:nevVaga/);
  // Por `background-position`: a máscara que abre as clareiras é do
  // elemento, e transformar o elemento arrastaria os buracos junto.
  assert.match(css, /@keyframes nevVaga\{[^}]*background-position/);
  assert.ok(!/@keyframes nevVaga\{[^}]*transform:/.test(css));
  assert.match(css, /html\[data-motion="reduced"\] \.nev\{animation:none\}/);
  assert.ok(!/prefers-reduced-motion/.test(css));
});

/* ─── 5. O VULTO ─── */

test('a imagem do vulto chega como o mestre a anexou', () => {
  const css = exploracao();
  const bloco = css.slice(css.indexOf('.vul img{'), css.indexOf('.vul span{'));
  // Havia um grayscale(1) contrast(1.5) brightness(.28) que esmagava tudo
  // em silhueta preta: escolher uma imagem que chega virada em outra coisa
  // é não escolher nada.
  assert.ok(!/grayscale|sepia|saturate|contrast|brightness|invert|hue-rotate/.test(bloco),
    'algum filtro voltou a repintar a imagem do vulto');
});

test('PNG sem fundo continua sem fundo', () => {
  const css = exploracao();
  const bloco = css.slice(css.indexOf('.vul img{'), css.indexOf('.vul span{'));
  assert.match(bloco, /background:transparent/);
  assert.match(bloco, /object-fit:contain/, 'esticar a imagem também é alterá-la');
  // A silhueta desenhada é só para quando não há imagem nenhuma.
  const semImagem = css.slice(css.indexOf('.vul span{'));
  assert.ok(!semImagem.slice(0, 200).includes('filter:'));
});

test('a assombração em tela cheia também mostra a imagem escolhida', () => {
  const css = semComentarios(fonte('src/features/oneshot/assombracao.css'));
  const bloco = css.slice(css.indexOf('.asb-coisa{'), css.indexOf('.asb-nome{'));
  assert.ok(!/grayscale|sepia|saturate\(0/.test(bloco),
    'a mesma regra vale aqui: a imagem é a escolha do Mestre');
});

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
  // E o painel da Dinastia E não aparece nesta mesa em hipótese nenhuma:
  // ele voltava pelo token feito à mão, que não tem ficha ligada. No lugar
  // dele, o caminho curto para ligar a ficha do primo.
  assert.match(jsx, /selectedToken && masterMode && !ehNoite &&/);
  assert.match(jsx, /<FichaRapida ficha=\{fichaDoTokenEscolhido\} \/>/);
  assert.match(jsx, /ehNoite && masterMode && selectedToken && !fichaDoTokenEscolhido/);
  assert.match(jsx, /updateToken\(selectedToken\.id, \{ sheetId: String\(e\.target\.value\) \}\)/);
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
  assert.ok(!uso.slice(0, 160).includes('aoMudarCor'));
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

/* ─── A SEGUNDA RODADA DE AJUSTES ─── */

test('imagem com fundo vazado é gravada em PNG, não em JPEG', () => {
  const js = semComentarios(fonte('src/core/media.js'));
  // ESTA É A RAIZ DO VULTO COM TAPA-SEXO PRETO. Não estava em CSS nenhum:
  // toda imagem ia para JPEG, que não tem canal alfa, e o que era vazado
  // virava preto NA HORA DE SALVAR. A imagem já chegava errada no banco.
  assert.match(js, /function temTransparencia/);
  assert.match(js, /'image\/png'/, 'sem PNG não há como guardar transparência');
  const corpo = js.slice(js.indexOf('export async function comprimirParaDocumento'));
  assert.match(corpo, /if \(vazada\) \{/, 'o formato tem de ser decidido pela imagem');
  assert.ok(corpo.indexOf("'image/png'") < corpo.indexOf("'image/jpeg'"),
    'o caminho do PNG tem de vir antes do JPEG');
});

test('a dúvida sobre transparência resolve a favor do PNG', () => {
  const js = semComentarios(fonte('src/core/media.js'));
  // Canvas sujo por imagem de outra origem proíbe a leitura dos pixels.
  // Aí não dá para saber, e o palpite seguro é PNG: pesa mais e não
  // destrói nada; JPEG destruiria a transparência para sempre.
  const prova = js.slice(js.indexOf('function temTransparencia'), js.indexOf('export function imagemTemTransparencia'));
  assert.match(prova, /catch \{\s*return true;/s);
  assert.match(prova, /dados\[i\] < 250/, 'borda com alfa quase cheio ainda é borda vazada');
});

test('a luz e a escuridão andam juntas, e só para um lado', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/AtmosferaDaCasa.jsx'));
  // A vinheta sozinha escurecia a moldura e deixava o miolo da casa aceso:
  // a hora passava e a sala continuava a mesma.
  assert.match(jsx, /<i className="atm-noite" \/>/, 'falta a camada chapada');
  assert.match(jsx, /'--atm-noite': atm\.escuridao/);
  assert.match(jsx, /'--atm-brilho': atm\.brilho/);
  assert.match(jsx, /<i className="atm-piscada" \/>/);
  // Só as luzes recebem o brilho da hora. Clarear névoa e sombra junto
  // deixaria a casa mais VISÍVEL conforme a noite avança.
  assert.match(jsx, /LUZES\.has\(c\) \? `\$\{c\} atm-luz` : c/);
  for (const naoEhLuz of ['atm-nevoa', 'atm-sombras', 'atm-poeira', 'atm-chuva']) {
    assert.ok(!new RegExp(`LUZES[\\s\\S]{0,400}'${naoEhLuz}'`).test(jsx),
      `${naoEhLuz} não é fonte de luz`);
  }
});

test('a casa chapada apaga sem lavar a cor do mapa', () => {
  const css = semComentarios(fonte('src/features/oneshot/atmosfera-da-casa.css'));
  const bloco = css.slice(css.indexOf('.atm-noite{'), css.indexOf('.atm-noite{') + 200);
  // Preto em opacidade normal deixa tudo cinza, e casa cinza não é casa
  // escura: é casa desbotada.
  assert.match(bloco, /mix-blend-mode:multiply/);
  assert.match(css, /html\[data-motion="reduced"\] \.atm-piscada\{animation:none/);
});

test('a letra da mortalha é de impressão antiga, e só na mortalha', () => {
  const css = semComentarios(fonte('src/features/oneshot/mortalha-casca.css'));
  assert.match(css, /--mor-letra: 'IM Fell English SC'/);
  // Toda regra de letra passa pelo tema: Dinastia E e Estrela de Absinto
  // continuam com a letra delas.
  const linhas = css.split('\n').filter(l => l.includes('--mor-letra') || l.includes('--mor-corpo'));
  assert.ok(linhas.length >= 4, 'a letra precisa alcançar títulos e texto corrido');
  const indice = css.indexOf('--mor-letra:');
  const antes = css.slice(Math.max(0, indice - 200), indice);
  assert.match(antes, /html\[data-tema-mesa="mortalha"\]/);
  // E o navegador precisa ter de onde baixar.
  assert.match(fonte('index.html'), /IM\+Fell\+English\+SC/);
});

test('o quadro do lugar mostra todas as fichas da mesa', () => {
  const jsx = semComentarios(fonte('src/adventure/SessionHome.jsx'));
  /* Houve aqui um filtro que escondia a ficha "sem dono, sem retrato, nome
     padrão". A intenção era tirar um registro abandonado de uma mesa
     específica, e o efeito foi pior que o problema: numa mesa em que
     ninguém ligou a conta ainda — que é toda mesa no começo — ele escondia
     o elenco INTEIRO, e o quadro dizia "Ninguém nesta frente ainda" com
     cinco fichas cadastradas.

     Ficha que não serve se apaga na aba de Fichas, que é onde isso é
     intencional e reversível. */
  assert.match(jsx, /splitParty\(sheets, groups\)/);
  assert.ok(!/const naMesa =/.test(jsx), 'o filtro voltou e vai esvaziar o quadro de novo');
  // E nada aqui apaga ficha de ninguém.
  assert.ok(!/deleteDoc|remove\(/.test(jsx));
});

test('a roda de fichas da Dinastia E não entra na mesa de terror', () => {
  const mapa = semComentarios(fonte('src/features/mapa-batalha/BattleMapPage.jsx'));
  // A bolinha com a silhueta só repetia o caminho para a ficha rápida, que
  // já está aberta ali embaixo com retrato, vida, pavor e competências.
  assert.match(mapa, /\{!ehNoite && <MapSheetDock/);
  // E o canto de baixo à esquerda fica com o que é desta mesa: esconder,
  // e a ficha logo abaixo.
  const esc = semComentarios(fonte('src/features/oneshot/esconderijo.css'));
  assert.match(esc, /\.esc-entrar\{[^}]*left:12px;bottom:52px/);
  const fr = semComentarios(fonte('src/features/oneshot/ficha-rapida.css'));
  assert.match(fr, /\.fr\{[^}]*left:10px;bottom:10px/);
});

test('os cartões do elenco quebram a linha em vez de se espremer', () => {
  const css = semComentarios(fonte('src/adventure/sessao.css'));
  // Como item de uma linha que quebra, o `flex` padrão fazia os cartões se
  // espremerem uns contra os outros em vez de passar para a linha de baixo.
  assert.match(css, /\.sessao-integrante\{[^}]*flex:0 0 auto/);
});

test('quem criou a mesa pode trocar o nome e a frase', () => {
  const jsx = semComentarios(fonte('src/features/campanhas/CampaignGate.jsx'));
  // Eram decididos no cadastro e viravam pedra: a única saída era criar
  // outra mesa e perder tudo o que já estava dentro desta.
  assert.match(jsx, /const podeEditar = canManage && !campaign\.primary && souQuemCriou;/);
  // E não é de quem souber a senha de Mestre: ela é passada de pessoa para
  // pessoa durante a campanha, e o nome aparece para todo mundo na lista.
  assert.ok(!/podeEditar = [^;]*mestre/i.test(jsx));
  // Grava só os dois campos, com merge: o documento carrega sistema, tema,
  // dono e as senhas, e mandar o objeto inteiro apagaria algum por omissão.
  assert.match(jsx, /setDoc\(globalDoc\('campaigns', campaign\.id\), campos, \{ merge: true \}\)/);
  // Mesa sem nome some da lista.
  assert.match(jsx, /if \(!nome\) \{ setErroEdicao/);
});

test('as regras deixam o criador consertar a própria mesa', () => {
  const regras = fonte('firestore.rules');
  // A criação da mesa é uma sequência de escritas e a última — o registro
  // de membro — pode falhar sozinha. Quando falha, mestre(cid) dá falso e
  // o criador fica sem poder mexer na própria mesa.
  assert.match(regras, /allow update: if mestre\(cid\)\s*\|\|\s*\(logado\(\) && resource\.data\.get\('criadoPor', ''\) == request\.auth\.uid\)/);
});

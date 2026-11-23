/**
 * INSPEÇÃO DE OBJETOS
 *
 * A promessa que estes testes guardam é uma só, e é de desenho, não de
 * código: o detalhe escondido SÓ aparece quando a pessoa procura. Se um dia
 * ele passar a vir junto com o objeto, deixa de ser escondido e vira legenda
 * — e legenda não dá susto nenhum. É uma regressão que não quebra nada, não
 * aparece no console e só se descobre na mesa, com a surpresa já gasta.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  ZOOM_MINIMO, ZOOM_MAXIMO, ZOOM_QUE_REVELA, ZOOM_PASSO,
  estadoDaInspecao, escondeAlgo, girar, limitarZoom, objetoInspecionavel,
  temDetalheDePerto, temVerso,
} from '../src/features/oneshot/inspecao.mjs';

const fonte = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

const comSegredo = {
  titulo: 'Fotografia da varanda',
  imagem: 'data:image/webp;base64,xx',
  detalheDePerto: 'Tem alguém na janela do fundo.',
  versoTexto: 'Agosto de 1953.',
};
const semSegredo = { titulo: 'Chave', imagem: 'data:image/webp;base64,yy' };

test('o detalhe de perto não vem junto com o objeto', () => {
  // ABRIR não revela: é o que separa detalhe escondido de legenda.
  const aberto = estadoDaInspecao({ objeto: comSegredo });
  assert.equal(aberto.mostrandoDetalhe, false);
  assert.equal(aberto.achou, false);
  assert.equal(aberto.zoom, ZOOM_MINIMO);
});

test('o primeiro passo de zoom ainda não entrega o detalhe', () => {
  // A descoberta tem que ser da pessoa, não da interface: se o primeiro
  // clique já revelasse, ninguém teria procurado nada.
  const umPasso = estadoDaInspecao({ zoom: ZOOM_MINIMO + ZOOM_PASSO, objeto: comSegredo });
  assert.equal(umPasso.mostrandoDetalhe, false);
  assert.ok(ZOOM_QUE_REVELA > ZOOM_MINIMO + ZOOM_PASSO,
    'o limite de revelação encostou no primeiro passo de zoom');
});

test('aproximando o bastante, o detalhe aparece — e some ao afastar', () => {
  const perto = estadoDaInspecao({ zoom: ZOOM_QUE_REVELA, objeto: comSegredo });
  assert.equal(perto.mostrandoDetalhe, true);
  assert.equal(perto.achou, true);
  // Achado preso na tela vira legenda.
  const longe = estadoDaInspecao({ zoom: ZOOM_MINIMO, objeto: comSegredo });
  assert.equal(longe.mostrandoDetalhe, false);
});

test('objeto sem segredo nunca revela nada, por mais que se aproxime', () => {
  const perto = estadoDaInspecao({ zoom: ZOOM_MAXIMO, objeto: semSegredo });
  assert.equal(perto.mostrandoDetalhe, false);
  assert.equal(perto.achou, false);
  assert.equal(escondeAlgo(objetoInspecionavel(semSegredo)), false);
  assert.equal(escondeAlgo(objetoInspecionavel(comSegredo)), true);
});

test('virado mostra o verso, e o detalhe de perto some', () => {
  // São dois gestos diferentes e não se somam: virado, a pessoa está
  // olhando outra coisa, e manter o achado da frente em cima do verso
  // misturaria as duas descobertas numa tela só.
  const virado = estadoDaInspecao({ zoom: ZOOM_MAXIMO, virado: true, objeto: comSegredo });
  assert.equal(virado.mostrandoVerso, true);
  assert.equal(virado.mostrandoDetalhe, false);
  assert.equal(virado.achou, true);
});

test('virar objeto sem verso não mostra verso nenhum', () => {
  const virado = estadoDaInspecao({ virado: true, objeto: semSegredo });
  assert.equal(virado.mostrandoVerso, false);
  assert.equal(virado.achou, false);
});

test('o zoom respeita os limites, inclusive diante de lixo', () => {
  assert.equal(limitarZoom(99), ZOOM_MAXIMO);
  assert.equal(limitarZoom(-3), ZOOM_MINIMO);
  assert.equal(limitarZoom('nada'), ZOOM_MINIMO);
  assert.equal(limitarZoom(undefined), ZOOM_MINIMO);
  const estado = estadoDaInspecao({ zoom: 999, objeto: comSegredo });
  assert.equal(estado.podeAproximar, false);
  assert.equal(estadoDaInspecao({ zoom: ZOOM_MINIMO }).podeAfastar, false);
});

test('o giro anda de 90 em 90 e volta ao zero', () => {
  assert.equal(girar(0), 90);
  assert.equal(girar(270), 0);
  assert.equal(girar(-90), 0);
  assert.equal(girar('nada'), 90);
});

test('o objeto nasce com todos os campos, mesmo vindo pela metade', () => {
  // A aparição antiga não tem os campos novos, e a tela não pode quebrar
  // na ficha de quem já estava jogando.
  const vazio = objetoInspecionavel();
  for (const campo of ['titulo', 'imagem', 'descricao', 'detalheDePerto',
    'versoImagem', 'versoTexto']) {
    assert.equal(typeof vazio[campo], 'string', `${campo} não nasceu string`);
  }
  assert.equal(temVerso(vazio), false);
  assert.equal(temDetalheDePerto(vazio), false);
});

/* ─── A tela ──────────────────────────────────────────────────────────── */

test('nada na tela avisa que o objeto esconde alguma coisa', () => {
  /* Um aviso faria a mesa inteira caçar em vez de jogar — o efeito contrário
     do pretendido. O botão de VIRAR é a exceção combinada: virar uma foto é
     gesto que a pessoa conhece do mundo, e escondê-lo seria interface ruim,
     não suspense. */
  const insp = semComentarios(fonte('src/features/oneshot/InspetorDeObjeto.jsx'));
  assert.ok(!/escondeAlgo\(objeto\)\s*&&/.test(insp),
    'a tela passou a destacar objeto com segredo');
  assert.ok(!/segredo|tem algo|procure/i.test(insp),
    'entrou aviso de segredo na tela');
  // E o botão de virar só existe quando há verso de verdade.
  assert.match(insp, /temVerso\(objeto\)\s*&&/);
});

test('a galeria abre o objeto e a imagem inteira é o alvo', () => {
  // Esconder "examinar" atrás de um ícone de lupa faria metade da mesa
  // nunca descobrir que dá para aproximar.
  const pagina = semComentarios(fonte('src/features/oneshot/AparicoesPage.jsx'));
  assert.match(pagina, /className="apa-examinar"/);
  assert.match(pagina, /setExaminando\(a\)/);
  assert.match(pagina, /<InspetorDeObjeto/);
});

test('o Mestre tem onde escrever os dois esconderijos', () => {
  const pagina = semComentarios(fonte('src/features/oneshot/AparicoesPage.jsx'));
  assert.match(pagina, /detalheDePerto: e\.target\.value/);
  assert.match(pagina, /versoTexto: e\.target\.value/);
});

test('Esc fecha e a roda do mouse aproxima', () => {
  const insp = semComentarios(fonte('src/features/oneshot/InspetorDeObjeto.jsx'));
  assert.match(insp, /'Escape'/);
  assert.match(insp, /onWheel=\{rolar\}/);
  // Arrastar só com a imagem ampliada: senão o objeto escorrega para fora da
  // tela ao primeiro toque e não tem como ser trazido de volta.
  assert.match(insp, /if \(zoom <= ZOOM_MINIMO\) return;/);
});

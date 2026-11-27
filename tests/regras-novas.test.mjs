/**
 * AS REGRAS NOVAS CHEGAM NA PÁGINA DE REGRAS
 *
 * Regra que muda no código e não muda na página de Regras é pior do que
 * regra não mudada: a mesa lê uma coisa e joga outra, e a discussão
 * acontece no meio do susto.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { SECOES_DAS_REGRAS } from '../src/features/oneshot/regrasOneShot.mjs';
import {
  PAVOR_MAXIMO, SANIDADE_MAXIMA, SANIDADE_VISOES, SANIDADE_DESVANTAGEM,
  PONTOS_DE_SORTE,
} from '../src/features/oneshot/fichaOneShot.mjs';
import { TALENTOS } from '../src/features/oneshot/talentosOneShot.mjs';

const texto = id => {
  const s = SECOES_DAS_REGRAS.find(x => x.id === id);
  assert.ok(s, `a seção ${id} sumiu das regras`);
  return [s.abertura, s.titulo, ...s.corpo].join('\n');
};
const tudo = SECOES_DAS_REGRAS.map(s => [s.abertura, s.titulo, ...s.corpo].join('\n')).join('\n');

test('a seção das condições conta o pavio e os três degraus', () => {
  const t = texto('condicoes');
  assert.match(t, new RegExp(`pavio de ${PAVOR_MAXIMO}`, 'i'));
  assert.match(t, /VONTADE/, 'não diz com o que se resiste ao estouro');
  assert.match(t, /1 de Sanidade/i, 'não diz o que custa falhar');
  for (const degrau of [SANIDADE_VISOES, SANIDADE_DESVANTAGEM, SANIDADE_MAXIMA]) {
    assert.ok(t.includes(String(degrau)), `o degrau ${degrau} não está escrito`);
  }
  assert.match(t, /n[ãa]o levanta sozinha|alguém precisa chegar perto/i);
});

test('estourar o pavor não tira vida, e as regras não dizem que tira', () => {
  // A regra antiga cobrava 1 de PV. Se a frase sobrevivesse em algum
  // canto, a mesa aplicaria as duas.
  assert.ok(!/CEDER custa 1 de Vida/i.test(tudo), 'sobrou a regra antiga de ceder');
  assert.ok(!/visão oferece/i.test(tudo), 'sobrou a mecânica antiga da visão');
});

test('há uma seção sobre se esconder, com o relógio e as duas saídas', () => {
  const t = texto('esconder');
  assert.match(t, /rel[óo]gio/i, 'não menciona o relógio na tela');
  assert.match(t, /SORTE/, 'não diz que Sorte acha esconderijo');
  assert.match(t, /VONTADE/, 'não diz do teste para não gritar');
  assert.match(t, /pisca dois segundos/i, 'não avisa que o ponto some');
  assert.match(t, /pega|custa ter sido vista/i, 'não diz o que acontece se for vista');
});

test('as seções continuam numeradas em ordem, sem buraco', () => {
  const ordens = SECOES_DAS_REGRAS.map(s => s.ordem);
  assert.deepEqual(ordens, [...ordens].sort((a, b) => a - b), 'fora de ordem');
  assert.equal(new Set(ordens).size, ordens.length, 'duas seções com a mesma ordem');
  const numerais = SECOES_DAS_REGRAS.map(s => s.numeral);
  assert.equal(new Set(numerais).size, numerais.length, 'dois numerais iguais');
});

test('é um dado de sorte, e as regras dizem isso', () => {
  assert.equal(PONTOS_DE_SORTE, 1);
  assert.match(texto('sorte-e-talento'), new RegExp(`\\b${PONTOS_DE_SORTE}\\b`));
});

test('Âncora e Mão que Não Treme trocaram Pavor por Sanidade', () => {
  /* Os dois mexiam em Pavor, que agora zera sozinho a cada estouro —
     tirar um ponto dele virou um talento sem valor. Quem precisa de
     alguém por perto é a Sanidade, que não desce de outro jeito. */
  const ancora = TALENTOS.find(t => t.id === 'ancora');
  assert.match(ancora.efeito, /SANIDADE/);
  assert.ok(!/Pavor/i.test(ancora.efeito), 'a Âncora ainda tira Pavor');

  const mao = TALENTOS.find(t => t.id === 'mao-firme');
  assert.match(mao.efeito, /SANIDADE/);
  assert.ok(!/Pavor/i.test(mao.efeito), 'a Mão que Não Treme ainda zera Pavor');
});

test('a falha crítica continua cobrando Pavor — essa não mudou', () => {
  const comPavor = TALENTOS.filter(t => /Pavor/i.test(t.efeito));
  assert.equal(comPavor.length, 1, 'mais talentos mexendo em Pavor do que o esperado');
  assert.match(comPavor[0].efeito, /falha crítica/i);
});

test('só vulto e criatura podem virar vulto no mapa', async () => {
  /* A lista inteira de aparições deixava o Mestre mandar a foto da chave
     enferrujada atravessar o corredor. Página, símbolo e item não
     atravessam corredor nenhum. */
  const { vultosDisponiveis, TIPOS_QUE_VIRAM_VULTO } =
    await import('../src/features/oneshot/vultoNoMapa.mjs');
  const { TIPOS_DE_APARICAO } = await import('../src/features/oneshot/aparicoes.mjs');

  const todas = TIPOS_DE_APARICAO.map((t, i) => ({
    id: String(i), tipo: t.id, titulo: t.nome, imagem: 'x',
  }));
  const nomes = vultosDisponiveis(todas).map(v => v.nome);

  for (const t of TIPOS_DE_APARICAO) {
    const cabe = TIPOS_QUE_VIRAM_VULTO.includes(t.id);
    assert.equal(nomes.includes(t.nome), cabe, `${t.id} ${cabe ? 'sumiu' : 'vazou'} da lista`);
  }
  // A silhueta desenhada continua sendo a primeira opção, sempre.
  assert.equal(vultosDisponiveis([])[0].nome, 'Silhueta');
  // E aparição sem imagem não entra, mesmo sendo do tipo certo.
  assert.equal(vultosDisponiveis([{ id: '9', tipo: 'vulto', titulo: 'X' }]).length, 1);
});

test('a lanterna passa de cartão em cartão, não todos de uma vez', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(
    new URL('../src/features/oneshot/talentos-one-shot.css', import.meta.url), 'utf8');
  const jsx = readFileSync(
    new URL('../src/features/oneshot/TalentosOneShotPage.jsx', import.meta.url), 'utf8');

  // O índice tem de chegar ao CSS: sem ele, dez brilhos simultâneos.
  assert.match(jsx, /--ost-i['"]?\s*:\s*i/);
  assert.match(css, /animation-delay:calc\(var\(--ost-i,0\) \* \.42s\)/);

  // E só transform/opacity: o mapa e esta página dividem o mesmo celular.
  /* Sem os comentários: a primeira versão disto achou uma "propriedade"
     chamada `ciclo` dentro da frase "a varredura ocupa 14% do ciclo:". */
  const { semComentarios } = await import('./ajuda/semComentarios.mjs');
  const limpo = semComentarios(css);
  const quadros = [...limpo.matchAll(/@keyframes ost[A-Za-z]+\{([\s\S]*?)\n\}/g)].map(m => m[1]);
  assert.ok(quadros.length >= 3, 'as animações da lanterna sumiram');
  for (const q of quadros) {
    const props = [...q.matchAll(/([a-z-]+):/g)].map(m => m[1]);
    for (const prop of props) {
      assert.ok(['transform', 'opacity', 'border-left-color'].includes(prop),
        `a lanterna anima ${prop}, que obriga o navegador a redesenhar`);
    }
  }
  // O movimento respeita o data-motion da raiz, como o resto do site.
  assert.match(limpo, /html\[data-motion="reduced"\][\s\S]{0,240}animation:none/);
});

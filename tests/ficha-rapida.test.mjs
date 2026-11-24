/**
 * A FICHA RÁPIDA NO MAPA
 *
 * Durante a cena ninguém abre a aba de fichas: o mapa está aberto e o que a
 * pessoa precisa saber é quanto lhe resta e quanto soma na competência que
 * vai usar. Abrir outra aba para isso custa a vez dela.
 *
 * As duas promessas guardadas aqui: o painel NÃO EDITA nada (ficha se edita
 * na aba da ficha, e dois lugares para a mesma verdade sempre deixam um
 * para trás), e a COR é do jogador.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  CORES, COR_PADRAO, comSinal, corPorId, talentoEmUmaLinha,
} from '../src/features/oneshot/fichaRapida.mjs';
import { COMPETENCIAS, fichaNova } from '../src/features/oneshot/fichaOneShot.mjs';
import { talentoPorId } from '../src/features/oneshot/talentosOneShot.mjs';

const fonte = c => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8');

test('são as cinco cores que a mesa pediu', () => {
  assert.deepEqual(CORES.map(c => c.id), ['roxo', 'cinza', 'preto', 'azul', 'vermelho']);
  for (const c of CORES) {
    for (const campo of ['nome', 'fundo', 'borda', 'realce', 'tinta', 'fraca']) {
      assert.ok(c[campo], `a cor ${c.id} não tem ${campo}`);
    }
  }
});

test('cada cor traz a própria tinta, e não herda', () => {
  /* Numa paleta escura, um cinza-médio some no preto e berra no roxo. Por
     isso tinta e fraca são calculadas para cada fundo. */
  const tintas = new Set(CORES.map(c => c.tinta));
  assert.ok(tintas.size >= 4, 'as cores passaram a dividir a mesma tinta');
});

test('cor inventada cai no padrão em vez de quebrar', () => {
  assert.equal(corPorId('rosa-choque').id, COR_PADRAO);
  assert.equal(corPorId(undefined).id, COR_PADRAO);
  assert.equal(corPorId('roxo').id, 'roxo');
});

test('a ficha nova nasce com cor', () => {
  // Sem padrão, o painel abriria sem fundo na primeira vez.
  assert.equal(fichaNova().corDaFichaRapida, COR_PADRAO);
});

test('o sinal usa o menos de verdade e não esconde o zero', () => {
  assert.equal(comSinal(3), '+3');
  assert.equal(comSinal(-2), '−2');
  assert.equal(comSinal(0), '0');
  assert.equal(comSinal(undefined), '0');
});

test('o talento cabe em uma linha, do catálogo ou inventado', () => {
  // O efeito inteiro tem três ou quatro linhas e não cabe num painel de
  // mapa: o resumo lembra a pessoa de que ela TEM aquilo.
  const doCatalogo = talentoEmUmaLinha({ talento: 'ancora' }, talentoPorId('ancora'));
  assert.equal(doCatalogo.nome, 'Âncora');
  assert.ok(doCatalogo.resumo);

  const inventado = talentoEmUmaLinha(
    { talento: 'Cresci nesta rua', talentoResumo: 'Sei onde o muro é baixo.' }, null,
  );
  assert.equal(inventado.nome, 'Cresci nesta rua');
  assert.equal(inventado.resumo, 'Sei onde o muro é baixo.');

  assert.equal(talentoEmUmaLinha({ talento: '' }, null), null);
  assert.equal(talentoEmUmaLinha(null, null), null);
});

/* ─── A tela ──────────────────────────────────────────────────────────── */

test('o painel não edita nada da ficha', () => {
  /* Ficha se edita na aba da ficha. Painel de mapa que também edita vira
     dois lugares para a mesma verdade, e um deles sempre fica para trás. */
  const jsx = semComentarios(fonte('src/features/oneshot/FichaRapida.jsx'));
  assert.ok(!/<input|<textarea|<select/.test(jsx),
    'entrou campo de edição na ficha rápida');
  // A única coisa que muda é a cor, que é da pessoa e não da ficha.
  assert.match(jsx, /aoMudarCor\?\.\(id\)/);
});

test('mesmo fechada ela responde "quanto me resta"', () => {
  // É a pergunta que mais se faz numa noite dessas.
  const jsx = semComentarios(fonte('src/features/oneshot/FichaRapida.jsx'));
  const aba = jsx.match(/className="fr-aba"[\s\S]*?<\/button>/)[0];
  assert.match(aba, /\{ficha\.pv\}\/\{pvMaximo\} vida/);
});

test('as doze competências entram, com nome e número e mais nada', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/FichaRapida.jsx'));
  assert.match(jsx, /COMPETENCIAS\.map\(c =>/);
  // O resumo de cada competência fica de fora: numa cena a pessoa não quer
  // ler o que Furtividade significa, quer saber se soma ou subtrai.
  assert.ok(!/c\.resumo/.test(jsx), 'o resumo da competência entrou no painel do mapa');
  assert.equal(COMPETENCIAS.length, 12);
});

test('os três medidores aparecem', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/FichaRapida.jsx'));
  for (const m of ['vida', 'pavor', 'sanidade']) {
    assert.match(jsx, new RegExp(`data-medidor="${m}"`), `falta o medidor de ${m}`);
  }
});

test('nenhuma cor está escrita na folha de estilo', () => {
  /* A paleta mora no modelo, para a tela não ter uma sexta cor que o modelo
     não conhece. O CSS só lê variáveis.
     Duas exceções, e as duas são categorias e não conveniências:

     SINAIS DO SISTEMA — nível de dano e competência travada em negativo:
     têm que significar a mesma coisa nas cinco paletas, senão o vermelho
     de "quase morrendo" viraria outra coisa na ficha roxa.

     MATERIAIS — o pergaminho da placa do nome e a cera do lacre: são
     objetos DESENHADOS na ficha, não a cor dela. Papel é papel e cera é
     cera nas cinco cores; tingi-los faria a placa parecer um botão. */
  const css = semComentarios(fonte('src/features/oneshot/ficha-rapida.css'));
  const semNiveis = css
    .replace(/\[data-nivel="[23]"\]\{[^}]*\}/g, '')
    .replace(/\[data-negativo\]\{[^}]*\}/g, '')
    // materiais: o pergaminho da placa e a cera do lacre
    .replace(/\.fr-quem>b\{[^}]*\}/g, '')
    .replace(/\.fr-topo::before\{[^}]*\}/g, '');
  const hex = semNiveis.match(/#[0-9A-Fa-f]{3,6}\b/g) || [];
  assert.deepEqual(hex, [], `cor fixa no CSS: ${hex.join(', ')}`);
});

test('o retrato guarda o 3x4', () => {
  // Esticar aqui deformaria o rosto que a pessoa escolheu.
  assert.match(semComentarios(fonte('src/features/oneshot/ficha-rapida.css')),
    /\.fr-retrato\{[^}]*aspect-ratio:3\/4/);
});

test('o painel é do jogador, e o Mestre não ganha um segundo', () => {
  /* Ele já tem o do token, e dois painéis no mesmo mapa disputam o mesmo
     canto. */
  const mapa = semComentarios(
    fonte('src/features/mapa-batalha/BattleMapPage.jsx'));
  assert.match(mapa, /const minhaFichaDaNoite = ehNoite && playerSheetId/);
  assert.match(mapa, /\{minhaFichaDaNoite && \(\s*<FichaRapida/);
  // E a cor é gravada na ficha de quem escolheu.
  assert.match(mapa, /corDaFichaRapida: String\(cor\)/);
});

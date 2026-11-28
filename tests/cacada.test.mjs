/**
 * A CAÇADA
 *
 * Em Ao Oni o Oni persegue por volta de vinte segundos e some quando você
 * atravessa a porta seguinte. Nira Oni acrescentou o que parece errado e é
 * o melhor: um medidor dizendo exatamente quanto tempo falta.
 *
 * Mostrar o tempo parece matar a tensão e faz o contrário — pânico sem
 * relógio é barulho, e o jogador desiste de pensar; com relógio vira
 * "aguento mais oito segundos ou corro agora?", que é uma decisão.
 *
 * Estes testes guardam as três saídas (tempo, porta, Mestre) e a regra de
 * que o Cerco não tem nenhuma das duas primeiras.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  MODOS, SEGUNDOS_PADRAO, SEGUNDOS_MINIMO, SEGUNDOS_MAXIMO,
  cacadaParaComecar, estadoDaCacada, modoDaCacada, batidaEmMs,
} from '../src/features/oneshot/cacada.mjs';

const fonte = c => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8');
const T0 = 1_000_000;
const correndo = (extra = {}) => cacadaParaComecar({
  oQue: 'O vulto', mapa: 'terreo', segundos: 20, agora: T0, ...extra,
});

test('a caçada nasce ativa, no mapa e no relógio em que foi solta', () => {
  const c = correndo();
  assert.equal(c.ativa, true);
  assert.equal(c.mapa, 'terreo');
  assert.equal(c.segundos, 20);
  assert.equal(c.comecouEm, T0);
  assert.equal(c.modo, 'corrida');
});

test('o tempo fica entre o mínimo e o máximo', () => {
  assert.equal(correndo({ segundos: 1 }).segundos, SEGUNDOS_MINIMO);
  assert.equal(correndo({ segundos: 9999 }).segundos, SEGUNDOS_MAXIMO);
  assert.equal(correndo({ segundos: 'nada' }).segundos, SEGUNDOS_PADRAO);
});

test('modo desconhecido vira corrida', () => {
  assert.equal(correndo({ modo: 'inventado' }).modo, 'corrida');
  assert.equal(modoDaCacada('inventado').id, 'corrida');
  assert.equal(modoDaCacada('cerco').id, 'cerco');
});

/* ─── O relógio ─── */

test('o tempo cai segundo a segundo', () => {
  const c = correndo();
  const em = s => estadoDaCacada(c, { agora: T0 + s * 1000, mapaAtual: 'terreo' });
  assert.equal(em(0).restante, 20);
  assert.equal(em(5).restante, 15);
  assert.equal(em(19.5).restante, 1);
});

test('no fim do tempo, escaparam', () => {
  const c = correndo();
  const fim = estadoDaCacada(c, { agora: T0 + 20_000, mapaAtual: 'terreo' });
  assert.equal(fim.ativa, false);
  assert.equal(fim.escapou, true);
});

test('atravessar a porta encerra, mesmo com tempo de sobra', () => {
  // A regra do Ao Oni, e ela é boa porque dá à mesa uma saída que depende
  // de decisão e não de sorte: alguém tem de escolher o corredor.
  const c = correndo();
  const outro = estadoDaCacada(c, { agora: T0 + 3000, mapaAtual: 'porao' });
  assert.equal(outro.ativa, false);
  assert.equal(outro.escapou, true);
  // E no mesmo cômodo continua correndo.
  assert.equal(estadoDaCacada(c, { agora: T0 + 3000, mapaAtual: 'terreo' }).ativa, true);
});

test('caçada encerrada não volta a correr', () => {
  for (const morta of [null, undefined, {}, { ativa: false }, { ativa: false, comecouEm: T0, segundos: 20 }]) {
    const e = estadoDaCacada(morta, { agora: T0, mapaAtual: 'terreo' });
    assert.equal(e.ativa, false, `ressuscitou com ${JSON.stringify(morta)}`);
  }
});

test('sem mapa na mão, o relógio continua valendo', () => {
  // Quem abre a tela antes do mapa carregar não pode "escapar" por acidente.
  const c = correndo();
  assert.equal(estadoDaCacada(c, { agora: T0 + 2000, mapaAtual: '' }).ativa, true);
});

/* ─── O Cerco ─── */

test('do Cerco não se escapa correndo nem esperando', () => {
  /* Nira Oni tem um oni impossível de superar na corrida: só barricando. O
     valor não é a dificuldade — é QUEBRAR O PADRÃO que o próprio jogo
     ensinou. Depois de três caçadas em que correr funcionou, a quarta em
     que não funciona vale por qualquer susto. */
  const c = correndo({ modo: 'cerco' });
  const trocouDeMapa = estadoDaCacada(c, { agora: T0 + 2000, mapaAtual: 'porao' });
  assert.equal(trocouDeMapa.ativa, true, 'a porta não pode salvar no Cerco');
  const muitoDepois = estadoDaCacada(c, { agora: T0 + 600_000, mapaAtual: 'terreo' });
  assert.equal(muitoDepois.ativa, true, 'o tempo não pode salvar no Cerco');
  assert.equal(muitoDepois.inescapavel, true);
  assert.ok(MODOS.cerco.inescapavel);
});

test('o relógio do Cerco conta para cima', () => {
  const c = correndo({ modo: 'cerco' });
  const a = estadoDaCacada(c, { agora: T0 + 5000, mapaAtual: 'terreo' });
  const b = estadoDaCacada(c, { agora: T0 + 30_000, mapaAtual: 'terreo' });
  assert.ok(b.restante > a.restante, 'esperar deixou de ser saída: o número sobe');
  assert.equal(a.tensao, 1, 'no Cerco a tensão é máxima o tempo todo');
});

/* ─── A tensão ─── */

test('a tensão cresce ao quadrado: o fim pesa mais que o começo', () => {
  const c = correndo();
  const t = s => estadoDaCacada(c, { agora: T0 + s * 1000, mapaAtual: 'terreo' }).tensao;
  assert.ok(t(10) < 0.3, `na metade a tensão já estava em ${t(10)}`);
  assert.ok(t(18) > 0.75, `a dois segundos do fim a tensão era só ${t(18)}`);
  let anterior = -1;
  for (let s = 0; s < 20; s += 1) {
    assert.ok(t(s) >= anterior, 'a tensão andou para trás');
    anterior = t(s);
  }
});

test('a tensão nunca sai de zero a um', () => {
  const c = correndo();
  for (const s of [-5, 0, 10, 19.99, 25, 1000]) {
    const e = estadoDaCacada(c, { agora: T0 + s * 1000, mapaAtual: 'terreo' });
    assert.ok(e.tensao >= 0 && e.tensao <= 1, `tensão ${e.tensao} em ${s}s`);
  }
});

test('o coração acelera com a tensão, e tem piso', () => {
  // Sem piso a batida viraria estroboscópio nos últimos segundos, que passa
  // de assustador para fisicamente ruim de olhar.
  assert.ok(batidaEmMs(0) > batidaEmMs(1));
  assert.ok(batidaEmMs(1) >= 400, `batida de ${batidaEmMs(1)}ms é rápida demais`);
  assert.ok(batidaEmMs(0) <= 1000);
  for (const v of [-9, NaN, undefined, 5]) {
    assert.ok(Number.isFinite(batidaEmMs(v)), `batida quebrou com ${String(v)}`);
  }
});

/* ─── A tela ─── */

test('a caçada não bloqueia a tela', () => {
  const css = semComentarios(fonte('src/features/oneshot/cacada.css'));
  // A caçada acontece enquanto a mesa olha o mapa, discute e decide para
  // onde corre. Um painel modal mataria a cena que ele apoia.
  assert.match(css, /\.cac\{[^}]*pointer-events:none/);
  // E o vermelho fica nas BORDAS: o miolo é onde está o mapa, que é o que
  // a mesa precisa enxergar justamente agora.
  assert.match(css, /\.cac-pulso\{[^}]*transparent 42%/);
});

test('o relógio e a batida saem do mesmo cálculo', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/Cacada.jsx'));
  // Em arquivos diferentes eles dessincronizam na primeira vez que alguém
  // mexe num dos dois.
  assert.match(jsx, /'--cac-tensao': estado\.tensao/);
  assert.match(jsx, /'--cac-batida': `\$\{batida\}ms`/);
  assert.match(jsx, /const batida = batidaEmMs\(estado\.tensao\)/);
});

test('quem encerra no banco é o mestre', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/Cacada.jsx'));
  // Se cada jogador gravasse ao ver zerar, seriam cinco gravações para o
  // mesmo fim. A tela de todos para sozinha de qualquer jeito, porque o
  // fim é calculado do relógio e não de um aviso.
  assert.match(jsx, /if \(!estado\.escapou \|\| avisou\.current \|\| !mestre\) return;/);
});

test('a mesa inteira conta o mesmo tempo', () => {
  const mapa = semComentarios(fonte('src/features/mapa-batalha/BattleMapPage.jsx'));
  // Documento único e não um por jogador: em relógios diferentes a decisão
  // de correr deixa de ser a mesma decisão para todo mundo.
  assert.match(mapa, /docIn\('config', 'cacada'\)/);
  assert.match(mapa, /<Cacada\s+cacada=\{cacadaDaMesa\}/);
  // O relógio vai para a tela de todos; o controle, só para o Mestre.
  assert.match(mapa, /\{ehNoite && \(\s*<Cacada/);
  assert.match(mapa, /\{ehNoite && masterMode && \(\s*<ComecarCacada/);
});

test('sem movimento, o relógio continua', () => {
  const css = semComentarios(fonte('src/features/oneshot/cacada.css'));
  // O número É a informação; o que para é só o que serve para apertar.
  assert.match(css, /html\[data-motion="reduced"\][\s\S]{0,260}animation:none/);
  assert.match(css, /html\[data-motion="reduced"\] \.cac\{opacity:1\}/);
  assert.ok(!/prefers-reduced-motion/.test(css));
});

test('o relógio da caçada existe fora do mapa, em todas as abas', async () => {
  const { readFileSync } = await import('node:fs');
  const ler = r => readFileSync(new URL(r, import.meta.url), 'utf8');
  const raiz = ler('../src/AuthenticatedSession.jsx');

  /* O contador vivia só dentro do mapa de combate. Quem estava na ficha,
     no mural ou nas regras não via relógio nenhum — e no celular o mapa
     nem é carregado, então lá nunca existiu. Um relógio que metade da
     mesa não vê não cria aperto: o aperto é coletivo ou não é aperto. */
  assert.match(raiz, /<AvisoDaCacada cacada=\{cacada\}/,
    'a faixa saiu da raiz da sessão e o relógio voltou a ser só do mapa');
  assert.match(raiz, /escondido=\{tab === 'mapabatalha'\}/,
    'a faixa ficaria em cima do contador grande, dois relógios com o mesmo número');
  assert.match(raiz, /useCacadaDaMesa\(sistemaDe\(campaign\)\?\.id === 'oneshot'\)/,
    'a assinatura passou a correr nas mesas que não têm caçada');
});

test('faixa e mapa leem a MESMA assinatura', async () => {
  const { readFileSync } = await import('node:fs');
  const mapa = readFileSync(
    new URL('../src/features/mapa-batalha/BattleMapPage.jsx', import.meta.url), 'utf8');
  /* Duas assinaturas do mesmo documento custariam duas leituras por
     mudança e poderiam divergir por um quadro: a faixa marcando um
     segundo e o contador do mapa outro, com a mesa olhando para os dois. */
  assert.match(mapa, /const cacadaDaMesa = useCacadaDaMesa\(ehNoite\)/);
  assert.ok(!/liveSnapshot\(docIn\('config', 'cacada'\)/.test(mapa),
    'o mapa voltou a assinar a caçada por conta própria');
});

test('a faixa não desenha nem conta quando não há caçada', async () => {
  const { readFileSync } = await import('node:fs');
  const aviso = readFileSync(
    new URL('../src/features/oneshot/AvisoDaCacada.jsx', import.meta.url), 'utf8');
  // Ela vive em TODAS as abas: um intervalo correndo à toa seria em todas.
  assert.match(aviso, /if \(!ativa \|\| escondido\) return undefined;/);
  assert.match(aviso, /if \(!estado\.ativa\) return null;/);
  // E não anuncia cada segundo: viraria metrônomo no leitor de tela.
  assert.match(aviso, /aria-live="off"/);
});

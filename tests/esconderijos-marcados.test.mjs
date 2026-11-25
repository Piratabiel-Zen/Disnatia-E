/**
 * OS ESCONDERIJOS MARCADOS
 *
 * O pulso de dois segundos é um pedido literal de Gabriel e está preso
 * aqui: é o que separa um recado de um painel de avisos piscando.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DURACAO_DO_PULSO, marcaNova, aindaPulsando, marcasDoMapa, marcaEm,
} from '../src/features/oneshot/esconderijosMarcados.mjs';

test('o pulso dura dois segundos, nem mais', () => {
  assert.equal(DURACAO_DO_PULSO, 2000);
  const m = marcaNova({ x: 10, y: 20, mapa: 'sotao', agora: 1000 });
  assert.equal(aindaPulsando(m, 1000), true, 'no instante em que é posta');
  assert.equal(aindaPulsando(m, 2999), true, 'um milissegundo antes do fim');
  assert.equal(aindaPulsando(m, 3000), false, 'no limite, já parou');
  assert.equal(aindaPulsando(m, 9999), false);
});

test('relógio atrasado não faz a marca pulsar para sempre', () => {
  // O horário vem de outra máquina: se o relógio de quem vê estiver atrás,
  // `agora - em` fica negativo e um `< 2000` sozinho diria "pulsando".
  const m = marcaNova({ x: 1, y: 1, mapa: 'porao', agora: 10000 });
  assert.equal(aindaPulsando(m, 5000), false);
});

test('a marca guarda o lugar em porcentagem, dentro do mapa', () => {
  const m = marcaNova({ x: -40, y: 180, mapa: 'patio' });
  assert.equal(m.x, 0);
  assert.equal(m.y, 100);
});

test('marca sem mapa não existe — ela apareceria em todos', () => {
  for (const vazio of ['', '  ', null, undefined]) {
    assert.equal(marcaNova({ x: 1, y: 1, mapa: vazio }), null);
  }
});

test('cada mapa mostra só as suas', () => {
  const marcas = [
    { x: 10, y: 10, mapa: 'sotao' },
    { x: 50, y: 50, mapa: 'porao' },
    { x: 80, y: 80, mapa: 'sotao' },
  ];
  assert.equal(marcasDoMapa(marcas, 'sotao').length, 2);
  assert.equal(marcasDoMapa(marcas, 'porao').length, 1);
  assert.deepEqual(marcasDoMapa(marcas, ''), []);
});

test('dois toques no mesmo lugar não viram duas estrelas', () => {
  const marcas = [
    { x: 30, y: 30, mapa: 'sotao' },
    { x: 30.4, y: 30.6, mapa: 'sotao' },  // dedo trêmulo
    { x: 36, y: 30, mapa: 'sotao' },      // outro lugar de verdade
  ];
  assert.equal(marcasDoMapa(marcas, 'sotao').length, 2);
});

test('marca quebrada não derruba o mapa', () => {
  const marcas = [null, { mapa: 'sotao' }, { x: 'abc', y: 1, mapa: 'sotao' }, undefined];
  assert.deepEqual(marcasDoMapa(marcas, 'sotao'), []);
  assert.deepEqual(marcasDoMapa(null, 'sotao'), []);
});

test('o Mestre acerta a marca com o dedo, não com a ponta do pixel', () => {
  const marcas = [{ x: 50, y: 50, mapa: 'sotao' }];
  // Perto o bastante: tirou.
  assert.ok(marcaEm(marcas, { x: 51, y: 51 }, 'sotao'));
  // Longe: não tirou nada por engano.
  assert.equal(marcaEm(marcas, { x: 70, y: 70 }, 'sotao'), null);
  // E não pega marca de outro mapa.
  assert.equal(marcaEm(marcas, { x: 50, y: 50 }, 'porao'), null);
});

test('a mesa VÊ as estrelas — não é material só do Mestre', async () => {
  const { readFileSync } = await import('node:fs');
  const mapa = readFileSync(
    new URL('../src/features/mapa-batalha/BattleMapPage.jsx', import.meta.url), 'utf8');

  /* Ao contrário do painel de quem está no armário, que é de condução, a
     estrela é um recado PARA a mesa. Um recado que só quem escreveu
     enxerga não é recado — então a assinatura não pode ser gateada por
     masterMode, só por ser noite. */
  const efeito = mapa.slice(mapa.indexOf("onSnapshot(col('marcas_esconderijo')") - 400,
    mapa.indexOf("onSnapshot(col('marcas_esconderijo')") + 320);
  assert.ok(!/!masterMode/.test(efeito), 'a mesa parou de ver as estrelas');
  assert.match(efeito, /\[ehNoite\]/);

  // Mas quem PÕE é só o Mestre.
  assert.match(mapa, /if \(!marcando \|\| !masterMode\) return false/);
});

test('o mesmo toque põe e tira', () => {
  // Um botão de apagar separado obrigaria o Mestre a trocar de modo no
  // meio da cena só para corrigir um toque errado.
  const marcas = [{ id: 'a', x: 40, y: 40, mapa: 'sotao' }];
  assert.equal(marcaEm(marcas, { x: 40.5, y: 40.5 }, 'sotao').id, 'a');
  assert.equal(marcaEm(marcas, { x: 12, y: 80 }, 'sotao'), null);
});

/**
 * AS DOZE BLASFÊMIAS, COM OS PODERES
 *
 * Esta tela é a referência que a mesa vai consultar com o dado na mão, então
 * o que os testes protegem é integridade: as doze, cinco poderes em cada uma,
 * passiva em cada uma, cada poder com a linha de traços (tipo, alcance,
 * duração) — porque é por ela que se decide se o poder serve para a cena.
 *
 * Também protegem o acordo entre os dois lugares onde as doze aparecem: a
 * lista curta em core/sistemas, que alimenta o select da ficha, e a lista
 * completa aqui. Se uma mudar de nome e a outra não, o select da ficha passa
 * a oferecer uma blasfêmia que o verbete não conhece.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  BLASFEMIAS_COMPLETAS, BLASFEMIAS_RESUMIDAS,
  habilidadesDaBlasfemia, acharBlasfemia,
} from '../src/features/cain/blasfemias.mjs';
import { BLASFEMIAS } from '../src/core/sistemas/cain/index.mjs';

test('são doze, com id e nome únicos', () => {
  assert.equal(BLASFEMIAS_COMPLETAS.length, 12);
  assert.equal(new Set(BLASFEMIAS_COMPLETAS.map(b => b.id)).size, 12);
  assert.equal(new Set(BLASFEMIAS_COMPLETAS.map(b => b.nome)).size, 12);
});

test('a lista da ficha e a lista completa falam dos mesmos nomes, na mesma ordem', () => {
  assert.deepEqual(BLASFEMIAS_COMPLETAS.map(b => b.nome), [...BLASFEMIAS]);
});

test('cada blasfêmia tem lema, resumo, sigilo e passiva', () => {
  for (const b of BLASFEMIAS_COMPLETAS) {
    assert.ok(b.lema?.length > 20, `${b.nome}: falta lema`);
    assert.ok(b.resumo?.length > 20, `${b.nome}: falta resumo`);
    assert.equal(b.sigilo, b.id, `${b.nome}: o sigilo é nomeado pelo id`);
    assert.ok(b.passiva?.nome, `${b.nome}: falta o nome da passiva`);
    assert.ok(b.passiva?.resumo?.length > 60, `${b.nome}: a passiva precisa do que ela faz`);
  }
});

test('cinco poderes em cada uma, cada um com traços e resumo', () => {
  for (const b of BLASFEMIAS_COMPLETAS) {
    assert.equal(b.poderes.length, 5, `${b.nome}: o livro dá cinco poderes`);
    assert.equal(new Set(b.poderes.map(p => p.nome)).size, 5, `${b.nome}: poder repetido`);
    for (const p of b.poderes) {
      assert.ok(p.nome?.length > 2, `${b.nome}: poder sem nome`);
      assert.ok(p.tracos?.length > 4, `${b.nome}/${p.nome}: falta a linha de traços`);
      assert.ok(p.resumo?.length > 60, `${b.nome}/${p.nome}: resumo curto demais para usar na mesa`);
      // Resumo, não transcrição. Passando disso, virou cópia do livro.
      assert.ok(p.resumo.length < 900, `${b.nome}/${p.nome}: resumo longo demais`);
    }
  }
});

test('a passiva conta como habilidade: seis por blasfêmia', () => {
  for (const b of BLASFEMIAS_COMPLETAS) {
    assert.equal(habilidadesDaBlasfemia(b), 6, b.nome);
  }
  assert.equal(habilidadesDaBlasfemia(null), 0);
});

test('achar pelo nome não exige acento nem caixa certa', () => {
  assert.equal(acharBlasfemia('ardencia')?.id, 'ardencia');
  assert.equal(acharBlasfemia('Ardência')?.id, 'ardencia');
  assert.equal(acharBlasfemia('ASSOMBRACAO')?.id, 'assombracao');
  assert.equal(acharBlasfemia('vinculo')?.nome, 'Vínculo');
  assert.equal(acharBlasfemia('Rajada'), null);
  assert.equal(acharBlasfemia(''), null);
});

test('a lista resumida serve ao cartão fechado sem arrastar os poderes', () => {
  assert.equal(BLASFEMIAS_RESUMIDAS.length, 12);
  for (const b of BLASFEMIAS_RESUMIDAS) {
    assert.deepEqual(Object.keys(b), ['nome', 'resumo']);
  }
});

/* Os desenhos ficam num .jsx, que este runner não importa. O que dá para
   garantir daqui é que não existe blasfêmia sem marca — o caso em que o
   painel abre com um buraco no lugar do sigilo. */
test('todo sigilo tem desenho em SigiloBlasfemia', () => {
  const fonte = readFileSync(new URL('../src/features/cain/SigiloBlasfemia.jsx', import.meta.url), 'utf8');
  for (const b of BLASFEMIAS_COMPLETAS) {
    assert.match(fonte, new RegExp(`^\\s{2}${b.sigilo}:`, 'm'), `falta o sigilo de ${b.nome}`);
  }
});

/* A tela fechada é catálogo e a aberta é verbete. Se a página voltar a
   depender da grade antiga de referência, perdeu-se a abertura. */
test('a tela das blasfêmias usa a grade própria, não a grade de referência', () => {
  const fonte = readFileSync(new URL('../src/features/cain/BlasfemiasPage.jsx', import.meta.url), 'utf8');
  assert.match(fonte, /blasfemias\.css/);
  assert.match(fonte, /BLASFEMIAS_COMPLETAS/);
  assert.match(fonte, /className="blasf-grade"/);
  assert.match(fonte, /className="blasf-painel"/);
  assert.ok(!/BLASFEMIAS_DETALHADAS/.test(fonte), 'a tela não usa mais a lista só de temas');
});

/* O "nome a confirmar" existe porque os títulos dessa página do PDF são
   desenho. Não deve virar hábito: se aparecer em muitos poderes, alguém
   parou de conferir. */
test('os nomes a confirmar são poucos e todos de Fluxo', () => {
  const incertos = BLASFEMIAS_COMPLETAS.flatMap(
    b => b.poderes.filter(p => p.nomeIncerto).map(p => `${b.nome}/${p.nome}`),
  );
  assert.ok(incertos.length <= 4, `nomes incertos demais: ${incertos.join(', ')}`);
  assert.ok(incertos.every(n => n.startsWith('Fluxo/')), incertos.join(', '));
});

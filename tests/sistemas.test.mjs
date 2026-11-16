/* A CAMADA DE SISTEMA
   O site deixou de ser "a Dinastia E com outras mesas penduradas". Cada
   campanha escolhe um sistema, e o sistema diz como se rola, como é a ficha e
   como as coisas se chamam. Acrescentar D&D ou Tormenta depois deve ser
   escrever um arquivo ao lado — nunca mexer nas telas. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SISTEMAS, SISTEMA_PADRAO, listaDeSistemas, sistemaDe, sistemaTemAba, termo } from '../src/core/sistemas/index.mjs';
import cain, * as cainModulo from '../src/core/sistemas/cain/index.mjs';

test('campanha sem sistema declarado continua na Dinastia E', () => {
  // As mesas que já existem não têm o campo. Elas não podem mudar sozinhas.
  assert.equal(sistemaDe({}).id, SISTEMA_PADRAO);
  assert.equal(sistemaDe(null).id, SISTEMA_PADRAO);
  assert.equal(sistemaDe({ sistema: 'inexistente' }).id, SISTEMA_PADRAO);
  assert.equal(sistemaDe({ sistema: 'cain' }).id, 'cain');
});

test('cada sistema declara o mínimo que as telas precisam', () => {
  for (const sistema of listaDeSistemas()) {
    for (const campo of ['id', 'nome', 'tagline', 'termos', 'dados', 'condicoes', 'abas']) {
      assert.ok(sistema[campo], `${sistema.id} não declara "${campo}"`);
    }
    assert.ok(sistema.dados.notacao, `${sistema.id} não diz com que dado se joga`);
    assert.ok(Array.isArray(sistema.condicoes) && sistema.condicoes.length > 0);
    // Toda condição tem cor: a mesa reconhece o estado pela cor antes de ler.
    for (const c of sistema.condicoes) assert.match(c.cor, /^#[0-9A-F]{6}$/i, `${sistema.id}/${c.id} sem cor`);
  }
});

test('o vocabulário é do sistema: Admin não é Mestre', () => {
  const veneza = { sistema: 'cain' };
  assert.equal(termo(veneza, 'mestre'), 'Admin');
  assert.equal(termo(veneza, 'personagem'), 'exorcista');
  assert.equal(termo(veneza, 'sessao'), 'caçada');
  assert.equal(termo(veneza, 'inimigos'), 'Pecados');

  assert.equal(termo({}, 'mestre'), 'Mestre');
  assert.equal(termo({}, 'personagem'), 'personagem');
  // Termo que nenhum sistema nomeia cai no padrão pedido, sem quebrar a tela.
  assert.equal(termo(veneza, 'coisa-que-nao-existe', 'coisa'), 'coisa');
});

test('as abas vêm do sistema, e cada um traz as suas', () => {
  assert.equal(sistemaTemAba({ sistema: 'cain' }, 'investigacao'), true);
  assert.equal(sistemaTemAba({ sistema: 'cain' }, 'pecados'), true);
  assert.equal(sistemaTemAba({ sistema: 'cain' }, 'classes'), false, 'CAIN não tem linhagens');
  assert.equal(sistemaTemAba({}, 'classes'), true);
  assert.equal(sistemaTemAba({}, 'investigacao'), false, 'a Dinastia E não tem mural');
});

test('CAIN: as dez perícias do livro, mais a Psique à parte', () => {
  assert.equal(cain.pericias.length, 10);
  assert.deepEqual(cain.pericias.map(p => p.nome), [
    'Força', 'Atletismo', 'Coordenação', 'Furtividade', 'Interface',
    'Investigação', 'Observação', 'Autoridade', 'Negociação', 'Conexão',
  ]);
  // Psique não entra na lista: sobe sozinha e só rola nos poderes.
  assert.ok(!cain.pericias.some(p => p.id === 'psique'));
  assert.equal(cain.periciaEspecial.id, 'psique');
  for (const p of cain.pericias) assert.ok(p.resumo, `${p.nome} sem resumo para o jogador`);
});

test('CAIN: as seis categorias de Pecado do livro, em ordem', () => {
  const { CATEGORIAS_DE_PECADO, BLASFEMIAS } = cainModulo;
  assert.deepEqual(CATEGORIAS_DE_PECADO.map(c => `${c.numeral}. ${c.nome}`), [
    'I. Ogro', 'II. Ídolo', 'III. Cão', 'IV. Centopeia', 'V. Sapo', 'VI. Lorde',
  ]);
  assert.equal(BLASFEMIAS.length, 12, 'são as Doze Blasfêmias');
});

test('CAIN: a ficha tem lugar para segredos de um jogador só', () => {
  const blocos = cain.blocosDaFicha.map(b => b.id);
  assert.ok(blocos.includes('segredos'), 'a mesa pediu segredos na ficha');
  for (const bloco of cain.blocosDaFicha) {
    assert.ok(bloco.nome && bloco.descricao, `bloco ${bloco.id} incompleto`);
  }
});

test('o sistema expõe como rolar, para a tela não reimplementar a regra', () => {
  assert.equal(typeof sistemaDe({ sistema: 'cain' }).dados.rolar, 'function');
  const r = sistemaDe({ sistema: 'cain' }).dados.rolar({ pericia: 3, sorteio: () => 0.99 });
  assert.equal(r.sucessos, 3);
});

test('a navegação vem do sistema: CAIN tem Mural, Dinastia E tem Bestiário', async () => {
  const { navegacaoDoSistema } = await import('../src/core/sistemas/index.mjs');
  const padrao = [{ id: 'world', label: 'Mundo', items: [{ id: 'bestiario', label: 'Bestiário' }] }];

  // Quem não declara navegação fica com a padrão, intacta.
  assert.deepEqual(navegacaoDoSistema({}, padrao), padrao);

  const veneza = navegacaoDoSistema({ sistema: 'cain' }, padrao);
  const abas = veneza.flatMap(g => g.items.map(i => i.id));
  for (const esperada of ['investigacao', 'documentos', 'pecados', 'fichas', 'livro', 'cronicas']) {
    assert.ok(abas.includes(esperada), `a aba "${esperada}" sumiu da navegação do CAIN`);
  }
  assert.ok(!abas.includes('bestiario'), 'Bestiário é da Dinastia E');
  assert.ok(!abas.includes('classes'), 'CAIN não tem linhagens');
  assert.ok(veneza.some(g => g.masterOnly), 'o painel do Admin precisa ser só do Admin');

  // E a cópia é profunda: a tela reordena itens sem corromper o sistema.
  veneza[0].items.push({ id: 'intruso' });
  assert.ok(!navegacaoDoSistema({ sistema: 'cain' }, padrao)[0].items.some(i => i.id === 'intruso'));
});

test('o vocabulário do CAIN aparece nos rótulos da navegação', () => {
  const veneza = { sistema: 'cain' };
  // "Caçada" e "Exorcista" são do sistema, não do site.
  assert.equal(termo(veneza, 'sessao'), 'caçada');
  assert.equal(termo(veneza, 'personagem'), 'exorcista');
});

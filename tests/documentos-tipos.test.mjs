/**
 * CADA DOCUMENTO PARECE O QUE ELE É — E VAI PARA O MURAL SEM VAZAR
 *
 * Os seis tipos eram o mesmo retângulo com outro ícone no canto. Metade do
 * que uma prova diz, ela diz pela forma: um recorte de jornal convence de um
 * jeito, uma etiqueta de recolhimento de outro.
 *
 * E pendurar no mural não pode virar atalho de revelação: o cartão nasce com
 * a MESMA plateia do documento, senão bastaria alfinetar para mostrar à mesa
 * o que estava guardado.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartaoDeDocumento, jaNoMural, resumoParaCartao } from '../src/features/documentos/paraOMural.mjs';
import { CAMPOS_POR_TIPO } from '../src/features/documentos/camposDoDocumento.mjs';
import { TIPOS_DE_DOCUMENTO } from '../src/features/documentos/documentos.mjs';

test('todo tipo de documento tem campos próprios', () => {
  for (const tipo of TIPOS_DE_DOCUMENTO) {
    const campos = CAMPOS_POR_TIPO[tipo.id];
    assert.ok(Array.isArray(campos) && campos.length, `${tipo.id} ficou sem campos`);
    for (const c of campos) {
      assert.ok(c.id && c.rotulo, `${tipo.id}: campo sem id ou rótulo`);
    }
  }
});

test('o cartão do mural herda exatamente a plateia do documento', () => {
  const guardado = { id: 'd1', titulo: 'X', corpo: 'y', liberadoParaTodos: false, liberadoPara: ['u1'] };
  const cartao = cartaoDeDocumento(guardado);
  assert.equal(cartao.liberadoParaTodos, false);
  assert.deepEqual(cartao.liberadoPara, ['u1']);

  const aberto = { id: 'd2', titulo: 'Y', liberadoParaTodos: true, liberadoPara: [] };
  assert.equal(cartaoDeDocumento(aberto).liberadoParaTodos, true);

  // Documento sem campo de liberação é documento guardado: nunca aberto.
  assert.equal(cartaoDeDocumento({ id: 'd3' }).liberadoParaTodos, false);
});

test('a lista de liberados é copiada, não compartilhada', () => {
  // Compartilhar o array faria editar a plateia do cartão mexer na do
  // documento — e o Mestre não veria onde a revelação aconteceu.
  const doc = { id: 'd1', liberadoPara: ['u1'] };
  const cartao = cartaoDeDocumento(doc);
  cartao.liberadoPara.push('u2');
  assert.deepEqual(doc.liberadoPara, ['u1']);
});

test('fotografia vira fotografia; o resto vira pista', () => {
  assert.equal(cartaoDeDocumento({ id: 'd', tipo: 'foto', imagem: 'data:,x' }).tipo, 'fotografia');
  // Foto sem imagem não tem o que mostrar na parede: vale como pista.
  assert.equal(cartaoDeDocumento({ id: 'd', tipo: 'foto' }).tipo, 'pista');
  for (const tipo of ['carta', 'jornal', 'relatorio', 'gravacao', 'objeto']) {
    assert.equal(cartaoDeDocumento({ id: 'd', tipo }).tipo, 'pista', tipo);
  }
});

test('o resumo corta em palavra inteira', () => {
  const longo = 'palavra '.repeat(60).trim();
  const resumo = resumoParaCartao(longo);
  assert.ok(resumo.length <= 221, resumo.length);
  assert.match(resumo, /…$/);
  assert.ok(!/ …$/.test(resumo), 'sobrou espaço antes das reticências');
  // Texto curto passa inteiro, sem reticências.
  assert.equal(resumoParaCartao('curto'), 'curto');
  assert.equal(resumoParaCartao(''), '');
});

test('o cartão aponta para o documento, e isso impede pendurar duas vezes', () => {
  const doc = { id: 'd1', titulo: 'X' };
  const cartao = cartaoDeDocumento(doc);
  assert.equal(cartao.origemDocumento, 'd1');
  assert.equal(jaNoMural(doc, [cartao]), true);
  assert.equal(jaNoMural({ id: 'd2' }, [cartao]), false);
  // Cartão pregado à mão não tem origem: não pode casar com documento algum.
  assert.equal(jaNoMural({ id: '' }, [{ id: 'c9', origemDocumento: '' }]), false);
  assert.equal(jaNoMural(doc, []), false);
});

test('o roxo de Cosmum não alcança mesa que não seja a Dinastia E', () => {
  const folha = readFileSync(new URL('../src/experience/sem-roxo-fora-da-dinastia.css', import.meta.url), 'utf8');
  // Toda regra aqui precisa estar fora da atmosfera cósmica: uma só que
  // escape repinta a Dinastia E, que está no ar e não pediu nada.
  const seletores = folha.match(/^html\[data-tema-mesa\][^{]*/gm) || [];
  assert.ok(seletores.length > 5, 'a folha de correção encolheu');
  for (const s of seletores) {
    assert.match(s, /:not\(\[data-tema-mesa="cosmico"\]\)/, `regra sem proteção: ${s.trim()}`);
  }
  // E nenhuma cor nova: tudo sai do que a mesa declarou.
  assert.ok(!/#[0-9a-fA-F]{6}(?![^(]*\))/.test(folha.replace(/var\([^)]*\)/g, '')),
    'entrou cor cravada na folha que existe para tirar cor cravada');
});

test('o mundo da mesa aparece no lugar de Cosmum', () => {
  const g3 = readFileSync(new URL('../src/experience/GameExperience3.jsx', import.meta.url), 'utf8');
  assert.ok(!/'Entre os véus de Cosmum'/.test(g3), 'o local padrão voltou a ser da Dinastia E');
  assert.match(g3, /activeCampaign\(\)\?\.world/);
  assert.ok(!/>DINASTIA E · SESSÃO ATUAL</.test(g3), 'a abertura voltou a ser da Dinastia E');
});

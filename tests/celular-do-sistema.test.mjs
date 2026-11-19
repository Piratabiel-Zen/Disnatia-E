/**
 * NO CELULAR, A MESA É A MESA — NÃO A DINASTIA E
 *
 * A barra de baixo do celular era uma lista escrita à mão e por isso ignorava
 * o sistema da campanha: numa mesa de CAIN ela oferecia "Classes", que abre os
 * Assassinos do Fogo Azul, e "Crônicas", que é vocabulário da Dinastia E. O
 * menu lateral já saía do sistema, então a mesa parecia certa até alguém pegar
 * o celular — duas navegações para o mesmo site, discordando.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { navegacaoDoSistema, termo } from '../src/core/sistemas/index.mjs';

const mesaCain = { id: 'estrela', sistema: 'cain', world: 'Terra Dourada' };

const fonte = readFileSync(new URL('../src/experience/ExperienceKit.jsx', import.meta.url), 'utf8');
const trechoDaBarra = fonte.slice(fonte.indexOf('const itensDoSistema'), fonte.indexOf('const mobileGroups'));

test('a barra de baixo é montada a partir das abas do sistema', () => {
  assert.match(fonte, /const itensDoSistema=desktopGroups\.flatMap/,
    'a barra do celular voltou a ser uma lista escrita à mão');
  assert.match(trechoDaBarra, /itensDoSistema\.slice\(0,\s*2\)/);
});

test('nenhuma aba da Dinastia E está cravada na barra do celular', () => {
  for (const proibida of ['classes', 'livro', 'regras', 'bestiario']) {
    assert.ok(!new RegExp(`id:'${proibida}'`).test(trechoDaBarra),
      `"${proibida}" é conteúdo da Dinastia E e voltou para a barra de toda mesa`);
  }
});

test('o mapa de combate nunca entra na barra do celular', () => {
  // Regra antiga da mesa: o mapa é grande demais para controlar no telefone.
  assert.match(trechoDaBarra, /'mapabatalha'/, 'o mapa de combate deixou de ser excluído');
  assert.ok(!/\{id:'mapabatalha'/.test(trechoDaBarra));
});

test('as abas que o CAIN declara são as que podem chegar à barra', () => {
  const abas = navegacaoDoSistema(mesaCain, []).flatMap(g => g.items.map(i => i.id));
  assert.ok(abas.includes('investigacao'), 'o Mural saiu da navegação do CAIN');
  assert.ok(!abas.includes('classes'), 'as Classes voltaram para a navegação do CAIN');
  assert.ok(!abas.includes('livro'), 'o Livro da Mandíbula voltou para a navegação do CAIN');
});

test('o menu do celular leva o nome da mesa, não o da Dinastia E', () => {
  assert.match(fonte, /termo\(campaign,'navegacao','Grimório de Navegação'\)/,
    'o título do menu do celular voltou a ser fixo');
  assert.equal(termo(mesaCain, 'navegacao', 'Grimório de Navegação'), 'Índice da repartição');
  // E quem não declara nada continua com o nome de sempre.
  assert.equal(termo({ id: 'dinastia-e' }, 'navegacao', 'Grimório de Navegação'), 'Grimório de Navegação');
});

test('as telas densas do CAIN têm medida própria de celular', () => {
  // A ficha é a página mais densa do site e descia no telefone com as
  // medidas da mesa de trabalho: nove painéis, cada um gastando moldura.
  for (const folha of ['../src/features/cain/ficha-cain.css', '../src/features/investigacao/mural.css']) {
    const css = readFileSync(new URL(folha, import.meta.url), 'utf8');
    assert.match(css, /@media\(max-width:720px\)/, `${folha} ficou sem recorte de celular`);
    // Campo abaixo de 16px faz o iOS dar zoom ao focar e desalinhar a página.
    assert.match(css, /font-size:16px/, `${folha}: campo pequeno demais provoca zoom no iOS`);
  }
});

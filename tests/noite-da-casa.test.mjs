/**
 * ONE SHOT TERROR — A NOITE DA CASA
 *
 * Este arquivo guarda os dez ajustes pedidos depois da primeira mesa de teste.
 * Quase todos existem porque alguma coisa já falhou calada antes:
 *
 *  - A névoa ficou três rodadas sem aparecer porque era desenhada FORA da
 *    `.adventure-shell`, que tem fundo opaco e `position:relative` no inline
 *    style. Qualquer camada fixa fora dela é pintada por cima. Por isso o
 *    teste não checa só "existe névoa": checa que ela mora no cenário.
 *  - O mural fica por cima do quadro inteiro para desenhar o alfabeto da
 *    ouija. Sem `pointer-events:none` isso engole o clique e nenhum cartão
 *    se arrasta mais — e o sintoma não aparece em nenhum build.
 *  - O mapa NUNCA pode chegar ao celular. É regra da mesa, não gosto: o
 *    jogador não controla um mapa de combate no telefone. O sistema novo
 *    declarou `mapabatalha`, então a regra tem que valer para ele também.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const fonte = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

/* O texto que EXPLICA uma armadilha cita a armadilha. Tira comentário antes
   de procurar, senão o aviso vira o erro. */
import { semComentarios } from './ajuda/semComentarios.mjs';

import { cenarioDaMesa, temaDaMesa } from '../src/core/atmosferaDaMesa.mjs';
import { navegacaoDoSistema, termo, sistemaTemAba } from '../src/core/sistemas/index.mjs';
import {
  PAVOR_MAXIMO, SANIDADE_MAXIMA, fichaNova,
} from '../src/features/oneshot/fichaOneShot.mjs';
import { cartaoDeAparicao, jaNoMural } from '../src/features/oneshot/aparicoes.mjs';

const mesa = { id: 'noite', sistema: 'oneshot', name: 'A casa da rua 7' };

/* ── O casarão de fundo ───────────────────────────────────────────────── */

test('a mesa de one shot acha o casarão pelo sistema, sem depender do nome', () => {
  const cenario = cenarioDaMesa(mesa);
  assert.ok(cenario, 'mesa de oneshot ficou sem cenário');
  assert.match(cenario.imagem, /casa-do-horror/);
  assert.equal(cenario.nevoa, true, 'o casarão tem que pedir névoa');
  assert.ok(cenario.escurecer > 0.6, 'a imagem é noite: o texto precisa de véu escuro');
});

test('uma mesa de oneshot com qualquer nome continua achando o cenário', () => {
  // O bug que isto previne: o mapa de cenários era indexado só por NOME de
  // mesa, então toda mesa nova de one shot nascia sem fundo nenhum.
  for (const name of ['A casa da rua 7', 'Hospício', '', undefined]) {
    assert.ok(cenarioDaMesa({ ...mesa, name }), `mesa "${name}" ficou sem cenário`);
  }
});

test('as duas versões da imagem do casarão existem no public', () => {
  for (const arquivo of ['public/media/mesas/casa-do-horror.webp',
    'public/media/mesas/casa-do-horror.jpg']) {
    assert.ok(existsSync(new URL(`../${arquivo}`, import.meta.url)), `falta ${arquivo}`);
  }
});

/* ── A névoa ──────────────────────────────────────────────────────────── */

test('a névoa é desenhada DENTRO do cenário, nunca numa camada solta', () => {
  const cenario = semComentarios(fonte('src/experience/CenarioDaMesa.jsx'));
  assert.match(cenario, /cenario\.nevoa\s*&&/, 'a névoa não está presa ao cenário');
  assert.match(cenario, /cenario-mesa-nevoa/);
  // A Mortalha era a camada solta que nunca apareceu. Não pode voltar.
  assert.ok(!existsSync(new URL('../src/experience/Mortalha.jsx', import.meta.url)),
    'Mortalha.jsx voltou: era a camada fora da shell que ninguém via');
});

test('sair do modo imersivo apaga a névoa', () => {
  // Pedido literal: "caso o usuário tire da parte imersiva a névoa some".
  // Quem tira é o seletor de qualidade, que já governa chuva e brasa.
  const css = fonte('src/experience/cenario-da-mesa.css');
  assert.match(css, /html\[data-quality="light"\]\s*\.cenario-mesa-nevoa\s*\{\s*display:\s*none/);
});

test('a névoa tem três camadas, para ser espessa sem ser opaca', () => {
  const css = fonte('src/experience/cenario-da-mesa.css');
  for (const camada of ['cenario-nevoa-fundo', 'cenario-nevoa-meio', 'cenario-nevoa-frente']) {
    assert.match(css, new RegExp(`\\.${camada}\\b`), `falta a camada ${camada}`);
  }
});

/* ── O mural de ouija ─────────────────────────────────────────────────── */

test('o mural da mesa de one shot é repintado pelo tema, não por classe nova', () => {
  // Repintar por variável do tema é o que deixa o mural continuar sendo o
  // MESMO mural das outras mesas — o pedido era reaproveitá-lo, não clonar.
  const css = fonte('src/features/oneshot/mural-ouija.css');
  assert.match(css, /html\[data-tema-mesa="mortalha"\]\s*\.mural\b/);
  assert.match(css, /--quadro:\s*#0D0C0B/i, 'o quadro precisa ir para o preto');
  assert.equal(temaDaMesa(mesa), 'mortalha', 'o tema da mesa tem que casar com o seletor');
});

test('o alfabeto da ouija não rouba o clique dos cartões', () => {
  const css = semComentarios(fonte('src/features/oneshot/mural-ouija.css'));
  const arcos = css.match(/\.mural-quadro::(before|after)\s*\{[^}]*\}/g) || [];
  assert.ok(arcos.length >= 1, 'o alfabeto da ouija não está desenhado');
  for (const arco of arcos) {
    assert.match(arco, /pointer-events:\s*none/,
      'camada sobre o quadro sem pointer-events:none — os cartões param de arrastar');
  }
});

test('o mural repintado é carregado pela página de investigação', () => {
  assert.match(fonte('src/features/investigacao/InvestigacaoPage.jsx'), /mural-ouija\.css/);
});

test('a mancha de umidade não apaga o papel do cartão', () => {
  /* A armadilha, que já aconteceu: o cartão pinta o papel com `background:`
     (atalho), e o atalho escreve `background-image` junto. Uma regra de tema
     que declare só `background-image` SUBSTITUI o papel em vez de manchá-lo —
     o cartão fica transparente, a madeira preta aparece por baixo, e a tinta
     escura vira preto no preto. Nem build nem lint veem isso.

     Então: toda regra do tema que mexa em `background-image` de um elemento
     cujo papel vem do atalho precisa redeclarar o papel junto. */
  const base = semComentarios(fonte('src/features/investigacao/mural.css'));
  const regraBase = base.match(/\.mural-cartao\{[^}]*\}/)[0];
  assert.match(regraBase, /background:\s*linear-gradient\([^)]*var\(--papel\)/,
    'o papel do cartão deixou de vir do atalho: reveja a premissa deste teste');

  const tema = semComentarios(fonte('src/features/oneshot/mural-ouija.css'));
  const regraTema = tema.match(/\.mural-cartao\{[^}]*\}/)[0];
  assert.match(regraTema, /background-image:/, 'a mancha de umidade sumiu');
  assert.match(regraTema, /var\(--papel\)/,
    'a mancha apagou o papel: o cartão fica preto no preto e o título some');
});

test('o mural cede altura em tela baixa em vez de transbordar', () => {
  // 693px fixos cobriam o que vinha depois em notebook, porque a aba ainda
  // tem cabeçalho em cima e sobra menos que a janela inteira.
  const css = semComentarios(fonte('src/features/investigacao/mural.css'));
  const regra = css.match(/\.mural\{[\s\S]*?\}/)[0];
  assert.match(regra, /min-height:\s*min\(693px,\s*calc\(100vh\s*-\s*\d+px\)\)/,
    'o mural voltou a exigir altura fixa');
});

/* ── Aparições no mural ───────────────────────────────────────────────── */

test('uma aparição pregada no mural herda exatamente a mesma plateia', () => {
  // Se o cartão abrir para mais gente que a aparição, o mural vazou a cena
  // para quem o mestre não convidou — e aí não tem susto nenhum.
  const aparicao = {
    id: 'a1', titulo: 'A mulher no corredor', imagem: 'data:image/webp;base64,xx',
    liberadoPara: ['uid-dominic'], liberadoParaTodos: false,
  };
  const cartao = cartaoDeAparicao(aparicao, { id: 'c1', x: 0.3, y: 0.5 });
  assert.deepEqual(cartao.liberadoPara, ['uid-dominic']);
  assert.equal(cartao.liberadoParaTodos, false);

  const daMesa = cartaoDeAparicao({ ...aparicao, liberadoParaTodos: true }, { id: 'c2' });
  assert.equal(daMesa.liberadoParaTodos, true);
});

test('o mural não aceita a mesma aparição duas vezes', () => {
  const aparicao = { id: 'a1', titulo: 'A mulher no corredor' };
  const cartoes = [cartaoDeAparicao(aparicao, { id: 'c1' })];
  assert.equal(jaNoMural(aparicao, cartoes), true);
  assert.equal(jaNoMural({ id: 'a2' }, cartoes), false);
});

test('a página de aparições tem o botão de pregar no mural', () => {
  const pagina = semComentarios(fonte('src/features/oneshot/AparicoesPage.jsx'));
  assert.match(pagina, /pregarNoMural/);
  assert.match(pagina, />Pregar</);
});

/* ── Pavor e retrato ──────────────────────────────────────────────────── */

test('o pavor enche em três e é roxo', () => {
  assert.equal(PAVOR_MAXIMO, 3, 'o pavor foi reduzido para 3 a pedido da mesa');
  assert.equal(SANIDADE_MAXIMA, 6, 'a sanidade não mudou');
  const sistema = semComentarios(fonte('src/core/sistemas/oneshot/index.mjs'));
  assert.match(sistema, /#8B5FAF/i, 'o pavor precisa da cor roxa declarada no sistema');
});

test('a ficha nasce com lugar para o 3x4', () => {
  const ficha = fichaNova();
  assert.equal(ficha.retrato, '', 'sem o campo, o retrato não salva');
});

test('o retrato é comprimido em proporção 3x4 antes de entrar no documento', () => {
  // Documento do Firestore estoura em 400 KiB. Imagem crua de celular passa
  // disso sozinha e derruba a ficha inteira na hora de salvar.
  const ficha = semComentarios(fonte('src/features/oneshot/FichaOneShot.jsx'));
  assert.match(ficha, /comprimirParaDocumento/);
  const chamada = ficha.match(/comprimirParaDocumento\([^)]*\{[^}]*\}/)[0];
  assert.match(chamada, /largura:\s*900/);
  assert.match(chamada, /altura:\s*1200/, 'o retrato tem que sair 3x4');
  assert.match(chamada, /limite:\s*150\s*\*\s*1024/, 'sem limite a ficha estoura o documento');
  assert.match(fonte('src/features/oneshot/ficha-one-shot.css'), /aspect-ratio:\s*3\s*\/\s*4/);
});

/* ── Cenário do Horror ────────────────────────────────────────────────── */

test('o mapa da mesa se chama Cenário do Horror em toda parte', () => {
  assert.ok(sistemaTemAba(mesa, 'mapabatalha'), 'a aba do mapa não foi declarada');
  assert.equal(termo(mesa, 'mapabatalha', 'Mapa de Batalha'), 'Cenário do Horror');
  const itens = navegacaoDoSistema(mesa).flatMap(g => g.items);
  const mapa = itens.find(i => i.id === 'mapabatalha');
  assert.ok(mapa, 'o mapa não aparece na navegação da mesa');
  assert.equal(mapa.label, 'Cenário do Horror');
});

test('o título da aba vem do vocabulário da mesa, não da tabela fixa', () => {
  // Enquanto era tabela fixa, a aba abria "Cenário do Horror" no menu e
  // escrevia "Mapa de Batalha" no cabeçalho da mesma tela.
  const sessao = semComentarios(fonte('src/AuthenticatedSession.jsx'));
  assert.match(sessao, /termo\(campaign,\s*tab,\s*TAB_LABELS\[tab\]/);
});

test('o Cenário do Horror não chega ao celular', () => {
  // Regra da mesa, repetida pelo dono: o mapa é grande demais para telefone.
  // Vale para o sistema novo exatamente como vale para a Dinastia E.
  const kit = semComentarios(fonte('src/experience/ExperienceKit.jsx'));
  const barra = kit.match(/const itensDoSistema=[\s\S]*?;/)[0];
  assert.match(barra, /'mapabatalha'/, 'o mapa entrou na barra de baixo do celular');
  const grupos = kit.match(/const mobileGroups=[\s\S]*?;/)[0];
  assert.match(grupos, /i\.id!=='mapabatalha'/, 'o mapa entrou no menu do celular');
});

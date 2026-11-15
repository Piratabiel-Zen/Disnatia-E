/* PARIDADE DE ANIMAÇÕES ENTRE APARELHOS
   O jogador filmou a respiração do token e o brilho da habilidade no notebook
   e disse: é exatamente assim. No desktop não era, porque o modo Leve/Imersivo
   é guardado por aparelho e desligava justamente essas duas coisas.

   A regra que estes testes seguram: o modo de qualidade mexe em CENOGRAFIA
   (fundo cósmico, poeira do mapa, cenas de classe, aura do livro). Ele NÃO
   mexe em RESPOSTA DE INTERFACE — respiração do token, retorno da habilidade
   ao mouse, anúncio do golpe. Isso é igual no celular, no notebook e no
   desktop, em Chrome, Edge e Opera. Quem quer menos movimento diz isso ao
   sistema (prefers-reduced-motion) ou nas preferências (data-effects). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

/* Arquivos de resposta de interface e o que não pode voltar a ser cortado. */
const RESPOSTA_DE_INTERFACE = [
  ['src/features/mapa-batalha/tokens-vivos.css', ['.map-token-body']],
  ['src/features/sheets/habilidades-vivas.css', ['.ability-row', '.ability-use-button']],
  ['src/experience/realtime.css', ['.combat-action-backdrop', '.combat-action-wave']],
  ['src/experience/interaction-polish.css', ['.g3-use-ability', '.combat-ability']],
  ['src/experience/acquired-knowledge.css', ['.acquired-spell-rune']],
  ['src/experience/codex-cards.css', ['.codex-card']],
  ['src/experience/ability-type-badge.css', ['.ability-type-especial']],
];

for (const [arquivo, seletores] of RESPOSTA_DE_INTERFACE) {
  test(`${arquivo}: o modo de qualidade não desliga a resposta ao jogador`, () => {
    const css = ler(arquivo);
    const linhasComGate = css
      .split('\n')
      .filter(linha => /data-quality/.test(linha));
    for (const linha of linhasComGate) {
      for (const seletor of seletores) {
        assert.ok(
          !linha.includes(seletor),
          `${arquivo} volta a condicionar "${seletor}" ao modo de qualidade:\n  ${linha.trim()}`,
        );
      }
    }
  });
}

/* Pega a regra inteira — seletores E corpo — de cada bloco que depende do
   modo de qualidade. Olhar só a linha do seletor não diz o que a regra faz. */
const regrasPorQualidade = css => {
  const regras = [];
  for (const bruta of css.split('}')) {
    const corte = bruta.lastIndexOf('{');
    if (corte < 0) continue;
    const seletor = bruta.slice(0, corte);
    if (!/data-quality/.test(seletor)) continue;
    regras.push(`${seletor.trim()}{${bruta.slice(corte + 1).trim()}}`);
  }
  return regras;
};

test('golpes.css: o modo leve tira o desfoque do véu, não a animação', () => {
  const regras = regrasPorQualidade(ler('src/experience/golpes.css'));
  assert.ok(regras.length > 0, 'golpes.css parou de reduzir o custo do véu no modo leve');
  // Desfoque pode sair: é custo de composição, não informação.
  assert.ok(regras.some(r => /backdrop-filter/.test(r)), 'o modo leve deixou de tirar o desfoque do véu');
  // O anúncio do golpe, não.
  for (const regra of regras) {
    assert.ok(!/animation\s*:\s*none/.test(regra), `o modo leve voltou a matar a animação do golpe:\n  ${regra}`);
  }
});

test('o modo nasce Imersivo, no HTML e no JS, para os dois concordarem', () => {
  const html = ler('index.html');
  assert.match(html, /<html[^>]*data-quality="cinematic"/);

  const js = ler('src/adventure/usePerformance.js');
  // A leitura só desce para leve quando o aparelho pediu isso explicitamente.
  assert.match(js, /'light'\s*\?\s*'light'\s*:\s*'cinematic'/);
  assert.match(js, /catch\s*\{\s*return 'cinematic'/);
});

test('cenografia continua opcional: é lá que o modo leve deve agir', () => {
  // Se nada mais for condicionado ao modo, o próprio modo perde o sentido.
  const cenografia = [
    'src/adventure/adventure.css',
    'src/features/mapa-batalha/atmosfera.css',
    'src/features/classes/cenarios.css',
  ];
  for (const arquivo of cenografia) {
    assert.match(ler(arquivo), /data-quality="?light/, `${arquivo} deixou de reduzir cenografia no modo leve`);
  }
});

test('o modo seguro de gráficos é do Opera GX, não de todo Opera', () => {
  const html = ler('index.html');
  // Opera comum é Chromium igual a Chrome e Edge: não deve ser rebaixado.
  assert.ok(
    !/\/Opera\\\/\/i\.test\(ua\)/.test(html) && !/OPR\\\//.test(html),
    'a detecção voltou a pegar o Opera comum pelo OPR/ ou Opera/',
  );
  assert.match(html, /OPRGX/);
  // E continua havendo uma saída manual, que fica guardada — numa tela preta
  // ninguém consegue reaplicar um parâmetro na URL.
  assert.match(html, /dinastia_safe_graphics_v1/);
  assert.match(html, /localStorage\.setItem/);
});

test('quem pede menos movimento ao sistema continua sendo atendido', () => {
  for (const arquivo of ['src/features/mapa-batalha/tokens-vivos.css', 'src/features/sheets/habilidades-vivas.css']) {
    assert.match(ler(arquivo), /prefers-reduced-motion:\s*reduce/, `${arquivo} parou de respeitar prefers-reduced-motion`);
  }
});

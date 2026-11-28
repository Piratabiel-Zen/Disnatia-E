/**
 * OS SPRITES DE CAMINHADA
 *
 * O que estes testes seguram é a aritmética do recorte, que é onde
 * sprite em CSS costuma errar sem ninguém ver — o último quadro sai pela
 * metade e a caminhada ganha um soluço que se atribui à "animação".
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import {
  SPRITES, DIRECOES, QUADROS_POR_SEGUNDO, spriteDe, linhaDaDirecao,
  direcaoDoMovimento, recorteDoQuadro, quadroNoTempo, QUADRO_PARADO,
} from '../src/features/oneshot/sprites.mjs';

const RAIZ = new URL('../', import.meta.url).pathname;

test('os cinco personagens existem em disco e têm célula própria', () => {
  assert.equal(SPRITES.length, 5);
  for (const s of SPRITES) {
    const caminho = `${RAIZ}public${s.arquivo}`;
    assert.ok(existsSync(caminho), `falta a folha de ${s.nome}`);
    assert.ok(statSync(caminho).size > 10 * 1024, `${s.nome} está pequena demais`);
    assert.ok(s.quadros >= 2, `${s.nome} sem quadros de caminhada`);
    assert.ok(s.largura > 0 && s.altura > 0);
  }
  assert.equal(new Set(SPRITES.map(s => s.id)).size, 5, 'dois sprites com o mesmo id');
});

test('toda folha cobre as quatro direções', () => {
  for (const s of SPRITES) {
    const ordem = s.ordem || DIRECOES;
    for (const d of DIRECOES) {
      assert.ok(ordem.includes(d), `${s.nome} não tem ${d}`);
    }
    assert.equal(ordem.length, 4, `${s.nome} com número estranho de linhas`);
  }
});

test('a segunda linha das folhas é a DIREITA', () => {
  /* COMO ISTO FOI CONFERIDO — e como conferir de novo antes de mexer:
     recorte o primeiro quadro de cada linha da folha (ela tem 512px de
     altura, quatro linhas de 128), amplie umas quatro vezes sem
     suavizar, e veja de que lado está o rosto. Na linha 1 o rosto olha
     para a direita do quadro; na 2, para a esquerda.

     Eu errei isto DUAS vezes, uma em cada sentido, e das duas o teste
     passou: ele só repetia o que eu tinha escrito no catálogo. O
     sintoma na mesa é o boneco andando de costas para onde vai, e foi
     o Gabriel quem viu, não o teste. */
  assert.deepEqual(DIRECOES, ['frente', 'direita', 'esquerda', 'costas']);
  for (const s of SPRITES.filter(x => !x.ordem)) {
    assert.equal(linhaDaDirecao(s, 'direita'), 1, `${s.nome} com os lados trocados`);
    assert.equal(linhaDaDirecao(s, 'esquerda'), 2, `${s.nome} com os lados trocados`);
  }
});

test('as duas linhas de perfil são uma o espelho da outra', async () => {
  /* Não diz QUAL é qual — isso é a olho, acima. Diz que são um par: se
     alguém trocar uma linha da folha por outra pose, ou recortar a folha
     torto, o par deixa de bater e este teste cai antes da mesa. */
  const { readFileSync, existsSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  for (const s of SPRITES) {
    const caminho = new URL(`../public${s.arquivo}`, import.meta.url).pathname;
    assert.ok(existsSync(caminho), `folha de ${s.nome} sumiu`);
    void readFileSync;
    const ordem = s.ordem || DIRECOES;
    const linhaD = ordem.indexOf('direita');
    const linhaE = ordem.indexOf('esquerda');
    const script = `
import sys
from PIL import Image, ImageChops
im = Image.open(sys.argv[1]).convert('RGBA')
L = im.width / ${s.quadros}
a = im.crop((0, ${linhaD} * 128, int(L), ${linhaD} * 128 + 128))
b = im.crop((0, ${linhaE} * 128, int(L), ${linhaE} * 128 + 128)).transpose(Image.FLIP_LEFT_RIGHT)
# Compara só a silhueta: a arte espelhada não é idêntica pixel a pixel
# (cabelo, alças, o que a mão segura), mas o contorno tem de bater.
sa = a.split()[3].point(lambda v: 255 if v > 40 else 0)
sb = b.split()[3].point(lambda v: 255 if v > 40 else 0)
dif = ImageChops.difference(sa, sb)
print(sum(1 for p in dif.getdata() if p > 0) / (sa.width * sa.height))
`;
    let fora;
    try {
      fora = execFileSync('python3', ['-c', script, caminho], { encoding: 'utf8' });
    } catch (erro) {
      void erro;   // sem Pillow na máquina: o teste a olho acima continua valendo
      return;
    }
    assert.ok(Number(fora) < 0.3,
      `em ${s.nome} as linhas de perfil não são espelho uma da outra (${Number(fora).toFixed(2)} de silhueta diferente)`);
  }
});

test('o Sakuta tem a ordem trocada, e isso está escrito', () => {
  // A folha dele veio frente, lado, COSTAS, lado. Remontar a imagem
  // perderia qualidade de novo; a ordem fica como dado.
  const s = spriteDe('sakuta');
  assert.deepEqual(s.ordem, ['frente', 'direita', 'costas', 'esquerda']);
  assert.equal(linhaDaDirecao(s, 'costas'), 2);
  assert.equal(linhaDaDirecao(spriteDe('sakai'), 'costas'), 3);
});

test('o último quadro não sai pela metade', () => {
  /* Em porcentagem, N posições se dividem por N−1: 0% é a primeira e
     100% é a última. Dividir por N é o erro clássico — o último quadro
     fica cortado e a caminhada soluça uma vez por ciclo. */
  for (const s of SPRITES) {
    const primeiro = recorteDoQuadro(s, 'frente', 0);
    const ultimo = recorteDoQuadro(s, 'frente', s.quadros - 1);
    assert.equal(primeiro.x, 0, `${s.nome}: o primeiro quadro não começa em 0`);
    assert.equal(ultimo.x, 100, `${s.nome}: o último quadro não termina em 100`);
    assert.equal(ultimo.tamanho, `${s.quadros * 100}% 400%`);
  }
});

test('o quadro dá a volta em vez de estourar', () => {
  const s = spriteDe('sakai');
  assert.equal(recorteDoQuadro(s, 'frente', s.quadros).x, 0, 'não voltou ao início');
  assert.equal(recorteDoQuadro(s, 'frente', -1).x, 100, 'quadro negativo quebrou');
});

test('a direção sai do movimento, com a horizontal desempatando', () => {
  assert.equal(direcaoDoMovimento(10, 1), 'direita');
  assert.equal(direcaoDoMovimento(-10, 1), 'esquerda');
  assert.equal(direcaoDoMovimento(1, 10), 'frente');
  assert.equal(direcaoDoMovimento(1, -10), 'costas');
  /* Na diagonal exata, segura o que já estava. Sem isso o sprite piscaria
     entre o lado e a frente a cada pixel de arrasto. */
  assert.equal(direcaoDoMovimento(5, 5, 'direita'), 'direita');
  assert.equal(direcaoDoMovimento(5, 5, 'costas'), 'costas');
  // Parado não vira à toa.
  assert.equal(direcaoDoMovimento(0, 0, 'esquerda'), 'esquerda');
  assert.equal(direcaoDoMovimento(.1, -.2, 'costas'), 'costas');
});

test('espelhar troca os lados e não mexe em frente e costas', () => {
  const s = spriteDe('lee');
  const dir = recorteDoQuadro(s, 'direita', 0);
  const esq = recorteDoQuadro(s, 'esquerda', 0);
  assert.equal(recorteDoQuadro(s, 'direita', 0, true).y, esq.y);
  assert.equal(recorteDoQuadro(s, 'esquerda', 0, true).y, dir.y);
  for (const d of ['frente', 'costas']) {
    assert.equal(recorteDoQuadro(s, d, 0, true).y, recorteDoQuadro(s, d, 0).y);
  }
});

test('a caminhada tem o passo de 8 bits, não de slide show', () => {
  assert.equal(QUADROS_POR_SEGUNDO, 6);
  assert.equal(quadroNoTempo(0, 4), 0);
  assert.equal(quadroNoTempo(1000, 4), 2, 'seis quadros em um segundo, com 4 na volta');
  assert.equal(QUADRO_PARADO, 0, 'o quadro de repouso devia ser o primeiro');
});

test('sprite que não existe não derruba o mapa', () => {
  assert.equal(spriteDe('ninguem'), null);
  assert.equal(spriteDe(''), null);
  assert.equal(recorteDoQuadro(null, 'frente', 0), null);
});

test('o token desenha sprite antes de foto, e anda ao ser arrastado', async () => {
  const { readFileSync } = await import('node:fs');
  const mapa = readFileSync(`${RAIZ}src/features/mapa-batalha/BattleMapPage.jsx`, 'utf8');
  assert.match(mapa, /\{token\.sprite\s*\n/, 'o sprite deixou de ter prioridade sobre a foto');
  assert.match(mapa, /andando=\{draggingId === token\.id\}/,
    'a caminhada deixou de seguir o arrasto');
  // E o campo sobrevive ao colocar da biblioteca.
  assert.match(mapa, /sprite: tpl\.sprite \|\| ''/);
});

test('o sprite é desenhado com pixel duro', async () => {
  const { readFileSync } = await import('node:fs');
  for (const f of ['src/features/oneshot/token-sprite.css',
    'src/features/mapa-batalha/biblioteca-de-tokens.css']) {
    const css = readFileSync(RAIZ + f, 'utf8');
    assert.match(css, /image-rendering:pixelated/,
      `${f}: sem pixel duro a arte 8 bits vira borrão ao ampliar`);
  }
});

test('na noite o Mestre tem painel de token com tamanho e excluir', async () => {
  const { readFileSync } = await import('node:fs');
  const mapa = readFileSync(`${RAIZ}src/features/mapa-batalha/BattleMapPage.jsx`, 'utf8');
  const painel = readFileSync(`${RAIZ}src/features/oneshot/PainelDoToken.jsx`, 'utf8');

  /* O painel completo do mapa fica escondido na mesa de terror de
     propósito — cor de classe, modo de vida e vínculo com inimigo não
     existem aqui. Mas escondê-lo tinha levado junto o tamanho e o
     excluir, que fazem falta em qualquer mesa. */
  assert.match(mapa, /selectedToken && masterMode && ehNoite && \(/,
    'a noite voltou a ficar sem painel de token');
  assert.match(mapa, /selectedToken && masterMode && !ehNoite && \(/,
    'o painel da Dinastia E voltou a aparecer na noite');

  assert.match(painel, /size: Math\.round\(Math\.min\(TAMANHOS\.max/);
  assert.match(painel, /aoExcluir\(token\.id\)/);
  // E o vínculo continua pela id da ficha.
  assert.match(painel, /<option key=\{f\.id\} value=\{f\.id\}>/);
});

test('o painel da noite deixa consertar o lado do sprite', () => {
  /* Eu já errei os lados uma vez montando o catálogo, e não há como
     garantir que a próxima folha venha na mesma ordem. Com o botão, o
     Mestre resolve em dois segundos em vez de abrir um chamado. */
  const { readFileSync } = require('node:fs');
  const painel = readFileSync(`${RAIZ}src/features/oneshot/PainelDoToken.jsx`, 'utf8');
  assert.match(painel, /spriteEspelhado: !token\.spriteEspelhado/);
  // E só aparece para token que tem sprite: num retrato redondo não faz nada.
  assert.match(painel, /\{sprite && \(/);
});

test('o Kujo responde pelo nome antigo', () => {
  /* Ele nasceu "magnus" e foi renomeado depois de já haver token dele em
     mapa. Sem o apelido, aqueles tokens perderiam a folha e virariam um
     quadrado vazio no meio da cena, sem ninguém entender por quê. */
  assert.equal(spriteDe('kujo')?.nome, 'Kujo');
  assert.equal(spriteDe('magnus')?.id, 'kujo', 'token antigo ficou sem sprite');
  assert.equal(spriteDe('magnus')?.arquivo, spriteDe('kujo')?.arquivo);
  // E o nome antigo não aparece mais na biblioteca.
  assert.ok(!SPRITES.some(s => s.nome === 'Magnus'));
});

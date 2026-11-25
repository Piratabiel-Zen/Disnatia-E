/**
 * TODO CAMINHO DE IMAGEM APONTA PARA UM ARQUIVO QUE EXISTE
 *
 * Trocar o formato das imagens é um ganho de peso com um risco embutido:
 * um caminho que ficou para trás não quebra a build, não quebra teste
 * nenhum, e só aparece como um quadrado vazio na tela de quem abrir aquela
 * página — que pode ser o primo, no meio da sessão.
 *
 * Então os caminhos literais do código são conferidos contra o disco.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const RAIZ = new URL('../', import.meta.url).pathname;

function arquivos(dir, achados = []) {
  for (const nome of readdirSync(join(RAIZ, dir))) {
    const rel = `${dir}/${nome}`;
    if (statSync(join(RAIZ, rel)).isDirectory()) arquivos(rel, achados);
    else achados.push(rel);
  }
  return achados;
}

const FONTES = arquivos('src').filter(f => /\.(jsx?|mjs|css)$/.test(f));

test('nenhum caminho de imagem aponta para arquivo que não existe', () => {
  const quebrados = [];
  for (const f of FONTES) {
    const texto = readFileSync(join(RAIZ, f), 'utf8');
    for (const m of texto.matchAll(/['"(](\/(?:media|archives|img|assets)\/[^'")\s]+\.[a-z0-9]{2,5})['")]/gi)) {
      const caminho = m[1];
      if (!existsSync(join(RAIZ, 'public', caminho))) quebrados.push(`${f} → ${caminho}`);
    }
  }
  assert.deepEqual(quebrados, [], `caminhos sem arquivo:\n${quebrados.join('\n')}`);
});

test('as imagens pesadas estão em formato moderno', () => {
  /* JPEG e PNG continuam valendo para o que o Mestre anexa em tempo de
     jogo — isso passa pelo compressor e vira data URL. O que esta regra
     cobre é o que VAI NO REPOSITÓRIO e é servido a cada visita. */
  const pesadas = arquivos('public')
    .filter(f => /\.(jpe?g|png)$/i.test(f))
    .filter(f => statSync(join(RAIZ, f)).size > 120 * 1024);
  assert.deepEqual(pesadas, [],
    `imagens grandes em formato antigo:\n${pesadas.join('\n')}`);
});

test('nada ficou para trás nos dois formatos ao mesmo tempo', () => {
  // Deixar o .jpg junto do .webp dobra o peso do repositório e deixa a
  // dúvida de qual é o bom — e um dia alguém aponta para o errado.
  const todos = new Set(arquivos('public'));
  const duplos = [...todos]
    .filter(f => f.endsWith('.webp'))
    .flatMap(f => ['.jpg', '.jpeg', '.png'].map(e => f.replace(/\.webp$/, e)))
    .filter(f => todos.has(f));
  assert.deepEqual(duplos, [], `sobrou o formato antigo:\n${duplos.join('\n')}`);
});

test('os sete mapas da casa existem, e são sete', () => {
  const { MAPAS, PASTA } = JSON.parse(JSON.stringify({ MAPAS: [], PASTA: '' }));
  // Lido da fonte para não depender de import com efeito colateral.
  const fonte = readFileSync(join(RAIZ, 'src/features/oneshot/mapasDaCasa.mjs'), 'utf8');
  const nomes = [...fonte.matchAll(/imagem: `\$\{PASTA\}\/([a-z]+)\.webp`/g)].map(m => m[1]);
  assert.deepEqual(nomes,
    ['patio', 'terreo', 'quartos', 'sotao', 'porao', 'ritual', 'galpao'],
    'a lista dos sete mapas mudou');
  for (const nome of nomes) {
    const caminho = join(RAIZ, 'public/media/mapas/casa', `${nome}.webp`);
    assert.ok(existsSync(caminho), `falta a imagem de ${nome}`);
    // E nenhum é uma miniatura por engano: o mapa é a tela inteira.
    assert.ok(statSync(caminho).size > 80 * 1024, `${nome} está pequeno demais para um mapa`);
  }
});

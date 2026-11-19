/**
 * NADA DE LER UM const ACIMA DA DECLARAÇÃO DELE NUMA LISTA DE DEPENDÊNCIAS
 *
 * O site abriu preto por causa disto. Um useEffect escrito no meio do
 * componente listava `isSpotify` nas dependências, e `const isSpotify` estava
 * sessenta linhas abaixo. Dentro do corpo do efeito aquilo seria inofensivo —
 * o corpo roda depois. A lista de dependências, não: ela é avaliada na hora
 * da renderização, e um `const` lido acima da própria declaração não vale
 * `undefined`, lança ReferenceError.
 *
 * O componente era o tocador de música, que mora na barra de cima da sessão.
 * O erro subiu e derrubou a árvore inteira: mesa preta, sem nada na tela, e
 * nenhum aviso de build — isso não é erro de sintaxe, é de execução.
 *
 * O teste olha só as listas de dependências, que é onde o perigo está, então
 * não reclama de uso legítimo dentro do corpo de um hook ou no JSX.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const raiz = new URL('../src/', import.meta.url).pathname;

function arquivos(pasta) {
  return readdirSync(pasta).flatMap(nome => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.jsx?$/.test(nome) ? [caminho] : [];
  });
}

/* Linha de cada `const nome =` com indentação de componente (2 espaços). */
function declaracoes(fonte) {
  const mapa = new Map();
  fonte.split('\n').forEach((linha, i) => {
    const m = linha.match(/^ {2}const (?:\{[^}]*\}|\[[^\]]*\]|([A-Za-z_$][\w$]*)) *=/);
    if (m?.[1] && !mapa.has(m[1])) mapa.set(m[1], i);
  });
  return mapa;
}

/* Cada lista de dependências de hook, com a linha em que ela começa. */
function listasDeDependencias(fonte) {
  const linhas = fonte.split('\n');
  const achados = [];
  const padrao = /\}, \[(.*)\]\);/;
  linhas.forEach((linha, i) => {
    const m = linha.match(padrao);
    if (m) achados.push({ linha: i, conteudo: m[1] });
  });
  return achados;
}

test('nenhuma lista de dependências lê um const declarado mais abaixo', () => {
  const problemas = [];
  for (const caminho of arquivos(raiz)) {
    const fonte = readFileSync(caminho, 'utf8');
    const declarado = declaracoes(fonte);
    for (const { linha, conteudo } of listasDeDependencias(fonte)) {
      for (const nome of conteudo.match(/[A-Za-z_$][\w$]*/g) || []) {
        const onde = declarado.get(nome);
        if (onde != null && onde > linha) {
          problemas.push(`${caminho.slice(raiz.length)}:${linha + 1} usa "${nome}", declarado na linha ${onde + 1}`);
        }
      }
    }
  }
  assert.deepEqual(problemas, [], `ReferenceError em tempo de renderização:\n${problemas.join('\n')}`);
});

test('o tocador declara o que seus efeitos usam antes de usá-los', () => {
  // O caso que derrubou o site, guardado pelo nome.
  const fonte = readFileSync(new URL('../src/shell/AmbientSoundPlayer.jsx', import.meta.url), 'utf8');
  const declarado = declaracoes(fonte);
  const primeiroEfeitoDoTocador = fonte.split('\n').findIndex(l => l.includes('MONTA, TROCA E DESMONTA O TOCADOR'));
  assert.ok(primeiroEfeitoDoTocador > 0, 'o efeito do tocador sumiu');
  for (const nome of ['isSpotify', 'hasCurrentMedia', 'isPlaying']) {
    assert.ok(declarado.get(nome) < primeiroEfeitoDoTocador,
      `"${nome}" voltou a ser declarado depois do efeito que o usa`);
  }
});

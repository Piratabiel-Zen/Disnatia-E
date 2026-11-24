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
 * O teste olha as listas de dependências E os `const` que calculam alguma
 * coisa na hora do render — as duas coisas que o motor avalia enquanto
 * renderiza. Uso dentro do corpo de um hook ou no JSX continua livre,
 * porque esse código roda depois.
 *
 * A segunda metade entrou depois de um caso que a primeira não via: um
 * `const fichaDoTokenEscolhido = ... selectedToken?.sheetId ...` escrito
 * mil linhas acima do `const selectedToken`. O array de dependências do
 * efeito ao lado foi pego; a expressão em si, não — e ela estoura igual.
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

/* Onde cada função de topo começa. Um arquivo tem vários componentes, e
   cada um tem o seu `const max`: sem esta fronteira o teste compara o `max`
   de um com a declaração do outro e acusa erro que não existe — guarda que
   grita à toa é guarda que se aprende a ignorar. */
function fronteiras(fonte) {
  const inicios = [0];
  fonte.split('\n').forEach((linha, i) => {
    if (/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\b/.test(linha)
      || /^(?:export\s+)?const [A-Za-z_$][\w$]* *= *(?:\(|[A-Za-z_$][\w$]* *=>|React\.|memo\(|forwardRef\()/.test(linha)) {
      inicios.push(i);
    }
  });
  return inicios;
}
const mesmaFuncao = (inicios, a, b) => {
  const dona = n => { let d = 0; for (const i of inicios) if (i <= n) d = i; return d; };
  return dona(a) === dona(b);
};

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
    const limites = fronteiras(fonte);
    for (const { linha, conteudo } of listasDeDependencias(fonte)) {
      for (const nome of conteudo.match(/[A-Za-z_$][\w$]*/g) || []) {
        const onde = declarado.get(nome);
        if (onde != null && onde > linha && mesmaFuncao(limites, linha, onde)) {
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


/* O texto completo de cada `const` de corpo de componente, com a linha em
   que começa. Vai juntando linhas até os parênteses, colchetes e chaves
   fecharem: declaração de uma linha só é a minoria num componente grande. */
function constantesDoCorpo(fonte) {
  const linhas = fonte.split('\n');
  const achados = [];
  for (let i = 0; i < linhas.length; i += 1) {
    if (!/^ {2}const (?:[A-Za-z_$][\w$]*|\{[^}]*\}|\[[^\]]*\]) *=/.test(linhas[i])) continue;
    let texto = '';
    let saldo = 0;
    let fim = i;
    for (; fim < linhas.length && fim < i + 120; fim += 1) {
      /* Para na próxima declaração do mesmo nível. Sem isto o coletor
         engolia a linha seguinte e via a DECLARAÇÃO dela como se fosse
         leitura — acusando `const hp` de ler `hp`. */
      if (fim > i && /^ {2}(?:const|let|var|function|return|if|for|while)\b/.test(linhas[fim])) break;
      texto += `${linhas[fim]}\n`;
      for (const ch of linhas[fim]) {
        if ('([{'.includes(ch)) saldo += 1;
        if (')]}'.includes(ch)) saldo -= 1;
      }
      if (saldo <= 0 && /[;,]\s*$/.test(linhas[fim])) break;
    }
    achados.push({ linha: i, texto });
  }
  return achados;
}

/* Os nomes que a expressão realmente LÊ.
   `record.hp` não lê `hp`, lê `record`; `{ hp: 3 }` também não. Sem tirar
   os acessos a propriedade e as chaves de objeto, o teste confunde a
   propriedade de um objeto com a variável de mesmo nome declarada adiante —
   e aí acusa quase todo arquivo grande do projeto. */
const nomesLidos = texto => new Set(
  texto
    .replace(/'[^']*'|"[^"]*"|`[^`]*`/g, ' ')
    .replace(/\?\.\s*[A-Za-z_$][\w$]*/g, ' ')
    .replace(/\.\s*[A-Za-z_$][\w$]*/g, ' ')
    .replace(/[A-Za-z_$][\w$]*\s*:/g, ' ')
    .match(/[A-Za-z_$][\w$]*/g) || [],
);

/* Inicializador que só GUARDA código para rodar depois não lê nada agora. */
const adiada = texto => {
  const depoisDoIgual = texto.slice(texto.indexOf('=') + 1).trimStart();
  return /^(?:useCallback|useMemo|useEffect|useLayoutEffect|useRef)\s*\(/.test(depoisDoIgual)
    || /^(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/.test(depoisDoIgual)
    || /^(?:async\s+)?function\b/.test(depoisDoIgual);
};

test('nenhum const de render lê outro const declarado mais abaixo', () => {
  const problemas = [];
  for (const caminho of arquivos(raiz)) {
    const fonte = readFileSync(caminho, 'utf8');
    const declarado = declaracoes(fonte);
    const limites = fronteiras(fonte);
    for (const { linha, texto } of constantesDoCorpo(fonte)) {
      if (adiada(texto)) continue;
      const proprio = texto.match(/^ {2}const ([A-Za-z_$][\w$]*)/)?.[1];
      const corpo = texto.slice(texto.indexOf('=') + 1);
      for (const nome of nomesLidos(corpo)) {
        if (nome === proprio) continue;
        const onde = declarado.get(nome);
        if (onde != null && onde > linha && mesmaFuncao(limites, linha, onde)) {
          problemas.push(`${caminho.slice(raiz.length)}:${linha + 1} calcula com "${nome}", declarado na linha ${onde + 1}`);
        }
      }
    }
  }
  assert.deepEqual(problemas, [], `ReferenceError em tempo de renderização:\n${problemas.join('\n')}`);
});

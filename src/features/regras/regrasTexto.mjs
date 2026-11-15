// O texto das regras tem estrutura — só não tinha quem a enxergasse.
//
// A página antiga pintava tudo como parágrafo cinza do mesmo tamanho, com um
// palpite frágil para achar títulos ("linha curta terminada em dois-pontos").
// O resultado era uma parede de texto: quem precisava do custo de uma ação no
// meio do combate tinha que ler tudo de novo.
//
// Olhando os corpos de verdade, quatro formas se repetem o tempo todo:
//
//   "Resultado total:"                    → um título de seção
//   "• 1–10 → Falha: a ação não..."       → uma linha de RESULTADO (condição → efeito)
//   "🩸 Sangramento — −2 de vida..."      → uma VERBETE (nome — definição)
//   "⚠️ Limite em combate: ..."           → um AVISO
//   "1º — O Último Fôlego"                → um PASSO numerado
//
// Reconhecer isso transforma a leitura: resultado de dado vira tabela, estado
// alterado vira verbete, aviso vira bloco destacado. É a mesma informação,
// legível num relance em vez de lida linha a linha.

const AVISO = /^(⚠️|❗)/u;
const PASSO = /^(\d+)[º°]\s*—\s*(.+)$/u;
const MARCADOR = /^[•·]\s*/u;
// "condição → efeito", com ou sem marcador antes.
const RESULTADO = /^(.+?)\s*→\s*(.+)$/u;
// "<emoji> Nome — definição". O travessão é o que separa o nome do efeito.
const VERBETE = /^(\p{Extended_Pictographic}[️‍\p{Extended_Pictographic}]*)\s+([^—]{1,48})—\s*(.+)$/u;
const TITULO = /^(.{1,64}):$/u;

/**
 * Quebra o corpo de uma regra em blocos com tipo.
 * Linhas vazias separam blocos; linhas do mesmo tipo se agrupam.
 */
export function parseRuleBody(text) {
  const linhas = String(text || '').split('\n');
  const blocos = [];
  const ultimo = () => blocos[blocos.length - 1];

  const empurrar = (tipo, item) => {
    const atual = ultimo();
    if (atual && atual.tipo === tipo && atual.agrupa) atual.itens.push(item);
    else blocos.push({ tipo, agrupa: true, itens: [item] });
  };

  for (const bruta of linhas) {
    const linha = bruta.trim();
    if (!linha) {
      // A linha em branco fecha o agrupamento, para dois grupos seguidos do
      // mesmo tipo não virarem um bloco só.
      if (ultimo()) ultimo().agrupa = false;
      continue;
    }

    if (AVISO.test(linha)) { blocos.push({ tipo: 'aviso', texto: linha.replace(AVISO, '').trim() }); continue; }

    const passo = linha.match(PASSO);
    if (passo) { empurrar('passos', { numero: passo[1], texto: passo[2].trim() }); continue; }

    const semMarcador = linha.replace(MARCADOR, '');
    const temMarcador = semMarcador !== linha;

    const verbete = semMarcador.match(VERBETE);
    if (verbete) {
      empurrar('verbetes', { icone: verbete[1], nome: verbete[2].trim(), texto: verbete[3].trim() });
      continue;
    }

    const resultado = semMarcador.match(RESULTADO);
    if (resultado) {
      empurrar('resultados', { condicao: resultado[1].trim(), efeito: resultado[2].trim() });
      continue;
    }

    if (temMarcador) { empurrar('lista', semMarcador); continue; }

    if (TITULO.test(linha)) { blocos.push({ tipo: 'titulo', texto: linha.slice(0, -1) }); continue; }

    // Linha solta logo abaixo de um verbete, sem linha em branco entre as
    // duas, é continuação dele — é assim que os estados alterados estão
    // escritos ("🩸 Sangramento — ...\nAcumula. Dois sangramentos são..."). Sem
    // isto, a explicação se desprende do nome a que pertence.
    const atual = ultimo();
    if (atual && atual.tipo === 'verbetes' && atual.agrupa) {
      const verbeteAnterior = atual.itens[atual.itens.length - 1];
      verbeteAnterior.texto = `${verbeteAnterior.texto} ${linha}`;
      continue;
    }

    empurrar('texto', linha);
  }

  return blocos.map(({ agrupa, ...bloco }) => bloco);
}

/** Um resumo de uma linha para a regra, usado no índice. */
export function resumoDaRegra(text) {
  const primeira = String(text || '').split('\n').map(l => l.trim()).find(Boolean) || '';
  return primeira.length > 96 ? `${primeira.slice(0, 93)}…` : primeira;
}

/** Procura o termo no título e no corpo, ignorando acentos e caixa. */
const normalizar = termo => String(termo || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function regraCombina(regra, termo) {
  const busca = normalizar(termo).trim();
  if (!busca) return true;
  return normalizar(`${regra.title} ${regra.body}`).includes(busca);
}

export const CATEGORIAS = [
  { id: 'todas', rotulo: 'Tudo', icone: '✦' },
  { id: 'sistema', rotulo: 'Sistema', icone: '📜' },
  { id: 'Combate', rotulo: 'Combate', icone: '⚔️' },
  { id: 'Mecânicas', rotulo: 'Mecânicas', icone: '🎲' },
  { id: 'Status', rotulo: 'Estados', icone: '❤️' },
];

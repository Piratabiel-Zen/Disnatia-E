// O CAPÍTULO DO JOGADOR
//
// A tela inicial da sessão responde "que história é esta, onde a companhia
// está, quem está lá". Falta a pergunta que só o jogador faz: e eu, quem sou
// nisso? Este módulo monta a resposta a partir do que já existe na ficha —
// nada aqui inventa texto.
//
// A divisão de trabalho da mesa fica visível: a lore é escrita pelo Mestre, os
// traços e os objetivos são do jogador, e a frente é definida pelo Mestre. O
// bloco mostra os três juntos sem misturar quem disse o quê.
//
// Só o jogador vê isto. Na visão do Mestre a tela continua como era: ele olha
// a mesa inteira, não um personagem.

import { groupOf } from './grupos.mjs';

/* Onde um resumo pode terminar sem cortar palavra no meio. */
const FIM_DE_FRASE = /[.!?…](?:["'”’)]|\s|$)/g;

/**
 * Resume a lore para caber na tela inicial sem parecer truncada.
 *
 * Corta no fim de frase mais próximo do limite — uma lore cortada em "ele
 * nasceu em" não é um resumo, é um defeito. Se não houver fim de frase à
 * vista, corta na última palavra inteira e marca com reticências.
 */
export function resumoDaLore(texto, limite = 300) {
  const inteiro = String(texto || '').trim().replace(/\s*\n\s*\n\s*/g, '\n\n');
  if (!inteiro) return { resumo: '', inteiro: '', cortado: false };
  if (inteiro.length <= limite) return { resumo: inteiro, inteiro, cortado: false };

  // O primeiro parágrafo costuma ser a apresentação do personagem. Quando ele
  // cabe e já é uma frase fechada, é o melhor resumo possível: foi o próprio
  // Mestre que escolheu começar por ali. O piso de 60 caracteres evita que um
  // parágrafo de três palavras vire o resumo de uma lore inteira.
  const primeiro = inteiro.split('\n\n')[0].trim();
  if (primeiro.length >= 60 && primeiro.length <= limite && /[.!?…]["'”’)]?$/.test(primeiro)) {
    return { resumo: primeiro, inteiro, cortado: true };
  }

  const janela = inteiro.slice(0, limite + 80);
  let corte = 0;
  FIM_DE_FRASE.lastIndex = 0;
  for (let achado = FIM_DE_FRASE.exec(janela); achado; achado = FIM_DE_FRASE.exec(janela)) {
    const fim = achado.index + 1;
    if (fim > limite + 60) break;
    corte = fim;
    if (fim >= limite * 0.55) break;
  }
  if (corte >= limite * 0.4) return { resumo: janela.slice(0, corte).trim(), inteiro, cortado: true };

  const bruto = inteiro.slice(0, limite);
  const espaço = bruto.lastIndexOf(' ');
  const base = (espaço > limite * 0.5 ? bruto.slice(0, espaço) : bruto).replace(/[\s,;:—-]+$/, '');
  return { resumo: `${base}…`, inteiro, cortado: true };
}

/** Lista de objetivos da ficha, sem entradas vazias. */
export function objetivosDaFicha(sheet) {
  const bruto = Array.isArray(sheet?.objetivos_pessoais) ? sheet.objetivos_pessoais : [];
  return bruto.map(o => String(o || '').trim()).filter(Boolean);
}

/** Traços de personalidade da ficha, sem entradas vazias. */
export function tracosDaFicha(sheet) {
  const bruto = Array.isArray(sheet?.personalidade) ? sheet.personalidade : [];
  return bruto.map(t => String(t || '').trim()).filter(Boolean);
}

/**
 * Monta o capítulo do jogador, ou devolve null quando não há o que mostrar.
 *
 * Devolve null em três casos: é o Mestre, o jogador não tem ficha na sessão,
 * ou a ficha não tem nada escrito ainda. No último caso o bloco não aparece —
 * uma moldura vazia na tela inicial só ocupa espaço e envergonha quem ainda
 * não escreveu a lore.
 */
export function meuCapitulo({ sheets, playerId, groups, masterMode, limite = 300 }) {
  if (masterMode || !playerId) return null;

  const lista = Array.isArray(sheets) ? sheets : [];
  const ficha = lista.find(sheet => String(sheet?.id) === String(playerId));
  if (!ficha) return null;

  const lore = resumoDaLore(ficha.lore_personagem, limite);
  const tracos = tracosDaFicha(ficha);
  const objetivos = objetivosDaFicha(ficha);
  if (!lore.resumo && !tracos.length && !objetivos.length) return null;

  const chave = groupOf(ficha, groups?.ativo);
  const frente = groups?.[chave] || {};

  return {
    ficha,
    nome: String(ficha.nome || '').trim(),
    lore,
    tracos,
    objetivos,
    // A frente só tem nome quando o Mestre dividiu a companhia. Sem divisão,
    // o lugar já está no topo da tela e repeti-lo aqui não informa nada.
    frente: {
      chave,
      dividida: Boolean(groups?.ativo),
      nome: groups?.ativo ? String(frente.nome || '').trim() : '',
      local: String(frente.local || '').trim(),
    },
  };
}

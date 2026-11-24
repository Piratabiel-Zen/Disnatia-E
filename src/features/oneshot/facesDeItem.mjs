/**
 * A GEOMETRIA DAS FACES DOS ITENS
 *
 * Os desenhos vivem aqui como dados, e não como JSX, por dois motivos: o
 * Node não importa `.jsx`, então em JSX nada disto seria testável; e desenho
 * descrito em dados dá para conferir — que toda forma tem frente e verso,
 * que o verso não é a frente, que cada amuleto tem o selo dele.
 *
 * São objetos genéricos — um papel, uma chave, um disco de pedra. Nada que
 * imite marca, personagem ou obra existente.
 *
 * Vocabulário: `r` retângulo, `c` círculo, `e` elipse, `p` caminho, `g`
 * grupo. As medidas são todas no mesmo quadro de 88 por 112.
 *
 * `escrita: true` marca os traços que FINGEM ser texto — as linhas de um
 * caderno, as colunas de um jornal. Quando o item tem texto de verdade no
 * verso, esses traços saem: escrita real por cima de escrita fingida não se
 * lê, e foi assim que o verso da fotografia ficou ilegível na primeira
 * tentativa.
 */

export const QUADRO = Object.freeze({ largura: 88, altura: 112 });

const PAPEL = '#C9B48C';
const PAPEL_ESCURO = '#A8926B';
const TINTA = '#2A1F14';
/**
 * A PEDRA DE CADA AMULETO.
 *
 * Os cinco são do mesmo feitio, mas não da mesma pedra — e isso não é
 * enfeite: na bolsa a mesa vê a FRENTE, e cinco discos cinzentos iguais
 * deixam o jogador sem saber qual amuleto tem na mão. As cores saem do que
 * está escrito em cada item: pedra clara, leitosa, leve, barro, veio
 * vermelho.
 */
const PEDRAS = Object.freeze({
  entrada: { corpo: '#8C867E', anel: '#6B655E', veio: '#A8A199' },
  sono: { corpo: '#9C9890', anel: '#7B766E', veio: '#BDB8AE' },
  memoria: { corpo: '#7E7A74', anel: '#5E5A55', veio: '#99948C' },
  terra: { corpo: '#7A5F42', anel: '#5A4530', veio: '#9C7E58' },
  sangue: { corpo: '#4E4440', anel: '#332B28', veio: '#8E2A2A' },
});
const PEDRA_PADRAO = { corpo: '#6E6660', anel: '#4A443E', veio: '#8A827A' };
const LATAO = '#9C7A3C';

const r = (x, y, w, h, extra = {}) => ({ t: 'r', x, y, w, h, ...extra });
const c = (cx, cy, raio, extra = {}) => ({ t: 'c', cx, cy, raio, ...extra });
const p = (d, extra = {}) => ({ t: 'p', d, ...extra });

/* Os cinco selos: símbolos inventados para esta casa, um por amuleto. */
const SELOS = Object.freeze({
  // Uma porta com tranca: o que fecha a entrada.
  entrada: [p('M26 64h36M30 64V36a14 14 0 0 1 28 0v28'), p('M44 64V48')],
  // Uma lua deitada sobre linhas de respiração.
  sono: [p('M56 30a18 18 0 1 0 6 20 14 14 0 0 1-6-20Z'), p('M30 62h28M34 68h20')],
  // Uma espiral que se fecha: o que foi lembrado volta ao começo.
  memoria: [
    p('M44 44a8 8 0 1 1 8 8c-6 0-12-5-12-13s7-14 15-14 17 7 17 18-9 20-20 20-22-8-22-21'),
    c(44, 44, 2.6, { preenche: true }),
  ],
  // Raiz: uma linha que desce e se abre embaixo.
  terra: [p('M44 24v20'), p('M44 44c-6 4-10 10-12 20M44 44c6 4 10 10 12 20M44 48c-3 6-4 12-4 18M44 48c3 6 4 12 4 18')],
  // Mão aberta com o centro furado.
  sangue: [
    p('M30 34v14a14 14 0 0 0 28 0V34'),
    p('M30 34h28M36 34V26M44 34V24M52 34V26'),
    c(44, 46, 4, { preenche: true }),
  ],
});

export const SELOS_CONHECIDOS = Object.freeze(Object.keys(SELOS));

const FORMAS = Object.freeze({
  fotografia: {
    frente: [
      r(6, 6, 76, 100, { fill: PAPEL, stroke: TINTA, largura: 1.2 }),
      r(13, 13, 62, 72, { fill: '#4A4540' }),
      { t: 'e', cx: 44, cy: 46, rx: 15, ry: 19, fill: '#8A7E72' },
      p('M22 85q22-26 44 0Z', { fill: '#302C28' }),
      r(13, 13, 62, 72, { stroke: TINTA, largura: 0.8 }),
    ],
    verso: [
      r(6, 6, 76, 100, { fill: PAPEL_ESCURO, stroke: TINTA, largura: 1.2 }),
      p('M18 34h48M18 44h40M18 54h52M18 64h30',
        { stroke: TINTA, largura: 1.1, opacidade: 0.55, escrita: true }),
      p('M18 84h26', { stroke: '#7A1821', largura: 1.4, escrita: true }),
    ],
  },
  jornal: {
    frente: [
      r(4, 8, 80, 96, { fill: PAPEL, stroke: TINTA, largura: 1 }),
      p('M12 22h64', { stroke: TINTA, largura: 2.6 }),
      p('M12 32h30M12 38h30M12 44h30M12 50h30M12 56h30', { stroke: TINTA, largura: 1, opacidade: 0.5 }),
      r(48, 32, 28, 24, { fill: '#5A544C' }),
      p('M12 66h64M12 74h64M12 82h40', { stroke: TINTA, largura: 1, opacidade: 0.5 }),
    ],
    verso: [
      r(4, 8, 80, 96, { fill: PAPEL, stroke: TINTA, largura: 1 }),
      p('M12 24h64M12 32h64M12 40h44',
        { stroke: TINTA, largura: 1, opacidade: 0.42, escrita: true }),
      // A mancha que tomou metade da folha.
      p('M8 48q40 14 80-4v60H8Z', { fill: '#17120E', opacidade: 0.9 }),
    ],
  },
  caderno: {
    frente: [
      r(8, 6, 72, 100, { fill: '#4A3A26', stroke: TINTA, largura: 1.2, raio: 2 }),
      r(14, 12, 60, 88, { fill: PAPEL_ESCURO }),
      p('M20 26h48M20 34h48M20 42h40M20 50h48M20 58h34M20 66h48M20 74h28',
        { stroke: TINTA, largura: 0.9, opacidade: 0.5 }),
      p('M8 6v100', { stroke: TINTA, largura: 3 }),
    ],
    verso: [
      r(8, 6, 72, 100, { fill: '#4A3A26', stroke: TINTA, largura: 1.2, raio: 2 }),
      r(14, 12, 60, 88, { fill: PAPEL_ESCURO }),
      // A escrita miúda e apressada: linhas mais densas que as da frente.
      p('M20 22h44M20 31h54M20 40h34M20 49h48M20 58h40M20 67h52M20 76h38',
        { stroke: TINTA, largura: 1.1, opacidade: 0.72, escrita: true }),
    ],
  },
  planta: {
    frente: [
      r(4, 12, 80, 88, { fill: '#1E2A33', stroke: TINTA, largura: 1 }),
      r(14, 24, 60, 64, { stroke: '#9EC4DE', largura: 1.2 }),
      p('M14 52h26v36M40 24v28h34M52 52v36', { stroke: '#9EC4DE', largura: 1 }),
      r(22, 62, 10, 10, { stroke: '#9EC4DE', largura: 0.8 }),
    ],
    verso: [
      r(4, 12, 80, 88, { fill: '#1E2A33', stroke: TINTA, largura: 1 }),
      // A seta a lápis vermelho, apontando para baixo da casa.
      p('M44 24v46', { stroke: '#D96B77', largura: 1.6 }),
      p('m44 70-5-7h10z', { fill: '#D96B77' }),
      p('M26 80h36', { stroke: '#9EC4DE', largura: 1, opacidade: 0.6 }),
    ],
  },
  desenho: {
    frente: [
      r(6, 8, 76, 96, { fill: PAPEL, stroke: TINTA, largura: 1 }),
      p('M18 86h52', { stroke: '#6B5636', largura: 1.6 }),
      p('M26 86V40h18v46', { stroke: '#6B5636', largura: 1.6 }),
      r(44, 56, 8, 30, { fill: '#17120E' }),
      p('M62 86V44l6-10 6 10v42', { stroke: '#30281E', largura: 1.4 }),
    ],
    verso: [
      r(6, 8, 76, 96, { fill: PAPEL, stroke: TINTA, largura: 1 }),
      // Riscos de giz de cera, feitos com força.
      p('M20 48h48M20 60h40', { stroke: '#8B5A3C', largura: 2.2, opacidade: 0.8 }),
    ],
  },
  diagrama: {
    frente: [
      r(4, 12, 80, 88, { fill: PAPEL_ESCURO, stroke: TINTA, largura: 1 }),
      c(44, 56, 28, { stroke: TINTA, largura: 1.2 }),
      // Os cinco pontos do círculo: é onde os amuletos vão.
      ...[0, 1, 2, 3, 4].map(n => {
        const a = ((n * 72 - 90) * Math.PI) / 180;
        return c(
          Number((44 + Math.cos(a) * 28).toFixed(2)),
          Number((56 + Math.sin(a) * 28).toFixed(2)),
          5, { stroke: TINTA, largura: 1.2 },
        );
      }),
    ],
    verso: [
      r(4, 12, 80, 88, { fill: PAPEL_ESCURO, stroke: TINTA, largura: 1 }),
      p('M18 30h52M18 42h52M18 54h36M18 66h52M18 78h30',
        { stroke: TINTA, largura: 1, opacidade: 0.6, escrita: true }),
      p('M14 30l6 6-6 6M14 42l6 6-6 6', { stroke: '#7A1821', largura: 1.2, escrita: true }),
    ],
  },
  placa: {
    frente: [
      r(2, 26, 84, 56, { fill: '#5A4530', stroke: TINTA, largura: 1.4, raio: 2 }),
      p('M10 42h68M10 54h52M10 66h40', { stroke: '#E8DCC2', largura: 2.4 }),
    ],
    verso: [
      r(2, 26, 84, 56, { fill: '#4A3826', stroke: TINTA, largura: 1.4, raio: 2 }),
      p('M12 44h64M12 56h48', { stroke: TINTA, largura: 1.6, opacidade: 0.8, escrita: true }),
      p('M14 42q20 4 40-2M14 54q16 5 34-1', { stroke: '#1A1209', largura: 1, escrita: true }),
    ],
  },
  camisa: {
    frente: [
      p('M26 16 16 24v18l8-3v53h40V39l8 3V24l-10-8-6 6h-14z',
        { fill: '#CFC6B4', stroke: TINTA, largura: 1.2 }),
      p('M44 22v70', { stroke: TINTA, largura: 0.8, opacidade: 0.5 }),
    ],
    verso: [
      p('M26 16 16 24v18l8-3v53h40V39l8 3V24l-10-8-6 6h-14z',
        { fill: '#BDB2A0', stroke: TINTA, largura: 1.2 }),
      p('M36 44q10-8 18 2 6 12-4 20-12 6-16-6-2-10 2-16Z', { fill: '#6B1219', opacidade: 0.85 }),
      p('M40 70q4 10 10 12', { stroke: '#5A0E14', largura: 2 }),
    ],
  },
  chave: {
    frente: [
      c(44, 30, 16, { stroke: LATAO, largura: 4 }),
      p('M44 46v48', { stroke: LATAO, largura: 5 }),
      p('M44 78h12M44 88h10', { stroke: LATAO, largura: 5 }),
      p('M38 24q6-8 12 0-6 6-12 0Z', { fill: LATAO }),
    ],
    verso: [
      c(44, 30, 16, { stroke: '#7E5F2C', largura: 4 }),
      p('M44 46v48', { stroke: '#7E5F2C', largura: 5 }),
      p('M44 78h12M44 88h10', { stroke: '#7E5F2C', largura: 5 }),
      // O selo gravado no latão, visível só de trás.
      { t: 'g', stroke: '#E3C782', largura: 1.4, opacidade: 0.9, filhos: SELOS.entrada },
    ],
  },
});

export const FORMAS_CONHECIDAS = Object.freeze([...Object.keys(FORMAS), 'amuleto']);

/** O amuleto: mesmo feitio para os cinco, pedra e selo próprios de cada um. */
const amuleto = selo => {
  const pedra = PEDRAS[selo] || PEDRA_PADRAO;
  return {
    frente: [
      c(44, 56, 34, { fill: pedra.corpo, stroke: TINTA, largura: 1.6 }),
      c(44, 56, 27, { stroke: pedra.anel, largura: 1 }),
      p('M22 40q22 10 44-4', { stroke: pedra.veio, largura: 1.4, opacidade: 0.7 }),
      p('M18 62q26 12 52-6', { stroke: pedra.veio, largura: 1, opacidade: 0.45 }),
    ],
    verso: [
      c(44, 56, 34, { fill: pedra.anel, stroke: TINTA, largura: 1.6 }),
      {
        t: 'g', stroke: '#E3C782', largura: 2, move: 'translate(0,-4)',
        filhos: SELOS[selo] || SELOS.entrada,
      },
    ],
  };
};

/**
 * As figuras de um lado de um item. Vazio para forma que não existe.
 *
 * `semEscritaFingida` tira os traços que imitam texto, para quando há texto
 * de verdade por cima.
 */
export function faceDoItem(forma, selo, lado = 'frente', { semEscritaFingida = false } = {}) {
  const conjunto = String(forma) === 'amuleto' ? amuleto(String(selo)) : FORMAS[String(forma)];
  if (!conjunto) return null;
  const figuras = conjunto[lado === 'verso' ? 'verso' : 'frente'] || null;
  if (!figuras || !semEscritaFingida) return figuras;
  return figuras.filter(f => !f.escrita);
}

/** Este lado finge ter texto escrito? */
export const temEscritaFingida = (forma, selo, lado) =>
  (faceDoItem(forma, selo, lado) || []).some(f => f.escrita);

export const TEM_FACE = forma =>
  String(forma) === 'amuleto' || Boolean(FORMAS[String(forma)]);

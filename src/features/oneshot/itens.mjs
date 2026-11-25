/**
 * OS ITENS DA NOITE
 *
 * O jogador abre e vê o que tem na mão: a lanterna que o Mestre deu a ele,
 * e a chave que é da mesa inteira. Nome, uma imagem pequena e uma linha de
 * descrição — nada mais. Ficha de item com peso, durabilidade e dano é de
 * outro jogo; aqui o item serve para a pessoa lembrar que o tem na hora em
 * que precisa, e para o Mestre poder dizer "você ainda tem a chave".
 *
 * A entrega usa a MESMA máquina das aparições: `liberadoParaTodos` e
 * `liberadoPara`. Não é economia de código — é que o filtro precisa
 * acontecer na CONSULTA, no banco, e `observarLiberados` já faz isso. Um
 * filtro em JavaScript entregaria a lista inteira ao navegador e esconderia
 * na tela, que é o vazamento que esta mesa já teve uma vez.
 */

/** O que cabe antes de cortar. Duas linhas no cartão, no olho. */
export const TAMANHO_DA_DESCRICAO = 120;

/** Os dois alcances que um item tem: de alguém, ou da mesa. */
export const ALCANCES_DE_ITEM = Object.freeze([
  { id: 'alguns', nome: 'De quem eu escolher', resumo: 'Só na mão de quem você apontar.' },
  { id: 'mesa', nome: 'Da mesa', resumo: 'Todo mundo tem. Uma chave, um mapa.' },
]);

/**
 * Corta a descrição sem partir palavra, e marca o corte.
 *
 * Cortar no caractere exato parte "lanterna" em "lanter…", que lê mal e
 * parece defeito. Voltar até o espaço custa uma linha e devolve um corte
 * que parece intencional — porque é.
 */
export function resumoCurto(texto, limite = TAMANHO_DA_DESCRICAO) {
  const inteiro = String(texto || '').replace(/\s+/g, ' ').trim();
  const teto = Math.max(1, Number(limite) || TAMANHO_DA_DESCRICAO);
  if (inteiro.length <= teto) return inteiro;

  const pedaco = inteiro.slice(0, teto);
  const espaco = pedaco.lastIndexOf(' ');
  // Só volta até o espaço se sobrar pelo menos metade: numa palavra única
  // e enorme, voltar deixaria o cartão quase vazio.
  const base = espaco > teto / 2 ? pedaco.slice(0, espaco) : pedaco;
  return `${base.replace(/[\s.,;:–—-]+$/, '')}…`;
}

/** Se o corte aconteceu — o cartão mostra "ver tudo" só quando há tudo. */
export const foiCortada = (texto, limite = TAMANHO_DA_DESCRICAO) =>
  resumoCurto(texto, limite) !== String(texto || '').replace(/\s+/g, ' ').trim();

/** Um item novo, já com o alcance resolvido. */
export function itemNovo({ nome, descricao = '', imagem = '', alcance = 'alguns', donos = [] }) {
  const titulo = String(nome || '').trim();
  if (!titulo) return null;
  return comDonos({
    nome: titulo,
    descricao: String(descricao || '').trim(),
    imagem: String(imagem || ''),
    criadoEm: Date.now(),
  }, alcance, donos);
}

/**
 * Põe o alcance e o efeito juntos, sempre pelos dois.
 *
 * Guardar só a intenção ("é da mesa") e deixar o efeito para quem salva é
 * como os dois se separam: alguém troca o alcance, esquece de recalcular
 * `liberadoParaTodos`, e o item fica dizendo uma coisa e entregando outra.
 */
export function comDonos(item, alcance, donos) {
  const quais = [...new Set((donos || []).map(String).filter(Boolean))];
  const qual = alcance === 'mesa' ? 'mesa' : 'alguns';
  return {
    ...item,
    alcance: qual,
    donos: qual === 'alguns' ? quais : [],
    liberadoParaTodos: qual === 'mesa',
    liberadoPara: qual === 'alguns' ? quais : [],
  };
}

/** Pôr ou tirar uma pessoa da mão. Lista vazia continua "de alguém": o
 *  item existe, ainda sem dono, e some da tela de todo mundo — que é o
 *  rascunho de que o Mestre precisa enquanto monta a noite. */
export function alternarDono(item, uid) {
  const alvo = String(uid || '');
  if (!alvo) return item;
  const atual = donosDe(item);
  const nova = atual.includes(alvo) ? atual.filter(u => u !== alvo) : [...atual, alvo];
  return comDonos(item, 'alguns', nova);
}

export const donosDe = item =>
  (Array.isArray(item?.donos) ? item.donos : item?.liberadoPara || []).map(String).filter(Boolean);

export const alcanceDe = item => (item?.alcance === 'mesa' ? 'mesa' : 'alguns');

/** Quem tem este item, em palavras, para a lista do Mestre. */
export function quemTem(item, nomePorUid = {}) {
  if (alcanceDe(item) === 'mesa') return 'A mesa inteira';
  const donos = donosDe(item);
  if (!donos.length) return 'Ninguém ainda';
  return donos.map(u => nomePorUid[u] || 'alguém').join(', ');
}

/**
 * A ordem na bolsa do jogador: o que é só dele primeiro.
 *
 * O item pessoal é o que distingue o personagem dele dos outros, e é o que
 * ele procura quando abre. O da mesa todo mundo sabe que tem.
 */
export function bolsaDe(itens) {
  return (itens || [])
    .filter(i => i && String(i.nome || '').trim())
    .sort((a, b) =>
      (alcanceDe(a) === 'mesa') - (alcanceDe(b) === 'mesa')
      || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
}

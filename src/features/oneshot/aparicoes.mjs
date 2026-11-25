/**
 * APARIÇÕES — O QUE O MESTRE MOSTRA
 *
 * Numa mesa de terror, metade do efeito é o tempo. O Mestre prepara as
 * imagens antes da sessão — o item, a página do diário, o corredor, a coisa —
 * e revela quando a cena chega. O que não foi revelado não existe para a mesa.
 *
 * Por isso revelar é um estado do documento, e não um clique que manda a
 * imagem para outro lugar: o Mestre pode esconder de novo, e a mesma aparição
 * serve a duas cenas.
 *
 * A liberação segue a mesma forma do mural e dos documentos — liberadoParaTodos
 * ou uma lista de uids — porque é o que as regras do servidor já sabem checar
 * e o que `observarLiberados` já sabe consultar.
 */

export const TIPOS_DE_APARICAO = Object.freeze([
  { id: 'criatura', nome: 'Criatura', icone: '☾', resumo: 'O que está ali com eles.' },
  { id: 'cenario', nome: 'Cenário', icone: '▣', resumo: 'O lugar, visto de dentro.' },
  { id: 'item', nome: 'Item', icone: '◈', resumo: 'O objeto na mão de alguém.' },
  { id: 'pagina', nome: 'Página', icone: '▤', resumo: 'Diário, carta, recorte, laudo.' },
  { id: 'simbolo', nome: 'Símbolo', icone: '✧', resumo: 'A marca que se repete.' },
  { id: 'vulto', nome: 'Vulto', icone: '◐', resumo: 'O que mal se vê — e é pior por isso.' },
]);

/* ═══════════════════════════════════════════════════════════════════════
   QUEM VÊ A APARIÇÃO

   Três alcances, e o Mestre escolhe um: NINGUÉM (ele ainda está montando),
   A MESA (todos veem) ou ALGUNS (só quem ele apontar).

   A parte que não é óbvia é POR QUE existem quatro campos para três
   estados. É que dois deles não são escolha, são consequência:

     `alcance` e `plateia` — o que o Mestre QUER. Ninguém consulta.
     `liberadoParaTodos` e `liberadoPara` — o que o banco OBEDECE.

   A tela do jogador não filtra nada em JavaScript: ela pergunta ao
   Firestore por `liberadoParaTodos == true` e por `liberadoPara`
   contendo o uid dele. Ou seja, quem está em `liberadoPara` RECEBE o
   documento, ponto — esconder no código não esconderia nada.

   Daí a separação. `plateia` guarda a escolha de pessoas mesmo enquanto o
   alcance é "ninguém", e `liberadoPara` só é preenchido quando o alcance é
   "alguns". Assim o Mestre pode montar a plateia com calma, deixar em
   ninguém, e soltar depois sem remontar a lista — que era o que acontecia
   antes, porque recolher apagava a seleção junto.
   ═══════════════════════════════════════════════════════════════════════ */

export const ALCANCES = Object.freeze([
  { id: 'ninguem', nome: 'Ninguém', resumo: 'Só você. Nada sai daqui.' },
  { id: 'mesa', nome: 'A mesa', resumo: 'Todos veem, agora.' },
  { id: 'alguns', nome: 'Alguns', resumo: 'Só quem você apontar.' },
]);

export const ehAlcance = id => ALCANCES.some(a => a.id === String(id));

/**
 * O alcance de uma aparição.
 *
 * Aparição antiga não tem o campo, então ele é deduzido do efeito — é o que
 * mantém o que já está na mesa funcionando sem conversão nenhuma.
 */
export function alcanceDa(aparicao) {
  if (ehAlcance(aparicao?.alcance)) return String(aparicao.alcance);
  if (aparicao?.liberadoParaTodos === true) return 'mesa';
  if (Array.isArray(aparicao?.liberadoPara) && aparicao.liberadoPara.length) return 'alguns';
  return 'ninguem';
}

/** A plateia escolhida, mesmo que agora não esteja valendo. */
export function plateiaDa(aparicao) {
  if (Array.isArray(aparicao?.plateia)) return aparicao.plateia.map(String);
  // Aparição antiga: quem estava liberado era a plateia.
  if (Array.isArray(aparicao?.liberadoPara)) return aparicao.liberadoPara.map(String);
  return [];
}

/**
 * Aplica alcance e plateia aos campos que o banco realmente obedece.
 *
 * Tudo que muda quem vê passa por aqui. Escrever `liberadoPara` à mão em
 * qualquer outro lugar é como o vazamento acontece.
 */
function comEfeito(aparicao, alcance, plateia) {
  const quais = [...new Set((plateia || []).map(String).filter(Boolean))];
  return {
    ...aparicao,
    alcance,
    plateia: quais,
    liberadoParaTodos: alcance === 'mesa',
    liberadoPara: alcance === 'alguns' ? quais : [],
  };
}

export const aparicaoNova = (tipo = 'criatura') => comEfeito({
  tipo: String(tipo),
  titulo: '',
  descricao: '',
  imagem: '',
  criadoEm: Date.now(),
  // Nasce escondida, sempre. Aparição que nasce revelada estraga a cena antes
  // de ela existir — e é o erro que não dá para desfazer numa mesa de terror.
}, 'ninguem', []);

/** Está à vista de alguém? */
export const estaRevelada = aparicao => {
  const alcance = alcanceDa(aparicao);
  if (alcance === 'mesa') return true;
  return alcance === 'alguns' && plateiaDa(aparicao).length > 0;
};

/** Trocar o alcance, sem perder a plateia já escolhida. */
export const comAlcance = (aparicao, alcance) =>
  comEfeito(aparicao, ehAlcance(alcance) ? String(alcance) : 'ninguem', plateiaDa(aparicao));

/** Revelar para a mesa inteira, ou recolher para ninguém. */
export const revelarParaTodos = (aparicao, revelar) =>
  comAlcance(aparicao, revelar ? 'mesa' : 'ninguem');

/**
 * Pôr ou tirar uma pessoa da plateia.
 *
 * Marcar alguém já muda o alcance para "alguns": apontar uma pessoa e a
 * aparição continuar invisível para ela seria a pior surpresa possível no
 * meio de uma cena.
 */
export function alternarPessoa(aparicao, uid) {
  const alvo = String(uid || '');
  if (!alvo) return aparicao;
  const atual = plateiaDa(aparicao);
  const tem = atual.includes(alvo);
  const nova = tem ? atual.filter(u => u !== alvo) : [...atual, alvo];
  // Tirar o último da lista volta para "ninguém": alcance "alguns" sem
  // ninguém dentro é um estado que não quer dizer nada.
  return comEfeito(aparicao, nova.length ? 'alguns' : 'ninguem', nova);
}

/** Quem vê isto, dito em palavras para o Mestre conferir de relance. */
export function quemVe(aparicao, nomePorUid = {}) {
  const alcance = alcanceDa(aparicao);
  if (alcance === 'mesa') return 'A mesa inteira';
  const lista = alcance === 'alguns' ? plateiaDa(aparicao) : [];
  if (!lista.length) return 'Ninguém ainda';
  return lista.map(uid => nomePorUid[uid] || 'alguém').join(', ');
}

export const tipoDaAparicao = id =>
  TIPOS_DE_APARICAO.find(t => t.id === id) || TIPOS_DE_APARICAO[0];

/**
 * A APARIÇÃO PREGADA NO MURAL
 *
 * Revelar mostra a imagem na aba das Aparições, e ali ela fica — uma de cada
 * vez, isolada. No mural ela vira outra coisa: um cartão que a mesa arrasta,
 * liga a outros por barbante e mantém à vista enquanto discute. É a diferença
 * entre "olhem isto" e "isto é a terceira vez que esse símbolo aparece".
 *
 * Não copia nem move: cria um cartão que aponta para a aparição, com a MESMA
 * plateia. Pregar não pode virar atalho para revelar o que estava escondido —
 * é a mesma regra dos documentos, pelo mesmo motivo.
 *
 * `origemAparicao` é o que impede pregar duas vezes a mesma coisa.
 */
export function cartaoDeAparicao(aparicao, { id, x = 0.4, y = 0.4 } = {}) {
  if (!aparicao) return null;
  const tipo = tipoDaAparicao(aparicao.tipo);
  return {
    id: String(id || `c${Date.now().toString(36)}`),
    // Com imagem é fotografia; sem, é pista — que é o tipo do mural feito
    // para pedaço de informação que se liga a outros.
    tipo: aparicao.imagem ? 'fotografia' : 'pista',
    titulo: String(aparicao.titulo || tipo.nome),
    texto: String(aparicao.descricao || ''),
    imagem: String(aparicao.imagem || ''),
    x, y,
    /* O cartão herda a MESMA plateia da aparição — e pela mesma derivação,
       e não copiando os campos crus: se o cálculo de quem vê mudar um dia,
       ele muda nos dois lugares de uma vez. Pregar no mural uma aparição
       que só um primo viu não pode mostrá-la aos outros. */
    alcance: alcanceDa(aparicao),
    plateia: plateiaDa(aparicao),
    liberadoParaTodos: alcanceDa(aparicao) === 'mesa',
    liberadoPara: alcanceDa(aparicao) === 'alguns' ? plateiaDa(aparicao) : [],
    origemAparicao: String(aparicao.id || ''),
    criadoEm: Date.now(),
  };
}

/** Esta aparição já está pregada? */
export const jaNoMural = (aparicao, cartoes) =>
  Boolean(aparicao?.id) && (Array.isArray(cartoes) ? cartoes : [])
    .some(c => String(c?.origemAparicao || '') === String(aparicao.id));

/**
 * OS ESCONDERIJOS MARCADOS
 *
 * O Mestre aponta, antes ou durante a cena, os lugares da casa onde dá para
 * se enfiar: atrás do armário do sótão, embaixo da mesa coberta, no vão da
 * escada. No mapa aparece um ponto branco minúsculo, como uma estrela — e
 * ele PULSA por dois segundos no instante em que é posto.
 *
 * O pulso é o recado; a estrela é a lembrança. Se tudo ficasse pulsando o
 * tempo todo, o mapa viraria um painel de avisos e o olho pararia de
 * registrar qualquer um deles. Dois segundos é quanto basta para a pessoa
 * virar a cabeça, e curto o bastante para não competir com a narração.
 *
 * O ponto não diz se o esconderijo é bom. Só diz "aqui tem alguma coisa" —
 * o resto o Mestre fala, e a dúvida é metade da cena.
 */

/** Quanto o pulso dura. O limite que Gabriel pediu, em milissegundos. */
export const DURACAO_DO_PULSO = 2000;

/* Dois pontos a menos de 1,5% de distância são, na prática, o mesmo lugar:
   cliques repetidos num mapa grande ficam assim. Sem isto, um toque trêmulo
   deixa três estrelas empilhadas no mesmo armário. */
const PERTO_DEMAIS = 1.5;

const emFaixa = n => Math.max(0, Math.min(100, Number(n) || 0));

/** Uma marca nova, nas coordenadas percentuais do mapa. */
export function marcaNova({ x, y, mapa, por = '', agora = Date.now() }) {
  const onde = String(mapa || '').trim();
  if (!onde) return null;
  return {
    x: Math.round(emFaixa(x) * 100) / 100,
    y: Math.round(emFaixa(y) * 100) / 100,
    mapa: onde,
    por: String(por || ''),
    em: Number(agora) || 0,
  };
}

/** Se o pulso dessa marca ainda está correndo. */
export function aindaPulsando(marca, agora = Date.now()) {
  if (!marca?.em) return false;
  const passou = (Number(agora) || 0) - Number(marca.em);
  return passou >= 0 && passou < DURACAO_DO_PULSO;
}

/** As marcas de um mapa, sem as que caem em cima de outra. */
export function marcasDoMapa(marcas, mapaId) {
  const onde = String(mapaId || '');
  if (!onde) return [];
  const boas = [];
  for (const m of marcas || []) {
    if (!m || String(m.mapa || '') !== onde) continue;
    if (!Number.isFinite(Number(m.x)) || !Number.isFinite(Number(m.y))) continue;
    const repetida = boas.some(b =>
      Math.hypot(Number(b.x) - Number(m.x), Number(b.y) - Number(m.y)) < PERTO_DEMAIS);
    if (!repetida) boas.push(m);
  }
  return boas;
}

/** A marca mais próxima de um ponto, para o Mestre poder tirar com um toque. */
export function marcaEm(marcas, { x, y }, mapaId) {
  let perto = null;
  let menor = Infinity;
  for (const m of marcasDoMapa(marcas, mapaId)) {
    const d = Math.hypot(Number(m.x) - emFaixa(x), Number(m.y) - emFaixa(y));
    if (d < menor) { menor = d; perto = m; }
  }
  // O raio de acerto é maior que o ponto desenhado: a estrela tem 6px e
  // ninguém acerta 6px com o dedo num mapa inteiro na tela.
  return menor <= PERTO_DEMAIS * 2 ? perto : null;
}

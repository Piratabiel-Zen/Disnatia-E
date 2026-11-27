import { mapaPorId } from './mapasDaCasa.mjs';
import { atmosferaComPressao } from './pressaoDaNoite.mjs';
import './atmosfera-da-casa.css';

/**
 * A ATMOSFERA POR CIMA DO MAPA
 *
 * Recebe o mapa e a fase da noite e empilha as camadas. O mapa base não é
 * tocado: todas elas são desenhadas em cima, e é isso que permite trocar a
 * imagem de um andar sem refazer atmosfera nenhuma.
 *
 * A tradução de "efeito que o guia nomeou" para "camada que existe" mora
 * AQUI e em nenhum outro lugar. Um efeito que o guia cita e que ainda não
 * tem camada simplesmente não desenha — mapa novo entra sem quebrar tela, e
 * o que falta aparece no teste, não na mesa.
 */
const CAMADA_DO_EFEITO = {
  /* luzes */
  'luar-pulso': 'atm-luar',
  'luar-desliza': 'atm-luar',
  'feixe-luar': 'atm-feixe',
  'lampiao-portao': 'atm-lampiao',
  'lustre-tremor': 'atm-lustre',
  'corredor-apaga': 'atm-lustre',
  'vela-respira': 'atm-velas',
  'vela-tremula': 'atm-velas',
  'vela-caos': 'atm-velas',
  'lareira-danca': 'atm-lareira',
  'caldeira-brasa': 'atm-caldeira',
  'lampada-instavel': 'atm-instavel',
  'brasa-altar': 'atm-altar',
  'selo-acende': 'atm-altar',
  'luz-balanca': 'atm-balanca',
  'gerador-faisca': 'atm-faisca',
  'agua-reflexo': 'atm-agua',
  /* névoa */
  'nevoa-rasteira': 'atm-nevoa',
  'nevoa-porao': 'atm-nevoa',
  'porta-nevoa': 'atm-nevoa',
  /* sombras */
  'sombra-arvore': 'atm-arvore',
  'sombra-teto': 'atm-sombras',
  'sombra-raiz': 'atm-sombras',
  'sombra-prateleira': 'atm-sombras',
  'sombra-avanca': 'atm-avanca',
  'vinheta-escura': null, // a escuridão já é vinheta; não precisa de camada própria
  'poeira-flutua': 'atm-poeira',
  'brilho-chuva': 'atm-chuva',
  'chuva-reflexo': 'atm-chuva',
  /* a aparição é camada temporária e não entra na pilha fixa */
  'aparicao-surge': null,
};

export const camadaDoEfeito = nome => CAMADA_DO_EFEITO[nome] ?? null;

/* QUAIS CAMADAS SÃO LUZ.
   Só elas ganham o brilho da hora. Névoa, sombra, poeira e chuva não são
   fonte de luz, e clarear isso junto deixaria a casa mais VISÍVEL conforme
   a noite avança, que é o contrário do que a noite faz. */
export const LUZES = new Set([
  'atm-luar', 'atm-feixe', 'atm-lampiao', 'atm-lustre', 'atm-velas',
  'atm-lareira', 'atm-caldeira', 'atm-instavel', 'atm-altar',
  'atm-balanca', 'atm-faisca',
]);

export default function AtmosferaDaCasa({
  mapa: idDoMapa, fase, apagao = false,
  // O quanto a mesa está mal, de 0 a 1. Soma à hora e nunca clareia.
  pressao = 0,
}) {
  const mapa = mapaPorId(idDoMapa);
  if (!mapa) return null;
  const atm = atmosferaComPressao(fase, pressao);

  // Uma camada por efeito, sem repetir: dois efeitos do mesmo mapa podem
  // cair na mesma camada (vela-respira e vela-caos são as duas velas), e
  // desenhar duas vezes só dobra a opacidade sem acrescentar nada.
  const camadas = [...new Set(
    (mapa.efeitos || []).map(camadaDoEfeito).filter(Boolean),
  )];

  return (
    <div
      className="atm"
      aria-hidden="true"
      data-mapa={mapa.id}
      data-fase={atm.fase}
      data-apagao={apagao ? '' : undefined}
      data-pulso=""
      data-respira=""
      style={{
        '--atm-escuridao': atm.escuridao,
        '--atm-nevoa': atm.nevoa,
        '--atm-sombras': atm.sombras,
        '--atm-pulso': atm.instabilidade,
        '--atm-pressao': atm.pressao * 0.58,
        '--atm-noite': atm.escuridao * 0.86,
        '--atm-brilho': atm.brilho,
        '--atm-tremor': atm.tremor,
      }}
    >
      {/* A escuridão vem primeiro e por baixo das luzes: luz desenhada
          embaixo do véu não ilumina nada.

          São DUAS camadas, e a segunda existe por um erro: a primeira é
          vinheta — escura nas bordas, transparente no meio — então subir a
          escuridão da hora escurecia a moldura e deixava o miolo da casa
          aceso. A hora passava e a sala continuava a mesma. `atm-noite` é
          chapada: cobre tudo por igual, e é ela que faz a casa afundar. Fica
          por baixo das luzes, que compõem em `screen` e por isso continuam
          cortando o escuro — lâmpada acesa dentro de quarto escuro, que é o
          que se quer ver. */}
      <i className="atm-escuridao" />
      <i className="atm-noite" />
      {/* AS LUZES VÃO TODAS NUM INVÓLUCRO SÓ, e isso é desempenho puro.

          Antes cada luz carregava o seu próprio `mix-blend-mode:screen` e
          o seu próprio `filter` de brilho. Num mapa com dez efeitos, isso
          são dez camadas do tamanho da tela, cada uma rasterizada num
          buffer à parte, filtrada e depois lida contra tudo que está
          embaixo — a cada quadro. Medido aqui, era o item mais caro da
          cena inteira, de longe.

          Agora o grupo mistura uma vez. As luzes se somam entre si lá
          dentro em composição normal, o que para gradientes que mal se
          tocam dá no mesmo, e o resultado inteiro entra em `screen`
          contra o mapa — que é o que precisava acontecer e continua
          acontecendo. */}
      {camadas.some(c => LUZES.has(c)) && (
        <div className="atm-luzes">
          {camadas.filter(c => LUZES.has(c)).map(c => <i key={c} className={c} />)}
        </div>
      )}
      {camadas.filter(c => !LUZES.has(c)).map(c => <i key={c} className={c} />)}
      {/* A FALHA GERAL. Não é uma lâmpada piscando: é a casa inteira
          vacilando por um instante, que é o que se vê quando a rede cai e
          não quando um bulbo oscila. Fica por cima das luzes de propósito —
          engolir a luz é o efeito. */}
      <i className="atm-piscada" />
      {/* O que QUEBRA a constância: a sombra que atravessa de muito em muito
          tempo, e a marca da pressão da mesa. Atmosfera constante vira papel
          de parede em dois minutos, por mais bem feita que seja. */}
      <i className="atm-passagem" />
      <i className="atm-pressao" />
      <i className="atm-pressao-borda" />
    </div>
  );
}

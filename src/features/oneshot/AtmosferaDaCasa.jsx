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
      }}
    >
      {/* A escuridão vem primeiro e por baixo das luzes: luz desenhada
          embaixo do véu não ilumina nada. */}
      <i className="atm-escuridao" />
      {camadas.map(c => <i key={c} className={c} />)}
      {/* O que QUEBRA a constância: a sombra que atravessa de muito em muito
          tempo, e a marca da pressão da mesa. Atmosfera constante vira papel
          de parede em dois minutos, por mais bem feita que seja. */}
      <i className="atm-passagem" />
      <i className="atm-pressao" />
      <i className="atm-pressao-borda" />
    </div>
  );
}

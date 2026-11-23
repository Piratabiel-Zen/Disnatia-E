import BookMark3D from './BookMark3D';
import CrossMark3D from './CrossMark3D';
import SkullMark3D from './SkullMark3D';
import { sistemaDe } from '../core/sistemas/index.mjs';

/**
 * A MARCA DA MESA
 *
 * O objeto que flutua e gira ao lado do nome da campanha. Ele não é
 * decoração trocável: é a primeira coisa que diz em que mesa a pessoa
 * entrou, antes de ela ler o nome.
 *
 * Por isso quem escolhe é o sistema. A Dinastia E sai de um livro, então a
 * marca é um tomo. Uma mesa de CAIN é sobre exorcismo, então a marca é uma
 * cruz. Um sistema novo entra aqui como mais uma linha — e um sistema sem
 * marca própria fica com o tomo, que é o que já estava lá.
 */
const MARCAS = {
  cain: CrossMark3D,
  oneshot: SkullMark3D,
};

export default function MarcaDaMesa({ campaign }) {
  const Marca = MARCAS[sistemaDe(campaign).id] || BookMark3D;
  const nome = campaign?.name || 'Dinastia E';
  // O tomo tem sigilo gravado na capa; a cruz só mostra o sigilo se a mesa
  // escolheu um, porque uma cruz lisa já diz o que precisa dizer.
  const sigilo = Marca === BookMark3D ? (campaign?.sigil || '✦') : (campaign?.sigil || '');
  return <Marca sigil={sigilo} title={nome} />;
}

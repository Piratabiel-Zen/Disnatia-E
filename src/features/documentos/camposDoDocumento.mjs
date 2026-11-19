// OS CAMPOS DE CADA TIPO DE DOCUMENTO
//
// Fora do componente para poder ser testado: é a lista que garante que
// nenhum tipo fique sem os campos que a folha dele usa. Um jornal sem
// "nome do jornal" vira um retângulo com manchete, que é de onde a gente
// estava saindo.
//
// Nenhum campo é obrigatório. O Mestre preenche o que quiser e o que ficar
// vazio some da folha.

export const CAMPOS_POR_TIPO = Object.freeze({
  jornal: [
    { id: 'veiculo', rotulo: 'Nome do jornal', dica: 'A Gazeta de Terra Dourada' },
    { id: 'data', rotulo: 'Data da edição', dica: '14 de outubro' },
    { id: 'chamada', rotulo: 'Linha de apoio', dica: 'A frase menor sob a manchete' },
  ],
  carta: [
    { id: 'remetente', rotulo: 'De quem', dica: 'Quem assina' },
    { id: 'destinatario', rotulo: 'Para quem', dica: 'A quem é endereçada' },
    { id: 'data', rotulo: 'Data', dica: '' },
  ],
  foto: [
    { id: 'legenda', rotulo: 'Legenda', dica: 'O que se vê, ou o que dizem que se vê' },
    { id: 'data', rotulo: 'Quando', dica: '' },
  ],
  relatorio: [
    { id: 'referencia', rotulo: 'Referência', dica: 'CAIN-0094/TD' },
    { id: 'classificacao', rotulo: 'Classificação', dica: 'Confidencial' },
    { id: 'data', rotulo: 'Data', dica: '' },
  ],
  gravacao: [
    { id: 'suporte', rotulo: 'Suporte', dica: 'Fita, cilindro, rádio' },
    { id: 'duracao', rotulo: 'Duração', dica: '00:04:12' },
  ],
  objeto: [
    { id: 'recolhidoEm', rotulo: 'Recolhido em', dica: 'Onde foi achado' },
    { id: 'estado', rotulo: 'Estado', dica: 'Íntegro, partido, queimado' },
  ],
});

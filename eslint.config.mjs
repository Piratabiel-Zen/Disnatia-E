import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * ESLINT EXISTE AQUI POR UM MOTIVO ESPECÍFICO.
 *
 * Duas vezes o site abriu PRETO em produção pela mesma causa: um identificador
 * lido onde ele não existe. Uma foi um `const` usado acima da própria
 * declaração numa lista de dependências; a outra foi uma prop renomeada de
 * `podeEditar` para `podeMexer`, deixando três usos órfãos para trás.
 *
 * Nenhuma das duas é erro de sintaxe, então o build passava limpo. Nenhuma
 * aparecia nos testes, porque teste de unidade não renderiza a árvore. As duas
 * só apareciam quando a página rodava — e aí derrubavam a sessão inteira,
 * porque o componente quebrado morava na barra de cima.
 *
 * A configuração é deliberadamente curta. Não é para arrumar estilo: é para
 * pegar o que derruba a mesa no meio de uma sessão. Regra que não faz isso
 * fica de fora, senão o ruído faz o aviso de verdade passar batido.
 */
export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // A QUE DERRUBOU O SITE HOJE, E A ÚNICA QUE JÁ ESTÁ LIMPA.
      //
      // `podeEditar` virou `podeMexer` e três usos ficaram órfãos. Build
      // limpo, testes verdes, mural preto. Como error desde já: o código
      // está em zero, então qualquer um novo é de quem acabou de escrever.
      'no-undef': 'error',

      // AS DUAS HERDADAS. 33 e 16 ocorrências, quase todas na Dinastia E,
      // que está no ar e funcionando. Viram error quando a dívida for paga;
      // subir agora só ensinaria a ignorar a saída inteira.
      //
      // A primeira cobre o outro jeito de abrir a tela preta — um const lido
      // acima da declaração. Enquanto ela for aviso, quem guarda esse caso é
      // tests/dependencias-antes-da-hora.mjs, que olha só as listas de
      // dependências, onde o erro de fato acontece.
      'no-use-before-define': ['warn', { functions: false, classes: false, variables: true }],
      // Hook condicional troca a identidade dos estados entre renderizações:
      // a tela passa a mostrar o valor de outro campo, sem erro nenhum.
      'react-hooks/rules-of-hooks': 'warn',

      // Ruído que não derruba nada.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['tests/**/*.mjs', '*.config.{js,mjs}'],
    languageOptions: { globals: { ...globals.node } },
  },
];

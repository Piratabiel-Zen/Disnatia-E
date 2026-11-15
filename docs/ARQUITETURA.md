# Dinastia E: arquitetura do código

## Onde as coisas vivem

O site é um app React (Vite) com Firebase. **Tudo o que a Vercel compila está em `src/`.** Não existe mais geração de código em tempo de build: o `App.jsx` monolítico, a pasta `.generated/` e os ~85 scripts de patch foram aposentados em novembro de 2026, com o resultado deles consolidado como fonte (o build consolidado saiu byte a byte idêntico ao último build do pipeline antigo).

```
index.html                 entrada; carrega /src/main.jsx
src/main.jsx               monta <App/>
src/App.jsx                portão de acesso (PIN / ficha / visitante) e navegação por abas
src/AuthenticatedSession.jsx
                           casca da sessão: menu lateral, topo, página ativa, HUD, dados
src/core/                  firebase.js (config + Firestore), media.js (compressão), toast, ui
src/data/gameData.jsx      CLASSES, ARTEFATOS_DATA, RULES_DATA, ATMOSPHERES, PROLOGUE, MASTER_PIN
src/features/<pagina>/     uma pasta por aba: sheets, mapa-batalha, mapa-mundi, classes,
                           bestiario, inimigos, personagens, livro, cronicas, regras, prologue,
                           mesa-imersiva
src/experience/            camada imersiva compartilhada: ExperienceKit.jsx (provider +
                           navegação + HUD + mesa do mestre), GameExperience3.jsx (painéis
                           do jogador), dados físicos, replay de dados, câmeras, acesso
src/adventure/             tela inicial (AdventureSession), conselho, utilitários de
                           sincronização (sharedSnapshot, tokenPersistence, leases)
src/shell/                 player de som, widget de dados, toggle de mestre
src/styles/                global.css e livro.css
public/                    mídia estática (vídeo de fundo, arquivos do livro)
tests/                     node --test (unitários e de texto-fonte) + tests/browser (Playwright)
```

## Dados (Firestore, projeto `dinastia-e-a4b28`)

Coleções principais: `sheets` (fichas), `enemies`, `bestiario`, `npcs`, `visitors`,
`battlemaps` + `battlemap_tokens` + `battlemap_token_library` + `battlemap_fog` +
`battlemap_live_positions` + `battlemap_ping_live` + `battlemap_media_chunks`,
`combat_summons`, `combat_action_events`, `combat_effect_events`, `public_dice_events`,
`session_journal`, `atlas_discoveries`, `campaign_items`, `immersive_scenes`, `director_media`,
`livro_pages`/`livro_media`, `cronicas`/`ovas`/`ecom` (+ `_imgs`, `_media`, `_media_chunks`),
`class_covers`, `mapamundi_media`, `table_cameras`/`table_camera_calls`.
Documentos singleton em `config/*`: `session`, `combat`, `combat_state`, `atmosphere`,
`ambient`, `mapamundi`, `battlemap_active`, `cosmic_event`, `party_decision`, etc.

Não há Firebase Auth nem regras de segurança publicadas: o PIN e os filtros são
organização de interface, não autorização de servidor.

## Como trabalhar

- `npm run dev` para desenvolver, `npm run build` para compilar, `npm test` para os testes.
- Edite os arquivos em `src/` diretamente. Nada é regenerado.
- Mudanças chegam por branch + pull request; a Vercel publica um preview por branch e a
  `main` só recebe o que já foi testado na mesa.
- `docs/notas-runtime.md` guarda decisões históricas (câmeras WebRTC, visitantes,
  invocações, carregamento adiado da sessão) que continuam valendo.

## Canal vivo (Realtime Database)

O que é efêmero na mesa (posição do token durante o arraste, pings) trafega pelo
**Firebase Realtime Database** do mesmo projeto, em `live/maps/{mapId}/tokens/{tokenId}`
e `live/ping`, a até 30 atualizações por segundo. O Firestore continua guardando a
posição final (`position-final-v1`) e todo o resto. O módulo `src/core/liveChannel.js`
carrega o SDK só no mapa de batalha (chunk `vendor-live`) e, se o banco não responder
em 4 s, o mapa volta sozinho ao caminho antigo pelo Firestore.

Para ativar: Console do Firebase → Realtime Database → Criar banco de dados. Se a URL
gerada não for `https://dinastia-e-a4b28-default-rtdb.firebaseio.com`, defina a
variável `VITE_RTDB_URL` na Vercel com a URL mostrada no console. Regras do banco
(aba Regras), no mesmo nível de confiança do Firestore atual, que também não tem regras:

```json
{
  "rules": {
    "live": { ".read": true, ".write": true },
    "$outro": { ".read": false, ".write": false }
  }
}
```

## Campanhas

O site hospeda várias mesas. A escolha acontece antes do acesso, em
`src/features/campanhas/CampaignGate.jsx`, e a campanha ativa decide de onde cada
listener lê, através de `src/core/campaign.js`.

A **Dinastia E é a campanha principal e usa os caminhos originais** do Firestore
(`sheets`, `config/session`, `battlemaps`...), então nada foi migrado. Campanhas
novas recebem o prefixo `c__{id}__` no nome de cada coleção, o que as isola por
completo: fichas, mapas, crônicas e combate não se misturam.

Regra de uso no código: nunca chamar `collection(db, ...)` ou `doc(db, ...)`
diretamente. Use `col('sheets')` e `docIn('config','session')`, que resolvem o
caminho da campanha ativa. Para dados fora de qualquer campanha (a própria lista
de mesas) existem `globalCol` e `globalDoc`.

As chaves do `localStorage` seguem a mesma regra: a campanha principal mantém as
chaves atuais e as outras ganham sufixo, então entrar numa mesa não autentica em
outra. Cada campanha tem um tema (`CAMPAIGN_THEMES`) que define cor de acento e
fundo; a principal continua com a atmosfera controlada pelo Mestre.

## Globo do Mapa Múndi

O mapa raiz do atlas é o planeta inteiro e abre como um globo 3D
(`src/features/mapa-mundi/GlobeView.jsx`, three.js). Camadas internas do atlas
(continentes, cidades, masmorras) continuam planas, e há um botão para alternar
entre globo e mapa plano no mapa raiz.

Os pins **não mudaram de formato**: continuam guardados como porcentagem da
imagem (`x` e `y` de 0 a 100). Como a imagem é uma projeção equiretangular,
essa porcentagem já é longitude e latitude; `globeMath.mjs` faz a conversão nos
dois sentidos. Por isso o globo e o mapa plano mostram exatamente os mesmos
locais, e nada precisou ser migrado.

Detalhes que valem lembrar ao mexer:

- os pins são elementos HTML sobre o canvas, reposicionados a cada quadro; o
  canvas desenha só o planeta;
- a seleção de um local é por **proximidade na tela**, não pelo clique no
  elemento: o planeta pode girar entre apertar e soltar, e um alvo de 26px
  escaparia do cursor;
- a captura de ponteiro só começa quando o gesto vira arraste, senão o
  `pointerup` mudaria de alvo e o clique no pin nunca aconteceria;
- a deriva lenta do planeta pausa quando o ponteiro está sobre ele, e não existe
  para quem pediu menos animação no sistema;
- `vendor-three` é um pedaço separado de `vendor-dice-physics`: o globo não
  carrega a física dos dados junto.

`tests/browser/globe.cjs` abre o globo num navegador real e confere desenho,
rotação, o lado oculto, o clique no local e a devolução do contexto de vídeo ao
sair da página. Um canvas WebGL não pode ser lido de volta sem
`preserveDrawingBuffer`, então a conferência de pixels usa a tela capturada e o
decodificador em `tests/browser/png.cjs`.

## Dados arremessáveis

Os dados 3D usam `@3d-dice/dice-box-threejs` com resultado predeterminado: a
notação `3d20@4,19,7` força as faces, e é isso que garante que todos na mesa
vejam o mesmo número.

O arremesso com o mouse não muda esse contrato. `src/experience/useThrowGesture.js`
mede direção e velocidade do gesto, e `PhysicalDiceTray` troca o método
`startClickThrow` da instância — o único ponto onde a biblioteca sorteia a
direção do lançamento — por uma versão que usa o gesto. O resultado continua
vindo da notação; só o voo muda.

Sem gesto (clique simples, ou o replay do lance de outro jogador) o método
original volta a valer, então nada quebra quando o gesto não existe.

`tests/browser/dados.cjs` confere num navegador real que o clique simples
continua rolando, que a direção acompanha o lance nos dois eixos, que um lance
rápido tem mais força que um lento e que um movimento mínimo é tratado como
toque, não como arremesso.

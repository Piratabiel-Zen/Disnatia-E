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

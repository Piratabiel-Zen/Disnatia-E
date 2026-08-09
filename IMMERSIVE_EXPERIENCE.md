# Dinastia E — Camada de Experiência Imersiva

Esta camada foi desenhada para ser removível por recurso. O sistema antigo continua sendo gerado pelas features modulares; as novas experiências vivem principalmente em `src/experience/ExperienceKit.jsx` e `src/experience/experience.css`.

## Sistemas

### Grimório de Navegação
- Desktop: barra lateral expansível.
- Mobile: dock inferior + menu completo.
- Entrada inicial: `Sessão Atual`.

### Tela da Sessão
Lê `config/session`, `config/combat`, `config/ambient`, fichas e registros recentes. O jogador escolhe sua ficha uma vez e a escolha é mantida em `localStorage` (`dinastia_player_sheet`).

### HUD de Combate
Ativado quando `config/combat.active === true`. Mostra HP, VC, turno e três habilidades normais da classe. O uso rápido atualiza `sheets/{sheetId}` e respeita custo/cooldown.

### Barra Cinematográfica de Turnos
Usa `config/combat_state.initiative`, `turnIdx` e `round`. É exibida no Mapa de Batalha.

### Eventos Cósmicos
Documento: `config/cosmic_event`.

Campos principais:
- `id`
- `type`: `message | critical | temporal | void | heal | danger | ability`
- `text`
- `color`
- `icon`
- `ts`

### Diário Vivo
Coleção: `session_journal`.

Campos:
- `text`
- `type`
- `ts`
- `round`
- `memory`
- `icon`
- `color`
- `source`

O Mestre ativo transforma novas entradas do log de combate em registros do Diário usando IDs determinísticos (`combat_<timestamp>`) para evitar duplicação.

### Estados Visuais
A camada observa HP e `sheet.status`. Vida baixa gera vinheta sutil; vida crítica e condições ativas recebem feedback visual sem alterar a ficha.

### Atlas de Descobertas
Coleção: `atlas_discoveries`.

Campos:
- `name`
- `status`: `rumor | descoberto | visitado`
- `note`
- `session`
- `createdAt`
- `updatedAt`

### Soundscapes
Documento: `config/soundscape`.

Camadas procedurais geradas pelo Web Audio API:
- `rain`
- `wind`
- `fire`
- `whispers`
- `hum`

Os valores são de 0 a 100. Presets atuais: Silêncio, Catedral, Tempestade, Fogueira, Vazio Cósmico e Ruínas. O áudio só é inicializado após uma interação do usuário, respeitando as políticas de autoplay do navegador.

### Mesa do Mestre
Painel global disponível somente quando `masterMode` está ativo. Controla:
- contexto e início/fim da sessão;
- mapa ativo;
- próximo turno / encerramento de combate;
- atmosfera visual;
- soundscape;
- eventos cósmicos;
- Atlas;
- memórias manuais.

## Arquivos-chave

- `src/experience/ExperienceKit.jsx`: lógica e componentes.
- `src/experience/experience.css`: visual responsivo.
- `scripts/modular-app-source.jsx`: integra a camada ao shell principal.
- `scripts/build-modular.mjs`: valida a presença da camada e preserva a refatoração modular.

## Como remover apenas uma ideia no futuro

Cada recurso é um componente isolado dentro de `ExperienceKit.jsx`:
- navegação: `ImmersiveNavigation`
- sessão: `SessionDashboard`
- HUD: `CombatHud`
- turnos: `TurnRibbon`
- aura/condições: `CharacterStateAura`
- eventos: `CosmicEventLayer`
- diário: `JournalDrawer`
- atlas: `AtlasDiscoveryPanel`
- som: `SoundscapeLayer`
- Mestre: `MasterConsole`

`ExperienceLayer` apenas compõe esses elementos. Portanto, uma feature pode ser retirada sem desfazer as demais.

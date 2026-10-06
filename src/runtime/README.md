# Canonical interactive runtime

The files in this directory are authored source. `scripts/install-canonical-runtime.mjs` installs them after the legacy generator, preserving existing module imports. Edit these files for changes to the active player HUD, session provider, map, shell and audio. Do not edit `.generated/`, `src/App.generated.jsx`, or add string replacements to old patches for these modules.

The historical pipeline remains temporarily responsible for unmigrated pages, sheets and legacy CSS. This is an incremental migration, not a removal of all historical scripts. Keep dice physics, summon behavior and existing data schema unchanged when moving another module. Builds always start from disposable seeds; CI validates the final installed runtime.

Visitor access and sheets are now authored here too. `PlayerAccess.jsx` and
`features/sheets/SheetsPage.jsx` are installed after legacy patches. Visitor
accounts live in `visitors`; their normal-schema character documents remain in
`sheets` with `audience: visitor` and `visitorId`. The master manages them via
Visitors, below Enemies. No existing sheet is migrated or changed at deployment.

Visitors use the existing campaign PIN model, with salted PBKDF2 passwords and
live session invalidation on suspension/password rotation. Client-side filtering
and scoped queries organize the interface; they are NOT server authorization.
This repository currently has no Firebase Authentication or deployed rules
configuration. Do not describe this PIN gate as enforcing database privacy.

`SummonCombatRack` uses the same combat_summons records and provider actions as
the character sheet. It does not create a second HP/VC store. It appears only for
a player/visitor controlling a necromancer in the battle map. Resource clicks
update optimistically and are queued; release/store retain the existing behavior.

Validate with `npm run build`, `npm test` and the isolated
`tests/browser/visitors-summons.cjs` fixture. Fixture actions never use the real
Firebase campaign. Browser checks cover visitor account creation, multiple owned
characters, revoked access and summon release/resources/actions/store.

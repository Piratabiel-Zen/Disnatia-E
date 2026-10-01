# Canonical interactive runtime

The files in this directory are authored source. `scripts/install-canonical-runtime.mjs` installs them after the legacy generator, preserving existing module imports. Edit these files for changes to the active player HUD, session provider, map, shell and audio. Do not edit `.generated/`, `src/App.generated.jsx`, or add string replacements to old patches for these modules.

The historical pipeline remains temporarily responsible for unmigrated pages, sheets and legacy CSS. This is an incremental migration, not a removal of all historical scripts. Keep dice physics, summon behavior and existing data schema unchanged when moving another module. Builds always start from disposable seeds; CI validates the final installed runtime.

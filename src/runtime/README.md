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

### Optional tabletop cameras and map fullscreen

`TableCameras` is a small launcher; `TableCameraRoom` and the native WebRTC engine load only when opened. Joining starts as a viewer with no media permission request. Only **Ativar minha câmera** calls `getUserMedia`, always with `audio:false`, 320×180 ideal and 15fps. There is no recording. Eight joined participants is the mesh budget; each sender is limited to 200kbps per peer. More participants or relay guarantees need a managed SFU/relay service rather than expanding the mesh.

Firestore carries ephemeral participant records (`table_cameras`, latest 32, server timestamp heartbeat, 90-second expiry in UI) and SDP/ICE for uniquely identified peer sessions (`table_camera_calls`). It does not carry video. Leaving, closing the panel, changing authenticated session or pagehide closes peer connections, stops tracks and removes this client's records best effort. Old session IDs are never reused. The existing browser-only authentication limitations apply to signaling too; this does not establish server-enforced room membership.

Default ICE uses the Google STUN endpoints from the official WebRTC guide. Restricted NAT/firewalls can require TURN. Optional `VITE_CAMERA_ICE_SERVERS` accepts an RTCIceServer array, but credentials delivered to a browser are visible: use constrained/short-lived credentials. No account, billable provider, secret or TURN server has been provisioned. WAN connectivity must be tested with the actual participants' networks before claiming full coverage.

Camera positions are personal localStorage preferences. Names follow the selected player sheet, visitor account name or Mestre. The name strip below each video is draggable by pointer and movable with arrow keys; Organizar câmeras resets positions.

Map fullscreen requests the document root so dice portals, summon controls and optional cameras remain available. CSS expands only `.battlemap-viewport`; it does not alter maps/tokens or image coordinates. The image is contained without cropping/stretching and unused screen area has a static ambient background. Native denial/unsupported devices use browser expansion with an explicit notice. **Sair da tela cheia**, Escape, native exit and route unmount restore the view.

Validation: `tests/camera-peer.test.mjs` checks peer signaling/cleanup, identity and presence expiry; `tests/browser/cameras-fullscreen.cjs` exercises actual Chromium WebRTC with synthetic camera devices in the isolated Firestore fixture, pointer/keyboard placement, camera off/leave and native/fallback fullscreen. This never accesses a real webcam or campaign records.

### Opera camera visibility, compact camera menu and enemy token health

The legacy Opera hardening rule formerly hid **all** video elements. It now targets only the background movie; live camera tiles explicitly remain visible in safe mode. Streams retry playback on metadata/visibility readiness and provide a manual Reproduzir vídeo action if autoplay is denied, with a finite no-frames status. Local preview is shown as soon as capture succeeds instead of waiting for Firestore acknowledgement. The fixed upper-right launcher is icon-only at rest; hover/focus expands its label and the loaded controls. Joining folds the panel after pointer exit without stopping any camera; opening options does not create another room. Mobile supports tap and keyboard users can focus the controls.

Enemy tokens (enemyId or tipo=inimigo) own hp/maxHp with hpMode=individual. Enemy sheets remain templates, and player tokens keep their live sheet binding. The master snapshots legacy enemy HP once from the referenced sheet, preserving legacy explicit maxHp/HP including zero, via per-token field patches in the existing durable outbox. No map roster rewrite, expiry or deletion is introduced. Edits and undo touch only the selected token. Template changes and reloads do not reset token health. Master-only controls allow HP and maximum HP edits; players still receive the shared health bars.

Tests: token-vitals unit coverage plus tests/browser/enemy-token-hp.cjs verify six instances, two browser pages, HP/maxHP editing, rapid adjustments, undo, unchanged enemy template, persistence after reload and player read-only controls. The camera browser regression uses the generated Opera safe CSS with two synthetic camera streams, compact menu, autoplay recovery, media cleanup and full-screen map. This verifies the site's Opera-safe path in Chromium; it is not a claim that a physical Opera GX installation or a real user's camera permissions were tested.

### Deferred session loading

`App.jsx` owns the access screen and navigation state. `AuthenticatedSession.jsx`
loads after access is accepted and mounts the existing provider and interactive
surfaces together. The master battle console is a separate lazy chunk, requested
only for the master on the combat map. Keep the live listeners inside the session
boundary; do not preload the session from the gate or move event subscriptions
outside that boundary.

Vite-generated, content-hashed `/assets/` files use immutable browser caching.
This directory must remain reserved for generated assets with versioned names;
unversioned media stays in `/media/`. HTML retains Vercel's revalidation policy so
new releases select new asset URLs. No Firestore documents are cached by this rule.

Run `tests/browser/deferred-session.cjs` against the isolated fixture server to
check that login defers the session, players defer master controls, dice physics
stays on demand, and logout unmounts the HUD on desktop and mobile.

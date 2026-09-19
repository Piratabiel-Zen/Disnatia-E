import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const battleFile = path.join(root, 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
const cosmicFile = path.join(root, 'src', 'experience', 'CosmicLivingBackground.jsx');
const smoothFile = path.join(root, 'src', 'experience', 'performance-smooth.css');
const must = (ok, msg) => { if (!ok) throw new Error(`Live drag audit: ${msg}`); };

let battle = fs.readFileSync(battleFile, 'utf8');
must(battle.includes("channel: 'motion-v2'"), 'motion-v2 principal ausente');
must(battle.includes('const TOKEN_THROTTLE_MS = 33;'), 'cadência ~30 Hz ausente');
must(battle.includes('state.inFlight >= 3'), 'fast-path latest-only de 3 writes ausente');
must(battle.includes("channel: 'position-final-v1'"), 'checkpoint final ausente');
must(!battle.includes("battlemap_motion_"), 'canal espelho ainda presente no BattleMap');
must(!battle.includes("motion-mirror-v1"), 'payload espelho ainda presente no BattleMap');

// Fundo unificado entre navegadores, sem criar segundo canal de Firestore.
let cosmic = fs.readFileSync(cosmicFile, 'utf8');
const STAR_MARKER = 'cosmic-unified-starfield';
if (!cosmic.includes(STAR_MARKER)) {
  const anchor = '      <div className="cosmic-lite-stars cosmic-lite-stars-near" />';
  must(cosmic.includes(anchor), 'âncora das estrelas ausente');
  cosmic = cosmic.replace(anchor, `${anchor}\n      <div className="cosmic-unified-starfield"><i/><i/></div>`);
  fs.writeFileSync(cosmicFile, cosmic);
}

let smooth = fs.readFileSync(smoothFile, 'utf8');
const CSS_MARKER = '/* CROSS-PLATFORM VISUAL PARITY + SUBTLE CLARITY · 2026-09-14 */';
if (!smooth.includes(CSS_MARKER)) {
  smooth += `\n\n${CSS_MARKER}
.cosmic-unified-starfield{position:absolute;inset:0;z-index:4;overflow:hidden;pointer-events:none;opacity:.82}
.cosmic-unified-starfield>i{position:absolute;inset:-12%;display:block;pointer-events:none;background-repeat:repeat;transform:translate3d(0,0,0);will-change:auto}
.cosmic-unified-starfield>i:first-child{background-image:radial-gradient(circle,rgba(245,250,255,.78) 0 .9px,transparent 1.25px),radial-gradient(circle,rgba(155,196,244,.46) 0 .7px,transparent 1.05px);background-size:127px 127px,211px 211px;background-position:19px 31px,83px 117px;animation:cosmicUnifiedStarsA 34s linear infinite!important;opacity:.64}
.cosmic-unified-starfield>i:last-child{background-image:radial-gradient(circle,rgba(255,255,255,.92) 0 1.05px,rgba(166,211,255,.16) 1.35px,transparent 2.15px),radial-gradient(circle,rgba(199,184,255,.66) 0 .85px,transparent 1.25px);background-size:359px 359px,503px 503px;background-position:47px 103px,241px 37px;animation:cosmicUnifiedStarsB 49s linear infinite!important;opacity:.48}
@keyframes cosmicUnifiedStarsA{0%{transform:translate3d(-1.8%,-.8%,0)}50%{transform:translate3d(.9%,1.15%,0)}100%{transform:translate3d(2.6%,-.25%,0)}}
@keyframes cosmicUnifiedStarsB{0%{transform:translate3d(1.5%,-1.1%,0)}50%{transform:translate3d(-.7%,.7%,0)}100%{transform:translate3d(-2.4%,1.5%,0)}}
html.opera-gx-safe .cosmic-unified-starfield,html.opera-gx-safe .cosmic-unified-starfield>i{display:block!important}
`;
  fs.writeFileSync(smoothFile, smooth);
}

console.log('Dinastia E: movimento usa somente o canal principal latest-only; paridade visual preservada.');

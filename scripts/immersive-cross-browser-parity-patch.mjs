import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);

const CSS_MARKER = '/* IMMERSIVE MODE + DESKTOP CROSS-BROWSER PARITY 2026-09-20 */';

let adventureCss = read('src/adventure/adventure.css');
if (!adventureCss.includes(CSS_MARKER)) {
  adventureCss += `

${CSS_MARKER}
/* O seletor de qualidade controla somente a atmosfera de fundo. A estrutura,
   os HUDs e as ferramentas continuam idênticos em todos os navegadores. */
html[data-quality="light"] .cosmic-lite-nebula,
html[data-quality="light"] .cosmic-lite-vortex,
html[data-quality="light"] .cosmic-lite-stars,
html[data-quality="light"] .cosmic-unified-starfield,
html[data-quality="light"] .cosmic-bright-stars,
html[data-quality="light"] .cosmic-shooting-stars{
  display:none!important;
  animation:none!important;
}
html[data-quality="light"] .cosmic-living-bg,
html[data-quality="light"] .cosmic-dark-space,
html[data-quality="light"] .cosmic-living-vignette{
  animation:none!important;
  transform:none!important;
  filter:none!important;
}

/* Imersivo restaura as estrelas cadentes inclusive no Opera GX. O efeito usa
   apenas transform e opacity e mantém no máximo três meteoros simultâneos. */
html[data-quality="cinematic"] .cosmic-shooting-stars{
  display:block!important;
  pointer-events:none!important;
  overflow:hidden!important;
}
html[data-quality="cinematic"] .cosmic-shooting-star,
html[data-quality="cinematic"].opera-gx-safe .cosmic-shooting-star:nth-child(-n+3){
  display:block!important;
  animation:cosmicMeteorRightToLeft var(--meteor-duration) linear var(--meteor-delay) infinite!important;
  will-change:transform,opacity!important;
}
html[data-quality="cinematic"] .cosmic-shooting-star:nth-child(n+4){display:none!important}

/* Chrome, Edge, Firefox e Opera recebem a mesma árvore visual no desktop.
   Evita que content-visibility, contain ou a animação inicial do compositor
   colapsem a companhia, o Conselho, o Diário ou o HUD lateral. */
@media(min-width:901px){
  .immersive-content>.page-stage,
  .page-stage-session,
  .adventure-page,
  .ad-party,
  .ad-party-viewport,
  .ad-party-row,
  .ad-companion,
  .ad-portrait>img,
  .ad-action-dock,
  .ad-lower-grid,
  .ad-panel,
  .ad-director-bar,
  .g3-utility-rail,
  .session-card{
    content-visibility:visible!important;
    contain:none!important;
    visibility:visible!important;
  }
  .immersive-content>.page-stage{
    animation:none!important;
    transform:none!important;
    filter:none!important;
    opacity:1!important;
  }
  .ad-party-row{
    display:flex!important;
    min-height:90px;
    gap:10px;
    padding:2px 2px 6px;
    align-items:stretch;
  }
  .ad-party-viewport{
    min-height:94px;
    overflow-x:auto!important;
    overflow-y:visible!important;
  }
  .ad-companion{
    display:grid!important;
    flex:1 0 clamp(190px,18vw,206px)!important;
    min-width:190px!important;
    max-width:260px!important;
    min-height:82px;
    height:82px;
  }
  .ad-action-dock{display:grid!important}
  .ad-lower-grid{
    display:grid!important;
    grid-template-columns:minmax(0,1.12fr) minmax(0,1fr)!important;
    min-height:190px;
  }
  .ad-panel{display:block!important;min-height:190px}
  .ad-director-bar{display:flex!important}
  .g3-utility-rail{display:flex!important}
  .g3-utility-rail>button{display:flex!important}
}
`;
}
write('src/adventure/adventure.css', adventureCss);

let app = read('src/App.generated.jsx');
app = app.replace(
  'title="Modo leve reduz efeitos e usa dados sem física 3D; a sessão continua sincronizada"',
  'title="Alternar entre fundo estático e atmosfera imersiva com estrelas cadentes"',
);
if (!app.includes('Alternar entre fundo estático e atmosfera imersiva com estrelas cadentes')) {
  throw new Error('Cross-browser parity patch: quality control anchor missing');
}
write('src/App.generated.jsx', app);

console.log('Dinastia E: estrelas cadentes exclusivas do modo imersivo e paridade visual desktop entre navegadores aplicadas.');

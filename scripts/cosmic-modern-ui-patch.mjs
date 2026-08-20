import fs from 'node:fs';
import path from 'node:path';

const experienceFile = path.join(process.cwd(), 'src', 'experience', 'experience.css');
const accessFile = path.join(process.cwd(), 'src', 'experience', 'access.css');

const EXPERIENCE_MARKER = '/* COSMIC MODERN UI · 2026 */';
const ACCESS_MARKER = '/* COSMIC ACCESS MOTION · 2026 */';

const experienceStyles = `
${EXPERIENCE_MARKER}
:root{
  --cosmic-violet:#A855F7;
  --cosmic-violet-soft:rgba(168,85,247,.16);
  --cosmic-gold:#E8A020;
  --cosmic-cyan:#58D9FF;
  --cosmic-ease:cubic-bezier(.2,.8,.2,1);
  --cosmic-ease-spring:cubic-bezier(.16,1,.3,1);
}

@keyframes cosmicTopAurora{
  0%{transform:translate3d(-9%,0,0) scale(1);opacity:.24}
  50%{transform:translate3d(7%,3%,0) scale(1.08);opacity:.42}
  100%{transform:translate3d(14%,-2%,0) scale(1.03);opacity:.28}
}
@keyframes cosmicHeroBreath{
  0%,100%{background-position:0% 30%;box-shadow:0 28px 80px rgba(0,0,0,.34),inset 0 0 80px rgba(168,85,247,.025)}
  50%{background-position:100% 70%;box-shadow:0 32px 92px rgba(0,0,0,.42),0 0 38px rgba(122,58,210,.08),inset 0 0 105px rgba(168,85,247,.05)}
}
@keyframes cosmicMarkFloat{
  0%,100%{transform:translateY(0) rotate(0deg)}
  50%{transform:translateY(-3px) rotate(7deg)}
}
@keyframes cosmicFocusPulse{
  0%{box-shadow:0 0 0 0 rgba(168,85,247,.18)}
  100%{box-shadow:0 0 0 5px rgba(168,85,247,0)}
}

/* Microinterações globais sem substituir transforms específicos dos componentes */
button,input,textarea,select{
  transition:border-color .2s var(--cosmic-ease),background-color .2s var(--cosmic-ease),box-shadow .25s var(--cosmic-ease),filter .2s var(--cosmic-ease),opacity .2s var(--cosmic-ease),translate .18s var(--cosmic-ease),scale .16s var(--cosmic-ease);
}
:where(button,input,textarea,select):focus-visible{
  outline:2px solid rgba(168,85,247,.62);
  outline-offset:2px;
  box-shadow:0 0 0 4px rgba(168,85,247,.1),0 0 26px rgba(168,85,247,.12);
}
input:focus,textarea:focus,select:focus{
  border-color:rgba(168,85,247,.52)!important;
  background-color:rgba(255,255,255,.045)!important;
  box-shadow:0 0 0 4px rgba(168,85,247,.08),0 0 24px rgba(168,85,247,.08)!important;
}

@media (hover:hover) and (pointer:fine){
  button:not(:disabled):hover{translate:0 -2px;filter:brightness(1.08) saturate(1.07)}
  button:not(:disabled):active{translate:0 0;scale:.97;filter:brightness(.98)}
}

/* Topbar com aurora sutil, semelhante à linguagem viva do exemplo sem trocar a paleta */
.immersive-topbar{overflow:hidden;isolation:isolate;box-shadow:0 8px 34px rgba(0,0,0,.16)}
.immersive-topbar::before{
  content:'';position:absolute;z-index:-1;inset:-90% -15%;pointer-events:none;
  background:
    radial-gradient(circle at 18% 50%,rgba(88,217,255,.12),transparent 28%),
    radial-gradient(circle at 50% 45%,rgba(168,85,247,.22),transparent 34%),
    radial-gradient(circle at 82% 54%,rgba(232,160,32,.07),transparent 25%);
  filter:blur(18px);animation:cosmicTopAurora 11s ease-in-out infinite alternate;
}
.immersive-topbar .brand-mark{animation:cosmicMarkFloat 5s ease-in-out infinite;transition:box-shadow .3s var(--cosmic-ease),border-color .3s var(--cosmic-ease),scale .25s var(--cosmic-ease)}
.immersive-topbar .brand-line:hover .brand-mark{scale:1.08;border-color:rgba(168,85,247,.55);box-shadow:0 0 32px rgba(168,85,247,.24),inset 0 0 18px rgba(168,85,247,.08)}

/* Grimório lateral mais vivo e legível */
.grim-nav{backdrop-filter:blur(20px) saturate(1.08)}
.grim-link{overflow:hidden}
.grim-link::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 10%,rgba(255,255,255,.055) 48%,transparent 76%);transform:translateX(-125%);transition:transform .48s var(--cosmic-ease)}
.grim-link:hover::after{transform:translateX(125%)}
.grim-icon{transition:transform .24s var(--cosmic-ease-spring),filter .24s var(--cosmic-ease)}
.grim-link:hover .grim-icon{transform:translateX(2px) scale(1.12);filter:saturate(1.25) drop-shadow(0 0 8px currentColor)}
.grim-link.active .grim-icon{filter:saturate(1.3) drop-shadow(0 0 7px color-mix(in srgb,var(--accent) 45%,transparent))}
.grim-brand>span{animation:cosmicMarkFloat 6s ease-in-out infinite}

/* Dashboard inicial: cards respondem como objetos, sem virar um painel claro/moderno genérico */
.session-hero{background-size:165% 165%;animation:cosmicHeroBreath 13s ease-in-out infinite}
.session-card{transition:translate .28s var(--cosmic-ease-spring),border-color .28s var(--cosmic-ease),box-shadow .32s var(--cosmic-ease),background .28s var(--cosmic-ease);will-change:translate}
.session-card>header{transition:color .25s var(--cosmic-ease)}
.character-portrait,.peace-orb,.objective-glyph{transition:transform .3s var(--cosmic-ease-spring),filter .3s var(--cosmic-ease),text-shadow .3s var(--cosmic-ease)}
.journal-mini>div{transition:translate .2s var(--cosmic-ease),border-color .2s var(--cosmic-ease),background .2s var(--cosmic-ease)}
@media (hover:hover) and (pointer:fine){
  .session-card:hover{translate:0 -4px;border-color:rgba(168,85,247,.18);box-shadow:0 22px 54px rgba(0,0,0,.3),0 0 30px rgba(168,85,247,.055);background:linear-gradient(145deg,rgba(15,8,30,.9),rgba(6,3,14,.87))}
  .session-card:hover>header{color:#806d8c}
  .session-card:hover .character-portrait{transform:translateY(-2px) scale(1.035);filter:brightness(1.08) saturate(1.1)}
  .session-card:hover .peace-orb,.session-card:hover .objective-glyph{transform:translateY(-2px) scale(1.08);filter:brightness(1.15)}
  .journal-mini>div:hover{translate:3px 0;border-color:rgba(168,85,247,.12);background:rgba(168,85,247,.035)}
}

/* Elementos recorrentes das páginas ganham profundidade e feedback */
.prologue-cover,.class-illustration,.chronicles-memory,.access-character-strip button{
  transition:translate .28s var(--cosmic-ease-spring),scale .25s var(--cosmic-ease-spring),border-color .25s var(--cosmic-ease),box-shadow .3s var(--cosmic-ease),filter .25s var(--cosmic-ease);
}
@media (hover:hover) and (pointer:fine){
  .prologue-cover:hover,.class-illustration:hover{translate:0 -3px;box-shadow:0 18px 46px rgba(0,0,0,.38),0 0 28px rgba(168,85,247,.09);filter:brightness(1.035)}
  .chronicles-memory:hover{border-color:rgba(196,151,255,.42);box-shadow:0 14px 34px rgba(0,0,0,.42),0 0 22px rgba(124,58,237,.1)}
}

/* HUDs e consoles com vidro mais atual sem aumentar o ruído visual */
.combat-hud,.master-battle-console,.journal-drawer,.floating-sheet{
  backdrop-filter:blur(18px) saturate(1.08);
  -webkit-backdrop-filter:blur(18px) saturate(1.08);
}

/* Scrollbar com acabamento cósmico */
.immersive-content,.grim-groups,.access-character-strip,.hud-abilities{
  scrollbar-color:rgba(168,85,247,.34) transparent;
}
.immersive-content::-webkit-scrollbar-thumb,.access-character-strip::-webkit-scrollbar-thumb,.hud-abilities::-webkit-scrollbar-thumb{
  background:linear-gradient(180deg,rgba(168,85,247,.48),rgba(88,217,255,.18));
  border-radius:999px;
}

/* Responsividade: mais espaço útil e alvos de toque sem inflar o desktop */
@media(max-width:900px){
  .immersive-topbar{padding-left:14px;padding-right:12px}
  .session-page{padding-left:12px;padding-right:12px}
  .session-hero{border-radius:18px;min-height:235px}
  .session-card{border-radius:13px}
  .mobile-dock button{min-width:44px;min-height:44px}
  .immersive-topbar .brand-mark{animation-duration:7s}
}
@media(max-width:560px){
  .session-hero{padding:28px 14px;min-height:220px}
  .session-hero>p{font-size:13px}
  .session-hero-meta{gap:6px}
  .session-hero-meta span{font-size:8px;padding:5px 8px}
  .enter-session{min-height:42px;padding:10px 15px}
  .immersive-topbar h1{font-size:13px}
  .immersive-topbar small{display:none}
}

@media(prefers-reduced-motion:reduce){
  .immersive-topbar::before,.immersive-topbar .brand-mark,.grim-brand>span,.session-hero{animation:none!important}
  .session-card,.journal-mini>div,.grim-icon,button,input,textarea,select{transition-duration:.01ms!important}
}
`;

const accessStyles = `
${ACCESS_MARKER}
@keyframes accessCosmicBlob{
  0%{border-radius:43% 57% 62% 38% / 39% 42% 58% 61%;transform:translate3d(-8%,-6%,0) rotate(0deg) scale(1)}
  50%{border-radius:63% 37% 38% 62% / 55% 61% 39% 45%;transform:translate3d(5%,4%,0) rotate(8deg) scale(1.08)}
  100%{border-radius:38% 62% 55% 45% / 62% 38% 62% 38%;transform:translate3d(12%,-2%,0) rotate(-5deg) scale(.98)}
}
@keyframes accessPanelShine{
  0%{transform:translateX(-140%) rotate(8deg)}
  55%,100%{transform:translateX(180%) rotate(8deg)}
}
@keyframes accessSigilFloat{
  0%,100%{transform:translateY(0);filter:drop-shadow(0 0 8px rgba(168,85,247,.18))}
  50%{transform:translateY(-7px);filter:drop-shadow(0 0 18px rgba(168,85,247,.38))}
}
.access-gate{isolation:isolate;overflow:hidden}
.access-gate::before,.access-gate::after{content:'';position:absolute;z-index:0;pointer-events:none;filter:blur(10px);opacity:.36}
.access-gate::before{width:min(66vw,780px);height:min(66vw,780px);left:-18vw;top:-24vw;background:radial-gradient(circle at 38% 34%,rgba(88,217,255,.2),rgba(168,85,247,.18) 36%,rgba(91,44,140,.05) 62%,transparent 72%);animation:accessCosmicBlob 18s ease-in-out infinite alternate}
.access-gate::after{width:min(48vw,560px);height:min(48vw,560px);right:-14vw;bottom:-18vw;background:radial-gradient(circle at 48% 45%,rgba(232,160,32,.09),rgba(168,85,247,.16) 40%,transparent 70%);animation:accessCosmicBlob 23s ease-in-out -7s infinite alternate-reverse}
.access-stars,.access-panel{z-index:1}
.access-panel{isolation:isolate;overflow:hidden;backdrop-filter:blur(18px) saturate(1.08);-webkit-backdrop-filter:blur(18px) saturate(1.08);transition:border-color .3s var(--cosmic-ease),box-shadow .35s var(--cosmic-ease)}
.access-panel::before{content:'';position:absolute;z-index:-1;top:-35%;bottom:-35%;left:-28%;width:18%;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(255,255,255,.045),rgba(168,85,247,.07),transparent);filter:blur(7px);animation:accessPanelShine 8s ease-in-out infinite}
.access-panel:hover{border-color:rgba(168,85,247,.25);box-shadow:0 40px 110px rgba(0,0,0,.66),0 0 38px rgba(168,85,247,.06),inset 0 0 90px rgba(168,85,247,.03)}
.access-sigil{animation:accessSigilFloat 5.5s ease-in-out infinite}
.access-character-strip button{position:relative;overflow:hidden}
.access-character-strip button::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 18%,color-mix(in srgb,var(--char-color) 8%,transparent) 50%,transparent 77%);transform:translateX(-130%);transition:transform .5s var(--cosmic-ease)}
.access-character-strip button:hover::after{transform:translateX(130%)}
.access-character-strip button>span{transition:transform .3s var(--cosmic-ease-spring),box-shadow .3s var(--cosmic-ease),filter .3s var(--cosmic-ease)}
@media (hover:hover) and (pointer:fine){
  .access-character-strip button:hover{translate:0 -5px;border-color:color-mix(in srgb,var(--char-color) 48%,transparent);box-shadow:0 14px 32px rgba(0,0,0,.3),0 0 24px color-mix(in srgb,var(--char-color) 11%,transparent)}
  .access-character-strip button:hover>span{transform:scale(1.06);filter:brightness(1.08) saturate(1.08);box-shadow:0 0 24px color-mix(in srgb,var(--char-color) 15%,transparent)}
}
.access-enter{min-height:41px;box-shadow:0 8px 24px rgba(168,85,247,.08);transition:translate .22s var(--cosmic-ease),scale .18s var(--cosmic-ease),border-color .22s var(--cosmic-ease),box-shadow .28s var(--cosmic-ease),filter .22s var(--cosmic-ease)}
.access-enter:not(:disabled):hover{border-color:rgba(168,85,247,.58);box-shadow:0 12px 30px rgba(0,0,0,.22),0 0 30px rgba(168,85,247,.15)}
.access-field input{min-height:42px}
.access-selected{transition:border-color .25s var(--cosmic-ease),box-shadow .25s var(--cosmic-ease),background .25s var(--cosmic-ease)}
.access-selected:hover{border-color:color-mix(in srgb,var(--char-color) 34%,transparent);box-shadow:0 0 26px color-mix(in srgb,var(--char-color) 8%,transparent)}

@media(max-width:900px){
  .access-gate{padding:10px;overflow:auto}
  .access-panel{max-height:calc(100dvh - 20px);overflow:auto;padding-bottom:26px}
  .access-gate::before{width:92vw;height:92vw;left:-45vw;top:-28vw;opacity:.28}
  .access-gate::after{width:78vw;height:78vw;right:-36vw;bottom:-25vw;opacity:.24}
  .access-mode-tabs button{min-height:40px}
  .access-character-strip button{min-height:120px}
  .access-enter{min-height:44px}
}
@media(max-width:520px){
  .access-panel{border-radius:16px}
  .access-character-strip{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .access-character-strip button{padding:10px 7px}
}
@media(prefers-reduced-motion:reduce){
  .access-gate::before,.access-gate::after,.access-panel::before,.access-sigil{animation:none!important}
}
`;

function appendOnce(file, marker, styles){
  let source = fs.readFileSync(file, 'utf8');
  if (!source.includes(marker)) {
    source += `\n${styles}\n`;
    fs.writeFileSync(file, source);
  }
  const finalSource = fs.readFileSync(file, 'utf8');
  if (!finalSource.includes(marker)) throw new Error(`Cosmic modern UI: marcador ausente em ${path.basename(file)}`);
}

appendOnce(experienceFile, EXPERIENCE_MARKER, experienceStyles);
appendOnce(accessFile, ACCESS_MARKER, accessStyles);

console.log('Dinastia E: microinterações, movimento cósmico e responsividade moderna aplicados sem alterar as mecânicas.');

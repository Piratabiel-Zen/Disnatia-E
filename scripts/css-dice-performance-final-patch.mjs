import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);

const diceComponent = `import { useEffect, useMemo, useRef, useState } from 'react';
import './physical-dice.css';

const SUPPORTED_SIDES = [4, 6, 8, 10, 12, 20];
const clampSide = value => SUPPORTED_SIDES.includes(Number(value)) ? Number(value) : 20;

function CssPhysicalDie({ value, sides, rollTs, index }) {
  const safeSides = clampSide(sides);
  const safeValue = Math.max(1, Math.min(safeSides, Number(value) || 1));

  return (
    <div
      className={\`css-physical-die css-d\${safeSides}\`}
      style={{ '--die-delay': \`\${index * 36}ms\` }}
      role="img"
      aria-label={\`D\${safeSides} com resultado \${safeValue}\`}
    >
      <div className="css-die-shadow" />
      <div className="css-die-tumbler" key={\`\${rollTs}-\${index}\`}>
        <span className="css-die-depth depth-4" />
        <span className="css-die-depth depth-3" />
        <span className="css-die-depth depth-2" />
        <span className="css-die-depth depth-1" />
        <span className="css-die-face" aria-hidden="true">
          <i className="facet facet-a" />
          <i className="facet facet-b" />
          <i className="facet facet-c" />
          <i className="facet facet-d" />
          <b>{safeValue}</b>
          <small>D{safeSides}</small>
        </span>
      </div>
    </div>
  );
}

export default function PhysicalDiceTray({
  sides = 20,
  finalValue = 1,
  finalValues,
  rollTs = 0,
  color = '#C8A8E8',
  total,
  bonus = 0,
  onSettled,
}) {
  const lastRollRef = useRef(0);
  const settledRef = useRef(onSettled);
  const [phase, setPhase] = useState('idle');

  const values = useMemo(() => {
    const source = Array.isArray(finalValues) && finalValues.length ? finalValues : [finalValue];
    return source.slice(0, 5).map(value => Number(value) || 1);
  }, [finalValues, finalValue]);

  useEffect(() => { settledRef.current = onSettled; }, [onSettled]);

  useEffect(() => {
    if (!rollTs || rollTs === lastRollRef.current) return undefined;
    lastRollRef.current = rollTs;
    setPhase('rolling');
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => {
      setPhase('settled');
      settledRef.current?.();
    }, reducedMotion ? 180 : 1120);
    return () => window.clearTimeout(timer);
  }, [rollTs]);

  const hasTotal = Number.isFinite(Number(total));
  const numericBonus = Number(bonus || 0);
  const diceTotal = values.reduce((sum, value) => sum + Number(value || 0), 0);

  return (
    <div className={\`physical-dice-tray phase-\${phase}\`} style={{ '--dice-accent': color }}>
      <div className="physical-dice-space">
        <div className="physical-dice-stars" />
        <div className="css-dice-stage">
          {values.map((value, index) => (
            <CssPhysicalDie
              key={\`\${rollTs}-\${index}\`}
              value={value}
              sides={sides}
              rollTs={rollTs}
              index={index}
            />
          ))}
        </div>
      </div>
      <div className="physical-dice-caption">
        <span>{values.length > 1 ? \`\${values.length}D\${clampSide(sides)}\` : \`D\${clampSide(sides)}\`}</span>
        <i />
        <small>
          {phase === 'rolling'
            ? 'em movimento'
            : phase === 'settled' && hasTotal
              ? \`total \${Number(total)}\${numericBonus ? \` (\${diceTotal} \${numericBonus >= 0 ? '+' : '−'} \${Math.abs(numericBonus)})\` : ''}\`
              : phase === 'settled' ? 'repouso alcançado' : 'pronto para rolar'}
        </small>
      </div>
    </div>
  );
}
`;

const diceCss = `/* DINASTIA E · DADOS FÍSICOS 3D EM CSS · SEM WEBGL */
.physical-dice-tray{width:100%;margin:14px auto 0;--dice-accent:#C8A8E8}
.physical-dice-space{position:relative;height:220px;border-radius:18px;overflow:hidden;border:1px solid rgba(200,168,232,.32);border-color:color-mix(in srgb,var(--dice-accent) 42%,rgba(255,255,255,.12));background:radial-gradient(circle at 50% 42%,rgba(200,168,232,.12),transparent 37%),radial-gradient(circle at 18% 18%,rgba(108,99,225,.16),transparent 34%),linear-gradient(180deg,#10111d,#05060d 76%);box-shadow:inset 0 -24px 38px rgba(0,0,0,.34),inset 0 0 42px rgba(200,168,232,.07),0 12px 30px rgba(0,0,0,.38);isolation:isolate}
.physical-dice-space::after{content:"";position:absolute;left:8%;right:8%;bottom:10%;height:18%;border-radius:50%;background:radial-gradient(ellipse,rgba(200,168,232,.12),transparent 70%);border-bottom:1px solid rgba(200,168,232,.18);pointer-events:none;z-index:0}
.physical-dice-stars{position:absolute;inset:0;pointer-events:none;opacity:.62;background-image:radial-gradient(circle at 8% 19%,rgba(255,255,255,.8) 0 1px,transparent 1.5px),radial-gradient(circle at 82% 12%,rgba(190,222,255,.72) 0 1px,transparent 1.5px),radial-gradient(circle at 69% 61%,rgba(218,194,255,.72) 0 1px,transparent 1.7px),radial-gradient(circle at 21% 74%,rgba(255,255,255,.56) 0 1px,transparent 1.5px),radial-gradient(circle at 91% 83%,rgba(255,255,255,.62) 0 1px,transparent 1.5px);z-index:0}
.css-dice-stage{position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;gap:clamp(5px,1.5vw,18px);padding:18px;perspective:760px;-webkit-perspective:760px;pointer-events:none}
.css-physical-die{position:relative;flex:0 0 auto;width:clamp(54px,10vw,86px);height:clamp(54px,10vw,86px);transform-style:preserve-3d;-webkit-transform-style:preserve-3d}
.css-die-tumbler{position:absolute;inset:0;transform-style:preserve-3d;-webkit-transform-style:preserve-3d;transform:rotateX(10deg) rotateY(-10deg);will-change:transform}
.css-die-face,.css-die-depth{position:absolute;inset:0;display:grid;place-items:center;-webkit-clip-path:var(--die-shape);clip-path:var(--die-shape);backface-visibility:hidden;-webkit-backface-visibility:hidden}
.css-die-depth{background:#090710;border:2px solid rgba(200,168,232,.32);border-color:color-mix(in srgb,var(--dice-accent) 42%,#08060d);box-shadow:inset 0 0 13px rgba(0,0,0,.66)}
.css-die-depth.depth-4{transform:translate3d(7px,8px,-18px);background:#07060b}
.css-die-depth.depth-3{transform:translate3d(5px,6px,-13px);background:#0b0810}
.css-die-depth.depth-2{transform:translate3d(3px,4px,-8px);background:#100c16}
.css-die-depth.depth-1{transform:translate3d(1px,2px,-4px);background:#17101e}
.css-die-face{overflow:hidden;transform:translateZ(1px);color:#f5ecff;border:2px solid rgba(200,168,232,.78);border-color:color-mix(in srgb,var(--dice-accent) 72%,white 12%);background:linear-gradient(145deg,rgba(255,255,255,.2),transparent 27%),conic-gradient(from 30deg at 50% 48%,#342441 0 16%,#17101f 16% 33%,#2b1e36 33% 50%,#110d18 50% 67%,#382649 67% 83%,#17101f 83%);box-shadow:inset 9px 10px 17px rgba(255,255,255,.055),inset -11px -13px 19px rgba(0,0,0,.56),0 0 22px rgba(200,168,232,.2)}
.css-die-face::after{content:"";position:absolute;inset:8%;-webkit-clip-path:var(--die-shape);clip-path:var(--die-shape);border:1px solid rgba(255,255,255,.1);box-shadow:inset 0 0 12px rgba(255,255,255,.04)}
.css-die-face b{position:relative;z-index:4;font:900 clamp(17px,3.2vw,27px)/1 Cinzel,serif;color:#f8f1ff;text-shadow:0 2px 2px #08050c,0 0 10px var(--dice-accent),0 0 2px #000;transform:translateY(-1px)}
.css-die-face small{position:absolute;z-index:4;bottom:19%;font:700 6px/1 Cinzel,serif;letter-spacing:.12em;color:rgba(255,255,255,.48);text-shadow:0 1px 2px #000}
.facet{position:absolute;z-index:2;display:block;width:72%;height:1px;left:14%;top:50%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);transform-origin:center;box-shadow:0 0 3px rgba(200,168,232,.16)}
.facet-a{transform:rotate(30deg)}.facet-b{transform:rotate(90deg)}.facet-c{transform:rotate(150deg)}.facet-d{width:50%;left:25%;top:28%;transform:rotate(-10deg)}
.css-die-shadow{position:absolute;left:12%;right:5%;bottom:-13px;height:19px;border-radius:50%;background:radial-gradient(ellipse,rgba(0,0,0,.75),rgba(0,0,0,.08) 68%,transparent);filter:blur(3px);transform:rotate(-4deg)}
.css-d4{--die-shape:polygon(50% 1%,3% 94%,97% 94%)}
.css-d6{--die-shape:polygon(9% 2%,91% 2%,98% 9%,98% 91%,91% 98%,9% 98%,2% 91%,2% 9%)}
.css-d8{--die-shape:polygon(50% 0,97% 50%,50% 100%,3% 50%)}
.css-d10{--die-shape:polygon(50% 0,97% 34%,79% 98%,21% 98%,3% 34%)}
.css-d12{--die-shape:polygon(27% 2%,73% 2%,98% 38%,88% 83%,50% 100%,12% 83%,2% 38%)}
.css-d20{--die-shape:polygon(50% 0,90% 18%,100% 59%,75% 94%,50% 100%,25% 94%,0 59%,10% 18%)}
.phase-rolling .css-die-tumbler{animation:cssPhysicalDieRoll 1.08s cubic-bezier(.17,.74,.18,1) both;animation-delay:var(--die-delay,0ms)}
.phase-rolling .css-die-shadow{animation:cssPhysicalShadow 1.08s ease-out both;animation-delay:var(--die-delay,0ms)}
.phase-rolling .physical-dice-space{border-color:rgba(200,168,232,.5);border-color:color-mix(in srgb,var(--dice-accent) 60%,transparent);box-shadow:inset 0 -24px 38px rgba(0,0,0,.34),0 0 25px rgba(200,168,232,.16),0 12px 30px rgba(0,0,0,.38)}
.physical-dice-caption{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:7px;font-family:Cinzel,serif}.physical-dice-caption span{font-size:8px;letter-spacing:.2em;color:#bba7cb}.physical-dice-caption i{width:3px;height:3px;border-radius:50%;background:var(--dice-accent);box-shadow:0 0 7px var(--dice-accent)}.physical-dice-caption small{font-size:8px;color:#746a7d;letter-spacing:.08em}
@keyframes cssPhysicalDieRoll{0%{transform:translate3d(110px,-80px,60px) rotateX(-32deg) rotateY(28deg) rotateZ(0deg) scale(.68)}27%{transform:translate3d(31px,26px,38px) rotateX(38deg) rotateY(-31deg) rotateZ(235deg) scale(1.08)}51%{transform:translate3d(-34px,-8px,24px) rotateX(-27deg) rotateY(34deg) rotateZ(438deg) scale(.93)}74%{transform:translate3d(11px,7px,13px) rotateX(22deg) rotateY(-22deg) rotateZ(615deg) scale(1.03)}100%{transform:translate3d(0,0,0) rotateX(10deg) rotateY(-10deg) rotateZ(720deg) scale(1)}}
@keyframes cssPhysicalShadow{0%{opacity:.08;transform:translate(80px,20px) scale(.42)}35%{opacity:.38;transform:translate(25px,2px) scale(.75)}70%{opacity:.22;transform:translate(-12px,8px) scale(.64)}100%{opacity:.7;transform:translate(0,0) scale(1)}}
@media(max-width:600px){.physical-dice-space{height:190px}.css-dice-stage{gap:4px;padding:12px}.css-physical-die{width:clamp(47px,15vw,64px);height:clamp(47px,15vw,64px)}}
@media(prefers-reduced-motion:reduce){.phase-rolling .css-die-tumbler,.phase-rolling .css-die-shadow{animation:none!important}.css-die-tumbler{transform:rotateX(9deg) rotateY(-9deg)}}
`;

const backgroundComponent = `import './cosmic-living-background.css';
import './performance-lite.css';
import './performance-smooth.css';

const BRIGHT_STARS = [
  ['8%','18%','4.8s','-1.2s','2px','#F7FBFF'],['17%','73%','7.1s','-4s','3px','#A9DCFF'],
  ['29%','37%','5.7s','-2s','2px','#C7B8FF'],['41%','11%','8.2s','-6s','3px','#E8F4FF'],
  ['54%','67%','6.3s','-3s','2px','#F7FBFF'],['63%','24%','4.9s','-2s','3px','#A9DCFF'],
  ['74%','82%','7.8s','-5s','2px','#C7B8FF'],['83%','43%','5.4s','-1s','3px','#E8F4FF'],
  ['91%','14%','8.7s','-7s','2px','#F7FBFF'],['96%','70%','6.8s','-3s','2px','#A9DCFF'],
];
const SHOOTING_STARS = [
  ['9%','22s','-7s','5vh','-4deg','150px','#EAF7FF'],
  ['37%','29s','-19s','-4vh','3deg','125px','#BFA8FF'],
  ['70%','35s','-11s','9vh','-2deg','165px','#7FE7FF'],
];

export default function CosmicLivingBackground({ variant = 'world', quality = 'light' }) {
  const gate = variant === 'gate';
  const immersive = quality === 'cinematic';

  return (
    <div className={\`cosmic-living-bg cosmic-lite-bg cosmic-dark-bg \${gate ? 'gate' : ''} \${immersive ? 'is-immersive' : 'is-static'}\`} aria-hidden="true">
      <div className="cosmic-dark-space" />
      <div className="cosmic-static-backdrop" />
      {immersive && <>
        <div className="cosmic-lite-nebula" />
        <div className="cosmic-lite-vortex" />
        <div className="cosmic-lite-stars cosmic-lite-stars-far" />
        <div className="cosmic-lite-stars cosmic-lite-stars-near" />
        <div className="cosmic-unified-starfield"><i/><i/></div>
        <div className="cosmic-bright-stars">
          {BRIGHT_STARS.map((star, index) => <i key={index} className="cosmic-bright-star" style={{'--star-left':star[0],'--star-top':star[1],'--star-duration':star[2],'--star-delay':star[3],'--star-size':star[4],'--star-color':star[5]}} />)}
        </div>
        <div className="cosmic-shooting-stars">
          {SHOOTING_STARS.map((meteor, index) => <i key={index} className="cosmic-shooting-star" style={{'--meteor-top':meteor[0],'--meteor-duration':meteor[1],'--meteor-delay':meteor[2],'--meteor-y':meteor[3],'--meteor-angle':meteor[4],'--meteor-length':meteor[5],'--meteor-color':meteor[6]}} />)}
        </div>
      </>}
      <div className="cosmic-living-vignette" />
    </div>
  );
}
`;

write('src/experience/PhysicalDiceTray.jsx', diceComponent);
write('src/experience/physical-dice.css', diceCss);
write('src/experience/CosmicLivingBackground.jsx', backgroundComponent);

const bgCssFile = 'src/experience/cosmic-living-background.css';
let bgCss = read(bgCssFile);
const bgMarker = '/* STATIC LIGHTWEIGHT BACKDROP 2026-09-20 */';
if (!bgCss.includes(bgMarker)) {
  bgCss += `

${bgMarker}
.cosmic-static-backdrop{position:absolute;inset:0;z-index:1;pointer-events:none;background-color:#080511;background-image:radial-gradient(circle at 16% 21%,rgba(255,255,255,.78) 0 1px,transparent 1.35px),radial-gradient(circle at 71% 14%,rgba(198,217,255,.66) 0 1px,transparent 1.45px),radial-gradient(circle at 84% 66%,rgba(220,194,255,.55) 0 1px,transparent 1.4px),radial-gradient(circle at 33% 78%,rgba(255,255,255,.48) 0 1px,transparent 1.3px),radial-gradient(ellipse at 20% 32%,rgba(68,45,106,.23),transparent 38%),radial-gradient(ellipse at 78% 61%,rgba(28,74,112,.16),transparent 41%),linear-gradient(145deg,#090512 0%,#04040c 54%,#0b0614 100%);background-size:173px 181px,229px 211px,263px 247px,311px 283px,100% 100%,100% 100%,100% 100%}
.cosmic-living-bg.is-static{background:#080511}
.cosmic-living-bg.is-static .cosmic-static-backdrop{opacity:1;animation:none!important;transform:none!important;filter:none!important}
.cosmic-living-bg.is-immersive .cosmic-static-backdrop{opacity:.72}
@media(prefers-reduced-motion:reduce){.cosmic-static-backdrop{animation:none!important}}
`;
}
write(bgCssFile, bgCss);

let app = read('src/App.generated.jsx');
app = app.replace('<CosmicLivingBackground variant="gate"/>', '<CosmicLivingBackground variant="gate" quality={quality}/>');
app = app.replace('<CosmicLivingBackground/>', '<CosmicLivingBackground quality={quality}/>');
if ((app.match(/CosmicLivingBackground[^>]+quality=\{quality\}/g) || []).length < 2) {
  throw new Error('CSS dice patch: quality prop anchors missing');
}
write('src/App.generated.jsx', app);

if (diceComponent.includes('@3d-dice') || diceComponent.includes('<canvas')) {
  throw new Error('CSS dice patch: heavy renderer still referenced');
}

console.log('Dinastia E: dado físico CSS, fundo estático leve e renderização imersiva sob demanda aplicados.');

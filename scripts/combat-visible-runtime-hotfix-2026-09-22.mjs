import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);
const must = (condition, message) => {
  if (!condition) throw new Error(`Combat visible runtime hotfix: ${message}`);
};
const replaceOnce = (source, before, after, label) => {
  must(source.includes(before), `${label} não encontrado`);
  return source.replace(before, after);
};
const replaceSection = (source, startMarker, endMarker, replacement, label) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  must(start >= 0 && end > start, `${label} não encontrado`);
  return source.slice(0, start) + replacement + source.slice(end);
};
const appendOnce = (source, marker, block) => source.includes(marker) ? source : `${source.trimEnd()}\n\n${block.trim()}\n`;

// O combate real usa CombatHud, não o g3-actionbar. As melhorias visíveis
// precisam existir nesta camada para não ficarem ocultas pelo CSS de combate.
const kitFile = 'src/experience/ExperienceKit.generated.jsx';
let kit = read(kitFile);
kit = replaceOnce(
  kit,
  "} from 'react';\nimport {\n  collection,",
  "} from 'react';\nimport { createPortal } from 'react-dom';\nimport {\n  collection,",
  'import de createPortal',
);

const runtimeComponents = `function CombatResourceOrb({value,max,color,label,className=''}){
  const safeMax=Math.max(1,Number(max)||1);
  const safeValue=clamp(Number(value||0),0,safeMax);
  const pct=clamp((safeValue/safeMax)*100,0,100);
  const surface=55-(pct*.5);
  const clipRef=useRef('combat_orb_'+Math.random().toString(36).slice(2,9));
  return <span className={'combat-resource-orb '+className} style={{'--orb-color':color}} aria-label={label+' '+safeValue+' de '+safeMax}>
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <defs><clipPath id={clipRef.current}><circle cx="30" cy="30" r="25"/></clipPath></defs>
      <circle className="combat-orb-shell" cx="30" cy="30" r="28"/>
      <circle className="combat-orb-depth" cx="30" cy="30" r="25"/>
      <rect className="combat-orb-liquid" x="5" y={surface} width="50" height={55-surface} clipPath={'url(#'+clipRef.current+')'}/>
      <g transform={'translate(0 '+surface+')'} clipPath={'url(#'+clipRef.current+')'}><path className="combat-orb-wave" d="M-18 0 Q-8 -4 2 0 T22 0 T42 0 T62 0 T82 0 V60 H-18 Z"/></g>
      <ellipse className="combat-orb-glint" cx="21" cy="17" rx="8" ry="4"/>
    </svg>
    <b>{safeValue}</b><small>{label}</small>
  </span>;
}

function CombatHotkeys({enabled}){
  useEffect(()=>{
    if(!enabled)return undefined;
    const onKey=event=>{
      if(event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
      const tag=String(event.target?.tagName||'').toLowerCase();
      if(['input','textarea','select'].includes(tag)||event.target?.isContentEditable)return;
      const index={'1':0,'2':1,'3':2,'4':3}[String(event.key||'')];
      if(index==null)return;
      const buttons=Array.from(document.querySelectorAll('.combat-action-abilities .combat-ability.hud-ability'));
      const button=buttons[index];
      if(!button||button.disabled)return;
      event.preventDefault();
      button.click();
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[enabled]);
  return null;
}

function FloatingDamageLayer(){
  const { selectedSheet }=useExperience();
  const [events,setEvents]=useState([]);
  const timers=useRef(new Set());
  useEffect(()=>{
    const normalize=value=>String(value||'').replace(/^[pe]_/, '');
    const removeLater=(id,delay)=>{
      const timer=window.setTimeout(()=>{
        timers.current.delete(timer);
        setEvents(previous=>previous.filter(item=>item.id!==id));
      },delay);
      timers.current.add(timer);
    };
    const receive=customEvent=>{
      const detail=customEvent?.detail||{};
      const diff=Number(detail.diff||0);
      if(!diff)return;
      const entityId=normalize(detail.entityId);
      const nodes=Array.from(document.querySelectorAll('[data-entity-id],[data-combat-entity-id]')).filter(node=>normalize(node.dataset.entityId||node.dataset.combatEntityId)===entityId);
      const visible=nodes.map(node=>({node,rect:node.getBoundingClientRect()})).filter(item=>item.rect.width>0&&item.rect.height>0&&item.rect.bottom>0&&item.rect.top<window.innerHeight);
      visible.sort((a,b)=>Number(b.node.classList.contains('combat-action-portrait'))-Number(a.node.classList.contains('combat-action-portrait'))||(b.rect.width*b.rect.height)-(a.rect.width*a.rect.height));
      const rect=visible[0]?.rect;
      const id=String(detail.id||nowId('floating_hp'));
      const row={...detail,id,diff,x:rect?rect.left+rect.width/2:window.innerWidth/2,y:rect?Math.max(40,rect.top+rect.height*.16):window.innerHeight*.42};
      setEvents(previous=>[...previous.slice(-7),row]);
      removeLater(id,1300);
      if(detail.death){
        window.dispatchEvent(new CustomEvent('dinastia:cosmic-live',{detail:{id:'death_'+entityId+'_'+String(detail.ts||Date.now()),type:'death',icon:'\\uD83D\\uDC80',text:String(detail.name||'Combatente')+' caiu em combate',color:'#E8193C',soft:false,ts:Number(detail.ts||Date.now())}}));
        if(entityId&&entityId===normalize(selectedSheet?.id)){
          document.documentElement.classList.add('g3-player-fallen');
          const deathTimer=window.setTimeout(()=>{timers.current.delete(deathTimer);document.documentElement.classList.remove('g3-player-fallen');},3000);
          timers.current.add(deathTimer);
        }
      }
    };
    window.addEventListener('dinastia:hp-change',receive);
    return()=>{
      window.removeEventListener('dinastia:hp-change',receive);
      timers.current.forEach(timer=>window.clearTimeout(timer));
      timers.current.clear();
      document.documentElement.classList.remove('g3-player-fallen');
    };
  },[selectedSheet?.id]);
  if(typeof document==='undefined'||!events.length)return null;
  return createPortal(<div className="combat-floating-damage-layer" aria-live="polite">{events.map(event=>{
    const value=Math.abs(Number(event.diff||0));
    const text=(Number(event.diff||0)>0?'+':'\\u2212')+value;
    return <span key={event.id} className={'combat-floating-damage '+(event.diff>0?'heal':'damage')+(event.critical?' critical':'')} style={{left:event.x,top:event.y}}>{text}</span>;
  })}</div>,document.body);
}

`;
kit = replaceOnce(kit, 'function CombatHud({ onNavigate }){', `${runtimeComponents}function CombatHud({ onNavigate }){`, 'componentes do HUD real');
kit = replaceOnce(
  kit,
  '  const { combat,combatState,selectedSheet,selectedClass,useQuickAbility,addJournal }=useExperience();',
  '  const { combat,combatState,selectedSheet,selectedClass,useQuickAbility,addJournal,masterMode }=useExperience();',
  'identidade do jogador no CombatHud',
);
kit = replaceOnce(
  kit,
  "  const vc=Number(selectedSheet.vigos||0);\n  const current=",
  "  const vc=Number(selectedSheet.vigos||0);\n  const maxVc=Math.max(8,Number(selectedSheet.vigos_max||selectedSheet.maxVigos||8));\n  const current=",
  'VC máximo do orbe',
);

const newCharacter = `  return <div className={\`combat-action-hud \${isMyTurn?'my-turn':''}\`} style={{'--combat-accent':selectedClass?.color||'#A855F7'}}>
    <CombatHotkeys enabled={!masterMode&&isMyTurn}/>
    <div className="combat-action-character">
      <div className="combat-action-orbs">
        <CombatResourceOrb value={hp} max={maxHp} color="#E8193C" label="HP" className="hp"/>
        <div className="combat-action-portrait g3-portrait g3-portrait-lg" data-entity-id={String(selectedSheet.id||'')} data-classe={String(selectedSheet.classe||'').toLowerCase()} title={'Ornamento de '+(selectedClass?.name||'classe')}>{selectedSheet.foto?<img src={selectedSheet.foto} alt=""/>:<span>{selectedClass?.icon||selectedSheet.nome?.[0]||'\u2726'}</span>}</div>
        <CombatResourceOrb value={vc} max={maxVc} color="#a855f7" label="VC" className="vc"/>
      </div>
      <div className="combat-action-identity"><small>{isMyTurn?'\u2726 SEU TURNO':\`VEZ DE \${current?.nome||'\u2014'}\`}</small><b>{selectedSheet.nome||'Personagem'}</b><span>{selectedClass?.icon||'\u2726'} {selectedClass?.name||'Classe'}</span>{!masterMode&&<span className="combat-hotkey-status">{isMyTurn?'ATALHOS 1\\u20134 ATIVOS':'1\\u20134 NO SEU TURNO'}</span>}</div>
    </div>`;
kit = replaceSection(
  kit,
  '  return <div className={`combat-action-hud',
  '\n\n    <div className="combat-action-abilities">',
  newCharacter,
  'orbes no CombatHud visível',
);
kit = replaceOnce(
  kit,
  `        return <button className="combat-ability hud-ability" key={key} disabled={disabled} onClick={()=>choose(a)} title={a.desc||a.descricao||''}>
          <span>{a._source==='custom'?'\u2726':selectedClass?.icon||'\u2726'}</span>`,
  `        return <button className="combat-ability hud-ability" key={key} disabled={disabled} onClick={()=>choose(a)} title={a.desc||a.descricao||''} aria-keyshortcuts={i<4?String(i+1):undefined}>
          {i<4&&<kbd>{i+1}</kbd>}<span>{a._source==='custom'?'\u2726':selectedClass?.icon||'\u2726'}</span>`,
  'rótulos dos atalhos reais',
);

const compactPulse = `function CombatActionPulse(){
  const [event,setEvent]=useState(null);
  const first=useRef(true);
  const joinedAt=useRef(Date.now());
  useEffect(()=>onSnapshot(doc(db,'config','combat_action'),snap=>{
    if(!snap.exists())return;
    const next=snap.data()||{};
    if(first.current){
      first.current=false;
      if(Number(next.ts||0)<joinedAt.current-1200)return;
    }
    if(!next.id)return;
    setEvent(next);
  },()=>{}),[]);
  useEffect(()=>{if(!event?.id)return undefined;const timer=window.setTimeout(()=>setEvent(null),2100);return()=>window.clearTimeout(timer);},[event?.id]);
  if(!event)return null;
  return <div className="combat-action-pulse compact" style={{'--action-color':event.color||'#A855F7'}}>
    <div className="combat-action-wave wave-a"/><div className="combat-action-wave wave-b"/>
    <div className="combat-action-pulse-core"><span className="combat-action-class-icon">{event.icon||'\u2726'}</span><strong>{event.abilityName||'Habilidade'}</strong></div>
  </div>;
}`;
kit = replaceSection(kit, 'function CombatActionPulse(){', '\n\nfunction TurnRibbon(){', compactPulse, 'pulso compacto de habilidade');
kit = replaceOnce(kit, '    <CharacterStateAura/>', '    <FloatingDamageLayer/>\n    <CharacterStateAura/>', 'camada global de dano flutuante');
write(kitFile, kit);

// Evita a camada duplicada que estava montada no HUD oculto.
const gameFile = 'src/experience/GameExperience3.adventure.jsx';
let game = read(gameFile);
game = replaceOnce(
  game,
  "    <CombatVitalFx ownSheetId={access?.role==='player'?String(access?.sheetId||selectedSheet?.id||''):''}/>\n",
  '',
  'remoção da camada de dano duplicada',
);
write(gameFile, game);

// Os tokens passam a informar qual ficha/inimigo representam. Assim, o número
// nasce sobre o alvo correto também para os demais jogadores.
const battleFile = 'src/features/mapa-batalha/BattleMapPage.jsx';
let battle = read(battleFile);
battle = replaceOnce(
  battle,
  `                    <div
                      key={token.id}
                      onPointerDown=`,
  `                    <div
                      key={token.id}
                      data-combat-entity-id={String(token.sheetId||token.enemyId||token.id||'').replace(/^[pe]_/, '')}
                      data-token-id={String(token.id||'')}
                      onPointerDown=`,
  'identidade visual dos tokens',
);
write(battleFile, battle);

const cssFile = 'src/experience/experience.css';
let css = read(cssFile);
css = appendOnce(css, 'COMBAT VISIBLE RUNTIME HOTFIX 2026-09-22', `
/* COMBAT VISIBLE RUNTIME HOTFIX 2026-09-22 */
.combat-action-hud{grid-template-columns:300px minmax(0,1fr) auto!important}
.combat-action-character{display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:60px auto!important;gap:2px!important;align-items:center!important;padding:3px 9px!important}
.combat-action-orbs{display:grid;grid-template-columns:52px 58px 52px;align-items:center;justify-content:center;gap:8px;min-width:0}
.combat-action-portrait.g3-portrait-lg{grid-row:auto;width:56px!important;height:56px!important;min-width:56px;border-radius:50%;overflow:visible!important}
.combat-action-portrait.g3-portrait-lg>img{width:100%;height:100%;border-radius:50%;object-fit:cover;overflow:hidden}
.combat-action-identity{text-align:center;min-width:0}.combat-action-identity small,.combat-action-identity b,.combat-action-identity span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.combat-action-identity .combat-hotkey-status{display:block!important;margin-top:2px!important;font:800 5px/1 Cinzel,serif!important;letter-spacing:.13em;color:color-mix(in srgb,var(--combat-accent) 70%,#ddd)!important}
.combat-resource-orb{position:relative;width:52px;height:58px;display:grid;place-items:center;color:#f8eef8;filter:drop-shadow(0 5px 8px rgba(0,0,0,.58));isolation:isolate}.combat-resource-orb svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.combat-orb-shell{fill:#05030a;stroke:color-mix(in srgb,var(--orb-color) 72%,#dfd3e3);stroke-width:2}.combat-orb-depth{fill:#09050f;stroke:rgba(255,255,255,.12);stroke-width:1}.combat-orb-liquid,.combat-orb-wave{fill:var(--orb-color)}.combat-orb-liquid{opacity:.9;transition:y .34s cubic-bezier(.2,.8,.2,1),height .34s cubic-bezier(.2,.8,.2,1)}.combat-orb-wave{opacity:.86;animation:combatOrbWave 2.15s linear infinite;transform-box:fill-box;transform-origin:center}.combat-orb-glint{fill:rgba(255,255,255,.23);transform:rotate(-24deg);transform-origin:30px 30px}.combat-resource-orb b{position:relative;z-index:2;margin-top:3px;font:900 10px/1 Cinzel,serif;text-shadow:0 1px 5px #000}.combat-resource-orb small{position:absolute;z-index:2;left:50%;bottom:2px;transform:translateX(-50%);font:900 5px/1 Cinzel,serif;letter-spacing:.12em;color:#f0e6f2;text-shadow:0 1px 4px #000}.combat-resource-orb.hp{--orb-color:#E8193C}.combat-resource-orb.vc{--orb-color:#a855f7}
.combat-ability>kbd{position:absolute;right:6px;top:6px;z-index:3;width:18px;height:18px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--combat-accent) 30%,rgba(255,255,255,.12));border-radius:5px;background:rgba(3,2,8,.86);box-shadow:0 0 10px color-mix(in srgb,var(--combat-accent) 14%,transparent);color:color-mix(in srgb,var(--combat-accent) 72%,#fff);font:900 7px/1 Cinzel,serif}.combat-action-hud:not(.my-turn) .combat-ability>kbd{opacity:.42}
.combat-action-pulse.compact{animation:combatPulseCompactFade 2.1s ease both;background:radial-gradient(circle at center,color-mix(in srgb,var(--action-color) 12%,transparent),transparent 42%)}.combat-action-pulse.compact .combat-action-wave{width:105px;height:105px;animation:combatActionWaveCompact 1.55s cubic-bezier(.12,.66,.23,1) both}.combat-action-pulse.compact .combat-action-wave.wave-b{animation-delay:.2s}.combat-action-pulse.compact .combat-action-pulse-core{animation:combatActionCoreCompact 2.1s cubic-bezier(.18,.77,.2,1) both}.combat-action-pulse.compact .combat-action-class-icon{font-size:56px}.combat-action-pulse.compact .combat-action-pulse-core strong{display:block;margin-top:8px;padding:6px 13px;max-width:min(420px,72vw);border:1px solid color-mix(in srgb,var(--action-color) 38%,transparent);border-radius:999px;background:rgba(4,2,9,.62);font:800 clamp(12px,1.45vw,19px)/1.1 Cinzel,serif;letter-spacing:.09em;color:#f0e6f2;text-shadow:0 0 18px color-mix(in srgb,var(--action-color) 48%,transparent),0 2px 9px #000}
.combat-floating-damage-layer{position:fixed;inset:0;z-index:30000;pointer-events:none}.combat-floating-damage{position:fixed;transform:translate(-50%,-50%);font:900 28px/1 'Cinzel Decorative',Cinzel,serif;color:#E8193C;text-shadow:0 2px 4px #000,0 0 16px rgba(232,25,60,.7);animation:combatFloatDamage 1.3s cubic-bezier(.18,.72,.2,1) forwards;will-change:transform,opacity}.combat-floating-damage.heal{color:#4ADE80;text-shadow:0 2px 4px #000,0 0 16px rgba(74,222,128,.7)}.combat-floating-damage.critical{color:#FFD700;font-size:39px;filter:drop-shadow(0 0 9px rgba(255,215,0,.72))}
@keyframes combatOrbWave{0%{transform:translateX(-10px)}50%{transform:translateX(0)}100%{transform:translateX(-10px)}}@keyframes combatPulseCompactFade{0%,100%{opacity:0}8%,78%{opacity:1}}@keyframes combatActionWaveCompact{0%{transform:scale(.22);opacity:0}16%{opacity:.95}100%{transform:scale(10);opacity:0}}@keyframes combatActionCoreCompact{0%{opacity:0;transform:scale(.7)}16%{opacity:1;transform:scale(1.08)}28%,72%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.04)}}@keyframes combatFloatDamage{0%{opacity:0;transform:translate(-50%,-15%) scale(.7)}14%{opacity:1;transform:translate(-50%,-58%) scale(1.12)}72%{opacity:1}100%{opacity:0;transform:translate(-50%,-175%) scale(.94)}}
@media(max-width:900px){.combat-action-hud{grid-template-columns:112px minmax(0,1fr)!important}.combat-action-character{grid-template-rows:48px!important;padding:3px!important}.combat-action-orbs{grid-template-columns:32px 40px 32px;gap:2px}.combat-resource-orb{width:32px;height:42px}.combat-resource-orb b{font-size:7px}.combat-resource-orb small{font-size:4px}.combat-action-portrait.g3-portrait-lg{width:38px!important;height:38px!important;min-width:38px}.combat-action-identity{display:none}.combat-ability>kbd{right:3px;top:3px;width:15px;height:15px}.combat-action-pulse.compact .combat-action-class-icon{font-size:46px}}
@media(prefers-reduced-motion:reduce){.combat-orb-wave{animation:none!important}.combat-action-pulse.compact,.combat-action-pulse.compact .combat-action-wave,.combat-action-pulse.compact .combat-action-pulse-core,.combat-floating-damage{animation-duration:.01ms!important;animation-iteration-count:1!important}}
`);
write(cssFile, css);

for (const [file, markers] of [
  [kitFile, ['function CombatResourceOrb', 'function CombatHotkeys', 'function FloatingDamageLayer', '<FloatingDamageLayer/>', 'aria-keyshortcuts={i<4?String(i+1):undefined}', 'combat-action-pulse compact']],
  [gameFile, ['function CombatVitalFx', 'function SessionUpdateNotice']],
  [battleFile, ['data-combat-entity-id=', 'data-token-id=']],
  [cssFile, ['COMBAT VISIBLE RUNTIME HOTFIX 2026-09-22', '.combat-floating-damage-layer', '@keyframes combatOrbWave']],
]) {
  const value=read(file);
  markers.forEach(marker=>must(value.includes(marker), `${marker} ausente em ${file}`));
}
must(!read(gameFile).includes('<CombatVitalFx ownSheetId='), 'camada antiga de dano ainda está montada');
console.log('Dinastia E: HUD real recebeu orbes, atalhos, dano flutuante e pulso compacto.');

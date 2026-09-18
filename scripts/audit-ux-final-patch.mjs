import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const must=(ok,msg)=>{if(!ok)throw new Error(`Audit UX final: ${msg}`)};
const replaceRequired=(src,before,after,label)=>{
  if(src.includes(after))return src;
  must(src.includes(before),`${label}: âncora ausente`);
  return src.replace(before,after);
};

// ── 1) EVENTOS CÓSMICOS/HABILIDADES: config para estado + feed durável para broadcast.
for(const rel of ['src/experience/ExperienceKit.jsx','src/experience/ExperienceKit.generated.jsx']){
  const file=path.join(root,rel);
  if(!fs.existsSync(file))continue;
  let src=fs.readFileSync(file,'utf8');

  src=replaceRequired(
    src,
    "    await setDoc(doc(db,'config','cosmic_event'),event);",
    "    await Promise.all([setDoc(doc(db,'config','cosmic_event'),event),setDoc(doc(db,'cosmic_events',event.id),event,{merge:true})]);",
    `${rel} triggerCosmicEvent feed`
  );

  const abilityBefore=`    await setDoc(doc(db,'config','cosmic_event'),{
      id:nowId('ability'),type:'ability',text:ability.name||ability.nome||'Habilidade',ts:Date.now(),
      color:selectedClass?.color||'#A855F7',icon:selectedClass?.icon||'⚡',soft:true,
    });`;
  const abilityAfter=`    const abilityEvent={
      id:nowId('ability'),type:'ability',text:\`\${selectedSheet.nome||'Personagem'} usou \${ability.name||ability.nome||'Habilidade'}\`,ts:Date.now(),
      color:selectedClass?.color||'#A855F7',icon:selectedClass?.icon||'⚡',soft:true,source:'ability',sheetId:String(selectedSheet.id),
    };
    await Promise.all([
      setDoc(doc(db,'config','cosmic_event'),abilityEvent),
      setDoc(doc(db,'cosmic_events',abilityEvent.id),abilityEvent,{merge:true}),
    ]);`;
  src=replaceRequired(src,abilityBefore,abilityAfter,`${rel} ability feed`);

  // Feedback tátil/visual imediato no HUD quando uma habilidade realmente foi aceita.
  const clickAfter="onClick={async e=>{if(passive)return;const btn=e.currentTarget;if(await useQuickAbility(a)){btn.classList.remove('ability-fired');void btn.offsetWidth;btn.classList.add('ability-fired');window.setTimeout(()=>btn.classList.remove('ability-fired'),420)}}}";
  for(const clickBefore of ["onClick={()=>{if(!passive)useQuickAbility(a)}}","onClick={()=>useQuickAbility(a)}"]){
    if(src.includes(clickBefore))src=src.replaceAll(clickBefore,clickAfter);
  }

  // Drag-and-drop real da iniciativa do Mestre. As setas continuam como fallback.
  const initBefore="<div key={c.id||i} className={i===Number(combatState.turnIdx||0)?'active':''}><span>{i+1}</span><b>{c.nome||'Combatente'}</b>";
  const initAfter="<div key={c.id||i} draggable onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(i));e.currentTarget.classList.add('dragging')}} onDragEnd={e=>e.currentTarget.classList.remove('dragging')} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';e.currentTarget.classList.add('drag-over')}} onDragLeave={e=>e.currentTarget.classList.remove('drag-over')} onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-over');const from=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(from)&&from!==i)reorderInitiative(from,i)}} className={i===Number(combatState.turnIdx||0)?'active':''}><span>{i+1}</span><b>{c.nome||'Combatente'}</b>";
  if(src.includes(initBefore))src=src.replaceAll(initBefore,initAfter);

  fs.writeFileSync(file,src);
}

// ── 2) CSS: confirmação de habilidade e iniciativa arrastável.
const cssFile=path.join(root,'src','experience','experience.css');
let css=fs.readFileSync(cssFile,'utf8');
const CSS_MARK='/* AUDIT UX FEEDBACK 2026-09-17 */';
if(!css.includes(CSS_MARK)){
  css+=`\n\n${CSS_MARK}
.hud-ability.ability-fired{animation:abilityConfirmed .42s ease-out!important}
@keyframes abilityConfirmed{0%{filter:brightness(1);transform:scale(1)}35%{filter:brightness(1.75);transform:scale(1.035);box-shadow:0 0 20px color-mix(in srgb,var(--accent,#A855F7) 45%,transparent)}100%{filter:brightness(1);transform:scale(1)}}
.master-turn-order>div[draggable="true"]{cursor:grab;transition:transform .14s ease,opacity .14s ease,border-color .14s ease}
.master-turn-order>div.dragging{opacity:.45;transform:scale(.985)}
.master-turn-order>div.drag-over{border-color:rgba(200,168,232,.62)!important;transform:translateY(-2px);box-shadow:0 0 0 1px rgba(168,85,247,.18)}
@media(max-width:900px){.master-turn-order>div[draggable="true"]{cursor:default}}
@media(prefers-reduced-motion:reduce){.hud-ability.ability-fired{animation:none!important}}
`;
  fs.writeFileSync(cssFile,css);
}

// ── 3) HP: contorno por vida aplicado somente depois do patch de silhueta alfa.
const battleFile=path.join(root,'src','features','mapa-batalha','BattleMapPage.jsx');
let battle=fs.readFileSync(battleFile,'utf8');
const hpShadowBefore="                                  : 'drop-shadow(0 2px 4px rgba(0,0,0,.68))',";
const hpShadowAfter="                                  : (displayMaxHp>0 ? \`drop-shadow(0 0 1px \${healthRingColor}) drop-shadow(0 0 \${Math.max(3,4*zoom)}px \${healthRingColor}99) drop-shadow(0 2px 4px rgba(0,0,0,.68))\` : 'drop-shadow(0 2px 4px rgba(0,0,0,.68))'),";
if(!battle.includes('HP HEALTH CONTOUR 2026-09-17')){
  must(battle.includes(hpShadowBefore),'sombra base do token pós-silhueta ausente');
  battle=battle.replace(hpShadowBefore,hpShadowAfter);
  battle=battle.replace("                              filter: draggingId === token.id","                              /* HP HEALTH CONTOUR 2026-09-17 */\n                              filter: draggingId === token.id");
  fs.writeFileSync(battleFile,battle);
}

// ── 4) Sanidade do lote.
const generated=path.join(root,'src','experience','ExperienceKit.generated.jsx');
must(fs.existsSync(generated),'ExperienceKit.generated ausente');
const exp=fs.readFileSync(generated,'utf8');
must(exp.includes("doc(db,'cosmic_events',event.id)"),'feed de evento cósmico ausente');
must(exp.includes("doc(db,'cosmic_events',abilityEvent.id)"),'feed durável de habilidade ausente');
must(exp.includes('ability-fired'),'feedback de habilidade ausente');
must(exp.includes("e.dataTransfer.setData('text/plain',String(i))"),'drag de iniciativa ausente');
must(css.includes(CSS_MARK),'CSS do feedback ausente');

battle=fs.readFileSync(battleFile,'utf8');
must(battle.includes('healthRingColor'),'cálculo de HP visual ausente');
must(battle.includes('HP HEALTH CONTOUR 2026-09-17'),'contorno de HP ausente');
must(battle.includes('undoTokenHp'),'undo de HP ausente');
must(!battle.includes('battlemap_motion_'),'canal espelho de movimento reapareceu');

const broadcasts=fs.readFileSync(path.join(root,'src','experience','RealtimeBroadcasts.jsx'),'utf8');
must(!broadcasts.includes('includeMetadataChanges: true'),'metadata duplicada reapareceu');
must(!broadcasts.includes('hasPendingWrites'),'espelhamento de evento reapareceu');

console.log('Dinastia E: feed durável, habilidade com feedback, iniciativa drag, anel/undo de HP e realtime sem duplicação validados.');

import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const must=(ok,msg)=>{if(!ok)throw new Error(`Combat action HUD patch: ${msg}`);};
const expFile=path.join(root,'src','experience','ExperienceKit.generated.jsx');
const cssFile=path.join(root,'src','experience','experience.css');
let exp=fs.readFileSync(expFile,'utf8');
let css=fs.readFileSync(cssFile,'utf8');

const hudStart=exp.indexOf('function CombatHud(');
const hudEnd=exp.indexOf('\nfunction CharacterStateAura',hudStart);
must(hudStart>=0&&hudEnd>hudStart,'CombatHud final não encontrado');

const hud=`function CombatHud({ onNavigate }){
  const { combat,combatState,selectedSheet,selectedClass,useQuickAbility,addJournal }=useExperience();
  const [custom,setCustom]=useState([]);
  const [pending,setPending]=useState(null);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    const root=document.documentElement;
    root.classList.toggle('dinastia-combat-hud',!!combat?.active);
    return()=>root.classList.remove('dinastia-combat-hud');
  },[combat?.active]);

  useEffect(()=>{
    if(!selectedSheet?.id){setCustom([]);return;}
    return onSnapshot(doc(db,'config','customAbilities'),snap=>{
      const data=snap.exists()?(snap.data()||{}):{};
      const rows=Array.isArray(data?.[String(selectedSheet.id)])?data[String(selectedSheet.id)]:[];
      setCustom(rows.filter(Boolean));
    },()=>setCustom([]));
  },[selectedSheet?.id]);

  if(!combat?.active||!selectedSheet) return null;

  const level=Number(selectedSheet.nivel||1);
  const maxHp=getSheetMaxHp(selectedSheet);
  const hp=Number(selectedSheet.hp||0);
  const hpPct=clamp((hp/Math.max(1,maxHp))*100,0,100);
  const vc=Number(selectedSheet.vigos||0);
  const current=combatState?.initiative?.[Number(combatState.turnIdx||0)];
  const isMyTurn=current?.type==='player'&&String(current?.id||'').replace(/^p_/,'')===String(selectedSheet.id);
  const classNormal=Array.isArray(selectedClass?.normal)?selectedClass.normal:[];
  const classSpecial=Array.isArray(selectedClass?.specials)?selectedClass.specials:[];
  const classAbilities=[...classNormal,...classSpecial].map(a=>({...a,_locked:Number(a.req||0)>level,_source:'class'}));
  const customAbilities=custom
    .filter(a=>String(a?.tipoHab||'').toLowerCase()!=='passiva')
    .map(a=>({...a,name:a.name||a.nome,_locked:Number(a.req||0)>level,_source:'custom'}));
  const abilities=[...classAbilities,...customAbilities];
  const targets=Array.isArray(combatState?.initiative)?combatState.initiative:[];

  const choose=a=>{if(a?._locked)return;setPending(a)};
  const emitAction=async(target)=>{
    if(!pending||busy)return;
    const simple=pending._simple===true;
    const cost=simple?1:Number(pending.cost??pending.custo??0);
    if(vc<cost)return;
    setBusy(true);
    try{
      let accepted=true;
      if(simple){
        await updateDoc(doc(db,'sheets',String(selectedSheet.id)),{vigos:Math.max(0,vc-1)});
      }else{
        accepted=await useQuickAbility(pending);
      }
      if(!accepted)return;
      const ts=Date.now();
      const id=\`combat_action_\${ts}_\${Math.random().toString(36).slice(2,8)}\`;
      const abilityName=simple?'Ataque simples':String(pending.name||pending.nome||'Habilidade');
      const targetName=target?.nome||'Sem alvo';
      const event={
        id,type:'combat_action',ts,source:'combat-hud',
        actorId:String(selectedSheet.id),actorName:selectedSheet.nome||'Personagem',
        abilityName,targetId:String(target?.id||''),targetName,targetType:target?.type||'none',
        icon:selectedClass?.icon||'✦',color:selectedClass?.color||'#A855F7',
        simple,cost,round:Number(combatState?.round||1),
      };
      await Promise.all([
        setDoc(doc(db,'config','combat_action'),event,{merge:true}),
        setDoc(doc(db,'combat_action_events',id),event,{merge:true}),
      ]);
      await addJournal?.(\`\${event.actorName} usou \${abilityName}\${target?.nome?\` em \${target.nome}\`:' sem alvo'}.\`,'combat',{
        id,ts,round:event.round,icon:event.icon,color:event.color,source:'combat-action',
      });
      setPending(null);
    }finally{setBusy(false)}
  };

  const simple={name:'Ataque simples',cost:1,desc:'Corte, tiro, chute, soco ou outro ataque básico.',_simple:true,_locked:false};
  return <div className={\`combat-action-hud \${isMyTurn?'my-turn':''}\`} style={{'--combat-accent':selectedClass?.color||'#A855F7'}}>
    <div className="combat-action-character">
      <div className="combat-action-portrait">{selectedSheet.foto?<img src={selectedSheet.foto} alt=""/>:<span>{selectedClass?.icon||selectedSheet.nome?.[0]||'✦'}</span>}</div>
      <div className="combat-action-identity"><small>{isMyTurn?'✦ SEU TURNO':\`VEZ DE \${current?.nome||'—'}\`}</small><b>{selectedSheet.nome||'Personagem'}</b><span>{selectedClass?.icon||'✦'} {selectedClass?.name||'Classe'}</span></div>
      <div className="combat-action-vitals">
        <div><span>❤</span><i><em style={{width:\`\${hpPct}%\`}}/></i><b>{hp}/{maxHp}</b></div>
        <div><span>✦</span><i className="vc"><em style={{width:\`\${clamp((vc/8)*100,0,100)}%\`}}/></i><b>{vc} VC</b></div>
      </div>
    </div>

    <div className="combat-action-abilities">
      <button className="combat-ability simple" disabled={vc<1||busy} onClick={()=>choose(simple)}><span>⚔</span><b>Ataque simples</b><small>1 VC</small></button>
      {abilities.map((a,i)=>{
        const key=String(a.id||a.name||a.nome||i);
        const cd=Number(selectedSheet.cooldowns?.[String(a.id||a.name||a.nome||'')]||0);
        const cost=Number(a.cost??a.custo??0);
        const disabled=busy||a._locked||cd>0||vc<cost;
        return <button className="combat-ability hud-ability" key={key} disabled={disabled} onClick={()=>choose(a)} title={a.desc||a.descricao||''}>
          <span>{a._source==='custom'?'✦':selectedClass?.icon||'✦'}</span>
          <b>{a.name||a.nome||'Habilidade'}</b>
          <small>{a._locked?\`Nv \${a.req}\`:cd>0?\`⏳ \${cd}\`:\`\${cost} VC\`}</small>
        </button>
      })}
    </div>

    <div className="combat-action-side">
      <button onClick={()=>onNavigate?.('fichas')} title="Abrir ficha">📋</button>
      <button onClick={()=>onNavigate?.('mapabatalha')} title="Mapa de batalha">🗡️</button>
    </div>

    {pending&&<div className="combat-target-picker">
      <header><div><small>ESCOLHA O ALVO</small><b>{pending._simple?'Ataque simples':pending.name||pending.nome}</b></div><button onClick={()=>setPending(null)}>✕</button></header>
      <div className="combat-target-grid">
        <button className="no-target" disabled={busy} onClick={()=>emitAction(null)}><span>◇</span><b>Sem alvo</b><small>Ação sem alvo específico</small></button>
        {targets.map((t,i)=><button key={t.id||i} disabled={busy} className={String(t.id||'')===String(current?.id||'')?'current':''} onClick={()=>emitAction(t)}>
          <span className="target-avatar">{t.foto?<img src={t.foto} alt=""/>:t.nome?.[0]||'?'}</span><b>{t.nome||'Combatente'}</b><small>{t.type==='enemy'?'Inimigo':t.type==='summon'?'Invocação':'Personagem'}</small>
        </button>)}
      </div>
    </div>}
  </div>;
}

function CombatActionPulse(){
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
  useEffect(()=>{if(!event?.id)return;const t=setTimeout(()=>setEvent(null),2900);return()=>clearTimeout(t)},[event?.id]);
  if(!event)return null;
  return <div className="combat-action-pulse" style={{'--action-color':event.color||'#A855F7'}}>
    <div className="combat-action-wave wave-a"/><div className="combat-action-wave wave-b"/>
    <div className="combat-action-pulse-core">
      <span className="combat-action-class-icon">{event.icon||'✦'}</span>
      <small>{event.actorName||'Personagem'} USOU</small>
      <strong>{event.abilityName||'Habilidade'}</strong>
      <em>{event.targetType==='none'||!event.targetId?'◇ Sem alvo':\`→ \${event.targetName||'Alvo'}\`}</em>
    </div>
  </div>;
}
`;

exp=exp.slice(0,hudStart)+hud+exp.slice(hudEnd);

// Monta o pulso global junto às camadas imersivas.
if(!exp.includes('<CombatActionPulse/>')){
  const candidates=['<CosmicEventLayer/>','<TurnRibbon/>'];
  let inserted=false;
  for(const anchor of candidates){
    if(exp.includes(anchor)){exp=exp.replace(anchor,anchor+'\n    <CombatActionPulse/>');inserted=true;break;}
  }
  must(inserted,'ponto de montagem do pulso não encontrado');
}

const marker='/* COMBAT ACTION HUD 2026-09-19 */';
if(!css.includes(marker)){
css+=`
\n${marker}
html.dinastia-combat-hud .g3-actionbar{display:none!important}
.combat-action-hud{position:fixed;left:50%;bottom:12px;z-index:9200;transform:translateX(-50%);width:min(1180px,calc(100vw - 190px));min-height:92px;display:grid;grid-template-columns:280px minmax(0,1fr) auto;gap:10px;align-items:stretch;padding:8px;border-radius:18px;border:1px solid color-mix(in srgb,var(--combat-accent) 34%,transparent);background:linear-gradient(180deg,rgba(10,5,18,.97),rgba(4,2,9,.97));box-shadow:0 20px 60px rgba(0,0,0,.62),0 0 34px color-mix(in srgb,var(--combat-accent) 12%,transparent);backdrop-filter:blur(18px)}
.combat-action-hud.my-turn{border-color:color-mix(in srgb,var(--combat-accent) 68%,transparent);box-shadow:0 20px 60px rgba(0,0,0,.62),0 0 40px color-mix(in srgb,var(--combat-accent) 24%,transparent)}
.combat-action-character{min-width:0;display:grid;grid-template-columns:58px minmax(0,1fr);grid-template-rows:auto auto;gap:5px 9px;align-items:center;padding:5px 7px;border-right:1px solid rgba(255,255,255,.06)}
.combat-action-portrait{grid-row:1/3;width:56px;height:56px;border-radius:50%;display:grid;place-items:center;overflow:hidden;border:2px solid var(--combat-accent);background:color-mix(in srgb,var(--combat-accent) 12%,#08040e);box-shadow:0 0 17px color-mix(in srgb,var(--combat-accent) 25%,transparent);font-size:25px}.combat-action-portrait img{width:100%;height:100%;object-fit:cover}
.combat-action-identity{min-width:0}.combat-action-identity small{display:block;font:800 6px Cinzel,serif;letter-spacing:.16em;color:var(--combat-accent)}.combat-action-identity b{display:block;margin-top:2px;font:800 11px Cinzel,serif;color:#e1d3e5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.combat-action-identity span{display:block;margin-top:2px;font-size:7px;color:#75677c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.combat-action-vitals{grid-column:2;display:grid;gap:3px}.combat-action-vitals>div{display:grid;grid-template-columns:12px minmax(60px,1fr) 48px;gap:5px;align-items:center}.combat-action-vitals i{height:5px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden}.combat-action-vitals em{display:block;height:100%;background:linear-gradient(90deg,#812840,#e74e6c);border-radius:inherit}.combat-action-vitals i.vc em{background:linear-gradient(90deg,#523079,var(--combat-accent))}.combat-action-vitals b{font:700 7px Cinzel,serif;color:#89788f;text-align:right}
.combat-action-abilities{display:flex;align-items:stretch;gap:6px;overflow-x:auto;padding:2px;scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--combat-accent) 26%,transparent) transparent}
.combat-ability{flex:0 0 132px;min-height:68px;position:relative;border-radius:11px;border:1px solid color-mix(in srgb,var(--combat-accent) 18%,transparent);background:color-mix(in srgb,var(--combat-accent) 5%,rgba(255,255,255,.01));color:#ad9bb4;padding:8px 7px 7px;text-align:left;cursor:pointer;transition:.16s ease}.combat-ability:hover:not(:disabled){transform:translateY(-2px);border-color:color-mix(in srgb,var(--combat-accent) 48%,transparent);background:color-mix(in srgb,var(--combat-accent) 11%,rgba(255,255,255,.01));box-shadow:0 8px 18px rgba(0,0,0,.28)}.combat-ability:disabled{opacity:.34;cursor:not-allowed}.combat-ability>span{font-size:17px;display:block}.combat-ability>b{display:block;margin-top:3px;font:700 8px Cinzel,serif;color:#c4b4c9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.combat-ability>small{display:block;margin-top:4px;font:700 6px Cinzel,serif;color:var(--combat-accent)}.combat-ability.simple{border-color:rgba(232,160,32,.26);background:rgba(232,160,32,.045)}.combat-ability.simple>small{color:#e8a020}
.combat-action-side{display:flex;flex-direction:column;gap:5px;justify-content:center}.combat-action-side button{width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);color:#917c9b;cursor:pointer}
.combat-target-picker{position:absolute;left:50%;bottom:calc(100% + 10px);transform:translateX(-50%);width:min(720px,calc(100vw - 220px));max-height:420px;overflow:hidden;border-radius:16px;border:1px solid color-mix(in srgb,var(--combat-accent) 34%,transparent);background:rgba(7,3,13,.985);box-shadow:0 24px 70px rgba(0,0,0,.72),0 0 32px color-mix(in srgb,var(--combat-accent) 10%,transparent);backdrop-filter:blur(18px)}
.combat-target-picker header{height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 12px 0 15px;border-bottom:1px solid rgba(255,255,255,.06)}.combat-target-picker header small{display:block;font:700 6px Cinzel,serif;letter-spacing:.18em;color:#76647e}.combat-target-picker header b{font:800 11px Cinzel,serif;color:#d1bfd6}.combat-target-picker header>button{width:28px;height:28px;border-radius:8px;border:1px solid rgba(255,255,255,.07);background:transparent;color:#827287}
.combat-target-grid{max-height:350px;overflow:auto;padding:9px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.combat-target-grid>button{min-height:62px;display:grid;grid-template-columns:38px minmax(0,1fr);grid-template-rows:1fr 1fr;gap:0 8px;align-items:center;text-align:left;padding:7px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.022);color:#a997af;cursor:pointer}.combat-target-grid>button:hover{border-color:color-mix(in srgb,var(--combat-accent) 36%,transparent);background:color-mix(in srgb,var(--combat-accent) 7%,transparent)}.combat-target-grid>button.current{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--combat-accent) 18%,transparent)}.target-avatar{grid-row:1/3;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:#100819;border:1px solid rgba(255,255,255,.09)}.target-avatar img{width:100%;height:100%;object-fit:cover}.combat-target-grid b{font:700 8px Cinzel,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.combat-target-grid small{font-size:7px;color:#62566a}.combat-target-grid .no-target>span{grid-row:1/3;display:grid;place-items:center;width:36px;height:36px;border-radius:50%;border:1px dashed rgba(255,255,255,.14);font-size:16px}
.combat-action-pulse{position:fixed;inset:0;z-index:26000;pointer-events:none;display:grid;place-items:center;overflow:hidden;animation:combatPulseFade 2.9s ease both;background:radial-gradient(circle at center,color-mix(in srgb,var(--action-color) 10%,transparent),transparent 44%)}
.combat-action-wave{position:absolute;width:130px;height:130px;border-radius:50%;border:2px solid color-mix(in srgb,var(--action-color) 70%,transparent);box-shadow:0 0 40px color-mix(in srgb,var(--action-color) 32%,transparent);animation:combatActionWave 1.65s cubic-bezier(.12,.66,.23,1) both}.combat-action-wave.wave-b{animation-delay:.22s}
.combat-action-pulse-core{text-align:center;position:relative;z-index:2;animation:combatActionCore 2.6s cubic-bezier(.18,.77,.2,1) both}.combat-action-class-icon{display:block;font-size:64px;filter:drop-shadow(0 0 26px var(--action-color));animation:combatActionIcon 1s ease both}.combat-action-pulse-core small{display:block;margin-top:8px;font:800 7px Cinzel,serif;letter-spacing:.26em;color:color-mix(in srgb,var(--action-color) 65%,white)}.combat-action-pulse-core strong{display:block;margin-top:7px;max-width:80vw;font:900 clamp(28px,5vw,68px) Cinzel Decorative,serif;line-height:1.04;color:#f2e9f4;text-shadow:0 0 28px color-mix(in srgb,var(--action-color) 65%,transparent),0 4px 18px #000}.combat-action-pulse-core em{display:inline-block;margin-top:12px;padding:6px 13px;border-radius:999px;border:1px solid color-mix(in srgb,var(--action-color) 38%,transparent);background:rgba(5,2,10,.56);font:700 9px Cinzel,serif;color:#cdbfd2;font-style:normal}
@keyframes combatActionWave{0%{transform:scale(.25);opacity:0}16%{opacity:.95}100%{transform:scale(9);opacity:0}}@keyframes combatActionCore{0%{opacity:0;transform:scale(.72)}14%{opacity:1;transform:scale(1.06)}25%,78%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.08)}}@keyframes combatActionIcon{0%{transform:scale(.3) rotate(-12deg);opacity:0}30%{transform:scale(1.18) rotate(3deg);opacity:1}100%{transform:scale(1);opacity:1}}@keyframes combatPulseFade{0%,100%{opacity:0}8%,84%{opacity:1}}
@media(max-width:900px){.combat-action-hud{left:8px;right:8px;bottom:62px;transform:none;width:auto;grid-template-columns:110px minmax(0,1fr);min-height:76px;padding:6px}.combat-action-character{grid-template-columns:38px minmax(0,1fr);padding:3px;border-right:0}.combat-action-portrait{width:36px;height:36px;font-size:17px}.combat-action-identity span,.combat-action-vitals{display:none}.combat-action-abilities{grid-column:2}.combat-ability{flex-basis:112px;min-height:60px}.combat-action-side{display:none}.combat-target-picker{width:calc(100vw - 18px);bottom:calc(100% + 7px)}.combat-target-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.combat-action-pulse-core strong{font-size:clamp(24px,9vw,44px)}.combat-action-class-icon{font-size:50px}}
@media(prefers-reduced-motion:reduce){.combat-action-wave{display:none}.combat-action-pulse,.combat-action-pulse-core,.combat-action-class-icon{animation:none!important}}
\`;
}

must(exp.includes('function CombatActionPulse'),'pulso global ausente');
must(exp.includes('Ataque simples'),'ação simples ausente');
must(exp.includes("doc(db,'config','combat_action')"),'broadcast de ação ausente');
must(exp.includes("doc(db,'combat_action_events',id)"),'feed durável de ação ausente');
must(exp.includes("doc(db,'config','customAbilities')"),'habilidades personalizadas ausentes');
must(exp.includes('<CombatActionPulse/>'),'pulso não montado');
must(css.includes(marker),'CSS do HUD ausente');

fs.writeFileSync(expFile,exp);
fs.writeFileSync(cssFile,css);
console.log('Dinastia E: HUD de combate contextual, ataque simples, alvo e pulso global de habilidade aplicados.');

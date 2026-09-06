import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const file=rel=>path.join(root,rel);
const read=rel=>fs.readFileSync(file(rel),'utf8');
const write=(rel,src)=>fs.writeFileSync(file(rel),src);

function req(src,before,after,label){
  if(src.includes(after)) return src;
  if(!src.includes(before)) throw new Error(`Combat v2: ${label}`);
  return src.replace(before,after);
}
function between(src,start,end,replacement,label){
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  if(a<0||b<0) throw new Error(`Combat v2: ${label}`);
  return src.slice(0,a)+replacement+src.slice(b);
}
function block(src,start,end,label){
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  if(a<0||b<0) throw new Error(`Combat v2: bloco ausente ${label}`);
  return {a,b,text:src.slice(a,b)};
}
function replaceBlock(src,info,text){return src.slice(0,info.a)+text+src.slice(info.b)}

// ── MOBILE: não carrega/navega para o Mapa de Batalha ──────────────────────
let app=read('src/App.generated.jsx');
if(!app.includes('mobileBattleMapBlocked')){
  app=req(app,
`  const navigate = id => {
    prefetch(id);
    setTab(id);
  };`,
`  const mobileBattleMapBlocked = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
  const navigate = id => {
    if(id==='mapabatalha'&&mobileBattleMapBlocked()) return;
    prefetch(id);
    setTab(id);
  };
  useEffect(()=>{
    const protect=()=>{if(mobileBattleMapBlocked()&&tab==='mapabatalha')setTab('session')};
    protect();window.addEventListener('resize',protect);return()=>window.removeEventListener('resize',protect);
  },[tab]);`, 'bloqueio mobile do mapa');
}
write('src/App.generated.jsx',app);

// ── EXPERIENCE PROVIDER / HUD / TOPO / MESTRE ──────────────────────────────
let exp=read('src/experience/ExperienceKit.generated.jsx');
if(!exp.includes("from './combatRoundEngine'")) exp=exp.replace("import { db } from '../core/firebase';","import { db } from '../core/firebase';\nimport { applyRoundAutomation } from './combatRoundEngine';");

// Provider: avanço de turno com automação somente ao fechar uma volta completa.
if(!exp.includes('const reorderInitiative=useCallback')){
  const s='  const nextTurn=useCallback(async()=>{';
  const e='\n\n  const endCombat=useCallback';
  const replacement=`  const nextTurn=useCallback(async()=>{
    const init=Array.isArray(combatState.initiative)?combatState.initiative:[];
    if(!init.length)return;
    const currentIdx=Number(combatState.turnIdx||0);
    const next=(currentIdx+1)%init.length;
    const newRound=next===0?Number(combatState.round||1)+1:Number(combatState.round||1);
    const combatKey=String(combat?.startedAt||combatState?.log?.[0]?.ts||'combat');
    let syncedInit=init,automation=null;
    if(next===0){
      try{
        automation=await applyRoundAutomation({initiative:init,round:newRound,combatKey});
        if(automation?.effects?.length){
          const hp=new Map(automation.effects.filter(x=>x.damage>0).map(x=>[String(x.combatantId),Number(x.hpAfter)]));
          syncedInit=init.map(c=>hp.has(String(c.id))?{...c,hp:hp.get(String(c.id))}:c);
        }
      }catch(error){console.error('Falha na automação de rodada:',error)}
    }
    const current=syncedInit[next]||{};const ts=Date.now();const entries=[];
    if(next===0&&automation?.applied){const damaged=(automation.effects||[]).filter(x=>x.damage>0).length;entries.push({msg:\`✦ Rodada \${newRound}: cooldowns −1 · +2 VC\${damaged?\` · \${damaged} dano(s) de status\`:''}\`,color:'#A855F7',icon:'✦',ts:ts-1,round:newRound})}
    entries.push({msg:\`Vez de \${current.nome||'combatente'}\${next===0?\` — Rodada \${newRound}\`:''}\`,color:current.color||'#C8B8A0',icon:'▶',ts,round:newRound});
    const nextLog=[...(combatState.log||[]),...entries].slice(-60);
    await Promise.all([
      setDoc(doc(db,'config','combat_state'),{initiative:syncedInit,turnIdx:next,round:newRound,log:nextLog},{merge:true}),
      setDoc(doc(db,'config','combat'),{active:true,round:newRound,currentNome:current.nome||'',currentColor:current.color||'#E8193C',currentType:current.type||'player',updatedAt:ts},{merge:true}),
    ]);
  },[combatState,combat]);

  const reorderInitiative=useCallback(async(fromIndex,toIndex)=>{
    const list=Array.isArray(combatState.initiative)?[...combatState.initiative]:[];
    if(!list.length||fromIndex===toIndex||fromIndex<0||toIndex<0||fromIndex>=list.length||toIndex>=list.length)return;
    const currentId=String(list[Number(combatState.turnIdx||0)]?.id||'');
    const [moved]=list.splice(fromIndex,1);list.splice(toIndex,0,moved);
    const nextIdx=Math.max(0,list.findIndex(c=>String(c.id)===currentId));const current=list[nextIdx]||{};const ts=Date.now();
    await Promise.all([
      setDoc(doc(db,'config','combat_state'),{initiative:list,turnIdx:nextIdx,round:Number(combatState.round||1)},{merge:true}),
      setDoc(doc(db,'config','combat'),{active:true,round:Number(combatState.round||1),currentNome:current.nome||'',currentColor:current.color||'#E8193C',currentType:current.type||'player',updatedAt:ts},{merge:true}),
    ]);
  },[combatState]);`;
  exp=between(exp,s,e,replacement,'nextTurn/provider');
}

// Callback de invocação: custo/cooldown permanecem no useQuickAbility já existente.
if(!exp.includes('const useSummonAbility=useCallback')){
  const marker='\n\n  const value=useMemo(()=>({';const p=exp.indexOf(marker);if(p<0)throw new Error('Combat v2: value provider');
  const cb=`

  const useSummonAbility=useCallback(async(ability,summon)=>{
    if(!selectedSheet||!summon||!combat?.active)return false;
    const name=String(ability?.name||ability?.nome||'').toLowerCase();const threat=String(summon?.ameaca||'Baixa').toLowerCase();
    const dead=name.includes('animar os mortos');const lords=name.includes('invocação dos lordes')||name.includes('invocacao dos lordes');
    if(!dead&&!lords)return false;if(dead&&!['baixa','média','media'].includes(threat))return false;if(lords&&!['alta','extrema','extremo'].includes(threat))return false;
    const init=Array.isArray(combatState.initiative)?[...combatState.initiative]:[];
    if(init.filter(c=>c.type==='summon'&&String(c.ownerSheetId||'')===String(selectedSheet.id)).length>=2)return false;
    if(!(await useQuickAbility(ability)))return false;
    const now=Date.now(),summonId=\`summon_\${selectedSheet.id}_\${now}_\${Math.random().toString(36).slice(2,7)}\`;
    const maxHp=Math.max(1,Math.floor((Number(summon.hp||10)+Math.max(0,Number(summon.hp_bonus||0)))*.5));const scale=dead?.5:1;const attr=k=>Math.floor(Number(summon?.[k]||0)*scale);
    const summoned={id:\`s_\${summonId}\`,type:'summon',ownerSheetId:String(selectedSheet.id),summonMemoryId:String(summon.id||''),nome:summon.nome||'Invocação',foto:summon.foto||'',color:selectedClass?.color||'#6E6E80',threat:summon.ameaca||'Baixa',hp:maxHp,maxHp,roll:0,status:{},forca:attr('forca'),agilidade:attr('agilidade'),durabilidade:attr('durabilidade'),inteligencia:attr('inteligencia'),percepcao:attr('percepcao'),sorte:attr('sorte'),ataques:Array.isArray(summon.ataques)?summon.ataques:[]};
    const owner=init.findIndex(c=>c.type==='player'&&String(c.id||'').replace(/^p_/,'')===String(selectedSheet.id));const currentId=String(init[Number(combatState.turnIdx||0)]?.id||'');init.splice(owner>=0?owner+1:init.length,0,summoned);const idx=Math.max(0,init.findIndex(c=>String(c.id)===currentId));
    const log=[...(combatState.log||[]),{msg:\`\${selectedSheet.nome||'Necromante'} invocou \${summoned.nome} · Ameaça \${summoned.threat}\`,color:selectedClass?.color||'#6E6E80',icon:'💀',ts:now,round:Number(combatState.round||1)}].slice(-60);
    const ev={id:nowId('summon'),type:'ability',text:\`\${summoned.nome} foi invocado\`,ts:now,color:selectedClass?.color||'#6E6E80',icon:'💀',soft:true,source:'summon',sheetId:String(selectedSheet.id)};
    await Promise.all([setDoc(doc(db,'combat_summons',summonId),{...summoned,active:true,createdAt:now,round:Number(combatState.round||1)}),setDoc(doc(db,'config','combat_state'),{initiative:init,turnIdx:idx,log},{merge:true}),setDoc(doc(db,'config','cosmic_event'),ev),setDoc(doc(db,'cosmic_events',ev.id),ev)]);return true;
  },[selectedSheet,selectedClass,combat,combatState,useQuickAbility]);`;
  exp=exp.slice(0,p)+cb+exp.slice(p);
}

// Contexto: faz a inserção apenas dentro do value/dependencies, tolerando espaços/quebras.
{
  const s=exp.indexOf('  const value=useMemo(()=>({'),e=exp.indexOf('\n\n  return <ExperienceContext.Provider',s);if(s<0||e<0)throw new Error('Combat v2: contexto provider');
  let v=exp.slice(s,e);
  if(!v.includes('reorderInitiative'))v=v.replace(/setActiveMap\s*,\s*nextTurn\s*,\s*endCombat/g,'setActiveMap,nextTurn,reorderInitiative,endCombat');
  if(!v.includes('useSummonAbility'))v=v.replace(/addAtlasDiscovery\s*,\s*useQuickAbility/g,'addAtlasDiscovery,useQuickAbility,useSummonAbility');
  exp=exp.slice(0,s)+v+exp.slice(e);
}

// TurnRibbon global e com nome atual explícito.
exp=exp.replace("if(!combat?.active||tab!=='mapabatalha'||!combatState?.initiative?.length) return null;","if(!combat?.active||!combatState?.initiative?.length) return null;");
if(!exp.includes('turn-current-name'))exp=exp.replace('<div className="turn-ribbon"><div className="turn-round">RODADA <b>{combatState.round||1}</b></div><div className="turn-list">','<div className="turn-ribbon global-turn-ribbon"><div className="turn-round">RODADA <b>{combatState.round||1}</b></div><div className="turn-current-name"><small>AGORA</small><b>{list[idx]?.nome||\'—\'}</b></div><div className="turn-list">');

// HUD: disponibiliza seletor de memória quando habilidade de invocação é escolhida.
{
  const h=block(exp,'function CombatHud(', '\nfunction CharacterStateAura', 'CombatHud');let x=h.text;
  if(!x.includes('useSummonAbility'))x=x.replace(/customAbilities\s*,\s*useQuickAbility\s*\}=useExperience\(\)/,'customAbilities,useQuickAbility,useSummonAbility }=useExperience()');
  if(!x.includes('pendingSummonAbility'))x=x.replace('const [expanded,setExpanded]=useState(false);','const [expanded,setExpanded]=useState(false);\n  const [pendingSummonAbility,setPendingSummonAbility]=useState(null);');
  const myTurn="const isMyTurn=current?.type==='player' && String(current?.id||'').replace(/^p_/,'')===String(selectedSheet.id);";
  if(!x.includes('summonSkillKind')&&x.includes(myTurn))x=x.replace(myTurn,myTurn+"\n  const summonSkillKind=a=>{const n=String(a?.name||a?.nome||'').toLowerCase();return n.includes('animar os mortos')?'low':(n.includes('invocação dos lordes')||n.includes('invocacao dos lordes'))?'high':''};\n  const summonMemories=Array.isArray(selectedSheet.invocacoes)?selectedSheet.invocacoes:[];const pendingKind=summonSkillKind(pendingSummonAbility);const summonChoices=summonMemories.filter(s=>{const t=String(s?.ameaca||'Baixa').toLowerCase();return pendingKind==='low'?['baixa','média','media'].includes(t):pendingKind==='high'?['alta','extrema','extremo'].includes(t):false});");
  x=x.replaceAll('onClick={()=>useQuickAbility(a)}','onClick={()=>{if(summonSkillKind(a))setPendingSummonAbility(a);else useQuickAbility(a)}}');
  if(!x.includes('summon-memory-popover'))x=x.replace('    <div className="hud-actions">',`    {pendingSummonAbility&&<div className="summon-memory-popover"><header><div><small>MEMÓRIA DAS CINZAS</small><b>{pendingSummonAbility.name||pendingSummonAbility.nome}</b></div><button onClick={()=>setPendingSummonAbility(null)}>✕</button></header><p>{pendingKind==='low'?'Ameaça Baixa ou Média':'Ameaça Alta ou Extrema'}</p><div className="summon-memory-options">{summonChoices.length?summonChoices.map(s=><button key={String(s.id)} onClick={async()=>{if(await useSummonAbility(pendingSummonAbility,s))setPendingSummonAbility(null)}}><span>💀</span><div><b>{s.nome||'Invocação'}</b><small>Ameaça {s.ameaca||'Baixa'}</small></div></button>):<em>Nenhuma memória compatível preparada pelo Mestre.</em>}</div></div>}\n    <div className="hud-actions">`);
  x=x.replace('onClick={()=>onNavigate(\'mapabatalha\')}>🗡️</button>','className="hud-map-action" onClick={()=>onNavigate(\'mapabatalha\')}>🗡️</button>');
  exp=replaceBlock(exp,h,x);
}

// Feedback −1 HP para o dono da ficha quando o status é processado.
if(!exp.includes('function CombatStatusDamageFx(){')){
  const p=exp.indexOf('\nfunction TurnRibbon(){');if(p<0)throw new Error('Combat v2: TurnRibbon para status');
  const fx=`
function CombatStatusDamageFx(){
  const {selectedSheet}=useExperience();const [event,setEvent]=useState(null);const primed=useRef(false);const seen=useRef(new Set());
  useEffect(()=>{if(!selectedSheet?.id)return;primed.current=false;seen.current=new Set();const q=query(collection(db,'combat_effect_events'),orderBy('ts','desc'),limit(20));const u=onSnapshot(q,s=>{if(!primed.current){primed.current=true;s.docs.forEach(d=>seen.current.add(d.id));return}s.docChanges().forEach(c=>{if(c.type==='removed'||seen.current.has(c.doc.id))return;seen.current.add(c.doc.id);const r=c.doc.data()||{};if(String(r.sheetId||'')===String(selectedSheet.id)&&Number(r.damage||0)>0)setEvent({...r,_id:c.doc.id})})},()=>{});return()=>u()},[selectedSheet?.id]);
  useEffect(()=>{if(!event)return;const t=setTimeout(()=>setEvent(null),2200);return()=>clearTimeout(t)},[event?._id]);if(!event)return null;return <div className="combat-status-damage-fx"><div><strong>−1 HP</strong><span>{event.reason||'Efeito negativo'}</span><small>Dano de status da nova rodada</small></div></div>;
}
`;
  exp=exp.slice(0,p)+fx+exp.slice(p);
}
exp=exp.replace('    <TurnRibbon/>\n    <CombatHud','    <TurnRibbon/>\n    <CombatStatusDamageFx/>\n    <CombatHud');

// Mestre: reordenação realtime no console global.
{
  const m=block(exp,'function MasterConsole(){','\nfunction ExperienceLayer', 'MasterConsole');let x=m.text;
  x=x.replace(/combatState\s*,\s*nextTurn\s*,\s*endCombat/,'combatState,nextTurn,reorderInitiative,endCombat');
  if(!x.includes('master-turn-order')){
    const needle='<div className="master-row"><button className="primary" disabled={!combat?.active} onClick={nextTurn}>';
    if(x.includes(needle))x=x.replace(needle,`{combat?.active&&combatState?.initiative?.length>0&&<div className="master-turn-order"><small>ORDEM DA INICIATIVA</small>{combatState.initiative.map((c,i)=><div key={c.id||i} className={i===Number(combatState.turnIdx||0)?'active':''}><span>{i+1}</span><b>{c.nome||'Combatente'}</b><div><button disabled={i===0} onClick={()=>reorderInitiative(i,i-1)}>↑</button><button disabled={i===combatState.initiative.length-1} onClick={()=>reorderInitiative(i,i+1)}>↓</button></div></div>)}</div>}<div className="master-row"><button className="primary" disabled={!combat?.active} onClick={nextTurn}>`);
  }
  exp=replaceBlock(exp,m,x);
}

// Mobile menu/dock sem Battle Map.
{
  const n=block(exp,'export function ImmersiveNavigation(', '\nexport function SessionDashboard', 'navegação');let x=n.text;
  const a=x.indexOf('  const mobileMain=['),b=x.indexOf('  ];',a);if(a>=0&&b>=0)x=x.slice(0,a)+`  const mobileMain=[\n    {id:'session',label:'Sessão',icon:'✦'},\n    {id:'fichas',label:'Ficha',icon:'📋'},\n    {id:'mapamundi',label:'Mundo',icon:'🌍'},\n  ];\n  const mobileGroups=NAV_GROUPS.map(g=>({...g,items:g.items.filter(i=>i.id!=='mapabatalha')})).filter(g=>g.items.length);`+x.slice(b+4);
  x=x.replace('{NAV_GROUPS.map(group=><section','{mobileGroups.map(group=><section');
  exp=replaceBlock(exp,n,x);
}
write('src/experience/ExperienceKit.generated.jsx',exp);

// ── COMBAT MODE LEGADO: mesma automação de rodada + ordem estável ──────────
let combat=read('src/features/sheets/CombatMode.jsx');
if(!combat.includes("../../experience/combatRoundEngine"))combat=combat.replace('import { db } from "../../core/firebase";','import { db } from "../../core/firebase";\nimport { applyRoundAutomation } from "../../experience/combatRoundEngine";');
if(!combat.includes('currentId = String(newInit[turnIdx]')){
  const a='  const moveInitiative = (idx, dir) => {',b='\n\n  const nextTurn = async () => {';
  const move=`  const moveInitiative = (idx, dir) => {\n    if (!masterMode) return;const newInit=[...initiative];const currentId=String(newInit[turnIdx]?.id||'');\n    if(dir===-1&&idx>0)[newInit[idx-1],newInit[idx]]=[newInit[idx],newInit[idx-1]];else if(dir===1&&idx<newInit.length-1)[newInit[idx+1],newInit[idx]]=[newInit[idx],newInit[idx+1]];else return;\n    const nextIdx=Math.max(0,newInit.findIndex(c=>String(c.id)===currentId));setInitiative(newInit);setTurnIdx(nextIdx);persist(newInit,round,nextIdx,log);\n  };`;
  combat=between(combat,a,b,move,'ordem CombatMode');
}
if(!combat.includes('Falha ao automatizar a rodada')){
  const a='  const nextTurn = async () => {',b='\n\n  const triggerOpportunityAttack = async () => {';
  const nt=`  const nextTurn = async () => {\n    if(!initiative.length)return;setPreparedAction('');const next=(turnIdx+1)%initiative.length;const newRound=next===0?round+1:round;let syncedInit=initiative,automation=null;\n    if(next===0){try{automation=await applyRoundAutomation({initiative,round:newRound,combatKey:String(log?.[0]?.ts||'combat')});if(automation?.effects?.length){const hp=new Map(automation.effects.filter(x=>x.damage>0).map(x=>[String(x.combatantId),Number(x.hpAfter)]));syncedInit=initiative.map(c=>hp.has(String(c.id))?{...c,hp:hp.get(String(c.id))}:c);setInitiative(syncedInit)}if(automation?.applied)pushToast(\`Rodada \${newRound}: cooldowns −1 e +2 Vigor Cósmico\`,'✦','#A855F7')}catch(error){console.error('Falha ao automatizar a rodada:',error)}}\n    if(next===0)setRound(newRound);setTurnIdx(next);const c=syncedInit[next];let newLog=addLog(\`Vez de \${c?.nome}\${next===0?\` — Rodada \${newRound} começa!\`:''}\`,c?.color||'#C8B8A0','▶');if(next===0&&automation?.applied){newLog=[...newLog,{msg:'✦ Cooldowns −1 · +2 VC · status processados',color:'#A855F7',icon:'✦',ts:Date.now(),round:newRound}].slice(-60);setLog(newLog)}try{await setDoc(doc(db,'config','combat'),{active:true,round:newRound,currentNome:c?.nome||'',currentColor:c?.color||'#E8193C',currentType:c?.type||'player',updatedAt:Date.now()},{merge:true})}catch(_){}persist(syncedInit,newRound,next,newLog);\n  };`;
  combat=between(combat,a,b,nt,'nextTurn CombatMode');
}
write('src/features/sheets/CombatMode.jsx',combat);

// ── NECROMANTE: slots de memória configuráveis pelo Mestre ─────────────────
let comp=read('src/features/sheets/SheetComponents.jsx');
if(!comp.includes('SUMMON_THREATS')){
  const a=comp.indexOf('const newSummon ='),b=comp.indexOf('const newSheet',a);if(a<0||b<0)throw new Error('Combat v2: bloco de summon');
  const memories=`const SUMMON_THREATS=['Baixa','Média','Alta','Extrema'];\nconst summonRequiredAbility=t=>['Alta','Extrema'].includes(String(t||'Baixa'))?'Invocação dos Lordes':'Animar os Mortos';\nconst newSummon=id=>({id,nome:'',ameaca:'Baixa',hp:10,hp_bonus:0,forca:0,agilidade:0,durabilidade:0,inteligencia:0,percepcao:0,sorte:0,ataques:[]});\nconst newSummonAttack=()=>({id:Date.now()+Math.random(),nome:'',dano:'',desc:''});\nfunction SummonCard({summon,onChange,onDelete,masterMode,color}){const f=(k,v)=>onChange({...summon,[k]:v});const [atk,setAtk]=useState(newSummonAttack());const threat=summon.ameaca||'Baixa',required=summonRequiredAbility(threat);if(!masterMode)return <div className="summon-memory-slot" style={{'--summon-color':color}}><span>◈ MEMÓRIA DAS CINZAS</span><strong>{summon.nome||'Invocação não nomeada'}</strong><div><b>Ameaça {threat}</b><small>{required}</small></div></div>;const attrs=[['forca','Força'],['agilidade','Agilidade'],['durabilidade','Durabilidade'],['inteligencia','Inteligência'],['percepcao','Percepção'],['sorte','Sorte']];const add=()=>{if(!atk.nome.trim())return;f('ataques',[...(summon.ataques||[]),{...atk,id:Date.now()}]);setAtk(newSummonAttack())};return <div className="summon-memory-slot master" style={{'--summon-color':color}}><header><div><span>◈ SLOT DE MEMÓRIA</span><b>{summon.nome||'Nova invocação'}</b></div><button onClick={onDelete}>✕</button></header><div className="summon-memory-form"><label className="wide">Nome<input value={summon.nome||''} onChange={e=>f('nome',e.target.value)}/></label><label>Ameaça<select value={threat} onChange={e=>f('ameaca',e.target.value)}>{SUMMON_THREATS.map(x=><option key={x}>{x}</option>)}</select></label><label>Habilidade<input value={required} readOnly/></label><label>HP base<input type="number" min="1" value={summon.hp??10} onChange={e=>f('hp',Math.max(1,Number(e.target.value)||1))}/></label><label>HP bônus<input type="number" min="0" value={summon.hp_bonus||0} onChange={e=>f('hp_bonus',Math.max(0,Number(e.target.value)||0))}/></label>{attrs.map(([k,l])=><label key={k}>{l}<input type="number" min="0" max="30" value={summon[k]||0} onChange={e=>f(k,Math.max(0,Math.min(30,Number(e.target.value)||0)))}/></label>)}</div><div className="summon-memory-attacks"><small>ATAQUES / AÇÕES</small>{(summon.ataques||[]).map(a=><div key={a.id}><b>{a.nome}</b><span>{a.dano||'—'}</span><p>{a.desc||''}</p><button onClick={()=>f('ataques',(summon.ataques||[]).filter(x=>x.id!==a.id))}>✕</button></div>)}<div className="summon-memory-add-attack"><input value={atk.nome} onChange={e=>setAtk(v=>({...v,nome:e.target.value}))} placeholder="Ação"/><input value={atk.dano} onChange={e=>setAtk(v=>({...v,dano:e.target.value}))} placeholder="Dano"/><input value={atk.desc} onChange={e=>setAtk(v=>({...v,desc:e.target.value}))} placeholder="Descrição"/><button onClick={add}>＋</button></div></div></div>}\nfunction InvocacoesPanel({sheet,onChange,sheetColor,masterMode}){const inv=Array.isArray(sheet.invocacoes)?sheet.invocacoes:[];const save=v=>onChange({...sheet,invocacoes:v});const add=()=>{if(inv.length<6)save([...inv,newSummon(Date.now())])};return <div className="summon-memory-panel"><div className="summon-memory-help">{masterMode?'Cadastre memórias de invocação para uso em combate.':'Invocações gravadas pelo Mestre para suas habilidades necromânticas.'}</div>{inv.map(s=><SummonCard key={s.id} summon={s} masterMode={masterMode} color={sheetColor} onChange={d=>save(inv.map(x=>String(x.id)===String(s.id)?d:x))} onDelete={()=>save(inv.filter(x=>String(x.id)!==String(s.id)))}/>)}{masterMode&&inv.length<6&&<button className="summon-memory-add" onClick={add}>＋ Gravar invocação ({inv.length}/6)</button>}{!masterMode&&!inv.length&&<div className="summon-memory-empty">Nenhuma memória preparada.</div>}</div>}\n\n`;
  comp=comp.slice(0,a)+memories+comp.slice(b);
}
write('src/features/sheets/SheetComponents.jsx',comp);

// ── CSS ────────────────────────────────────────────────────────────────────
let css=read('src/experience/experience.css');if(!css.includes('/* COMBAT V2 2026-09-06 */'))css+=`\n/* COMBAT V2 2026-09-06 */\n.turn-current-name{height:46px;min-width:145px;max-width:220px;padding:7px 12px;border-radius:11px;border:1px solid rgba(168,85,247,.2);background:rgba(6,2,12,.94);display:flex;flex-direction:column;justify-content:center}.turn-current-name small{font:700 6px Cinzel,serif;letter-spacing:.22em;color:#76518d}.turn-current-name b{font:800 11px Cinzel,serif;color:#d4c0dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}.master-turn-order{margin:12px 0;padding:9px;border:1px solid rgba(168,85,247,.13);border-radius:10px;background:rgba(168,85,247,.035);display:grid;gap:5px;max-height:260px;overflow:auto}.master-turn-order>small{font:700 7px Cinzel,serif;color:#76627e}.master-turn-order>div{display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:7px;padding:6px;border-radius:7px;border:1px solid rgba(255,255,255,.05)}.master-turn-order>div.active{border-color:rgba(168,85,247,.3);background:rgba(168,85,247,.07)}.master-turn-order b{font:700 9px Cinzel,serif;color:#aaa}.master-turn-order button{width:27px;height:25px;border-radius:6px;border:1px solid rgba(168,85,247,.16);background:rgba(168,85,247,.055);color:#9c7caf}.combat-status-damage-fx{position:fixed;inset:0;z-index:24000;pointer-events:none;display:grid;place-items:center;animation:statusDamage 2.2s ease both;background:radial-gradient(circle,rgba(232,25,60,.09),transparent 38%)}.combat-status-damage-fx>div{padding:14px 22px;border-radius:16px;border:1px solid rgba(232,25,60,.25);background:rgba(17,3,8,.82);text-align:center;box-shadow:0 12px 42px rgba(0,0,0,.45),0 0 28px rgba(232,25,60,.12)}.combat-status-damage-fx strong{display:block;font:900 38px Cinzel Decorative,serif;color:#ff5570;text-shadow:0 0 20px rgba(232,25,60,.48)}.combat-status-damage-fx span{display:block;font:800 9px Cinzel,serif;color:#d78a97;margin-top:7px}.combat-status-damage-fx small{font-size:9px;color:#80616a}@keyframes statusDamage{0%,100%{opacity:0}12%,75%{opacity:1}}.summon-memory-popover{position:absolute;right:10px;bottom:76px;width:min(340px,calc(100vw - 28px));z-index:250;border:1px solid rgba(110,110,128,.35);border-radius:14px;background:rgba(7,6,12,.98);padding:11px;box-shadow:0 18px 52px rgba(0,0,0,.7)}.summon-memory-popover header{display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.06);padding-bottom:7px}.summon-memory-popover header small{display:block;font:700 6px Cinzel,serif;color:#666}.summon-memory-popover header b{font:800 10px Cinzel,serif;color:#bbb}.summon-memory-popover>p{font-size:10px;color:#777}.summon-memory-options{display:grid;gap:6px}.summon-memory-options>button{height:auto!important;min-height:46px!important;display:flex!important;gap:9px;align-items:center!important}.summon-memory-options b,.summon-memory-options small{display:block}.summon-memory-options em{font-size:10px;color:#666;padding:10px}.summon-memory-panel{display:grid;gap:9px}.summon-memory-help,.summon-memory-empty{font-size:10px;color:#777;padding:9px;text-align:center}.summon-memory-slot{border:1px solid color-mix(in srgb,var(--summon-color) 28%,transparent);border-radius:11px;padding:11px;background:rgba(6,5,10,.72)}.summon-memory-slot:not(.master){display:grid;grid-template-columns:1fr auto;gap:4px 12px}.summon-memory-slot:not(.master)>span{grid-column:1/3;font:700 6px Cinzel,serif;color:#666}.summon-memory-slot:not(.master)>strong{font:800 11px Cinzel,serif;color:#bbb}.summon-memory-slot:not(.master)>div{text-align:right}.summon-memory-slot:not(.master) b,.summon-memory-slot:not(.master) small{display:block;font:7px Cinzel,serif;color:#777}.summon-memory-slot.master>header{display:flex;justify-content:space-between;margin-bottom:9px}.summon-memory-slot.master header span,.summon-memory-attacks>small{font:700 6px Cinzel,serif;color:#666}.summon-memory-slot.master header b{display:block;font:800 10px Cinzel,serif;color:#aaa}.summon-memory-form{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.summon-memory-form label{font:700 7px Cinzel,serif;color:#777}.summon-memory-form label.wide{grid-column:span 2}.summon-memory-form input,.summon-memory-form select{width:100%;margin-top:3px}.summon-memory-attacks{margin-top:9px;border-top:1px solid rgba(255,255,255,.05);padding-top:7px}.summon-memory-attacks>div:not(.summon-memory-add-attack){position:relative;padding:6px 25px 6px 7px;margin-top:5px;border:1px solid rgba(255,255,255,.04);border-radius:6px}.summon-memory-add-attack{display:grid;grid-template-columns:1fr 80px 1.3fr 32px;gap:4px;margin-top:6px}.summon-memory-add{padding:9px;border-radius:8px;border:1px dashed rgba(110,110,128,.3);background:transparent;color:#888}@media(max-width:900px){.mobile-dock{grid-template-columns:repeat(4,1fr)!important}.hud-map-action{display:none!important}.turn-current-name{min-width:105px;height:39px}.turn-current-name b{font-size:8px}.summon-memory-popover{position:fixed;left:10px;right:10px;bottom:144px;width:auto}.summon-memory-form{grid-template-columns:repeat(2,1fr)}.global-turn-ribbon{z-index:480}}\n`;
write('src/experience/experience.css',css);

// Sanidade
for(const [src,mark,label] of [[app,'mobileBattleMapBlocked','mobile'],[exp,'reorderInitiative','ordem'],[exp,'useSummonAbility','invocação'],[exp,'CombatStatusDamageFx','status'],[exp,'mobileGroups','menu mobile'],[combat,'applyRoundAutomation','rodada'],[comp,'SUMMON_THREATS','memória']])if(!src.includes(mark))throw new Error(`Combat v2 incompleto: ${label}`);
console.log('Dinastia E: combate v2 — rodadas automáticas, ordem realtime, mobile sem Battle Map e memórias necromânticas.');
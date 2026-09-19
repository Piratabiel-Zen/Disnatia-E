import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const must=(ok,msg)=>{if(!ok)throw new Error(`Immersive combat hotfix: ${msg}`);};
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const write=(rel,src)=>fs.writeFileSync(path.join(root,rel),src);

// ── 1) DADO: primeira rolagem depois de entrar também precisa aparecer.
let replay=read('src/experience/SharedDiceReplay.jsx');
if(!replay.includes('DICE FIRST-LIVE EVENT 2026-09-19')){
  replay=replay.replace(
`      if (!feedPrimed) {
        feedPrimed = true;
        snap.docs.forEach(d => remember(getReplayId({ _feedId: d.id, ...(d.data() || {}) })));
        return;
      }`,
`      if (!feedPrimed) {
        feedPrimed = true;
        snap.docs.forEach(d => {
          const payload={ _feedId:d.id, ...(d.data() || {}) };
          if(Number(payload.ts||0) >= joinedAtRef.current - 1200) enqueue(payload);
          else remember(getReplayId(payload));
        });
        return;
      }`
  );
  replay=replay.replace(
`      if (!configPrimed) {
        configPrimed = true;
        remember(getReplayId(payload));
        return;
      }
      enqueue(payload);`,
`      if (!configPrimed) {
        configPrimed = true;
        if(Number(payload.ts||0) >= joinedAtRef.current - 1200) enqueue(payload);
        else remember(getReplayId(payload));
        return;
      }
      enqueue(payload); // DICE FIRST-LIVE EVENT 2026-09-19`
  );
}
must(replay.includes('DICE FIRST-LIVE EVENT 2026-09-19'),'primeiro evento ao vivo do dado não corrigido');
must(replay.includes("doc(db, 'config', 'public_dice_roll')"),'fallback público do dado ausente');
write('src/experience/SharedDiceReplay.jsx',replay);

// Garante que o dado global sabe quando quem rolou é o Mestre.
let app=read('src/App.generated.jsx');
if(app.includes('<DiceWidget/>')) app=app.replace('<DiceWidget/>','<DiceWidget access={access}/>');
must(app.includes('<DiceWidget access={access}/>'),'access não chegou ao DiceWidget');
write('src/App.generated.jsx',app);

// ── 2) MOVIMENTO: snapshots remotos com interpolação contínua e visível.
let battle=read('src/features/mapa-batalha/BattleMapPage.jsx');
battle=battle.replaceAll("left 24ms linear, top 24ms linear","left 42ms linear, top 42ms linear");
battle=battle.replaceAll("left 36ms linear, top 36ms linear","left 42ms linear, top 42ms linear");
must(battle.includes("left 42ms linear, top 42ms linear"),'interpolação linear remota não aplicada');
write('src/features/mapa-batalha/BattleMapPage.jsx',battle);

// ── 3) COMBATE LEGADO: persistência nunca depende de snapshot prévio.
let combat=read('src/features/sheets/CombatMode.jsx');
combat=combat.replace(
`  const persist = async (newInit, newRound, newTurnIdx, newLog) => {
    if (!loadedRef.current) return;
    try { await setDoc(doc(db, 'config', 'combat_state'), { initiative: newInit ?? initiative, round: newRound ?? round, turnIdx: newTurnIdx ?? turnIdx, log: (newLog ?? log).slice(-60) }); } catch (e) { console.error(e); }
  };`,
`  const persist = async (newInit, newRound, newTurnIdx, newLog) => {
    const ts=Date.now();
    try {
      await setDoc(doc(db,'config','combat_state'),{
        initiative:newInit ?? initiative,
        round:newRound ?? round,
        turnIdx:newTurnIdx ?? turnIdx,
        log:(newLog ?? log).slice(-60),
        updatedAt:ts,
        revision:ts,
      },{merge:true});
      loadedRef.current=true;
      return true;
    } catch(e){ console.error('Erro ao sincronizar estado do combate:',e); return false; }
  };`
);

// Começo de combate: os dois documentos são atualizados juntos e sem timeout artificial.
const rollStart=combat.indexOf('  const rollInitiative = async () => {');
const rollEnd=combat.indexOf('\n\n  const moveInitiative',rollStart);
must(rollStart>=0&&rollEnd>rollStart,'rollInitiative não encontrado');
combat=combat.slice(0,rollStart)+`  const rollInitiative = async () => {
    if(rolling)return;
    setRolling(true);
    pushToast('⚔️ O Combate foi Iniciado!','⚔️','#E8193C');
    try{
      const rolled=buildCombatants().map(c=>({...c,roll:Math.floor(Math.random()*20)+1+c.agiBonus}));
      rolled.sort((a,b)=>b.roll!==a.roll?b.roll-a.roll:b.perBonus!==a.perBonus?b.perBonus-a.perBonus:(a.type==='player'?-1:1));
      if(!rolled.length){pushToast('Selecione ao menos um combatente.','⚠️','#E8A020');return;}
      const ts=Date.now();
      const newLog=[...log,{msg:\`🎲 Iniciativa rolada! \${rolled[0]?.nome} age primeiro (\${rolled[0]?.roll})\`,color:'#A855F7',icon:'🎲',ts,round:1}].slice(-60);
      setInitiative(rolled);setTurnIdx(0);setRound(1);setLog(newLog);setShowSelector(false);
      await Promise.all([
        setDoc(doc(db,'config','combat_state'),{initiative:rolled,round:1,turnIdx:0,log:newLog,updatedAt:ts,revision:ts},{merge:true}),
        setDoc(doc(db,'config','combat'),{active:true,round:1,currentNome:rolled[0]?.nome||'',currentColor:rolled[0]?.color||'#E8193C',currentType:rolled[0]?.type||'player',startedAt:ts,updatedAt:ts,revision:ts},{merge:true}),
      ]);
      loadedRef.current=true;
    }catch(error){
      console.error('Falha ao iniciar combate:',error);
      pushToast('Falha ao sincronizar o combate. Tente novamente.','⚠️','#E8193C');
    }finally{setRolling(false);}
  };`+combat.slice(rollEnd);

// Reordenação direta para qualquer posição; mantém combatente atual por ID.
if(!combat.includes('const moveInitiativeTo =')){
  const moveAnchor='  const moveInitiative = (idx, dir) => {';
  const p=combat.indexOf(moveAnchor);
  must(p>=0,'moveInitiative ausente');
  combat=combat.slice(0,p)+`  const moveInitiativeTo = async (fromIndex,toIndex) => {
    if(!masterMode||fromIndex===toIndex)return;
    const list=[...initiative];
    if(fromIndex<0||toIndex<0||fromIndex>=list.length||toIndex>=list.length)return;
    const currentId=String(list[turnIdx]?.id||'');
    const [moved]=list.splice(fromIndex,1);list.splice(toIndex,0,moved);
    const nextIdx=Math.max(0,list.findIndex(c=>String(c.id)===currentId));
    setInitiative(list);setTurnIdx(nextIdx);
    await persist(list,round,nextIdx,log);
  };

`+combat.slice(p);
}

// Próximo turno: trava dupla e grava os dois documentos em paralelo.
combat=combat.replace(
'  const nextTurn = async () => {\n    if(!initiative.length)return;',
'  const nextTurn = async () => {\n    if(!initiative.length||rolling)return;'
);

// Fechar a janela nunca encerra o combate global.
combat=combat.replace(
`const handleClose = () => {
  onClose();
  setDoc(doc(db, 'config', 'combat'), { active: false }).catch(() => {});
};`,
`const handleClose = () => { onClose(); };`
);

// Cards da iniciativa passam a aceitar drag/drop.
combat=combat.replace(
`              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: isDead ? 0.38 : 1, position: 'relative' }}>`,
`              <div key={c.id} draggable={masterMode} onDragStart={e=>{if(!masterMode)return;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(idx));e.currentTarget.style.opacity='.45'}} onDragEnd={e=>{e.currentTarget.style.opacity=isDead?'.38':'1'}} onDragOver={e=>{if(masterMode)e.preventDefault()}} onDrop={e=>{if(!masterMode)return;e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(from))moveInitiativeTo(from,idx)}} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: isDead ? 0.38 : 1, position: 'relative', cursor:masterMode?'grab':'default', transition:'transform .18s ease, opacity .18s ease' }}>`
);

must(combat.includes('moveInitiativeTo'),'drag de iniciativa não aplicado');
must(!combat.includes('if (!loadedRef.current) return;'),'persistência de combate ainda depende de bootstrap');
must(combat.includes("setShowSelector(false)"),'seletor não recolhe ao iniciar combate');
write('src/features/sheets/CombatMode.jsx',combat);

// ── 4) EXPERIÊNCIA GLOBAL: combat e turnos sempre têm revision/updatedAt e permanecem coerentes.
let exp=read('src/experience/ExperienceKit.generated.jsx');
exp=exp.replace(
"setDoc(doc(db,'config','combat_state'),{initiative:syncedInit,turnIdx:next,round:newRound,log:nextLog},{merge:true})",
"setDoc(doc(db,'config','combat_state'),{initiative:syncedInit,turnIdx:next,round:newRound,log:nextLog,updatedAt:ts,revision:ts},{merge:true})"
);
exp=exp.replace(
"setDoc(doc(db,'config','combat_state'),{initiative:list,turnIdx:nextIdx,round:Number(combatState.round||1)},{merge:true})",
"setDoc(doc(db,'config','combat_state'),{initiative:list,turnIdx:nextIdx,round:Number(combatState.round||1),updatedAt:ts,revision:ts},{merge:true})"
);
exp=exp.replace(
"await setDoc(doc(db,'config','combat'),{active:false,endedAt:Date.now()},{merge:true});",
"const ts=Date.now();await Promise.all([setDoc(doc(db,'config','combat'),{active:false,endedAt:ts,updatedAt:ts,revision:ts},{merge:true}),setDoc(doc(db,'config','combat_state'),{turnIdx:0,round:1,updatedAt:ts,revision:ts},{merge:true})]);"
);
write('src/experience/ExperienceKit.generated.jsx',exp);

// ── 5) Botão de retirar mídia mais sutil.
let game=read('src/experience/GameExperience3.jsx');
game=game.replaceAll('<button type="button" onClick={()=>clearDirectorMedia(', '<button type="button" className="g3-media-remove" onClick={()=>clearDirectorMedia(');
write('src/experience/GameExperience3.jsx',game);

let css=read('src/experience/game-experience-3.css');
if(!css.includes('/* SUBTLE MEDIA REMOVE 2026-09-19 */')){
  css+=`
/* SUBTLE MEDIA REMOVE 2026-09-19 */
.g3-media-preview{position:relative}
.g3-media-remove{position:absolute;right:6px;top:6px;width:auto!important;min-width:0!important;height:24px!important;padding:0 7px!important;border-radius:999px!important;border:1px solid rgba(255,255,255,.11)!important;background:rgba(4,2,9,.68)!important;color:#8d7d96!important;font:600 6px 'Cinzel',serif!important;letter-spacing:.03em!important;opacity:.56;cursor:pointer;backdrop-filter:blur(7px);transition:opacity .16s ease,border-color .16s ease,color .16s ease}
.g3-media-preview:hover .g3-media-remove,.g3-media-remove:focus{opacity:1;color:#c7b4ce!important;border-color:rgba(200,168,232,.28)!important}
`;
}
write('src/experience/game-experience-3.css',css);

// Guardas.
must(game.includes('className="g3-media-remove"'),'botão de remover mídia não ficou sutil');
must(css.includes('SUBTLE MEDIA REMOVE 2026-09-19'),'CSS sutil da mídia ausente');
must(exp.includes('revision:ts'),'revision realtime do combate global ausente');
console.log('Dinastia E: dados do Mestre ao vivo, tokens lineares, combate sincronizado/reordenável e remoção de mídia sutil aplicados.');

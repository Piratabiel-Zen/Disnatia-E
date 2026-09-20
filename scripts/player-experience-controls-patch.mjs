import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);
const once = (source, before, after, label) => {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Player controls patch: ${label} anchor missing`);
  return source.replace(before, after);
};
const block = (source, start, end, replacement, label) => {
  const a = source.indexOf(start);
  if (a < 0) throw new Error(`Player controls patch: ${label} start missing`);
  const b = source.indexOf(end, a);
  if (b < 0) throw new Error(`Player controls patch: ${label} end missing`);
  return source.slice(0, a) + replacement + source.slice(b);
};

let game = read('src/experience/GameExperience3.adventure.jsx');

game = once(game, "} else if(['sheet','abilities','inventory','journal'].includes(panel))setPanel(panel==='abilities'?'sheet':panel);", "} else if(['sheet','abilities','inventory','journal'].includes(panel))setPanel(panel);", 'ability shortcut bridge');
game = once(game, "function UtilityRail({tab,panel,setPanel,masterMode,onNavigate,preset,setPreset,onPing}){\n  const toggle=name=>setPanel(panel===name?'':name);\n  return <div className=\"g3-utility-rail\">\n    <button className={panel==='sheet'?'active':''} onClick={()=>toggle('sheet')} title=\"Ficha rápida\"><span>◆</span><small>Ficha</small></button>", "function UtilityRail({tab,panel,setPanel,masterMode,onNavigate,preset,setPreset,onPing}){\n  const toggle=name=>setPanel(panel===name?'':name);\n  return <div className=\"g3-utility-rail\">\n    <button className={panel==='sheet'?'active':''} onClick={()=>toggle('sheet')} title=\"Ficha e atributos\"><span>◆</span><small>Ficha</small></button>\n    <button className={panel==='abilities'?'active':''} onClick={()=>toggle('abilities')} title=\"Codex de habilidades\"><span>⚔</span><small>Habilidades</small></button>", 'desktop ability rail');

const characterStart = 'function CharacterDrawer({sheet,cls,onClose,onNavigate,onAbility}){';
const drawerStart = 'function DrawerShell({title,kicker,onClose,children,className=\'\'}){';
const characterReplacement = `function CharacterDrawer({sheet,cls,onClose,onNavigate}){
  if(!sheet) return <DrawerShell title="Ficha rápida" kicker="PERSONAGEM" onClose={onClose}><div className="g3-empty">Nenhuma ficha selecionada.</div></DrawerShell>;
  const maxHp=getSheetMaxHp(sheet);
  const maxVc=Math.max(8,Number(sheet.vigos_max||sheet.maxVigos||8));
  const statuses=activeStatusEntries(sheet);
  const attrs=[['FOR','forca'],['AGI','agilidade'],['INT','inteligencia'],['PER','percepcao'],['VIG','vigor'],['CAR','carisma']].filter(([,key])=>sheet[key]!=null);
  return <DrawerShell title={sheet.nome||'Personagem'} kicker={cls?.name||'FICHA E ATRIBUTOS'} onClose={onClose}>
    <div className="g3-sheet-hero"><Portrait entity={{...sheet,color:cls?.color}} size="xl"/><div><h3>{sheet.nome||'Sem nome'}</h3><p>{cls?.name||'Classe personalizada'} · Nível {sheet.nivel||1}</p><Meter label="❤" value={sheet.hp||0} max={maxHp} className="hp"/><Meter label="✦" value={sheet.vigos||0} max={maxVc} className="vc"/></div></div>
    {attrs.length>0&&<section className="g3-drawer-section"><header>ATRIBUTOS</header><div className="g3-attrs">{attrs.map(([label,key])=><div key={key}><small>{label}</small><b>{sheet[key]}</b></div>)}</div></section>}
    <section className="g3-drawer-section"><header>STATUS</header>{statuses.length?<div className="g3-statuses">{statuses.map(s=><span key={s.id} style={{'--g3-c':s.color}}>{s.icon} {s.label}</span>)}</div>:<div className="g3-muted">Nenhuma condição ativa.</div>}</section>
    <div className="g3-sheet-note"><span>◆</span><p>A ficha mostra seus atributos, recursos e condições atuais. Abra <b>H</b> para consultar cada habilidade em seu próprio códice.</p></div>
    <button className="g3-primary-wide" onClick={()=>onNavigate('fichas')}>Abrir ficha completa →</button>
  </DrawerShell>;
}

function AbilityDrawer({sheet,cls,customAbilities,onClose,onAbility}){
  const [openId,setOpenId]=useState('');
  const base=listAbilities(cls,sheet);
  const extra=Array.isArray(customAbilities?.[String(sheet?.id)])?customAbilities[String(sheet?.id)]:[];
  const abilities=[...base,...extra.map(a=>({...a,_campaign:true}))].filter((a,i,rows)=>rows.findIndex(x=>String(x.id||x.name||x.nome)===String(a.id||a.name||a.nome))===i);
  if(!sheet) return <DrawerShell title="Habilidades" kicker="CÓDICE DA COMPANHIA" onClose={onClose}><div className="g3-empty">Nenhuma ficha selecionada.</div></DrawerShell>;
  return <DrawerShell title="Habilidades" kicker="CÓDICE DA COMPANHIA" onClose={onClose} className="g3-ability-drawer">
    <div className="g3-ability-intro"><div className="g3-ability-sigil" style={{'--g3-c':cls?.color||'#a855f7'}}>{cls?.icon||'⚔'}</div><div><h3>{sheet.nome||'Personagem'}</h3><p>{cls?.name||'Classe personalizada'} · cada poder tem sua própria manifestação.</p></div></div>
    <section className="g3-drawer-section"><header>HABILIDADES DA COMPANHIA · {abilities.length}</header><div className="g3-immersive-abilities">{abilities.length?abilities.map((a,index)=>{
      const id=String(a.id||a.name||a.nome||('ability-'+index)); const expanded=openId===id; const cd=Number(sheet.cooldowns?.[abilityKey(a)]||0); const cost=abilityCost(a);
      const script=String(a.script||a.roteiro||a.lore||a.desc||a.descricao||a.efeito||a.effect||'A energia se reúne ao redor do gesto do personagem, aguardando o instante certo para se manifestar.');
      return <article key={id} className={'g3-immersive-ability '+(expanded?'expanded':'')} style={{'--g3-c':cls?.color||'#a855f7'}}>
        <button className="g3-ability-heading" onClick={()=>setOpenId(expanded?'':id)} aria-expanded={expanded}><span className="g3-ability-index">{String(index+1).padStart(2,'0')}</span><span><b>{abilityName(a)}</b><small>{a._campaign?'Poder da campanha':'Técnica da classe'}{cost?' · '+cost+' VC':''}{cd?' · CD '+cd:''}</small></span><em>{expanded?'−':'+'}</em></button>
        {expanded&&<div className="g3-ability-script"><p>{script}</p><button className="g3-use-ability" disabled={cd>0} onClick={()=>onAbility(a)}>{cd?'Em recarga · '+cd:'Manifestar habilidade'}</button></div>}
      </article>;
    }):<div className="g3-empty">Nenhuma habilidade registrada para esta ficha.</div>}</div></section>
  </DrawerShell>;
}

`;
game = block(game, characterStart, drawerStart, characterReplacement, 'character and ability drawers');

const journalStart = 'function JournalDrawer3({journal,masterMode,addJournal,onClose}){';
const inventoryStart = 'function InventoryDrawer({items,sheets,selectedSheet,masterMode,onClose,onCreate,onTransfer}){';
const journalReplacement = `function JournalDrawer3({journal,masterMode,addJournal,updateJournal,deleteJournal,onClose}){
  const [text,setText]=useState(''); const [editing,setEditing]=useState(''); const [draft,setDraft]=useState('');
  const add=async()=>{if(!text.trim())return;await addJournal(text,'story',{memory:true,icon:'✦',color:'#d6a7ff'});setText('');};
  const begin=item=>{setEditing(String(item.id));setDraft(item.text||'');};
  const save=async()=>{if(editing&&draft.trim()){await updateJournal(editing,draft);setEditing('');setDraft('');}};
  const remove=async id=>{if(window.confirm('Remover este registro do Diário Vivo?'))await deleteJournal(id);};
  return <DrawerShell title="Diário Vivo" kicker="TIMELINE DA CAMPANHA" onClose={onClose} className="g3-journal-drawer">
    {masterMode&&<div className="g3-inline-form"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="Registrar uma memória..."/><button onClick={add}>Inscrever</button></div>}
    <div className="g3-journal-timeline">{journal.length?journal.map(item=><article key={item.id} className={item.memory?'memory':''}><i style={{'--g3-c':item.color||'#a855f7'}}>{item.icon||'•'}</i><div>{editing===String(item.id)?<div className="g3-journal-edit"><textarea rows={3} value={draft} onChange={e=>setDraft(e.target.value)}/><span><button onClick={save}>Salvar</button><button onClick={()=>{setEditing('');setDraft('')}}>Cancelar</button></span></div>:<><p>{item.text}</p><small>{item.round?('Rodada '+item.round+' · '):''}{new Date(item.ts||Date.now()).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}{item.editedAt?' · editado':''}</small>{masterMode&&<div className="g3-journal-actions"><button onClick={()=>begin(item)}>Editar</button><button onClick={()=>remove(item.id)}>Excluir</button></div>}</>}</div></article>):<div className="g3-empty">A campanha ainda não deixou registros.</div>}</div>
  </DrawerShell>;
}

`;
game = block(game, journalStart, inventoryStart, journalReplacement, 'journal drawer');

const inventoryEnd = 'function TargetingOverlay({targeting,combatState,onChoose,onCancel}){';
const inventoryReplacement = `function InventoryDrawer({items,sheets,selectedSheet,masterMode,onClose,onCreate,onUpdate,onDelete,onTransfer}){
  const [dragId,setDragId]=useState(''); const [editId,setEditId]=useState('');
  const [form,setForm]=useState({name:'',icon:'◆',description:'',ownerSheetId:'group'}); const [editForm,setEditForm]=useState(null);
  const ownId=String(selectedSheet?.id||''); const visible=items.filter(item=>masterMode||String(item.ownerSheetId||'group')==='group'||String(item.ownerSheetId||'')===ownId);
  const create=async()=>{if(!form.name.trim())return;await onCreate(form);setForm({name:'',icon:'◆',description:'',ownerSheetId:form.ownerSheetId||'group'});};
  const begin=item=>{setEditId(String(item.id));setEditForm({name:item.name||'',icon:item.icon||'◆',description:item.description||'',ownerSheetId:item.ownerSheetId||'group'});};
  const save=async()=>{if(editId&&editForm?.name?.trim()){await onUpdate(editId,editForm);setEditId('');setEditForm(null);}};
  const remove=async id=>{if(window.confirm('Excluir este item da campanha?'))await onDelete(id);};
  return <DrawerShell title="Itens de Campanha" kicker="INVENTÁRIO VISUAL" onClose={onClose} className="g3-inventory-drawer">
    {masterMode&&<section className="g3-item-create"><header>CRIAR ITEM</header><div className="g3-icon-picker">{ITEM_ICONS.map(icon=><button key={icon} className={form.icon===icon?'active':''} onClick={()=>setForm(v=>({...v,icon}))}>{icon}</button>)}</div><input value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} placeholder="Nome do item"/><textarea rows={2} value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} placeholder="Descrição curta"/><select value={form.ownerSheetId} onChange={e=>setForm(v=>({...v,ownerSheetId:e.target.value}))}><option value="group">Grupo</option>{sheets.map(s=><option key={s.id} value={s.id}>{s.nome||'Personagem'}</option>)}</select><button onClick={create}>Criar item</button></section>}
    <section className="g3-drawer-section"><header>ITENS DISPONÍVEIS</header><div className="g3-item-grid">{visible.length?visible.map(item=>{
      const canDrag=masterMode||String(item.ownerSheetId||'')===ownId; const owner=sheets.find(s=>String(s.id)===String(item.ownerSheetId));
      return <article key={item.id} draggable={canDrag} onDragStart={()=>canDrag&&setDragId(item.id)} onDragEnd={()=>setDragId('')} className={canDrag?'draggable':''}><span>{item.icon||'◆'}</span><div><b>{item.name||'Item'}</b><p>{item.description||'Item de campanha'}</p><small>{String(item.ownerSheetId)==='group'?'Grupo':owner?.nome||'Sem portador'}</small>{masterMode&&<div className="g3-item-actions"><button onClick={()=>begin(item)}>Editar</button><button onClick={()=>remove(item.id)}>Excluir</button></div>}{editId===String(item.id)&&editForm&&<div className="g3-item-edit"><div className="g3-icon-picker">{ITEM_ICONS.map(icon=><button key={icon} className={editForm.icon===icon?'active':''} onClick={()=>setEditForm(v=>({...v,icon}))}>{icon}</button>)}</div><input value={editForm.name} onChange={e=>setEditForm(v=>({...v,name:e.target.value}))}/><textarea rows={2} value={editForm.description} onChange={e=>setEditForm(v=>({...v,description:e.target.value}))}/><select value={editForm.ownerSheetId} onChange={e=>setEditForm(v=>({...v,ownerSheetId:e.target.value}))}><option value="group">Grupo</option>{sheets.map(s=><option key={s.id} value={s.id}>{s.nome||'Personagem'}</option>)}</select><span><button onClick={save}>Salvar</button><button onClick={()=>{setEditId('');setEditForm(null)}}>Cancelar</button></span></div>}</div></article>;
    }):<div className="g3-empty">Nenhum item visual registrado ainda.</div>}</div></section>
    {dragId&&<section className="g3-transfer-zone"><header>ENTREGAR PARA</header><div><button onDragOver={e=>e.preventDefault()} onDrop={()=>{onTransfer(dragId,'group');setDragId('')}}>✦ Grupo</button>{sheets.map(s=><button key={s.id} onDragOver={e=>e.preventDefault()} onDrop={()=>{onTransfer(dragId,String(s.id));setDragId('')}}><Portrait entity={s} size="xs"/>{s.nome||'Personagem'}</button>)}</div></section>}
  </DrawerShell>;
}

`;
game = block(game, inventoryStart, inventoryEnd, inventoryReplacement, 'inventory drawer');

game = once(game, '    sheets,selectedSheet,selectedClass,combat,combatState,session,journal,\n    updateSession,startSession,endSession,nextTurn,endCombat,applySoundscapePreset,triggerCosmicEvent,\n    addAtlasDiscovery,addJournal,useQuickAbility,', '    sheets,selectedSheet,selectedClass,customAbilities,combat,combatState,session,journal,\n    updateSession,startSession,endSession,nextTurn,endCombat,applySoundscapePreset,triggerCosmicEvent,\n    addAtlasDiscovery,addJournal,updateJournal,deleteJournal,useQuickAbility,', 'experience drawer context');
game = once(game, "const g3LiveSurface=['session','mapamundi','mapabatalha'].includes(tab);", "const g3LiveSurface=['session','mapamundi','mapabatalha'].includes(tab) || (masterMode && panel==='director');", 'master media surface');

game = once(game, "const executeAbility=useCallback(async(ability,target)=>{\n    const ok=await useQuickAbility(ability);\n    if(!ok){pushFeedback({kind:'warning',icon:'⚠',name:abilityName(ability),text:'Sem Vigor suficiente ou habilidade em cooldown.'});setTargeting(null);return;}\n    if(target) await addJournal(`${selectedSheet?.nome||'Personagem'} definiu ${target.nome||'combatente'} como alvo de ${abilityName(ability)}.`,'ability',{icon:'⌖',color:selectedClass?.color||'#a855f7'});\n    pushFeedback({kind:'ability',icon:'⚡',name:abilityName(ability),text:target?`Alvo: ${target.nome||'combatente'}`:'Ação manifestada'});\n    setTargeting(null);\n  },[useQuickAbility,addJournal,selectedSheet?.nome,selectedClass?.color,pushFeedback]);", "const executeAbility=useCallback(async(ability,target)=>{\n    const ok=await useQuickAbility(ability);\n    if(!ok){pushFeedback({kind:'warning',icon:'⚠',name:abilityName(ability),text:'Sem Vigor suficiente ou habilidade em cooldown.'});setTargeting(null);return;}\n    const actionEvent={id:nowId('combat_action'),type:'combat_action',ts:Date.now(),source:'game3-actionbar',actorId:String(selectedSheet?.id||''),actorName:selectedSheet?.nome||'Personagem',abilityName:abilityName(ability),targetId:String(target?.id||''),targetName:target?.nome||'',targetType:target?'combatant':'none',icon:selectedClass?.icon||'⚡',color:selectedClass?.color||'#A855F7',round:Number(combatState?.round||1)};\n    await Promise.all([setDoc(doc(db,'config','combat_action'),actionEvent,{merge:true}),setDoc(doc(db,'combat_action_events',actionEvent.id),actionEvent,{merge:true})]);\n    if(target) await addJournal(`${selectedSheet?.nome||'Personagem'} definiu ${target.nome||'combatente'} como alvo de ${abilityName(ability)}.`,'ability',{icon:selectedClass?.icon||'⌖',color:selectedClass?.color||'#a855f7'});\n    pushFeedback({kind:'ability',icon:actionEvent.icon,color:actionEvent.color,name:abilityName(ability),text:target?`Alvo: ${target.nome||'combatente'}`:'Ação manifestada'});\n    setTargeting(null);\n  },[useQuickAbility,addJournal,selectedSheet?.id,selectedSheet?.nome,selectedClass?.color,selectedClass?.icon,combatState?.round,pushFeedback]);", 'combat action pulse event');

const itemAnchor = "  const completeObjective=useCallback(async()=>{";
const itemCallbacks = `  const updateItem=useCallback(async(itemId,form)=>{\n    if(!masterMode||!itemId||!form?.name?.trim())return;\n    await setDoc(doc(db,'campaign_items',String(itemId)),{name:String(form.name).trim(),icon:form.icon||'◆',description:String(form.description||''),ownerSheetId:String(form.ownerSheetId||'group'),updatedAt:Date.now()},{merge:true});\n  },[masterMode]);\n\n  const deleteItem=useCallback(async itemId=>{\n    if(!masterMode||!itemId)return;\n    await deleteDoc(doc(db,'campaign_items',String(itemId)));\n  },[masterMode]);\n\n${itemAnchor}`;
game = once(game, itemAnchor, itemCallbacks, 'campaign item callbacks');
game = once(game, "import { collection, doc, setDoc } from 'firebase/firestore';", "import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';", 'item delete import');
game = once(game, "{panel==='journal'&&<JournalDrawer3 journal={journal} masterMode={masterMode} addJournal={addJournal} onClose={()=>setPanel('')}/>} ", "{panel==='journal'&&<JournalDrawer3 journal={journal} masterMode={masterMode} addJournal={addJournal} updateJournal={updateJournal} deleteJournal={deleteJournal} onClose={()=>setPanel('')}/>} ", 'journal controls mount');
game = once(game, "{panel==='inventory'&&<InventoryDrawer items={items} sheets={sheets} selectedSheet={selectedSheet} masterMode={masterMode} onClose={()=>setPanel('')} onCreate={createItem} onTransfer={transferItem}/>} ", "{panel==='inventory'&&<InventoryDrawer items={items} sheets={sheets} selectedSheet={selectedSheet} masterMode={masterMode} onClose={()=>setPanel('')} onCreate={createItem} onUpdate={updateItem} onDelete={deleteItem} onTransfer={transferItem}/>} ", 'inventory controls mount');
game = once(game, "{panel==='sheet'&&<CharacterDrawer sheet={selectedSheet} cls={selectedClass} onClose={()=>setPanel('')} onNavigate={onNavigate} onAbility={chooseAbility}/>} ", "{panel==='sheet'&&<CharacterDrawer sheet={selectedSheet} cls={selectedClass} onClose={()=>setPanel('')} onNavigate={onNavigate}/>}\n    {panel==='abilities'&&<AbilityDrawer sheet={selectedSheet} cls={selectedClass} customAbilities={customAbilities} onClose={()=>setPanel('')} onAbility={chooseAbility}/>} ", 'ability drawer mount');

game = once(game, "<button className={panel==='journal'?'active':''} onClick={()=>toggle('journal')} title=\"Diário Vivo\"><span>🗒</span><small>Diário</small></button>", "<button className={panel==='journal'?'active':''} onClick={()=>toggle('journal')} title=\"Diário Vivo\"><span>🗒</span><small>Diário</small></button>", 'journal rail stability');
game = once(game, "<button className={panel==='journal'?'active':''} onClick={()=>setPanel(panel==='journal'?'':'journal')}><span>🗒</span><small>Diário Vivo</small></button>", "<button className={panel==='journal'?'active':''} onClick={()=>setPanel(panel==='journal'?'':'journal')}><span>🗒</span><small>Diário Vivo</small></button>\n      <button className={panel==='abilities'?'active':''} onClick={()=>setPanel(panel==='abilities'?'':'abilities')}><span>⚔</span><small>Habilidades</small></button>", 'mobile ability hub');
write('src/experience/GameExperience3.adventure.jsx', game);

let kit = read('src/experience/ExperienceKit.generated.jsx');
kit = once(kit, "const updateJournal=useCallback(async(id,text)=>{\n    const clean=String(text||'').trim(); if(!id||!clean)return;\n    await updateDoc(doc(db,'session_journal',String(id)),{text:clean,editedAt:Date.now()});\n  },[]);", "const updateJournal=useCallback(async(id,text)=>{\n    const clean=String(text||'').trim(); if(!masterMode||!id||!clean)return;\n    await updateDoc(doc(db,'session_journal',String(id)),{text:clean,editedAt:Date.now()});\n  },[masterMode]);", 'journal edit permission');
kit = once(kit, "const deleteJournal=useCallback(async id=>{\n    if(!id)return;\n    await deleteDoc(doc(db,'session_journal',String(id)));\n  },[]);", "const deleteJournal=useCallback(async id=>{\n    if(!masterMode||!id)return;\n    await deleteDoc(doc(db,'session_journal',String(id)));\n  },[masterMode]);", 'journal delete permission');
write('src/experience/ExperienceKit.generated.jsx', kit);

let css = read('src/experience/game-experience-3.css');
css += `\n/* PLAYER EXPERIENCE CONTROLS 2026-09-19 */\n.g3-utility-rail{top:50%!important;transform:translateY(-50%);max-height:calc(100vh - 140px);overflow-y:auto;scrollbar-width:thin}\n.g3-sheet-note{display:flex;gap:9px;align-items:flex-start;margin-top:15px;padding:10px;border:1px solid rgba(168,85,247,.14);border-radius:10px;background:rgba(168,85,247,.035)}.g3-sheet-note span{color:#b98bd5;font-size:14px}.g3-sheet-note p{margin:0;color:#76657f;font-size:9px;line-height:1.45}.g3-sheet-note b{color:#bca4c8}.g3-ability-intro{display:flex;gap:10px;align-items:center;padding:5px 2px 11px}.g3-ability-sigil{width:44px;height:44px;display:grid;place-items:center;border-radius:12px;border:1px solid color-mix(in srgb,var(--g3-c) 38%,transparent);background:color-mix(in srgb,var(--g3-c) 10%,transparent);color:var(--g3-c);font-size:20px;box-shadow:0 0 22px color-mix(in srgb,var(--g3-c) 13%,transparent)}.g3-ability-intro h3{margin:0;color:#d6c1da;font:700 13px 'Cinzel',serif}.g3-ability-intro p{margin:4px 0 0;color:#74627d;font-size:9px;line-height:1.35}.g3-immersive-abilities{display:grid;gap:6px}.g3-immersive-ability{border:1px solid color-mix(in srgb,var(--g3-c) 13%,transparent);border-radius:10px;background:linear-gradient(135deg,color-mix(in srgb,var(--g3-c) 4%,transparent),rgba(255,255,255,.01));overflow:hidden}.g3-immersive-ability.expanded{border-color:color-mix(in srgb,var(--g3-c) 34%,transparent);box-shadow:0 0 18px color-mix(in srgb,var(--g3-c) 9%,transparent)}.g3-ability-heading{width:100%;min-height:52px;display:grid;grid-template-columns:29px minmax(0,1fr) 20px;gap:8px;align-items:center;padding:7px 9px;border:0;background:transparent;color:#bca7c5;text-align:left;cursor:pointer}.g3-ability-index{font:700 8px 'Cinzel',serif;color:var(--g3-c)}.g3-ability-heading b{display:block;font:700 9px 'Cinzel',serif;color:#c9b6d0}.g3-ability-heading small{display:block;margin-top:3px;color:#715f79;font-size:8px}.g3-ability-heading em{font:400 18px Georgia,serif;color:var(--g3-c);font-style:normal;text-align:center}.g3-ability-script{padding:0 10px 10px 46px}.g3-ability-script p{margin:0 0 9px;color:#a994aa;font-size:10px;line-height:1.55;font-style:italic}.g3-use-ability{border:1px solid color-mix(in srgb,var(--g3-c) 35%,transparent);border-radius:7px;background:color-mix(in srgb,var(--g3-c) 9%,transparent);color:color-mix(in srgb,var(--g3-c) 70%,white);padding:7px 10px;font:700 7px 'Cinzel',serif;cursor:pointer}.g3-use-ability:disabled{opacity:.45;cursor:not-allowed}.g3-journal-actions,.g3-item-actions{display:flex;gap:4px;margin-top:5px}.g3-journal-actions button,.g3-item-actions button,.g3-journal-edit button,.g3-item-edit button{border:1px solid rgba(168,85,247,.2);border-radius:6px;background:rgba(168,85,247,.05);color:#a990b4;padding:4px 7px;font:700 6px 'Cinzel',serif;cursor:pointer}.g3-journal-actions button:last-child,.g3-item-actions button:last-child{border-color:rgba(232,25,60,.2);color:#d98291}.g3-journal-edit textarea,.g3-item-edit input,.g3-item-edit textarea,.g3-item-edit select{width:100%;box-sizing:border-box;border:1px solid rgba(168,85,247,.18);border-radius:7px;background:#08040f;color:#bda9c4;padding:6px;font-size:9px}.g3-journal-edit span,.g3-item-edit>span{display:flex;gap:4px;margin-top:4px}.g3-item-grid article{position:relative}.g3-item-edit{grid-column:1/-1;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.06)}.g3-item-edit .g3-icon-picker{margin-bottom:3px}.g3-item-edit .g3-icon-picker button{width:23px;height:23px;font-size:12px}.g3-item-edit input,.g3-item-edit textarea,.g3-item-edit select{margin:3px 0}.g3-feedback.ability>span{color:var(--g3-feedback-color,#a855f7);background:color-mix(in srgb,var(--g3-feedback-color,#a855f7) 10%,transparent)}.combat-action-pulse{z-index:var(--g3-z-critical)!important}\n@media(max-width:900px){.g3-utility-rail{transform:none;top:auto!important;max-height:none;overflow:visible}.g3-sheet-note{font-size:9px}}\n`;
write('src/experience/game-experience-3.css', css);

let adventureCss = read('src/adventure/adventure.css');
adventureCss += `\n/* Keep the session utility HUD vertically centered on desktop. */\n@media(min-width:901px){.adventure-shell:has(.page-stage-session) .g3-utility-rail{top:50%!important;transform:translateY(-50%)!important}}\n`;
write('src/adventure/adventure.css', adventureCss);

let battle = read('src/features/mapa-batalha/BattleMapPage.jsx');
battle = once(battle, "const draggingIdRef = useRef(null);\n  const remoteTokenLeaseRef = useRef({});", "const draggingIdRef = useRef(null);\n  const tokenInteractionRef = useRef({ id: null, pointerId: null });\n  const remoteTokenLeaseRef = useRef({});", 'token interaction lock ref');
battle = once(
  battle,
  "  const onTokenPointerDown = (e, token) => {\n    if (token.locked && !masterMode) return;\n    const leaseKey = String(currentMap?.id || '') + ':' + String(token.id);",
  "  const onTokenPointerDown = (e, token) => {\n    if (token.locked && !masterMode) return;\n    const activeInteraction=tokenInteractionRef.current;\n    if (activeInteraction.id!=null && (String(activeInteraction.id)!==String(token.id) || (activeInteraction.pointerId!=null && e.pointerId!=null && activeInteraction.pointerId!==e.pointerId))) return;\n    if (draggingIdRef.current!=null && String(draggingIdRef.current)!==String(token.id)) return;\n    const leaseKey = String(currentMap?.id || '') + ':' + String(token.id);",
  'token interaction guard',
);
battle = once(battle, "    e.stopPropagation();\n    moved.current = false;\n    setDraggingId(token.id);\n  };", "    e.stopPropagation();\n    e.preventDefault();\n    moved.current = false;\n    tokenInteractionRef.current={id:token.id,pointerId:e.pointerId};\n    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}\n    setDraggingId(token.id);\n  };", 'token pointer ownership');
battle = once(battle, "      if (!moved.current) setSelectedId(prevSel => prevSel === draggingId ? null : draggingId);\n      setDraggingId(null);", "      if (!moved.current) setSelectedId(prevSel => prevSel === draggingId ? null : draggingId);\n      if (String(tokenInteractionRef.current.id)===String(draggingId)) tokenInteractionRef.current={id:null,pointerId:null};\n      setDraggingId(null);", 'token ownership release');
battle = battle.replace("                      onTouchStart={e => canDrag && onTokenPointerDown(e, token)}\n", '');
battle = once(battle, "zIndex: draggingId === token.id ? 20 : isSelected ? 15 : 5,", "zIndex: draggingId === token.id ? 80 : isSelected ? 15 : 5,", 'active token z index');
battle = once(battle, "transition: draggingId === token.id ? 'none' : 'left 42ms linear, top 42ms linear',", "transition: draggingId === token.id ? 'none' : 'left 28ms linear, top 28ms linear',", 'linear token interpolation');
battle = once(battle, "willChange: 'auto',", "willChange: draggingId === token.id ? 'left, top' : 'auto',", 'token compositor hint');
write('src/features/mapa-batalha/BattleMapPage.jsx', battle);

console.log('Dinastia E: ficha/abilidades separadas, mestre editável, pulsação de combate e locks lineares de tokens preparados.');

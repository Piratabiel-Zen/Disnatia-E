import fs from 'node:fs';
import path from 'node:path';

const battleFile = path.join(process.cwd(), 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let src = fs.readFileSync(battleFile, 'utf8');

function replaceBattle(pattern, replacement, label) {
  const next = src.replace(pattern, replacement);
  if (next === src) throw new Error(`Realtime patch falhou: ${label}`);
  src = next;
}

replaceBattle(
  'const TOKEN_THROTTLE_MS = 80;',
  'const TOKEN_THROTTLE_MS = 40;',
  'throttle de token'
);

replaceBattle(
  '    let lastFallbackWrite = 0;\n',
  '',
  'remoção do fallback de array completo'
);

replaceBattle(
  /\n\s*if \(now - lastFallbackWrite >= 600\) \{ lastFallbackWrite = now; writeLiveTokens\(mapIdAtDragStart, tokensArr, false\)\.catch\(\(\) => \{\}\); \}/,
  '',
  'fallback concorrente durante arraste'
);

replaceBattle(
  "const unsub = onSnapshot(positionsQuery, { includeMetadataChanges: true }, snap => {",
  "const unsub = onSnapshot(positionsQuery, snap => {",
  'snapshot de posições sem eventos de metadata'
);

replaceBattle(
  "        touchAction: 'none',\n                      }}",
  "        touchAction: 'none',\n                        transition: draggingId === token.id ? 'none' : 'left 45ms linear, top 45ms linear',\n                      }}",
  'interpolação visual remota'
);

replaceBattle(
  "      if (latestTokens) {\n        lastTokenWriteRef.current[mapIdAtDragStart] = Date.now();\n        writeLiveTokens(mapIdAtDragStart, latestTokens, true).catch(e => console.error(e));\n      }",
  "      if (latestTokens) {\n        lastTokenWriteRef.current[mapIdAtDragStart] = Date.now();\n        const finalToken = latestTokens.find(t => String(t.id) === String(draggingId));\n        if (finalToken) writeLivePosition(mapIdAtDragStart, finalToken.id, finalToken.x, finalToken.y);\n        writeLiveTokens(mapIdAtDragStart, latestTokens, true).catch(e => console.error(e));\n      }",
  'posição final imediata'
);

// ── Tokens vinculados às fichas ────────────────────────────────────────────
replaceBattle(
  "  const [formFoto, setFormFoto] = useState('');",
  "  const [formFoto, setFormFoto] = useState('');\n  const [formSheetId, setFormSheetId] = useState('');",
  'estado de vínculo do novo token'
);

replaceBattle(
  "  const [sheets, setSheets] = useState([]);",
  "  const [sheets, setSheets] = useState([]);\n  const [sheetVitals, setSheetVitals] = useState({});\n  const [showSheetPicker, setShowSheetPicker] = useState(false);",
  'estado de vitais e seletor de ficha'
);

replaceBattle(
  "    const u3 = onSnapshot(collection(db, 'sheets'), snap => {\n      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));\n      setSheets(!masterMode && playerSheetId ? all.filter(s => String(s.id) === String(playerSheetId)) : all);\n    });",
  "    const u3 = onSnapshot(collection(db, 'sheets'), snap => {\n      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));\n      const vitals = {};\n      all.forEach(s => { vitals[String(s.id)] = { id:String(s.id), nome:s.nome||'', foto:s.foto||'', classe:s.classe||'', hp:Number(s.hp||0), maxHp:getSheetMaxHp(s) }; });\n      setSheetVitals(vitals);\n      setSheets(!masterMode && playerSheetId ? all.filter(s => String(s.id) === String(playerSheetId)) : all);\n    });",
  'vitais leves das fichas para tokens'
);

replaceBattle(
  "    await setDoc(doc(db,'battlemap_token_library',id),{nome:formNome.trim(),foto:formFoto,tipo:formTipo,size:70,createdAt:Date.now()});",
  "    await setDoc(doc(db,'battlemap_token_library',id),{nome:formNome.trim(),foto:formFoto,tipo:formTipo,size:70,sheetId:formSheetId||'',createdAt:Date.now()});",
  'vínculo salvo na biblioteca'
);

replaceBattle(
  "    const token={...newToken(Date.now()),nome:tpl.nome||'Token',foto:tpl.foto||'',tipo:tpl.tipo||'jogador',size:tpl.size||70,x:50,y:50,hp:tpl.hp||0,maxHp:tpl.maxHp||tpl.hp||0,status:tpl.status||{},rangeMeters:0};",
  "    const token={...newToken(Date.now()),nome:tpl.nome||'Token',foto:tpl.foto||'',tipo:tpl.tipo||'jogador',size:tpl.size||70,x:50,y:50,hp:tpl.hp||0,maxHp:tpl.maxHp||tpl.hp||0,status:tpl.status||{},rangeMeters:0,sheetId:tpl.sheetId||''};",
  'vínculo restaurado da biblioteca'
);

replaceBattle(
  "    const nt = { ...newToken(Date.now()), nome: formNome.trim(), tipo: formTipo, foto: formFoto };\n    updCurrentMap({ tokens: [...(currentMap.tokens || []), nt] });\n    setFormNome(''); setFormFoto(''); setShowAddForm(false);",
  "    const nt = { ...newToken(Date.now()), nome: formNome.trim(), tipo: formTipo, foto: formFoto, sheetId: formSheetId || '' };\n    updCurrentMap({ tokens: [...(currentMap.tokens || []), nt] });\n    setFormNome(''); setFormFoto(''); setFormSheetId(''); setShowAddForm(false);",
  'vínculo no token criado'
);

replaceBattle(
  "                  const dispSize = (token.size || 70) * zoom;\n                  return (",
  "                  const dispSize = (token.size || 70) * zoom;\n                  const linkedVitals = token.sheetId ? sheetVitals[String(token.sheetId)] : null;\n                  const displayHp = linkedVitals ? Number(linkedVitals.hp||0) : Number(token.hp||0);\n                  const displayMaxHp = linkedVitals ? Number(linkedVitals.maxHp||1) : Number(token.maxHp||0);\n                  return (",
  'vitais derivados da ficha'
);

replaceBattle(
  "                     {(token.maxHp||0)>0 && <div style={{width:Math.max(46*zoom,dispSize),height:5*zoom,borderRadius:5*zoom,overflow:'hidden',background:'rgba(0,0,0,.7)',border:`${.7*zoom}px solid rgba(255,255,255,.2)`,marginBottom:1*zoom}}><div style={{height:'100%',width:`${Math.max(0,Math.min(100,((token.hp||0)/(token.maxHp||1))*100))}%`,background:hpColor(token.hp||0,token.maxHp||1),transition:'width .25s'}}/></div>}",
  "                     {displayMaxHp>0 && <><div style={{fontSize:9*zoom,color:hpColor(displayHp,displayMaxHp),fontFamily:'Cinzel,serif',fontWeight:800,background:'rgba(3,4,10,.76)',borderRadius:5*zoom,padding:`${1*zoom}px ${6*zoom}px`,marginBottom:1*zoom,textShadow:'0 1px 4px #000'}}>❤ {displayHp}/{displayMaxHp}</div><div style={{width:Math.max(46*zoom,dispSize),height:5*zoom,borderRadius:5*zoom,overflow:'hidden',background:'rgba(0,0,0,.7)',border:`${.7*zoom}px solid rgba(255,255,255,.2)',marginBottom:1*zoom}}><div style={{height:'100%',width:`${Math.max(0,Math.min(100,(displayHp/Math.max(1,displayMaxHp))*100))}%`,background:hpColor(displayHp,displayMaxHp),transition:'width .25s'}}/></div></>}",
  'vida da ficha sobre o token'
);

// Corrige aspas do style acima após construir a substituição de forma legível.
src = src.replace("border:`${.7*zoom}px solid rgba(255,255,255,.2)',marginBottom", "border:`${.7*zoom}px solid rgba(255,255,255,.2)`,marginBottom");

replaceBattle(
  "              <div style={{ marginBottom: 12 }}>\n                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>",
  "              <label style={{display:'block',fontSize:9,color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:10}}>Ficha vinculada<select value={selectedToken.sheetId||''} onChange={e=>updateToken(selectedToken.id,{sheetId:e.target.value})} style={{width:'100%',marginTop:4,fontSize:10}}><option value=''>Nenhuma — HP manual</option>{sheets.map(s=><option key={s.id} value={s.id}>{s.nome||'Personagem'}</option>)}</select></label>\n              <div style={{ marginBottom: 12 }}>\n                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>",
  'seletor de ficha no token existente'
);

replaceBattle(
  "                  </div>\n                </div>\n              </div>\n              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>",
  "                  </div>\n                </div>\n              </div>\n              <label style={{display:'block',marginTop:9,fontSize:9,color:'#7B6D8A',fontFamily:'Cinzel,serif'}}>Vincular à ficha<select value={formSheetId} onChange={e=>setFormSheetId(e.target.value)} style={{width:'100%',marginTop:4,fontSize:10}}><option value=''>Nenhuma — HP manual</option>{sheets.map(s=><option key={s.id} value={s.id}>{s.nome||'Personagem'}</option>)}</select></label>\n              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>",
  'seletor de ficha no novo token'
);

// Substitui a barra de várias fichas por um único lançador compacto.
const sheetBarStart = src.indexOf('          {/* BARRA INFERIOR DE FICHAS — apenas bolinhas com a foto, sem nome */}');
const sheetBarEnd = src.indexOf('\n\n        </div>\n      )}', sheetBarStart);
if (sheetBarStart < 0 || sheetBarEnd < 0) throw new Error('Barra inferior de fichas não encontrada.');
const compactSheetLauncher = `          {/* FICHA DO MAPA — uma única bolinha; Mestre expande a lista */}
          <div className="battlemap-sheet-launcher" style={{position:'absolute',left:16,bottom:16,zIndex:46}}>
            <button
              onClick={()=>{
                if(!masterMode){ const own=sheets[0]; if(own){ handleSelectSheet(own); setShowSheetPicker(false); } return; }
                setShowSheetPicker(v=>!v);
              }}
              title={masterMode?'Fichas dos personagens':(sheets[0]?.nome||'Minha ficha')}
              style={{width:46,height:46,borderRadius:'50%',padding:0,border:'2px solid rgba(168,85,247,.45)',background:'rgba(6,8,18,.92)',color:'#C8A8E8',cursor:'pointer',overflow:'hidden',display:'grid',placeItems:'center',boxShadow:'0 5px 18px rgba(0,0,0,.58),0 0 14px rgba(168,85,247,.14)',backdropFilter:'blur(8px)'}}
            >
              {!masterMode&&sheets[0]?.foto?<img src={sheets[0].foto} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:20}}>👤</span>}
            </button>
            {masterMode&&showSheetPicker&&<div style={{position:'absolute',left:0,bottom:54,width:220,maxHeight:280,overflowY:'auto',padding:8,borderRadius:12,border:'1px solid rgba(168,85,247,.24)',background:'rgba(7,5,17,.97)',boxShadow:'0 14px 34px rgba(0,0,0,.7)',backdropFilter:'blur(12px)'}}>
              <div style={{fontFamily:'Cinzel,serif',fontSize:8,letterSpacing:'.18em',color:'#756284',padding:'3px 5px 8px'}}>FICHAS DA MESA</div>
              {sheets.map(s=>{const cls=CLASSES.find(c=>c.id===s.classe)||CLASSES[0];const sc=SHEET_COLORS[s.classe]||cls.color;return <button key={s.id} onClick={()=>{handleSelectSheet(s);setShowSheetPicker(false)}} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'7px 8px',marginBottom:4,borderRadius:8,border:'1px solid rgba(255,255,255,.055)',background:'rgba(255,255,255,.02)',color:'#C8B8A0',cursor:'pointer',textAlign:'left'}}>{s.foto?<img src={s.foto} alt="" style={{width:28,height:28,borderRadius:'50%',objectFit:'cover',border:\`1px solid \${sc}55\`}}/>:<span style={{width:28,height:28,borderRadius:'50%',display:'grid',placeItems:'center',background:\`\${sc}12\`}}>{cls.icon}</span>}<span style={{fontFamily:'Cinzel,serif',fontSize:9,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.nome||'Personagem'}</span></button>})}
              {sheets.length<15&&<button onClick={()=>{quickAddSheet();setShowSheetPicker(false)}} style={{width:'100%',padding:7,borderRadius:8,border:'1px dashed rgba(255,255,255,.18)',background:'transparent',color:'#7A6985',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:8}}>＋ Criar ficha</button>}
            </div>}
          </div>`;
src = src.slice(0, sheetBarStart) + compactSheetLauncher + src.slice(sheetBarEnd);

if (!src.includes('const TOKEN_THROTTLE_MS = 40;')) throw new Error('Throttle realtime não aplicado.');
if (!src.includes("transition: draggingId === token.id ? 'none' : 'left 45ms linear, top 45ms linear'")) throw new Error('Interpolação remota ausente.');
if (src.includes('lastFallbackWrite')) throw new Error('Fallback de array completo ainda ativo durante arraste.');
if (!src.includes('sheetVitals')) throw new Error('Vínculo de token com ficha não foi aplicado.');
if (!src.includes('battlemap-sheet-launcher')) throw new Error('Lançador compacto de ficha não foi aplicado.');
fs.writeFileSync(battleFile, src);

// ── Diário Vivo editável para o Mestre ────────────────────────────────────
const experienceSourceFile = path.join(process.cwd(), 'src', 'experience', 'ExperienceKit.jsx');
const experienceGeneratedFile = path.join(process.cwd(), 'src', 'experience', 'ExperienceKit.generated.jsx');
let experience = fs.readFileSync(experienceSourceFile, 'utf8');

function replaceExperience(pattern, replacement, label) {
  const next = experience.replace(pattern, replacement);
  if (next === experience) throw new Error(`Experience patch falhou: ${label}`);
  experience = next;
}

replaceExperience(
  '  collection, doc, limit, onSnapshot, orderBy, query, setDoc, updateDoc,',
  '  collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, setDoc, updateDoc,',
  'import deleteDoc'
);

replaceExperience(
  "  const addJournal=useCallback(async(text,type='story',extra={})=>{\n    if(!String(text||'').trim()) return;\n    const id=extra.id||nowId('journal');\n    await setDoc(doc(db,'session_journal',id),{\n      text:String(text).trim(), type, ts:extra.ts||Date.now(), round:extra.round??combatState.round??null,\n      memory:!!extra.memory, icon:extra.icon||'', color:extra.color||'', source:extra.source||'site',\n    });\n  },[combatState.round]);",
  "  const addJournal=useCallback(async(text,type='story',extra={})=>{\n    if(!String(text||'').trim()) return;\n    const id=extra.id||nowId('journal');\n    await setDoc(doc(db,'session_journal',id),{\n      text:String(text).trim(), type, ts:extra.ts||Date.now(), round:extra.round??combatState.round??null,\n      memory:!!extra.memory, icon:extra.icon||'', color:extra.color||'', source:extra.source||'site',\n    });\n  },[combatState.round]);\n\n  const updateJournal=useCallback(async(id,text)=>{\n    const clean=String(text||'').trim(); if(!id||!clean)return;\n    await updateDoc(doc(db,'session_journal',String(id)),{text:clean,editedAt:Date.now()});\n  },[]);\n\n  const deleteJournal=useCallback(async id=>{\n    if(!id)return;\n    await deleteDoc(doc(db,'session_journal',String(id)));\n  },[]);",
  'ações de edição do diário'
);

replaceExperience(
  '    triggerCosmicEvent,setActiveMap,nextTurn,endCombat,addJournal,addAtlasDiscovery,useQuickAbility,',
  '    triggerCosmicEvent,setActiveMap,nextTurn,endCombat,addJournal,updateJournal,deleteJournal,addAtlasDiscovery,useQuickAbility,',
  'ações do diário no contexto'
);
replaceExperience(
  '    addJournal,addAtlasDiscovery,useQuickAbility,',
  '    addJournal,updateJournal,deleteJournal,addAtlasDiscovery,useQuickAbility,',
  'dependências do diário no contexto'
);

replaceExperience(
  "    session,combat,combatState,ambient,selectedSheet,selectedSheetId,setSelectedSheetId,sheets,journal,atlas,activeMap,",
  "    session,combat,combatState,ambient,selectedSheet,selectedSheetId,setSelectedSheetId,sheets,journal,atlas,activeMap,updateJournal,deleteJournal,",
  'controles no dashboard'
);

replaceExperience(
  /<section className="session-card journal-card"><header><span>DIÁRIO VIVO<\/span><span>\{recent\.length\} registros recentes<\/span><\/header><div className="journal-mini">\{recent\.length\?recent\.map\(item=><div key=\{item\.id\}>[\s\S]*?<\/div>\):<div className="empty-state">A sessão ainda não deixou rastros\.<\/div>\}<\/div><\/section>/,
  `<section className="session-card journal-card"><header><span>DIÁRIO VIVO</span><span>{recent.length} registros recentes</span></header><div className="journal-mini">{recent.length?recent.map(item=><div key={item.id}><i style={{background:item.color||'#A855F7'}}>{item.icon||'•'}</i><p>{item.text}</p><time>{item.round?\`R\${item.round} · \`:''}{new Date(item.ts||Date.now()).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}{item.editedAt?' · editado':''}</time>{masterMode&&<span className="journal-mini-actions"><button title="Editar" onClick={async()=>{const next=window.prompt('Editar registro do Diário Vivo:',item.text);if(next!=null&&next.trim())await updateJournal(item.id,next)}}>✎</button><button title="Excluir" onClick={()=>window.confirm('Excluir este registro do Diário Vivo?')&&deleteJournal(item.id)}>✕</button></span>}</div>):<div className="empty-state">A sessão ainda não deixou rastros.</div>}</div></section>`,
  'controles rápidos no diário da sessão'
);

const journalDrawerReplacement = `function JournalDrawer(){
  const { journal,addJournal,updateJournal,deleteJournal,masterMode }=useExperience();
  const [open,setOpen]=useState(false); const [text,setText]=useState(''); const [editingId,setEditingId]=useState(''); const [editingText,setEditingText]=useState('');
  const add=async()=>{if(!text.trim())return;await addJournal(text,'story',{memory:true,icon:'✦',color:'#C8A8E8'});setText('');};
  const beginEdit=item=>{setEditingId(String(item.id));setEditingText(item.text||'');};
  const saveEdit=async()=>{if(!editingId||!editingText.trim())return;await updateJournal(editingId,editingText);setEditingId('');setEditingText('');};
  const remove=async item=>{if(!window.confirm('Excluir este registro do Diário Vivo?'))return;await deleteJournal(item.id);if(String(editingId)===String(item.id)){setEditingId('');setEditingText('');}};
  return <><button className="journal-fab" onClick={()=>setOpen(true)} title="Diário Vivo">🗒️</button>{open&&<div className="journal-backdrop" onClick={()=>setOpen(false)}><aside className="journal-drawer" onClick={e=>e.stopPropagation()}><header><div><small>MEMÓRIAS DA MESA</small><h3>Diário Vivo</h3></div><button onClick={()=>setOpen(false)}>✕</button></header>{masterMode&&<div className="journal-add"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="Registrar uma memória..."/><button onClick={add}>Inscrever</button></div>}<div className="journal-timeline">{journal.map(item=><article key={item.id} className={item.memory?'memory':''}><i style={{'--c':item.color||'#A855F7'}}>{item.icon||'•'}</i><div>{editingId===String(item.id)?<div className="journal-inline-edit"><input value={editingText} onChange={e=>setEditingText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveEdit();if(e.key==='Escape'){setEditingId('');setEditingText('')}}} autoFocus/><span><button onClick={saveEdit}>Salvar</button><button onClick={()=>{setEditingId('');setEditingText('')}}>Cancelar</button></span></div>:<><p>{item.text}</p><small>{item.round?\`Rodada \${item.round} · \`:''}{new Date(item.ts||Date.now()).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}{item.editedAt?' · editado':''}</small></>}</div>{item.memory&&<b>MEMÓRIA</b>}{masterMode&&editingId!==String(item.id)&&<span className="journal-entry-actions"><button title="Editar" onClick={()=>beginEdit(item)}>✎</button><button title="Excluir" onClick={()=>remove(item)}>🗑</button></span>}</article>)}</div></aside></div>}</>;
}

function AtlasDiscoveryPanel`;
replaceExperience(
  /function JournalDrawer\(\)\{[\s\S]*?\n\}\n\nfunction AtlasDiscoveryPanel/,
  journalDrawerReplacement,
  'drawer editável do diário'
);

if (!experience.includes('deleteJournal')) throw new Error('Exclusão do Diário Vivo não foi aplicada.');
if (!experience.includes('journal-inline-edit')) throw new Error('Edição inline do Diário Vivo não foi aplicada.');
fs.writeFileSync(experienceGeneratedFile, experience);

const appFile = path.join(process.cwd(), 'src', 'App.generated.jsx');
let app = fs.readFileSync(appFile, 'utf8');

function replaceApp(pattern, replacement, label) {
  const next = app.replace(pattern, replacement);
  if (next === app) throw new Error(`Realtime shell patch falhou: ${label}`);
  app = next;
}

replaceApp(
  'import "./experience/access.css";',
  'import "./experience/access.css";\nimport "./experience/realtime.css";',
  'CSS realtime'
);
replaceApp(
  '} from "./experience/ExperienceKit";',
  '} from "./experience/ExperienceKit.generated";',
  'ExperienceKit editável gerado'
);
replaceApp(
  'import PublicDiceOverlay from "./shell/PublicDiceOverlay";',
  'import RealtimeBroadcasts from "./experience/RealtimeBroadcasts";',
  'overlay de dados resiliente'
);
replaceApp(
  '<PublicDiceOverlay/>',
  '<RealtimeBroadcasts/>',
  'montagem dos broadcasts'
);
replaceApp(
  'className={`access-${access.role}`}',
  'className={`access-${access.role} realtime-sync-enabled`}',
  'supressão do evento cósmico legado'
);

// O player de música deixa de flutuar sobre mapa/HUD e passa a morar na barra superior.
replaceApp(
  '<div className="top-actions">\n              <PlayerIdentityChip access={access} onLogout={logout}/>',
  '<div className="top-actions">\n              <AmbientSoundPlayer masterMode={masterMode}/>\n              <PlayerIdentityChip access={access} onLogout={logout}/>',
  'player de música na topbar'
);
replaceApp(
  '        <ExperienceLayer onNavigate={navigate}/>\n        <AmbientSoundPlayer masterMode={masterMode}/>\n        <DiceWidget/>',
  '        <ExperienceLayer onNavigate={navigate}/>\n        <DiceWidget/>',
  'remoção do player flutuante antigo'
);

if (app.includes('<PublicDiceOverlay/>')) throw new Error('Overlay público legado ainda montado.');
if (!app.includes('<RealtimeBroadcasts/>')) throw new Error('RealtimeBroadcasts não foi montado.');
if ((app.match(/<AmbientSoundPlayer masterMode=\{masterMode\}\/\>/g) || []).length !== 1) {
  throw new Error('AmbientSoundPlayer deve existir uma única vez na topbar.');
}
fs.writeFileSync(appFile, app);

const ambientFile = path.join(process.cwd(), 'src', 'shell', 'AmbientSoundPlayer.jsx');
let ambient = fs.readFileSync(ambientFile, 'utf8');
const ambientRootPattern = /<div style=\{\{ position: 'fixed', [^\n]*?zIndex: (?:100|230) \}\}>/;
const ambientRootAfter = '<div className="ambient-topbar-player" style={{ position: \'relative\', zIndex: 100, flexShrink: 0 }}>';
const ambientWithRoot = ambient.replace(ambientRootPattern, ambientRootAfter);
if (ambientWithRoot === ambient) throw new Error('Raiz flutuante do player de música não encontrada.');
ambient = ambientWithRoot;
ambient = ambient.replace(
  "<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>",
  "<div className=\"ambient-topbar-closed\" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>",
);
ambient = ambient.replace(
  "style={{ width: 48, height: 48, borderRadius: '50%'",
  "className=\"ambient-mute-button\" style={{ width: 36, height: 36, borderRadius: '50%'",
);
ambient = ambient.replace(
  "<div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(10,12,28,0.92)'",
  "<div className=\"ambient-track-pill\" style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(10,12,28,0.92)'",
);
ambient = ambient.replace('maxWidth: 220', 'maxWidth: 180');
ambient = ambient.replace(
  "style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.04)'",
  "className=\"ambient-playlist-button\" style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.04)'",
);
fs.writeFileSync(ambientFile, ambient);

const globalCssFile = path.join(process.cwd(), 'src', 'styles', 'global.css');
fs.appendFileSync(globalCssFile, `\n/* Música integrada à topbar: nunca cobre mapa, HUD, diário ou dados. */\n.ambient-topbar-player{display:flex;align-items:center;max-width:min(340px,36vw)}\n.ambient-topbar-closed{min-width:0;max-width:100%}\n.ambient-track-pill{min-width:0}\n/* Ficha compacta no mapa e ações do Diário Vivo */\n.battlemap-sheet-launcher button{transition:transform .18s,border-color .18s,box-shadow .18s}.battlemap-sheet-launcher>button:hover{transform:translateY(-2px);border-color:rgba(168,85,247,.75)!important;box-shadow:0 8px 24px rgba(0,0,0,.62),0 0 18px rgba(168,85,247,.25)!important}\n.journal-mini>div{position:relative}.journal-mini-actions{display:flex;gap:3px;margin-left:3px}.journal-mini-actions button,.journal-entry-actions button{border:1px solid rgba(168,85,247,.14);background:rgba(168,85,247,.045);color:#806b91;border-radius:6px;cursor:pointer;font-size:9px;padding:3px 5px}.journal-entry-actions{display:flex;gap:4px;align-self:center}.journal-entry-actions button:last-child,.journal-mini-actions button:last-child{border-color:rgba(232,25,60,.13);background:rgba(232,25,60,.04);color:#9b5261}.journal-inline-edit{display:grid;gap:6px}.journal-inline-edit input{width:100%;background:rgba(255,255,255,.035);border:1px solid rgba(168,85,247,.22);border-radius:7px;color:#c8b8a0;padding:7px 8px}.journal-inline-edit span{display:flex;gap:5px}.journal-inline-edit button{border:1px solid rgba(168,85,247,.17);background:rgba(168,85,247,.06);color:#947bad;border-radius:6px;padding:4px 7px;font-family:'Cinzel',serif;font-size:7px;cursor:pointer}\n@media(max-width:1100px){.ambient-track-pill{max-width:135px!important}.ambient-track-pill input[type=range]{width:44px!important}}\n@media(max-width:900px){.ambient-topbar-player{max-width:none}.ambient-track-pill{display:none!important}.ambient-mute-button{width:32px!important;height:32px!important;font-size:16px!important}.ambient-playlist-button{width:30px!important;height:30px!important}.immersive-topbar .top-actions{gap:6px}.battlemap-sheet-launcher{left:10px!important;bottom:78px!important}.journal-mini-actions{display:none}}\n@media(max-width:520px){.ambient-playlist-button{display:none!important}}\n`);

console.log('Dinastia E: realtime, música, tokens vinculados às fichas e Diário Vivo editável preparados.');

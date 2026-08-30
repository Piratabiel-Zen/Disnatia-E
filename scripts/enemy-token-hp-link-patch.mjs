import fs from 'node:fs';
import path from 'node:path';

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  const next = source.replace(before, after);
  if (next === source) throw new Error(`Enemy token/HP patch falhou: ${label}`);
  return next;
}

const root = process.cwd();
const battleFile = path.join(root, 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let battle = fs.readFileSync(battleFile, 'utf8');

battle = replaceRequired(
  battle,
  "  const [formSheetId, setFormSheetId] = useState('');",
  "  const [formSheetId, setFormSheetId] = useState('');\n  const [formEnemyId, setFormEnemyId] = useState('');",
  'estado de vínculo com inimigo'
);

battle = replaceRequired(
  battle,
  "await setDoc(doc(db,'battlemap_token_library',id),{nome:formNome.trim(),foto:formFoto,tipo:formTipo,size:70,sheetId:formSheetId||'',createdAt:Date.now()});",
  "await setDoc(doc(db,'battlemap_token_library',id),{nome:formNome.trim(),foto:formFoto,tipo:formTipo,size:70,sheetId:formSheetId||'',enemyId:formEnemyId||'',createdAt:Date.now()});",
  'enemyId salvo na biblioteca'
);

battle = replaceRequired(
  battle,
  "const token={...newToken(Date.now()),nome:tpl.nome||'Token',foto:tpl.foto||'',tipo:tpl.tipo||'jogador',size:tpl.size||70,x:50,y:50,hp:tpl.hp||0,maxHp:tpl.maxHp||tpl.hp||0,status:tpl.status||{},rangeMeters:0,sheetId:tpl.sheetId||''};",
  "const token={...newToken(Date.now()),nome:tpl.nome||'Token',foto:tpl.foto||'',tipo:tpl.tipo||'jogador',size:tpl.size||70,x:50,y:50,hp:tpl.hp||0,maxHp:tpl.maxHp||tpl.hp||0,status:tpl.status||{},rangeMeters:0,sheetId:tpl.sheetId||'',enemyId:tpl.enemyId||''};",
  'enemyId restaurado da biblioteca'
);

battle = replaceRequired(
  battle,
  "const nt = { ...newToken(Date.now()), nome: formNome.trim(), tipo: formTipo, foto: formFoto, sheetId: formSheetId || '' };",
  "const nt = { ...newToken(Date.now()), nome: formNome.trim(), tipo: formTipo, foto: formFoto, sheetId: formSheetId || '', enemyId: formEnemyId || '' };",
  'enemyId no novo token'
);

battle = replaceRequired(
  battle,
  "setFormNome(''); setFormFoto(''); setFormSheetId(''); setShowAddForm(false);",
  "setFormNome(''); setFormFoto(''); setFormSheetId(''); setFormEnemyId(''); setShowAddForm(false);",
  'reset do vínculo de inimigo'
);

const oldVitals = `                  const linkedVitals = token.sheetId ? sheetVitals[String(token.sheetId)] : null;\n                  const displayHp = linkedVitals ? Number(linkedVitals.hp||0) : Number(token.hp||0);\n                  const displayMaxHp = linkedVitals ? Number(linkedVitals.maxHp||1) : Number(token.maxHp||0);`;
const newVitals = `                  const linkedEnemyVitals = token.enemyId ? enemies.find(e => String(e.id) === String(token.enemyId)) : null;\n                  const linkedSheetVitals = token.sheetId ? sheetVitals[String(token.sheetId)] : null;\n                  const linkedEnemyMaxHp = linkedEnemyVitals ? Math.max(1, Number(linkedEnemyVitals.hp_max ?? Math.max(10, Number(linkedEnemyVitals.hp || 10))) + Math.max(0, Number(linkedEnemyVitals.hp_bonus || 0))) : 0;\n                  const displayHp = linkedEnemyVitals ? Number(linkedEnemyVitals.hp||0) : (linkedSheetVitals ? Number(linkedSheetVitals.hp||0) : Number(token.hp||0));\n                  const displayMaxHp = linkedEnemyVitals ? linkedEnemyMaxHp : (linkedSheetVitals ? Number(linkedSheetVitals.maxHp||1) : Number(token.maxHp||0));`;
battle = replaceRequired(battle, oldVitals, newVitals, 'vida derivada do inimigo no token');

const helperAnchor = "  const toggleFloatingEnemy = eid => {";
const helperBlock = `  const enemyMaxHpForToken = enemy => Math.max(1, Number(enemy?.hp_max ?? Math.max(10, Number(enemy?.hp || 10))) + Math.max(0, Number(enemy?.hp_bonus || 0)));\n  const tokenVitalState = token => {\n    const enemy = token?.enemyId ? enemies.find(e => String(e.id) === String(token.enemyId)) : null;\n    if (enemy) return { kind:'enemy', entity:enemy, hp:Number(enemy.hp||0), maxHp:enemyMaxHpForToken(enemy) };\n    const sheet = token?.sheetId ? sheets.find(s => String(s.id) === String(token.sheetId)) : null;\n    if (sheet) return { kind:'sheet', entity:sheet, hp:Number(sheet.hp||0), maxHp:getSheetMaxHp(sheet) };\n    return { kind:'manual', entity:null, hp:Number(token?.hp||0), maxHp:Number(token?.maxHp||0) };\n  };\n  const setTokenLinkedHp = (token, nextHp) => {\n    const vital = tokenVitalState(token);\n    const raw = Math.max(0, Number(nextHp)||0);\n    const hp = vital.kind === 'manual' ? raw : Math.min(Math.max(1, vital.maxHp || 1), raw);\n    if (vital.kind === 'enemy') { updEnemyFromMap(vital.entity.id, { ...vital.entity, hp }); return; }\n    if (vital.kind === 'sheet') { updSheet(vital.entity.id, { ...vital.entity, hp }); return; }\n    updateToken(token.id, { hp });\n  };\n\n${helperAnchor}`;
battle = replaceRequired(battle, helperAnchor, helperBlock, 'helpers de HP vinculado');

const selectedPicker = "<label style={{display:'block',fontSize:9,color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:10}}>Ficha vinculada<select value={selectedToken.sheetId||''} onChange={e=>updateToken(selectedToken.id,{sheetId:e.target.value})} style={{width:'100%',marginTop:4,fontSize:10}}><option value=''>Nenhuma — HP manual</option>{sheets.map(s=><option key={s.id} value={s.id}>{s.nome||'Personagem'}</option>)}</select></label>";
const selectedPickerNew = `<label style={{display:'block',fontSize:9,color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:10}}>Vida vinculada<select value={selectedToken.enemyId?\`enemy:\${selectedToken.enemyId}\`:(selectedToken.sheetId?\`sheet:\${selectedToken.sheetId}\`:'')} onChange={e=>{const raw=e.target.value;const idx=raw.indexOf(':');const kind=idx>0?raw.slice(0,idx):'';const id=idx>0?raw.slice(idx+1):'';updateToken(selectedToken.id,{sheetId:kind==='sheet'?id:'',enemyId:kind==='enemy'?id:''});}} style={{width:'100%',marginTop:4,fontSize:10}}><option value=''>Nenhuma — HP manual</option><optgroup label='Personagens'>{sheets.map(s=><option key={\`sheet_\${s.id}\`} value={\`sheet:\${s.id}\`}>{s.nome||'Personagem'}</option>)}</optgroup>{masterMode&&<optgroup label='Inimigos'>{enemies.map(enemy=><option key={\`enemy_\${enemy.id}\`} value={\`enemy:\${enemy.id}\`}>💀 {enemy.nome||'Inimigo'} · {Number(enemy.hp||0)}/{enemyMaxHpForToken(enemy)} HP</option>)}</optgroup>}</select><span style={{display:'block',marginTop:4,color:'#51465D',fontSize:8}}>O HP do token acompanha a ficha escolhida em tempo real.</span></label>`;
battle = replaceRequired(battle, selectedPicker, selectedPickerNew, 'seletor de vida do token existente');

const formPicker = "<label style={{display:'block',marginTop:9,fontSize:9,color:'#7B6D8A',fontFamily:'Cinzel,serif'}}>Vincular à ficha<select value={formSheetId} onChange={e=>setFormSheetId(e.target.value)} style={{width:'100%',marginTop:4,fontSize:10}}><option value=''>Nenhuma — HP manual</option>{sheets.map(s=><option key={s.id} value={s.id}>{s.nome||'Personagem'}</option>)}</select></label>";
const formPickerNew = `<label style={{display:'block',marginTop:9,fontSize:9,color:'#7B6D8A',fontFamily:'Cinzel,serif'}}>Vincular vida<select value={formEnemyId?\`enemy:\${formEnemyId}\`:(formSheetId?\`sheet:\${formSheetId}\`:'')} onChange={e=>{const raw=e.target.value;const idx=raw.indexOf(':');const kind=idx>0?raw.slice(0,idx):'';const id=idx>0?raw.slice(idx+1):'';setFormSheetId(kind==='sheet'?id:'');setFormEnemyId(kind==='enemy'?id:'');}} style={{width:'100%',marginTop:4,fontSize:10}}><option value=''>Nenhuma — HP manual</option><optgroup label='Personagens'>{sheets.map(s=><option key={\`sheet_form_\${s.id}\`} value={\`sheet:\${s.id}\`}>{s.nome||'Personagem'}</option>)}</optgroup>{masterMode&&<optgroup label='Inimigos'>{enemies.map(enemy=><option key={\`enemy_form_\${enemy.id}\`} value={\`enemy:\${enemy.id}\`}>💀 {enemy.nome||'Inimigo'}</option>)}</optgroup>}</select></label>`;
battle = replaceRequired(battle, formPicker, formPickerNew, 'seletor de vida no novo token');

const hpEditor = `<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:10}}>\n                <label style={{fontSize:9,color:'#7B6D8A',fontFamily:'Cinzel,serif'}}>HP<input type='number' value={selectedToken.hp||0} onChange={e=>updateToken(selectedToken.id,{hp:Number(e.target.value)})} style={{width:'100%',fontSize:11,marginTop:3}}/></label>\n                <label style={{fontSize:9,color:'#7B6D8A',fontFamily:'Cinzel,serif'}}>HP Máx.<input type='number' value={selectedToken.maxHp||0} onChange={e=>updateToken(selectedToken.id,{maxHp:Number(e.target.value)})} style={{width:'100%',fontSize:11,marginTop:3}}/></label>\n              </div>`;
const hpEditorNew = `{(()=>{const vital=tokenVitalState(selectedToken);const linked=vital.kind!=='manual';return <div style={{marginBottom:10,padding:8,borderRadius:8,border:'1px solid rgba(255,255,255,.07)',background:'rgba(255,255,255,.018)'}}>\n                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,marginBottom:7,flexWrap:'wrap'}}>\n                  {[-10,-5,-1].map(v=><button key={v} onClick={()=>setTokenLinkedHp(selectedToken,vital.hp+v)} style={{padding:'3px 7px',borderRadius:6,border:'1px solid rgba(232,25,60,.3)',background:'rgba(232,25,60,.09)',color:'#E8193C',cursor:'pointer',fontSize:9}}>{v}</button>)}\n                  <b style={{minWidth:62,textAlign:'center',font:'800 12px Cinzel,serif',color:hpColor(vital.hp,Math.max(1,vital.maxHp))}}>❤ {vital.hp}/{vital.maxHp}</b>\n                  {[1,5,10].map(v=><button key={v} onClick={()=>setTokenLinkedHp(selectedToken,vital.hp+v)} style={{padding:'3px 7px',borderRadius:6,border:'1px solid rgba(74,222,128,.3)',background:'rgba(74,222,128,.09)',color:'#4ADE80',cursor:'pointer',fontSize:9}}>+{v}</button>)}\n                </div>\n                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>\n                  <label style={{fontSize:9,color:'#7B6D8A',fontFamily:'Cinzel,serif'}}>HP<input type='number' value={vital.hp} onChange={e=>setTokenLinkedHp(selectedToken,Number(e.target.value))} style={{width:'100%',fontSize:11,marginTop:3}}/></label>\n                  <label style={{fontSize:9,color:'#7B6D8A',fontFamily:'Cinzel,serif'}}>HP Máx.<input type='number' value={vital.maxHp} disabled={linked} onChange={e=>updateToken(selectedToken.id,{maxHp:Math.max(0,Number(e.target.value)||0)})} style={{width:'100%',fontSize:11,marginTop:3,opacity:linked?.62:1}}/></label>\n                </div>\n                {linked&&<div style={{marginTop:5,fontSize:8,color:'#665A70',fontFamily:'Cinzel,serif'}}>HP máximo vem da ficha vinculada.</div>}\n              </div>})()}`;
battle = replaceRequired(battle, hpEditor, hpEditorNew, 'controles de HP do token');

for (const marker of ['formEnemyId','enemyId:tpl.enemyId','Vida vinculada','tokenVitalState','setTokenLinkedHp','enemyMaxHpForToken']) {
  if (!battle.includes(marker)) throw new Error(`Enemy token/HP patch incompleto no mapa: ${marker}`);
}
fs.writeFileSync(battleFile, battle);

const enemySheetFile = path.join(root, 'src', 'experience', 'EnemySheetExperience.jsx');
let enemySheet = fs.readFileSync(enemySheetFile, 'utf8');
const mainHpTrack = `<div className="enemy-hp-track"><i style={{width:\`${'${'}Math.min(100,(hp/maxHp)*100)}%\`,background:hpColor(hp,maxHp)}}/></div>`;
const mainQuick = `${mainHpTrack}\n              <div className="enemy-hp-quick" style={{display:'flex',gap:5,justifyContent:'center',flexWrap:'wrap',marginTop:10}}>{[-15,-10,-5].map(v=><button key={v} onClick={()=>f('hp',Math.max(0,hp+v))} style={{padding:'4px 9px',borderRadius:6,border:'1px solid rgba(232,25,60,.3)',background:'rgba(232,25,60,.09)',color:'#E8193C',cursor:'pointer',fontWeight:700}}>{v}</button>)}{[5,10,15].map(v=><button key={v} onClick={()=>f('hp',Math.min(maxHp,hp+v))} style={{padding:'4px 9px',borderRadius:6,border:'1px solid rgba(74,222,128,.3)',background:'rgba(74,222,128,.09)',color:'#4ADE80',cursor:'pointer',fontWeight:700}}>+{v}</button>)}</div>`;
enemySheet = replaceRequired(enemySheet, mainHpTrack, mainQuick, 'atalhos de HP na ficha de inimigo');
fs.writeFileSync(enemySheetFile, enemySheet);

const floatingEnemyFile = path.join(root, 'src', 'experience', 'BattleMapEnemySheet.jsx');
let floatingEnemy = fs.readFileSync(floatingEnemyFile, 'utf8');
const floatingTrack = `<div className="enemy-hp-track" style={{marginTop:8}}><i style={{width:\`${'${'}Math.min(100,(hp/maxHp)*100)}%\`,background:hpColor(hp,maxHp)}}/></div>`;
const floatingQuick = `${floatingTrack}\n      <div style={{display:'flex',justifyContent:'center',gap:4,marginTop:7,flexWrap:'wrap'}}>{[-10,-5].map(v=><button key={v} onClick={()=>f('hp',Math.max(0,hp+v))} style={{padding:'3px 7px',borderRadius:5,border:'1px solid rgba(232,25,60,.28)',background:'rgba(232,25,60,.08)',color:'#E8193C',cursor:'pointer',fontSize:9}}>{v}</button>)}{[5,10].map(v=><button key={v} onClick={()=>f('hp',Math.min(maxHp,hp+v))} style={{padding:'3px 7px',borderRadius:5,border:'1px solid rgba(74,222,128,.28)',background:'rgba(74,222,128,.08)',color:'#4ADE80',cursor:'pointer',fontSize:9}}>+{v}</button>)}</div>`;
floatingEnemy = replaceRequired(floatingEnemy, floatingTrack, floatingQuick, 'atalhos de HP na ficha flutuante do inimigo');
fs.writeFileSync(floatingEnemyFile, floatingEnemy);

console.log('Dinastia E: vínculo de HP de tokens com inimigos e atalhos positivos/negativos de vida aplicados.');

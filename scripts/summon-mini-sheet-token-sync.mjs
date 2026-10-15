import fs from 'node:fs';

const rackPath='src/experience/SummonCombatRack.jsx';
let rack=fs.readFileSync(rackPath,'utf8');
if(!rack.includes('export function SummonMiniSheet')) rack=rack.replace('function SummonMiniSheet(', 'export function SummonMiniSheet(');
if(!rack.includes('export function SummonSheetControls')) rack += `

export function SummonSheetControls({sheetId, memories=[]}) {
  const api=useExperience();
  const active=(api.summons||[]).filter(row=>row.active!==false&&String(row.ownerSheetId)===String(sheetId));
  const visibleMemories=(memories||[]).filter(memory=>memory.revealed===true);
  return <div className="summon-sheet-controls" aria-label="Controle das invocações">
    {active.length ? active.map(record=><SummonMiniSheet key={record.id} record={record} memory={visibleMemories.find(memory=>String(memory.id)===String(record.summonMemoryId))} api={api}/>) : <p className="summon-sheet-empty">Nenhuma invocação ativa. Quando uma invocação for liberada, seus recursos e habilidades aparecerão aqui.</p>}
  </div>;
}
`;
fs.writeFileSync(rackPath,rack);

const sheetPath='src/features/sheets/SheetComponents.jsx';
let sheet=fs.readFileSync(sheetPath,'utf8');
if(!sheet.includes('SummonSheetControls')) {
  sheet="import { SummonSheetControls } from '../../experience/SummonCombatRack';\n"+sheet;
  const anchor='<InvocacoesPanel sheet={sheet} onChange={onChange} sheetColor={sheetColor} masterMode={masterMode}/>';
  if(!sheet.includes(anchor)) throw new Error('Necromancer invocation panel anchor not found');
  sheet=sheet.replace(anchor,anchor+'\n            <SummonSheetControls sheetId={sheet.id} memories={sheet.invocacoes||[]} />');
}
fs.writeFileSync(sheetPath,sheet);

const sheetPage='src/runtime/features/sheets/SheetsPage.jsx';
let page=fs.readFileSync(sheetPage,'utf8');
page=page.replace('}},900);};','}},350);};');
fs.writeFileSync(sheetPage,page);

const mapPath='src/runtime/features/mapa-batalha/BattleMapPage.jsx';
let map=fs.readFileSync(mapPath,'utf8');
const replaceOnce=(from,to,label)=>{if(!map.includes(from))throw new Error('Map patch anchor not found: '+label);map=map.replace(from,to);};
replaceOnce("  const [formEnemyId, setFormEnemyId] = useState('');","  const [formEnemyId, setFormEnemyId] = useState('');\n  const [formSummonDocId, setFormSummonDocId] = useState('');","form summon state");
replaceOnce("  const [enemies, setEnemies] = useState([]);","  const [enemies, setEnemies] = useState([]);\n  const [combatSummons,setCombatSummons]=useState([]);","summon state");
const listenerAnchor="  const [, setTokenSyncRevision] = useState(0);";
replaceOnce(listenerAnchor,listenerAnchor+"\n  useEffect(()=>liveSnapshot(collection(db,'combat_summons'),snapshot=>setCombatSummons(snapshot.docs.map(item=>({summonDocId:item.id,...item.data()})).filter(item=>item.active!==false)),error=>console.error('Erro ao sincronizar invocações:',error)),[]);","summon listener");
replaceOnce("sheetId: formSheetId || '', enemyId: formEnemyId || '' },enemyTemplateForToken","sheetId: formSheetId || '', enemyId: formEnemyId || '', summonDocId: formSummonDocId || '' },enemyTemplateForToken","token create link");
replaceOnce("setFormNome(''); setFormFoto(''); setFormSheetId(''); setFormEnemyId(''); setShowAddForm(false);","setFormNome(''); setFormFoto(''); setFormSheetId(''); setFormEnemyId(''); setFormSummonDocId(''); setShowAddForm(false);","reset summon form");
replaceOnce("  const tokenVitalState = token => {\n    if (hasIndividualHp(token))","  const tokenVitalState = token => {\n    if (token?.summonDocId) { const summon=combatSummons.find(row=>String(row.summonDocId)===String(token.summonDocId)); if(summon)return {kind:'summon',entity:summon,hp:Number(summon.hp||0),maxHp:Math.max(1,Number(summon.maxHp||1))}; }\n    if (hasIndividualHp(token))","summon vitals");
replaceOnce("    if (vital.kind === 'sheet') { updSheet(vital.entity.id, { ...vital.entity, hp }); return; }","    if (vital.kind === 'sheet') { updSheet(vital.entity.id, { ...vital.entity, hp }); return; }\n    if (vital.kind === 'summon') { const delta=hp-vital.hp; const summonId=String(vital.entity.summonDocId||''); if(delta)runTransaction(db,async transaction=>{const ref=doc(db,'combat_summons',summonId);const snapshot=await transaction.get(ref);if(!snapshot.exists())return;const row=snapshot.data()||{};const max=Math.max(1,Number(row.maxHp||vital.maxHp||1));const current=Math.max(0,Math.min(max,Number(row.hp||0)));transaction.set(ref,{hp:Math.max(0,Math.min(max,current+delta)),updatedAt:Date.now()},{merge:true});}).catch(error=>console.error('Erro ao atualizar vida da invocação:',error)); return; }","sync linked summon HP");
const formAnchor="</optgroup>{masterMode&&<optgroup label='Inimigos'>";
replaceOnce(formAnchor,"</optgroup>{masterMode&&<optgroup label='Inimigos'>","keep enemy select intact");
const formLabelEnd=map.indexOf("</label>",map.indexOf("Ficha de referência<select value={formEnemyId"));
if(formLabelEnd<0)throw new Error('Token creation reference selector end missing');
map=map.slice(0,formLabelEnd+8)+"\n              <label style={{display:'block',marginTop:8,fontSize:9,color:'#B38BDE',fontFamily:'Cinzel,serif'}}>Invocação vinculada<select value={formSummonDocId} onChange={e=>{const id=e.target.value;setFormSummonDocId(id);if(id){setFormSheetId('');setFormEnemyId('');}}} style={{width:'100%',marginTop:4,fontSize:10}}><option value=''>Nenhuma</option>{combatSummons.filter(row=>row.active!==false).map(row=><option key={row.summonDocId} value={row.summonDocId}>{row.nome||'Invocação'} · {row.hp??0}/{row.maxHp??1} HP</option>)}</select></label>"+map.slice(formLabelEnd+8);
const selectedEnd=map.indexOf("</label>",map.indexOf("Ficha de referência<select value={selectedToken.enemyId"));
if(selectedEnd<0)throw new Error('Selected token reference selector end missing');
map=map.slice(0,selectedEnd+8)+"\n              <label style={{display:'block',fontSize:9,color:'#B38BDE',fontFamily:'Cinzel,serif',marginBottom:10}}>Invocação vinculada<select value={selectedToken.summonDocId||''} onChange={e=>{const id=e.target.value;updateToken(selectedToken.id,{summonDocId:id,sheetId:id?'':'',enemyId:id?'':''});}} style={{width:'100%',marginTop:4,fontSize:10}}><option value=''>Nenhuma</option>{combatSummons.filter(row=>row.active!==false).map(row=><option key={row.summonDocId} value={row.summonDocId}>{row.nome||'Invocação'} · {row.hp??0}/{row.maxHp??1} HP</option>)}</select></label>"+map.slice(selectedEnd+8);
if(!map.includes("  const rotationFromPointer = (e, element) => {"))throw new Error('Rename insertion anchor missing');
map=map.replace("  const rotationFromPointer = (e, element) => {","  const renameTimersRef=useRef({});\n  const renameToken=(id,nome,flush=false)=>{\n    if(!currentMap)return;\n    const mapId=String(currentMap.id),key=mapId+':'+String(id);\n    const current=mapTokensRef.current[mapId]||currentMap.tokens||[];\n    const next=current.map(token=>String(token.id)===String(id)?{...token,nome}:token);\n    mapTokensRef.current={...mapTokensRef.current,[mapId]:next};\n    setMapTokens(previous=>({...previous,[mapId]:next}));\n    clearTimeout(renameTimersRef.current[key]);\n    const persist=()=>{delete renameTimersRef.current[key];writeLiveTokens(mapId,[{id:String(id),nome}],true).catch(error=>console.error('Erro ao salvar nome do token:',error));};\n    if(flush)persist();else renameTimersRef.current[key]=setTimeout(persist,350);\n  };\n  const rotationFromPointer = (e, element) => {");
map=map.replace("onChange={e => updateToken(selectedToken.id, { nome: e.target.value })}","onChange={e => renameToken(selectedToken.id,e.target.value)} onBlur={e => renameToken(selectedToken.id,e.target.value,true)}");
fs.writeFileSync(mapPath,map);

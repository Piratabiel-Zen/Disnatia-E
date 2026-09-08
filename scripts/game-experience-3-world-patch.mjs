import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const must=(condition,message)=>{if(!condition)throw new Error(`Game Experience 3 patch: ${message}`)};

// ── Battle Map: tipos de ping + integração com a roda global ─────────────
const battleFile=path.join(root,'src','features','mapa-batalha','BattleMapPage.jsx');
let battle=fs.readFileSync(battleFile,'utf8');

if(!battle.includes("const [pingType, setPingType] = useState('look');")){
  const anchor="  const [pingMode, setPingMode] = useState(false);";
  must(battle.includes(anchor),'estado de ping não encontrado');
  battle=battle.replace(anchor,`${anchor}\n  const PING_META = {\n    look:{label:'Olhe aqui',icon:'◎',color:'#b99ad9'},\n    danger:{label:'Perigo',icon:'⚠',color:'#ef5872'},\n    attack:{label:'Atacar',icon:'⚔',color:'#ff8a62'},\n    move:{label:'Mover',icon:'➜',color:'#68d5ff'},\n  };\n  const [pingType, setPingType] = useState('look');`);
}

if(!battle.includes("window.addEventListener('dinastia:ping-type'")){
  const anchor="  const rulerDrawingRef = useRef(false);";
  must(battle.includes(anchor),'âncora para evento global de ping ausente');
  battle=battle.replace(anchor,`${anchor}\n\n  useEffect(() => {\n    const onPingType = event => {\n      const type = String(event?.detail?.type || 'look');\n      if (['look','danger','attack','move'].includes(type)) setPingType(type);\n    };\n    window.addEventListener('dinastia:ping-type', onPingType);\n    return () => window.removeEventListener('dinastia:ping-type', onPingType);\n  }, []);`);
}

if(!battle.includes('type: pingType, pingLabel: pingMeta.label, icon: pingMeta.icon')){
  const helperAnchor="  const sendMapPing = async e => {";
  must(battle.includes(helperAnchor),'sendMapPing ausente');
  battle=battle.replace(helperAnchor,`  const sendMapPing = async e => {\n    const pingMeta = PING_META[pingType] || PING_META.look;`);
  const roleAnchor="      role: masterMode ? 'master' : 'player', createdAt: Date.now(),";
  must(battle.includes(roleAnchor),'payload do ping não encontrado');
  battle=battle.replace(roleAnchor,"      role: masterMode ? 'master' : 'player', type: pingType, pingLabel: pingMeta.label, icon: pingMeta.icon, createdAt: Date.now(),");
}

if(!battle.includes('battlemap-ping-wheel-inline')){
  const zoomMarker="         {/* CONTROLE DE ZOOM — canto inferior direito, compacto */}";
  must(battle.includes(zoomMarker),'marcador de zoom não encontrado');
  const wheel=`         {currentMap?.img && pingMode && (\n            <div className=\"battlemap-ping-wheel-inline\">\n              {Object.entries(PING_META).map(([key,meta]) => (\n                <button key={key} className={pingType===key?'active':''} style={{'--ping-choice-color':meta.color}} onClick={() => setPingType(key)}>\n                  <span>{meta.icon}</span>{meta.label}\n                </button>\n              ))}\n            </div>\n          )}\n\n${zoomMarker}`;
  battle=battle.replace(zoomMarker,wheel);
}

if(!battle.includes("<em>{battlePing.icon||'◎'}</em>")){
  const pingCore="                    <i/><i/><i/><span/><b>{battlePing.name||'Ping'}</b>";
  must(battle.includes(pingCore),'render do ping não encontrado');
  battle=battle.replace(pingCore,"                    <i/><i/><i/><span/><em>{battlePing.icon||'◎'}</em><b>{battlePing.name||'Ping'}{battlePing.pingLabel?` · ${battlePing.pingLabel}`:''}</b>");
}

fs.writeFileSync(battleFile,battle);

// ── Dice Widget: abre pelo HUD e expõe estado open para o Layout Manager ─
const diceFile=path.join(root,'src','shell','DiceWidget.jsx');
let dice=fs.readFileSync(diceFile,'utf8');
if(!dice.includes("window.addEventListener('dinastia:open-dice'")){
  const combatListener=`  useEffect(() => {\n    const unsub = onSnapshot(doc(db, 'config', 'combat'), snap => {\n      if (snap.exists()) setCombatActive(snap.data().active || false);\n    });\n    return () => unsub();\n  }, []);`;
  must(dice.includes(combatListener),'listener de combate do dado não encontrado');
  dice=dice.replace(combatListener,`${combatListener}\n  useEffect(() => {\n    const openFromHud = () => setOpen(true);\n    window.addEventListener('dinastia:open-dice', openFromHud);\n    return () => window.removeEventListener('dinastia:open-dice', openFromHud);\n  }, []);`);
}
if(!dice.includes("className={`dice-widget ${open?'open':''}`}")){
  const before='<div className="dice-widget" style={{position:\'fixed\',';
  const after='<div className={`dice-widget ${open?\'open\':\'\'}`} style={{position:\'fixed\',';
  must(dice.includes(before),'wrapper do DiceWidget não encontrado');
  dice=dice.replace(before,after);
}
fs.writeFileSync(diceFile,dice);

// ── Mapa Múndi: estado vivo por local ───────────────────────────────────
const worldFile=path.join(root,'src','features','mapa-mundi','MapaMundiPage.jsx');
let world=fs.readFileSync(worldFile,'utf8');
if(!world.includes('const STATE_META = {')){
  const typeEnd="  };\n\n  const [atlas, setAtlas]";
  must(world.includes(typeEnd),'TYPE_META do Mapa Múndi não encontrado');
  world=world.replace(typeEnd,`  };\n  const STATE_META = {\n    unknown:{label:'Desconhecido',icon:'?',color:'#736a80'},\n    rumor:{label:'Rumor',icon:'◇',color:'#8f77a6'},\n    descoberto:{label:'Descoberto',icon:'✦',color:'#9b7cff'},\n    visitado:{label:'Visitado',icon:'✓',color:'#6ee7b7'},\n    concluido:{label:'Concluído',icon:'◆',color:'#53f1a6'},\n    corrompido:{label:'Corrompido',icon:'◉',color:'#d45a91'},\n    destruido:{label:'Destruído',icon:'✕',color:'#f87171'},\n  };\n\n  const [atlas, setAtlas]`);
}
world=world.replaceAll(
  "            descoberto: p.descoberto !== false,\n            childMapId:",
  "            descoberto: p.descoberto !== false,\n            estado: p.estado || (p.descoberto === false ? 'unknown' : 'descoberto'),\n            childMapId:"
);
if(!world.includes("      estado: 'descoberto',")){
  const newPin="      descoberto: true,\n      childMapId: '',";
  must(world.includes(newPin),'criação de pin não encontrada');
  world=world.replace(newPin,"      descoberto: true,\n      estado: 'descoberto',\n      childMapId: '',");
}
world=world.replaceAll(
  "                const meta = TYPE_META[pin.tipo] || TYPE_META.desconhecido;\n                const active = String(selectedPin) === String(pin.id);",
  "                const meta = TYPE_META[pin.tipo] || TYPE_META.desconhecido;\n                const stateMeta = STATE_META[pin.estado || (pin.descoberto===false?'unknown':'descoberto')] || STATE_META.descoberto;\n                const active = String(selectedPin) === String(pin.id);"
);
world=world.replaceAll(
  "                      <span style={{ display: 'block', fontSize: 9, color: '#50485B', marginTop: 3 }}>{pin.childMapId ? 'Possui mapa detalhado' : meta.label}</span>",
  "                      <span style={{ display: 'block', fontSize: 9, color: stateMeta.color, marginTop: 3 }}>{pin.childMapId ? `Mapa detalhado · ${stateMeta.label}` : `${meta.label} · ${stateMeta.label}`}</span>"
);
if(!world.includes("value={selPin.estado || 'descoberto'}")){
  const selectAnchor=`                            </select>\n                            <button onClick={() => updatePin(selPin.id, { descoberto: selPin.descoberto === false })}`;
  must(world.includes(selectAnchor),'editor do pin não encontrado');
  const stateSelect=`                            </select>\n                            <select value={selPin.estado || 'descoberto'} onChange={e => updatePin(selPin.id, { estado: e.target.value, descoberto: e.target.value === 'unknown' ? selPin.descoberto : true })} style={{ fontSize: 11, padding: '5px 8px' }}>\n                              {Object.entries(STATE_META).map(([id,m]) => <option key={id} value={id}>{m.icon} {m.label}</option>)}\n                            </select>\n                            <button onClick={() => updatePin(selPin.id, { descoberto: selPin.descoberto === false })}`;
  world=world.replace(selectAnchor,stateSelect);
}
fs.writeFileSync(worldFile,world);

for(const marker of [
  "const [pingType, setPingType] = useState('look');",
  'battlemap-ping-wheel-inline',
  "window.addEventListener('dinastia:open-dice'",
  'const STATE_META = {',
  "value={selPin.estado || 'descoberto'}",
]){
  const haystack=marker.includes('open-dice')?dice:marker.includes('STATE_META')||marker.includes('selPin.estado')?world:battle;
  must(haystack.includes(marker),`marcador final ausente: ${marker}`);
}

console.log('Dinastia E Game Experience 3: ping radial, abertura do dado pelo HUD e estados vivos do Mapa Múndi aplicados.');

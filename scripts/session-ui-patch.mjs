import fs from 'node:fs';
import path from 'node:path';

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  const next = source.replace(before, after);
  if (next === source) throw new Error(`Session UI patch falhou: ${label}`);
  return next;
}

// 1) Jogador autenticado não digita novamente a senha da própria ficha.
const sheetsFile = path.join(process.cwd(), 'src', 'features', 'sheets', 'SheetsPage.jsx');
let sheets = fs.readFileSync(sheetsFile, 'utf8');
sheets = replaceRequired(
  sheets,
  'if (masterMode || !s.senha || unlockedIds[sid]) { setActiveId(sid); return; }',
  "if (masterMode || (playerSheetId && String(playerSheetId) === sid) || !s.senha || unlockedIds[sid]) { setActiveId(sid); return; }",
  'bypass de senha na aba Fichas'
);
sheets = replaceRequired(
  sheets,
  'const locked=!masterMode&&s.senha&&!unlockedIds[String(s.id)];',
  "const locked=!masterMode&&s.senha&&String(playerSheetId||'')!==String(s.id)&&!unlockedIds[String(s.id)];",
  'estado visual desbloqueado da ficha autenticada'
);
fs.writeFileSync(sheetsFile, sheets);

const battleFile = path.join(process.cwd(), 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let battle = fs.readFileSync(battleFile, 'utf8');
battle = replaceRequired(
  battle,
  'if (masterMode || !s.senha || unlockedIds[sid]) { toggleFloatingSheet(sid); return; }',
  "if (masterMode || (playerSheetId && String(playerSheetId) === sid) || !s.senha || unlockedIds[sid]) { toggleFloatingSheet(sid); return; }",
  'bypass de senha da ficha no mapa de batalha'
);
fs.writeFileSync(battleFile, battle);

// 2) Rolagem pública: fechável, some em 4 segundos e fica acima do Diário Vivo.
const broadcastsFile = path.join(process.cwd(), 'src', 'experience', 'RealtimeBroadcasts.jsx');
let broadcasts = fs.readFileSync(broadcastsFile, 'utf8');
broadcasts = replaceRequired(broadcasts, 'const DICE_TTL = 16000;', 'const DICE_TTL = 4000;', 'TTL de quatro segundos do dado');
broadcasts = replaceRequired(
  broadcasts,
  '  const [revealed, setRevealed] = useState(false);',
  '  const [revealed, setRevealed] = useState(false);\n  const [dismissed, setDismissed] = useState(false);',
  'estado de fechar rolagem'
);
broadcasts = replaceRequired(
  broadcasts,
  '  return (\n    <div className="rt-dice-card" style={{ \'--rt-index\': index, \'--rt-color\': color }}>',
  '  if (dismissed) return null;\n  return (\n    <div className="rt-dice-card" style={{ \'--rt-index\': index, \'--rt-color\': color }}>',
  'ocultação manual do card de dado'
);
broadcasts = replaceRequired(
  broadcasts,
  '      <div className="rt-dice-head">🎲 {result.roller || \'Jogador\'} · D{result.sides}</div>',
  '      <div className="rt-dice-head">🎲 {result.roller || \'Jogador\'} · D{result.sides}</div>\n      <button className="rt-dice-close" onClick={() => setDismissed(true)} aria-label="Fechar rolagem" title="Fechar">✕</button>',
  'botão para fechar rolagem'
);
fs.writeFileSync(broadcastsFile, broadcasts);

const realtimeCssFile = path.join(process.cwd(), 'src', 'experience', 'realtime.css');
let realtimeCss = fs.readFileSync(realtimeCssFile, 'utf8');
if (!realtimeCss.includes('/* DADO FECHÁVEL 4S */')) {
  realtimeCss += `\n/* DADO FECHÁVEL 4S */\n.rt-dice-card{position:relative}\n.rt-dice-close{position:absolute;top:7px;right:7px;z-index:4;width:23px;height:23px;border-radius:50%;border:1px solid rgba(255,255,255,.13);background:rgba(5,2,12,.72);color:#8c7a96;display:grid;place-items:center;cursor:pointer;font-size:10px;line-height:1;backdrop-filter:blur(8px);transition:.18s}\n.rt-dice-close:hover{color:#e4d7e8;border-color:rgba(168,85,247,.36);background:rgba(168,85,247,.11)}\n`;
}
if (!realtimeCss.includes('/* DADO ACIMA DO DIARIO */')) {
  realtimeCss += `\n/* DADO ACIMA DO DIARIO */\n.rt-dice-stack{z-index:20050!important}\n`;
}
fs.writeFileSync(realtimeCssFile, realtimeCss);

// 3) HUD de combate: normais + especiais desbloqueadas + habilidades da campanha.
const experienceFile = path.join(process.cwd(), 'src', 'experience', 'ExperienceKit.jsx');
let experience = fs.readFileSync(experienceFile, 'utf8');
experience = replaceRequired(
  experience,
  '  const [sheets,setSheets]=useState([]);',
  '  const [sheets,setSheets]=useState([]);\n  const [customAbilities,setCustomAbilities]=useState({});',
  'estado de habilidades personalizadas no provider'
);
experience = replaceRequired(
  experience,
  "    unsubscribers.push(onSnapshot(collection(db,'sheets'),snap=>setSheets(snap.docs.map(d=>({id:d.id,...d.data()})))));",
  "    unsubscribers.push(onSnapshot(collection(db,'sheets'),snap=>setSheets(snap.docs.map(d=>({id:d.id,...d.data()})))));\n    unsubscribers.push(onSnapshot(doc(db,'config','customAbilities'),snap=>setCustomAbilities(normalizeDoc(snap,{}))));",
  'listener de habilidades de campanha'
);
experience = replaceRequired(
  experience,
  '    tab,masterMode,sheets,selectedSheetId,setSelectedSheetId,selectedSheet,selectedClass,',
  '    tab,masterMode,sheets,customAbilities,selectedSheetId,setSelectedSheetId,selectedSheet,selectedClass,',
  'customAbilities no contexto'
);
experience = replaceRequired(
  experience,
  '    tab,masterMode,sheets,selectedSheetId,setSelectedSheetId,selectedSheet,selectedClass,combat,combatState,',
  '    tab,masterMode,sheets,customAbilities,selectedSheetId,setSelectedSheetId,selectedSheet,selectedClass,combat,combatState,',
  'customAbilities nas dependências'
);
experience = replaceRequired(
  experience,
  '  const { combat,combatState,selectedSheet,selectedClass,useQuickAbility }=useExperience();',
  '  const { combat,combatState,selectedSheet,selectedClass,customAbilities,useQuickAbility }=useExperience();',
  'habilidades de campanha no HUD'
);
experience = replaceRequired(
  experience,
  '  const [expanded,setExpanded]=useState(false);',
  '  const [expanded,setExpanded]=useState(false);\n  const abilityRailRef=useRef(null);',
  'referência da faixa de habilidades'
);
experience = replaceRequired(
  experience,
  '  const abilities=(selectedClass?.normal||[]).slice(0,3);',
  "  const classNormal=(selectedClass?.normal||[]).map(a=>({...a,_source:'normal'}));\n  const classSpecials=(selectedClass?.specials||[]).filter((_,i)=>!!selectedSheet[i===0?'especial1':'especial2']).map(a=>({...a,_source:'special'}));\n  const campaignAbilities=(Array.isArray(customAbilities?.[selectedSheet.id])?customAbilities[selectedSheet.id]:[]).filter(a=>a&&Number(a.req||1)<=Number(selectedSheet.nivel||1)).map(a=>({...a,_source:'campaign'}));\n  const abilities=[...classNormal,...classSpecials,...campaignAbilities];",
  'todas as habilidades da ficha no HUD'
);
experience = replaceRequired(
  experience,
  '    <div className="hud-abilities">{abilities.map(a=>{',
  '    <div className="hud-abilities" ref={abilityRailRef} title="Role o mouse para navegar pelas habilidades" onWheel={e=>{const rail=abilityRailRef.current;if(!rail)return;const delta=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX;if(!delta)return;e.preventDefault();rail.scrollLeft+=delta;}}>{abilities.map(a=>{',
  'scroll horizontal das habilidades'
);
experience = replaceRequired(
  experience,
  "{abilities.map(a=>{const key=String(a.id||a.name);const cd=Number(selectedSheet.cooldowns?.[key]||0);const cost=Number(a.cost||0);const disabled=cd>0||Number(selectedSheet.vigos||0)<cost;return <button key={key} disabled={disabled} onClick={()=>useQuickAbility(a)} title={a.desc}><span>{a.name}</span><small>{cd>0?`⏳ ${cd}`:`⚡ ${cost} VC`}</small></button>})}",
  "{abilities.map(a=>{const key=String(a.id||a.name||a.nome);const cd=Number(selectedSheet.cooldowns?.[key]||0);const cost=Number(a.cost??a.custo??0);const passive=a.tipoHab==='passiva';const label=a.name||a.nome||'Habilidade';const disabled=!passive&&(cd>0||Number(selectedSheet.vigos||0)<cost);const badge=passive?'◇ PASSIVA':cd>0?`⏳ ${cd}`:a._source==='special'?`✦ ${cost} VC`:a._source==='campaign'?`◆ ${cost} VC`:`⚡ ${cost} VC`;return <button key={key} className={`hud-ability ${a._source||''} ${passive?'passive':''}`} disabled={disabled} onClick={()=>{if(!passive)useQuickAbility(a)}} title={a.desc||a.descricao||label}><span>{label}</span><small>{badge}</small></button>})}",
  'renderização completa das habilidades'
);
fs.writeFileSync(experienceFile, experience);

const experienceCssFile = path.join(process.cwd(), 'src', 'experience', 'experience.css');
let experienceCss = fs.readFileSync(experienceCssFile, 'utf8');
if (!experienceCss.includes('/* HUD DE HABILIDADES HORIZONTAL */')) {
  experienceCss += `\n/* HUD DE HABILIDADES HORIZONTAL */\n.hud-abilities{display:flex;grid-template-columns:none;gap:6px;min-width:0;overflow-x:auto;overflow-y:hidden;scroll-behavior:smooth;overscroll-behavior-x:contain;scroll-snap-type:x proximity;padding-bottom:2px;scrollbar-width:thin;scrollbar-color:rgba(168,85,247,.25) transparent}\n.hud-abilities::-webkit-scrollbar{height:4px}.hud-abilities::-webkit-scrollbar-track{background:transparent}.hud-abilities::-webkit-scrollbar-thumb{background:rgba(168,85,247,.22);border-radius:9px}\n.hud-abilities button{flex:0 0 128px;min-width:128px;scroll-snap-align:start}\n.hud-abilities button.special{border-color:rgba(232,160,32,.28);background:rgba(232,160,32,.055)}\n.hud-abilities button.campaign{border-color:rgba(88,217,255,.22);background:rgba(88,217,255,.045)}\n.hud-abilities button.passive{opacity:.72;cursor:default}\n@media(max-width:900px){.combat-hud:not(.expanded) .hud-abilities{display:none}.combat-hud.expanded .hud-abilities{display:flex;grid-column:1/3;grid-row:2;min-width:0;width:100%}.combat-hud.expanded .hud-abilities button{flex-basis:118px;min-width:118px}}\n`;
  fs.writeFileSync(experienceCssFile, experienceCss);
}

// 4) Mapa Múndi: imagens deixam de inflar o único documento config/mapamundi.
// Cada imagem passa a ter seu próprio documento em mapamundi_media, com fallback
// para imagens antigas ainda embutidas no atlas.
const worldMapFile = path.join(process.cwd(), 'src', 'features', 'mapa-mundi', 'MapaMundiPage.jsx');
let worldMap = fs.readFileSync(worldMapFile, 'utf8');
worldMap = replaceRequired(
  worldMap,
  "  const [atlas, setAtlas] = useState({ rootId: ROOT_MAP_ID, maps: {} });",
  "  const [atlas, setAtlas] = useState({ rootId: ROOT_MAP_ID, maps: {} });\n  const [mapMedia, setMapMedia] = useState('');\n  const [pinMedia, setPinMedia] = useState('');",
  'estado de mídia separada do mapa mundi'
);
worldMap = replaceRequired(
  worldMap,
  "  useEffect(() => {\n    setSelectedPin(null);\n    setZoom(1);\n    setPan({ x: 0, y: 0 });\n  }, [currentMapId]);",
  "  useEffect(() => {\n    setSelectedPin(null);\n    setZoom(1);\n    setPan({ x: 0, y: 0 });\n  }, [currentMapId]);\n\n  useEffect(() => {\n    setMapMedia('');\n    const unsub = onSnapshot(doc(db, 'mapamundi_media', `map_${currentMapId}`), snap => {\n      setMapMedia(snap.exists() ? String(snap.data()?.img || '') : '');\n    }, () => setMapMedia(''));\n    return () => unsub();\n  }, [currentMapId]);\n\n  useEffect(() => {\n    setPinMedia('');\n    if (!selectedPin) return;\n    const unsub = onSnapshot(doc(db, 'mapamundi_media', `pin_${currentMapId}_${selectedPin}`), snap => {\n      setPinMedia(snap.exists() ? String(snap.data()?.img || '') : '');\n    }, () => setPinMedia(''));\n    return () => unsub();\n  }, [currentMapId, selectedPin]);",
  'listeners da mídia separada'
);
worldMap = replaceRequired(
  worldMap,
  "  const selPin = (currentMap.pins || []).find(p => String(p.id) === String(selectedPin));",
  "  const selPin = (currentMap.pins || []).find(p => String(p.id) === String(selectedPin));\n  const mapImage = mapMedia || currentMap.img || '';\n  const selectedPinImage = pinMedia || selPin?.imagemLocal || '';",
  'fallback das imagens antigas'
);
worldMap = replaceRequired(
  worldMap,
  "  const handleMapUpload = e => {\n    const file = e.target.files?.[0];\n    if (!file) return;\n    const reader = new FileReader();\n    reader.onload = async ev => {\n      const compressed = await compressImage(ev.target.result, 1800, 1400, 0.8);\n      updateCurrentMap({ img: compressed });\n      pushToast(`Mapa atualizado: ${currentMap.titulo}`, '🗺️', '#9B7CFF');\n    };\n    reader.readAsDataURL(file);\n    e.target.value = '';\n  };",
  "  const compressAtlasMedia = async (dataUrl, kind='map') => {\n    const presets = kind==='map' ? [[1800,1400,.76],[1500,1150,.68],[1200,900,.58]] : [[1100,800,.74],[900,650,.64],[720,520,.56]];\n    let result='';\n    for (const [w,h,q] of presets) {\n      result = await compressImage(dataUrl,w,h,q);\n      if (result.length < 780000) break;\n    }\n    if (!result || result.length > 920000) throw new Error('Imagem ainda muito grande após compressão.');\n    return result;\n  };\n\n  const handleMapUpload = e => {\n    const file = e.target.files?.[0];\n    if (!file) return;\n    const reader = new FileReader();\n    reader.onload = async ev => {\n      try {\n        const compressed = await compressAtlasMedia(ev.target.result, 'map');\n        setMapMedia(compressed);\n        await setDoc(doc(db, 'mapamundi_media', `map_${currentMapId}`), { img: compressed, mapId: String(currentMapId), kind: 'map', updatedAt: Date.now() });\n        pushToast(`Mapa atualizado: ${currentMap.titulo}`, '🗺️', '#9B7CFF');\n      } catch (err) {\n        console.error('Erro ao enviar imagem do mapa:', err);\n        pushToast('Não foi possível enviar esta imagem. Tente um arquivo menor.', '⚠️', '#F87171');\n      }\n    };\n    reader.readAsDataURL(file);\n    e.target.value = '';\n  };",
  'upload do mapa em documento próprio'
);
worldMap = replaceRequired(
  worldMap,
  "  const handlePinImageUpload = e => {\n    const file = e.target.files?.[0];\n    if (!file || !selPin) return;\n    const reader = new FileReader();\n    reader.onload = async ev => {\n      const compressed = await compressImage(ev.target.result, 1000, 700, 0.76);\n      updatePin(selPin.id, { imagemLocal: compressed });\n    };\n    reader.readAsDataURL(file);\n    e.target.value = '';\n  };",
  "  const handlePinImageUpload = e => {\n    const file = e.target.files?.[0];\n    if (!file || !selPin) return;\n    const pinId = String(selPin.id);\n    const reader = new FileReader();\n    reader.onload = async ev => {\n      try {\n        const compressed = await compressAtlasMedia(ev.target.result, 'pin');\n        setPinMedia(compressed);\n        await setDoc(doc(db, 'mapamundi_media', `pin_${currentMapId}_${pinId}`), { img: compressed, mapId: String(currentMapId), pinId, kind: 'pin', updatedAt: Date.now() });\n        pushToast('Imagem do local atualizada.', '✦', '#9B7CFF');\n      } catch (err) {\n        console.error('Erro ao enviar imagem do local:', err);\n        pushToast('Não foi possível enviar esta imagem. Tente um arquivo menor.', '⚠️', '#F87171');\n      }\n    };\n    reader.readAsDataURL(file);\n    e.target.value = '';\n  };",
  'upload da imagem do local em documento próprio'
);
worldMap = replaceRequired(
  worldMap,
  "      img: pin.imagemLocal || '',",
  "      img: '',",
  'mapa filho sem duplicar base64 no atlas'
);
worldMap = replaceRequired(
  worldMap,
  "    persistAtlas({\n      ...atlas,\n      maps: {\n        ...atlas.maps,\n        [currentMapId]: { ...currentMap, pins },\n        [childId]: childMap,\n      }\n    });\n    setCurrentMapId(childId);",
  "    persistAtlas({\n      ...atlas,\n      maps: {\n        ...atlas.maps,\n        [currentMapId]: { ...currentMap, pins },\n        [childId]: childMap,\n      }\n    });\n    const inheritedImage = String(pin.id)===String(selectedPin) ? selectedPinImage : (pin.imagemLocal || '');\n    if (inheritedImage) setDoc(doc(db, 'mapamundi_media', `map_${childId}`), { img: inheritedImage, mapId: String(childId), kind: 'map', updatedAt: Date.now() }).catch(()=>{});\n    setCurrentMapId(childId);",
  'herança de imagem para mapa filho'
);
worldMap = worldMap
  .replace("{currentMap.img ? 'Trocar imagem' : 'Enviar mapa'}", "{mapImage ? 'Trocar imagem' : 'Enviar mapa'}")
  .replace('{!currentMap.img ? (', '{!mapImage ? (')
  .replace('<img src={currentMap.img} alt={currentMap.titulo}', '<img src={mapImage} alt={currentMap.titulo}')
  .replace('{selPin.imagemLocal && <img src={selPin.imagemLocal} alt=""', '{selectedPinImage && <img src={selectedPinImage} alt=""');
for (const marker of ['mapImage', 'selectedPinImage', "mapamundi_media', `map_${currentMapId}`", 'compressAtlasMedia']) {
  if (!worldMap.includes(marker)) throw new Error(`Mapa Múndi sem marcador obrigatório: ${marker}`);
}
fs.writeFileSync(worldMapFile, worldMap);

for (const check of [
  [sheets, 'playerSheetId && String(playerSheetId) === sid', 'senha única em Fichas'],
  [battle, 'playerSheetId && String(playerSheetId) === sid', 'senha única no mapa'],
  [broadcasts, 'const DICE_TTL = 4000;', 'TTL do dado'],
  [broadcasts, 'rt-dice-close', 'fechar dado'],
  [realtimeCss, 'z-index:20050', 'dado acima do Diário'],
  [experience, 'classSpecials=', 'habilidades especiais no HUD'],
  [experience, 'campaignAbilities=', 'habilidades da campanha no HUD'],
  [experience, 'abilityRailRef', 'scroll de habilidades'],
  [worldMap, 'mapamundi_media', 'mídia separada do Mapa Múndi'],
]) {
  if (!check[0].includes(check[1])) throw new Error(`Validação ausente: ${check[2]}`);
}

console.log('Dinastia E: Mapa Múndi usa mídia separada, dado fecha/expira acima do Diário e HUD lista habilidades normais, especiais e de campanha.');

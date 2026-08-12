import fs from 'node:fs';
import path from 'node:path';

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  const next = source.replace(before, after);
  if (next === source) throw new Error(`Combat experience patch falhou: ${label}`);
  return next;
}

function replaceRegexRequired(source, regex, replacement, label) {
  const next = source.replace(regex, replacement);
  if (next === source) throw new Error(`Combat experience patch falhou: ${label}`);
  return next;
}

// O runtime importa ExperienceKit.generated (criado pelo realtime-patch), portanto
// toda alteração de experiência precisa ser aplicada nesse arquivo, não apenas na fonte.
const generatedExperienceFile = path.join(process.cwd(), 'src', 'experience', 'ExperienceKit.generated.jsx');
const sourceExperienceFile = path.join(process.cwd(), 'src', 'experience', 'ExperienceKit.jsx');
const experienceFile = fs.existsSync(generatedExperienceFile) ? generatedExperienceFile : sourceExperienceFile;
let experience = fs.readFileSync(experienceFile, 'utf8');

// ── Soundscapes mais coerentes e variados ──────────────────────────────────
const presetStart = experience.indexOf('const SOUNDSCAPE_PRESETS = {');
const presetEnd = experience.indexOf('\n\nconst EVENT_TYPES =', presetStart);
if (presetStart < 0 || presetEnd < 0) throw new Error('Bloco SOUNDSCAPE_PRESETS não encontrado.');
const richerPresets = `const SOUNDSCAPE_PRESETS = {
  silencio: { label:'Silêncio Ritual', icon:'◌', rain:0, wind:0, fire:0, whispers:0, hum:0, bells:0, drips:0, water:0, insects:0, metal:0, heartbeat:0, arcane:0, thunder:0, crowd:0 },
  catedral: { label:'Catedral Antiga', icon:'⛪', rain:0, wind:6, fire:0, whispers:12, hum:18, bells:48, drips:5, water:0, insects:0, metal:2, heartbeat:0, arcane:10, thunder:0, crowd:0 },
  tempestade: { label:'Tempestade', icon:'⛈️', rain:84, wind:76, fire:0, whispers:0, hum:6, bells:0, drips:0, water:18, insects:0, metal:0, heartbeat:0, arcane:0, thunder:72, crowd:0 },
  fogueira: { label:'Fogueira na Noite', icon:'🔥', rain:0, wind:13, fire:82, whispers:0, hum:2, bells:0, drips:0, water:0, insects:18, metal:0, heartbeat:0, arcane:0, thunder:0, crowd:0 },
  vazio: { label:'Vazio Cósmico', icon:'🌌', rain:0, wind:4, fire:0, whispers:24, hum:62, bells:0, drips:0, water:0, insects:0, metal:0, heartbeat:10, arcane:68, thunder:0, crowd:0 },
  ruinas: { label:'Ruínas Abandonadas', icon:'🏚️', rain:4, wind:38, fire:0, whispers:10, hum:8, bells:0, drips:28, water:5, insects:8, metal:15, heartbeat:0, arcane:0, thunder:0, crowd:0 },
  floresta: { label:'Floresta Noturna', icon:'🌲', rain:2, wind:22, fire:0, whispers:3, hum:1, bells:0, drips:5, water:7, insects:76, metal:0, heartbeat:0, arcane:0, thunder:0, crowd:0 },
  caverna: { label:'Caverna Profunda', icon:'🪨', rain:0, wind:5, fire:0, whispers:5, hum:24, bells:0, drips:72, water:28, insects:0, metal:0, heartbeat:0, arcane:5, thunder:0, crowd:0 },
  masmorra: { label:'Masmorra', icon:'⛓️', rain:0, wind:7, fire:4, whispers:20, hum:16, bells:0, drips:44, water:8, insects:0, metal:38, heartbeat:10, arcane:0, thunder:0, crowd:0 },
  oceano: { label:'Costa Tempestuosa', icon:'🌊', rain:5, wind:48, fire:0, whispers:0, hum:2, bells:0, drips:0, water:86, insects:0, metal:0, heartbeat:0, arcane:0, thunder:8, crowd:0 },
  ritual: { label:'Ritual Cósmico', icon:'🔮', rain:0, wind:5, fire:8, whispers:52, hum:44, bells:16, drips:0, water:0, insects:0, metal:0, heartbeat:42, arcane:78, thunder:0, crowd:0 },
  taverna: { label:'Taverna', icon:'🍺', rain:0, wind:0, fire:38, whispers:0, hum:0, bells:0, drips:0, water:0, insects:0, metal:14, heartbeat:0, arcane:0, thunder:0, crowd:62 },
  batalha: { label:'Campo de Batalha', icon:'⚔️', rain:0, wind:18, fire:10, whispers:0, hum:3, bells:0, drips:0, water:0, insects:0, metal:52, heartbeat:68, arcane:0, thunder:0, crowd:20 },
  cemiterio: { label:'Cemitério', icon:'🪦', rain:3, wind:42, fire:0, whispers:28, hum:9, bells:12, drips:4, water:0, insects:26, metal:0, heartbeat:5, arcane:4, thunder:0, crowd:0 },
  temploTempo: { label:'Templo do Tempo', icon:'⌛', rain:0, wind:3, fire:0, whispers:18, hum:38, bells:28, drips:12, water:0, insects:0, metal:4, heartbeat:8, arcane:82, thunder:0, crowd:0 },
};`;
experience = experience.slice(0, presetStart) + richerPresets + experience.slice(presetEnd);

// ── Provider: habilidades de campanha em realtime ──────────────────────────
experience = replaceRequired(
  experience,
  '  const [sheets,setSheets]=useState([]);',
  '  const [sheets,setSheets]=useState([]);\n  const [customAbilities,setCustomAbilities]=useState({});',
  'estado de habilidades personalizadas'
);
experience = replaceRequired(
  experience,
  "    unsubscribers.push(onSnapshot(collection(db,'sheets'),snap=>setSheets(snap.docs.map(d=>({id:d.id,...d.data()})))));",
  "    unsubscribers.push(onSnapshot(collection(db,'sheets'),snap=>setSheets(snap.docs.map(d=>({id:d.id,...d.data()})))));\n    unsubscribers.push(onSnapshot(doc(db,'config','customAbilities'),snap=>setCustomAbilities(normalizeDoc(snap,{}))));",
  'listener de habilidades personalizadas'
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

// Todo evento do Mestre recebe um documento próprio. Não dependemos de o snapshot
// do documento único conseguir espelhar todas as manifestações em sequência.
experience = replaceRequired(
  experience,
  "    await setDoc(doc(db,'config','cosmic_event'),event);\n    await addJournal(event.text,'event',{id:`event_${event.id}`,ts:event.ts,icon:event.icon,color:event.color,source:'cosmic'});",
  "    await Promise.all([\n      setDoc(doc(db,'config','cosmic_event'),event),\n      setDoc(doc(db,'cosmic_events',event.id),event),\n    ]);\n    await addJournal(event.text,'event',{id:`event_${event.id}`,ts:event.ts,icon:event.icon,color:event.color,source:'cosmic'});",
  'feed durável de todos os eventos cósmicos'
);

// ── Uso rápido de habilidade: valida requisito e sempre publica animação ────
experience = replaceRequired(
  experience,
  "    if(!selectedSheet || !ability) return false;\n    const abilityId=String(ability.id||ability.name||ability.nome||'');\n    const cost=Number(ability.cost||ability.custo||0);",
  "    if(!selectedSheet || !ability) return false;\n    const level=Number(selectedSheet.nivel||1);\n    const req=Number(ability.req||1);\n    const passive=ability.tipoHab==='passiva';\n    if(passive || ability._locked || req>level) return false;\n    const abilityId=String(ability.id||ability.name||ability.nome||'');\n    const cost=Number(ability.cost||ability.custo||0);",
  'validação de requisito no uso rápido'
);
experience = replaceRequired(
  experience,
  "    await setDoc(doc(db,'config','cosmic_event'),{\n      id:nowId('ability'),type:'ability',text:ability.name||ability.nome||'Habilidade',ts:Date.now(),\n      color:selectedClass?.color||'#A855F7',icon:selectedClass?.icon||'⚡',soft:true,\n    });",
  "    const abilityEvent={\n      id:nowId('ability'),type:'ability',text:ability.name||ability.nome||'Habilidade',ts:Date.now(),\n      color:selectedClass?.color||'#A855F7',icon:selectedClass?.icon||'⚡',soft:true,source:'ability',sheetId:String(selectedSheet.id),\n    };\n    await Promise.all([\n      setDoc(doc(db,'config','cosmic_event'),abilityEvent),\n      setDoc(doc(db,'cosmic_events',abilityEvent.id),abilityEvent),\n    ]);",
  'broadcast durável de cada uso de habilidade'
);

// ── HUD dos jogadores: todas as habilidades da ficha ───────────────────────
experience = replaceRequired(
  experience,
  '  const { combat,combatState,selectedSheet,selectedClass,useQuickAbility }=useExperience();',
  '  const { masterMode,combat,combatState,selectedSheet,selectedClass,customAbilities,useQuickAbility }=useExperience();',
  'contexto completo do HUD'
);
experience = replaceRequired(
  experience,
  '  const [expanded,setExpanded]=useState(false);',
  '  const [expanded,setExpanded]=useState(false);\n  const abilityRailRef=useRef(null);',
  'referência da faixa de habilidades'
);
experience = replaceRequired(
  experience,
  '  if(!combat?.active||!selectedSheet) return null;',
  '  if(masterMode||!combat?.active||!selectedSheet) return null;',
  'HUD de jogador oculto apenas para o Mestre'
);
experience = replaceRequired(
  experience,
  '  const abilities=(selectedClass?.normal||[]).slice(0,3);',
  "  const level=Number(selectedSheet.nivel||1);\n  const classNormal=(selectedClass?.normal||[]).map(a=>({...a,_source:'normal',_locked:Number(a.req||1)>level}));\n  const classSpecials=(selectedClass?.specials||[]).map(a=>({...a,_source:'special',_locked:Number(a.req||1)>level}));\n  const campaignAbilities=(Array.isArray(customAbilities?.[selectedSheet.id])?customAbilities[selectedSheet.id]:[]).filter(Boolean).map(a=>({...a,_source:'campaign',_locked:Number(a.req||1)>level}));\n  const seenAbilities=new Set();\n  const abilities=[...classNormal,...classSpecials,...campaignAbilities].filter(a=>{const key=String(a.id||a.name||a.nome||'').trim().toLowerCase();if(!key||seenAbilities.has(key))return false;seenAbilities.add(key);return true;});",
  'normais especiais e habilidades de campanha no HUD'
);
experience = replaceRequired(
  experience,
  '    <div className="hud-abilities">{abilities.map(a=>{const key=String(a.id||a.name);const cd=Number(selectedSheet.cooldowns?.[key]||0);const cost=Number(a.cost||0);const disabled=cd>0||Number(selectedSheet.vigos||0)<cost;return <button key={key} disabled={disabled} onClick={()=>useQuickAbility(a)} title={a.desc}><span>{a.name}</span><small>{cd>0?`⏳ ${cd}`:`⚡ ${cost} VC`}</small></button>})}</div>',
  '    <div className="hud-abilities" ref={abilityRailRef} title="Role o mouse para navegar por todas as habilidades" onWheel={e=>{const rail=abilityRailRef.current;if(!rail)return;const delta=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX;if(!delta)return;e.preventDefault();rail.scrollLeft+=delta;}}>{abilities.map(a=>{const key=String(a.id||a.name||a.nome);const cd=Number(selectedSheet.cooldowns?.[key]||0);const cost=Number(a.cost??a.custo??0);const passive=a.tipoHab===\'passiva\';const locked=!!a._locked;const label=a.name||a.nome||\'Habilidade\';const disabled=locked||passive||cd>0||Number(selectedSheet.vigos||0)<cost;const badge=locked?`🔒 Nv ${a.req||1}`:passive?\'◇ PASSIVA\':cd>0?`⏳ ${cd}`:a._source===\'special\'?`✦ ${cost} VC`:a._source===\'campaign\'?`◆ ${cost} VC`:`⚡ ${cost} VC`;return <button key={key} className={`hud-ability ${a._source||\'\'} ${passive?\'passive\':\'\'} ${locked?\'locked\':\'\'}`} disabled={disabled} onClick={()=>useQuickAbility(a)} title={a.desc||a.descricao||label}><span>{label}</span><small>{badge}</small></button>})}</div>',
  'renderização completa e scroll horizontal'
);

// A camada legada mostrava o mesmo config/cosmic_event em paralelo ao feed novo.
// Removê-la evita duplicação; RealtimeBroadcasts passa a ser a única fila global.
experience = replaceRequired(experience, '    <CosmicEventLayer/>\n', '', 'remoção do overlay cósmico legado');
// O engine procedural antigo também sai para evitar dois ambientes simultâneos.
experience = replaceRequired(experience, '    <SoundscapeLayer/>\n', '', 'remoção do soundscape procedural antigo');

fs.writeFileSync(experienceFile, experience);

// ── CSS do HUD completo ────────────────────────────────────────────────────
const cssFile = path.join(process.cwd(), 'src', 'experience', 'experience.css');
let css = fs.readFileSync(cssFile, 'utf8');
if (!css.includes('/* HUD TODAS AS HABILIDADES */')) {
  css += `\n/* HUD TODAS AS HABILIDADES */\n.hud-abilities{display:flex!important;grid-template-columns:none!important;gap:6px;min-width:0;overflow-x:auto!important;overflow-y:hidden;scroll-behavior:smooth;overscroll-behavior-x:contain;padding-bottom:3px;scrollbar-width:thin;scrollbar-color:rgba(168,85,247,.28) transparent}\n.hud-abilities::-webkit-scrollbar{height:4px}.hud-abilities::-webkit-scrollbar-track{background:transparent}.hud-abilities::-webkit-scrollbar-thumb{background:rgba(168,85,247,.24);border-radius:9px}\n.hud-abilities .hud-ability{flex:0 0 132px;min-width:132px;scroll-snap-align:start}\n.hud-abilities .hud-ability.special{border-color:rgba(232,160,32,.3);background:rgba(232,160,32,.055)}\n.hud-abilities .hud-ability.campaign{border-color:rgba(88,217,255,.24);background:rgba(88,217,255,.045)}\n.hud-abilities .hud-ability.passive{opacity:.68;cursor:default}\n.hud-abilities .hud-ability.locked{opacity:.4;filter:saturate(.4)}\n.hud-abilities .hud-ability.locked small{color:#776a80}\n@media(max-width:900px){.combat-hud:not(.expanded) .hud-abilities{display:none!important}.combat-hud.expanded .hud-abilities{display:flex!important;grid-column:1/3;grid-row:2;width:100%}.hud-abilities .hud-ability{flex-basis:118px;min-width:118px}}\n`;
  fs.writeFileSync(cssFile, css);
}

// ── Combate só é iniciado no mapa; remove o atalho antigo em Fichas ───────
const sheetsFile = path.join(process.cwd(), 'src', 'features', 'sheets', 'SheetsPage.jsx');
let sheets = fs.readFileSync(sheetsFile, 'utf8');
sheets = sheets.replace('{combatOpen && <CombatMode sheets={sheets} enemies={enemies} onClose={()=>setCombatOpen(false)} masterMode={masterMode}/>}','');
sheets = replaceRegexRequired(
  sheets,
  /\s*\{masterMode&&\(\s*<button[^>]*onClick=\{\(\)=>setCombatOpen\(true\)\}[^>]*title="Modo Combate"[\s\S]*?<\/button>\s*\)\}/,
  '',
  'remoção do início de combate fora do mapa'
);
fs.writeFileSync(sheetsFile, sheets);

// ── App: engine de ambiente e console local do Mestre ─────────────────────
const appFile = path.join(process.cwd(), 'src', 'App.generated.jsx');
let app = fs.readFileSync(appFile, 'utf8');
if (!app.includes('EnhancedSoundscape')) {
  app = replaceRequired(
    app,
    'import RealtimeBroadcasts from "./experience/RealtimeBroadcasts";',
    'import RealtimeBroadcasts from "./experience/RealtimeBroadcasts";\nimport EnhancedSoundscape from "./experience/EnhancedSoundscape";\nimport MasterBattleConsole from "./experience/MasterBattleConsole";',
    'imports de ambiente e combate do Mestre'
  );
}
if (!app.includes('<EnhancedSoundscape/>')) {
  app = replaceRequired(app, '<RealtimeBroadcasts/>', '<RealtimeBroadcasts/>\n        <EnhancedSoundscape/>', 'engine de soundscape global');
}
if (!app.includes('<MasterBattleConsole/>')) {
  app = replaceRequired(
    app,
    '<ExperienceLayer onNavigate={navigate}/>',
    '<ExperienceLayer onNavigate={navigate}/>\n        {access.role===\'master\' && tab===\'mapabatalha\' && <MasterBattleConsole/>}',
    'console de combate apenas dentro do mapa'
  );
}
fs.writeFileSync(appFile, app);

for (const [source, marker, label] of [
  [experience, 'classSpecials=', 'especiais no HUD'],
  [experience, 'campaignAbilities=', 'habilidades de campanha no HUD'],
  [experience, 'seenAbilities', 'deduplicação das habilidades'],
  [experience, "cosmic_events',event.id", 'eventos do Mestre duráveis'],
  [experience, "cosmic_events',abilityEvent.id", 'animações de habilidade duráveis'],
  [experience, 'Templo do Tempo', 'novos soundscapes'],
  [app, '<EnhancedSoundscape/>', 'engine de ambiente'],
  [app, '<MasterBattleConsole/>', 'controle local do Mestre'],
]) {
  if (!source.includes(marker)) throw new Error(`Validação ausente: ${label}`);
}
if (experience.includes('    <CosmicEventLayer/>')) throw new Error('Overlay cósmico legado ainda montado.');
if (experience.includes('    <SoundscapeLayer/>')) throw new Error('Soundscape legado ainda montado.');
if (sheets.includes('title="Modo Combate"')) throw new Error('Combate ainda pode ser iniciado pela aba Fichas.');

console.log('Dinastia E: eventos repetíveis, HUD completo, soundscapes ricos e combate minimalista do Mestre preparados.');

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

// 1) Reconstrói no build um MP4 real a partir dos payloads versionados.
// O navegador passa a receber /media/deserto-bg.mp4 diretamente, sem atob/Blob em runtime.
const videoParts = [
  'part-00.txt','part-01.txt','part-02.txt','part-03.txt','part-04.txt',
  'part-05-07.txt','part-08-10.txt','part-11-13.txt','part-14-15.txt',
];
const videoDir = path.join(root, 'public', 'media', 'deserto-bg');
const videoTarget = path.join(root, 'public', 'media', 'deserto-bg.mp4');
const encodedVideo = videoParts.map(name => {
  const file = path.join(videoDir, name);
  if (!fs.existsSync(file)) throw new Error(`Video/ping patch: parte do vídeo ausente: ${name}`);
  return fs.readFileSync(file, 'utf8').trim();
}).join('');
const videoBytes = Buffer.from(encodedVideo, 'base64');
if (videoBytes.length < 40000 || videoBytes.subarray(4,8).toString('ascii') !== 'ftyp') {
  throw new Error(`Video/ping patch: MP4 reconstruído inválido (${videoBytes.length} bytes).`);
}
fs.writeFileSync(videoTarget, videoBytes);

// 2) Garante que as estrelas fiquem entre o vídeo e a UI, sem cobrir o vídeo com um canvas escuro.
const starFile = path.join(root, 'src', 'shell', 'StarField.jsx');
let star = fs.readFileSync(starFile, 'utf8');
if (!star.includes("zIndex:3")) {
  const before = "pointerEvents:'none'";
  if (!star.includes(before)) throw new Error('Video/ping patch: StarField não encontrado.');
  star = star.replace(before, "pointerEvents:'none',zIndex:3,opacity:.72");
  fs.writeFileSync(starFile, star);
}

// 3) Ping compartilhado e efêmero no mapa de batalha.
const battleFile = path.join(root, 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let battle = fs.readFileSync(battleFile, 'utf8');

const replaceBattle = (before, after, label) => {
  if (battle.includes(after)) return;
  if (!battle.includes(before)) throw new Error(`Video/ping patch: ${label}`);
  battle = battle.replace(before, after);
};

if (/function BattleMapSection\(\{\s*masterMode\s*\}\)/.test(battle)) {
  battle = battle.replace(/function BattleMapSection\(\{\s*masterMode\s*\}\)/, 'function BattleMapSection({ masterMode, playerSheetId })');
}
if (!battle.includes('function BattleMapSection({ masterMode, playerSheetId })')) {
  throw new Error('Video/ping patch: assinatura do BattleMapSection não pôde receber playerSheetId.');
}

replaceBattle(
  "  const [rulerMode, setRulerMode] = useState(false);",
  "  const [rulerMode, setRulerMode] = useState(false);\n  const [pingMode, setPingMode] = useState(false);\n  const [battlePing, setBattlePing] = useState(null);\n  const pingTimerRef = useRef(null);",
  'estado do ping não encontrado'
);

replaceBattle(
  "  const rulerDrawingRef = useRef(false);",
  `  const rulerDrawingRef = useRef(false);\n\n  useEffect(() => {\n    const unsub = onSnapshot(doc(db,'config','battlemap_ping'), snap => {\n      if (!snap.exists()) return;\n      const row = snap.data() || {};\n      const createdAt = Number(row.createdAt || 0);\n      const age = Date.now() - createdAt;\n      if (!row.id || age > 6500) { setBattlePing(null); return; }\n      setBattlePing(row);\n      clearTimeout(pingTimerRef.current);\n      pingTimerRef.current = setTimeout(() => setBattlePing(null), Math.max(500, 5200 - Math.max(0, age)));\n    });\n    return () => { unsub(); clearTimeout(pingTimerRef.current); };\n  }, []);`,
  'âncora do listener de ping não encontrada'
);

replaceBattle(
  "  const endRuler = () => { rulerDrawingRef.current=false; };",
  `  const endRuler = () => { rulerDrawingRef.current=false; };\n  const ownPingSheet = !masterMode && playerSheetId ? sheetVitals[String(playerSheetId)] : null;\n  const ownPingClass = ownPingSheet?.classe || '';\n  const ownPingClassDef = CLASSES.find(c => c.id === ownPingClass);\n  const ownPingColor = masterMode ? '#D6A7FF' : (SHEET_COLORS[ownPingClass] || ownPingClassDef?.color || '#A855F7');\n  const ownPingName = masterMode ? 'Mestre' : (ownPingSheet?.nome || 'Jogador');\n  const sendMapPing = async e => {\n    if (!pingMode || !currentMap) return;\n    e.preventDefault(); e.stopPropagation();\n    const point = rulerPoint(e);\n    if (!point) return;\n    const ping = {\n      id: \`ping_\${Date.now()}_\${Math.random().toString(36).slice(2,7)}\`,\n      mapId: String(currentMap.id), x: point.x, y: point.y,\n      color: ownPingColor, name: ownPingName, sheetId: String(playerSheetId || ''),\n      role: masterMode ? 'master' : 'player', createdAt: Date.now(),\n    };\n    setBattlePing(ping);\n    setPingMode(false);\n    clearTimeout(pingTimerRef.current);\n    pingTimerRef.current = setTimeout(() => setBattlePing(null), 5200);\n    try { await setDoc(doc(db,'config','battlemap_ping'), ping); }\n    catch (error) { console.error('Erro ao enviar ping no mapa:', error); }\n  };`,
  'helpers da régua não encontrados para acoplar ping'
);

// Quando a régua é ligada, o ping pendente é cancelado.
battle = battle.replaceAll(
  "setRulerMode(v=>!v);setFogMode('off');setRuler(null);",
  "setPingMode(false);setRulerMode(v=>!v);setFogMode('off');setRuler(null);"
);

replaceBattle(
  "              onPointerDown={rulerMode ? startRuler : onMapPanStart}",
  "              onPointerDown={pingMode ? sendMapPing : (rulerMode ? startRuler : onMapPanStart)}",
  'handler principal do mapa não encontrado'
);

battle = battle.replaceAll(
  "onPointerDown={e => canDrag && onTokenPointerDown(e, token)}",
  "onPointerDown={e => pingMode ? sendMapPing(e) : (canDrag && onTokenPointerDown(e, token))}"
);

const zoomMarker = "         {/* CONTROLE DE ZOOM — canto inferior direito, compacto */}";
const pingControl = `         {/* PING — disponível para jogador e Mestre */}\n          {currentMap?.img && (\n            <button\n              className={\`battlemap-ping-button \${pingMode?'active':''}\`}\n              onClick={() => { setPingMode(v=>!v); setRulerMode(false); if(masterMode) setFogMode('off'); }}\n              title={pingMode?'Clique no mapa para marcar um ponto':'Ping: marque um ponto para toda a mesa'}\n              style={{'--ping-color':ownPingColor,position:'absolute',right:14,top:masterMode?72:12,zIndex:47}}\n            >\n              <span>◎</span><b>{pingMode?'CLIQUE NO MAPA':'PING'}</b>\n            </button>\n          )}\n\n${zoomMarker}`;
replaceBattle(zoomMarker, pingControl, 'controle de zoom não encontrado para inserir botão de ping');

const fogAnchor = "                <div\n                  onPointerDown={startFogDraw}";
const pingRender = `                {battlePing && String(battlePing.mapId)===String(currentMap.id) && (\n                  <div key={battlePing.id} className="battlemap-ping" style={{left:\`\${battlePing.x}%\`,top:\`\${battlePing.y}%\`,'--ping-color':battlePing.color||'#A855F7'}} aria-label={\`Ping de \${battlePing.name||'jogador'}\`}>\n                    <i/><i/><i/><span/><b>{battlePing.name||'Ping'}</b>\n                  </div>\n                )}\n${fogAnchor}`;
replaceBattle(fogAnchor, pingRender, 'overlay de névoa não encontrado para inserir ping visual');

for (const marker of [
  "doc(db,'config','battlemap_ping')",
  'battlemap-ping-button',
  'battlemap-ping',
  'pingMode ? sendMapPing',
  "const ownPingColor = masterMode ? '#D6A7FF'",
]) {
  if (!battle.includes(marker)) throw new Error(`Video/ping patch incompleto no BattleMap: ${marker}`);
}
fs.writeFileSync(battleFile, battle);

// 4) Camadas: o vídeo deve ser claramente perceptível, mantendo leitura e identidade cósmica.
const cssFile = path.join(root, 'src', 'experience', 'experience.css');
let css = fs.readFileSync(cssFile, 'utf8');
const CSS_MARKER = '/* VIDEO GLOBAL VISIVEL + BATTLEMAP PING · 2026-08-23 */';
if (!css.includes(CSS_MARKER)) {
  css += `\n${CSS_MARKER}\n
.cosmic-loop-video{z-index:2!important;opacity:1!important;background:#030109}
.cosmic-loop-video video{opacity:.92!important;filter:brightness(.84) saturate(1.24) contrast(1.08) hue-rotate(-3deg)!important}
.cosmic-loop-video.gate video{opacity:.86!important}
.cosmic-loop-video .cosmic-video-shade{background:radial-gradient(circle at 50% 44%,rgba(13,5,30,.04) 8%,rgba(4,1,12,.13) 66%,rgba(1,0,5,.40) 100%),linear-gradient(180deg,rgba(3,1,10,.12),rgba(7,2,18,.08) 48%,rgba(2,0,8,.33))!important}
.cosmic-living-bg{z-index:0!important;opacity:.48!important}
.cosmic-living-bg.gate{opacity:.42!important}
.cosmic-living-bg canvas{opacity:.62!important}
.cosmic-living-vignette{opacity:.44!important}
.immersive-stage{position:relative;z-index:4!important}

.battlemap-ping-button{display:flex;align-items:center;gap:6px;min-height:36px;padding:7px 10px;border-radius:11px;border:1px solid color-mix(in srgb,var(--ping-color) 48%,transparent);background:rgba(5,4,15,.88);color:var(--ping-color);font:700 9px 'Cinzel',serif;letter-spacing:.08em;cursor:pointer;box-shadow:0 7px 22px rgba(0,0,0,.42),0 0 18px color-mix(in srgb,var(--ping-color) 10%,transparent);backdrop-filter:blur(10px);transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease,background .2s ease}
.battlemap-ping-button span{font-size:18px;line-height:1;text-shadow:0 0 12px var(--ping-color)}
.battlemap-ping-button:hover{transform:translateY(-2px);border-color:var(--ping-color);box-shadow:0 10px 28px rgba(0,0,0,.48),0 0 24px color-mix(in srgb,var(--ping-color) 22%,transparent)}
.battlemap-ping-button.active{background:color-mix(in srgb,var(--ping-color) 17%,rgba(5,4,15,.9));border-color:var(--ping-color);animation:battlePingButtonPulse 1.15s ease-in-out infinite}
.battlemap-ping{position:absolute;z-index:88;width:0;height:0;pointer-events:none;transform:translate(-50%,-50%);color:var(--ping-color)}
.battlemap-ping>i,.battlemap-ping>span{position:absolute;left:50%;top:50%;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none}
.battlemap-ping>i{width:30px;height:30px;border:2px solid var(--ping-color);box-shadow:0 0 14px color-mix(in srgb,var(--ping-color) 56%,transparent);animation:battlePingRing 1.2s cubic-bezier(.16,.8,.24,1) infinite}
.battlemap-ping>i:nth-child(2){animation-delay:.22s}.battlemap-ping>i:nth-child(3){animation-delay:.44s}
.battlemap-ping>span{width:12px;height:12px;background:var(--ping-color);border:2px solid rgba(255,255,255,.86);box-shadow:0 0 12px var(--ping-color),0 0 28px var(--ping-color);animation:battlePingCore .8s ease-in-out infinite alternate}
.battlemap-ping>b{position:absolute;left:50%;top:22px;transform:translateX(-50%);white-space:nowrap;padding:4px 7px;border-radius:7px;border:1px solid color-mix(in srgb,var(--ping-color) 35%,transparent);background:rgba(3,2,10,.82);color:var(--ping-color);font:700 8px 'Cinzel',serif;letter-spacing:.05em;text-shadow:0 1px 5px #000;box-shadow:0 5px 14px rgba(0,0,0,.36)}
@keyframes battlePingRing{0%{width:16px;height:16px;opacity:.95}82%,100%{width:86px;height:86px;opacity:0}}
@keyframes battlePingCore{from{transform:translate(-50%,-50%) scale(.86)}to{transform:translate(-50%,-50%) scale(1.18)}}
@keyframes battlePingButtonPulse{0%,100%{box-shadow:0 7px 22px rgba(0,0,0,.42),0 0 12px color-mix(in srgb,var(--ping-color) 16%,transparent)}50%{box-shadow:0 8px 25px rgba(0,0,0,.44),0 0 28px color-mix(in srgb,var(--ping-color) 34%,transparent)}}
@media(max-width:700px){.battlemap-ping-button{right:8px!important;top:auto!important;bottom:70px!important;min-height:40px}.battlemap-ping-button b{font-size:8px}.battlemap-ping>b{font-size:7px}}
@media(prefers-reduced-motion:reduce){.battlemap-ping>i{animation-duration:1.8s}.battlemap-ping-button.active{animation:none}}
`;
  fs.writeFileSync(cssFile, css);
}

console.log(`Dinastia E: vídeo MP4 real reconstruído (${videoBytes.length} bytes), camadas visíveis e ping realtime do mapa aplicados.`);

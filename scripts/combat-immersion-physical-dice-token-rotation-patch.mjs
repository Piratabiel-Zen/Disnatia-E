import fs from 'node:fs';
import path from 'node:path';

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Combat immersion patch falhou: ${label}`);
  return source.replace(before, after);
}

// ── DADO FÍSICO 3D ──────────────────────────────────────────────────────────
const diceFile = path.join(process.cwd(), 'src', 'shell', 'DiceWidget.jsx');
let dice = fs.readFileSync(diceFile, 'utf8');

if (!dice.includes('PhysicalDiceTray')) {
  const anchor = 'import { CLASSES } from "../data/gameData";';
  if (!dice.includes(anchor)) throw new Error('Combat immersion patch: import CLASSES do dado não encontrado.');
  dice = dice.replace(anchor, `${anchor}\nimport PhysicalDiceTray from "../experience/PhysicalDiceTray";`);
}

dice = replaceRequired(
  dice,
  '  const [revealed, setRevealed] = useState(false);',
  '  const [revealed, setRevealed] = useState(false);\n  const [physicalRolling, setPhysicalRolling] = useState(false);',
  'estado da física do dado'
);

dice = replaceRequired(
  dice,
  '  const roll = async () => {\n    const base = Math.floor(Math.random() * dice) + 1;',
  '  const roll = async () => {\n    if (physicalRolling) return;\n    setPhysicalRolling(true);\n    const base = Math.floor(Math.random() * dice) + 1;',
  'bloqueio de rolagens concorrentes'
);

dice = replaceRequired(
  dice,
  '<button onClick={roll} style={{width:\'100%\'',
  '<button onClick={roll} disabled={physicalRolling} style={{width:\'100%\'',
  'botão bloqueado durante física'
);

dice = replaceRequired(
  dice,
  '            🎲 Rolar D{dice}\n          </button>',
  "            {physicalRolling ? '✦ Dado em movimento…' : `🎲 Rolar D${dice}`}\n          </button>",
  'texto de rolagem física'
);

dice = replaceRequired(
  dice,
  "<button onClick={()=>setOpen(false)} style={{background:'transparent'",
  "<button onClick={()=>{setOpen(false);setPhysicalRolling(false);}} style={{background:'transparent'",
  'fechamento da bandeja física'
);

dice = replaceRequired(
  dice,
  "borderRadius:16, padding:16, width:260, boxShadow:",
  "borderRadius:16, padding:16, width:'min(360px, calc(100vw - 32px))', boxShadow:",
  'largura da bandeja física'
);

const localDiceRegex = /<DiceTrayVisual\s+sides=\{result\.sides\}\s+finalValue=\{result\.base\}\s+rollTs=\{result\.ts\}\s+color=\{rollerProfile\.color \|\| \(result\.isCrit\?'#4ADE80':result\.isFail\?'#E8193C':'#C8A8E8'\)\}\s+onSettled=\{\(\)=>setRevealed\(true\)\}\s*\/>/;
if (!dice.includes('<PhysicalDiceTray sides={result.sides}')) {
  if (!localDiceRegex.test(dice)) throw new Error('Combat immersion patch: DiceTrayVisual local não encontrado.');
  dice = dice.replace(localDiceRegex, `<PhysicalDiceTray
                sides={result.sides}
                finalValue={result.base}
                rollTs={result.ts}
                color={rollerProfile.color || (result.isCrit?'#4ADE80':result.isFail?'#E8193C':'#C8A8E8')}
                onSettled={()=>{setRevealed(true);setPhysicalRolling(false);}}
              />`);
}

fs.writeFileSync(diceFile, dice);

// ── ROTAÇÃO REALTIME DOS TOKENS ─────────────────────────────────────────────
const battleFile = path.join(process.cwd(), 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let battle = fs.readFileSync(battleFile, 'utf8');

battle = replaceRequired(
  battle,
  "rangeMeters: 0 });",
  "rangeMeters: 0, rotation: 0 });",
  'rotação padrão de novos tokens'
);

battle = replaceRequired(
  battle,
  '  const authoritativePositionRef = useRef({});\n  const activeMapRevisionRef = useRef(0);',
  `  const authoritativePositionRef = useRef({});
  const authoritativeRotationRef = useRef({});
  const rotationLastWriteRef = useRef({});
  const rotationPointerRef = useRef({ tokenId: null, element: null });
  const [rotatingId, setRotatingId] = useState(null);
  const activeMapRevisionRef = useRef(0);`,
  'refs realtime de rotação'
);

battle = replaceRequired(
  battle,
  '      const previous = prevById.get(tid);\n      if (live && Number.isFinite(live.x) && Number.isFinite(live.y)) {\n        return { ...token, x: live.x, y: live.y };\n      }\n      if (previous && Number.isFinite(Number(previous.x)) && Number.isFinite(Number(previous.y))) {\n        return { ...token, x: Number(previous.x), y: Number(previous.y) };\n      }\n      return token;',
  `      const previous = prevById.get(tid);
      const liveRotation = authoritativeRotationRef.current[\`${'${id}:${tid}'}\`];
      const rotationPatch = Number.isFinite(liveRotation) ? { rotation: liveRotation } : {};
      if (live && Number.isFinite(live.x) && Number.isFinite(live.y)) {
        return { ...token, x: live.x, y: live.y, ...rotationPatch };
      }
      if (previous && Number.isFinite(Number(previous.x)) && Number.isFinite(Number(previous.y))) {
        return { ...token, x: Number(previous.x), y: Number(previous.y), ...rotationPatch };
      }
      return Number.isFinite(liveRotation) ? { ...token, rotation: liveRotation } : token;`,
  'proteção da rotação contra arrays antigos'
);

battle = replaceRequired(
  battle,
  `          const sameX = Math.abs(Number(token.x || 0) - patch.x) < 0.00001;
          const sameY = Math.abs(Number(token.y || 0) - patch.y) < 0.00001;
          if (sameX && sameY) return token;
          changed = true;
          return { ...token, x: patch.x, y: patch.y };`,
  `          const hasPosition = Number.isFinite(patch.x) && Number.isFinite(patch.y);
          const hasRotation = Number.isFinite(patch.rotation);
          const sameX = !hasPosition || Math.abs(Number(token.x || 0) - patch.x) < 0.00001;
          const sameY = !hasPosition || Math.abs(Number(token.y || 0) - patch.y) < 0.00001;
          const sameRotation = !hasRotation || Math.abs(Number(token.rotation || 0) - patch.rotation) < 0.01;
          if (sameX && sameY && sameRotation) return token;
          changed = true;
          return {
            ...token,
            ...(hasPosition ? { x: patch.x, y: patch.y } : {}),
            ...(hasRotation ? { rotation: patch.rotation } : {}),
          };`,
  'flush remoto com posição e rotação'
);

battle = replaceRequired(
  battle,
  `        const x = Number(data.x);
        const y = Number(data.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        authoritativePositionRef.current[\`${'${currentMapId}:${tokenId}'}\`] = { x, y };
        remotePositionQueueRef.current.set(tokenId, { x, y });`,
  `        const x = Number(data.x);
        const y = Number(data.y);
        const rotation = Number(data.rotation);
        const patch = {};
        if (Number.isFinite(x) && Number.isFinite(y)) {
          authoritativePositionRef.current[\`${'${currentMapId}:${tokenId}'}\`] = { x, y };
          patch.x = x; patch.y = y;
        }
        if (Number.isFinite(rotation)) {
          const normalizedRotation = ((rotation % 360) + 360) % 360;
          authoritativeRotationRef.current[\`${'${currentMapId}:${tokenId}'}\`] = normalizedRotation;
          patch.rotation = normalizedRotation;
        }
        if (Object.keys(patch).length) remotePositionQueueRef.current.set(tokenId, patch);`,
  'recepção realtime da rotação'
);

const persistAnchor = '\n\n  const persistTokens = (mapId, tokens) => {';
if (!battle.includes('const writeLiveRotation =')) {
  const idx = battle.indexOf(persistAnchor);
  if (idx < 0) throw new Error('Combat immersion patch: ponto de inserção de writeLiveRotation não encontrado.');
  const rotationWriter = `

  const normalizeTokenRotation = value => ((Math.round(Number(value) || 0) % 360) + 360) % 360;

  const writeLiveRotation = (mapId, tokenId, rotation) => {
    const id = String(mapId);
    const tid = String(tokenId);
    const normalized = normalizeTokenRotation(rotation);
    authoritativeRotationRef.current[\`${'${id}:${tid}'}\`] = normalized;
    setDoc(doc(db, 'battlemap_live_positions', \`${'${id}_${tid}'}\`), {
      mapId: id,
      tokenId: tid,
      rotation: normalized,
      clientId: liveClientIdRef.current,
      rotationUpdatedAt: Date.now(),
    }, { merge: true }).catch(e => console.error('Erro ao transmitir rotação:', e));
  };`;
  battle = battle.slice(0, idx) + rotationWriter + battle.slice(idx);
}

const deleteAnchor = '  const deleteToken = id => {';
if (!battle.includes('const startTokenRotation =')) {
  const idx = battle.indexOf(deleteAnchor);
  if (idx < 0) throw new Error('Combat immersion patch: deleteToken não encontrado.');
  const rotationControls = `  const rotationFromPointer = (e, element) => {
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const degrees = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI + 90;
    return normalizeTokenRotation(Math.round(degrees / 5) * 5);
  };

  const applyTokenRotation = (tokenId, rotation, broadcast = true) => {
    if (!currentMap) return;
    const mapId = String(currentMap.id);
    const tid = String(tokenId);
    const normalized = normalizeTokenRotation(rotation);
    authoritativeRotationRef.current[\`${'${mapId}:${tid}'}\`] = normalized;
    const prev = mapTokensRef.current;
    const tokens = (prev[mapId] || []).map(t => String(t.id) === tid ? { ...t, rotation: normalized } : t);
    const next = { ...prev, [mapId]: tokens };
    mapTokensRef.current = next;
    setMapTokens(next);
    if (!broadcast) return;
    const key = \`${'${mapId}:${tid}'}\`;
    const now = performance.now();
    const last = rotationLastWriteRef.current[key] || 0;
    clearTimeout(saveTimeout.current['rot_' + key]);
    if (now - last >= 45) {
      rotationLastWriteRef.current[key] = now;
      writeLiveRotation(mapId, tid, normalized);
    } else {
      saveTimeout.current['rot_' + key] = setTimeout(() => {
        rotationLastWriteRef.current[key] = performance.now();
        writeLiveRotation(mapId, tid, normalized);
      }, 45 - (now - last));
    }
  };

  const startTokenRotation = (e, token) => {
    if (token.locked && !masterMode) return;
    e.preventDefault();
    e.stopPropagation();
    rotationPointerRef.current = { tokenId: token.id, element: e.currentTarget };
    setRotatingId(token.id);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    applyTokenRotation(token.id, rotationFromPointer(e, e.currentTarget));
  };

  const moveTokenRotation = (e) => {
    const state = rotationPointerRef.current;
    if (state.tokenId == null || !state.element) return;
    e.preventDefault();
    e.stopPropagation();
    applyTokenRotation(state.tokenId, rotationFromPointer(e, state.element));
  };

  const endTokenRotation = (e) => {
    const state = rotationPointerRef.current;
    if (state.tokenId == null || !currentMap) return;
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const mapId = String(currentMap.id);
    const tokenId = state.tokenId;
    clearTimeout(saveTimeout.current['rot_' + \`${'${mapId}:${String(tokenId)}'}\`]);
    const latestTokens = mapTokensRef.current[mapId] || [];
    const token = latestTokens.find(t => String(t.id) === String(tokenId));
    if (token) writeLiveRotation(mapId, tokenId, token.rotation || 0);
    writeLiveTokens(mapId, latestTokens, true).catch(err => console.error('Erro ao persistir direção do token:', err));
    try { state.element?.releasePointerCapture?.(e.pointerId); } catch (_) {}
    rotationPointerRef.current = { tokenId: null, element: null };
    setRotatingId(null);
  };

`;
  battle = battle.slice(0, idx) + rotationControls + battle.slice(idx);
}

battle = replaceRequired(
  battle,
  "width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none',\n                              filter:",
  "width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none',\n                              transform: `rotate(${Number(token.rotation || 0)}deg)`, transformOrigin: '50% 50%',\n                              filter:",
  'rotação visual da imagem'
);

battle = replaceRequired(
  battle,
  "transition: draggingId === token.id ? 'none' : 'filter .14s ease',",
  "transition: (draggingId === token.id || rotatingId === token.id) ? 'none' : 'filter .14s ease, transform .12s linear',",
  'transição da rotação visual'
);

battle = replaceRequired(
  battle,
  "<span style={{ fontSize: dispSize * 0.4, filter: isSelected ? `drop-shadow(0 0 6px ${info.color})` : 'none' }}>{token.tipo === 'inimigo' ? '💀' : '🧙'}</span>",
  "<span style={{ fontSize: dispSize * 0.4, filter: isSelected ? `drop-shadow(0 0 6px ${info.color})` : 'none', transform:`rotate(${Number(token.rotation || 0)}deg)`, transition:rotatingId===token.id?'none':'transform .12s linear' }}>{token.tipo === 'inimigo' ? '💀' : '🧙'}</span>",
  'rotação do fallback do token'
);

const tokenNameMarker = `                      <div style={{ fontSize: 10 * zoom, fontFamily: 'Cinzel,serif', color: info.color, background: 'rgba(4,6,15,0.75)', borderRadius: 5 * zoom, padding: \`${'${1 * zoom}px ${7 * zoom}px'}\`, whiteSpace: 'nowrap', maxWidth: 90 * zoom, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {token.nome}{token.locked && ' 🔒'}
                      </div>`;
if (!battle.includes('className="battlemap-facing-dial"')) {
  if (!battle.includes(tokenNameMarker)) throw new Error('Combat immersion patch: nome do token não encontrado para inserir dial.');
  battle = battle.replace(tokenNameMarker, `${tokenNameMarker}
                      {isSelected && canDrag && (
                        <div
                          className="battlemap-facing-dial"
                          title="Arraste para definir para onde o token está olhando"
                          onPointerDown={e=>startTokenRotation(e,token)}
                          onPointerMove={moveTokenRotation}
                          onPointerUp={endTokenRotation}
                          onPointerCancel={endTokenRotation}
                          style={{
                            width:Math.max(32,Math.min(48,36*zoom)),height:Math.max(32,Math.min(48,36*zoom)),borderRadius:'50%',
                            marginTop:2*zoom,position:'relative',display:'grid',placeItems:'center',touchAction:'none',cursor:'grab',
                            background:'radial-gradient(circle,rgba(5,7,16,.96) 46%,rgba(5,7,16,.72) 47%)',
                            border:\`${'${Math.max(1,zoom*.7)}px'} solid ${'${info.color}88'}\`,
                            boxShadow:\`0 0 ${'${Math.max(7,8*zoom)}px'} ${'${info.color}22'},inset 0 0 10px rgba(0,0,0,.7)\`,
                            zIndex:31,pointerEvents:'auto'
                          }}
                        >
                          <span style={{position:'absolute',left:'50%',top:3,width:2,height:'42%',borderRadius:2,background:info.color,boxShadow:\`0 0 6px ${'${info.color}'}\`,transformOrigin:'50% 100%',transform:\`translateX(-50%) rotate(${'${Number(token.rotation||0)}'}deg)\`,pointerEvents:'none'}}/>
                          <span style={{fontSize:7,color:'#D8D0E2',fontFamily:'Cinzel,serif',letterSpacing:'-.02em',pointerEvents:'none'}}>{Math.round(Number(token.rotation||0))}°</span>
                        </div>
                      )}`);
}

for (const [source, marker, label] of [
  [dice, 'PhysicalDiceTray', 'componente físico importado'],
  [dice, 'physicalRolling', 'bloqueio de rolagem concorrente'],
  [battle, 'authoritativeRotationRef', 'autoridade realtime de rotação'],
  [battle, 'writeLiveRotation', 'writer realtime de rotação'],
  [battle, 'battlemap-facing-dial', 'rodinha de direção'],
  [battle, 'transform: `rotate(${Number(token.rotation || 0)}deg)`', 'imagem rotacionável'],
]) {
  if (!source.includes(marker)) throw new Error(`Combat immersion patch incompleto: ${label}`);
}

fs.writeFileSync(battleFile, battle);
console.log('Dinastia E: dado físico 3D lazy + rotação realtime dos tokens aplicados.');

import fs from 'node:fs';
import path from 'node:path';

const battleFile = path.join(process.cwd(), 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let battle = fs.readFileSync(battleFile, 'utf8');

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Token rotation follow patch falhou: ${label}`);
  return source.replace(before, after);
}

battle = replaceRequired(
  battle,
  `                      {isSelected && canDrag && (\n                        <div\n                          className="battlemap-facing-dial battlemap-facing-dial-subtle"`,
  `                      {(isSelected || draggingId === token.id || rotatingId === token.id) && canDrag && (\n                        <div\n                          className="battlemap-facing-dial battlemap-facing-dial-subtle"`,
  'controle permanece junto do token durante movimento/rotação'
);

battle = replaceRequired(
  battle,
  `                            position:'absolute',left:'50%',top:-Math.max(31,36*zoom),transform:'translateX(-50%)',\n                            width:Math.max(26,Math.min(32,28*zoom)),height:Math.max(26,Math.min(32,28*zoom)),borderRadius:'50%',`,
  `                            position:'absolute',left:'50%',top:-Math.max(2,Math.min(7,dispSize*.05)),transform:'translate(-50%,-100%)',\n                            width:Math.max(24,Math.min(32,dispSize*.30)),height:Math.max(24,Math.min(32,dispSize*.30)),borderRadius:'50%',`,
  'distância e tamanho proporcionais à imagem atual do token'
);

battle = replaceRequired(
  battle,
  `                          <span style={{fontSize:Math.max(14,Math.min(17,15*zoom)),lineHeight:1,color:'rgba(255,255,255,.9)',pointerEvents:'none',transform:'translateY(-.5px)'}}>↻</span>`,
  `                          <span style={{fontSize:Math.max(13,Math.min(17,dispSize*.16)),lineHeight:1,color:'rgba(255,255,255,.9)',pointerEvents:'none',transform:'translateY(-.5px)'}}>↻</span>`,
  'ícone proporcional ao token'
);

battle = replaceRequired(
  battle,
  `    rotationPointerRef.current = { tokenId: token.id, element: e.currentTarget };\n    setRotatingId(token.id);\n    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}`,
  `    rotationPointerRef.current = {\n      tokenId: token.id,\n      element: e.currentTarget.parentElement || e.currentTarget,\n      handle: e.currentTarget,\n    };\n    setRotatingId(token.id);\n    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}`,
  'centro da rotação acompanha o contêiner vivo do token'
);

battle = replaceRequired(
  battle,
  `    try { state.element?.releasePointerCapture?.(e.pointerId); } catch (_) {}`,
  `    try { state.handle?.releasePointerCapture?.(e.pointerId); } catch (_) {}`,
  'liberação do pointer capture no botão'
);

for (const marker of [
  "top:-Math.max(2,Math.min(7,dispSize*.05))",
  "width:Math.max(24,Math.min(32,dispSize*.30))",
  "element: e.currentTarget.parentElement || e.currentTarget",
  "handle: e.currentTarget",
  "isSelected || draggingId === token.id || rotatingId === token.id",
]) {
  if (!battle.includes(marker)) throw new Error(`Token rotation follow patch incompleto: ${marker}`);
}

fs.writeFileSync(battleFile, battle);
console.log('Dinastia E: botão de rotação proporcional, mais próximo e ancorado ao movimento do token.');

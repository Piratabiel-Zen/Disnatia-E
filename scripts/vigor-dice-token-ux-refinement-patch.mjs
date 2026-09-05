import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`UX refinement falhou: início ausente em ${label}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`UX refinement falhou: fim ausente em ${label}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`UX refinement falhou: ${label}`);
  return source.replace(before, after);
}

// ── VIGOR CÓSMICO DOS INIMIGOS · MESMA LINGUAGEM VISUAL DOS JOGADORES ─────
const enemyFile = path.join(root, 'src', 'experience', 'EnemySheetExperience.jsx');
let enemy = fs.readFileSync(enemyFile, 'utf8');

if (!enemy.includes('enemy-vigor-dots-player-style')) {
  const generalStart = '              <div className="enemy-form-field"><label>VC atual</label>';
  const generalEnd = '            </div>\n          </section>\n          <section className="enemy-sheet-panel" style={{\'--enemy-color\':color}}>\n            <h4>Atributos</h4>';
  const generalDots = `              <div className="enemy-form-field"><label>VC máximo · limite 10</label><NumberControl value={maxVigos} min={0} max={10} onChange={setMaxVigos} color={color}/></div>
              <div className="enemy-form-field wide enemy-vigor-dots-player-style">
                <label>Vigor Cósmico · {currentVigos}/{maxVigos} VC</label>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',marginTop:6}}>
                  {Array.from({length:maxVigos}).map((_,i)=><button key={i} type="button" onClick={()=>f('vigos',i<currentVigos?(i===currentVigos-1?0:i+1):i+1)} style={{width:22,height:22,borderRadius:'50%',border:'1.5px solid '+(i<currentVigos?color:'rgba(255,255,255,0.13)'),background:i<currentVigos?color+'33':'transparent',cursor:'pointer',transition:'all .2s',padding:0,boxShadow:i<currentVigos?'0 0 5px '+color+'55':'none',flexShrink:0}}>{i<currentVigos&&<span style={{display:'block',width:8,height:8,borderRadius:'50%',background:color,margin:'auto'}}/>}</button>)}
                  <button type="button" onClick={()=>f('vigos',maxVigos)} disabled={currentVigos===maxVigos} style={{marginLeft:4,padding:'4px 8px',borderRadius:6,border:'1px solid '+color+'33',background:color+'0b',color:currentVigos===maxVigos?'#554b55':color,cursor:currentVigos===maxVigos?'default':'pointer',font:'8px Cinzel,serif'}}>Restaurar</button>
                </div>
              </div>
`;
  enemy = replaceBetween(enemy, generalStart, generalEnd, generalDots, 'pontos de vigor na visão geral');
}

if (!enemy.includes('enemy-vigor-combat-dots')) {
  const combatStart = `          <div className="enemy-sheet-panel" style={{'--enemy-color':color,marginBottom:12}}>
            <h4>✦ Vigor Cósmico</h4>`;
  const combatEnd = `          <div className="enemy-sheet-panel" style={{'--enemy-color':color}}>
            <h4>⚔ Arsenal de combate</h4>`;
  const combatDots = `          <div className="enemy-sheet-panel" style={{'--enemy-color':color,marginBottom:12}}>
            <h4>✦ Vigor Cósmico</h4>
            <div className="enemy-vigor-combat-dots" style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',marginBottom:9}}>
              {Array.from({length:maxVigos}).map((_,i)=><button key={i} type="button" onClick={()=>f('vigos',i<currentVigos?(i===currentVigos-1?0:i+1):i+1)} style={{width:22,height:22,borderRadius:'50%',border:'1.5px solid '+(i<currentVigos?color:'rgba(255,255,255,0.13)'),background:i<currentVigos?color+'33':'transparent',cursor:'pointer',transition:'all .2s',padding:0,boxShadow:i<currentVigos?'0 0 5px '+color+'55':'none'}}>{i<currentVigos&&<span style={{display:'block',width:8,height:8,borderRadius:'50%',background:color,margin:'auto'}}/>}</button>)}
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}><span style={{font:'8px Cinzel,serif',color:'#736677'}}>{currentVigos} / {maxVigos} VC</span><button type="button" onClick={()=>f('vigos',maxVigos)} disabled={currentVigos===maxVigos} style={{padding:'5px 8px',borderRadius:7,border:'1px solid '+color+'33',background:color+'0a',color:currentVigos===maxVigos?'#554b55':color,font:'8px Cinzel,serif'}}>Restaurar</button></div>
            <div style={{font:'9px Crimson Text,serif',color:'#786a76',marginTop:8}}>As habilidades abaixo consomem automaticamente o custo indicado em VC. Quando o vigor for insuficiente, o uso fica bloqueado.</div>
          </div>
`;
  enemy = replaceBetween(enemy, combatStart, combatEnd, combatDots, 'pontos de vigor na aba de combate');
}

for (const marker of ['enemy-vigor-dots-player-style','enemy-vigor-combat-dots','maxVigosFor','currentVigosFor']) {
  if (!enemy.includes(marker)) throw new Error(`UX refinement: vigor do inimigo incompleto (${marker}).`);
}
fs.writeFileSync(enemyFile, enemy);

// ── VIGOR CÓSMICO NA FICHA FLUTUANTE DO MAPA ────────────────────────────────
const battleEnemyFile = path.join(root, 'src', 'experience', 'BattleMapEnemySheet.jsx');
let battleEnemy = fs.readFileSync(battleEnemyFile, 'utf8');
if (!battleEnemy.includes('enemy-mini-vigor-dots')) {
  const miniStart = `      <div style={{marginTop:10,paddingTop:9,borderTop:'1px solid rgba(255,255,255,.055)'}}>`;
  const miniEnd = `    </div>
    <StatusPanel sheet={enemy} onChange={onChangeEnemy}/>`;
  const miniDots = `      <div className="enemy-mini-vigor-dots" style={{marginTop:10,paddingTop:9,borderTop:'1px solid rgba(255,255,255,.055)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:7,marginBottom:7}}><span style={{font:'8px Cinzel,serif',color:'#716270'}}>VIGOR CÓSMICO · {vigos}/{maxVigos}</span><button onClick={()=>f('vigos',maxVigos)} disabled={vigos===maxVigos} style={{padding:'4px 7px',borderRadius:6,border:'1px solid '+color+'2d',background:color+'08',color:vigos===maxVigos?'#514950':color,font:'7px Cinzel,serif'}}>Restaurar</button></div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>{Array.from({length:maxVigos}).map((_,i)=><button key={i} type="button" onClick={()=>f('vigos',i<vigos?(i===vigos-1?0:i+1):i+1)} style={{width:20,height:20,borderRadius:'50%',border:'1.5px solid '+(i<vigos?color:'rgba(255,255,255,0.13)'),background:i<vigos?color+'33':'transparent',cursor:'pointer',transition:'all .2s',padding:0,boxShadow:i<vigos?'0 0 5px '+color+'55':'none'}}>{i<vigos&&<span style={{display:'block',width:7,height:7,borderRadius:'50%',background:color,margin:'auto'}}/>}</button>)}</div>
      </div>
`;
  battleEnemy = replaceBetween(battleEnemy, miniStart, miniEnd, miniDots, 'pontos de vigor na ficha flutuante');
}
if (!battleEnemy.includes('enemy-mini-vigor-dots') || !battleEnemy.includes('getMaxVigos')) throw new Error('UX refinement: vigor flutuante incompleto.');
fs.writeFileSync(battleEnemyFile, battleEnemy);

// ── BOTÃO DE ROTAÇÃO SUTIL ACIMA DO TOKEN ───────────────────────────────────
const battleFile = path.join(root, 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let battle = fs.readFileSync(battleFile, 'utf8');

battle = replaceRequired(
  battle,
  '    applyTokenRotation(token.id, rotationFromPointer(e, e.currentTarget));',
  '    // Não altera o ângulo no clique: a rotação começa apenas quando o ponteiro se move.',
  'início da rotação sem salto de ângulo'
);

if (!battle.includes('battlemap-facing-dial-subtle')) {
  const dialStart = `                      {isSelected && canDrag && (
                        <div
                          className="battlemap-facing-dial"`;
  const dialEnd = `                      {token.status && Object.entries(token.status).some(([,v])=>v)`;
  const subtleDial = `                      {isSelected && canDrag && (
                        <div
                          className="battlemap-facing-dial battlemap-facing-dial-subtle"
                          title="Arraste para girar o token"
                          onPointerDown={e=>startTokenRotation(e,token)}
                          onPointerMove={moveTokenRotation}
                          onPointerUp={endTokenRotation}
                          onPointerCancel={endTokenRotation}
                          style={{
                            position:'absolute',left:'50%',top:-Math.max(31,36*zoom),transform:'translateX(-50%)',
                            width:Math.max(26,Math.min(32,28*zoom)),height:Math.max(26,Math.min(32,28*zoom)),borderRadius:'50%',
                            display:'grid',placeItems:'center',touchAction:'none',cursor:rotatingId===token.id?'grabbing':'grab',
                            background:'rgba(39,43,57,.88)',border:'1px solid rgba(255,255,255,.16)',
                            boxShadow:'0 3px 9px rgba(0,0,0,.52),0 0 8px rgba(255,255,255,.035)',backdropFilter:'blur(5px)',
                            zIndex:31,pointerEvents:'auto',opacity:rotatingId===token.id?1:.84,transition:'opacity .15s ease,transform .15s ease'
                          }}
                        >
                          <span style={{fontSize:Math.max(14,Math.min(17,15*zoom)),lineHeight:1,color:'rgba(255,255,255,.9)',pointerEvents:'none',transform:'translateY(-.5px)'}}>↻</span>
                        </div>
                      )}
`;
  battle = replaceBetween(battle, dialStart, dialEnd, subtleDial, 'botão sutil de rotação');
}
if (!battle.includes('battlemap-facing-dial-subtle')) throw new Error('UX refinement: botão sutil de rotação ausente.');
fs.writeFileSync(battleFile, battle);

// ── ID AUTORITATIVO DA ROLAGEM LOCAL PARA IMPEDIR REPLAY NO MESMO CLIENTE ───
const diceFile = path.join(root, 'src', 'shell', 'DiceWidget.jsx');
let dice = fs.readFileSync(diceFile, 'utf8');
if (!dice.includes('dinastia-local-dice-roll-id')) {
  dice = replaceRequired(
    dice,
    `    } catch (_) {}
    const res = {
      base, values, count: safeCount, total, sides: dice, bonus: Number(bonus), isCrit, isFail, ts: Date.now(),`,
    `    } catch (_) {}
    const rollId = 'roll_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    try { sessionStorage.setItem('dinastia-local-dice-roll-id', rollId); } catch (_) {}
    const res = {
      rollId, base, values, count: safeCount, total, sides: dice, bonus: Number(bonus), isCrit, isFail, ts: Date.now(),`,
    'ID local da rolagem'
  );
}
if (!dice.includes("sessionStorage.setItem('dinastia-local-dice-roll-id'")) throw new Error('UX refinement: ID local do dado ausente.');
fs.writeFileSync(diceFile, dice);

console.log('Dinastia E: vigor em pontos, rotação sutil acima do token e autoria local/remota dos dados refinados.');

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mustRead = rel => {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`World/Book usability patch: arquivo ausente: ${rel}`);
  return [file, fs.readFileSync(file, 'utf8')];
};
const replaceRequired = (source, before, after, label) => {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`World/Book usability patch falhou: ${label}`);
  return source.replace(before, after);
};

// 1) MAPA MÚNDI — jogadores enxergam todos os locais, mas continuam sem poder editar.
{
  const [file, raw] = mustRead('src/features/mapa-mundi/MapaMundiPage.jsx');
  let src = raw;
  src = replaceRequired(
    src,
    "  const visiblePins = (currentMap.pins || []).filter(p => masterMode || p.descoberto !== false);",
    "  const visiblePins = currentMap.pins || [];",
    'locais visíveis para jogadores'
  );
  src = src.replace("'Nenhum local foi revelado nesta região.'", "'Nenhum local foi cadastrado nesta região.'");
  if (!src.includes('const visiblePins = currentMap.pins || [];')) throw new Error('Mapa Múndi ainda filtra locais para jogadores.');
  fs.writeFileSync(file, src);
}

// 2) CLASSES — cada habilidade mostra a descrição completa ao passar o mouse/focar.
{
  const [file, raw] = mustRead('src/features/classes/ClassesPage.jsx');
  let src = raw;
  const oldAbilities = `  const habilidades = [\n    cls.passive?.name,\n    ...(cls.normal || []).map(a => a.name),\n    ...(cls.specials || []).map(a => a.name),\n  ].filter(Boolean);`;
  const newAbilities = `  const habilidades = [\n    cls.passive ? { ...cls.passive, tipo: 'Passiva' } : null,\n    ...(cls.normal || []).map(a => ({ ...a, tipo: 'Habilidade' })),\n    ...(cls.specials || []).map(a => ({ ...a, tipo: 'Especial' })),\n  ].filter(a => a?.name);`;
  src = replaceRequired(src, oldAbilities, newAbilities, 'estrutura das habilidades da classe');

  const oldList = `                {habilidades.map((nome, i) => (\n                  <div key={i} style={{display:'flex',alignItems:'center',gap:9}}>\n                    <span style={{fontSize:10,color:cls.color}}>◆</span>\n                    <span style={{fontSize:13,color:'#C8B8A0',fontFamily:'Cinzel,serif'}}>{nome}</span>\n                  </div>\n                ))}`;
  const newList = `                {habilidades.map((hab, i) => (\n                  <div key={\`${'${'}hab.tipo}_${'${'}hab.name}_${'${'}i}\`} className="class-ability-hover" tabIndex={0} style={{'--ability-color':cls.color}}>\n                    <span className="class-ability-glyph">◆</span>\n                    <span className="class-ability-name">{hab.name}</span>\n                    <span className="class-ability-hint">detalhes</span>\n                    <div className="class-ability-tooltip" role="tooltip">\n                      <small>{hab.tipo}{hab.req ? \` · Nv ${'${'}hab.req}+\` : ''}</small>\n                      <strong>{hab.name}</strong>\n                      <p>{hab.desc || 'Descrição ainda não registrada.'}</p>\n                      {(hab.cost || hab.cooldown || hab.dano) && <div className="class-ability-meta">\n                        {hab.cost ? <span>✦ {hab.cost} VC</span> : null}\n                        {hab.cooldown ? <span>⏱ {hab.cooldown}</span> : null}\n                        {hab.dano ? <span>⚔ {hab.dano}</span> : null}\n                      </div>}\n                    </div>\n                  </div>\n                ))}`;
  src = replaceRequired(src, oldList, newList, 'tooltip das habilidades da classe');
  if (!src.includes('class-ability-tooltip')) throw new Error('Tooltip das habilidades não aplicado.');
  fs.writeFileSync(file, src);
}

// 3) MAPA DE BATALHA — ordem manual dos mapas pelo Mestre.
{
  const [file, raw] = mustRead('src/features/mapa-batalha/BattleMapPage.jsx');
  let src = raw;
  src = replaceRequired(
    src,
    "  const [maps, setMaps] = useState([]);",
    `  const [maps, setMaps] = useState([]);\n  const sortBattleMaps = rows => [...(rows || [])].sort((a,b) => {\n    const ao = Number(a?.order); const bo = Number(b?.order);\n    const ah = Number.isFinite(ao) && ao > 0; const bh = Number.isFinite(bo) && bo > 0;\n    if (ah && bh && ao !== bo) return ao - bo;\n    if (ah !== bh) return ah ? -1 : 1;\n    return String(a?.id || '').localeCompare(String(b?.id || ''), 'pt-BR', { numeric:true });\n  });`,
    'ordenação estável dos mapas'
  );
  src = replaceRequired(
    src,
    "      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));\n      setMaps(data); setLoaded(true);",
    "      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));\n      setMaps(sortBattleMaps(data)); setLoaded(true);",
    'listener de mapas ordenado'
  );

  const addAnchor = "  const addMap = () => {";
  const helper = `  const moveMapToPosition = async (mapId, targetIndex) => {\n    const ordered = sortBattleMaps(maps);\n    const from = ordered.findIndex(m => String(m.id) === String(mapId));\n    if (from < 0) return;\n    const to = Math.max(0, Math.min(ordered.length - 1, Number(targetIndex) || 0));\n    if (from === to) return;\n    const next = [...ordered];\n    const [movedMap] = next.splice(from, 1);\n    next.splice(to, 0, movedMap);\n    const normalized = next.map((map, index) => ({ ...map, order:index + 1 }));\n    setMaps(normalized);\n    try {\n      await Promise.all(normalized.map(map => setDoc(doc(db,'battlemaps',String(map.id)), { order:map.order }, { merge:true })));\n    } catch (error) {\n      console.error('Erro ao reordenar mapas:', error);\n      pushToast('Não foi possível salvar a nova ordem dos mapas.', '⚠️', '#E8A020');\n    }\n  };\n\n${addAnchor}`;
  src = replaceRequired(src, addAnchor, helper, 'função para mover mapa para qualquer posição');

  src = replaceRequired(
    src,
    "    const m = newBattleMap(Date.now());\n    const { tokens, ...meta } = m;",
    "    const m = { ...newBattleMap(Date.now()), order: maps.length + 1 };\n    const { tokens, ...meta } = m;",
    'ordem inicial do novo mapa'
  );

  const renameButton = "<button onClick={() => setShowMapNameEdit(true)} style={{ ...zoomBtnStyle, width: 'auto', padding: '5px 9px', background: 'rgba(4,6,15,0.7)', backdropFilter: 'blur(6px)' }}>✎ Renomear</button>";
  const orderControl = `${renameButton}\n                    <label title="Escolha a posição deste mapa" style={{display:'flex',alignItems:'center',gap:5,padding:'3px 6px',borderRadius:7,border:'1px solid rgba(168,85,247,.22)',background:'rgba(4,6,15,.7)',color:'#9A85AE',fontFamily:'Cinzel,serif',fontSize:9}}>Ordem <select value={Math.max(1,maps.findIndex(m=>String(m.id)===String(currentMap.id))+1)} onChange={e=>moveMapToPosition(currentMap.id,Number(e.target.value)-1)} style={{width:52,fontSize:9,padding:'2px 4px'}}>{maps.map((_,i)=><option key={i} value={i+1}>{i+1}º</option>)}</select></label>`;
  src = replaceRequired(src, renameButton, orderControl, 'seletor de posição do mapa');
  if (!src.includes('moveMapToPosition') || !src.includes('Escolha a posição deste mapa')) throw new Error('Reordenação de mapas incompleta.');
  fs.writeFileSync(file, src);
}

// 4) LIVRO DA MANDÍBULA — estrelas coloridas e folhear mais fluido também no mobile.
{
  const [file, raw] = mustRead('src/features/livro/LivroPage.jsx');
  let src = raw;
  const oldStars = `<div style={{fontSize:34,letterSpacing:18,color:'#6d358c',marginBottom:20}}>✦ ✦ ✦ ✦</div>`;
  const newStars = `<div className="prophecy-stars" aria-label="Quatro estrelas da profecia"><span className="prophecy-star blue">✦</span><span className="prophecy-star yellow">✦</span><span className="prophecy-star red">✦</span><span className="prophecy-star purple">✦</span></div>`;
  src = replaceRequired(src, oldStars, newStars, 'cores das quatro estrelas da profecia');

  const oldMobileTurn = `    if(window.innerWidth<=720){\n      if(dir>0&&mobileSide===0){setMobileSide(1);return;}\n      if(dir<0&&mobileSide===1){setMobileSide(0);return;}\n    }`;
  const newMobileTurn = `    if(window.innerWidth<=720){\n      if(dir>0&&mobileSide===0){setTurnDir(1);setTurning(true);setTimeout(()=>setMobileSide(1),390);setTimeout(()=>setTurning(false),900);return;}\n      if(dir<0&&mobileSide===1){setTurnDir(-1);setTurning(true);setTimeout(()=>setMobileSide(0),390);setTimeout(()=>setTurning(false),900);return;}\n    }`;
  src = replaceRequired(src, oldMobileTurn, newMobileTurn, 'folhear animado no mobile');
  src = src
    .replace(/setTimeout\(\(\)=>\{setTabPages\(p=>\(\{\.\.\.p,\[activeTab\]:next\}\)\);setMobileSide\(dir>0\?0:1\);\},440\)/g,
      'setTimeout(()=>{setTabPages(p=>({...p,[activeTab]:next}));setMobileSide(dir>0?0:1);},390)')
    .replace(/setTimeout\(\(\)=>setTurning\(false\),980\)/g, 'setTimeout(()=>setTurning(false),900)');

  if (!src.includes('prophecy-star red') || !src.includes('setTimeout(()=>setMobileSide(1),390)')) throw new Error('Livro: melhorias de estrelas/animação incompletas.');
  fs.writeFileSync(file, src);
}

// 5) CSS — Diário compacto, tooltip de habilidades e novo folhear GPU-friendly.
{
  const [file, raw] = mustRead('src/experience/experience.css');
  let css = raw;
  const marker = '/* WORLD + BOOK USABILITY · 2026-09-02 */';
  if (!css.includes(marker)) {
    css += `\n${marker}\n
/* Diário Vivo: janela fixa dentro da viewport; o conteúdo longo rola internamente. */
.journal-drawer{
  top:clamp(14px,6vh,56px)!important;right:clamp(12px,2vw,28px)!important;bottom:auto!important;
  width:min(420px,calc(100vw - 96px))!important;height:min(660px,calc(100vh - 112px))!important;max-height:calc(100vh - 112px)!important;
  border:1px solid rgba(168,85,247,.16)!important;border-radius:18px!important;overflow:hidden!important;
  box-shadow:0 26px 80px rgba(0,0,0,.66),0 0 36px rgba(168,85,247,.055)!important;
}
.journal-drawer>header{height:64px!important;min-height:64px!important;flex:0 0 64px!important}
.journal-add{flex:0 0 auto}
.journal-timeline{flex:1!important;min-height:0!important;max-height:none!important;overflow-y:auto!important;overscroll-behavior:contain;scrollbar-gutter:stable;padding-bottom:26px!important}

/* Classes: descrição elegante no hover/foco, com suporte a toque via focus. */
.class-ability-hover{position:relative;display:grid;grid-template-columns:16px minmax(0,1fr) auto;align-items:center;gap:8px;padding:7px 9px;border-radius:8px;border:1px solid transparent;outline:none;cursor:help;transition:background .18s ease,border-color .18s ease,transform .18s ease;z-index:1}
.class-ability-hover:hover,.class-ability-hover:focus{z-index:90;background:color-mix(in srgb,var(--ability-color) 7%,rgba(255,255,255,.015));border-color:color-mix(in srgb,var(--ability-color) 24%,transparent);transform:translateX(2px)}
.class-ability-glyph{font-size:10px;color:var(--ability-color)}
.class-ability-name{font-size:13px;color:#C8B8A0;font-family:'Cinzel',serif}
.class-ability-hint{font:600 7px 'Cinzel',serif;letter-spacing:.08em;color:#50455A;text-transform:uppercase}
.class-ability-tooltip{position:absolute;left:calc(100% + 10px);top:50%;width:min(350px,42vw);transform:translate3d(-5px,-50%,0);opacity:0;visibility:hidden;pointer-events:none;padding:13px 14px;border-radius:11px;border:1px solid color-mix(in srgb,var(--ability-color) 30%,rgba(255,255,255,.05));background:linear-gradient(145deg,rgba(12,7,22,.98),rgba(5,3,11,.98));box-shadow:0 18px 48px rgba(0,0,0,.62),0 0 26px color-mix(in srgb,var(--ability-color) 9%,transparent);transition:opacity .18s ease,transform .2s cubic-bezier(.2,.8,.2,1),visibility .18s;z-index:120}
.class-ability-hover:hover .class-ability-tooltip,.class-ability-hover:focus .class-ability-tooltip{opacity:1;visibility:visible;transform:translate3d(0,-50%,0)}
.class-ability-tooltip small{display:block;font:700 7px 'Cinzel',serif;letter-spacing:.16em;text-transform:uppercase;color:var(--ability-color);margin-bottom:5px}
.class-ability-tooltip strong{display:block;font:700 12px 'Cinzel',serif;color:#D6C8D8;margin-bottom:7px}
.class-ability-tooltip p{margin:0;color:#9A899F;font-size:12px;line-height:1.58}
.class-ability-meta{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px}.class-ability-meta span{padding:3px 6px;border-radius:5px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);font:600 8px 'Cinzel',serif;color:#77677E}

/* Profecia das quatro estrelas. */
.prophecy-stars{display:flex;align-items:center;justify-content:center;gap:20px;margin:3px 0 20px;font-size:36px;line-height:1}
.prophecy-star{display:inline-block;transform:translateZ(0);text-shadow:0 0 10px currentColor,0 0 24px currentColor}
.prophecy-star.blue{color:#45A9FF}.prophecy-star.yellow{color:#FFD95A}.prophecy-star.red{color:#FF3E54;animation:prophecyRedPulse 1.35s ease-in-out infinite}.prophecy-star.purple{color:#A855F7}
@keyframes prophecyRedPulse{0%,100%{transform:translateZ(0) scale(.92);opacity:.72;text-shadow:0 0 8px #FF3E54,0 0 18px rgba(255,62,84,.45)}50%{transform:translateZ(0) scale(1.18);opacity:1;text-shadow:0 0 14px #FF3E54,0 0 34px rgba(255,62,84,.82)}}

/* Livro: folha única em transform 3D, sem filtros animados ou blur. */
.livro-pages{perspective:2450px!important;perspective-origin:50% 47%!important;transform-style:preserve-3d!important}
.livro-page-flip{will-change:transform!important;filter:none!important;contain:paint;transform-style:preserve-3d!important}
.livro-page-flip.forward{animation:livroLeafForwardPolished .78s cubic-bezier(.3,.05,.18,1) both!important}
.livro-page-flip.backward{animation:livroLeafBackwardPolished .78s cubic-bezier(.3,.05,.18,1) both!important}
@keyframes livroLeafForwardPolished{0%{transform:translate3d(0,0,0) rotateY(0) scaleX(1)}22%{transform:translate3d(0,0,7px) rotateY(-28deg) scaleX(.99)}48%{transform:translate3d(0,0,14px) rotateY(-86deg) scaleX(.965)}52%{transform:translate3d(0,0,14px) rotateY(-94deg) scaleX(.965)}78%{transform:translate3d(0,0,7px) rotateY(-152deg) scaleX(.99)}100%{transform:translate3d(0,0,0) rotateY(-180deg) scaleX(1)}}
@keyframes livroLeafBackwardPolished{0%{transform:translate3d(0,0,0) rotateY(0) scaleX(1)}22%{transform:translate3d(0,0,7px) rotateY(28deg) scaleX(.99)}48%{transform:translate3d(0,0,14px) rotateY(86deg) scaleX(.965)}52%{transform:translate3d(0,0,14px) rotateY(94deg) scaleX(.965)}78%{transform:translate3d(0,0,7px) rotateY(152deg) scaleX(.99)}100%{transform:translate3d(0,0,0) rotateY(180deg) scaleX(1)}}

@media(max-width:900px){
  .class-ability-tooltip{left:0;top:calc(100% + 7px);width:min(360px,calc(100vw - 64px));transform:translate3d(0,-4px,0)}
  .class-ability-hover:hover .class-ability-tooltip,.class-ability-hover:focus .class-ability-tooltip{transform:translate3d(0,0,0)}
}
@media(max-width:700px){
  .journal-drawer{left:8px!important;right:8px!important;top:8px!important;width:auto!important;height:calc(100dvh - 82px)!important;max-height:calc(100dvh - 82px)!important;border-radius:15px!important}
  .journal-drawer>header{height:58px!important;min-height:58px!important;flex-basis:58px!important}
  .prophecy-stars{gap:14px;font-size:31px}
  .livro-page-flip{width:100%!important;left:0!important}
}
@media(prefers-reduced-motion:reduce){
  .prophecy-star.red{animation:none!important;opacity:1}
  .livro-page-flip.forward,.livro-page-flip.backward{animation-duration:.22s!important}
}
`;
  }
  fs.writeFileSync(file, css);
}

console.log('Dinastia E: Mapa Múndi aberto aos jogadores, Diário compacto, habilidades com descrição, Livro refinado e mapas reordenáveis.');

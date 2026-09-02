import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`World/Book v2: arquivo ausente: ${rel}`);
  return { file, src: fs.readFileSync(file, 'utf8') };
};
const replaceRequired = (src, before, after, label) => {
  if (src.includes(after)) return src;
  if (!src.includes(before)) throw new Error(`World/Book v2 falhou: ${label}`);
  return src.replace(before, after);
};

// 1. Mapa Múndi: todos os locais ficam visíveis aos jogadores; ações de edição
// continuam protegidas pelos masterMode já existentes no componente.
{
  const item = read('src/features/mapa-mundi/MapaMundiPage.jsx');
  let src = item.src;
  src = replaceRequired(
    src,
    "  const visiblePins = (currentMap.pins || []).filter(p => masterMode || p.descoberto !== false);",
    "  const visiblePins = currentMap.pins || [];",
    'visibilidade dos locais do Mapa Múndi'
  );
  src = src.replace("'Nenhum local foi revelado nesta região.'", "'Nenhum local foi cadastrado nesta região.'");
  if (!src.includes('const visiblePins = currentMap.pins || [];')) throw new Error('World/Book v2: locais ainda estão filtrados.');
  fs.writeFileSync(item.file, src);
}

// 2. Classes: descrição detalhada de cada habilidade em hover/foco.
{
  const item = read('src/features/classes/ClassesPage.jsx');
  let src = item.src;
  src = replaceRequired(
    src,
    `  const habilidades = [\n    cls.passive?.name,\n    ...(cls.normal || []).map(a => a.name),\n    ...(cls.specials || []).map(a => a.name),\n  ].filter(Boolean);`,
    `  const habilidades = [\n    cls.passive ? { ...cls.passive, tipo: 'Passiva' } : null,\n    ...(cls.normal || []).map(a => ({ ...a, tipo: 'Habilidade' })),\n    ...(cls.specials || []).map(a => ({ ...a, tipo: 'Especial' })),\n  ].filter(a => a?.name);`,
    'dados completos das habilidades'
  );
  src = replaceRequired(
    src,
    `                {habilidades.map((nome, i) => (\n                  <div key={i} style={{display:'flex',alignItems:'center',gap:9}}>\n                    <span style={{fontSize:10,color:cls.color}}>◆</span>\n                    <span style={{fontSize:13,color:'#C8B8A0',fontFamily:'Cinzel,serif'}}>{nome}</span>\n                  </div>\n                ))}`,
    `                {habilidades.map((hab, i) => (\n                  <div key={\`ability_${'${'}i}_${'${'}hab.name}\`} className="class-ability-hover" tabIndex={0} style={{'--ability-color':cls.color}}>\n                    <span className="class-ability-glyph">◆</span>\n                    <span className="class-ability-name">{hab.name}</span>\n                    <span className="class-ability-hint">detalhes</span>\n                    <div className="class-ability-tooltip" role="tooltip">\n                      <small>{hab.tipo}{hab.req ? \` · Nv ${'${'}hab.req}+\` : ''}</small>\n                      <strong>{hab.name}</strong>\n                      <p>{hab.desc || 'Descrição ainda não registrada.'}</p>\n                      {(hab.cost || hab.cooldown || hab.dano) && <div className="class-ability-meta">\n                        {hab.cost ? <span>✦ {hab.cost} VC</span> : null}\n                        {hab.cooldown ? <span>⏱ {hab.cooldown}</span> : null}\n                        {hab.dano ? <span>⚔ {hab.dano}</span> : null}\n                      </div>}\n                    </div>\n                  </div>\n                ))}`,
    'tooltip das habilidades'
  );
  if (!src.includes('class-ability-tooltip')) throw new Error('World/Book v2: tooltip não aplicado.');
  fs.writeFileSync(item.file, src);
}

// 3. Mapa de Batalha: ordem persistente escolhida pelo Mestre.
{
  const item = read('src/features/mapa-batalha/BattleMapPage.jsx');
  let src = item.src;
  src = replaceRequired(
    src,
    "  const [maps, setMaps] = useState([]);",
    `  const [maps, setMaps] = useState([]);\n  const sortBattleMaps = rows => [...(rows || [])].sort((a,b) => {\n    const ao=Number(a?.order), bo=Number(b?.order);\n    const ah=Number.isFinite(ao)&&ao>0, bh=Number.isFinite(bo)&&bo>0;\n    if(ah&&bh&&ao!==bo)return ao-bo;\n    if(ah!==bh)return ah?-1:1;\n    return String(a?.id||'').localeCompare(String(b?.id||''),'pt-BR',{numeric:true});\n  });`,
    'ordenador de mapas'
  );
  src = replaceRequired(
    src,
    "      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));\n      setMaps(data); setLoaded(true);",
    "      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));\n      setMaps(sortBattleMaps(data)); setLoaded(true);",
    'snapshot ordenado de mapas'
  );
  const addAnchor = "  const addMap = () => {";
  src = replaceRequired(
    src,
    addAnchor,
    `  const moveMapToPosition = async (mapId,targetIndex) => {\n    const ordered=sortBattleMaps(maps);\n    const from=ordered.findIndex(m=>String(m.id)===String(mapId));\n    if(from<0)return;\n    const to=Math.max(0,Math.min(ordered.length-1,Number(targetIndex)||0));\n    if(from===to)return;\n    const next=[...ordered];const [movedMap]=next.splice(from,1);next.splice(to,0,movedMap);\n    const normalized=next.map((map,index)=>({...map,order:index+1}));\n    setMaps(normalized);\n    try{await Promise.all(normalized.map(map=>setDoc(doc(db,'battlemaps',String(map.id)),{order:map.order},{merge:true})));}\n    catch(error){console.error('Erro ao reordenar mapas:',error);pushToast('Não foi possível salvar a nova ordem dos mapas.','⚠️','#E8A020');}\n  };\n\n${addAnchor}`,
    'movimentação de mapa para posição escolhida'
  );
  src = replaceRequired(
    src,
    "    const m = newBattleMap(Date.now());\n    const { tokens, ...meta } = m;",
    "    const m = { ...newBattleMap(Date.now()), order: maps.length + 1 };\n    const { tokens, ...meta } = m;",
    'ordem padrão do novo mapa'
  );
  const renameButton = "<button onClick={() => setShowMapNameEdit(true)} style={{ ...zoomBtnStyle, width: 'auto', padding: '5px 9px', background: 'rgba(4,6,15,0.7)', backdropFilter: 'blur(6px)' }}>✎ Renomear</button>";
  src = replaceRequired(
    src,
    renameButton,
    `${renameButton}\n                    <label title="Escolha a posição deste mapa" className="battlemap-order-control">Ordem <select value={Math.max(1,sortBattleMaps(maps).findIndex(m=>String(m.id)===String(currentMap.id))+1)} onChange={e=>moveMapToPosition(currentMap.id,Number(e.target.value)-1)}>{maps.map((_,i)=><option key={i} value={i+1}>{i+1}º</option>)}</select></label>`,
    'controle de ordem do mapa'
  );
  if (!src.includes('moveMapToPosition') || !src.includes('battlemap-order-control')) throw new Error('World/Book v2: ordem de mapas incompleta.');
  fs.writeFileSync(item.file, src);
}

// 4. Livro: cores da profecia e animação fluida. A cadeia anterior pode ter
// alterado os timeouts, então usamos padrões focados nas ações e não no bloco inteiro.
{
  const item = read('src/features/livro/LivroPage.jsx');
  let src = item.src;
  src = replaceRequired(
    src,
    `<div style={{fontSize:34,letterSpacing:18,color:'#6d358c',marginBottom:20}}>✦ ✦ ✦ ✦</div>`,
    `<div className="prophecy-stars" aria-label="Quatro estrelas da profecia"><span className="prophecy-star blue">✦</span><span className="prophecy-star yellow">✦</span><span className="prophecy-star red">✦</span><span className="prophecy-star purple">✦</span></div>`,
    'quatro estrelas coloridas'
  );

  if (!src.includes('setTurnDir(1);setTurning(true);setTimeout(()=>setMobileSide(1),390)')) {
    const forward=/if\(dir>0&&mobileSide===0\)\{[^{}]*setMobileSide\(1\)[^{}]*return;\}/;
    if(!forward.test(src)) throw new Error('World/Book v2: troca mobile para a direita não encontrada.');
    src=src.replace(forward,"if(dir>0&&mobileSide===0){setTurnDir(1);setTurning(true);setTimeout(()=>setMobileSide(1),390);setTimeout(()=>setTurning(false),900);return;}");
  }
  if (!src.includes('setTurnDir(-1);setTurning(true);setTimeout(()=>setMobileSide(0),390)')) {
    const backward=/if\(dir<0&&mobileSide===1\)\{[^{}]*setMobileSide\(0\)[^{}]*return;\}/;
    if(!backward.test(src)) throw new Error('World/Book v2: troca mobile para a esquerda não encontrada.');
    src=src.replace(backward,"if(dir<0&&mobileSide===1){setTurnDir(-1);setTurning(true);setTimeout(()=>setMobileSide(0),390);setTimeout(()=>setTurning(false),900);return;}");
  }

  src=src
    .replace(/setTimeout\(\(\)=>\{setTabPages\(p=>\(\{\.\.\.p,\[activeTab\]:next\}\)\);setMobileSide\(dir>0\?0:1\);\},(?:360|440)\)/g,'setTimeout(()=>{setTabPages(p=>({...p,[activeTab]:next}));setMobileSide(dir>0?0:1);},390)')
    .replace(/setTimeout\(\(\)=>setTurning\(false\),(?:780|980)\)/g,'setTimeout(()=>setTurning(false),900)');

  if (!src.includes('prophecy-star red') || !src.includes('setTimeout(()=>setMobileSide(1),390)')) throw new Error('World/Book v2: Livro incompleto.');
  fs.writeFileSync(item.file, src);
}

// 5. CSS final: Diário com altura fixa e scroll; tooltip; estrelas; page flip.
{
  const item = read('src/experience/experience.css');
  let css=item.src;
  const marker='/* WORLD + BOOK USABILITY V2 · 2026-09-02 */';
  if(!css.includes(marker)) css += `\n${marker}\n
.journal-drawer{top:clamp(14px,6vh,56px)!important;right:clamp(12px,2vw,28px)!important;bottom:auto!important;width:min(420px,calc(100vw - 96px))!important;height:min(660px,calc(100vh - 112px))!important;max-height:calc(100vh - 112px)!important;border:1px solid rgba(168,85,247,.16)!important;border-radius:18px!important;overflow:hidden!important;box-shadow:0 26px 80px rgba(0,0,0,.66),0 0 36px rgba(168,85,247,.055)!important}
.journal-drawer>header{height:64px!important;min-height:64px!important;flex:0 0 64px!important}.journal-add{flex:0 0 auto}.journal-timeline{flex:1!important;min-height:0!important;max-height:none!important;overflow-y:auto!important;overscroll-behavior:contain;scrollbar-gutter:stable;padding-bottom:26px!important}

.class-ability-hover{position:relative;display:grid;grid-template-columns:16px minmax(0,1fr) auto;align-items:center;gap:8px;padding:7px 9px;border-radius:8px;border:1px solid transparent;outline:none;cursor:help;transition:background .18s ease,border-color .18s ease,transform .18s ease;z-index:1}
.class-ability-hover:hover,.class-ability-hover:focus{z-index:90;background:color-mix(in srgb,var(--ability-color) 7%,rgba(255,255,255,.015));border-color:color-mix(in srgb,var(--ability-color) 24%,transparent);transform:translateX(2px)}
.class-ability-glyph{font-size:10px;color:var(--ability-color)}.class-ability-name{font-size:13px;color:#C8B8A0;font-family:'Cinzel',serif}.class-ability-hint{font:600 7px 'Cinzel',serif;letter-spacing:.08em;color:#50455A;text-transform:uppercase}
.class-ability-tooltip{position:absolute;left:calc(100% + 10px);top:50%;width:min(350px,42vw);transform:translate3d(-5px,-50%,0);opacity:0;visibility:hidden;pointer-events:none;padding:13px 14px;border-radius:11px;border:1px solid color-mix(in srgb,var(--ability-color) 30%,rgba(255,255,255,.05));background:linear-gradient(145deg,rgba(12,7,22,.98),rgba(5,3,11,.98));box-shadow:0 18px 48px rgba(0,0,0,.62),0 0 26px color-mix(in srgb,var(--ability-color) 9%,transparent);transition:opacity .18s ease,transform .2s cubic-bezier(.2,.8,.2,1),visibility .18s;z-index:120}
.class-ability-hover:hover .class-ability-tooltip,.class-ability-hover:focus .class-ability-tooltip{opacity:1;visibility:visible;transform:translate3d(0,-50%,0)}.class-ability-tooltip small{display:block;font:700 7px 'Cinzel',serif;letter-spacing:.16em;text-transform:uppercase;color:var(--ability-color);margin-bottom:5px}.class-ability-tooltip strong{display:block;font:700 12px 'Cinzel',serif;color:#D6C8D8;margin-bottom:7px}.class-ability-tooltip p{margin:0;color:#9A899F;font-size:12px;line-height:1.58}.class-ability-meta{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px}.class-ability-meta span{padding:3px 6px;border-radius:5px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);font:600 8px 'Cinzel',serif;color:#77677E}

.battlemap-order-control{display:flex;align-items:center;gap:5px;padding:3px 6px;border-radius:7px;border:1px solid rgba(168,85,247,.22);background:rgba(4,6,15,.7);color:#9A85AE;font-family:'Cinzel',serif;font-size:9px}.battlemap-order-control select{width:54px;font-size:9px;padding:2px 4px}

.prophecy-stars{display:flex;align-items:center;justify-content:center;gap:20px;margin:3px 0 20px;font-size:36px;line-height:1}.prophecy-star{display:inline-block;transform:translateZ(0);text-shadow:0 0 10px currentColor,0 0 24px currentColor}.prophecy-star.blue{color:#45A9FF}.prophecy-star.yellow{color:#FFD95A}.prophecy-star.red{color:#FF3E54;animation:prophecyRedPulse 1.35s ease-in-out infinite}.prophecy-star.purple{color:#A855F7}@keyframes prophecyRedPulse{0%,100%{transform:translateZ(0) scale(.92);opacity:.72;text-shadow:0 0 8px #FF3E54,0 0 18px rgba(255,62,84,.45)}50%{transform:translateZ(0) scale(1.18);opacity:1;text-shadow:0 0 14px #FF3E54,0 0 34px rgba(255,62,84,.82)}}

.livro-pages{perspective:2450px!important;perspective-origin:50% 47%!important;transform-style:preserve-3d!important}.livro-page-flip{will-change:transform!important;filter:none!important;contain:paint;transform-style:preserve-3d!important}.livro-page-flip.forward{animation:livroLeafForwardPolished .78s cubic-bezier(.3,.05,.18,1) both!important}.livro-page-flip.backward{animation:livroLeafBackwardPolished .78s cubic-bezier(.3,.05,.18,1) both!important}
@keyframes livroLeafForwardPolished{0%{transform:translate3d(0,0,0) rotateY(0) scaleX(1)}22%{transform:translate3d(0,0,7px) rotateY(-28deg) scaleX(.99)}48%{transform:translate3d(0,0,14px) rotateY(-86deg) scaleX(.965)}52%{transform:translate3d(0,0,14px) rotateY(-94deg) scaleX(.965)}78%{transform:translate3d(0,0,7px) rotateY(-152deg) scaleX(.99)}100%{transform:translate3d(0,0,0) rotateY(-180deg) scaleX(1)}}
@keyframes livroLeafBackwardPolished{0%{transform:translate3d(0,0,0) rotateY(0) scaleX(1)}22%{transform:translate3d(0,0,7px) rotateY(28deg) scaleX(.99)}48%{transform:translate3d(0,0,14px) rotateY(86deg) scaleX(.965)}52%{transform:translate3d(0,0,14px) rotateY(94deg) scaleX(.965)}78%{transform:translate3d(0,0,7px) rotateY(152deg) scaleX(.99)}100%{transform:translate3d(0,0,0) rotateY(180deg) scaleX(1)}}

@media(max-width:900px){.class-ability-tooltip{left:0;top:calc(100% + 7px);width:min(360px,calc(100vw - 64px));transform:translate3d(0,-4px,0)}.class-ability-hover:hover .class-ability-tooltip,.class-ability-hover:focus .class-ability-tooltip{transform:translate3d(0,0,0)}}
@media(max-width:700px){.journal-drawer{left:8px!important;right:8px!important;top:8px!important;width:auto!important;height:calc(100dvh - 82px)!important;max-height:calc(100dvh - 82px)!important;border-radius:15px!important}.journal-drawer>header{height:58px!important;min-height:58px!important;flex-basis:58px!important}.prophecy-stars{gap:14px;font-size:31px}.livro-page-flip{width:100%!important;left:0!important}}
@media(prefers-reduced-motion:reduce){.prophecy-star.red{animation:none!important;opacity:1}.livro-page-flip.forward,.livro-page-flip.backward{animation-duration:.22s!important}}
`;
  fs.writeFileSync(item.file,css);
}

console.log('Dinastia E: locais do Mapa Múndi visíveis, Diário compacto, habilidades explicadas, Livro refinado e mapas reordenáveis.');

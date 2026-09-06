import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const appendOnce=(rel,marker,css)=>{
  const file=path.join(root,rel);
  let src=fs.readFileSync(file,'utf8');
  if(src.includes(marker)) return;
  src+=`\n${marker}\n${css}\n`;
  fs.writeFileSync(file,src);
};

appendOnce('src/experience/experience.css','/* SUMMON CONTAINMENT 2026-09-06 */',`
.summon-memory-panel,.summon-memory-slot,.summon-memory-form,.summon-memory-attacks{min-width:0;max-width:100%}
.summon-memory-panel{width:100%;overflow:hidden}
.summon-memory-slot{width:100%;max-width:100%;overflow:hidden;box-sizing:border-box}
.summon-memory-slot.master{container-type:inline-size}
.summon-memory-form{grid-template-columns:repeat(2,minmax(0,1fr))!important;width:100%;max-width:100%}
.summon-memory-form label{min-width:0;max-width:100%;overflow:hidden}
.summon-memory-form label.wide{grid-column:1/-1!important}
.summon-memory-form input,.summon-memory-form select{display:block;min-width:0;max-width:100%;width:100%;box-sizing:border-box}
.summon-memory-attacks{width:100%;overflow:hidden}
.summon-memory-attacks>div:not(.summon-memory-add-attack){min-width:0;max-width:100%;overflow:hidden}
.summon-memory-attacks p,.summon-memory-attacks span,.summon-memory-attacks b{overflow-wrap:anywhere;word-break:break-word}
.summon-memory-add-attack{grid-template-columns:minmax(0,1fr) minmax(66px,.58fr)!important;width:100%;max-width:100%;align-items:center}
.summon-memory-add-attack input{min-width:0;max-width:100%;width:100%}
.summon-memory-add-attack input:nth-child(3){grid-column:1/-1}
.summon-memory-add-attack button{min-width:0;width:100%;grid-column:2;grid-row:1/3}
@container (max-width:330px){.summon-memory-form{grid-template-columns:1fr!important}.summon-memory-form label.wide{grid-column:auto!important}.summon-memory-add-attack{grid-template-columns:1fr!important}.summon-memory-add-attack input:nth-child(3),.summon-memory-add-attack button{grid-column:auto;grid-row:auto}}
`);

appendOnce('src/experience/master-battle.css','/* INITIATIVE DRAG 2026-09-06 */',`
.mbc-initiative-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:0 2px}
.mbc-initiative-head span{font:700 7px Cinzel,serif;letter-spacing:.15em;color:#7d6a86}
.mbc-initiative-head small{font-size:8px;color:#665b6d;text-align:right}
.mbc-initiative{min-height:56px;padding-top:7px}
.mbc-initiative>button{position:relative;cursor:grab;user-select:none;transition:transform .14s ease,opacity .14s ease,border-color .14s ease,background .14s ease,box-shadow .14s ease}
.mbc-initiative>button:active{cursor:grabbing}
.mbc-initiative>button.dragging{opacity:.38;transform:scale(.94);border-style:dashed}
.mbc-initiative>button.drag-over{transform:translateY(-2px);border-color:rgba(200,168,232,.58)!important;background:rgba(168,85,247,.12)!important;box-shadow:0 0 0 1px rgba(168,85,247,.16),0 8px 18px rgba(0,0,0,.28)}
.mbc-initiative>button.drag-over::before{content:'';position:absolute;left:-4px;top:5px;bottom:5px;width:2px;border-radius:999px;background:#c8a8e8;box-shadow:0 0 8px rgba(200,168,232,.55)}
.mbc-initiative.is-dragging>button:not(.dragging){cursor:grabbing}
.mbc-rank{position:absolute;right:5px;top:3px;font:800 7px Cinzel,serif;color:#5f5168;font-style:normal}
.mbc-initiative>button.active .mbc-rank{color:#b897d0}
.mbc-error.compact{margin:6px 0 0;padding:5px 8px;font-size:9px}
@media(max-width:900px){.mbc-initiative-head small{display:none}.mbc-initiative>button{cursor:pointer}}
`);

console.log('Dinastia E: invocações contidas no painel e iniciativa com drag visual refinado.');
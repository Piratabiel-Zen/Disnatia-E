import fs from 'node:fs';
import vm from 'node:vm';

// Apply rule changes after generation and legacy patches. The fixed-line App.jsx
// remains untouched; every reader of CLASSES receives the same updated definitions.
const path='src/data/gameData.jsx';
const source=fs.readFileSync(path,'utf8');
const marker='export const CLASSES=';
const start=source.indexOf(marker);
const end=source.indexOf('\n];',start)+3;
if(start<0||end<start)throw new Error('Class data boundaries missing');
const expression=source.slice(start+marker.length,end).replace(/;\s*$/,'');
const classes=vm.runInNewContext(expression,Object.create(null),{timeout:1000});
const updates=JSON.parse(fs.readFileSync('src/adventure/class-ability-updates.json','utf8'));
let count=0;
for(const [classId,abilities] of Object.entries(updates)){
 const cls=classes.find(c=>c.id===classId);
 if(!cls)throw new Error('Unknown class: '+classId);
 for(const [name,changes] of Object.entries(abilities)){
  const matches=[...(cls.normal||[]),...(cls.specials||[])].filter(a=>a.name===name);
  if(matches.length!==1)throw new Error('Expected exactly one ability: '+classId+'/'+name);
  Object.assign(matches[0],changes);count++;
 }
}
const attributes={Força:'FOR',Agilidade:'AGI',Durabilidade:'DUR',Inteligência:'INT',Percepção:'PER',Sorte:'SOR'};
for(const cls of classes){
 for(const a of [cls.passive,...(cls.normal||[]),...(cls.specials||[])].filter(Boolean)){
  if(typeof a.dano!=='string')continue;
  for(const [name,short] of Object.entries(attributes))a.dano=a.dano.replaceAll('Pontos de '+name,short).replaceAll(name,short);
 }
}
// Escape non-ASCII characters, including surrogate pairs used by existing emojis.
const serialized=JSON.stringify(classes,null,2).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
fs.writeFileSync(path,source.slice(0,start)+marker+serialized+';'+source.slice(end));
console.log(`Updated ${count} class abilities; attribute formulas use FOR/AGI/DUR/INT/PER/SOR.`);

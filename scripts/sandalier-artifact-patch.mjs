import fs from 'node:fs';
function patch(path,from,to){const source=fs.readFileSync(path,'utf8');if(!source.includes(from))throw new Error('Artifact patch anchor missing: '+path);fs.writeFileSync(path,source.replace(from,to));}
patch('src/data/gameData.jsx',"{id:'artefato-2',name:'Sandaliers Six',icon:'👟',",`{id:'artefato-2',name:'Sandaliers Six',icon:'\\uD83D\\uDC5F', requisitos:{agilidadeBonus:4,percepcaoBonus:2,texto:'Exige bônus natural de +4 Agilidade e +2 Percepção: pelo menos 8 pontos base de Agilidade e 4 de Percepção, sem equipamentos ou efeitos temporários.'},`);
const path='src/features/sheets/SheetComponents.jsx';let source=fs.readFileSync(path,'utf8');
const start=source.indexOf('function ArtefatoFichaPanel('),end=source.indexOf('\nconst newCustomAbility=',start);
if(start<0||end<0)throw new Error('Artifact sheet panel boundaries missing');
source=source.slice(0,start)+'function ArtefatoFichaPanel(props) { return <ArtifactSheetPanel {...props}/>; }\n'+source.slice(end);
fs.writeFileSync(path,'import {ArtifactSheetPanel} from "../../experience/ArtifactPowers";\n'+source);
console.log('Sandaliers Six: natural requirements and bearer powers installed.');

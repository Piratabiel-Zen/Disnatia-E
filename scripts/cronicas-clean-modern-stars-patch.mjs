import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cronicasFile = path.join(root, 'src', 'features', 'cronicas', 'CronicasPage.jsx');
const globalCssFile = path.join(root, 'src', 'styles', 'global.css');
const cosmicFile = path.join(root, 'src', 'experience', 'CosmicLivingBackground.jsx');
const smoothFile = path.join(root, 'src', 'experience', 'performance-smooth.css');

const must = (ok, msg) => { if (!ok) throw new Error(`Crônicas/estrelas patch: ${msg}`); };
for (const file of [cronicasFile, globalCssFile, cosmicFile, smoothFile]) {
  must(fs.existsSync(file), `arquivo ausente: ${path.relative(root, file)}`);
}

let cronicas = fs.readFileSync(cronicasFile, 'utf8');
let globalCss = fs.readFileSync(globalCssFile, 'utf8');
let cosmic = fs.readFileSync(cosmicFile, 'utf8');
let smooth = fs.readFileSync(smoothFile, 'utf8');

const CRONICAS_MARKER = 'CRONICAS CLEAN SESSION META 2026-09-15';
if (!cronicas.includes(CRONICAS_MARKER)) {
  const oldNewEntry = "const newEntry=id=>({id,titulo:'',sessao:'',data:new Date().toLocaleDateString('pt-BR'),conteudo:'',imagens:[]});";
  const newNewEntry = "const newEntry=id=>({id,titulo:'',sessao:'',data:new Date().toLocaleDateString('pt-BR'),mestre:'Gabriel Marcondes',participantes:'',conteudo:'',imagens:[]});";
  must(cronicas.includes(oldNewEntry), 'newEntry da crônica não encontrado');
  cronicas = cronicas.replace(oldNewEntry, newNewEntry);

  const oldMaster = "  const sessionMaster = selectedEntry?.mestre || 'Ignácio (Mestre)';";
  const newMaster = "  const sessionMaster = selectedEntry?.mestre || 'Gabriel Marcondes';";
  must(cronicas.includes(oldMaster), 'fallback do Mestre não encontrado');
  cronicas = cronicas.replace(oldMaster, newMaster);

  const durationAnchor = "  const sessionDuration = selectedEntry?.duracao || 'Duração não informada';";
  must(cronicas.includes(durationAnchor), 'metadados da sessão não encontrados');
  cronicas = cronicas.replace(durationAnchor, `${durationAnchor}
  // ${CRONICAS_MARKER}
  const legacyParticipants = ['Ignácio','Jansen','Kenai','Elyon','Mateeo'];
  const hasParticipantsField = !!selectedEntry && Object.prototype.hasOwnProperty.call(selectedEntry,'participantes');
  const participantNames = (Array.isArray(selectedEntry?.participantes)
    ? selectedEntry.participantes
    : hasParticipantsField
      ? String(selectedEntry?.participantes || '').split(/[,;]/)
      : legacyParticipants
  ).map(name=>String(name||'').trim()).filter(Boolean);
  const participantPalette = ['#58D9FF','#E8193C','#E8A020','#A855F7','#4ADE80','#F472B6','#22D3EE','#F59E0B'];
  const participantColor = (name,index) => {
    const normalized = String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const known = normalized.includes('ignacio') ? '#58D9FF'
      : normalized.includes('jansen') ? '#E8193C'
      : normalized.includes('kenai') ? '#E8A020'
      : normalized.includes('elyon') ? '#A855F7'
      : (normalized.includes('mateeo') || normalized.includes('matheus')) ? '#4ADE80'
      : '';
    if (known) return known;
    let hash = 0; for (const ch of normalized) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
    return participantPalette[Math.abs(hash || index) % participantPalette.length];
  };
  const participantInitial = name => String(name||'?').trim().charAt(0).toUpperCase() || '?';`);

  const phraseAnchor = `<input value={selectedEntry.frase||''} onChange={e=>upd(selectedEntry.id,{...selectedEntry,frase:e.target.value})} placeholder="Frase de impacto" style={{width:'100%',marginBottom:8}}/>`;
  must(cronicas.includes(phraseAnchor), 'campo de frase da crônica não encontrado');
  cronicas = cronicas.replace(phraseAnchor, `<input className="chronicles-participants-input" value={Array.isArray(selectedEntry.participantes)?selectedEntry.participantes.join(', '):(selectedEntry.participantes??'')} onChange={e=>upd(selectedEntry.id,{...selectedEntry,participantes:e.target.value})} placeholder="Personagens presentes — separe por vírgula" style={{width:'100%',marginBottom:8}}/>
                ${phraseAnchor}`);

  const participantsLabel = '>PERSONAGENS PRESENTES</div>';
  const participantsAt = cronicas.indexOf(participantsLabel);
  must(participantsAt >= 0, 'seção PERSONAGENS PRESENTES não encontrada');
  const participantsStart = cronicas.lastIndexOf('<section className="chronicles-side-section">', participantsAt);
  const participantsEnd = cronicas.indexOf('</section>', participantsAt);
  must(participantsStart >= 0 && participantsEnd > participantsStart, 'limites da seção de participantes inválidos');
  const participantsSection = `<section className="chronicles-side-section chronicles-participants-section"><div className="chronicles-side-title">PERSONAGENS PRESENTES</div><div className="chronicles-participants-list">{participantNames.length?participantNames.map((name,i)=>{const color=participantColor(name,i);return <div className="chronicles-participant" key={name+'_'+i} title={name}><div className="chronicles-participant-orb" style={{'--participant-color':color}}>{participantInitial(name)}</div><small>{name}</small></div>}):<span className="chronicles-empty-participants">Nenhum personagem informado.</span>}</div>{masterMode&&<div className="chronicles-participants-hint">Edite os participantes em “Editar crônica”.</div>}</section>`;
  cronicas = cronicas.slice(0, participantsStart) + participantsSection + cronicas.slice(participantsEnd + '</section>'.length);

  const highlightsLabel = '>DESTAQUES DA SESSÃO</div>';
  const highlightsAt = cronicas.indexOf(highlightsLabel);
  must(highlightsAt >= 0, 'seção DESTAQUES DA SESSÃO não encontrada');
  const highlightsStart = cronicas.lastIndexOf('<section className="chronicles-side-section">', highlightsAt);
  const highlightsEnd = cronicas.indexOf('</section>', highlightsAt);
  must(highlightsStart >= 0 && highlightsEnd > highlightsStart, 'limites da seção Destaques inválidos');
  cronicas = cronicas.slice(0, highlightsStart) + cronicas.slice(highlightsEnd + '</section>'.length);
}

const CLEAN_CSS_MARKER = '/* CRONICAS CLEAN MODERN · 2026-09-15 */';
if (!globalCss.includes(CLEAN_CSS_MARKER)) {
  globalCss += `

${CLEAN_CSS_MARKER}
.chronicles-grid{gap:16px!important}
.chronicles-panel{clip-path:none!important;border-radius:18px!important;border:1px solid rgba(192,154,241,.12)!important;background:linear-gradient(155deg,rgba(10,7,20,.91),rgba(4,3,11,.96))!important;box-shadow:0 18px 44px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.025)!important}
.chronicles-right{overflow:hidden!important}
.chronicles-side-section{padding:18px 18px!important;border-bottom:1px solid rgba(255,255,255,.045)!important}
.chronicles-right .chronicles-side-section:last-child{border-bottom:0!important}
.chronicles-side-title{font:600 9px/1.2 'Cinzel',serif;letter-spacing:.17em;color:#b58bd8;margin-bottom:13px}
.chronicles-chip{margin:8px 0!important;gap:9px!important;color:#a99dad!important;font-size:12px!important}
.chronicles-participants-list{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start}
.chronicles-participant{display:grid;justify-items:center;gap:5px;min-width:48px;max-width:68px}
.chronicles-participant-orb{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--participant-color) 72%,transparent);background:radial-gradient(circle at 34% 27%,rgba(255,255,255,.12),rgba(8,7,17,.96) 62%);box-shadow:0 0 0 3px color-mix(in srgb,var(--participant-color) 6%,transparent),0 7px 18px rgba(0,0,0,.28);font:600 13px 'Cinzel',serif;color:#e9e1ec}
.chronicles-participant small{width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;font:600 7px/1.25 'Cinzel',serif;letter-spacing:.03em;color:#807583}
.chronicles-empty-participants,.chronicles-participants-hint{font-size:10px;color:#6f6573}.chronicles-participants-hint{margin-top:9px}
.chronicles-participants-input{border-color:rgba(168,85,247,.22)!important;background:rgba(255,255,255,.025)!important}
.chronicles-timeline{gap:8px!important}.chronicles-timeline-row{grid-template-columns:18px 1fr!important;gap:9px!important;color:#9a8f9e!important}.chronicles-timeline-dot{width:18px!important;height:18px!important;box-shadow:none!important;background:rgba(124,58,237,.72)!important}
.chronicles-editor{border-color:rgba(168,85,247,.17)!important;background:rgba(8,5,16,.94)!important;box-shadow:0 16px 42px rgba(0,0,0,.22)!important}
@media(max-width:1100px){.chronicles-right{grid-template-columns:repeat(2,minmax(0,1fr))!important}.chronicles-right .chronicles-side-section{border-right:1px solid rgba(255,255,255,.035)!important}}
@media(max-width:760px){.chronicles-shell{padding:12px 8px 74px!important}.chronicles-panel{border-radius:15px!important}.chronicles-right{display:block!important}.chronicles-right .chronicles-side-section{border-right:0!important}.chronicles-side-section{padding:16px!important}.chronicles-participant-orb{width:38px;height:38px}}
`;
}

const STAR_MARKER = 'DINASTIA COLORED SHOOTING STARS 2026-09-15';
if (!cosmic.includes(STAR_MARKER)) {
  const shootingCountAnchor = cosmic.includes('const SHOOTING_STAR_COUNT = 2;')
    ? 'const SHOOTING_STAR_COUNT = 2;'
    : 'const SHOOTING_STAR_COUNT = 3;';
  must(cosmic.includes(shootingCountAnchor), 'quantidade original de estrelas cadentes não encontrada');
  cosmic = cosmic.replace(shootingCountAnchor, `const SHOOTING_STAR_COUNT = 2;
const METEOR_COLORS = ['#EAF7FF','#BFA8FF','#FF9BCB','#7FE7FF','#FFD28A']; // ${STAR_MARKER}`);
  must(cosmic.includes('const duration = 13 + meteorRandom() * 13;'), 'duração original dos meteoros não encontrada');
  cosmic = cosmic.replace('const duration = 13 + meteorRandom() * 13;', 'const duration = 18 + meteorRandom() * 22;');
  must(cosmic.includes("    length: `${90 + Math.round(meteorRandom() * 85)}px`,"), 'comprimento do meteoro não encontrado');
  cosmic = cosmic.replace("    length: `${90 + Math.round(meteorRandom() * 85)}px`,", "    length: `${90 + Math.round(meteorRandom() * 85)}px`,\n    color: METEOR_COLORS[index % METEOR_COLORS.length],");
  must(cosmic.includes("              '--meteor-length': meteor.length,"), 'variável CSS do meteoro não encontrada');
  cosmic = cosmic.replace("              '--meteor-length': meteor.length,", "              '--meteor-length': meteor.length,\n              '--meteor-color': meteor.color,");
}

const SHOOTING_CSS_MARKER = '/* COLORED SHOOTING STARS RETURN · 2026-09-15 */';
if (!smooth.includes(SHOOTING_CSS_MARKER)) {
  smooth += `

${SHOOTING_CSS_MARKER}
/* Transform-only: restaura estrelas cadentes sem reintroduzir vídeo/canvas pesado. */
.cosmic-shooting-stars{display:block!important;pointer-events:none!important;overflow:hidden!important}
.cosmic-shooting-star{display:block!important;background:linear-gradient(90deg,var(--meteor-color,#fff) 0%,var(--meteor-color,#fff) 8%,rgba(255,255,255,.30) 32%,transparent 100%)!important;box-shadow:-4px 0 8px color-mix(in srgb,var(--meteor-color,#fff) 40%,transparent),-14px 0 22px color-mix(in srgb,var(--meteor-color,#fff) 16%,transparent)!important;filter:none!important}
.cosmic-shooting-star::before{background:var(--meteor-color,#fff)!important;box-shadow:0 0 7px var(--meteor-color,#fff),0 0 14px color-mix(in srgb,var(--meteor-color,#fff) 55%,transparent)!important}
html.opera-gx-safe .cosmic-shooting-stars{display:block!important}
html.opera-gx-safe .cosmic-shooting-star{display:block!important;box-shadow:none!important;filter:none!important;will-change:auto!important}
html.opera-gx-safe .cosmic-shooting-star::before{box-shadow:none!important}
html.opera-gx-safe .cosmic-shooting-star:nth-child(n+3){display:none!important}
`;
}

for (const marker of [
  CRONICAS_MARKER,
  "mestre:'Gabriel Marcondes'",
  'chronicles-participants-input',
  'chronicles-participant-orb',
  CLEAN_CSS_MARKER,
  STAR_MARKER,
  "'--meteor-color': meteor.color",
  SHOOTING_CSS_MARKER,
]) {
  must(cronicas.includes(marker) || globalCss.includes(marker) || cosmic.includes(marker) || smooth.includes(marker), `marcador final ausente: ${marker}`);
}
must(!cronicas.includes('>DESTAQUES DA SESSÃO</div>'), 'Destaques da sessão ainda presente na UI');

fs.writeFileSync(cronicasFile, cronicas);
fs.writeFileSync(globalCssFile, globalCss);
fs.writeFileSync(cosmicFile, cosmic);
fs.writeFileSync(smoothFile, smooth);

console.log('Dinastia E: Crônicas mais clean, Mestre padrão Gabriel Marcondes, participantes editáveis e estrelas cadentes coloridas restauradas sem alterar conteúdo persistido.');

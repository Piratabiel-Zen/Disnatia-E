import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const gameFile = path.join(root, 'src', 'experience', 'GameExperience3.jsx');
const cssFile = path.join(root, 'src', 'experience', 'game-experience-3.css');
const MARKER = 'SESSION OPENING CINEMATIC 2026-09-10';
const CSS_MARKER = '/* SESSION OPENING CINEMATIC 2026-09-10 */';

if (!fs.existsSync(gameFile) || !fs.existsSync(cssFile)) {
  throw new Error('Session opening cinematic: arquivos do Game Experience 3 não encontrados.');
}

let game = fs.readFileSync(gameFile, 'utf8');
let css = fs.readFileSync(cssFile, 'utf8');
const must = (ok, message) => { if (!ok) throw new Error(`Session opening cinematic: ${message}`); };

if (!game.includes(`/* ${MARKER} */`)) {
  const importAnchor = "import './game-experience-3.css';";
  must(game.includes(importAnchor), 'âncora de estilo não encontrada');
  game = game.replace(importAnchor, `${importAnchor}\n/* ${MARKER} */`);

  const saveSceneAnchor = "  const saveScene=()=>onUpdateSession(scene);";
  must(game.includes(saveSceneAnchor), 'helper de contexto da cena não encontrado');
  game = game.replace(saveSceneAnchor, `  const saveScene=()=>onUpdateSession(scene);\n  const revealOpeningScene=async()=>{\n    await onUpdateSession({title:scene.title||'',subtitle:scene.subtitle||'',location:scene.location||'',objective:scene.objective||''});\n    await onPatchGame({openingScene:{\n      id:nowId('opening'),active:true,\n      title:scene.title||session?.title||'DINASTIA E',\n      subtitle:scene.subtitle||session?.subtitle||'',\n      location:scene.location||session?.location||'',\n      objective:scene.objective||session?.objective||'',\n      imageRef:scene.openingImageRef||'',\n      startedAt:Date.now()\n    }});\n  };\n  const endOpeningScene=()=>onPatchGame({openingScene:{...(game?.openingScene||{}),active:false,endedAt:Date.now()}});`);

  const sceneInsertAnchor = "</div><h3>Ambiente sincronizado</h3>";
  must(game.includes(sceneInsertAnchor), 'posição da cena inicial no Game Director não encontrada');
  const openingEditor = `</div><h3>Cena inicial da sessão</h3><div className=\"g3-opening-editor\"><p>Prepare uma abertura cinematográfica para todos. Ela usa o título, subtítulo/local e objetivo acima e permanece na tela até você encerrá-la.</p><label>Imagem de fundo opcional<input type=\"file\" accept=\"image/*\" disabled={mediaBusy==='opening'} onChange={e=>{const f=e.target.files?.[0];attachMedia('opening',f,setScene,'openingImageRef');e.target.value='';}}/></label>{(mediaUrl(scene.openingImageRef))&&<div className=\"g3-media-preview wide opening\"><img src={mediaUrl(scene.openingImageRef)} alt=\"Prévia da cena inicial\"/><span>✓ Fundo da abertura salvo</span></div>}<div className=\"g3-director-row\"><button className=\"primary\" onClick={revealOpeningScene}>✦ Exibir cena inicial</button><button className=\"danger\" disabled={!game?.openingScene?.active} onClick={endOpeningScene}>Encerrar abertura</button></div><small className=\"g3-opening-status\">{game?.openingScene?.active?'● CENA INICIAL NO AR PARA TODA A MESA':'○ Preparada e oculta até você revelar'}</small></div><h3>Ambiente sincronizado</h3>`;
  game = game.replace(sceneInsertAnchor, openingEditor);

  const componentAnchor = `function GenericCinematic({session,masterMode,onExit}){\n  return <div className=\"g3-generic-cinematic\"><div><small>DINASTIA E</small><h1>{session?.title||'O mundo prende a respiração'}</h1><p>{session?.location||session?.subtitle||'Uma nova cena se revela.'}</p></div>{masterMode&&<button onClick={onExit}>Encerrar cinemática</button>}</div>;\n}`;
  must(game.includes(componentAnchor), 'componente cinematográfico existente não encontrado');
  const openingComponent = `function OpeningCinematic({opening,imageUrl,masterMode,onEnd}){\n  if(!opening?.active)return null;\n  return <div className=\"g3-opening-cinematic\">\n    {imageUrl&&<img className=\"g3-opening-bg\" src={imageUrl} alt=\"\"/>}\n    <div className=\"g3-opening-shade\"/><div className=\"g3-opening-stars\" aria-hidden=\"true\"><i/><i/><i/><i/><i/></div>\n    <div className=\"g3-opening-copy\"><small>DINASTIA E · SESSÃO ATUAL</small><h1>{opening.title||'O mundo desperta'}</h1>{opening.location&&<h2>{opening.location}</h2>}{opening.subtitle&&<p>{opening.subtitle}</p>}{opening.objective&&<div className=\"g3-opening-objective\"><span>OBJETIVO</span><b>{opening.objective}</b></div>}</div>\n    {masterMode&&<button className=\"g3-opening-end\" onClick={onEnd}>Encerrar abertura para todos</button>}\n  </div>;\n}\n\n${componentAnchor}`;
  game = game.replace(componentAnchor, openingComponent);

  const renderAnchor = "    {bossVisible&&<BossCinematic boss={game?.bossReveal}/>}";
  must(game.includes(renderAnchor), 'render da cinemática de chefe não encontrado');
  game = game.replace(renderAnchor, `    {game?.openingScene?.active&&<OpeningCinematic opening={game.openingScene} imageUrl={directorMedia?.[String(game.openingScene.imageRef||'')]?.data||''} masterMode={masterMode} onEnd={()=>patchGame({openingScene:{...(game?.openingScene||{}),active:false,endedAt:Date.now()}})}/>}\n${renderAnchor}`);
}

if (!css.includes(CSS_MARKER)) {
  css += `\n\n${CSS_MARKER}\n.g3-opening-editor{display:grid;gap:8px;padding:10px;border:1px solid rgba(168,85,247,.13);border-radius:12px;background:linear-gradient(180deg,rgba(168,85,247,.035),rgba(255,255,255,.012))}.g3-opening-editor>p{margin:0;color:#74647c;font-size:9px;line-height:1.45}.g3-opening-status{font:700 6px 'Cinzel',serif;letter-spacing:.08em;color:#75647e}.g3-opening-cinematic{position:fixed;inset:0;z-index:var(--g3-z-cinematic);display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 42%,rgba(72,28,113,.18),transparent 42%),#020104;isolation:isolate}.g3-opening-bg{position:absolute;inset:-2%;width:104%;height:104%;object-fit:cover;z-index:-4;filter:brightness(.52) saturate(.92) contrast(1.06);animation:g3OpeningDrift 24s ease-out both}.g3-opening-shade{position:absolute;inset:0;z-index:-3;background:radial-gradient(circle at 50% 42%,rgba(0,0,0,.06),rgba(0,0,0,.58) 66%,rgba(0,0,0,.88)),linear-gradient(180deg,rgba(0,0,0,.52),transparent 34%,rgba(0,0,0,.6))}.g3-opening-stars{position:absolute;inset:0;z-index:-2;pointer-events:none}.g3-opening-stars i{position:absolute;width:2px;height:2px;border-radius:50%;background:#d9c5ef;box-shadow:0 0 14px rgba(188,142,232,.78);animation:g3OpeningTwinkle 3.6s ease-in-out infinite}.g3-opening-stars i:nth-child(1){left:12%;top:28%}.g3-opening-stars i:nth-child(2){left:31%;top:17%;animation-delay:-1.1s}.g3-opening-stars i:nth-child(3){right:24%;top:31%;animation-delay:-2.2s}.g3-opening-stars i:nth-child(4){right:11%;bottom:27%;animation-delay:-.7s}.g3-opening-stars i:nth-child(5){left:20%;bottom:18%;animation-delay:-1.8s}.g3-opening-copy{width:min(980px,86vw);text-align:center;padding:42px 24px;text-shadow:0 4px 24px #000;animation:g3OpeningIn .9s cubic-bezier(.2,.8,.2,1)}.g3-opening-copy>small{font:700 9px 'Cinzel',serif;letter-spacing:.48em;color:#927ba1}.g3-opening-copy h1{margin:16px 0 10px;font-family:'Cinzel Decorative',serif;font-size:clamp(38px,6.4vw,92px);line-height:1.02;color:#eee3f0;font-weight:700}.g3-opening-copy h2{margin:0;font:700 clamp(11px,1.6vw,18px) 'Cinzel',serif;letter-spacing:.22em;color:#c6adc9;text-transform:uppercase}.g3-opening-copy>p{max-width:720px;margin:18px auto 0;color:#a996af;font:600 clamp(12px,1.45vw,16px) 'Crimson Text',serif;line-height:1.5}.g3-opening-objective{max-width:700px;margin:28px auto 0;padding:14px 18px;border-top:1px solid rgba(168,85,247,.25);border-bottom:1px solid rgba(168,85,247,.15);background:linear-gradient(90deg,transparent,rgba(168,85,247,.045),transparent)}.g3-opening-objective span{display:block;font:700 7px 'Cinzel',serif;letter-spacing:.32em;color:#785f87}.g3-opening-objective b{display:block;margin-top:7px;font:600 clamp(11px,1.35vw,15px) 'Cinzel',serif;color:#d2bfd7}.g3-opening-end{position:absolute;right:22px;top:22px;z-index:2;border-radius:10px;border:1px solid rgba(232,160,32,.26);background:rgba(8,4,16,.8);color:#d1ad69;padding:9px 12px;font:700 7px 'Cinzel',serif;letter-spacing:.06em;cursor:pointer;backdrop-filter:blur(10px)}@keyframes g3OpeningIn{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}@keyframes g3OpeningDrift{from{transform:scale(1.07)}to{transform:scale(1)}}@keyframes g3OpeningTwinkle{50%{opacity:.25;transform:scale(.62)}}@media(max-width:900px){.g3-opening-copy{width:94vw;padding:26px 14px}.g3-opening-copy>small{font-size:6px;letter-spacing:.32em}.g3-opening-copy h1{font-size:clamp(30px,11vw,58px)}.g3-opening-objective{margin-top:20px;padding:11px 12px}.g3-opening-end{right:10px;top:10px;padding:8px 9px}}@media(prefers-reduced-motion:reduce){.g3-opening-bg,.g3-opening-copy,.g3-opening-stars i{animation:none!important}}\n`;
}

for (const marker of [
  'revealOpeningScene',
  'g3-opening-cinematic',
  'openingScene:{',
  'Encerrar abertura para todos',
  'Imagem de fundo opcional',
]) must(game.includes(marker) || css.includes(marker), `marcador final ausente: ${marker}`);

fs.writeFileSync(gameFile, game);
fs.writeFileSync(cssFile, css);
console.log('Dinastia E: cena inicial cinematográfica restaurada, persistente no Game Director e sincronizada para toda a mesa.');

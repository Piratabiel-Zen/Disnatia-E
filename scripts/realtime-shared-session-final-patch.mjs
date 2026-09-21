import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, source) => fs.writeFileSync(path.join(root, rel), source);
const must = (condition, message) => {
  if (!condition) throw new Error(`Shared session realtime: ${message}`);
};

const gameFile = 'src/experience/GameExperience3.adventure.jsx';
let game = read(gameFile);

game = game.replace(
  "import { compressImage } from '../core/media';",
  "import { compressImage } from '../core/media';\nimport { remainingLiveEventMs } from './liveEventTiming';",
);

game = game.replace(
`  const [bossVisible,setBossVisible]=useState(false);
  const clientJoinedAtRef=useRef(Date.now());
  const [openingVisible,setOpeningVisible]=useState(false);
  const openingSeenRef=useRef('');
  const bossRevealPrimedRef=useRef(false);
  const lastBossRevealIdRef=useRef('');
  const [gameReady,setGameReady]=useState(false);`,
`  const [bossVisible,setBossVisible]=useState(false);
  const [openingVisible,setOpeningVisible]=useState(false);
  const [gameReady,setGameReady]=useState(false);`,
);

const scopeStart = game.indexOf('  // RUNTIME LIGHTWEIGHT · IMMERSIVE LISTENER SCOPE 2026-09-13');
const mediaStart = game.indexOf('  const liveMediaIds=', scopeStart);
must(scopeStart >= 0 && mediaStart > scopeStart, 'escopo dos listeners do Game Director não encontrado');

const scopedListeners = `  // SHARED SESSION REALTIME 2026-09-21
  // Um único documento pequeno permanece ativo em todas as páginas. Assim mapa,
  // cena, chefe e estado do mundo não dependem da rota que o jogador está vendo.
  useEffect(()=>onSnapshot(doc(db,'config',GAME_DOC),snap=>{
    setGame(snap.exists()?{worldMode:'exploration',environment:{type:'none',intensity:45},...(snap.data()||{})}:{worldMode:'exploration',environment:{type:'none',intensity:45}});
    setGameReady(true);
  },error=>console.error('Erro no canal global da sessão:',error)),[]);

  // Coleções maiores continuam ligadas apenas nas superfícies que as consomem.
  const g3LiveSurface=['session','mapamundi','mapabatalha'].includes(tab) || (masterMode && panel==='director');
  useEffect(()=>{
    if(!g3LiveSurface){
      setPresence([]);setItems([]);setEnemies([]);setDirectorMedia({});
      return undefined;
    }
    const u2=onSnapshot(collection(db,'presence'),snap=>setPresence(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const u3=onSnapshot(collection(db,'campaign_items'),snap=>setItems(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>Number(b.updatedAt||b.createdAt||0)-Number(a.updatedAt||a.createdAt||0))));
    const u4=onSnapshot(collection(db,'enemies'),snap=>setEnemies(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>{u2();u3();u4();};
  },[g3LiveSurface]);

`;
game = game.slice(0, scopeStart) + scopedListeners + game.slice(mediaStart);

game = game.replace(
`  useEffect(()=>{
    if(!g3LiveSurface)return;
    if(masterMode&&panel==='director')return onSnapshot(collection(db,'director_media'),snap=>{`,
`  useEffect(()=>{
    if(masterMode&&panel==='director')return onSnapshot(collection(db,'director_media'),snap=>{`,
);

const bossRevealStart = game.indexOf('  const revealBoss=async()=>{');
const bossRevealEnd = game.indexOf('\n  const revealDiscovery=', bossRevealStart);
must(bossRevealStart >= 0 && bossRevealEnd > bossRevealStart, 'publicação da revelação de chefe não encontrada');
game = game.slice(0, bossRevealStart) + `  const revealBoss=async()=>{
    const id=nowId('boss');
    const createdAt=Date.now();
    const durationMs=8500;
    const payload={...boss,id,visible:true,createdAt,durationMs,expiresAt:createdAt+durationMs};
    await onPatchGame({bossReveal:payload,bossRevealDismissedId:''});
    window.setTimeout(()=>onPatchGame({bossRevealDismissedId:id}).catch(()=>{}),durationMs+900);
  };` + game.slice(bossRevealEnd);

const openingRevealStart = game.indexOf('  const revealOpeningScene=async()=>{');
const openingRevealEnd = game.indexOf('\n  const endOpeningScene=', openingRevealStart);
must(openingRevealStart >= 0 && openingRevealEnd > openingRevealStart, 'publicação da cena inicial não encontrada');
game = game.slice(0, openingRevealStart) + `  const revealOpeningScene=async()=>{
    const context={title:scene.title||'',subtitle:scene.subtitle||'',location:scene.location||'',objective:scene.objective||''};
    const id=nowId('opening');
    const startedAt=Date.now();
    const durationMs=12000;
    await Promise.all([
      onUpdateSession(context),
      onPatchGame({openingScene:{
        id,active:true,...context,
        title:context.title||session?.title||'DINASTIA E',
        subtitle:context.subtitle||session?.subtitle||'',
        location:context.location||session?.location||'',
        objective:context.objective||session?.objective||'',
        imageRef:scene.openingImageRef||'',startedAt,durationMs,expiresAt:startedAt+durationMs,
      }}),
    ]);
    window.setTimeout(()=>onPatchGame({openingScene:{id,active:false,endedAt:Date.now()}}).catch(()=>{}),durationMs+900);
  };` + game.slice(openingRevealEnd);

const bossEffectStart = game.indexOf("  useEffect(()=>{\n    if(!gameReady)return;\n    const boss=game?.bossReveal;");
const openingEffectStart = game.indexOf("\n\n  useEffect(()=>{\n    if(!gameReady)return;\n    const opening=game?.openingScene;", bossEffectStart);
must(bossEffectStart >= 0 && openingEffectStart > bossEffectStart, 'efeito receptor do chefe não encontrado');
const bossEffect = `  useEffect(()=>{
    if(!gameReady)return;
    const boss=game?.bossReveal;
    const id=String(boss?.id||'');
    const dismissed=String(game?.bossRevealDismissedId||'');
    const remaining=remainingLiveEventMs(boss,8500);
    if(!id||boss?.visible===false||dismissed===id||remaining<=0){setBossVisible(false);return;}
    setBossVisible(true);
    const timer=window.setTimeout(()=>setBossVisible(false),remaining);
    return()=>window.clearTimeout(timer);
  },[gameReady,game?.bossReveal?.id,game?.bossReveal?.visible,game?.bossReveal?.createdAt,game?.bossReveal?.expiresAt,game?.bossReveal?.durationMs,game?.bossRevealDismissedId]);`;
game = game.slice(0, bossEffectStart) + bossEffect + game.slice(openingEffectStart);

const newOpeningStart = game.indexOf("  useEffect(()=>{\n    if(!gameReady)return;\n    const opening=game?.openingScene;", bossEffectStart + bossEffect.length);
const discoveryEffectStart = game.indexOf("\n\n  useEffect(()=>{\n    const event=game?.discovery;", newOpeningStart);
must(newOpeningStart >= 0 && discoveryEffectStart > newOpeningStart, 'efeito receptor da cena não encontrado');
const openingEffect = `  useEffect(()=>{
    if(!gameReady)return;
    const opening=game?.openingScene;
    const remaining=remainingLiveEventMs(opening,12000);
    if(!opening?.id||opening?.active===false||remaining<=0){setOpeningVisible(false);return;}
    setOpeningVisible(true);
    const timer=window.setTimeout(()=>setOpeningVisible(false),remaining);
    return()=>window.clearTimeout(timer);
  },[gameReady,game?.openingScene?.id,game?.openingScene?.active,game?.openingScene?.startedAt,game?.openingScene?.expiresAt,game?.openingScene?.durationMs]);`;
game = game.slice(0, newOpeningStart) + openingEffect + game.slice(discoveryEffectStart);

for (const marker of [
  'SHARED SESSION REALTIME 2026-09-21',
  "onSnapshot(doc(db,'config',GAME_DOC)",
  'remainingLiveEventMs(boss,8500)',
  'remainingLiveEventMs(opening,12000)',
  'expiresAt:createdAt+durationMs',
  'expiresAt:startedAt+durationMs',
]) must(game.includes(marker), `Game Director sem ${marker}`);
must(!game.includes('if(!g3LiveSurface)return;'), 'mídia de cena ainda depende da rota atual');
must(!game.includes('bossRevealPrimedRef'), 'primeiro snapshot da revelação ainda é descartado');
write(gameFile, game);

// Invariantes do restante da mesa: mantêm o fast-path sem criar novos canais.
const battle = read('src/features/mapa-batalha/BattleMapPage.jsx');
for (const marker of [
  'const TOKEN_THROTTLE_MS = 33;',
  "channel: 'motion-v2'",
  "channel: 'position-final-v1'",
  'requestAnimationFrame(flushRemotePositions)',
  'state.inFlight >= 3',
]) must(battle.includes(marker), `movimento de token sem ${marker}`);
must(!battle.includes('battlemap_motion_'), 'canal duplicado de movimento reapareceu');

const ambient = read('src/shell/AmbientSoundPlayer.jsx');
must(ambient.includes("onSnapshot(ambientRef"), 'música sem listener realtime');
must(ambient.includes("commandId: 'ambient_"), 'música sem comando idempotente');

const replay = read('src/experience/SharedDiceReplay.jsx');
must(replay.includes("collection(db, 'public_dice_events')"), 'dados sem feed compartilhado');
const experience = read('src/experience/ExperienceKit.generated.jsx');
must(experience.includes("doc(db,'combat_action_events',id)"), 'habilidades sem feed compartilhado');
must(experience.includes("doc(db,'cosmic_events',abilityEvent.id)"), 'efeito de habilidade sem broadcast');

console.log('Dinastia E: sessão compartilhada global, cutscenes confiáveis e fast-path realtime validados.');


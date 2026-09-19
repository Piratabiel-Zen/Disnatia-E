import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const battleFile=path.join(root,'src','features','mapa-batalha','BattleMapPage.jsx');
const gameFile=path.join(root,'src','experience','GameExperience3.jsx');
const replayFile=path.join(root,'src','experience','SharedDiceReplay.jsx');
const must=(ok,msg)=>{if(!ok)throw new Error(`Tabletop hotfix: ${msg}`);};

let battle=fs.readFileSync(battleFile,'utf8');
let game=fs.readFileSync(gameFile,'utf8');
let replay=fs.readFileSync(replayFile,'utf8');

// ── 1) TOKENS: clique não persiste array e drag remoto não disputa o ponteiro local.
if(!battle.includes('REMOTE TOKEN LEASE 2026-09-19')){
  const refAnchor='  const moved = useRef(false);';
  must(battle.includes(refAnchor),'ref moved ausente');
  battle=battle.replace(refAnchor, `${refAnchor}
  // REMOTE TOKEN LEASE 2026-09-19
  const draggingIdRef = useRef(null);
  const remoteTokenLeaseRef = useRef({});
  useEffect(()=>{ draggingIdRef.current = draggingId; },[draggingId]);`);

  const pointerBefore=`  const onTokenPointerDown = (e, token) => {
    if (token.locked && !masterMode) return;
    e.stopPropagation();
    moved.current = false;
    setDraggingId(token.id);
  };`;
  const pointerAfter=`  const onTokenPointerDown = (e, token) => {
    if (token.locked && !masterMode) return;
    const leaseKey = String(currentMap?.id || '') + ':' + String(token.id);
    const remoteLease = remoteTokenLeaseRef.current[leaseKey];
    if (remoteLease && Number(remoteLease.until || 0) > Date.now() && String(remoteLease.clientId || '') !== String(liveClientIdRef.current)) {
      e.stopPropagation();
      pushToast('Este token está sendo movido por outro participante.', '🔒', '#E8A020');
      return;
    }
    e.stopPropagation();
    moved.current = false;
    setDraggingId(token.id);
  };`;
  must(battle.includes(pointerBefore),'onTokenPointerDown final não encontrado');
  battle=battle.replace(pointerBefore,pointerAfter);

  const remoteBefore=`        if (String(data.clientId || '') === String(liveClientIdRef.current)) return;

        const tokenId = String(data.tokenId);`;
  const remoteAfter=`        const tokenId = String(data.tokenId);
        const remoteClientId = String(data.clientId || '');
        const ownClientId = String(liveClientIdRef.current);
        if (remoteClientId && remoteClientId !== ownClientId && String(data.channel || '') === 'motion-v2') {
          remoteTokenLeaseRef.current[String(currentMapId) + ':' + tokenId] = { clientId: remoteClientId, until: Date.now() + 1200 };
        }
        if (remoteClientId === ownClientId) return;
        // Enquanto este cliente arrasta o token, snapshots de outro cliente nunca
        // disputam o mesmo estado React. Após o pointerup o próximo snapshot remoto
        // volta a ser aceito normalmente.
        if (String(draggingIdRef.current || '') === tokenId) return;`;
  must(battle.includes(remoteBefore),'listener remoto de posição final não encontrado');
  battle=battle.replace(remoteBefore,remoteAfter);

  const durableBefore=`      const latestTokens = mapTokensRef.current[String(mapIdAtDragStart)];
      if (latestTokens) {`;
  const durableAfter=`      const latestTokens = mapTokensRef.current[String(mapIdAtDragStart)];
      // Um simples clique serve apenas para selecionar. Persistir o array inteiro sem
      // movimento podia sobrescrever a posição que outro cliente ainda estava movendo.
      if (moved.current && latestTokens) {`;
  must(battle.includes(durableBefore),'persistência de pointerup não encontrada');
  battle=battle.replace(durableBefore,durableAfter);
}

// ── 2) GAME DIRECTOR: remover referências de mídia sem apagar registros históricos.
if(!game.includes('const clearDirectorMedia=')){
  const mediaAnchor=`  const mediaUrl=ref=>directorMedia?.[String(ref||'')]?.data||'';
  const attachMedia=async(kind,file,setter,refField='imageRef')=>{`;
  const mediaReplacement=`  const mediaUrl=ref=>directorMedia?.[String(ref||'')]?.data||'';
  const clearDirectorMedia=(setter,refField='imageRef')=>setter(v=>({
    ...v,
    [refField]:'',
    ...(refField==='portraitRef'?{portrait:''}:{}),
    ...(refField==='imageRef'?{imageUrl:''}:{}),
  }));
  const attachMedia=async(kind,file,setter,refField='imageRef')=>{`;
  must(game.includes(mediaAnchor),'helper de mídia do Director ausente');
  game=game.replace(mediaAnchor,mediaReplacement);

  game=game.replace(
    '<span>✓ Retrato salvo</span></div>',
    '<span>✓ Retrato salvo</span><button type="button" onClick={()=>clearDirectorMedia(setNpc,\'portraitRef\')}>Retirar imagem</button></div>'
  );
  game=game.replace(
    '<span>✓ Imagem salva</span></div>',
    '<span>✓ Imagem salva</span><button type="button" onClick={()=>clearDirectorMedia(setHandout)}>Retirar imagem</button></div>'
  );
  game=game.replace(
    '<span>✓ Arte do chefe salva</span></div>',
    '<span>✓ Arte do chefe salva</span><button type="button" onClick={()=>clearDirectorMedia(setBoss)}>Retirar imagem</button></div>'
  );
  game=game.replace(
    '<span>✓ Fundo da abertura salvo</span></div>',
    '<span>✓ Fundo da abertura salvo</span><button type="button" onClick={()=>clearDirectorMedia(setScene,\'openingImageRef\')}>Retirar imagem</button></div>'
  );
}

// ── 3) LOGIN: cenas persistidas antes da abertura desta aba nunca autoabrem.
if(!game.includes('const clientJoinedAtRef=useRef(Date.now())')){
  const bossState='  const [bossVisible,setBossVisible]=useState(false);';
  must(game.includes(bossState),'estado bossVisible ausente');
  game=game.replace(bossState,`${bossState}
  const clientJoinedAtRef=useRef(Date.now());
  const [openingVisible,setOpeningVisible]=useState(false);
  const openingSeenRef=useRef('');`);

  const bossGuard=`    if(!boss?.id||boss.visible===false||dismissed===String(boss.id)){setBossVisible(false);return;}`;
  const bossGuardNew=`    if(!boss?.id||boss.visible===false||dismissed===String(boss.id)){setBossVisible(false);return;}
    if(Number(boss.createdAt||0) < clientJoinedAtRef.current - 1000){setBossVisible(false);lastBossRevealIdRef.current=String(boss.id||'');return;}`;
  must(game.includes(bossGuard),'guard de boss reveal ausente');
  game=game.replace(bossGuard,bossGuardNew);

  const bossEffectEnd=`  },[gameReady,game?.bossReveal?.id,game?.bossReveal?.visible,game?.bossRevealDismissedId]);`;
  must(game.includes(bossEffectEnd),'fim do efeito de boss ausente');
  const openingEffect=`${bossEffectEnd}

  useEffect(()=>{
    if(!gameReady)return;
    const opening=game?.openingScene;
    const id=String(opening?.id||'');
    if(!id||opening?.active===false){setOpeningVisible(false);return;}
    if(!openingSeenRef.current){
      openingSeenRef.current=id;
      setOpeningVisible(Number(opening?.startedAt||0) >= clientJoinedAtRef.current - 1000);
      return;
    }
    if(id===openingSeenRef.current)return;
    openingSeenRef.current=id;
    setOpeningVisible(true);
  },[gameReady,game?.openingScene?.id,game?.openingScene?.active]);`;
  game=game.replace(bossEffectEnd,openingEffect);

  const openingRender='{game?.openingScene?.active&&<OpeningCinematic opening={game.openingScene} imageUrl={directorMedia?.[String(game.openingScene.imageRef||\'\')]?.data||\'\'} masterMode={masterMode} onEnd={()=>patchGame({openingScene:{...(game?.openingScene||{}),active:false,endedAt:Date.now()}})}/>}';
  const openingRenderNew='{openingVisible&&<OpeningCinematic opening={game.openingScene} imageUrl={directorMedia?.[String(game.openingScene.imageRef||\'\')]?.data||\'\'} masterMode={masterMode} onEnd={()=>{setOpeningVisible(false);patchGame({openingScene:{...(game?.openingScene||{}),active:false,endedAt:Date.now()}})}}/>}';
  must(game.includes(openingRender),'render persistente de opening scene ausente');
  game=game.replace(openingRender,openingRenderNew);
}

// ── 4) Sanidade.
for(const marker of [
  'REMOTE TOKEN LEASE 2026-09-19',
  'moved.current && latestTokens',
  'Este token está sendo movido por outro participante.',
]) must(battle.includes(marker),`BattleMap incompleto: ${marker}`);
for(const marker of [
  'const clearDirectorMedia=',
  'Retirar imagem',
  'const clientJoinedAtRef=useRef(Date.now())',
  'openingVisible&&<OpeningCinematic',
]) must(game.includes(marker),`Game Director/login incompleto: ${marker}`);
must(replay.includes("doc(db, 'config', 'public_dice_roll')"),'fallback de dado compartilhado ausente');
must(replay.includes('unsubFeed(); unsubConfig();'),'cleanup duplo do replay ausente');

fs.writeFileSync(battleFile,battle);
fs.writeFileSync(gameFile,game);
console.log('Dinastia E: hotfix concorrência de tokens, dados compartilhados, remoção de mídia e login sem cinemática histórica aplicado.');

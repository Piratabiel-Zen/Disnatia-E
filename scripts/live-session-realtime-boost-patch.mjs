import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const battleFile = path.join(root,'src','features','mapa-batalha','BattleMapPage.jsx');
const gameFile = path.join(root,'src','experience','GameExperience3.jsx');

const must = (ok,msg)=>{ if(!ok) throw new Error(`Live realtime boost: ${msg}`); };

let battle = fs.readFileSync(battleFile,'utf8');

const replaceBattle = (before,after,label)=>{
  if(battle.includes(after)) return;
  must(battle.includes(before),`marcador ausente (${label})`);
  battle = battle.replace(before,after);
};

replaceBattle('const TOKEN_THROTTLE_MS = 40;','const TOKEN_THROTTLE_MS = 28;','cadência do token');
replaceBattle('if (!state.pending || state.inFlight >= 2) return;','if (!state.pending || state.inFlight >= 3) return;','pipeline concorrente');
replaceBattle('const slot = seq % 3;','const slot = seq % 4;','slots de movimento');
replaceBattle("transition: draggingId === token.id ? 'none' : 'left 32ms linear, top 32ms linear'","transition: draggingId === token.id ? 'none' : 'left 16ms linear, top 16ms linear'",'interpolação remota');
replaceBattle('    }, 450);','    }, 90);','debounce de metadata do mapa');
replaceBattle("    }, 700);\n  };\n  const updSheet", "    }, 120);\n  };\n  const updSheet", 'debounce da ficha pelo battlemap');

const oldUploadBlock = `        const preview = await makeBattleMapPreview(original);\n        for (let index = 0; index < chunks.length; index++) {\n          const chunkId = \`${'${uploadId}'}_${'${String(index).padStart(4, \'0\')}'}\`;\n          await setDoc(doc(db, 'battlemap_media_chunks', chunkId), {\n            mapId, uploadId, index, data: chunks[index], updatedAt: Date.now(),\n          });\n        }\n        const patch = {\n          img: preview,\n          imgUploadId: uploadId,\n          imgChunkCount: chunks.length,\n          imgOriginalChars: original.length,\n          imgOriginalName: file?.name || '',\n          imgOriginalType: file?.type || '',\n          imgOriginalQuality: true,\n          imgUpdatedAt: Date.now(),\n        };\n        setMaps(prev => prev.map(m => String(m.id) === mapId ? { ...m, ...patch } : m));\n        await setDoc(doc(db, 'battlemaps', mapId), patch, { merge: true });\n        if (oldUploadId && oldUploadId !== uploadId && oldChunkCount) {\n          await deleteBattleMapChunks(mapId, oldUploadId, oldChunkCount);\n        }`;

const newUploadBlock = `        const preview = await makeBattleMapPreview(original);\n        const patch = {\n          img: preview,\n          imgUploadId: uploadId,\n          imgChunkCount: chunks.length,\n          imgOriginalChars: original.length,\n          imgOriginalName: file?.name || '',\n          imgOriginalType: file?.type || '',\n          imgOriginalQuality: true,\n          imgUpdatedAt: Date.now(),\n        };\n        setMaps(prev => prev.map(m => String(m.id) === mapId ? { ...m, ...patch } : m));\n        await setDoc(doc(db, 'battlemaps', mapId), patch, { merge: true });\n\n        const BATCH = 6;\n        for (let start = 0; start < chunks.length; start += BATCH) {\n          const writes = [];\n          for (let index = start; index < Math.min(chunks.length, start + BATCH); index++) {\n            const chunkId = \`${'${uploadId}'}_${'${String(index).padStart(4, \'0\')}'}\`;\n            writes.push(setDoc(doc(db, 'battlemap_media_chunks', chunkId), {\n              mapId, uploadId, index, data: chunks[index], updatedAt: Date.now(),\n            }));\n          }\n          await Promise.all(writes);\n        }\n        if (oldUploadId && oldUploadId !== uploadId && oldChunkCount) {\n          deleteBattleMapChunks(mapId, oldUploadId, oldChunkCount).catch(() => {});\n        }`;

replaceBattle(oldUploadBlock,newUploadBlock,'publicação imediata de imagem do mapa');

for (const marker of ['const TOKEN_THROTTLE_MS = 28;','state.inFlight >= 3','const slot = seq % 4;',"left 16ms linear, top 16ms linear",'const BATCH = 6;']) {
  must(battle.includes(marker),`marcador final ausente: ${marker}`);
}
fs.writeFileSync(battleFile,battle);

if (fs.existsSync(gameFile)) {
  let game = fs.readFileSync(gameFile,'utf8');
  if (game.includes('    },450);')) game = game.replace('    },450);','    },120);');
  else if (game.includes('    }, 450);')) game = game.replace('    }, 450);','    }, 120);');
  must(game.includes('},120);') || game.includes('}, 120);'),'autosave realtime do Game Director não aplicado');
  fs.writeFileSync(gameFile,game);
}

console.log('Dinastia E: sessão ao vivo em modo realtime rápido — preview imediato, chunks paralelos, 28ms token e autosaves curtos.');

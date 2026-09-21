import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);
const must = (condition, message) => {
  if (!condition) throw new Error(`Dice live-session patch: ${message}`);
};

const replayFile = 'src/experience/SharedDiceReplay.jsx';
let replay = read(replayFile);

replay = replay.replace('  const joinedAtRef = useRef(Date.now());\n', '');
replay = replay.replace(
  `    const eventTs = Number(payload?.ts || 0);
    if (!eventTs || eventTs < joinedAtRef.current) {
      remember(id);
      return;
    }
    remember(id);`,
  `    remember(id);`,
);
replay = replay.replace(
  `        snap.docs.forEach(d => {
          const payload={ _feedId:d.id, ...(d.data() || {}) };
          if(Number(payload.ts||0) >= joinedAtRef.current - 1200) enqueue(payload);
          else remember(getReplayId(payload));
        });`,
  `        // O primeiro snapshot é apenas a linha de corte desta aba. Tudo que já
        // existia antes do listener ficar pronto é memorizado, nunca reproduzido.
        snap.docs.forEach(d => remember(getReplayId({ _feedId:d.id, ...(d.data() || {}) })));`,
);
replay = replay.replace(
  `      snap.docChanges().forEach(change => {
        if (change.type === 'removed') return;
        enqueue({ _feedId: change.doc.id, ...(change.doc.data() || {}) });
      });`,
  `      snap.docChanges().forEach(change => {
        // Somente documentos criados depois da entrada nesta sessão podem rolar.
        // Alterações ou remoções de registros históricos nunca disparam animação.
        if (change.type !== 'added') return;
        enqueue({ _feedId: change.doc.id, ...(change.doc.data() || {}) });
      });`,
);
replay = replay.replace(
  `      if (!configPrimed) {
        configPrimed = true;
        if(Number(payload.ts||0) >= joinedAtRef.current - 1200) enqueue(payload);
        else remember(getReplayId(payload));
        return;
      }`,
  `      if (!configPrimed) {
        configPrimed = true;
        remember(getReplayId(payload));
        return;
      }`,
);

must(!replay.includes('joinedAtRef'), 'a tolerância histórica ainda existe no replay');
must(replay.includes("if (change.type !== 'added') return;"), 'o feed não está restrito a novos documentos');
must(replay.includes('snap.docs.forEach(d => remember('), 'o primeiro snapshot não está sendo apenas memorizado');
must(replay.includes('configPrimed = true;\n        remember(getReplayId(payload));'), 'o fallback inicial ainda pode reproduzir histórico');
write(replayFile, replay);

const criticalFile = 'src/experience/DiceCriticalFx.jsx';
let critical = read(criticalFile);
critical = critical.replace('  const joinedAtRef = useRef(Date.now());\n', '');
critical = critical.replace(
  `        snap.docs.forEach(item => {
          const payload = { _feedId: item.id, ...(item.data() || {}) };
          if (Number(payload.ts || 0) >= joinedAtRef.current - 1200) ingest(payload);
          else remember(eventIdOf(payload));
        });`,
  `        // Críticos anteriores à abertura desta sessão também são somente
        // memorizados; não reaparecem ao entrar ou atualizar a página.
        snap.docs.forEach(item => remember(eventIdOf({ _feedId: item.id, ...(item.data() || {}) })));`,
);
critical = critical.replace(
  `      snap.docChanges().forEach(change => {
        if (change.type !== 'removed') ingest({ _feedId: change.doc.id, ...(change.doc.data() || {}) });
      });`,
  `      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return;
        ingest({ _feedId: change.doc.id, ...(change.doc.data() || {}) });
      });`,
);
critical = critical.replace(
  `      if (!configPrimed) {
        configPrimed = true;
        if (Number(payload.ts || 0) >= joinedAtRef.current - 1200) ingest(payload);
        else remember(eventIdOf(payload));
        return;
      }`,
  `      if (!configPrimed) {
        configPrimed = true;
        remember(eventIdOf(payload));
        return;
      }`,
);

must(!critical.includes('joinedAtRef'), 'a tolerância histórica ainda existe nos críticos');
must(critical.includes("if (change.type !== 'added') return;"), 'críticos não estão restritos a novos documentos');
must(critical.includes('snap.docs.forEach(item => remember('), 'críticos iniciais não estão sendo apenas memorizados');
must(critical.includes('configPrimed = true;\n        remember(eventIdOf(payload));'), 'fallback crítico inicial ainda pode reproduzir histórico');
write(criticalFile, critical);

console.log('Dinastia E: dados e críticos agora reproduzem somente eventos criados após o início da sessão atual.');

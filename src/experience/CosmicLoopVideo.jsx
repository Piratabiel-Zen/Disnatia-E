import { useEffect, useState } from 'react';

const VIDEO_PARTS = [
  '/media/deserto-bg/part-00.txt',
  '/media/deserto-bg/part-01.txt',
  '/media/deserto-bg/part-02.txt',
  '/media/deserto-bg/part-03.txt',
  '/media/deserto-bg/part-04.txt',
  '/media/deserto-bg/part-05-07.txt',
  '/media/deserto-bg/part-08-10.txt',
  '/media/deserto-bg/part-11-13.txt',
  '/media/deserto-bg/part-14-15.txt',
];

export default function CosmicLoopVideo({ variant = 'world' }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';

    const loadVideo = async () => {
      try {
        const pieces = await Promise.all(VIDEO_PARTS.map(async url => {
          const response = await fetch(url, { cache: 'force-cache' });
          if (!response.ok) throw new Error(`Falha ao carregar vídeo de fundo (${response.status})`);
          return (await response.text()).trim();
        }));

        const binary = atob(pieces.join(''));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

        objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
        if (!cancelled) setSrc(objectUrl);
      } catch (error) {
        console.warn('Dinastia E: vídeo cósmico indisponível; mantendo o fundo animado de reserva.', error);
      }
    };

    loadVideo();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  if (!src) return null;

  const gate = variant === 'gate';
  return (
    <div
      className={`cosmic-loop-video ${gate ? 'gate' : ''}`}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        tabIndex={-1}
        disablePictureInPicture
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: '50% 50%',
          opacity: gate ? 0.58 : 0.72,
          filter: 'brightness(.58) saturate(1.30) contrast(1.12) hue-rotate(-4deg)',
          transform: 'scale(1.018)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 34%,rgba(125,73,198,.03),rgba(5,2,15,.16) 52%,rgba(2,0,8,.54) 100%),linear-gradient(180deg,rgba(2,0,8,.22),rgba(8,3,20,.13) 42%,rgba(2,0,8,.50))',
          boxShadow: 'inset 0 0 180px rgba(0,0,0,.48)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(110deg,rgba(60,22,112,.10),transparent 38%,rgba(18,94,128,.055) 64%,rgba(76,27,126,.08))',
          mixBlendMode: 'screen',
          opacity: gate ? 0.34 : 0.48,
        }}
      />
    </div>
  );
}

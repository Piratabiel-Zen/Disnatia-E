import { useEffect, useRef, useState } from 'react';

export default function CosmicLoopVideo({ variant = 'world' }) {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const gate = variant === 'gate';

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const ensurePlayback = () => {
      video.muted = true;
      const attempt = video.play();
      if (attempt?.catch) attempt.catch(() => {});
    };
    const onVisible = () => { if (!document.hidden) ensurePlayback(); };

    ensurePlayback();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pointerdown', ensurePlayback, { once: true, passive: true });
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pointerdown', ensurePlayback);
    };
  }, []);

  return (
    <div
      className={`cosmic-loop-video ${gate ? 'gate' : ''}`}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2,
        overflow: 'hidden',
        pointerEvents: 'none',
        background: '#030109',
      }}
    >
      <video
        ref={videoRef}
        src="/media/deserto-bg.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        tabIndex={-1}
        disablePictureInPicture
        onLoadedData={() => setReady(true)}
        onCanPlay={() => {
          setReady(true);
          const attempt = videoRef.current?.play();
          if (attempt?.catch) attempt.catch(() => {});
        }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: '50% 50%',
          opacity: ready ? (gate ? 0.86 : 0.92) : 0,
          filter: 'brightness(.84) saturate(1.24) contrast(1.08) hue-rotate(-3deg)',
          transform: 'scale(1.018)',
          transition: 'opacity .8s ease',
        }}
      />
      <div
        className="cosmic-video-shade"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 44%,rgba(13,5,30,.04) 8%,rgba(4,1,12,.13) 66%,rgba(1,0,5,.40) 100%),linear-gradient(180deg,rgba(3,1,10,.12),rgba(7,2,18,.08) 48%,rgba(2,0,8,.33))',
          boxShadow: 'inset 0 0 150px rgba(0,0,0,.32)',
        }}
      />
      <div
        className="cosmic-video-tint"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(110deg,rgba(82,31,138,.12),transparent 38%,rgba(27,112,151,.07) 64%,rgba(92,31,145,.10))',
          mixBlendMode: 'screen',
          opacity: gate ? 0.30 : 0.42,
        }}
      />
    </div>
  );
}

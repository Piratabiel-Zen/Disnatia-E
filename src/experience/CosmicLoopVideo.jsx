import { useEffect, useRef, useState } from 'react';

const OPERA_GX_SAFE = typeof navigator !== 'undefined' && (/OPR\//i.test(navigator.userAgent || '') || /OPRGX/i.test(navigator.userAgent || '') || /Opera GX/i.test(navigator.userAgent || '') || /Opera\//i.test(navigator.userAgent || '') || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('safe')));
if (typeof document !== 'undefined' && OPERA_GX_SAFE) document.documentElement.classList.add('opera-gx-safe');

export default function CosmicLoopVideo({ variant = 'world' }) {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const gate = variant === 'gate';

  useEffect(() => {
    if (OPERA_GX_SAFE) return undefined;
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

  if (OPERA_GX_SAFE) {
    return <div className={`cosmic-loop-video opera-gx-video-fallback ${gate ? 'gate' : ''}`} aria-hidden="true" />;
  }

  return (
    <div className={`cosmic-loop-video ${gate ? 'gate' : ''}`} aria-hidden="true" style={{position:'fixed',inset:0,zIndex:2,overflow:'hidden',pointerEvents:'none',background:'#030109'}}>
      <video ref={videoRef} src="/media/deserto-bg.mp4" autoPlay muted loop playsInline preload="metadata" tabIndex={-1} disablePictureInPicture
        onLoadedData={() => setReady(true)}
        onCanPlay={() => { setReady(true); const attempt = videoRef.current?.play(); if (attempt?.catch) attempt.catch(() => {}); }}
        style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'50% 50%',opacity:ready?(gate?0.78:0.84):0,filter:'none',transform:'none',transition:'opacity .35s ease'}} />
      <div className="cosmic-video-shade" style={{position:'absolute',inset:0,background:'radial-gradient(circle at 50% 44%,rgba(13,5,30,.04) 8%,rgba(4,1,12,.13) 66%,rgba(1,0,5,.40) 100%),linear-gradient(180deg,rgba(3,1,10,.12),rgba(7,2,18,.08) 48%,rgba(2,0,8,.33))'}} />
    </div>
  );
}

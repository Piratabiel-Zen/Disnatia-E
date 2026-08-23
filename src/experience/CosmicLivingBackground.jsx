import { useEffect, useRef } from 'react';
import './cosmic-living-background.css';

const rand = (min, max) => min + Math.random() * (max - min);

export default function CosmicLivingBackground({ variant = 'world' }) {
  const canvasRef = useRef(null);
  const pointerRef = useRef({ x: .5, y: .48, tx: .5, ty: .48, down: false });
  const ripplesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const compact = window.matchMedia?.('(max-width: 700px)').matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let visible = !document.hidden;
    let stars = [];

    const createStars = () => {
      const count = reduced ? 40 : compact ? 62 : 116;
      stars = Array.from({ length: count }, (_, i) => ({
        x: Math.random(),
        y: Math.random() * .68,
        r: rand(.45, i % 12 === 0 ? 1.7 : 1.15),
        a: rand(.18, .78),
        twinkle: rand(.3, 1.4),
        phase: rand(0, Math.PI * 2),
        violet: Math.random() > .72,
      }));
    };

    const resize = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createStars();
    };

    const addRipple = (x, y, strength = 1) => {
      if (reduced) return;
      ripplesRef.current.push({ x, y, born: performance.now(), strength });
      if (ripplesRef.current.length > 7) ripplesRef.current.shift();
    };

    const onPointerMove = (e) => {
      const p = pointerRef.current;
      p.tx = Math.max(0, Math.min(1, e.clientX / Math.max(1, width)));
      p.ty = Math.max(0, Math.min(1, e.clientY / Math.max(1, height)));
      if (variant !== 'gate' && e.clientY > height * .46 && Math.random() > .78) addRipple(e.clientX, e.clientY, .45);
    };
    const onPointerDown = (e) => {
      pointerRef.current.down = true;
      if (variant !== 'gate') addRipple(e.clientX, e.clientY, 1.25);
    };
    const onPointerUp = () => { pointerRef.current.down = false; };
    const onVisibility = () => { visible = !document.hidden; if (visible && !raf) raf = requestAnimationFrame(draw); };

    const drawNebula = (time, p) => {
      const horizon = height * .56;
      const drift = reduced ? 0 : Math.sin(time * .000055) * width * .035;
      const px = (p.x - .5) * width * .035;
      const py = (p.y - .5) * height * .024;

      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#020109');
      sky.addColorStop(.42, '#080319');
      sky.addColorStop(.58, '#050212');
      sky.addColorStop(1, '#010105');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      const orb = (x, y, r, stops) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        stops.forEach(([at, color]) => g.addColorStop(at, color));
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      };

      orb(width * .18 + drift + px, height * .24 + py, width * .38, [[0,'rgba(75,33,148,.16)'],[.38,'rgba(40,15,98,.11)'],[1,'rgba(0,0,0,0)']]);
      orb(width * .72 - drift * .65 - px * .35, height * .21 - py, width * .34, [[0,'rgba(33,109,160,.11)'],[.45,'rgba(35,40,112,.08)'],[1,'rgba(0,0,0,0)']]);
      orb(width * .54 + drift * .22, height * .47, width * .28, [[0,'rgba(164,73,235,.09)'],[.5,'rgba(75,27,126,.055)'],[1,'rgba(0,0,0,0)']]);

      const horizonGlow = ctx.createLinearGradient(0, horizon - 70, 0, horizon + 100);
      horizonGlow.addColorStop(0, 'rgba(99,66,180,0)');
      horizonGlow.addColorStop(.48, 'rgba(118,85,210,.12)');
      horizonGlow.addColorStop(.52, 'rgba(54,205,255,.065)');
      horizonGlow.addColorStop(1, 'rgba(25,15,52,0)');
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, horizon - 80, width, 190);

      return horizon;
    };

    const drawStars = (time, horizon, p) => {
      for (const s of stars) {
        const x = s.x * width + (p.x - .5) * (8 + s.r * 7);
        const y = s.y * height + (p.y - .5) * (4 + s.r * 4);
        const pulse = reduced ? 1 : .68 + Math.sin(time * .001 * s.twinkle + s.phase) * .24;
        ctx.beginPath();
        ctx.fillStyle = s.violet ? `rgba(193,158,255,${s.a * pulse})` : `rgba(226,237,255,${s.a * pulse})`;
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();

        if (y < horizon - 8 && s.r > .75) {
          const depth = (horizon - y) / Math.max(1, horizon);
          const reflectionY = horizon + (horizon - y) * .52;
          const wave = reduced ? 0 : Math.sin(time * .0012 + s.x * 22) * (2.5 + depth * 4);
          const cursorWave = Math.exp(-Math.abs(s.x - p.x) * 8) * (p.y > .45 ? (p.x - .5) * 5 : 0);
          ctx.beginPath();
          ctx.fillStyle = s.violet ? `rgba(166,124,245,${s.a * .11})` : `rgba(160,202,235,${s.a * .08})`;
          ctx.ellipse(x + wave + cursorWave, reflectionY, Math.max(1.2, s.r * 1.45), Math.max(.4, s.r * .35), 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const drawWater = (time, horizon, p) => {
      if (variant === 'gate') return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, horizon, width, height - horizon);
      ctx.clip();

      const lines = compact ? 11 : 18;
      for (let i = 0; i < lines; i++) {
        const y = horizon + 20 + (i / lines) * (height - horizon);
        const alpha = .018 + (i / lines) * .02;
        const offset = reduced ? 0 : Math.sin(time * .00065 + i * .72) * (10 + i * .55) + (p.x - .5) * i * .7;
        ctx.strokeStyle = `rgba(116,93,202,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-40 + offset, y);
        ctx.bezierCurveTo(width * .28, y - 3, width * .68, y + 4, width + 40 + offset, y);
        ctx.stroke();
      }

      const now = performance.now();
      ripplesRef.current = ripplesRef.current.filter(r => now - r.born < 1850);
      for (const r of ripplesRef.current) {
        const age = (now - r.born) / 1850;
        const radius = 10 + age * 140 * r.strength;
        const a = (1 - age) * .16 * r.strength;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(143,112,235,${a})`;
        ctx.lineWidth = Math.max(.6, 1.5 - age);
        ctx.ellipse(r.x, r.y, radius * 1.8, radius * .36, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    };

    function draw(time) {
      raf = 0;
      if (!visible) return;
      if (time - last < (reduced ? 120 : 31)) { raf = requestAnimationFrame(draw); return; }
      last = time;
      const p = pointerRef.current;
      p.x += (p.tx - p.x) * .045;
      p.y += (p.ty - p.y) * .045;
      const horizon = drawNebula(time, p);
      drawStars(time, horizon, p);
      drawWater(time, horizon, p);
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [variant]);

  return (
    <div className={`cosmic-living-bg ${variant === 'gate' ? 'gate' : ''}`} aria-hidden="true">
      <canvas ref={canvasRef}/>
      <div className="cosmic-living-vignette"/>
      {variant !== 'gate' && <>
        <div className="cosmic-side-rail cosmic-side-rail-left"><i/><i/><i/></div>
        <div className="cosmic-side-rail cosmic-side-rail-right"><i/><i/><i/></div>
      </>}
    </div>
  );
}

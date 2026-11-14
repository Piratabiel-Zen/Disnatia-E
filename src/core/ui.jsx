import { useEffect, useState } from "react";
export function LevelUpScreen({ data, onClose }) {
  const [phase, setPhase] = useState('burst');
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 400);
    const t2 = setTimeout(() => setPhase('fade'), 4000);
    const t3 = setTimeout(() => onClose(), 4600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  const color = data.color || '#A855F7';
  const particles = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * Math.PI * 2;
    const dist = 80 + Math.random() * 120;
    return { px: `${Math.cos(angle) * dist}px`, py: `${Math.sin(angle) * dist}px`, delay: Math.random() * 0.6 };
  });
  return (
    <div style={{ position:'fixed',inset:0,zIndex:9998,background:phase==='fade'?'rgba(0,0,0,0)':'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.6s',pointerEvents:phase==='fade'?'none':'auto' }} onClick={onClose}>
      <div style={{ position:'relative',textAlign:'center' }}>
        {particles.map((p,i)=>(
          <div key={i} style={{ position:'absolute',top:'50%',left:'50%',width:6,height:6,borderRadius:'50%',background:color,boxShadow:`0 0 6px ${color}`,'--px':p.px,'--py':p.py,animation:`particleFly 1.2s ease-out ${p.delay}s forwards` }}/>
        ))}
        <div style={{ animation:'levelUpBurst 0.6s cubic-bezier(0.2,0.8,0.2,1) forwards',opacity:phase==='fade'?0:1,transition:'opacity 0.6s' }}>
          <div style={{ fontSize:14,letterSpacing:'0.5em',color:`${color}AA`,fontFamily:'Cinzel,serif',marginBottom:16,textTransform:'uppercase' }}>Ascensão Cósmica</div>
          <div style={{ fontFamily:'Cinzel Decorative,serif',fontSize:36,fontWeight:900,color,textShadow:`0 0 40px ${color}, 0 0 80px ${color}66`,marginBottom:12,lineHeight:1.2 }}>{data.nome}</div>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:16,marginBottom:20 }}>
            <div style={{ width:60,height:1,background:`linear-gradient(90deg,transparent,${color})` }}/>
            <div style={{ fontFamily:'Cinzel,serif',fontSize:22,color:'#E8D8C0',letterSpacing:'0.1em' }}>Nível {data.nivel}</div>
            <div style={{ width:60,height:1,background:`linear-gradient(90deg,${color},transparent)` }}/>
          </div>
          <div style={{ fontSize:13,color:'rgba(255,255,255,0.4)',fontFamily:'Cinzel,serif',letterSpacing:'0.2em' }}>
            ✦ {data.nivel<=3?'Aprendiz Cósmico':data.nivel<=6?'Portador do Destino':data.nivel<=9?'Arauto do Fim':data.nivel<=14?'Guardião Estelar':data.nivel<=19?'Ascendente':data.nivel<=24?'Transcendente':data.nivel<=29?'Arauto Supremo':'Lenda Cósmica'} ✦
          </div>
        </div>
      </div>
    </div>
  );
}
export function hpColor(hp, maxHp) {
  if (hp <= 0) return '#555555'; // Cinza (Morto)
  const pct = hp / Math.max(1, maxHp);
  if (pct > 0.6) return '#4ADE80'; // Verde (>60%)
  if (pct > 0.3) return '#E8A020'; // Amarelo (30% - 60%)
  return '#E8193C'; // Vermelho (<30%)
}
// ─── ⚔️ MODO COMBATE ─────────────────────────────────────────────────────────

export function RestrictedAccess({ title, text }) {
  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'80px 24px',textAlign:'center'}}>
      <div style={{fontSize:48,marginBottom:16,opacity:0.6}}>🔒</div>
      <h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:24,color:'#E8193C',fontWeight:700,margin:0,textShadow:'0 0 20px rgba(232,25,60,0.4)'}}>{title}</h2>
      <div style={{fontSize:14,color:'#9A8A7A',marginTop:12,fontFamily:'Cinzel,serif',letterSpacing:'0.05em'}}>{text}</div>
      <div style={{fontSize:12,color:'#5A4A5A',marginTop:8}}>Ative o Modo Mestre no topo da tela usando a senha para acessar.</div>
    </div>
  );
}


export function btnStyle(color){return{padding:'7px 14px',borderRadius:8,border:`1px solid ${color}55`,background:`${color}18`,color:color.startsWith('rgba')?'#6A5A7A':color,cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:'0.06em',transition:'all 0.2s'}}

import { useEffect, useMemo, useRef, useState } from 'react';
import './physical-dice.css';

const SUPPORTED_SIDES = [4, 6, 8, 10, 12, 20];
const clampSide = value => SUPPORTED_SIDES.includes(Number(value)) ? Number(value) : 20;

const PHI = (1 + Math.sqrt(5)) / 2;
const GEOMETRIES = {
  4: {
    vertices: [[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]],
    faces: [[0,2,1],[0,1,3],[0,3,2],[1,2,3]],
  },
  6: {
    vertices: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
    faces: [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[1,2,6,5],[0,4,7,3]],
  },
  8: {
    vertices: [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],
    faces: [[4,0,2],[4,2,1],[4,1,3],[4,3,0],[5,2,0],[5,1,2],[5,3,1],[5,0,3]],
  },
  10: (() => {
    const vertices = [[0,-1.35,0],[0,1.35,0]];
    for (let i=0;i<5;i+=1) { const a=i*Math.PI*2/5; vertices.push([Math.cos(a),0,Math.sin(a)]); }
    const faces=[];
    for (let i=0;i<5;i+=1) { const a=2+i; const b=2+((i+1)%5); faces.push([0,b,a],[1,a,b]); }
    return {vertices,faces};
  })(),
  20: {
    vertices: [[-1,PHI,0],[1,PHI,0],[-1,-PHI,0],[1,-PHI,0],[0,-1,PHI],[0,1,PHI],[0,-1,-PHI],[0,1,-PHI],[PHI,0,-1],[PHI,0,1],[-PHI,0,-1],[-PHI,0,1]],
    faces: [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]],
  },
};
GEOMETRIES[12] = GEOMETRIES[20];

const seeded = seed => {
  let value = (Number(seed) || 1) >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};

const rotate = (point, rotation) => {
  let [x,y,z]=point;
  let c=Math.cos(rotation.x),s=Math.sin(rotation.x); [y,z]=[y*c-z*s,y*s+z*c];
  c=Math.cos(rotation.y); s=Math.sin(rotation.y); [x,z]=[x*c+z*s,-x*s+z*c];
  c=Math.cos(rotation.z); s=Math.sin(rotation.z); [x,y]=[x*c-y*s,x*s+y*c];
  return [x,y,z];
};

const cross = (a,b,c) => {
  const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];
  const v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
  return [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
};

const colorRgb = color => {
  const hex = String(color || '#C8A8E8').replace('#','').trim();
  const full = hex.length === 3 ? hex.split('').map(char=>char+char).join('') : hex.padEnd(6,'8').slice(0,6);
  return [parseInt(full.slice(0,2),16)||200,parseInt(full.slice(2,4),16)||168,parseInt(full.slice(4,6),16)||232];
};

function makeBodies(values, sides, width, height, rollTs) {
  const random=seeded(Number(rollTs) + sides*997 + values.reduce((sum,value)=>sum+value,0)*37);
  const count=values.length;
  return values.map((value,index)=>({
    value:Math.max(1,Math.min(sides,Number(value)||1)),
    x:(index%2===0 ? width*.16 : width*.84)+(random()-.5)*18,
    y:Math.max(30,Math.min(55,height*.18))+index*5,
    vx:(index%2===0 ? 1 : -1)*(150+random()*95),
    vy:-35-random()*55,
    rotation:{x:random()*6.28,y:random()*6.28,z:random()*6.28},
    spin:{x:(random()>.5?1:-1)*(18+random()*12),y:(random()>.5?1:-1)*(20+random()*13),z:(random()>.5?1:-1)*(14+random()*10)},
    radius:Math.max(28,Math.min(count>3?39:48,width/(count*2.65))),
    bounce:0,
    impact:0,
    trail:[],
    settled:false,
  }));
}

function drawDie(ctx,body,sides,color,rolling,now) {
  const geometry=GEOMETRIES[sides] || GEOMETRIES[20];
  const norm=sides===20 || sides===12 ? 1.42 : sides===4 ? 1.18 : 1;
  const points=geometry.vertices.map(vertex=>rotate(vertex,body.rotation).map(value=>value/norm));
  const projected=points.map(([x,y,z])=>{
    const perspective=1/(1-z*.13);
    return [body.x+x*body.radius*perspective,body.y+y*body.radius*perspective,z];
  });
  const rgb=colorRgb(color);
  const faces=geometry.faces.map((indices,faceIndex)=>{
    const vertices=indices.map(index=>points[index]);
    const normal=cross(vertices[0],vertices[1],vertices[2]);
    const length=Math.hypot(...normal)||1;
    const light=Math.max(0,(normal[0]*-.32+normal[1]*-.5+normal[2]*.8)/length);
    return {indices,faceIndex,depth:vertices.reduce((sum,point)=>sum+point[2],0)/vertices.length,light,normal};
  }).sort((a,b)=>a.depth-b.depth);

  if(body.trail.length>1){
    ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
    for(let index=1;index<body.trail.length;index+=1){
      const previous=body.trail[index-1]; const current=body.trail[index];
      ctx.beginPath(); ctx.moveTo(previous[0],previous[1]); ctx.lineTo(current[0],current[1]);
      ctx.strokeStyle='rgba('+rgb.join(',')+','+(index/body.trail.length*.12)+')'; ctx.lineWidth=Math.max(1,body.radius*.13*index/body.trail.length); ctx.stroke();
    }
    ctx.restore();
  }
  const shadowScale=Math.max(.3,1-Math.max(0,180-body.y)*.0032);
  ctx.save();
  ctx.translate(body.x,Math.min(body.y+body.radius*.78,ctx.canvas.height/(window.devicePixelRatio||1)*.77));
  ctx.scale(shadowScale,1);
  const shadow=ctx.createRadialGradient(0,0,2,0,0,body.radius*.95);
  shadow.addColorStop(0,'rgba(0,0,0,.62)'); shadow.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=shadow; ctx.beginPath(); ctx.ellipse(0,0,body.radius,body.radius*.25,0,0,Math.PI*2); ctx.fill(); ctx.restore();

  let labelFace=null;
  faces.forEach(face=>{
    const polygon=face.indices.map(index=>projected[index]);
    ctx.beginPath(); ctx.moveTo(polygon[0][0],polygon[0][1]);
    for(let i=1;i<polygon.length;i+=1) ctx.lineTo(polygon[i][0],polygon[i][1]);
    ctx.closePath();
    const shade=.2+face.light*.72;
    ctx.fillStyle='rgb('+Math.round(rgb[0]*shade)+','+Math.round(rgb[1]*shade)+','+Math.round(rgb[2]*shade)+')';
    ctx.fill();
    ctx.strokeStyle='rgba(244,231,255,'+(.18+face.light*.5)+')';
    ctx.lineWidth=1.15; ctx.stroke();
    if(!labelFace || face.depth>labelFace.depth) labelFace={...face,polygon};
  });

  if(labelFace){
    const center=labelFace.polygon.reduce((acc,point)=>[acc[0]+point[0]/labelFace.polygon.length,acc[1]+point[1]/labelFace.polygon.length],[0,0]);
    const shown=rolling ? ((body.value+labelFace.faceIndex+Math.floor(now/58))%sides)+1 : body.value;
    ctx.save(); ctx.translate(center[0],center[1]);
    ctx.fillStyle='#fff8ff'; ctx.shadowColor=color; ctx.shadowBlur=8;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='900 '+Math.max(12,body.radius*.47)+'px Cinzel, Georgia, serif';
    ctx.fillText(String(shown),0,0); ctx.shadowBlur=0;
    ctx.font='700 '+Math.max(6,body.radius*.14)+'px Cinzel, Georgia, serif'; ctx.fillStyle='rgba(255,255,255,.72)';
    ctx.fillText('D'+sides,0,body.radius*.35); ctx.restore();
  }
  if(body.impact>0){
    ctx.save(); ctx.globalAlpha=body.impact*.72; ctx.strokeStyle=color; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.ellipse(body.x,body.y+body.radius*.8,body.radius*(1.15+(1-body.impact)*1.8),body.radius*.2*(1.15+(1-body.impact)),0,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
}

function DiceCanvas({values,sides,rollTs,color,onSettled,onPhase}){
  const canvasRef=useRef(null);
  const callbackRef=useRef(onSettled);
  useEffect(()=>{callbackRef.current=onSettled;},[onSettled]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas || !rollTs) return undefined;
    const context=canvas.getContext('2d',{alpha:true,desynchronized:true});
    if(!context) { onPhase('settled'); callbackRef.current?.(); return undefined; }
    let frame=0; let last=performance.now(); let elapsed=0; let bodies=[]; let disposed=false;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const resize=()=>{
      const rect=canvas.getBoundingClientRect();
      const ratio=Math.min(window.devicePixelRatio||1,1.5);
      canvas.width=Math.max(1,Math.round(rect.width*ratio)); canvas.height=Math.max(1,Math.round(rect.height*ratio));
      context.setTransform(ratio,0,0,ratio,0,0);
      bodies=makeBodies(values,sides,rect.width,rect.height,rollTs);
      if(reduced) bodies.forEach((body,index)=>{body.y=rect.height*.68; body.x=rect.width*.5+(index-(bodies.length-1)/2)*Math.min(86,rect.width/(bodies.length+1)); body.settled=true;});
    };
    resize(); onPhase(reduced?'settled':'rolling');
    if(reduced){ context.clearRect(0,0,canvas.width,canvas.height); bodies.forEach(body=>drawDie(context,body,sides,color,false,performance.now())); callbackRef.current?.(); return undefined; }
    const tick=now=>{
      if(disposed) return;
      const ratio=Math.min(window.devicePixelRatio||1,1.5); const width=canvas.width/ratio; const height=canvas.height/ratio;
      const dt=Math.min(.032,Math.max(.008,(now-last)/1000)); last=now; elapsed+=dt;
      context.clearRect(0,0,width,height);
      let moving=false;
      bodies.forEach(body=>{
        if(!body.settled){
          body.trail.push([body.x,body.y]); if(body.trail.length>5) body.trail.shift();
          body.vy+=650*dt; body.x+=body.vx*dt; body.y+=body.vy*dt; body.impact=Math.max(0,body.impact-dt*2.6);
          body.rotation.x+=body.spin.x*dt; body.rotation.y+=body.spin.y*dt; body.rotation.z+=body.spin.z*dt;
          const floor=height*.68;
          if(body.x<body.radius*.72 || body.x>width-body.radius*.72){ body.x=Math.max(body.radius*.72,Math.min(width-body.radius*.72,body.x)); body.vx*=-.68; body.spin.y*=-.88; body.spin.z*=-.82; }
          if(body.y>=floor){
            body.y=floor; body.bounce+=1; body.impact=1; body.vy=-Math.abs(body.vy)*(body.bounce===1?.56:body.bounce===2?.43:.3); body.vx*=.72;
            body.spin.x*=.72; body.spin.y*=.72; body.spin.z*=.7;
            if((body.bounce>4 || Math.abs(body.vy)<34) && elapsed>1.65){ body.settled=true; body.vy=0; body.vx=0; body.spin={x:0,y:0,z:0}; body.trail=[]; }
          }
          moving=moving||!body.settled;
        }
        drawDie(context,body,sides,color,moving,now);
      });
      if((moving || elapsed<1.85) && elapsed<2.65) frame=requestAnimationFrame(tick);
      else { context.clearRect(0,0,width,height); bodies.forEach(body=>{body.settled=true; body.trail=[]; drawDie(context,body,sides,color,false,now);}); onPhase('settled'); callbackRef.current?.(); }
    };
    frame=requestAnimationFrame(tick);
    return()=>{disposed=true; cancelAnimationFrame(frame);};
  },[rollTs,sides,values.join(','),color,onPhase]);

  return <canvas ref={canvasRef} className="physical-dice-canvas" aria-hidden="true"/>;
}

export default function PhysicalDiceTray({sides=20,finalValue=1,finalValues,rollTs=0,color='#C8A8E8',total,bonus=0,onSettled}){
  const [phase,setPhase]=useState('idle');
  const values=useMemo(()=>{
    const source=Array.isArray(finalValues)&&finalValues.length?finalValues:[finalValue];
    return source.slice(0,5).map(value=>Number(value)||1);
  },[finalValues,finalValue]);
  const safeSides=clampSide(sides);
  const diceTotal=values.reduce((sum,value)=>sum+Number(value||0),0);
  const hasTotal=Number.isFinite(Number(total)); const numericBonus=Number(bonus||0);
  const changePhase=useMemo(()=>next=>setPhase(next),[]);
  return <div className={'physical-dice-tray phase-'+phase} style={{'--dice-accent':color}}>
    <div className="physical-dice-space">
      <div className="physical-dice-stars"/>
      <DiceCanvas values={values} sides={safeSides} rollTs={rollTs} color={color} onSettled={onSettled} onPhase={changePhase}/>
      <span className="physical-dice-a11y" role="img" aria-label={values.map(value=>'D'+safeSides+' com resultado '+value).join(', ')}/>
    </div>
    <div className="physical-dice-caption"><span>{values.length>1?values.length+'D'+safeSides:'D'+safeSides}</span><i/><small>{phase==='rolling'?'em movimento':phase==='settled'&&hasTotal?'total '+Number(total)+(numericBonus?' ('+diceTotal+' '+(numericBonus>=0?'+':'−')+' '+Math.abs(numericBonus)+')':''):phase==='settled'?'repouso alcançado':'pronto para rolar'}</small></div>
  </div>;
}

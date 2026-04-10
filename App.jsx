// 1. Atualize a estrutura inicial do inimigo para usar um array em 'habilidades'
const newEnemy=id=>({id,nome:'',tipo:'',hp:10,vigos:10,alcance:'',forca:0,agilidade:0,durabilidade:0,inteligencia:0,percepcao:0,foto:'',habilidades:[],notas:''});

// 2. Substitua o componente EnemyCard inteiro:
function EnemyCard({enemy,onChange,onDelete}){
  const f=(k,v)=>onChange({...enemy,[k]:v});

  // Garantir compatibilidade caso haja alguma ficha antiga salva com 'habilidades' em formato de texto
  const habilidadesList = Array.isArray(enemy.habilidades)
    ? enemy.habilidades
    : (enemy.habilidades ? [{ id: Date.now(), name: 'Habilidade Antiga', desc: enemy.habilidades, dano: '', cost: '', cooldown: '' }] : []);

  const addHabilidade = () => {
    f('habilidades', [...habilidadesList, { id: Date.now(), name: '', desc: '', dano: '', cost: '', cooldown: '' }]);
  };

  const updateHabilidade = (id, key, value) => {
    f('habilidades', habilidadesList.map(h => h.id === id ? { ...h, [key]: value } : h));
  };

  const removeHabilidade = (id) => {
    f('habilidades', habilidadesList.filter(h => h.id !== id));
  };

  return(
    <div style={{border:`1px solid ${ENEMY_COLOR}44`,borderRadius:14,overflow:'hidden',background:'rgba(12,6,6,0.95)',marginBottom:18,boxShadow:`0 4px 24px ${ENEMY_GLOW}`}}>
      <div style={{height:3,background:`linear-gradient(90deg,${ENEMY_COLOR},transparent)`}}/>
      <div style={{padding:'16px 18px'}}>
        
        {/* Nome + Tipo */}
        <div style={{display:'flex',gap:10,alignItems:'flex-end',marginBottom:16,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:130}}>
            <label style={{fontSize:10,letterSpacing:'0.3em',color:'#7A4040',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nome do Inimigo</label>
            <input value={enemy.nome} onChange={e=>f('nome',e.target.value)} placeholder="Nome do inimigo..." style={{width:'100%'}}/>
          </div>
          <div style={{flex:1,minWidth:110}}>
            <label style={{fontSize:10,letterSpacing:'0.3em',color:'#7A4040',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Tipo / Origem</label>
            <input value={enemy.tipo} onChange={e=>f('tipo',e.target.value)} placeholder="Ex: Humano, Entidade..." style={{width:'100%'}}/>
          </div>
          <button onClick={onDelete} style={{background:'rgba(232,25,60,0.1)',border:'1px solid rgba(232,25,60,0.3)',color:'#E8193C',borderRadius:6,cursor:'pointer',padding:'6px 11px',fontSize:12}}>✕</button>
        </div>

        {/* HP + Vigos + Alcance */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:9,marginBottom:16}}>
          <div style={{background:'rgba(232,25,60,0.09)',border:'1px solid rgba(232,25,60,0.25)',borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:'#E8193C',fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Pontos de Vida</div>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <button onClick={()=>f('hp',Math.max(0,enemy.hp-1))} style={{width:26,height:26,borderRadius:5,border:'1px solid rgba(232,25,60,0.3)',background:'rgba(232,25,60,0.1)',color:'#E8193C',cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}>−</button>
              <span style={{fontFamily:'Cinzel,serif',fontSize:22,fontWeight:700,color:'#E8193C',minWidth:30,textAlign:'center'}}>{enemy.hp}</span>
              <button onClick={()=>f('hp',Math.min(99,enemy.hp+1))} style={{width:26,height:26,borderRadius:5,border:'1px solid rgba(232,25,60,0.3)',background:'rgba(232,25,60,0.1)',color:'#E8193C',cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}>+</button>
            </div>
            <div style={{marginTop:7,height:3,background:'rgba(255,255,255,0.06)',borderRadius:2}}><div style={{height:'100%',width:`${Math.min(100,(enemy.hp/50)*100)}%`,background:'#E8193C',borderRadius:2,transition:'width 0.3s'}}/></div>
          </div>
          <div style={{background:`${ENEMY_COLOR}09`,border:`1px solid ${ENEMY_COLOR}28`,borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:ENEMY_COLOR,fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Vigor Cósmico</div>
            <VigosDots value={enemy.vigos} max={10} color={ENEMY_COLOR} onChange={v=>f('vigos',v)}/>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.18)',marginTop:5}}>10 pontos totais</div>
          </div>
          <div style={{background:`${ENEMY_COLOR}07`,border:`1px solid ${ENEMY_COLOR}22`,borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:ENEMY_COLOR,fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Alcance</div>
            <input value={enemy.alcance} onChange={e=>f('alcance',e.target.value)} placeholder="Ex: 2m, 10m..." style={{width:'100%'}}/>
          </div>
        </div>

        {/* Foto + Atributos */}
        <div style={{marginBottom:15,display:'flex',gap:16,alignItems:'flex-start'}}>
          <PhotoUpload foto={enemy.foto||''} color={ENEMY_COLOR} onChange={v=>f('foto',v)}/>
          <div style={{flex:1}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:'#7A4040',fontFamily:'Cinzel,serif',marginBottom:9,textTransform:'uppercase'}}>Atributos</div>
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {ATTRS.map(a=>(<div key={a.key} style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:11,fontFamily:'Cinzel,serif',color:a.color,minWidth:92,letterSpacing:'0.03em'}}>{a.label}</span><AttrDots value={enemy[a.key]} color={a.color} onChange={v=>f(a.key,v)}/><span style={{fontSize:11,color:'rgba(255,255,255,0.22)',minWidth:14,textAlign:'right'}}>{enemy[a.key]}</span></div>))}
            </div>
          </div>
        </div>

        {/* NOVA ÁREA DE HABILIDADES & ATAQUES */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,letterSpacing:'0.3em',color:'#7A4040',fontFamily:'Cinzel,serif',marginBottom:8,textTransform:'uppercase'}}>Habilidades & Ataques</div>
          
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:10}}>
            {habilidadesList.map((hab) => (
              <div key={hab.id} style={{background:`${ENEMY_COLOR}05`,border:`1px solid ${ENEMY_COLOR}22`,borderRadius:8,padding:'10px 12px',display:'flex',gap:10,alignItems:'flex-start'}}>
                <div style={{flex:1, display:'flex', flexDirection:'column', gap:6}}>
                  <div style={{display:'flex', gap:6}}>
                    <input value={hab.name} onChange={e=>updateHabilidade(hab.id, 'name', e.target.value)} placeholder="Nome da Habilidade..." style={{flex:1, fontFamily:'Cinzel,serif', fontSize:13, color:'#C8B8A0', fontWeight:600}}/>
                    <input value={hab.dano} onChange={e=>updateHabilidade(hab.id, 'dano', e.target.value)} placeholder="Dano (Ex: 2d6)" style={{width:105, fontSize:13, color:'#F09090'}}/>
                  </div>
                  <textarea value={hab.desc} onChange={e=>updateHabilidade(hab.id, 'desc', e.target.value)} placeholder="Descrição do ataque e efeitos..." rows={2} style={{width:'100%', resize:'vertical', fontSize:13, lineHeight:1.65, color:'#9A8A7A'}}/>
                </div>
                <div style={{flexShrink:0, display:'flex', flexDirection:'column', gap:6, width:95, textAlign:'right'}}>
                  <input value={hab.cost} onChange={e=>updateHabilidade(hab.id, 'cost', e.target.value)} placeholder="Custo VC" style={{width:'100%', fontSize:11, color:`${ENEMY_COLOR}BB`, fontFamily:'Cinzel,serif', textAlign:'right'}}/>
                  <input value={hab.cooldown} onChange={e=>updateHabilidade(hab.id, 'cooldown', e.target.value)} placeholder="Tempo/Recarga" style={{width:'100%', fontSize:10, color:'rgba(255,255,255,0.4)', textAlign:'right'}}/>
                  <button onClick={()=>removeHabilidade(hab.id)} style={{background:'transparent', border:'none', color:'#E8193C', cursor:'pointer', fontSize:10, textAlign:'right', marginTop:'auto', padding:0, textDecoration:'underline'}}>Remover</button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addHabilidade} style={{width:'100%', padding:'8px', borderRadius:8, border:`1px dashed ${ENEMY_COLOR}33`, background:'rgba(255,255,255,0.01)', color:ENEMY_COLOR, cursor:'pointer', fontFamily:'Cinzel,serif', fontSize:11, letterSpacing:'0.05em', transition:'all 0.2s'}}>+ Adicionar Habilidade</button>
        </div>

        {/* Notas */}
        <div>
          <div style={{fontSize:10,letterSpacing:'0.3em',color:'#7A4040',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Notas do Mestre</div>
          <textarea value={enemy.notas||''} onChange={e=>f('notas',e.target.value)} placeholder="Motivações, fraquezas, itens dropados, comportamento narrativo..." rows={3} style={{width:'100%',resize:'vertical'}}/>
        </div>
      </div>
    </div>
  );
}

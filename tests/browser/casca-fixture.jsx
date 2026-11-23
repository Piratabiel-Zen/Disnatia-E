// A casca do grimório: barra do topo, fita de navegação e página inicial.
// Reproduz as classes reais que o ExperienceKit e a sessão desenham.
import { createRoot } from 'react-dom/client';
import '../../src/experience/game-experience-3.css';
import '../../src/adventure/adventure.css';
import '../../src/features/oneshot/mortalha-casca.css';

document.documentElement.dataset.temaMesa='mortalha';
document.documentElement.dataset.quality='cinematic';

const GRUPOS=[
  {id:'session',label:'A noite',items:[{id:'fichas',label:'Fichas',icon:'📋'},{id:'mapabatalha',label:'Mapa',icon:'☗'}]},
  {id:'mesa',label:'Mesa',items:[{id:'regras',label:'Regras e Competências',icon:'§'},
    {id:'investigacao',label:'Mural de Documentos',icon:'🧵'},{id:'aparicoes',label:'Aparições',icon:'☾'}]},
];

createRoot(document.getElementById('root')).render(
  <div className="adventure-shell" style={{minHeight:'100vh',background:'#0C0908',position:'relative'}}>
    <header className="immersive-topbar" style={{position:'fixed',top:0,left:0,right:0,height:64,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 18px',zIndex:310}}>
      <div className="brand-line"><b>Relatos do Macabro</b><small>Terra · Investigação · Oculto</small></div>
      <div className="top-actions" style={{display:'flex',gap:8}}>
        {['Tempo real','Imersivo','Senha da mesa','Senha de mestre'].map(t=>(
          <button key={t} style={{padding:'7px 13px',fontSize:10}}>{t}</button>))}
      </div>
    </header>

    <aside className="grim-nav">
      <button className="grim-brand"><b>Relatos do Macabro</b></button>
      <div className="grim-groups">
        {GRUPOS.map(g=>(<div className="grim-group" key={g.id}>
          <div className="grim-group-title"><span>◆</span><b>{g.label}</b></div>
          {g.items.map(i=>(
            <button key={i.id} className={'grim-link'+(i.id==='fichas'?' active':'')}>
              <span className="grim-icon">{i.icon}</span><span className="grim-label">{i.label}</span>
            </button>))}
        </div>))}
      </div>
      <button className="grim-switch-table"><span>⇄</span><span className="grim-label">Trocar de mesa</span></button>
      <div className="grim-player-mini"><div className="grim-avatar">M</div><div><b>Mestre</b><small>Conduzindo</small></div></div>
    </aside>

    <div className="immersive-stage">
      <main className="immersive-content">
        <div className="page-stage page-stage-session">
          <section className="ad-scene">
            <div className="ad-scene-art" style={{background:'linear-gradient(160deg,#1a2028,#0a0d10)',minHeight:420}}/>
            <div className="ad-scene-copy">
              <span className="ad-eyebrow">Relatos do Macabro</span>
              <h2>Sua próxima <em>aventura</em></h2>
              <p>Nem todo horror é ficção. Alguns são relatos que ninguém deveria ter contado.</p>
            </div>
          </section>
          <div className="ad-action-dock" style={{marginTop:22}}>
            {[['Dirigir a sessão','conduza a noite'],['Diário','o que ficou escrito'],
              ['Dividir em grupos','separe a mesa'],['Aparições','o que vem depois']].map(([t,s])=>(
              <button key={t}><span className="ad-action-icon">◆</span>
                <span><strong>{t}</strong><small>{s}</small></span></button>))}
          </div>
        </div>
      </main>
    </div>
  </div>);

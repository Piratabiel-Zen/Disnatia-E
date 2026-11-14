import AbilityTypeBadge from "../../experience/AbilityTypeBadge";
import CharacterVigorPoints from "../../experience/CharacterVigorPoints";
import {abilityType,replaceCustomAbility} from "../../adventure/abilityPresentation.mjs";
import {ArtifactSheetPanel} from "../../experience/ArtifactPowers";
import { useEffect,useRef,useState } from "react";
import { compressImage } from "../../core/media";
import { pushToast } from "../../core/toast";
import { logAbilityUsed } from "../../core/combatEvents";
import { useExperience } from "../../experience/ExperienceKit";
import { LevelUpScreen,hpColor } from "../../core/ui";
import { SHEET_COLORS,SHEET_GLOWS,STATUS_LIST,CLASSES,ATTRS,getArtifactPowers,ArtifactGlyph,getClassBaseHp,getDurabilityHp,getSheetMaxHp } from "../../data/gameData";
const SHEET_TABS = [
  { id: 'geral',   label: 'Visão Geral',  icon: '🧙' },
  { id: 'combate', label: 'Combate',      icon: '⚔️' },
  { id: 'lore',    label: 'Lore & Itens', icon: '📜' },
];

const SPACING = 16;


function PersonalityTags({ value, color, onChange }) {
  const [input, setInput] = useState('');
  const tags = Array.isArray(value) ? value : [];
  const maxTags = 4;

  const addTag = () => {
    const t = input.trim();
    if (!t || tags.length >= maxTags) return;
    if (tags.some(x => x.toLowerCase() === t.toLowerCase())) { setInput(''); return; }
    onChange([...tags, t]);
    setInput('');
  };
  const removeTag = (i) => onChange(tags.filter((_, idx) => idx !== i));

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, minHeight: 26 }}>
        {tags.length === 0 && (
          <span style={{ fontSize: 12, color: '#4A4050', fontStyle: 'italic', fontFamily: 'Cinzel,serif' }}>
            Nenhum traço definido.
          </span>
        )}
        {tags.map((t, i) => (
          <span key={i} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20,
            border: `1px solid ${color}55`, background: `${color}18`, color,
            fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '0.03em',
          }}>
            {t}
            <button onClick={() => removeTag(i)} style={{ background: 'none', border: 'none', color: `${color}99`, cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1 }}>✕</button>
          </span>
        ))}
      </div>
      {tags.length < maxTags && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            placeholder="Ex: Bravo, Calmo, Sarcástico..."
            maxLength={18}
            style={{ flex: 1, fontSize: 12 }}
          />
          <button onClick={addTag} disabled={!input.trim()} style={{
            padding: '5px 12px', borderRadius: 6, border: `1px solid ${color}55`,
            background: input.trim() ? `${color}18` : 'rgba(255,255,255,0.02)',
            color: input.trim() ? color : '#5A5070',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            fontFamily: 'Cinzel,serif', fontSize: 11, whiteSpace: 'nowrap',
          }}>+ Adicionar</button>
        </div>
      )}
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', marginTop: 6, fontFamily: 'Cinzel,serif' }}>
        {tags.length}/{maxTags} traços
      </div>
    </div>
  );
}
function AttrDots({ value, color, onChange, masterMode, attrPoints = 0, onSpendPoint }) {
  return (
    <div className="attr-dots" style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: 16 }).map((_, i) => {
        const filled = i < value;
        const isPulsingNext = !masterMode && attrPoints > 0 && i === value && value < 16;
        return (
          <button key={i} onClick={() => { if (masterMode) { onChange(i < value ? (i === value - 1 ? 0 : i + 1) : i + 1); } else { if (isPulsingNext && onSpendPoint) { onSpendPoint(i + 1); } } }}
            title={isPulsingNext ? `Gastar 1 Ponto de Atributo (+1)` : filled && masterMode ? 'Reduzir' : ''}
            style={{ width: 15, height: 15, borderRadius: '50%', border: `1.5px solid ${filled ? color : isPulsingNext ? color : 'rgba(255,255,255,0.12)'}`, background: filled ? color + '44' : isPulsingNext ? color + '22' : 'transparent', cursor: (masterMode || isPulsingNext) ? 'pointer' : 'default', transition: 'all 0.15s', padding: 0, flexShrink: 0, animation: isPulsingNext ? 'attrPulse 1.2s ease-in-out infinite' : 'none' }} />
        );
      })}
    </div>
  );
}

function VigosDots({value,max,color,onChange}){return(<div className="vigos-dots" style={{display:'flex',gap:6,flexWrap:'wrap'}}>{Array.from({length:max}).map((_,i)=>(<button key={i} onClick={()=>onChange(i<value?(i===value-1?0:i+1):i+1)} style={{width:22,height:22,borderRadius:'50%',border:`1.5px solid ${i<value?color:'rgba(255,255,255,0.13)'}`,background:i<value?color+'33':'transparent',cursor:'pointer',transition:'all 0.2s',padding:0,boxShadow:i<value?`0 0 5px ${color}55`:'none'}}>{i<value&&<span style={{display:'block',width:8,height:8,borderRadius:'50%',background:color,margin:'auto'}}/>}</button>))}</div>);}

function VigosWithLocked(props){return <CharacterVigorPoints {...props}/>;}

function StatusPanel({ sheet, onChange }) {
  const activeStatus = sheet.status || {};
  const toggle = (s) => {
    const nowActive = !activeStatus[s.id];
    const updated = { ...activeStatus, [s.id]: nowActive };
    onChange({ ...sheet, status: updated });
    if (nowActive) pushToast(`${sheet.nome || 'Personagem'} ficou ${s.label}`, s.icon, s.color);
    else pushToast(`${sheet.nome || 'Personagem'} não está mais ${s.label}`, s.icon, 'rgba(200,184,160,0.8)');
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.3em', color: '#5A5070', fontFamily: 'Cinzel,serif', marginBottom: 9, textTransform: 'uppercase' }}>
        <span style={{ color: '#E8193C' }}>🩸</span> Status Ativos
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {STATUS_LIST.map(s => {
          const active = !!activeStatus[s.id];
          return (
            <button key={s.id} onClick={() => toggle(s)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, border: `1px solid ${active ? s.color + '66' : 'rgba(255,255,255,0.08)'}`, background: active ? s.color + '18' : 'rgba(255,255,255,0.02)', color: active ? s.color : '#5A5070', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Cinzel,serif', fontSize: 11, boxShadow: active ? `0 0 8px ${s.color}33` : 'none' }}>
              <span style={{ fontSize: 12 }}>{s.icon}</span>{s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
// ─── 📊 BÔNUS DE ATRIBUTOS (compacto, somente leitura — usado na aba Combate) ──
function AttrBonusStrip({ sheet }) {
  const attrBonus = val => Math.floor(val / 2);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(82px,1fr))', gap: 7 }}>
      {ATTRS.map(a => {
        const bonus = attrBonus(sheet[a.key] || 0);
        return (
          <div key={a.key} style={{ textAlign: 'center', padding: '8px 6px', borderRadius: 8, background: `${a.color}0D`, border: `1px solid ${a.color}28` }}>
            <div style={{ fontSize: 9, fontFamily: 'Cinzel,serif', color: a.color, letterSpacing: '0.04em', marginBottom: 4, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</div>
            <div style={{ fontSize: 18, fontFamily: 'Cinzel,serif', fontWeight: 700, color: bonus > 0 ? a.color : 'rgba(255,255,255,0.15)' }}>{bonus > 0 ? `+${bonus}` : '—'}</div>
          </div>
        );
      })}
    </div>
  );
}

function resolveEquipIcon(tipo=''){
  const t = tipo.toLowerCase();

  // ── Espadas e lâminas ──────────────────────────────────────────
  if(t.includes('espada')||t.includes('sabre')||t.includes('lâmina')||t.includes('lamina')||
     t.includes('katana')||t.includes('claymore')||t.includes('florete')||t.includes('rapieira')||
     t.includes('espadão')||t.includes('espadao')||t.includes('montante')) return '\u2694\uFE0F';

  // ── Adagas e facas ─────────────────────────────────────────────
  if(t.includes('adaga')||t.includes('faca')||t.includes('punhal')||t.includes('navalha')||
     t.includes('kunai')||t.includes('sai')||t.includes('estilete')||t.includes('bisturi')) return '\uD83D\uDDE1\uFE0F';

  // ── Machados ───────────────────────────────────────────────────
  if(t.includes('machado')||t.includes('alabarda')||t.includes('cimitarra')) return '\uD83E\uFA93';

  // ── Martelos e maças ───────────────────────────────────────────
  if(t.includes('martelo')||t.includes('maça')||t.includes('maca')||t.includes('clava')||
     t.includes('mangual')||t.includes('tacape')) return '\uD83D\uDD28';

  // ── Lanças e hastes ────────────────────────────────────────────
  if(t.includes('lança')||t.includes('lanca')||t.includes('tridente')||t.includes('zagaia')||
     t.includes('glaive')||t.includes('partisana')) return '\uD83E\uDEB1';

  // ── Arcos e bestas ─────────────────────────────────────────────
  if(t.includes('arco')||t.includes('besta')||t.includes('flechas')||t.includes('flecha')||
     t.includes('aljava')) return '\uD83C\uDFF9';

  // ── Armas de fogo ──────────────────────────────────────────────
  if(t.includes('pistola')||t.includes('rifle')||t.includes('fuzil')||t.includes('sniper')||
     t.includes('revólver')||t.includes('revolver')||t.includes('espingarda')||
     t.includes('metralhadora')||t.includes('carabina')) return '\uD83D\uDD2B';

  // ── Cajados e varinhas ─────────────────────────────────────────
  if(t.includes('cajado')||t.includes('varinha')||t.includes('cetro')||t.includes('báculo')||
     t.includes('baculo')||t.includes('bordão')||t.includes('bordao')) return '\uD83E\uDE84';

  // ── Orbes e cristais mágicos ───────────────────────────────────
  if(t.includes('orbe')||t.includes('cristal')||t.includes('gema')||t.includes('pedra arcana')||
     t.includes('esfera mágica')||t.includes('esfera magica')) return '\uD83D\uDD2E';

  // ── Shurikens ─────────────────────────────────────────────────
  if(t.includes('shuriken')||t.includes('estrela ninja')||t.includes('chakram')) return '\u2B50';

  // ── Bombas e explosivos ────────────────────────────────────────
  if(t.includes('bomba')||t.includes('granada')||t.includes('dinamite')||t.includes('explosivo')) return '\uD83D\uDCA3';

  // ── Escudos ────────────────────────────────────────────────────
  if(t.includes('escudo')||t.includes('broquel')||t.includes('aegis')||t.includes('égide')||
     t.includes('egide')) return '\uD83D\uDEE1\uFE0F';

  // ── Armaduras ─────────────────────────────────────────────────
  if(t.includes('armadura')||t.includes('cota')||t.includes('loriga')||t.includes('peitoral')||
     t.includes('colete')||t.includes('gibão')||t.includes('gibao')) return '\uD83E\uDDBA';

  // ── Capacetes e elmos ──────────────────────────────────────────
  if(t.includes('capacete')||t.includes('elmo')||t.includes('chapéu')||t.includes('chapeu')||
     t.includes('coroa')||t.includes('tiara')||t.includes('tricórnio')||t.includes('tricornio')) return '\u26D1\uFE0F';

  // ── Luvas ──────────────────────────────────────────────────────
  if(t.includes('luva')||t.includes('manopla')||t.includes('vambrace')) return '\uD83E\uDDE4';

  // ── Botas e calçados ───────────────────────────────────────────
  if(t.includes('bota')||t.includes('sandália')||t.includes('sandalia')||t.includes('sapato')||
     t.includes('calçado')||t.includes('calcado')||t.includes('greave')) return '\uD83D\uDC62';

  // ── Mantos e roupas ────────────────────────────────────────────
  if(t.includes('manto')||t.includes('capa')||t.includes('robe')||t.includes('túnica')||
     t.includes('tunica')||t.includes('traje')||t.includes('veste')||t.includes('sobretudo')) return '\uD83E\uDDE5';

  // ── Poções e elixires ──────────────────────────────────────────
  if(t.includes('poção')||t.includes('pocao')||t.includes('elixir')||t.includes('antídoto')||
     t.includes('antidoto')||t.includes('frasco')||t.includes('ampola')) return '\uD83E\uDDEA';

  // ── Venenos ────────────────────────────────────────────────────
  if(t.includes('veneno')||t.includes('toxina')||t.includes('peçonha')||t.includes('peconha')) return '\u2620\uFE0F';

  // ── Anéis ──────────────────────────────────────────────────────
  if(t.includes('anel')) return '\uD83D\uDC8D';

  // ── Colares e amuletos ─────────────────────────────────────────
  if(t.includes('colar')||t.includes('amuleto')||t.includes('medalha')||t.includes('pingente')||
     t.includes('corrente de ouro')) return '\uD83D\uDCFF';

  // ── Brincos ────────────────────────────────────────────────────
  if(t.includes('brinco')) return '\uD83D\uDC8E';

  // ── Talismãs e runas ───────────────────────────────────────────
  if(t.includes('talismã')||t.includes('talisma')||t.includes('runa')||t.includes('olho mágico')||
     t.includes('olho magico')||t.includes('sigilo')) return '\uD83E\uDDFF';

  // ── Grimórios e livros ─────────────────────────────────────────
  if(t.includes('grimório')||t.includes('grimorio')||t.includes('tomo')||t.includes('livro arcano')||
     t.includes('spellbook')||t.includes('codex')) return '\uD83D\uDCDA';

  // ── Pergaminhos ────────────────────────────────────────────────
  if(t.includes('pergaminho')||t.includes('rolo')||t.includes('papiro')) return '\uD83D\uDCDC';

  // ── Tochas e lanternas ─────────────────────────────────────────
  if(t.includes('tocha')||t.includes('lanterna')||t.includes('lampião')||t.includes('lampiao')) return '\uD83D\uDD26';

  // ── Velas ──────────────────────────────────────────────────────
  if(t.includes('vela')||t.includes('candelabro')) return '\uD83D\uDD6F\uFE0F';

  // ── Correntes e algemas ────────────────────────────────────────
  if(t.includes('corrente')||t.includes('algema')||t.includes('acorrentado')) return '\u26D3\uFE0F';

  // ── Chicotes ───────────────────────────────────────────────────
  if(t.includes('chicote')||t.includes('açoite')||t.includes('acoite')||t.includes('flagelo')) return '\uD83E\uDEB6';

  // ── Cordas e ganchos ───────────────────────────────────────────
  if(t.includes('corda')||t.includes('lasso')||t.includes('laço')||t.includes('laco')) return '\uD83E\uDEA2';
  if(t.includes('gancho')||t.includes('arpão')||t.includes('arpao')) return '\uD83E\uDE9D';

  // ── Chaves ─────────────────────────────────────────────────────
  if(t.includes('chave')) return '\uD83D\uDDDD\uFE0F';

  // ── Lunetas e instrumentos de observação ───────────────────────
  if(t.includes('luneta')||t.includes('binóculo')||t.includes('binoculo')||
     t.includes('telescópio')||t.includes('telescopio')) return '\uD83D\uDD2D';

  // ── Lupas ──────────────────────────────────────────────────────
  if(t.includes('lupa')||t.includes('monóculo')||t.includes('monoculo')) return '\uD83D\uDD0D';

  // ── Seringas e instrumentos médicos ───────────────────────────
  if(t.includes('seringa')||t.includes('injeção')||t.includes('injecao')) return '\uD83D\uDC89';

  // ── Ferramentas ────────────────────────────────────────────────
  if(t.includes('chave inglesa')||t.includes('ferramenta')||t.includes('alicate')||
     t.includes('engrenagem')) return '\uD83D\uDD27';
  if(t.includes('tesoura')||t.includes('faca de corte')) return '\u2702\uFE0F';

  // ── Instrumentos musicais (bardos) ────────────────────────────
  if(t.includes('alaúde')||t.includes('alaud')||t.includes('flauta')||t.includes('harpa')||
     t.includes('violão')||t.includes('violao')||t.includes('instrumento')||t.includes('lira')) return '\uD83C\uDFB5';

  // ── Moedas e tesouros ──────────────────────────────────────────
  if(t.includes('moeda')||t.includes('ouro')||t.includes('tesouro')||t.includes('bolsa de ouro')||
     t.includes('pepita')) return '\uD83D\uDCB0';

  // ── Bússola e mapa ─────────────────────────────────────────────
  if(t.includes('bússola')||t.includes('bussola')||t.includes('compasso')) return '\uD83E\uDDED';
  if(t.includes('mapa')||t.includes('carta náutica')||t.includes('carta nautica')) return '\uD83D\uDDFA\uFE0F';

  // ── Máscaras ───────────────────────────────────────────────────
  if(t.includes('máscara')||t.includes('mascara')||t.includes('capuz')) return '\uD83C\uDFAD';

  // ── Ossos e itens de necromancia ───────────────────────────────
  if(t.includes('osso')||t.includes('crânio')||t.includes('cranio')||t.includes('caveira')||
     t.includes('fêmur')||t.includes('femur')) return '\uD83D\uDC80';

  // ── Penas e asas ───────────────────────────────────────────────
  if(t.includes('pena')||t.includes('pluma')||t.includes('asa')||t.includes('asas')) return '\uD83E\uDEB6';

  // ── Garras e presas ────────────────────────────────────────────
  if(t.includes('garra')||t.includes('presa')||t.includes('dente')) return '\uD83E\uDDB7';

  // ── Bolsas e mochilas ──────────────────────────────────────────
  if(t.includes('mochila')||t.includes('bolsa')||t.includes('sacola')||t.includes('saco')) return '\uD83C\uDF92';

  // ── Sinos e alarmes ────────────────────────────────────────────
  if(t.includes('sino')||t.includes('campainha')||t.includes('alarme')) return '\uD83D\uDD14';

  // ── Bandeiras e estandartes ────────────────────────────────────
  if(t.includes('bandeira')||t.includes('estandarte')||t.includes('pendão')||t.includes('pendao')) return '\uD83D\uDEA9';

  // ── Âncoras ────────────────────────────────────────────────────
  if(t.includes('âncora')||t.includes('ancora')) return '\u2693';

  // ── Foices ────────────────────────────────────────────────────
  if(t.includes('foice')||t.includes('gadanho')) return '\uD83C\uDF3E';

  // ── Ninjas e furtividade ───────────────────────────────────────
  if(t.includes('fumaça')||t.includes('fumaca')||t.includes('bomba de fumaça')) return '\uD83D\uDCA8';

  // ── Default ───────────────────────────────────────────────────
  return '\uD83D\uDCE6';
}

function CompactEquipSlot({label, color, data, onChange, placeholder, icon}){
  const d={nome:'',dano:'',tipo:placeholder,...(data||{})};
  const equipIconOptions=[['auto','Automático',resolveEquipIcon(d.tipo||placeholder)],['espada','Espada','⚔️'],['escudo','Escudo','🛡️'],['mangual','Mangual','🔨'],['adaga','Adaga','🗡️'],['faca-arremesso','Faca de arremesso','🔪'],['arma','Arma','🔫'],['metralhadora','Metralhadora','🔫'],['escopeta','Escopeta','🔫'],['sniper','Sniper','🎯'],['arco','Arco e flecha','🏹'],['colar','Colar','📿'],['armadura','Armadura','🦺'],['botas','Botas','🥾'],['luvas','Luvas','🧤'],['cajado','Cajado','🪄'],['amuleto','Amuleto','🔮'],['anel','Anel','💍'],['livro','Livro','📖'],['pocao','Poção','🧪'],['outro','Outro','✨']];const dynIcon=(equipIconOptions.find(o=>o[0]===(d.icone||'auto'))||equipIconOptions[0])[2];
  return(
    <div className="equip-slot-card" style={{color,background:`linear-gradient(145deg,${color}0D,rgba(255,255,255,0.018))`,border:`1px solid ${color}28`,boxShadow:'inset 0 1px 0 rgba(255,255,255,0.025)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:9}}>
        <div style={{fontSize:9,letterSpacing:'0.22em',color:`${color}B5`,fontFamily:'Cinzel,serif',textTransform:'uppercase'}}>{label}</div>
        <span style={{fontSize:8,color:'rgba(200,184,160,0.28)',fontFamily:'Cinzel,serif'}}>EQUIPADO</span>
      </div>
      <div className="equip-slot-main">
        <div className="equip-slot-icon" style={{background:`${color}12`,border:`1px solid ${color}24`,fontSize:18}}>{dynIcon}</div>
        <input value={d.nome} onChange={e=>onChange({...d,nome:e.target.value})} placeholder="Nome do item..." style={{fontSize:13,padding:'7px 9px'}}/>
      </div>
      <div className="equip-slot-fields" style={{marginTop:8}}>
        <input value={d.dano} onChange={e=>onChange({...d,dano:e.target.value})} placeholder="Dano / Ex.: 1D6" style={{fontSize:12,padding:'6px 8px',color:'rgba(255,210,110,0.9)'}}/>
        <div style={{display:'flex',gap:7,gridColumn:'1 / -1',minWidth:0}}><input value={d.tipo} onChange={e=>onChange({...d,tipo:e.target.value})} placeholder={placeholder} aria-label={'Tipo de '+label} style={{fontSize:12,padding:'6px 8px',color:'rgba(200,184,160,0.72)',flex:1,minWidth:0}}/><select value={d.icone||'auto'} onChange={e=>onChange({...d,icone:e.target.value})} title='Ícone do equipamento' aria-label={'Ícone de '+label} style={{width:84,flexShrink:0,fontSize:10,padding:'5px 3px'}}>{equipIconOptions.map(([id,nome])=><option key={id} value={id}>{id==='auto'?'Auto':nome}</option>)}</select></div>
      </div>
    </div>
  );
}

function CharSilhouette({color}){
  const head=<ellipse cx="30" cy="11" rx="7" ry="8" stroke={color} strokeWidth="1.2" fill="none"/>;
  const neck=<line x1="30" y1="19" x2="30" y2="25" stroke={color} strokeWidth="1.2"/>;
  const torso=<path d="M17 33 L15 60 Q15 63 19 63 L41 63 Q45 63 45 60 L43 33" stroke={color} strokeWidth="1.2" fill="none"/>;
  const belt=<line x1="16" y1="57" x2="44" y2="57" stroke={color} strokeWidth="1.3" strokeDasharray="3 2"/>;
  const legs=<><path d="M22 63 L19 88 L18 102" stroke={color} strokeWidth="1.2" fill="none"/><path d="M38 63 L41 88 L42 102" stroke={color} strokeWidth="1.2" fill="none"/></>;
  const boots=<><path d="M18 102 Q16 106 13 106 Q11 106 12 104 L14 102 L20 101" stroke={color} strokeWidth="1" fill="none"/><path d="M42 102 Q44 106 47 106 Q49 106 48 104 L46 102 L40 101" stroke={color} strokeWidth="1" fill="none"/></>;
  const shoulders=<path d="M14 32 Q18 26 30 25 Q42 26 46 32" stroke={color} strokeWidth="1.2" fill="none"/>;
  const arms=<><path d="M17 33 L9 49 L11 55" stroke={color} strokeWidth="1.2" fill="none"/><path d="M43 33 L51 49 L49 55" stroke={color} strokeWidth="1.2" fill="none"/></>;
  return <svg width="66" height="116" viewBox="0 0 66 116" fill="none" xmlns="http://www.w3.org/2000/svg" style={{opacity:0.28,flexShrink:0}}>{head}{neck}{shoulders}{torso}{belt}{arms}{legs}{boots}</svg>;
}

function CollapsibleSection({ icon, label, color = '#A855F7', badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: SPACING, border: `1px solid ${open ? color + '33' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, overflow: 'visible', transition: 'border-color 0.2s', flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: open ? `${color}08` : 'rgba(255,255,255,0.02)', border: 'none', borderRadius: open ? '10px 10px 0 0' : 10, cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 15, color }}>{icon}</span>
        <span style={{ fontFamily: 'Cinzel,serif', fontSize: 13, color: '#C8B8A0', fontWeight: 600, flex: 1 }}>{label}</span>
        {badge}
        <span style={{ color: `${color}88`, fontSize: 11, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }}>▶</span>
      </button>
      {open && <div className="sheet-inner-scroll" style={{ padding: '0 14px 14px' }}><div style={{ height: 8 }} />{children}</div>}
    </div>
  );
}

function EquipamentoPanel({sheet, onChange, sheetColor}){
  const f=(slot,val)=>onChange({...sheet,[slot]:val});
  return(
    <div className="equip-panel">
      <div className="equip-hands-grid">
        <CompactEquipSlot label="Mão Esquerda" color={sheetColor} data={sheet.equip_mao_esq} onChange={v=>f('equip_mao_esq',v)} placeholder="Espada / Arma" icon="⚔️"/>
        <CompactEquipSlot label="Mão Direita" color={sheetColor} data={sheet.equip_mao_dir} onChange={v=>f('equip_mao_dir',v)} placeholder="Escudo / Arma" icon="🛡️"/>
      </div>
      <div className="equip-character-guide" style={{background:`linear-gradient(90deg,transparent,${sheetColor}08,transparent)`,borderTop:`1px solid ${sheetColor}12`,borderBottom:`1px solid ${sheetColor}12`}}>
        <CharSilhouette color={sheetColor}/>
        <div style={{minWidth:0}}>
          <div style={{fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.18em',color:`${sheetColor}9A`,textTransform:'uppercase',marginBottom:4}}>Configuração de combate</div>
          <div style={{fontSize:12,color:'rgba(200,184,160,0.42)',lineHeight:1.4}}>Defina separadamente os itens das mãos e a proteção utilizada pelo personagem.</div>
        </div>
      </div>
      <CompactEquipSlot label="Corpo e Proteção" color={sheetColor} data={sheet.equip_corpo} onChange={v=>f('equip_corpo',v)} placeholder="Armadura / Roupa" icon="🛡️"/>
    </div>
  );
}

// ─── 💎 ARTEFATO PANEL (na ficha do personagem) ───────────────────────────────
function ArtefatoFichaPanel(props) { return <ArtifactSheetPanel {...props}/>; }

const newCustomAbility=()=>({id:Date.now()+Math.random(),nome:'',custo:2,cooldown:'—',dano:'',descricao:'',tipoHab:'normal',req:1,aliadoRequerido:'',amplificacao:''});

function CooldownBadge({ abilityId, cooldownText, sheetCooldowns, onUpdate, abilityCost, currentVigos, onSpendVC, abilityName, characterName, actorId, color, abilityType }) {
  const cd = sheetCooldowns?.[abilityId] || 0;
  const isActive = cd > 0;
  const cost = abilityCost || 0;
  const hasCooldown = cooldownText && cooldownText !== '—' && cooldownText !== '';
  const hasEnoughVC = cost === 0 || (currentVigos >= cost);

  const activate = (e) => {
    e.stopPropagation();
    if (!hasEnoughVC) return;
    const parsed = hasCooldown ? (parseInt(String(cooldownText).replace(/\D/g, '')) || 1) : 0;
    // Atualiza Vigor e cooldown em uma única mudança de ficha. Antes, as duas
    // atualizações consecutivas usavam a mesma ficha antiga e a segunda podia
    // apagar o cooldown recém-criado.
    if (onSpendVC) onSpendVC(cost, abilityId, parsed);
    else if (hasCooldown) onUpdate(abilityId, parsed);
    if (abilityName && characterName) {
      logAbilityUsed(characterName, abilityName, cost);
      window.dispatchEvent(new CustomEvent('dinastia:ability-used',{detail:{id:`sheet_ability_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,actorId,actorName:characterName,abilityName,cost,color,abilityType,icon:'✦'}}));
    }
  };

  const decrement = (e) => { e.stopPropagation(); onUpdate(abilityId, Math.max(0, cd - 1)); };

  if (!isActive) {
    if (!hasEnoughVC) {
      return (
        <span style={{
          fontSize: 9, padding: '2px 8px', borderRadius: 4,
          border: '1px solid rgba(232,25,60,0.3)', background: 'rgba(232,25,60,0.07)',
          color: 'rgba(232,25,60,0.75)', fontFamily: 'Cinzel,serif', letterSpacing: '0.05em',
        }}>
          Vigor insuficiente
        </span>
      );
    }
    return (
      <button onClick={activate} title={`Usar — gasta ${cost} VC`} style={{
        fontSize: 9, padding: '2px 7px', borderRadius: 4, cursor: 'pointer',
        border: '1px solid rgba(255,200,0,0.2)', background: 'rgba(255,200,0,0.05)',
        color: 'rgba(255,200,0,0.55)', fontFamily: 'Cinzel,serif', letterSpacing: '0.08em', transition: 'all 0.2s',
      }}>⚡ Usar</button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'linear-gradient(90deg,rgba(232,100,0,0.16),rgba(168,85,247,0.10))', border: '1px solid rgba(232,100,0,0.45)', borderRadius: 8, padding: '6px 9px', animation: 'cooldownIn 0.25s ease', boxShadow:'0 0 12px rgba(232,100,0,.08)' }}>
      <span style={{ fontSize: 11 }}>⏳</span>
      <span style={{ fontSize: 9, color: 'rgba(232,190,150,0.75)', fontFamily:'Cinzel,serif' }}>Faltam</span>
      <span style={{ fontSize: 12, fontFamily: 'Cinzel,serif', color: '#FF8A3D', fontWeight: 900 }}>{cd}</span>
      <span style={{ fontSize: 9, color: 'rgba(232,190,150,0.65)' }}>rodada{cd !== 1 ? 's' : ''}</span>
      <button onClick={decrement} title="Avançar 1 rodada" style={{ background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,.22)', color: '#7EE6A1', cursor: 'pointer', borderRadius: 4, fontSize: 11, padding: '0 5px', lineHeight: 1.5 }}>−1</button>
    </div>
  );
}

function HabilidadesPanel({cls, sheet, customAbilities, masterMode, onSaveCustomAbilities, sheetCooldowns, onUpdateCooldown, currentVigos, onSpendVC, characterName}) {
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState(newCustomAbility());
  const [editingId,setEditingId]=useState(null);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState('');
  const editorRef=useRef(null);
  const resetEditor=()=>{setEditingId(null);setForm(newCustomAbility());setSaveError('');};
  useEffect(()=>{resetEditor();},[sheet?.id]);
  const handleEdit=a=>{if(!masterMode||saving)return;setEditingId(a.id);setForm({...newCustomAbility(),...a,nome:a.nome||a.name||'',descricao:a.descricao||a.desc||'',custo:a.custo??a.cost??0,tipoHab:abilityType(a)});setSaveError('');requestAnimationFrame(()=>{editorRef.current?.scrollIntoView({block:'nearest',behavior:'auto'});editorRef.current?.querySelector('input')?.focus();});};
  const nivel = Number(sheet?.nivel) || 1;
  const classCustom = Array.isArray(customAbilities) ? customAbilities.filter(Boolean) : [];
  const activeCooldownEntries = Object.entries(sheetCooldowns || {})
    .filter(([, turns]) => Number(turns) > 0)
    .map(([id, turns]) => ({ id, turns: Number(turns) }));

  const handleSave=async()=>{
    if(!masterMode||saving||!form.nome.trim())return;
    setSaving(true);setSaveError('');
    try {await onSaveCustomAbilities(replaceCustomAbility(classCustom,form,editingId));resetEditor();}
    catch(error){setSaveError(error.message||'Não foi possível salvar. Tente novamente.');}
    finally{setSaving(false);}
  };
  const handleDelete=async(abilityId)=>{
    if(!masterMode||saving)return;
    setSaving(true);setSaveError('');
    try{await onSaveCustomAbilities(classCustom.filter(a=>String(a.id)!==String(abilityId)));if(String(editingId)===String(abilityId))resetEditor();}
    catch(error){setSaveError(error.message||'Não foi possível excluir. Tente novamente.');}
    finally{setSaving(false);}
  };

  const color=cls.color;
  const tipoLabel={normal:'Normal',especial:'Especial',passiva:'Passiva',combinada:'Combinada'};
  const tipoBadgeColor={normal:'rgba(255,255,255,0.5)',especial:color,passiva:'rgba(168,85,247,0.8)',combinada:'#FFE58A'};

  const abilityRow=(a,isSpecial,isCustom,locked)=>{
    if(!a) return null;
    const danoValue=String(a.dano||a.roll||'');
    const abilityId = String(a.id||a.name||'');
    const type=abilityType(a,isSpecial?'especial':'normal');
    const isPassiva=type==='passiva';
    const isCombined = isCustom && a.tipoHab === 'combinada';
    const cdText = a.cooldown || a.tempo || '—';
    const hasCd = cdText && cdText !== '—' && cdText !== '';
    return(
    <div key={abilityId} style={{ background:isCombined?'radial-gradient(ellipse at 12% 0%,rgba(255,225,125,.19),transparent 62%),linear-gradient(125deg,rgba(64,30,104,.32),rgba(18,12,32,.96))':(isSpecial||isCustom?`${color}09`:'rgba(255,255,255,0.02)'), border:isCombined?'1px solid rgba(255,225,125,.78)':`1px solid ${isSpecial||isCustom?color+'22':'rgba(255,255,255,0.06)'}`, borderRadius:8,padding:'9px 12px',display:'flex',gap:10,alignItems:'flex-start', opacity:locked?0.45:1, position:'relative', transition: 'opacity 0.2s', boxShadow:isCombined?'0 0 10px rgba(255,216,115,.35), inset 0 0 18px rgba(168,85,247,.14)':undefined, animation:isCombined?'bannerGlow 2.2s ease-in-out infinite':undefined }}>
      {(sheetCooldowns?.[abilityId]||0) > 0 && !isPassiva && <div style={{ position:'absolute',inset:0,borderRadius:8,pointerEvents:'none', background:'rgba(232,100,0,0.06)', border:'1px solid rgba(232,100,0,0.25)', zIndex:0 }}/>}
      <div style={{flex:1,position:'relative',zIndex:1}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3,flexWrap:'wrap'}}>
          {(isSpecial||isCustom)&&<span style={{fontSize:10,color}}>✦</span>}
          <span style={{fontFamily:'Cinzel,serif',fontSize:12,color:isCombined?'#FFF0B4':'#C8B8A0',fontWeight:700,textShadow:isCombined?'0 0 10px rgba(255,224,140,.8)':undefined}}>{String(a.name||a.nome||'')}</span>
          {locked&&<span style={{fontSize:9,color:'rgba(255,200,0,0.5)',fontFamily:'Cinzel,serif'}}>🔒 Nv {Number(a.req)||1}+</span>}
          <AbilityTypeBadge ability={a} fallback={isSpecial?'especial':'normal'}/>
          {danoValue&&<span style={{fontSize:10,color:'rgba(255,200,80,0.85)',fontFamily:'Cinzel,serif',letterSpacing:'0.05em',background:'rgba(255,200,80,0.08)',border:'1px solid rgba(255,200,80,0.22)',borderRadius:4,padding:'1px 6px'}}>⚔ {danoValue}</span>}
        </div>
        <div style={{fontSize:13,color:'#7A6A5A',lineHeight:1.65}}>{String(a.desc||a.descricao||'')}</div>
        {isCombined&&<div style={{marginTop:7,padding:'7px 9px',borderRadius:7,border:'1px solid rgba(255,225,125,.34)',background:'rgba(255,220,120,.07)',boxShadow:'0 0 12px rgba(168,85,247,.13)'}}><div style={{fontFamily:'Cinzel,serif',fontSize:9,letterSpacing:'.13em',fontWeight:800,color:'#FFE58A',textShadow:'0 0 8px rgba(255,225,125,.55)'}}>✧ HABILIDADE SUPREMA · COMBINADA</div>{a.aliadoRequerido&&<div style={{fontSize:11,color:'#E3D2FF',marginTop:4}}>Aliado necessário: {a.aliadoRequerido}</div>}{a.amplificacao&&<div style={{fontSize:11,color:'#FFE8AD',marginTop:3}}>Amplificação: {a.amplificacao}</div>}<div style={{fontSize:10,color:'rgba(235,220,255,.72)',marginTop:4}}>O aliado participante consome 1 VC para realizar a combinação.</div></div>}
      </div>
      <div style={{flexShrink:0,textAlign:'right',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,position:'relative',zIndex:1}}>
        <div style={{fontSize:11,color:`${color}BB`,fontFamily:'Cinzel,serif'}}>{Number(a.cost||a.custo||0)} VC</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.18)'}}>⏱ {cdText}</div>
        {a.req&&!isCustom&&<div style={{fontSize:10,color:'rgba(255,255,255,0.16)'}}>Nív {Number(a.req)||1}+</div>}
        {!locked && !isPassiva && onUpdateCooldown && (
  <CooldownBadge
    abilityId={abilityId}
    cooldownText={cdText}
    sheetCooldowns={sheetCooldowns}
    onUpdate={onUpdateCooldown}
    abilityCost={Number(a.cost || a.custo || 0)}
    currentVigos={currentVigos ?? 0}
    onSpendVC={onSpendVC}
    abilityName={String(a.name || a.nome || '')}
    characterName={characterName || ''}
    actorId={sheet?.id}
    color={color}
    abilityType={a.tipoHab || a.tipo || a.type || 'normal'}            
  />
)}
        {isCustom&&masterMode&&<div className="ability-edit-actions"><button type="button" title={'Editar '+(a.nome||a.name)} aria-label={'Editar '+(a.nome||a.name)} disabled={saving} onClick={()=>handleEdit(a)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 16v4h4L20 8l-4-4L4 16Z"/><path d="m13 7 4 4"/></svg></button><button type="button" title={'Excluir '+(a.nome||a.name)} aria-label={'Excluir '+(a.nome||a.name)} disabled={saving} onClick={()=>handleDelete(a.id)}>{'\u2715'}</button></div>}
      </div>
    </div>
    );
  };

  const TipoBtn=({val,label:l})=>(<button onClick={()=>setForm(f=>({...f,tipoHab:val}))} style={{flex:1,padding:'5px 4px',borderRadius:5,border:`1px solid ${form.tipoHab===val?color+'66':'rgba(255,255,255,0.1)'}`,background:form.tipoHab===val?`${color}18`:'rgba(255,255,255,0.02)',color:form.tipoHab===val?color:'#6A5A7A',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.06em',transition:'all 0.15s'}}>{l}</button>);

  return(
    <div className="abilities-panel" style={{marginBottom:14,border:`1px solid ${open?color+'33':'rgba(255,255,255,0.07)'}`,borderRadius:10,overflow:'hidden',transition:'border-color 0.2s',flexShrink:0,minHeight:'max-content'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:'100%',padding:'12px 16px',display:'flex',alignItems:'center',gap:10,background:open?`${color}08`:'rgba(255,255,255,0.02)',border:'none',cursor:'pointer',textAlign:'left'}}>
        <span style={{fontSize:15,color}}>{cls.icon}</span>
        <span style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#C8B8A0',fontWeight:600,flex:1}}>Habilidades — {cls.name}</span>
        <span style={{fontSize:10,color:activeCooldownEntries.length?'#FF9A52':`${color}66`,fontFamily:'Cinzel,serif',fontWeight:activeCooldownEntries.length?700:400}}>
          {activeCooldownEntries.length ? `⏳ ${activeCooldownEntries.length} em recarga` : (classCustom.length>0?`+${classCustom.length} nova${classCustom.length>1?'s':''}`:'')}
        </span>
        <span style={{color:`${color}88`,fontSize:11,transform:open?'rotate(90deg)':'none',transition:'transform 0.3s'}}>▶</span>
      </button>
      {activeCooldownEntries.length > 0 && (
        <div style={{padding:'8px 12px',display:'flex',gap:6,flexWrap:'wrap',background:'rgba(232,100,0,0.055)',borderTop:'1px solid rgba(232,100,0,0.16)',borderBottom:open?'1px solid rgba(232,100,0,0.12)':'none'}}>
          {activeCooldownEntries.map(({id,turns}) => (
            <button key={id} onClick={(e)=>{e.stopPropagation();onUpdateCooldown?.(id,Math.max(0,turns-1));}} title="Clique para reduzir uma rodada" style={{display:'flex',alignItems:'center',gap:5,padding:'4px 7px',borderRadius:6,border:'1px solid rgba(255,138,61,.36)',background:'rgba(255,138,61,.10)',color:'#FFD0AF',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:9}}>
              <span style={{maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{id}</span>
              <strong style={{color:'#FF9A52',fontSize:11}}>{turns}</strong>
              <span>rodada{turns!==1?'s':''}</span>
              <span style={{color:'#7EE6A1'}}>−1</span>
            </button>
          ))}
        </div>
      )}
      {open&&(
        <div className="sheet-inner-scroll" style={{padding:'0 14px 14px'}}>
          <div style={{height:8}}/>
          {cls.id !== 'personalizado' && (
  <>
    <div style={{marginBottom:10}}>
      <AbilityTypeBadge ability={cls.passive} fallback="passiva"/>
      <div style={{background:`${color}0D`,border:`1px solid ${color}28`,borderRadius:8,padding:'9px 12px'}}><div style={{fontFamily:'Cinzel,serif',fontSize:12,color,fontWeight:600,marginBottom:3}}>{cls.passive.name}</div><div style={{fontSize:13,color:'#7A6A5A',lineHeight:1.65}}>{cls.passive.desc}</div></div>
    </div>
    <div style={{marginBottom:10}}>
      <div style={{fontSize:9,letterSpacing:'0.3em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Ataques Normais — 2 VC cada</div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>{cls.normal.map(a=>abilityRow(a,false,false,false))}</div>
    </div>
    <div style={{marginBottom:10}}>
      <div style={{fontSize:9,letterSpacing:'0.3em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Especiais — 3 VC cada</div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>{cls.specials.map(a=>abilityRow(a,true,false,nivel<a.req))}</div>
    </div>
  </>
)}
{cls.id === 'personalizado' && classCustom.length === 0 && !masterMode && (
  <div style={{padding:'18px',borderRadius:10,border:'1px dashed rgba(192,192,192,0.15)',color:'#5A5070',textAlign:'center',fontFamily:'Cinzel,serif',fontSize:12,marginBottom:10}}>
    As habilidades deste personagem serão reveladas pelo Mestre.
  </div>
)}
{classCustom.length>0&&(
  <div style={{marginBottom:10}}>
    <div style={{fontSize:9,letterSpacing:'0.3em',color:`${color}88`,fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Desbloqueadas pelo Mestre</div>
    <div style={{display:'flex',flexDirection:'column',gap:6}}>{classCustom.map(a=>abilityRow(a,false,true,a.req&&nivel<a.req))}</div>
  </div>
)}
{masterMode&&(
            <div ref={editorRef} className="custom-ability-editor" aria-busy={saving} style={{border:`1px solid ${color}30`,borderRadius:10,padding:'14px',background:`${color}05`,marginTop:4}}>
              <div style={{fontSize:9,letterSpacing:'0.35em',color:`${color}AA`,fontFamily:'Cinzel,serif',marginBottom:12,textTransform:'uppercase'}}>{editingId!==null?'Editar Habilidade':'Adicionar Habilidade Nova'} · {cls.name}</div>
              <fieldset disabled={saving} style={{display:'flex',flexDirection:'column',gap:9,border:0,padding:0,margin:0,minWidth:0}}>
                <div><label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Nome da Habilidade</label><input aria-label="Nome da habilidade" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Golpe Cósmico" style={{width:'100%'}}/></div>
                <div><label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.22em'}}>Tipo de Habilidade</label><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><TipoBtn val="normal" label="Normal"/><TipoBtn val="especial" label="Especial"/><TipoBtn val="passiva" label="Passiva"/><TipoBtn val="combinada" label="✧ Combinada"/></div></div>
                {form.tipoHab==='combinada'&&<div style={{padding:10,borderRadius:8,border:'1px solid rgba(255,225,125,.34)',background:'linear-gradient(125deg,rgba(255,225,125,.08),rgba(168,85,247,.10))'}}><div style={{fontFamily:'Cinzel,serif',fontSize:9,color:'#FFE58A',letterSpacing:'.16em',marginBottom:8}}>✧ CONFIGURAÇÃO DA HABILIDADE SUPREMA</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><div><label style={{fontSize:9,color:'#D9C4FF',fontFamily:'Cinzel,serif',display:'block',marginBottom:3}}>ALIADO / CONDIÇÃO NECESSÁRIA</label><input value={form.aliadoRequerido||''} onChange={e=>setForm(f=>({...f,aliadoRequerido:e.target.value}))} placeholder="Ex.: Assassino do Fogo Azul" style={{width:'100%'}}/></div><div><label style={{fontSize:9,color:'#FFE58A',fontFamily:'Cinzel,serif',display:'block',marginBottom:3}}>AMPLIFICAÇÃO</label><input value={form.amplificacao||''} onChange={e=>setForm(f=>({...f,amplificacao:e.target.value}))} placeholder="Ex.: dano dobrado ou +2 de dano" style={{width:'100%'}}/></div></div><div style={{fontSize:10,color:'rgba(235,220,255,.72)',marginTop:7}}>O aliado participante consome 1 VC. Descreva a amplificação acima.</div></div>}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div><label style={{fontSize:9,color:'rgba(255,200,80,0.5)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Dano / Efeito</label><input aria-label="Dano / Efeito" value={form.dano} onChange={e=>setForm(f=>({...f,dano:e.target.value}))} placeholder="Ex: 1D8, 3D4, +2 vida" style={{width:'100%'}}/></div>
                  <div><label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Custo VC</label><input type="number" min={0} aria-label="Custo VC" value={form.custo} onChange={e=>setForm(f=>({...f,custo:+e.target.value}))} style={{width:'100%'}}/></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div><label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Cooldown / Rodadas</label><input aria-label="Cooldown / Rodadas" value={form.cooldown} onChange={e=>setForm(f=>({...f,cooldown:e.target.value}))} placeholder="Ex: 3 rodadas" style={{width:'100%'}}/></div>
                  <div><label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Nível Mínimo</label><input type="number" min={1} max={30} aria-label="Nível Mínimo" value={form.req} onChange={e=>setForm(f=>({...f,req:+e.target.value}))} style={{width:'100%'}}/></div>
                </div>
                <div><label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Descrição</label><textarea aria-label="Descrição" value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Descreva o efeito, duração, condições especiais, área de alcance..." rows={3} style={{width:'100%',resize:'vertical',lineHeight:1.7}}/></div>
                <button type="button" onClick={handleSave} disabled={saving||!form.nome.trim()} style={{padding:'8px',borderRadius:7,border:`1px solid ${color}55`,background:form.nome.trim()?`${color}20`:'rgba(255,255,255,0.03)',color:form.nome.trim()?color:'#5A5070',cursor:form.nome.trim()?'pointer':'not-allowed',fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:'0.1em',fontWeight:600,transition:'all 0.2s'}}>{saving?'Salvando...':editingId!==null?'Salvar alterações':'Salvar Habilidade'}</button>
                {editingId!==null&&<button type="button" onClick={resetEditor}>Cancelar edição</button>}
              </fieldset>
              {saveError&&<div role="alert" className="ability-editor-error">{saveError}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const SUMMON_THREATS=['Baixa','Média','Alta','Extrema'];
const SUMMON_ATTRS=[['forca','Força'],['agilidade','Agilidade'],['durabilidade','Durabilidade'],['inteligencia','Inteligência'],['percepcao','Percepção'],['sorte','Sorte']];
const SUMMON_ICON='\uD83D\uDC80';
const summonRequiredAbility=threat=>['Alta','Extrema'].includes(String(threat||'Baixa'))?'Invocação dos Lordes':'Animar os Mortos';
const newSummon=id=>({id,nome:'',ameaca:'Baixa',hp:10,hp_bonus:0,forca:0,agilidade:0,durabilidade:0,inteligencia:0,percepcao:0,sorte:0,ataques:[],revealed:false});
const newSummonAttack=()=>({id:Date.now()+Math.random(),nome:'',dano:'',desc:'',custo:1,tipoHab:'normal'});

function SummonCard({summon,onChange,onDelete,masterMode,color,ownerSheet}){
  const {combatState,summons,useSummonAbility,updateSummonHp,updateSummonVc,useSummonAction,storeSummon}=useExperience();
  const [attackDraft,setAttackDraft]=useState(newSummonAttack());
  const [busy,setBusy]=useState(false);
  const [optimisticVitals,setOptimisticVitals]=useState(null);
  const change=(key,value)=>onChange({...summon,[key]:value});
  const threat=summon.ameaca||'Baixa';
  const required=summonRequiredAbility(threat);
  const initiative=Array.isArray(combatState?.initiative)?combatState.initiative:[];
  const activeRecord=(Array.isArray(summons)?summons:[]).find(row=>row.type==='summon'
    && String(row.ownerSheetId||'')===String(ownerSheet?.id||'')
    && String(row.summonMemoryId||'')===String(summon.id||''));
  const configuredMaxHp=Math.max(1,Math.floor(Number(summon.hp||10)+Math.max(0,Number(summon.hp_bonus||0))));
  const activeSummon=activeRecord?{
    ...activeRecord,
    maxHp:configuredMaxHp,
    hp:Number(activeRecord.hp||0)>=Number(activeRecord.maxHp||1)&&configuredMaxHp>Number(activeRecord.maxHp||1)?configuredMaxHp:Math.min(configuredMaxHp,Number(activeRecord.hp||0)),
  }:null;
  const currentTurn=initiative[Number(combatState?.turnIdx||0)];
  const isSummonTurn=Boolean(activeSummon&&String(currentTurn?.id||'')===String(activeSummon.id||''));
  const actionsAvailable=Boolean(activeSummon);
  const currentVc=Math.max(0,Math.min(3,Number(activeSummon?.vigos??3)));
  const displayedHp=Math.max(0,Math.min(configuredMaxHp,Number(optimisticVitals?.hp??activeSummon?.hp??0)));
  const displayedVc=Math.max(0,Math.min(3,Number(optimisticVitals?.vc??currentVc)));
  useEffect(()=>{
    if(!activeSummon){setOptimisticVitals(null);return;}
    if(optimisticVitals&&Number(activeSummon.hp||0)===optimisticVitals.hp&&Number(activeSummon.vigos??3)===optimisticVitals.vc)setOptimisticVitals(null);
  },[activeSummon?.id,activeSummon?.hp,activeSummon?.vigos,optimisticVitals]);

  const addAttack=()=>{
    if(!attackDraft.nome.trim())return;
    const next={...attackDraft,id:Date.now(),custo:Math.max(0,Math.min(3,Number(attackDraft.custo)||0))};
    change('ataques',[...(summon.ataques||[]),next]);
    setAttackDraft(newSummonAttack());
  };
  const release=async()=>{
    if(busy)return;
    setBusy(true);
    try{
      const accepted=await useSummonAbility({name:required},summon);
      if(!accepted)pushToast('A invocação não pôde ser liberada agora.',SUMMON_ICON,color);
    }catch(error){console.error('Falha ao liberar invocação:',error);pushToast('Falha ao sincronizar a invocação.',SUMMON_ICON,color);}finally{setBusy(false);}
  };
  const adjustHp=async delta=>{
    if(!activeSummon)return;
    const nextHp=Math.max(0,Math.min(configuredMaxHp,displayedHp+Number(delta||0)));
    if(nextHp===displayedHp)return;
    setOptimisticVitals(current=>({hp:nextHp,vc:Number(current?.vc??displayedVc)}));
    try{
      const accepted=await updateSummonHp(activeSummon.id,delta,configuredMaxHp);
      if(!accepted)pushToast('Não foi possível alterar a vida da invocação.',SUMMON_ICON,color);
    }catch(error){console.error('Falha ao alterar HP da invocação:',error);pushToast('Falha ao sincronizar a vida da invocação.',SUMMON_ICON,color);}
  };
  const adjustVc=async delta=>{
    if(!activeSummon)return;
    const nextVc=Math.max(0,Math.min(3,displayedVc+Number(delta||0)));
    if(nextVc===displayedVc)return;
    setOptimisticVitals(current=>({hp:Number(current?.hp??displayedHp),vc:nextVc}));
    try{
      const accepted=await updateSummonVc(activeSummon.id,delta);
      if(!accepted)pushToast('Não foi possível alterar o Vigor Cósmico.',SUMMON_ICON,color);
    }catch(error){console.error('Falha ao alterar VC da invocação:',error);pushToast('Falha ao sincronizar o Vigor Cósmico.',SUMMON_ICON,color);}
  };
  const useAction=async action=>{
    if(!activeSummon||busy)return;
    setBusy(true);
    try{
      const accepted=await useSummonAction(activeSummon.id,action);
      if(!accepted)pushToast('A ação exige vida e VC disponíveis.',SUMMON_ICON,color);
    }catch(error){console.error('Falha ao usar ação da invocação:',error);pushToast('Falha ao sincronizar a ação da invocação.',SUMMON_ICON,color);}finally{setBusy(false);}
  };
  const store=async()=>{
    if(!activeSummon||busy)return;
    setBusy(true);
    try{
      const accepted=await storeSummon(activeSummon.id);
      if(!accepted)pushToast('A invocação não pôde ser guardada.',SUMMON_ICON,color);
    }catch(error){console.error('Falha ao guardar invocação:',error);pushToast('Falha ao sincronizar a invocação.',SUMMON_ICON,color);}finally{setBusy(false);}
  };

  if(masterMode){
    return <div className={'summon-memory-slot master '+(summon.revealed?'is-revealed':'is-hidden')} style={{'--summon-color':color}}>
      <header><div><span>{SUMMON_ICON} SLOT DE MEMÓRIA</span><b>{summon.nome||'Nova invocação'}</b></div><div className="summon-master-actions"><button className="summon-reveal-button" onClick={()=>change('revealed',!summon.revealed)}>{summon.revealed?'Ocultar':'Revelar'}</button><button className="summon-delete-button" onClick={onDelete}>×</button></div></header>
      <div className="summon-reveal-state">{summon.revealed?'Visível para o necromante':'Oculta até o Mestre revelar'} · 3 VC</div>
      <div className="summon-memory-form"><label className="wide">Nome<input value={summon.nome||''} onChange={event=>change('nome',event.target.value)} placeholder="Nome da criatura"/></label><label>Ameaça<select value={threat} onChange={event=>change('ameaca',event.target.value)}>{SUMMON_THREATS.map(item=><option key={item} value={item}>{item}</option>)}</select></label><label>Habilidade necessária<input value={required} readOnly/></label><label>HP base<input type="number" min="1" value={summon.hp??10} onChange={event=>change('hp',Math.max(1,Number(event.target.value)||1))}/></label><label>HP bônus<input type="number" min="0" value={summon.hp_bonus||0} onChange={event=>change('hp_bonus',Math.max(0,Number(event.target.value)||0))}/></label>{SUMMON_ATTRS.map(([key,label])=><label key={key}>{label}<input type="number" min="0" max="30" value={summon[key]||0} onChange={event=>change(key,Math.max(0,Math.min(30,Number(event.target.value)||0)))}/></label>)}</div>
      <div className="summon-memory-attacks"><small>HABILIDADES · VC MÁXIMO 3</small>{(summon.ataques||[]).map(action=><article key={action.id} className={'summon-ability-card type-'+(action.tipoHab||'normal')}><div className="summon-ability-head"><b>{action.nome||'Habilidade'}</b><span>{({normal:'NORMAL',passiva:'PASSIVA',especial:'ESPECIAL'})[action.tipoHab||'normal']||'NORMAL'}</span><button onClick={()=>change('ataques',(summon.ataques||[]).filter(item=>item.id!==action.id))}>×</button></div><span className="summon-ability-meta">{action.dano||'—'} · {Math.max(0,Math.min(3,Number(action.custo??1)))} VC</span><p>{action.desc||''}</p><label>Tipo<select aria-label={'Tipo de habilidade '+(action.nome||'')} value={action.tipoHab||'normal'} onChange={event=>change('ataques',(summon.ataques||[]).map(item=>item.id===action.id?{...item,tipoHab:event.target.value}:item))}><option value="normal">Normal</option><option value="passiva">Passiva</option><option value="especial">Especial</option></select></label></article>)}<div className="summon-memory-add-attack"><input value={attackDraft.nome} onChange={event=>setAttackDraft(value=>({...value,nome:event.target.value}))} placeholder="Nome da habilidade"/><input value={attackDraft.dano} onChange={event=>setAttackDraft(value=>({...value,dano:event.target.value}))} placeholder="Dano / efeito"/><input type="number" min="0" max="3" value={attackDraft.custo} onChange={event=>setAttackDraft(value=>({...value,custo:Number(event.target.value)}))} aria-label="Custo em VC"/><input value={attackDraft.desc} onChange={event=>setAttackDraft(value=>({...value,desc:event.target.value}))} placeholder="Descrição"/><select aria-label="Tipo da nova habilidade" value={attackDraft.tipoHab||'normal'} onChange={event=>setAttackDraft(value=>({...value,tipoHab:event.target.value}))}><option value="normal">Normal</option><option value="passiva">Passiva</option><option value="especial">Especial</option></select><button onClick={addAttack}>＋</button></div></div>
    </div>;
  }

  if(summon.revealed!==true)return null;
  const canRelease=Boolean(!activeSummon&&!busy);
  return <div className={'summon-memory-slot player-summon-card '+(activeSummon?'is-active':'is-revealed')} style={{'--summon-color':color}}>
    <header><div><span>{SUMMON_ICON} MEMÓRIA REVELADA</span><strong>{summon.nome||'Invocação não nomeada'}</strong></div><div className="summon-threat"><b>Ameaça {threat}</b><small>{required}</small></div></header>
    {activeSummon&&<div className="summon-readonly-stats">{SUMMON_ATTRS.map(([key,label])=><div key={key}><small>{label}</small><b>{summon[key]||0}</b></div>)}</div>}
    <div className={'summon-release-row '+(activeSummon?'summon-store-row':'')}><div><b>{activeSummon?'Invocação em campo':'3 VC ao ser conjurada'}</b><small>{activeSummon?'Guarde para recolher a ficha e conjurar novamente depois.':'Autorizada pelo Mestre. Pode ser liberada agora.'}</small></div><button className={activeSummon?'summon-store-button':'summon-release-button is-pulsing'} onClick={activeSummon?store:release} disabled={activeSummon?busy:!canRelease}>{busy?(activeSummon?'Guardando...':'Liberando...'):(activeSummon?'Guardar':'Liberar')}</button></div>
    {activeSummon&&<div className="summon-live-controls">
      <div className="summon-vitals"><div><small>VIDA</small><span><button onClick={()=>adjustHp(-1)} disabled={displayedHp<=0}>−</button><b>{displayedHp}/{configuredMaxHp}</b><button onClick={()=>adjustHp(1)} disabled={displayedHp>=configuredMaxHp}>+</button></span></div><div><small>VIGOR CÓSMICO</small><span><button onClick={()=>adjustVc(-1)} disabled={displayedVc<=0}>−</button><b>{displayedVc}/3 VC</b><button onClick={()=>adjustVc(1)} disabled={displayedVc>=3}>+</button></span></div></div>
      <div className="summon-turn-state">Invocação liberada · controle do necromante{isSummonTurn?' · turno atual':''}</div>
      <div className="summon-player-actions">{(activeSummon.ataques||[]).map(action=>{const cost=Math.max(0,Math.min(3,Number(action.custo??1))),type=action.tipoHab||'normal',label=({normal:'NORMAL',passiva:'PASSIVA',especial:'ESPECIAL'})[type]||'NORMAL';return <article key={action.id||action.nome} className={'summon-ability-card type-'+type}><header><span className="summon-ability-type">{label}</span><b>{action.nome||'Habilidade'}</b></header><div className="summon-ability-meta">{action.dano||'Sem dano definido'}{type!=='passiva'?' · '+cost+' VC':''}</div>{action.desc&&<p>{action.desc}</p>}{type!=='passiva'&&<button disabled={!actionsAvailable||busy||displayedVc<cost||displayedHp<=0} onClick={()=>useAction(action)}>Usar habilidade <em>{cost} VC</em></button>}</article>})}{!(activeSummon.ataques||[]).length&&<div className="summon-no-actions">O Mestre ainda não cadastrou habilidades.</div>}</div>
    </div>}
  </div>;
}

function InvocacoesPanel({sheet,onChange,sheetColor,masterMode}){
  const invocations=Array.isArray(sheet.invocacoes)?sheet.invocacoes:[];
  const visible=masterMode?invocations:invocations.filter(summon=>summon.revealed===true);
  const save=next=>onChange({...sheet,invocacoes:next});
  const add=()=>{if(invocations.length<6)save([...invocations,newSummon(Date.now())]);};
  return <div className="summon-memory-panel"><div className="summon-memory-help">{masterMode?'Cadastre a criatura e use Revelar quando o necromante puder conhecê-la.':'Somente memórias reveladas pelo Mestre aparecem aqui. Uma memória autorizada pode ser liberada a qualquer momento.'}</div>{visible.map(summon=><SummonCard key={summon.id} summon={summon} ownerSheet={sheet} masterMode={masterMode} color={sheetColor} onChange={next=>save(invocations.map(item=>String(item.id)===String(summon.id)?next:item))} onDelete={()=>save(invocations.filter(item=>String(item.id)!==String(summon.id)))}/>)}{masterMode&&invocations.length<6&&<button className="summon-memory-add" onClick={add}>＋ Adicionar invocação ({invocations.length}/6)</button>}{!masterMode&&!visible.length&&<div className="summon-memory-empty">Nenhuma invocação foi revelada pelo Mestre.</div>}</div>;
}

const newSheet=id=>({id,nome:'',classe:'fogo',nivel:1,xp:0,hp:20,hp_bonus:0,vigos:5,forca:0,agilidade:0,durabilidade:0,inteligencia:0,percepcao:0,sorte:0,attrPoints:0,especial1:false,especial2:false,lore_personagem:'',notas:'',foto:'',equip_mao_esq:{nome:'',dano:'',tipo:'Espada / Arma'},equip_mao_dir:{nome:'',dano:'',tipo:'Escudo / Arma'},equip_corpo:{nome:'',dano:'',tipo:'Armadura / Roupa'},status:{},senha:'',artefato_id:'', personalidade:[], cooldowns:{}, invocacoes:[], familiares:[newFamiliar(Date.now()+Math.random())]});
function useIsMobile(breakpoint = 700) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= breakpoint);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= breakpoint);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [breakpoint]);
  return isMobile;
}

function MobileSheetFull({sheet, onChange, masterMode, customAbilities, onSaveCustomAbilities, revealedArtefatos, artefatosHabs}){
  const cls=CLASSES.find(c=>c.id===sheet.classe)||CLASSES[0];
  const sheetColor=SHEET_COLORS[sheet.classe]||cls.color;
  const sheetGlow=SHEET_GLOWS[sheet.classe]||cls.glow;
  const label=v=>v<=3?'Aprendiz Cósmico':v<=6?'Portador do Destino':v<=9?'Arauto do Fim':v<=14?'Guardião Estelar':v<=19?'Ascendente':v<=24?'Transcendente':v<=29?'Arauto Supremo':'Lenda Cósmica';
  const f=(k,v)=>onChange({...sheet,[k]:v});
  const hp=sheet.hp||0; const hpBonus=sheet.hp_bonus||0;
  const maxHp=getSheetMaxHp(sheet);
  const attrPoints = sheet.attrPoints || 0;
  const photoInputRef=useRef(null);
  const [levelUpData, setLevelUpData] = useState(null);
  const [sheetTab, setSheetTab] = useState('geral');
  // Cooldowns agora vivem na própria ficha (Firestore) — permite indicador no Modo Mestre
  const sheetCooldowns = sheet.cooldowns || {};
  const handleUpdateCooldown = (abilityId, turns) => { f('cooldowns', { ...sheetCooldowns, [abilityId]: turns }); };
  const sheetTabsList = SHEET_TABS.filter(t => t.id === 'geral' || t.id === 'combate');
  const handlePhotoFile=async e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=async ev=>{const compressed=await compressImage(ev.target.result,900,900,0.75);f('foto',compressed);};reader.readAsDataURL(file);};
  const attrBonus=val=>Math.floor(val/2);

  const handleNivelChange = (newNivel) => {
    const old = sheet.nivel || 1;
    const clamped = Math.min(30, Math.max(1, newNivel));
    if (masterMode && clamped > old) {
      const gained = clamped - old;
      const updated = { ...sheet, nivel: clamped, attrPoints: (sheet.attrPoints || 0) + gained };
      onChange(updated);
      const color = SHEET_COLORS[sheet.classe] || '#A855F7';
      setLevelUpData({ nome: sheet.nome || 'Personagem', nivel: clamped, color });
      pushToast(`${sheet.nome || 'Personagem'} subiu para Nível ${clamped}!`, '⬆️', color);
    } else {
      f('nivel', clamped);
    }
  };

  const handleSpendPoint = (attrKey, newVal) => {
    if (attrPoints <= 0) return;
    onChange({ ...sheet, [attrKey]: newVal, attrPoints: attrPoints - 1 });
  };

  return(
    <div style={{border:`1px solid ${sheetColor}44`,borderRadius:16,overflow:'hidden',background:'rgba(8,10,22,0.95)',boxShadow:`0 6px 32px ${sheetGlow}`}}>
      {levelUpData && <LevelUpScreen data={levelUpData} onClose={() => setLevelUpData(null)} />}
      <div style={{height:4,background:`linear-gradient(90deg,${sheetColor},${sheetColor}44,transparent)`}}/>

      {/* HEADER STICKY — nome + foto pequena + sub-abas, visível durante toda a rolagem */}
      <div style={{position:'sticky',top:0,zIndex:40,background:'rgba(8,10,22,0.97)',backdropFilter:'none',borderBottom:`1px solid ${sheetColor}33`}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'9px 16px 7px'}}>
          {sheet.foto
            ? <img src={sheet.foto} alt="" style={{width:30,height:30,borderRadius:7,objectFit:'cover',border:`1.5px solid ${sheetColor}55`,flexShrink:0}}/>
            : <div style={{width:30,height:30,borderRadius:7,background:`${sheetColor}15`,border:`1.5px dashed ${sheetColor}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{cls.icon}</div>
          }
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:'Cinzel,serif',fontSize:13,fontWeight:700,color:sheetColor,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{sheet.nome||'Sem nome'}</div>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif'}}>Nv {sheet.nivel||1} · {hp}/{maxHp} HP</div>
          </div>
          {attrPoints>0 && <span title={`${attrPoints} ponto(s) de atributo pendente(s)`} style={{width:7,height:7,borderRadius:'50%',background:'#A855F7',boxShadow:'0 0 6px #A855F7',animation:'pulse 1.5s ease-in-out infinite',flexShrink:0}}/>}
        </div>
        <div style={{display:'flex',gap:4,padding:'0 10px 8px'}}>
          {sheetTabsList.map(t=>(
            <button key={t.id} onClick={()=>setSheetTab(t.id)} style={{
              flex:1,padding:'6px 8px',borderRadius:7,cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:'0.03em',
              border:sheetTab===t.id?`1px solid ${sheetColor}66`:'1px solid rgba(255,255,255,0.07)',
              background:sheetTab===t.id?`${sheetColor}16`:'rgba(255,255,255,0.02)',
              color:sheetTab===t.id?sheetColor:'#6A5A7A',transition:'all 0.2s',
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      {sheetTab==='geral' && (
        <div onClick={()=>photoInputRef.current?.click()} style={{position:'relative',width:'100%',cursor:'pointer',background:'#04060F',overflow:'hidden',minHeight:sheet.foto?0:130}}>
          {sheet.foto?<img src={sheet.foto} alt="personagem" style={{width:'100%',display:'block',objectFit:'contain',background:'#04060F'}}/>:<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'36px 20px',gap:10}}><div style={{fontSize:40,opacity:0.15}}>📷</div><div style={{fontSize:12,color:'rgba(255,255,255,0.18)',fontFamily:'Cinzel,serif',letterSpacing:'0.08em',textAlign:'center'}}>Toque para adicionar a foto do personagem</div></div>}
          {sheet.foto&&<div style={{position:'absolute',bottom:0,left:0,right:0,height:'30%',background:'linear-gradient(to bottom,transparent,rgba(4,6,15,0.95))',pointerEvents:'none'}}/>}
          {sheet.foto&&<div style={{position:'absolute',bottom:16,left:20,right:20}}><div style={{fontFamily:'Cinzel Decorative,serif',fontSize:22,fontWeight:700,color:sheetColor,textShadow:`0 0 24px ${sheetColor}88`}}>{sheet.nome||'Sem nome'}</div><div style={{fontSize:12,color:'rgba(255,255,255,0.55)',marginTop:4,fontFamily:'Cinzel,serif'}}>{cls.icon} {cls.name} · Nv {sheet.nivel} · {label(sheet.nivel)}</div></div>}
        </div>
      )}
      <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoFile} style={{display:'none'}}/>

      <div style={{padding:'18px'}}>

        {sheetTab==='geral' && (<>
        {attrPoints > 0 && (
          <div style={{ marginBottom: SPACING, padding: '14px 18px', border: '1px solid rgba(168,85,247,0.5)', borderRadius: 12, background: 'rgba(168,85,247,0.08)', animation: 'bannerGlow 2s ease-in-out infinite', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>✨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Cinzel,serif', fontSize: 13, color: '#C8A8E8', fontWeight: 700, marginBottom: 2 }}>{attrPoints} Ponto{attrPoints > 1 ? 's' : ''} de Atributo disponíve{attrPoints > 1 ? 'is' : 'l'}!</div>
              <div style={{ fontSize: 12, color: '#7A6A9A' }}>Clique na próxima bolinha de um atributo para gastar um ponto.</div>
            </div>
            {masterMode && <button onClick={() => f('attrPoints', Math.max(0, attrPoints - 1))} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(232,25,60,0.3)', background: 'rgba(232,25,60,0.08)', color: '#E8193C', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10 }}>−1</button>}
          </div>
        )}

        <div className="nome-classe-row" style={{display:'flex',gap:10,alignItems:'flex-end',marginBottom:SPACING,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:120}}><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nome</label><input value={sheet.nome} onChange={e=>f('nome',e.target.value)} placeholder="Nome do personagem" style={{width:'100%'}}/></div>
          <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Classe</label>{masterMode
  ? <select value={sheet.classe} onChange={e=>{const classe=e.target.value;const next={...sheet,classe};onChange({...next,hp:Math.min(sheet.hp||0,getSheetMaxHp(next))});}}>{CLASSES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>
  : <div className="sheet-class-readonly" title="Classe definida pelo Mestre" style={{minHeight:34,display:'flex',alignItems:'center',gap:7,padding:'6px 10px',borderRadius:6,border:'1px solid rgba(168,85,247,.24)',background:'rgba(168,85,247,.055)',color:sheetColor,fontFamily:'Cinzel,serif',fontSize:12,fontWeight:600,whiteSpace:'nowrap'}}><span>{cls.icon}</span><span>{cls.name}</span><span aria-hidden="true" style={{fontSize:9,color:'rgba(255,255,255,.28)'}}>🔒</span></div>}</div>
          {masterMode&&<button onClick={()=>onChange(null)} style={{background:'rgba(232,25,60,0.12)',border:'1px solid rgba(232,25,60,0.35)',color:'#E8193C',borderRadius:6,cursor:'pointer',padding:'6px 11px',fontSize:12}}>✕ Excluir</button>}
        </div>

        <div className="sheet-stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(138px,1fr))',gap:8,marginBottom:SPACING}}>

          <div style={{gridColumn:'1 / -1', background:'rgba(232,25,60,0.06)', border:'1px solid rgba(232,25,60,0.18)', borderRadius:14, padding:'20px 18px'}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:'#E8193C',fontFamily:'Cinzel,serif',marginBottom:16,textTransform:'uppercase',textAlign:'center'}}>
              ❤️ Pontos de Vida
            </div>

            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20,marginBottom:16}}>
              <button onClick={()=>f('hp',Math.max(0,hp-1))} style={{width:44,height:44,borderRadius:10,border:'1px solid rgba(232,25,60,0.45)',background:'rgba(232,25,60,0.18)',color:'#E8193C',cursor:'pointer',fontSize:26,lineHeight:1,padding:0,transition:'all 0.15s'}}>−</button>
              <div style={{textAlign:'center',minWidth:80}}>
                <div style={{fontFamily:'Cinzel,serif',fontSize:52,fontWeight:900,lineHeight:1,color:hpColor(hp,30),textShadow:`0 0 28px ${hpColor(hp,30)}88, 0 0 6px ${hpColor(hp,30)}44`,transition:'color 0.4s, text-shadow 0.4s'}}>{hp}</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginTop:4,letterSpacing:'0.08em'}}>{Math.round(Math.min(100,(hp/Math.max(1,maxHp))*100))}% de vida</div>
                <div style={{fontSize:9,color:'rgba(74,222,128,0.55)',fontFamily:'Cinzel,serif',marginTop:4}}>Base {getClassBaseHp(sheet.classe)} + Nv {Math.max(0,(sheet.nivel||1)-1)} + Dur {getDurabilityHp(sheet.durabilidade)}{hpBonus>0?` + Extra ${hpBonus}`:''}</div>
              </div>
              <button onClick={()=>f('hp',Math.min(maxHp,hp+1))} style={{width:44,height:44,borderRadius:10,border:'1px solid rgba(74,222,128,0.45)',background:'rgba(74,222,128,0.18)',color:'#4ADE80',cursor:'pointer',fontSize:26,lineHeight:1,padding:0,transition:'all 0.15s'}}>+</button>
            </div>

            <div style={{height:8,background:'rgba(255,255,255,0.06)',borderRadius:6,marginBottom:14,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${Math.min(100,(hp/Math.max(1,maxHp))*100)}%`,background:`linear-gradient(90deg,${hpColor(hp,30)},${hpColor(hp,30)}99)`,borderRadius:6,transition:'width 0.4s ease, background 0.4s ease',boxShadow:`0 0 8px ${hpColor(hp,30)}66`}}/>
            </div>

            <div style={{display:'flex',gap:5,flexWrap:'wrap',justifyContent:'center',marginBottom:14}}>
              {[-15,-10,-5].map(v=>(
                <button key={v} onClick={()=>f('hp',Math.max(0,hp+v))} style={{padding:'5px 10px',borderRadius:7,border:'1px solid rgba(232,25,60,0.3)',background:'rgba(232,25,60,0.1)',color:'#E8193C',cursor:'pointer',fontSize:12,fontWeight:'bold',letterSpacing:'0.04em'}}>{v}</button>
              ))}
              <div style={{width:10}}/>
              {[+5,+10,+15].map(v=>(
                <button key={v} onClick={()=>f('hp',Math.min(maxHp,hp+v))} style={{padding:'5px 10px',borderRadius:7,border:'1px solid rgba(74,222,128,0.3)',background:'rgba(74,222,128,0.1)',color:'#4ADE80',cursor:'pointer',fontSize:12,fontWeight:'bold',letterSpacing:'0.04em'}}>+{v}</button>
              ))}
            </div>

            <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:14,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontSize:9,letterSpacing:'0.25em',color:'rgba(74,222,128,0.6)',fontFamily:'Cinzel,serif',textTransform:'uppercase'}}>🛡 Vida Bônus</div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <button onClick={()=>f('hp_bonus',Math.max(0,hpBonus-1))} style={{width:26,height:26,borderRadius:6,border:'1px solid rgba(74,222,128,0.28)',background:'rgba(74,222,128,0.07)',color:'#4ADE80',cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}>−</button>
                <span style={{fontFamily:'Cinzel,serif',fontSize:20,fontWeight:700,color:'#4ADE80',minWidth:28,textAlign:'center'}}>{hpBonus}</span>
                <button onClick={()=>f('hp_bonus',hpBonus+1)} style={{width:26,height:26,borderRadius:6,border:'1px solid rgba(74,222,128,0.28)',background:'rgba(74,222,128,0.07)',color:'#4ADE80',cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}>+</button>
              </div>
            </div>
          </div>

          <div style={{background:'rgba(232,160,32,0.07)',border:'1px solid rgba(232,160,32,0.2)',borderRadius:10,padding:'10px 12px'}}>
            <div style={{fontSize:9,letterSpacing:'0.25em',color:'#E8A020',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Nível · XP</div>
            {masterMode ? (
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input type="number" min={1} max={30} value={sheet.nivel} onChange={e=>handleNivelChange(+e.target.value)} style={{width:40,textAlign:'center',fontSize:13}}/>
                <span style={{color:'rgba(255,255,255,0.14)',fontSize:10}}>Nv</span>
                <input type="number" min={0} value={sheet.xp} onChange={e=>f('xp',+e.target.value)} style={{width:58,textAlign:'center',fontSize:13}}/>
                <span style={{fontSize:10,color:'rgba(255,255,255,0.18)'}}>XP</span>
              </div>
            ) : (
              <div style={{display:'flex',alignItems:'baseline',gap:8}}>
                <span style={{fontFamily:'Cinzel,serif',fontSize:22,fontWeight:700,color:'#E8A020'}}>{sheet.nivel || 1}</span>
                <span style={{fontSize:11,color:'rgba(232,160,32,0.5)',fontFamily:'Cinzel,serif'}}>Nível</span>
                <span style={{fontFamily:'Cinzel,serif',fontSize:15,fontWeight:600,color:'rgba(232,160,32,0.7)',marginLeft:6}}>{sheet.xp || 0}</span>
                <span style={{fontSize:10,color:'rgba(232,160,32,0.4)',fontFamily:'Cinzel,serif'}}>XP</span>
              </div>
            )}
            <div style={{fontSize:9,color:'#7A6A5A',marginTop:3,fontFamily:'Cinzel,serif'}}>{label(sheet.nivel)}</div>
            {masterMode && attrPoints > 0 && <div style={{marginTop:6,fontSize:10,color:'#A855F7',fontFamily:'Cinzel,serif'}}>✨ +{attrPoints} pts pendentes</div>}
          </div>
        </div>
          
        <div className="attrs-personality-row" style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:18,marginBottom:SPACING,alignItems:'start'}}>
          <div>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:9,textTransform:'uppercase'}}>Atributos</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {ATTRS.map(a=>{
                const bonus=attrBonus(sheet[a.key]||0);
                return(
                  <div key={a.key} style={{display:'flex',alignItems:'center',gap:8}}>
                    <span className="attr-label" style={{fontSize:11,fontFamily:'Cinzel,serif',color:a.color,minWidth:92,letterSpacing:'0.03em'}}>{a.label}</span>
                    <AttrDots value={sheet[a.key]||0} color={a.color} onChange={v=>{ if(masterMode) f(a.key,v); }} masterMode={masterMode} attrPoints={attrPoints} onSpendPoint={(newVal) => handleSpendPoint(a.key, newVal)}/>
                    <span style={{fontSize:11,color:'rgba(255,255,255,0.22)',minWidth:16,textAlign:'right'}}>{sheet[a.key]||0}</span>
                    <span style={{fontSize:11,fontFamily:'Cinzel,serif',fontWeight:700,color:bonus>0?a.color:'rgba(255,255,255,0.12)',minWidth:26,textAlign:'center',background:bonus>0?`${a.color}15`:'transparent',borderRadius:4,padding:'1px 4px',border:bonus>0?`1px solid ${a.color}33`:'1px solid transparent',transition:'all 0.2s'}}>{bonus>0?`+${bonus}`:'—'}</span>
                  </div>
                );
              })}
            </div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.15)',marginTop:6,fontFamily:'Cinzel,serif',letterSpacing:'0.05em'}}>a cada 2 pontos = +1 bônus</div>
          </div>

          <div>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:9,textTransform:'uppercase'}}>Personalidade</div>
            <PersonalityTags value={sheet.personalidade} color={sheetColor} onChange={v=>f('personalidade',v)}/>
          </div>
        </div>
        </>)}

                {sheetTab==='combate' && (<>
        {/* Vigor Cósmico — visível de imediato, sem precisar voltar pra Visão Geral */}
        <div style={{marginBottom:SPACING}}>
          <div style={{background:`${sheetColor}09`,border:`1px solid ${sheetColor}24`,borderRadius:10,padding:'10px 12px',maxWidth:220}}>
            <div style={{fontSize:9,letterSpacing:'0.25em',color:sheetColor,fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Vigor Cósmico</div>
            <VigosWithLocked value={sheet.vigos||0} nivel={sheet.nivel||1} color={sheetColor} onChange={v=>f('vigos',v)}/>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.18)',marginTop:4}}>+2 por turno</div>
            {sheet.nivel>=8&&sheet.nivel<18&&<div style={{fontSize:8,color:'rgba(255,200,0,0.5)',marginTop:2,fontFamily:'Cinzel,serif'}}>✦ +1 VC (Nv 8)</div>}
            {sheet.nivel>=18&&sheet.nivel<23&&<div style={{fontSize:8,color:'rgba(255,200,0,0.5)',marginTop:2,fontFamily:'Cinzel,serif'}}>✦ +2 VC (Nv 8 e 18)</div>}
              {sheet.nivel>=23&&<div style={{fontSize:8,color:'rgba(255,200,0,0.5)',marginTop:2,fontFamily:'Cinzel,serif'}}>{'\u2726'} +3 VC (Nv 8, 18 e 23)</div>}
          </div>
        </div>

        {/* Status Ativos — pra ver de cara se está envenenado, sangrando, atordoado etc. */}
        <StatusPanel sheet={sheet} onChange={onChange} />

        {/* Bônus de Atributos — leitura rápida pra rolagens; editar continua em Visão Geral */}
        <div style={{marginBottom:SPACING}}>
          <div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:9,textTransform:'uppercase'}}>Bônus de Atributos</div>
          <AttrBonusStrip sheet={sheet}/>
        </div>
        <div style={{marginBottom:SPACING}}>
          <div className="sheet-specials-row" style={{display:'flex',alignItems:'center',gap:12,marginBottom:9,flexWrap:'wrap'}}>
            {cls.id !== 'personalizado' && (
              <div style={{display:'flex',gap:9,flexWrap:'wrap',flex:1}}>
                {cls.specials.map((sp,i)=>{const key=i===0?'especial1':'especial2';const unlocked=sheet[key];const canUnlock=i===0?sheet.nivel>=3:sheet.nivel>=7;return(<button key={i} onClick={()=>f(key,!unlocked)} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 12px',borderRadius:7,border:`1px solid ${unlocked?sheetColor+'55':'rgba(255,255,255,0.09)'}`,background:unlocked?`${sheetColor}14`:'rgba(255,255,255,0.02)',cursor:canUnlock?'pointer':'not-allowed',opacity:canUnlock?1:0.5,transition:'all 0.2s'}}><span style={{fontSize:12}}>{unlocked?'✦':'○'}</span><div style={{textAlign:'left'}}><div style={{fontSize:11,color:unlocked?sheetColor:'#6A5A6A',fontFamily:'Cinzel,serif'}}>{sp.name}</div><div style={{fontSize:10,color:'rgba(255,255,255,0.18)'}}>Nível {sp.req}+{!canUnlock&&` (Atual: ${sheet.nivel})`}</div></div></button>);})}
              </div>
            )}
            <div style={{flexShrink:0,padding:'8px 14px',borderRadius:8,border:`1px solid ${sheetColor}33`,background:`${sheetColor}0A`,textAlign:'center'}}>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.25)',fontFamily:'Cinzel,serif',letterSpacing:'0.15em',marginBottom:3,textTransform:'uppercase'}}>Alcance</div>
              <div style={{fontSize:16,fontFamily:'Cinzel,serif',color:sheetColor,fontWeight:700}}>{cls.alcance}</div>
            </div>
          </div>
        </div>

        <HabilidadesPanel
          cls={cls}
          sheet={sheet}
          customAbilities={customAbilities}
          masterMode={masterMode}
          onSaveCustomAbilities={onSaveCustomAbilities}
          sheetCooldowns={sheetCooldowns}
          onUpdateCooldown={handleUpdateCooldown}
          currentVigos={sheet.vigos ?? 0}
          onSpendVC={(cost, abilityId, turns) => onChange({ ...sheet, vigos: Math.max(0, (sheet.vigos ?? 0) - cost), cooldowns: { ...(sheet.cooldowns || {}), ...(turns > 0 ? { [abilityId]: turns } : {}) } })}
          characterName={sheet.nome || 'Personagem'}
        />

        <CollapsibleSection icon="⚔" label="Equipamentos" color={sheetColor}>
          <EquipamentoPanel sheet={sheet} onChange={onChange} sheetColor={sheetColor}/>
        </CollapsibleSection>

        
        <CollapsibleSection icon="🐦‍⬛" label="Familiares" color={sheetColor}>
          <FamiliaresPanel sheet={sheet} onChange={onChange} masterMode={masterMode} color={sheetColor}/>
        </CollapsibleSection>
        <CollapsibleSection icon="◆" label="Artefato Portado" color="#E8A020">
          <ArtefatoFichaPanel
            sheet={sheet}
            onChange={onChange}
            sheetColor={sheetColor}
            revealedArtefatos={revealedArtefatos || []}
            artefatosHabs={artefatosHabs || {}}
            showHeader={false}
          />
        </CollapsibleSection>

        <CollapsibleSection icon="🎒" label="Itens & Inventário" color={sheetColor}>
          <textarea
            value={sheet.notas || ''}
            onChange={e => f('notas', e.target.value)}
            placeholder="Liste os itens carregados pelo personagem..."
            rows={6}
            style={{width:'100%', resize:'vertical', minHeight:140}}
          />
        </CollapsibleSection>

        <CollapsibleSection
          icon="✦"
          label="Lore do Personagem"
          color={sheetColor}
          badge={!masterMode && sheet.lore_personagem ? <span style={{fontSize:9,color:sheetColor+'66',letterSpacing:'0.1em'}}>SOMENTE LEITURA</span> : null}
        >
          {masterMode ? (
            <textarea value={sheet.lore_personagem || ''} onChange={e => f('lore_personagem', e.target.value)} rows={7} style={{width:'100%', resize:'vertical', lineHeight:1.85}}/>
          ) : sheet.lore_personagem ? (
            <div style={{fontSize:14,color:'#B8A898',lineHeight:1.95,whiteSpace:'pre-wrap',fontFamily:"'Crimson Text',Georgia,serif",padding:'14px 16px',background:`${sheetColor}06`,borderRadius:10,border:`1px solid ${sheetColor}22`,borderLeft:`3px solid ${sheetColor}55`}}>{sheet.lore_personagem}</div>
          ) : (
            <div style={{fontSize:12,color:'#4A4050',fontStyle:'italic',fontFamily:'Cinzel,serif',textAlign:'center',padding:'20px 0'}}>A história deste personagem ainda não foi escrita pelo Mestre.</div>
          )}
        </CollapsibleSection>

        {cls.id === 'necromante' && (
          <CollapsibleSection icon="💀" label="Invocações" color={sheetColor}>
            <InvocacoesPanel sheet={sheet} onChange={onChange} sheetColor={sheetColor} masterMode={masterMode}/>
          </CollapsibleSection>
        )}
        </>)}

        {sheetTab==='lore' && (<>
        
        <CollapsibleSection icon="🐦‍⬛" label="Familiares" color={sheetColor}>
          <FamiliaresPanel sheet={sheet} onChange={onChange} masterMode={masterMode} color={sheetColor}/>
        </CollapsibleSection>
        <CollapsibleSection icon="◆" label="Artefato Portado" color="#E8A020">
          <ArtefatoFichaPanel
            sheet={sheet}
            onChange={onChange}
            sheetColor={sheetColor}
            revealedArtefatos={revealedArtefatos || []}
            artefatosHabs={artefatosHabs || {}}
            showHeader={false}
          />
        </CollapsibleSection>

        <CollapsibleSection icon="🎒" label="Itens & Inventário" color={sheetColor}>
          <textarea value={sheet.notas||''} onChange={e=>f('notas',e.target.value)} placeholder="Liste outros itens carregados pelo personagem..." rows={3} style={{width:'100%',resize:'vertical'}}/>
        </CollapsibleSection>

        <CollapsibleSection
          icon="✦"
          label="Lore do Personagem"
          color={sheetColor}
          badge={!masterMode && sheet.lore_personagem ? <span style={{fontSize:9,color:sheetColor+'66',letterSpacing:'0.1em'}}>SOMENTE LEITURA</span> : null}
        >
          {masterMode ? (
            <textarea
              value={sheet.lore_personagem||''}
              onChange={e=>f('lore_personagem',e.target.value)}
              placeholder="Escreva aqui a história, origem, motivações e segredos do personagem..."
              rows={7}
              style={{width:'100%',resize:'vertical',lineHeight:1.85}}
            />
          ) : sheet.lore_personagem ? (
            <div style={{
              fontSize:15, color:'#B8A898', lineHeight:2,
              whiteSpace:'pre-wrap', fontFamily:"'Crimson Text',Georgia,serif",
              padding:'16px 18px',
              background:`${sheetColor}06`,
              borderRadius:10,
              border:`1px solid ${sheetColor}22`,
              borderLeft:`3px solid ${sheetColor}55`,
            }}>
              {sheet.lore_personagem}
            </div>
          ) : (
            <div style={{
              fontSize:13, color:'#4A4050', fontStyle:'italic',
              fontFamily:'Cinzel,serif', textAlign:'center',
              padding:'24px 0', border:'1px dashed rgba(255,255,255,0.05)',
              borderRadius:10,
            }}>
              A história deste personagem ainda não foi escrita pelo Mestre.
            </div>
          )}
        </CollapsibleSection>

        <div style={{marginTop:SPACING,paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.05)'}}>
          {masterMode ? (
            <div>
              <div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>🔒 Senha da Ficha</div>
              <div style={{display:'flex',gap:8}}>
                <input type="password" value={sheet.senha||''} onChange={e=>f('senha',e.target.value)} placeholder="Definir senha do jogador..." style={{flex:1,fontSize:13}}/>
                {sheet.senha && <button onClick={()=>f('senha','')} style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(232,25,60,0.3)',background:'rgba(232,25,60,0.08)',color:'#E8193C',cursor:'pointer',fontSize:11}}>Resetar</button>}
              </div>
              <div style={{fontSize:10,color:'#4A4050',marginTop:5,fontFamily:'Cinzel,serif'}}>O Mestre pode resetar a senha. Jogadores precisam dela para abrir a ficha.</div>
            </div>
          ) : (
            sheet.senha ? <div style={{fontSize:11,color:'#4A4050',fontFamily:'Cinzel,serif',textAlign:'center'}}>🔒 Ficha protegida por senha.</div> : null
          )}
        </div>
        </>)}

        {sheetTab==='invocacoes' && cls.id==='necromante' && (
          <InvocacoesPanel sheet={sheet} onChange={onChange} sheetColor={sheetColor} masterMode={masterMode}/>
        )}

      </div>
    </div>
  );
}


function SheetFull({sheet, onChange, masterMode, customAbilities, onSaveCustomAbilities, revealedArtefatos, artefatosHabs}){
  const isMobile = useIsMobile(700);
  const cls=CLASSES.find(c=>c.id===sheet.classe)||CLASSES[0];
  const sheetColor=SHEET_COLORS[sheet.classe]||cls.color;
  const sheetGlow=SHEET_GLOWS[sheet.classe]||cls.glow;
  const label=v=>v<=3?'Aprendiz Cósmico':v<=6?'Portador do Destino':v<=9?'Arauto do Fim':v<=14?'Guardião Estelar':v<=19?'Ascendente':v<=24?'Transcendente':v<=29?'Arauto Supremo':'Lenda Cósmica';
  const f=(k,v)=>onChange({...sheet,[k]:v});
  const hp=sheet.hp||0; const hpBonus=sheet.hp_bonus||0;
  const maxHp=getSheetMaxHp(sheet);
  const attrPoints=sheet.attrPoints||0;
  const photoInputRef=useRef(null);
  const [levelUpData,setLevelUpData]=useState(null);
  const sheetCooldowns=sheet.cooldowns||{};
  const handleUpdateCooldown=(abilityId,turns)=>{f('cooldowns',{...sheetCooldowns,[abilityId]:turns});};
  const handlePhotoFile=async e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=async ev=>{const compressed=await compressImage(ev.target.result,900,900,0.75);f('foto',compressed);};reader.readAsDataURL(file);};
  const attrBonus=val=>Math.floor(val/2);

  const handleNivelChange=(newNivel)=>{
    const old=sheet.nivel||1;
    const clamped=Math.min(30,Math.max(1,newNivel));
    if(masterMode&&clamped>old){
      const gained=clamped-old;
      const updated={...sheet,nivel:clamped,attrPoints:(sheet.attrPoints||0)+gained};
      onChange(updated);
      const color=SHEET_COLORS[sheet.classe]||'#A855F7';
      setLevelUpData({nome:sheet.nome||'Personagem',nivel:clamped,color});
      pushToast(`${sheet.nome||'Personagem'} subiu para Nível ${clamped}!`,'⬆️',color);
    } else { f('nivel',clamped); }
  };

  const handleSpendPoint=(attrKey,newVal)=>{
    if(attrPoints<=0)return;
    onChange({...sheet,[attrKey]:newVal,attrPoints:attrPoints-1});
  };

  const col={overflowY:'auto',padding:'14px 12px',display:'flex',flexDirection:'column',gap:0,minHeight:0};
  const colHead=(label,icon)=>(
    <div style={{fontSize:9,letterSpacing:'0.35em',color:`${sheetColor}88`,fontFamily:'Cinzel,serif',textTransform:'uppercase',marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${sheetColor}22`,display:'flex',alignItems:'center',gap:6}}>
      <span>{icon}</span>{label}
    </div>
  );


  if (isMobile) {
    return (
      <MobileSheetFull
        sheet={sheet}
        onChange={onChange}
        masterMode={masterMode}
        customAbilities={customAbilities}
        onSaveCustomAbilities={onSaveCustomAbilities}
        revealedArtefatos={revealedArtefatos}
        artefatosHabs={artefatosHabs}
      />
    );
  }

  return(
    <div style={{border:`1px solid ${sheetColor}44`,borderRadius:16,overflow:'hidden',background:'rgba(2,0,9,0.985)',boxShadow:`0 8px 38px rgba(77,20,120,0.28), 0 6px 32px ${sheetGlow}`}}>
      {levelUpData&&<LevelUpScreen data={levelUpData} onClose={()=>setLevelUpData(null)}/>}
      <div style={{height:4,background:`linear-gradient(90deg,${sheetColor},${sheetColor}44,transparent)`}}/>
      <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoFile} style={{display:'none'}}/>

      {/* HEADER COMPACTO */}
      <div style={{background:'rgba(2,0,9,0.99)',backdropFilter:'none',borderBottom:`1px solid ${sheetColor}33`,padding:'10px 16px',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',flexShrink:0}}>
        <div onClick={()=>photoInputRef.current?.click()} style={{cursor:'pointer',flexShrink:0}}>
          {sheet.foto
            ?<img src={sheet.foto} alt="" style={{width:38,height:38,borderRadius:9,objectFit:'cover',border:`2px solid ${sheetColor}55`}}/>
            :<div style={{width:38,height:38,borderRadius:9,background:`${sheetColor}15`,border:`2px dashed ${sheetColor}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{cls.icon}</div>
          }
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:'Cinzel,serif',fontSize:14,fontWeight:700,color:sheetColor,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{sheet.nome||'Sem nome'}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif'}}>{cls.icon} {cls.name} · Nv {sheet.nivel||1} · {label(sheet.nivel||1)}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <div style={{fontSize:13,fontFamily:'Cinzel,serif',fontWeight:700,color:hpColor(hp,maxHp||1)}}>{hp}<span style={{fontSize:9,color:'rgba(255,255,255,0.25)',fontWeight:400}}>/{maxHp} HP</span></div>
          {attrPoints>0&&<span title={`${attrPoints} ponto(s) pendente(s)`} style={{width:8,height:8,borderRadius:'50%',background:'#A855F7',boxShadow:'0 0 6px #A855F7',animation:'pulse 1.5s ease-in-out infinite'}}/>}
          {masterMode&&<button onClick={()=>onChange(null)} style={{background:'rgba(232,25,60,0.12)',border:'1px solid rgba(232,25,60,0.35)',color:'#E8193C',borderRadius:6,cursor:'pointer',padding:'4px 10px',fontSize:11}}>✕</button>}
        </div>
      </div>

      {/* 3 COLUNAS */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1px 1fr 1px 1fr',height:'calc(100vh - 210px)',minHeight:0,maxHeight:'calc(100vh - 210px)',overflow:'hidden'}}>

        {/* ══ COL 1: PERSONAGEM ═══════════════════════ */}
        <div className="sheet-column-scroll" style={col}>
          {colHead('Personagem','🧙')}

          {/* Foto */}
          <div className="sheet-photo-main" onClick={()=>photoInputRef.current?.click()} style={{position:'relative',width:'fit-content',maxWidth:'100%',alignSelf:'center',cursor:'pointer',background:'#04060F',overflow:'hidden',borderRadius:10,marginBottom:12,border:`1px solid ${sheetColor}22`,lineHeight:0}}>
            {sheet.foto
              ?<img src={sheet.foto} alt="personagem" style={{width:'auto',maxWidth:'100%',height:'auto',maxHeight:'none',objectFit:'contain',objectPosition:'center',display:'block',background:'#04060F',borderRadius:9}}/>
              :<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px 12px',gap:6,lineHeight:1.4}}>
                <div style={{fontSize:26,opacity:0.15}}>📷</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.18)',fontFamily:'Cinzel,serif',textAlign:'center'}}>Toque para adicionar foto</div>
              </div>
            }
          </div>

          {attrPoints>0&&(
            <div style={{marginBottom:SPACING,padding:'10px 12px',border:'1px solid rgba(168,85,247,0.5)',borderRadius:10,background:'rgba(168,85,247,0.08)',animation:'bannerGlow 2s ease-in-out infinite',display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:16}}>✨</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:'Cinzel,serif',fontSize:11,color:'#C8A8E8',fontWeight:700}}>{attrPoints} Ponto{attrPoints>1?'s':''} disponíve{attrPoints>1?'is':'l'}!</div>
                <div style={{fontSize:10,color:'#7A6A9A'}}>Clique na próxima bolinha.</div>
              </div>
              {masterMode&&<button onClick={()=>f('attrPoints',Math.max(0,attrPoints-1))} style={{padding:'2px 7px',borderRadius:5,border:'1px solid rgba(232,25,60,0.3)',background:'rgba(232,25,60,0.08)',color:'#E8193C',cursor:'pointer',fontSize:10}}>−1</button>}
            </div>
          )}

          {/* Nome + Classe */}
          <div style={{display:'flex',gap:7,alignItems:'flex-end',marginBottom:SPACING,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:90}}><label style={{fontSize:9,letterSpacing:'0.25em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:4,textTransform:'uppercase'}}>Nome</label><input value={sheet.nome} onChange={e=>f('nome',e.target.value)} placeholder="Nome..." style={{width:'100%',fontSize:12}}/></div>
            <div><label style={{fontSize:9,letterSpacing:'0.25em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:4,textTransform:'uppercase'}}>Classe</label>{masterMode ? <select value={sheet.classe} onChange={e=>{const classe=e.target.value;const next={...sheet,classe};onChange({...next,hp:Math.min(sheet.hp||0,getSheetMaxHp(next))});}} style={{fontSize:11}}>{CLASSES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select> : <div className="sheet-class-readonly sheet-class-readonly-final" title="Classe definida pelo Mestre" style={{minHeight:34,display:'flex',alignItems:'center',gap:8,padding:'6px 10px',borderRadius:7,border:`1px solid ${sheetColor}33`,background:`${sheetColor}0D`,color:sheetColor,fontFamily:'Cinzel,serif',fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}><span aria-hidden="true">{cls.icon}</span><span>{cls.name}</span></div>}</div>
          </div>

          {/* HP */}
          <div style={{background:'rgba(232,25,60,0.06)',border:'1px solid rgba(232,25,60,0.18)',borderRadius:12,padding:'12px',marginBottom:SPACING}}>
            <div style={{fontSize:9,letterSpacing:'0.28em',color:'#E8193C',fontFamily:'Cinzel,serif',marginBottom:10,textTransform:'uppercase',textAlign:'center'}}>❤️ Pontos de Vida</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:10}}>
              <button onClick={()=>f('hp',Math.max(0,hp-1))} style={{width:34,height:34,borderRadius:8,border:'1px solid rgba(232,25,60,0.45)',background:'rgba(232,25,60,0.18)',color:'#E8193C',cursor:'pointer',fontSize:20,lineHeight:1,padding:0}}>−</button>
              <div style={{textAlign:'center',minWidth:56}}>
                <div style={{fontFamily:'Cinzel,serif',fontSize:38,fontWeight:900,lineHeight:1,color:hpColor(hp,30),textShadow:`0 0 18px ${hpColor(hp,30)}88`,transition:'color 0.4s'}}>{hp}</div>
                <div style={{fontSize:9,color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginTop:2}}>{Math.round(Math.min(100,(hp/Math.max(1,maxHp))*100))}%</div>
                <div style={{fontSize:8,color:'rgba(74,222,128,0.5)',fontFamily:'Cinzel,serif',marginTop:3}}>Base {getClassBaseHp(sheet.classe)} · Nv +{Math.max(0,(sheet.nivel||1)-1)} · Dur +{getDurabilityHp(sheet.durabilidade)}</div>
              </div>
              <button onClick={()=>f('hp',Math.min(maxHp,hp+1))} style={{width:34,height:34,borderRadius:8,border:'1px solid rgba(74,222,128,0.45)',background:'rgba(74,222,128,0.18)',color:'#4ADE80',cursor:'pointer',fontSize:20,lineHeight:1,padding:0}}>+</button>
            </div>
            <div style={{height:5,background:'rgba(255,255,255,0.06)',borderRadius:4,marginBottom:10,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${Math.min(100,(hp/Math.max(1,maxHp))*100)}%`,background:hpColor(hp,30),borderRadius:4,transition:'width 0.4s,background 0.4s'}}/>
            </div>
            <div style={{display:'flex',gap:4,flexWrap:'wrap',justifyContent:'center',marginBottom:10}}>
              {[-10,-5].map(v=>(<button key={v} onClick={()=>f('hp',Math.max(0,hp+v))} style={{padding:'3px 7px',borderRadius:5,border:'1px solid rgba(232,25,60,0.3)',background:'rgba(232,25,60,0.1)',color:'#E8193C',cursor:'pointer',fontSize:11,fontWeight:'bold'}}>{v}</button>))}
              {[+5,+10].map(v=>(<button key={v} onClick={()=>f('hp',Math.min(maxHp,hp+v))} style={{padding:'3px 7px',borderRadius:5,border:'1px solid rgba(74,222,128,0.3)',background:'rgba(74,222,128,0.1)',color:'#4ADE80',cursor:'pointer',fontSize:11,fontWeight:'bold'}}>+{v}</button>))}
            </div>
            <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontSize:9,color:'rgba(74,222,128,0.6)',fontFamily:'Cinzel,serif'}}>🛡 Bônus</div>
              <div style={{display:'flex',alignItems:'center',gap:7}}>
                <button onClick={()=>f('hp_bonus',Math.max(0,hpBonus-1))} style={{width:22,height:22,borderRadius:5,border:'1px solid rgba(74,222,128,0.28)',background:'rgba(74,222,128,0.07)',color:'#4ADE80',cursor:'pointer',fontSize:14,padding:0}}>−</button>
                <span style={{fontFamily:'Cinzel,serif',fontSize:16,fontWeight:700,color:'#4ADE80',minWidth:22,textAlign:'center'}}>{hpBonus}</span>
                <button onClick={()=>f('hp_bonus',hpBonus+1)} style={{width:22,height:22,borderRadius:5,border:'1px solid rgba(74,222,128,0.28)',background:'rgba(74,222,128,0.07)',color:'#4ADE80',cursor:'pointer',fontSize:14,padding:0}}>+</button>
              </div>
            </div>
          </div>

          {/* Nível + XP */}
          <div style={{background:'rgba(232,160,32,0.07)',border:'1px solid rgba(232,160,32,0.2)',borderRadius:10,padding:'10px 12px',marginBottom:SPACING}}>
            <div style={{fontSize:9,letterSpacing:'0.25em',color:'#E8A020',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Nível · XP</div>
            {masterMode?(
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input type="number" min={1} max={30} value={sheet.nivel} onChange={e=>handleNivelChange(+e.target.value)} style={{width:42,textAlign:'center',fontSize:13}}/>
                <span style={{color:'rgba(255,255,255,0.14)',fontSize:10}}>Nv</span>
                <input type="number" min={0} value={sheet.xp} onChange={e=>f('xp',+e.target.value)} style={{width:54,textAlign:'center',fontSize:13}}/>
                <span style={{fontSize:10,color:'rgba(255,255,255,0.18)'}}>XP</span>
              </div>
            ):(
              <div style={{display:'flex',alignItems:'baseline',gap:7}}>
                <span style={{fontFamily:'Cinzel,serif',fontSize:20,fontWeight:700,color:'#E8A020'}}>{sheet.nivel||1}</span>
                <span style={{fontSize:10,color:'rgba(232,160,32,0.5)',fontFamily:'Cinzel,serif'}}>Nível</span>
                <span style={{fontFamily:'Cinzel,serif',fontSize:14,fontWeight:600,color:'rgba(232,160,32,0.7)',marginLeft:4}}>{sheet.xp||0}</span>
                <span style={{fontSize:10,color:'rgba(232,160,32,0.4)',fontFamily:'Cinzel,serif'}}>XP</span>
              </div>
            )}
            <div style={{fontSize:9,color:'#7A6A5A',marginTop:3,fontFamily:'Cinzel,serif'}}>{label(sheet.nivel||1)}</div>
          </div>

          {/* Atributos */}
          <div style={{marginBottom:SPACING}}>
            <div style={{fontSize:9,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:9,textTransform:'uppercase'}}>Atributos</div>
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {ATTRS.map(a=>{
                const bonus=attrBonus(sheet[a.key]||0);
                return(
                  <div key={a.key} style={{display:'flex',alignItems:'center',gap:6}}>
                    <span className="attr-label" style={{fontSize:10,fontFamily:'Cinzel,serif',color:a.color,minWidth:84}}>{a.label}</span>
                    <AttrDots value={sheet[a.key]||0} color={a.color} onChange={v=>{if(masterMode)f(a.key,v);}} masterMode={masterMode} attrPoints={attrPoints} onSpendPoint={(newVal)=>handleSpendPoint(a.key,newVal)}/>
                    <span style={{fontSize:10,color:'rgba(255,255,255,0.22)',minWidth:14,textAlign:'right'}}>{sheet[a.key]||0}</span>
                    <span style={{fontSize:10,fontFamily:'Cinzel,serif',fontWeight:700,color:bonus>0?a.color:'rgba(255,255,255,0.12)',minWidth:24,textAlign:'center',background:bonus>0?`${a.color}15`:'transparent',borderRadius:4,padding:'1px 3px',border:bonus>0?`1px solid ${a.color}33`:'1px solid transparent'}}>{bonus>0?`+${bonus}`:'—'}</span>
                  </div>
                );
              })}
            </div>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.15)',marginTop:5,fontFamily:'Cinzel,serif'}}>a cada 2 pontos = +1 bônus</div>
          </div>

          {/* Personalidade */}
          <div style={{marginBottom:SPACING}}>
            <div style={{fontSize:9,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:9,textTransform:'uppercase'}}>Personalidade</div>
            <PersonalityTags value={sheet.personalidade} color={sheetColor} onChange={v=>f('personalidade',v)}/>
          </div>
        </div>

        {/* divider */}
        <div style={{background:`${sheetColor}22`}}/>

        {/* ══ COL 2: COMBATE ══════════════════════════ */}
        <div className="sheet-column-scroll" style={col}>
          {colHead('Combate','⚔️')}

          {/* Vigor */}
          <div style={{marginBottom:SPACING}}>
            <div style={{background:`${sheetColor}09`,border:`1px solid ${sheetColor}24`,borderRadius:10,padding:'10px 12px'}}>
              <div style={{fontSize:9,letterSpacing:'0.25em',color:sheetColor,fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Vigor Cósmico</div>
              <VigosWithLocked value={sheet.vigos||0} nivel={sheet.nivel||1} color={sheetColor} onChange={v=>f('vigos',v)}/>
              <div style={{fontSize:9,color:'rgba(255,255,255,0.18)',marginTop:4}}>+2 por turno</div>
              {sheet.nivel>=8&&sheet.nivel<18&&<div style={{fontSize:8,color:'rgba(255,200,0,0.5)',marginTop:2,fontFamily:'Cinzel,serif'}}>✦ +1 VC (Nv 8)</div>}
              {sheet.nivel>=18&&sheet.nivel<23&&<div style={{fontSize:8,color:'rgba(255,200,0,0.5)',marginTop:2,fontFamily:'Cinzel,serif'}}>✦ +2 VC (Nv 8 e 18)</div>}
              {sheet.nivel>=23&&<div style={{fontSize:8,color:'rgba(255,200,0,0.5)',marginTop:2,fontFamily:'Cinzel,serif'}}>{'\u2726'} +3 VC (Nv 8, 18 e 23)</div>}
            </div>
          </div>

          <StatusPanel sheet={sheet} onChange={onChange}/>

          <div style={{marginBottom:SPACING}}>
            <div style={{fontSize:9,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:8,textTransform:'uppercase'}}>Bônus de Atributos</div>
            <AttrBonusStrip sheet={sheet}/>
          </div>

          {cls.id!=='personalizado'&&(
            <div style={{marginBottom:SPACING}}>
              <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:9}}>
                {cls.specials.map((sp,i)=>{
                  const key=i===0?'especial1':'especial2';
                  const unlocked=sheet[key];
                  const canUnlock=i===0?sheet.nivel>=3:sheet.nivel>=7;
                  return(<button key={i} onClick={()=>f(key,!unlocked)} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 10px',borderRadius:7,border:`1px solid ${unlocked?sheetColor+'55':'rgba(255,255,255,0.09)'}`,background:unlocked?`${sheetColor}14`:'rgba(255,255,255,0.02)',cursor:canUnlock?'pointer':'not-allowed',opacity:canUnlock?1:0.5,transition:'all 0.2s'}}>
                    <span style={{fontSize:11}}>{unlocked?'✦':'○'}</span>
                    <div style={{textAlign:'left'}}>
                      <div style={{fontSize:10.5,color:unlocked?sheetColor:'#6A5A6A',fontFamily:'Cinzel,serif'}}>{sp.name}</div>
                      <div style={{fontSize:9,color:'rgba(255,255,255,0.18)'}}>Nível {sp.req}+</div>
                    </div>
                  </button>);
                })}
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 10px',borderRadius:7,border:`1px solid ${sheetColor}33`,background:`${sheetColor}0A`}}>
                <span style={{fontSize:9,color:'rgba(255,255,255,0.25)',fontFamily:'Cinzel,serif',letterSpacing:'0.1em',textTransform:'uppercase'}}>Alcance</span>
                <span style={{fontSize:13,fontFamily:'Cinzel,serif',color:sheetColor,fontWeight:700}}>{cls.alcance}</span>
              </div>
            </div>
          )}
        </div>

        {/* divider */}
        <div style={{background:`${sheetColor}22`}}/>

        {/* ══ COL 3: LORE & ITENS ═════════════════════ */}
        <div className="sheet-column-scroll" style={col}>
          {colHead('Lore & Itens','📜')}

{/* Habilidades — movidas da col 2 */}
<HabilidadesPanel
  cls={cls} sheet={sheet} customAbilities={customAbilities}
  masterMode={masterMode} onSaveCustomAbilities={onSaveCustomAbilities}
  sheetCooldowns={sheetCooldowns} onUpdateCooldown={handleUpdateCooldown}
  currentVigos={sheet.vigos??0}
  onSpendVC={(cost, abilityId, turns)=>onChange({ ...sheet, vigos:Math.max(0,(sheet.vigos??0)-cost), cooldowns:{ ...(sheet.cooldowns||{}), ...(turns>0?{[abilityId]:turns}:{}) } })}
  characterName={sheet.nome||'Personagem'}
/>

{/* Equipamentos — movidos da col 2 */}
<CollapsibleSection icon="⚔" label="Equipamentos" color={sheetColor}>
  <EquipamentoPanel sheet={sheet} onChange={onChange} sheetColor={sheetColor}/>
</CollapsibleSection>
<CollapsibleSection icon="🐾" label="Familiares" color={sheetColor}>
  <FamiliaresPanel sheet={sheet} onChange={onChange} masterMode={masterMode} color={sheetColor}/>
</CollapsibleSection>

{/* Artefato */}
<CollapsibleSection icon="◆" label="Artefato Portado" color="#E8A020">
  <ArtefatoFichaPanel
    sheet={sheet} onChange={onChange} sheetColor={sheetColor}
    revealedArtefatos={revealedArtefatos||[]}
    artefatosHabs={artefatosHabs||{}} showHeader={false}
  />
</CollapsibleSection>

{/* Itens — textarea maior */}
<CollapsibleSection icon="🎒" label="Itens & Inventário" color={sheetColor}>
  <textarea
    value={sheet.notas||''}
    onChange={e=>f('notas',e.target.value)}
    placeholder="Liste outros itens carregados pelo personagem..."
    rows={8}
    style={{width:'100%', resize:'vertical', minHeight: 160}}
  />
</CollapsibleSection>

<CollapsibleSection
  icon="✦" label="Lore do Personagem" color={sheetColor}
  badge={!masterMode&&sheet.lore_personagem?<span style={{fontSize:9,color:sheetColor+'66',letterSpacing:'0.1em'}}>SOMENTE LEITURA</span>:null}
>
  {masterMode?(
    <textarea value={sheet.lore_personagem||''} onChange={e=>f('lore_personagem',e.target.value)} placeholder="Escreva aqui a história, origem, motivações e segredos..." rows={7} style={{width:'100%',resize:'vertical',lineHeight:1.85}}/>
  ):sheet.lore_personagem?(
    <div style={{fontSize:14,color:'#B8A898',lineHeight:1.95,whiteSpace:'pre-wrap',fontFamily:"'Crimson Text',Georgia,serif",padding:'14px 16px',background:`${sheetColor}06`,borderRadius:10,border:`1px solid ${sheetColor}22`,borderLeft:`3px solid ${sheetColor}55`}}>
      {sheet.lore_personagem}
    </div>
  ):(
    <div style={{fontSize:12,color:'#4A4050',fontStyle:'italic',fontFamily:'Cinzel,serif',textAlign:'center',padding:'20px 0',border:'1px dashed rgba(255,255,255,0.05)',borderRadius:10}}>
      A história deste personagem ainda não foi escrita pelo Mestre.
    </div>
  )}
</CollapsibleSection>

{cls.id==='necromante'&&(
  <CollapsibleSection icon="💀" label="Invocações" color={sheetColor}>
    <InvocacoesPanel sheet={sheet} onChange={onChange} sheetColor={sheetColor} masterMode={masterMode}/>
  </CollapsibleSection>
)}

<div style={{marginTop:SPACING,paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.05)'}}>
  {masterMode?(
    <div>
      <div style={{fontSize:9,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>🔒 Senha da Ficha</div>
      <div style={{display:'flex',gap:8}}>
        <input type="password" value={sheet.senha||''} onChange={e=>f('senha',e.target.value)} placeholder="Definir senha..." style={{flex:1,fontSize:12}}/>
        {sheet.senha&&<button onClick={()=>f('senha','')} style={{padding:'4px 8px',borderRadius:5,border:'1px solid rgba(232,25,60,0.3)',background:'rgba(232,25,60,0.08)',color:'#E8193C',cursor:'pointer',fontSize:10}}>Resetar</button>}
      </div>
      <div style={{fontSize:9,color:'#4A4050',marginTop:4,fontFamily:'Cinzel,serif'}}>O Mestre pode resetar a senha.</div>
    </div>
  ):(
    sheet.senha?<div style={{fontSize:11,color:'#4A4050',fontFamily:'Cinzel,serif',textAlign:'center'}}>🔒 Ficha protegida por senha.</div>:null
  )}
</div>
         </div>
      </div>
    </div>
  );
}


const FAMILIAR_TYPES = [
  { id:'cachorro', label:'Cachorro', icon:'🐕' }, { id:'aguia', label:'Águia', icon:'🦅' },
  { id:'gato', label:'Gato', icon:'🐈' }, { id:'leao', label:'Leão', icon:'🦁' },
  { id:'tigre', label:'Tigre', icon:'🐅' }, { id:'cavalo', label:'Cavalo', icon:'🐎' },
  { id:'fada', label:'Fada', icon:'🧚' }, { id:'corvo', label:'Corvo', icon:'🐦‍⬛' },
  { id:'lobo', label:'Lobo', icon:'🐺' }, { id:'coruja', label:'Coruja', icon:'🦉' },
  { id:'raposa', label:'Raposa', icon:'🦊' }, { id:'outro', label:'Outro', icon:'✨' },
];
const newFamiliar = id => ({ id, tipo:'cachorro', nome:'', hp:10, hpMax:10, vigos:2, habilidades:[] });
function FamiliaresPanel({ sheet, onChange, masterMode, color }) {
  const saved = Array.isArray(sheet.familiares) ? sheet.familiares : [];
  const limite = sheet.classe === 'corvos' ? 3 : 1;
  // Limita a exibição também nas fichas antigas que já tenham mais familiares que o permitido.
  const familiares = saved.length ? saved.slice(0,limite) : [newFamiliar('familiar-'+sheet.id)];
  const save = next => onChange({ ...sheet, familiares: next });
  const update = (id, patch) => save(familiares.map(f => String(f.id) === String(id) ? { ...f, ...patch } : f));
  const remove = id => { if (masterMode && saved.length) save(familiares.filter(f => String(f.id) !== String(id))); };
  const add = () => { if (familiares.length < limite) save([...familiares, newFamiliar(Date.now() + Math.random())]); };
  const updateAbility = (f, id, patch) => update(f.id, { habilidades: (f.habilidades || []).map(a => String(a.id) === String(id) ? { ...a, ...patch } : a) });
  const addAbility = f => update(f.id, { habilidades: [...(f.habilidades || []), { id: Date.now() + Math.random(), nome: '', efeito: '', descricao: '', custo:0 }] });
  const removeAbility = (f, id) => update(f.id, { habilidades: (f.habilidades || []).filter(a => String(a.id) !== String(id)) });
  return <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
      <div style={{ fontSize:10, color:'#8E7AA8', fontFamily:'Cinzel,serif' }}>Cada personagem pode ter 1 familiar; Corvos do Horizonte podem ter até 3. {familiares.length}/{limite}</div>
      {masterMode && familiares.length < limite && <button onClick={add} style={{ border:'1px solid rgba(168,85,247,.48)', borderRadius:7, background:'rgba(168,85,247,.12)', color:'#D9BCFF', padding:'6px 10px', cursor:'pointer', fontFamily:'Cinzel,serif', fontSize:10 }}>＋ Adicionar familiar</button>}
    </div>
    {!saved.length && !masterMode && <div style={{ border:'1px dashed rgba(255,255,255,.08)', borderRadius:8, padding:10, textAlign:'center', color:'#8E7AA8', fontFamily:'Cinzel,serif', fontSize:11 }}>Familiar ainda sem dados definidos pelo Mestre.</div>}
    {familiares.map((f, index) => {
      const skills = Array.isArray(f.habilidades) ? f.habilidades : [];
      const hp = Math.max(0, Number(f.hp ?? 10) || 0);
      const hpMax = Math.max(1, Number(f.hpMax ?? 10) || 10);
      const vigor = Math.min(2, Math.max(0, Number(f.vigos ?? 2) || 0));
      const kind = FAMILIAR_TYPES.find(t=>t.id===f.tipo)||FAMILIAR_TYPES[0];
      const spend = ability => { const cost=Math.min(2,Math.max(0,Number(ability.custo)||0)); if(vigor>=cost) update(f.id,{vigos:vigor-cost}); };
      return <article key={f.id ?? index} style={{ border:'1px solid '+color+'66', borderRadius:10, padding:11, background:'linear-gradient(145deg,rgba(168,85,247,.13),rgba(8,5,18,.92))', boxShadow:'0 0 18px rgba(168,85,247,.12)' }}>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:9, flexWrap:'wrap' }}>
          <span style={{ fontSize:21, filter:'drop-shadow(0 0 5px rgba(192,132,252,.55))' }}>{kind.icon}</span>
          {masterMode ? <select value={kind.id} aria-label="Tipo de familiar" onChange={e=>update(f.id,{tipo:e.target.value})} style={{maxWidth:145}}>{FAMILIAR_TYPES.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}</select> : <span style={{color:'#D8C6EA',fontSize:11}}>{kind.label}</span>}
          {masterMode?<input value={f.nome||''} onChange={e=>update(f.id,{nome:e.target.value})} placeholder="Nome do familiar" aria-label="Nome do familiar" style={{flex:1,minWidth:100}}/>:<strong style={{flex:1,color:color,fontFamily:'Cinzel,serif'}}>{f.nome||kind.label}</strong>}
          {masterMode&&saved.length>0&&<button onClick={()=>remove(f.id)} title="Excluir familiar" aria-label="Excluir familiar" style={{border:'1px solid rgba(232,25,60,.28)',background:'rgba(232,25,60,.1)',color:'#E8193C',borderRadius:5,cursor:'pointer',padding:'3px 7px'}}>✕</button>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:8,alignItems:'end',marginBottom:10}}>
          <label style={{fontSize:9,color:'#8E7AA8',fontFamily:'Cinzel,serif'}}>PONTOS DE VIDA{masterMode?<input type="number" min="0" value={hp} onChange={e=>update(f.id,{hp:Math.min(hpMax,Math.max(0,Number(e.target.value)||0))})} style={{width:'100%',marginTop:4}}/>:<div style={{color:'#E8D8C0',fontSize:14,marginTop:4}}>{hp} / {hpMax} HP</div>}</label>
          {masterMode&&<label style={{fontSize:9,color:'#8E7AA8',fontFamily:'Cinzel,serif'}}>HP MÁXIMO<input type="number" min="1" value={hpMax} onChange={e=>{const v=Math.max(1,Number(e.target.value)||1);update(f.id,{hpMax:v,hp:Math.min(hp,v)});}} style={{width:'100%',marginTop:4}}/></label>}
          <div style={{fontSize:9,color:'#C8A8E8',fontFamily:'Cinzel,serif'}}>VIGOR CÓSMICO <div role="group" aria-label={`Vigor cósmico ${vigor} de 2`} style={{display:'flex',alignItems:'center',gap:6,marginTop:6}}>{[0,1].map(index=>{const active=index<vigor;const next=active?(index===vigor-1?vigor-1:index+1):index+1;return <button key={index} type="button" disabled={!masterMode} onClick={()=>update(f.id,{vigos:next})} aria-label={`Definir vigor cósmico em ${next}`} aria-pressed={active} style={{width:18,height:18,padding:0,borderRadius:'50%',border:`1.5px solid ${active?'#C084FC':'rgba(255,255,255,.18)'}`,background:active?'rgba(168,85,247,.34)':'transparent',boxShadow:active?'0 0 9px rgba(168,85,247,.5)':'none',cursor:masterMode?'pointer':'default',display:'grid',placeItems:'center'}}>{active&&<i style={{width:7,height:7,borderRadius:'50%',background:'#D8B4FE'}}/>}</button>})}</div></div>
        </div>
        <div style={{fontSize:9,letterSpacing:'.2em',color:'#8E7AA8',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Habilidades opcionais</div>
        {!skills.length&&<div style={{fontSize:11,color:'#62566E',fontStyle:'italic',marginBottom:masterMode?8:0}}>Nenhuma habilidade cadastrada.</div>}
        {skills.map(a=><div key={a.id} style={{borderTop:'1px solid rgba(255,255,255,.06)',padding:'7px 0',display:'grid',gridTemplateColumns:'1fr auto',gap:6,alignItems:'start'}}>
          {masterMode?<div style={{display:'grid',gap:5}}><input value={a.nome||''} onChange={e=>updateAbility(f,a.id,{nome:e.target.value})} placeholder="Nome da habilidade"/><input value={a.efeito||''} onChange={e=>updateAbility(f,a.id,{efeito:e.target.value})} placeholder="Dano ou efeito (opcional)"/><textarea value={a.descricao||''} onChange={e=>updateAbility(f,a.id,{descricao:e.target.value})} placeholder="Descrição (opcional)" rows={2} style={{resize:'vertical'}}/><label style={{fontSize:9,color:'#8E7AA8'}}>CUSTO EM VC (MÁX. 2)<input type="number" min="0" max="2" value={Math.min(2,Number(a.custo)||0)} onChange={e=>updateAbility(f,a.id,{custo:Math.min(2,Math.max(0,Number(e.target.value)||0))})}/></label></div>:<div><strong style={{color:'#D8C6EA',fontSize:11}}>{a.nome||'Habilidade'}</strong>{a.efeito&&<span style={{color:'#FFE08A',fontSize:10,marginLeft:6}}>⚔ {a.efeito}</span>}{a.descricao&&<div style={{color:'#A89BAF',fontSize:11,lineHeight:1.5,marginTop:3}}>{a.descricao}</div>}<div style={{display:'flex',alignItems:'center',gap:8,marginTop:5}}><span style={{fontSize:9,color:'#C8A8E8'}}>{Math.min(2,Number(a.custo)||0)} VC</span><button disabled={vigor<Math.min(2,Number(a.custo)||0)} onClick={()=>spend(a)} style={{fontSize:9,padding:'3px 7px',cursor:vigor>=Math.min(2,Number(a.custo)||0)?'pointer':'not-allowed'}}>Usar</button></div></div>}
          {masterMode&&<button onClick={()=>removeAbility(f,a.id)} title="Remover habilidade" aria-label="Remover habilidade" style={{border:'1px solid rgba(232,25,60,.25)',background:'rgba(232,25,60,.08)',color:'#E8193C',borderRadius:5,cursor:'pointer',padding:'3px 6px'}}>✕</button>}
        </div>)}
        {masterMode&&<button onClick={()=>addAbility(f)} style={{width:'100%',border:'1px dashed rgba(168,85,247,.45)',borderRadius:6,background:'rgba(168,85,247,.1)',color:'#D8B4FE',padding:6,cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,boxShadow:'0 0 10px rgba(168,85,247,.12)'}}>＋ Adicionar habilidade (opcional)</button>}
      </article>;
    })}
  </div>;
}

export {PersonalityTags,AttrDots,VigosDots,VigosWithLocked,StatusPanel,AttrBonusStrip,resolveEquipIcon,CompactEquipSlot,CharSilhouette,CollapsibleSection,EquipamentoPanel,ArtefatoFichaPanel,CooldownBadge,HabilidadesPanel,SummonCard,InvocacoesPanel,useIsMobile,MobileSheetFull,SheetFull,newSheet};

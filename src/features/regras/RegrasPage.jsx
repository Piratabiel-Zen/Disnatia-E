import { useState } from "react";
import { RULES_DATA } from "../../data/gameData";
function RuleBody({ text }) {
  return text.split('\n').map((line, j) => {
    if (!line.trim()) return <div key={j} style={{ height: 8 }} />;
    const isBullet = line.startsWith('•');
    const isHead = !isBullet && line.length < 60 && !line.includes('→') && line.endsWith(':');
    return (
      <p key={j} style={{ margin: '0 0 6px', fontSize: 14, lineHeight: 1.8, color: isHead ? '#E8D8C0' : isBullet ? '#B8A890' : '#9A8A7A', fontFamily: isHead ? 'Cinzel,serif' : 'inherit', fontWeight: isHead ? 600 : 400, paddingLeft: isBullet ? 12 : 0 }}>
        {line}
      </p>
    );
  });
}

function RulesSection() {
  const sistemaTopics = RULES_DATA.filter(r => r.cat === 'sistema');
  const combateGroups = ['Combate', 'Mecânicas', 'Status'];

  const [sistemaSearch, setSistemaSearch] = useState('');
  const [combateSearch, setCombateSearch] = useState('');
  const [selSistema, setSelSistema] = useState(0);
  const [modalRule, setModalRule] = useState(null);

  const filteredSistema = sistemaTopics.filter(r =>
    !sistemaSearch.trim() || r.title.toLowerCase().includes(sistemaSearch.toLowerCase()) || r.body.toLowerCase().includes(sistemaSearch.toLowerCase())
  );
  const activeSistema = filteredSistema[selSistema] || filteredSistema[0] || null;

  const searchMatch = (r) => !combateSearch.trim() || r.title.toLowerCase().includes(combateSearch.toLowerCase()) || r.body.toLowerCase().includes(combateSearch.toLowerCase());

  const searchInputStyle = { fontSize: 12, padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#C8B8A0', width: 140 };
  const colHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16, flexWrap: 'wrap' };
  const colTitleStyle = { fontFamily: 'Cinzel Decorative,serif', fontSize: 16, color: '#E8D8C0', fontWeight: 700, margin: 0, letterSpacing: '0.03em' };

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 20px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.4em', color: '#7B6D8A', fontFamily: 'Cinzel,serif', marginBottom: 13, textTransform: 'uppercase' }}>As Leis do Cosmos</div>
        <h2 style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 23, color: '#E8D8C0', fontWeight: 700, margin: 0 }}>Manual de Regras</h2>
        <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg,transparent,rgba(232,160,32,0.6),transparent)', margin: '16px auto 0' }} />
      </div>

      <div className="rules-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24, alignItems: 'start' }}>

        {/* COLUNA ESQUERDA — SISTEMA DE JOGO */}
        <div style={{ border: '1px solid rgba(232,160,32,0.18)', borderRadius: 14, background: 'linear-gradient(180deg, rgba(20,14,30,0.9), rgba(8,10,22,0.9))', padding: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          <div style={colHeaderStyle}>
            <h3 style={colTitleStyle}>📜 Sistema de Jogo</h3>
            <input value={sistemaSearch} onChange={e => { setSistemaSearch(e.target.value); setSelSistema(0); }} placeholder="Buscar..." style={searchInputStyle} />
          </div>

          {filteredSistema.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {filteredSistema.map((r, i) => (
                <button key={r.title} onClick={() => setSelSistema(i)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 8,
                  border: `1px solid ${activeSistema === r ? 'rgba(232,160,32,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  background: activeSistema === r ? 'rgba(232,160,32,0.14)' : 'rgba(255,255,255,0.02)',
                  color: activeSistema === r ? '#E8A020' : '#9A8A7A', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 11,
                }}>
                  <span>{r.icon}</span>{r.title}
                </button>
              ))}
            </div>
          )}

          {activeSistema ? (
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, background: 'rgba(4,6,15,0.6)', padding: '20px 20px 22px', animation: 'pageTurn 0.3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 24 }}>{activeSistema.icon}</span>
                <h4 style={{ fontFamily: 'Cinzel,serif', fontSize: 15, color: '#E8D8C0', fontWeight: 700, margin: 0 }}>{activeSistema.title}</h4>
              </div>
              <RuleBody text={activeSistema.body} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#4A4050', fontFamily: 'Cinzel,serif', fontSize: 12, padding: '30px 0' }}>Nenhum resultado encontrado.</div>
          )}
        </div>

        {/* COLUNA DIREITA — COMBATE / MECÂNICAS / STATUS */}
        <div>
          <div style={colHeaderStyle}>
            <h3 style={colTitleStyle}>⚔️ Combate</h3>
            <input value={combateSearch} onChange={e => setCombateSearch(e.target.value)} placeholder="Buscar..." style={searchInputStyle} />
          </div>

          {combateGroups.map(group => {
            const items = RULES_DATA.filter(r => r.cat === group && searchMatch(r));
            if (items.length === 0) return null;
            return (
              <div key={group} style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.15em', color: '#7B6D8A', fontFamily: 'Cinzel,serif', marginBottom: 10, textTransform: 'uppercase' }}>{group}:</div>
                <div className="rules-cards-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {items.map(r => (
                    <button key={r.title} onClick={() => setModalRule(r)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(10,12,26,0.75)',
                      cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.2s, background 0.2s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,160,32,0.4)'; e.currentTarget.style.background = 'rgba(232,160,32,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.background = 'rgba(10,12,26,0.75)'; }}
                    >
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{r.icon}</span>
                      <span style={{ fontFamily: 'Cinzel,serif', fontSize: 12, color: '#C8B8A0', fontWeight: 600, lineHeight: 1.35 }}>{r.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {combateSearch.trim() && RULES_DATA.filter(r => r.cat !== 'sistema' && searchMatch(r)).length === 0 && (
            <div style={{ textAlign: 'center', color: '#4A4050', fontFamily: 'Cinzel,serif', fontSize: 12, padding: '30px 0' }}>Nenhum resultado encontrado.</div>
          )}
        </div>
      </div>

      {/* MODAL — abre a regra clicada */}
      {modalRule && (
        <div onClick={() => setModalRule(null)} style={{ position: 'fixed', inset: 0, zIndex: 9970, background: 'rgba(0,0,0,0.8)', backdropFilter:'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto', border: '1px solid rgba(232,160,32,0.3)', borderRadius: 14, background: 'linear-gradient(180deg, rgba(20,14,30,0.98), rgba(8,10,22,0.98))', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.7)', animation: 'pageTurn 0.25s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 26 }}>{modalRule.icon}</span>
              <h4 style={{ fontFamily: 'Cinzel,serif', fontSize: 16, color: '#E8D8C0', fontWeight: 700, margin: 0, flex: 1 }}>{modalRule.title}</h4>
              <button onClick={() => setModalRule(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#5A5070', borderRadius: 6, cursor: 'pointer', padding: '4px 9px', fontSize: 12 }}>✕</button>
            </div>
            <RuleBody text={modalRule.body} />
          </div>
        </div>
      )}
    </div>
  );
}


export default RulesSection;

import { onSnapshot } from '../../adventure/sharedSnapshot';
import { useEffect,useRef,useState } from "react";
import { doc,setDoc } from "firebase/firestore";
import { db } from "../../core/firebase";
import { compressImage } from "../../core/media";
import { pushToast } from "../../core/toast";
import { btnStyle } from "../../core/ui";
function MapaMundiSection({ masterMode }) {
  const ROOT_MAP_ID = 'mundo';
  const TYPE_META = {
    cidade: { icon: '🏘️', label: 'Cidade', color: '#9B7CFF' },
    reino: { icon: '🏰', label: 'Reino', color: '#C4A7FF' },
    natureza: { icon: '⛰️', label: 'Região natural', color: '#6EE7B7' },
    religioso: { icon: '⛪', label: 'Local sagrado', color: '#F7D774' },
    perigo: { icon: '💀', label: 'Área perigosa', color: '#F87171' },
    anomalia: { icon: '✦', label: 'Anomalia', color: '#38BDF8' },
    desconhecido: { icon: '❔', label: 'Desconhecido', color: '#7C728F' },
  };
  const STATE_META = {
    unknown:{label:'Desconhecido',icon:'?',color:'#736a80'},
    rumor:{label:'Rumor',icon:'◇',color:'#8f77a6'},
    descoberto:{label:'Descoberto',icon:'✦',color:'#9b7cff'},
    visitado:{label:'Visitado',icon:'✓',color:'#6ee7b7'},
    concluido:{label:'Concluído',icon:'◆',color:'#53f1a6'},
    corrompido:{label:'Corrompido',icon:'◉',color:'#d45a91'},
    destruido:{label:'Destruído',icon:'✕',color:'#f87171'},
  };

  const [atlas, setAtlas] = useState({ rootId: ROOT_MAP_ID, maps: {} });
  const [mapMedia, setMapMedia] = useState('');
  const [pinMedia, setPinMedia] = useState('');
  const [currentMapId, setCurrentMapId] = useState(ROOT_MAP_ID);
  const [selectedPin, setSelectedPin] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const mapContentRef = useRef(null);
  const fileRef = useRef(null);
  const pinImageRef = useRef(null);
  const saveTimeout = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'mapamundi'), snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.maps && Object.keys(d.maps).length) {
          setAtlas({ rootId: d.rootId || ROOT_MAP_ID, maps: d.maps });
          setCurrentMapId(prev => d.maps[prev] ? prev : (d.rootId || ROOT_MAP_ID));
        } else {
          // Migração automática do formato antigo (img + pins) para o atlas em camadas.
          const legacyPins = (d.pins || []).map(p => ({
            ...p,
            tipo: p.tipo || 'cidade',
            descoberto: p.descoberto !== false,
            estado: p.estado || (p.descoberto === false ? 'unknown' : 'descoberto'),
            childMapId: p.childMapId || '',
            imagemLocal: p.imagemLocal || '',
          }));
          setAtlas({
            rootId: ROOT_MAP_ID,
            maps: {
              [ROOT_MAP_ID]: {
                id: ROOT_MAP_ID,
                titulo: 'Mapa Múndi',
                subtitulo: 'O Mundo de Cosmum',
                descricao: 'O grande mapa conhecido pelos viajantes de Cosmum.',
                img: d.img || '',
                parentId: null,
                parentPinId: null,
                pins: legacyPins,
              }
            }
          });
        }
      } else {
        setAtlas({
          rootId: ROOT_MAP_ID,
          maps: {
            [ROOT_MAP_ID]: { id: ROOT_MAP_ID, titulo: 'Mapa Múndi', subtitulo: 'O Mundo de Cosmum', descricao: '', img: '', parentId: null, parentPinId: null, pins: [] }
          }
        });
      }
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setSelectedPin(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [currentMapId]);

  useEffect(() => {
    setMapMedia('');
    const unsub = onSnapshot(doc(db, 'mapamundi_media', `map_${currentMapId}`), snap => {
      setMapMedia(snap.exists() ? String(snap.data()?.img || '') : '');
    }, () => setMapMedia(''));
    return () => unsub();
  }, [currentMapId]);

  useEffect(() => {
    setPinMedia('');
    if (!selectedPin) return;
    const unsub = onSnapshot(doc(db, 'mapamundi_media', `pin_${currentMapId}_${selectedPin}`), snap => {
      setPinMedia(snap.exists() ? String(snap.data()?.img || '') : '');
    }, () => setPinMedia(''));
    return () => unsub();
  }, [currentMapId, selectedPin]);

  const currentMap = atlas.maps[currentMapId] || atlas.maps[atlas.rootId] || {
    id: ROOT_MAP_ID, titulo: 'Mapa Múndi', subtitulo: 'O Mundo de Cosmum', img: '', pins: []
  };
  const visiblePins = currentMap.pins || [];
  const selPin = (currentMap.pins || []).find(p => String(p.id) === String(selectedPin));
  const mapImage = mapMedia || currentMap.img || '';
  const selectedPinImage = pinMedia || selPin?.imagemLocal || '';

  const persistAtlas = newAtlas => {
    setAtlas(newAtlas);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'config', 'mapamundi'), {
          rootId: newAtlas.rootId,
          maps: newAtlas.maps,
          updatedAt: Date.now(),
        });
      } catch (e) {
        console.error('Erro ao salvar atlas:', e);
        pushToast('Não foi possível salvar o mapa.', '⚠️', '#F87171');
      }
    }, 550);
  };

  const updateCurrentMap = patch => {
    const next = {
      ...atlas,
      maps: {
        ...atlas.maps,
        [currentMapId]: { ...currentMap, ...patch }
      }
    };
    persistAtlas(next);
  };

  const updatePin = (id, patch) => {
    const pins = (currentMap.pins || []).map(p => String(p.id) === String(id) ? { ...p, ...patch } : p);
    updateCurrentMap({ pins });
  };

  const deletePin = id => {
    const pin = (currentMap.pins || []).find(p => String(p.id) === String(id));
    const maps = { ...atlas.maps };
    if (pin?.childMapId) delete maps[pin.childMapId];
    maps[currentMapId] = { ...currentMap, pins: (currentMap.pins || []).filter(p => String(p.id) !== String(id)) };
    setSelectedPin(null);
    persistAtlas({ ...atlas, maps });
  };

  const compressAtlasMedia = async (dataUrl, kind='map') => {
    const presets = kind==='map' ? [[1800,1400,.76],[1500,1150,.68],[1200,900,.58]] : [[1100,800,.74],[900,650,.64],[720,520,.56]];
    let result='';
    for (const [w,h,q] of presets) {
      result = await compressImage(dataUrl,w,h,q);
      if (result.length < 780000) break;
    }
    if (!result || result.length > 920000) throw new Error('Imagem ainda muito grande após compressão.');
    return result;
  };

  const handleMapUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const compressed = await compressAtlasMedia(ev.target.result, 'map');
        setMapMedia(compressed);
        await setDoc(doc(db, 'mapamundi_media', `map_${currentMapId}`), { img: compressed, mapId: String(currentMapId), kind: 'map', updatedAt: Date.now() });
        pushToast(`Mapa atualizado: ${currentMap.titulo}`, '🗺️', '#9B7CFF');
      } catch (err) {
        console.error('Erro ao enviar imagem do mapa:', err);
        pushToast('Não foi possível enviar esta imagem. Tente um arquivo menor.', '⚠️', '#F87171');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePinImageUpload = e => {
    const file = e.target.files?.[0];
    if (!file || !selPin) return;
    const pinId = String(selPin.id);
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const compressed = await compressAtlasMedia(ev.target.result, 'pin');
        setPinMedia(compressed);
        await setDoc(doc(db, 'mapamundi_media', `pin_${currentMapId}_${pinId}`), { img: compressed, mapId: String(currentMapId), pinId, kind: 'pin', updatedAt: Date.now() });
        pushToast('Imagem do local atualizada.', '✦', '#9B7CFF');
      } catch (err) {
        console.error('Erro ao enviar imagem do local:', err);
        pushToast('Não foi possível enviar esta imagem. Tente um arquivo menor.', '⚠️', '#F87171');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleMapClick = e => {
    if (!masterMode || dragging || !mapContentRef.current) return;
    if (e.target.closest?.('[data-map-pin="true"]')) return;
    const rect = mapContentRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newPin = {
      id, x, y,
      titulo: 'Novo local',
      descricao: '',
      tipo: 'cidade',
      descoberto: true,
      estado: 'descoberto',
      childMapId: '',
      imagemLocal: '',
    };
    updateCurrentMap({ pins: [...(currentMap.pins || []), newPin] });
    setSelectedPin(id);
  };

  const openChildMap = pin => {
    if (!pin?.childMapId || !atlas.maps[pin.childMapId]) return;
    setCurrentMapId(pin.childMapId);
  };

  const createChildMap = pin => {
    if (!pin) return;
    if (pin.childMapId && atlas.maps[pin.childMapId]) {
      setCurrentMapId(pin.childMapId);
      return;
    }
    const childId = `map_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const childMap = {
      id: childId,
      titulo: pin.titulo || 'Região detalhada',
      subtitulo: `Território de ${pin.titulo || 'novo local'}`,
      descricao: pin.descricao || '',
      img: '',
      parentId: currentMapId,
      parentPinId: pin.id,
      pins: [],
    };
    const pins = (currentMap.pins || []).map(p => String(p.id) === String(pin.id) ? { ...p, childMapId: childId } : p);
    persistAtlas({
      ...atlas,
      maps: {
        ...atlas.maps,
        [currentMapId]: { ...currentMap, pins },
        [childId]: childMap,
      }
    });
    const inheritedImage = String(pin.id)===String(selectedPin) ? selectedPinImage : (pin.imagemLocal || '');
    if (inheritedImage) setDoc(doc(db, 'mapamundi_media', `map_${childId}`), { img: inheritedImage, mapId: String(childId), kind: 'map', updatedAt: Date.now() }).catch(()=>{});
    setCurrentMapId(childId);
  };

  const goBack = () => {
    if (currentMap.parentId && atlas.maps[currentMap.parentId]) setCurrentMapId(currentMap.parentId);
  };

  const breadcrumb = [];
  let cursor = currentMap;
  const guard = new Set();
  while (cursor && !guard.has(cursor.id)) {
    breadcrumb.unshift(cursor);
    guard.add(cursor.id);
    cursor = cursor.parentId ? atlas.maps[cursor.parentId] : null;
  }

  const adjustZoom = delta => {
    setZoom(z => Math.max(1, Math.min(3.5, Number((z + delta).toFixed(2)))));
    if (zoom + delta <= 1) setPan({ x: 0, y: 0 });
  };

  const onWheel = e => {
    e.preventDefault();
    adjustZoom(e.deltaY < 0 ? 0.18 : -0.18);
  };

  const onPointerDown = e => {
    if (zoom <= 1 || e.button !== 0) return;
    setDragging(true);
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = e => {
    if (!dragging) return;
    const maxX = 420 * (zoom - 1);
    const maxY = 300 * (zoom - 1);
    setPan({
      x: Math.max(-maxX, Math.min(maxX, dragRef.current.panX + e.clientX - dragRef.current.x)),
      y: Math.max(-maxY, Math.min(maxY, dragRef.current.panY + e.clientY - dragRef.current.y)),
    });
  };

  const stopDrag = () => setTimeout(() => setDragging(false), 0);

  return (
    <div style={{ maxWidth: 1450, margin: '0 auto', padding: '24px 18px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.46em', color: '#5E5472', fontFamily: 'Cinzel,serif', marginBottom: 9, textTransform: 'uppercase' }}>{currentMap.subtitulo || 'Atlas de Cosmum'}</div>
          <h2 style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 25, color: '#E6DDF3', fontWeight: 700, margin: 0 }}>{currentMap.titulo || 'Mapa Múndi'}</h2>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
            {breadcrumb.map((map, i) => (
              <span key={map.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {i > 0 && <span style={{ color: '#40374E' }}>›</span>}
                <button onClick={() => setCurrentMapId(map.id)} style={{ border: 'none', background: 'transparent', padding: 0, color: i === breadcrumb.length - 1 ? '#9B7CFF' : '#6C617E', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10 }}>{map.titulo}</button>
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {currentMap.parentId && <button onClick={goBack} style={btnStyle('#9B7CFF')}>← Voltar ao mapa anterior</button>}
          {masterMode && <button onClick={() => fileRef.current?.click()} style={btnStyle('#9B7CFF')}>🗺 {mapImage ? 'Trocar imagem' : 'Enviar mapa'}</button>}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleMapUpload} style={{ display: 'none' }} />
        </div>
      </div>

      {!loaded && <div style={{ textAlign: 'center', color: '#61566F', fontFamily: 'Cinzel,serif', padding: 60 }}>Carregando o atlas...</div>}

      {loaded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(190px,240px) minmax(0,1fr)', gap: 14, alignItems: 'stretch' }} className="world-atlas-grid">
          <aside style={{ border: '1px solid rgba(155,124,255,0.15)', borderRadius: 14, background: 'rgba(7,5,13,0.92)', minHeight: 560, maxHeight: 'calc(100vh - 205px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '15px 14px 11px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontFamily: 'Cinzel,serif', fontSize: 10, color: '#9B7CFF', letterSpacing: '0.22em' }}>REGIÕES CONHECIDAS</div>
              <div style={{ fontSize: 11, color: '#4D455A', marginTop: 5 }}>{visiblePins.length} local{visiblePins.length !== 1 ? 'is' : ''} neste mapa</div>
            </div>
            <div style={{ padding: 9, overflowY: 'auto', flex: 1 }}>
              {visiblePins.length === 0 && <div style={{ padding: '28px 12px', textAlign: 'center', color: '#4D455A', fontSize: 12, lineHeight: 1.7 }}>{masterMode ? 'Clique sobre o mapa para criar o primeiro local.' : 'Nenhum local foi cadastrado nesta região.'}</div>}
              {visiblePins.map(pin => {
                const meta = TYPE_META[pin.tipo] || TYPE_META.desconhecido;
                const stateMeta = STATE_META[pin.estado || (pin.descoberto===false?'unknown':'descoberto')] || STATE_META.descoberto;
                const active = String(selectedPin) === String(pin.id);
                return (
                  <button key={pin.id} onClick={() => setSelectedPin(pin.id)} onDoubleClick={() => openChildMap(pin)} style={{ width: '100%', border: `1px solid ${active ? meta.color + '66' : 'rgba(255,255,255,0.055)'}`, background: active ? `${meta.color}12` : 'rgba(255,255,255,0.018)', borderRadius: 9, padding: '9px 10px', marginBottom: 7, color: active ? '#E8E0F2' : '#887D96', cursor: 'pointer', textAlign: 'left', display: 'flex', gap: 9, alignItems: 'center' }}>
                    <span style={{ width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center', background: `${meta.color}12`, border: `1px solid ${meta.color}33`, flexShrink: 0 }}>{meta.icon}</span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'block', fontFamily: 'Cinzel,serif', fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pin.titulo}</span>
                      <span style={{ display: 'block', fontSize: 9, color: stateMeta.color, marginTop: 3 }}>{pin.childMapId ? `Mapa detalhado · ${stateMeta.label}` : `${meta.label} · ${stateMeta.label}`}</span>
                    </span>
                    {pin.childMapId && <span style={{ color: meta.color }}>›</span>}
                  </button>
                );
              })}
            </div>
          </aside>

          <div style={{ minWidth: 0 }}>
            <div style={{ position: 'relative', height: 'calc(100vh - 205px)', minHeight: 560, maxHeight: 820, borderRadius: 15, overflow: 'hidden', border: '1px solid rgba(155,124,255,0.2)', background: '#05030A', boxShadow: '0 20px 65px rgba(0,0,0,0.62), 0 0 32px rgba(91,44,140,0.09)' }}>
              {!mapImage ? (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 40 }}>
                  <div>
                    <div style={{ fontSize: 48, opacity: 0.28, marginBottom: 14 }}>🗺️</div>
                    <div style={{ fontFamily: 'Cinzel,serif', fontSize: 14, color: '#71647F' }}>{masterMode ? 'Envie uma imagem para esta camada do mapa.' : 'Esta região ainda não possui um mapa revelado.'}</div>
                    {masterMode && <button onClick={() => fileRef.current?.click()} style={{ ...btnStyle('#9B7CFF'), marginTop: 16 }}>Enviar imagem</button>}
                  </div>
                </div>
              ) : (
                <div
                  onWheel={onWheel}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={stopDrag}
                  onPointerCancel={stopDrag}
                  onPointerLeave={() => dragging && stopDrag()}
                  style={{ position: 'absolute', inset: 0, overflow: 'hidden', cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : (masterMode ? 'crosshair' : 'default'), touchAction: 'none' }}
                >
                  <div
                    ref={mapContentRef}
                    onClick={handleMapClick}
                    style={{ position: 'absolute', inset: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center', transition: dragging ? 'none' : 'transform 0.22s ease-out' }}
                  >
                    <img src={mapImage} alt={currentMap.titulo} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', userSelect: 'none', pointerEvents: 'none' }} />
                    {visiblePins.map(pin => {
                      const meta = TYPE_META[pin.tipo] || TYPE_META.desconhecido;
                      const active = String(selectedPin) === String(pin.id);
                      return (
                        <button
                          key={pin.id}
                          data-map-pin="true"
                          onClick={e => { e.stopPropagation(); setSelectedPin(active ? null : pin.id); }}
                          onDoubleClick={e => { e.stopPropagation(); openChildMap(pin); }}
                          title={`${pin.titulo}${pin.childMapId ? ' · duplo clique para explorar' : ''}`}
                          style={{ position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%`, transform: `translate(-50%,-50%) scale(${1 / zoom})`, transformOrigin: 'center', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', zIndex: active ? 20 : 10 }}
                        >
                          <span style={{ width: active ? 44 : 36, height: active ? 44 : 36, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: active ? 18 : 15, background: active ? `${meta.color}32` : 'rgba(6,4,12,0.9)', border: `1px solid ${active ? meta.color : meta.color + '88'}`, boxShadow: active ? `0 0 0 5px ${meta.color}16, 0 0 22px ${meta.color}88` : `0 4px 16px rgba(0,0,0,.65),0 0 9px ${meta.color}33`, transition: 'all .22s' }}>{meta.icon}</span>
                          <span style={{ position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontFamily: 'Cinzel,serif', fontSize: 9, color: active ? '#EEE7F5' : '#B8ABCA', textShadow: '0 2px 5px #000,0 0 7px #000', letterSpacing: '.04em' }}>{pin.titulo}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ position: 'absolute', right: 14, bottom: 14, zIndex: 40, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={() => adjustZoom(0.25)} style={{ width: 35, height: 35, borderRadius: 9, border: '1px solid rgba(155,124,255,.28)', background: 'rgba(7,5,13,.92)', color: '#BDAAF8', cursor: 'pointer', fontSize: 18 }}>+</button>
                <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={{ width: 35, height: 35, borderRadius: 9, border: '1px solid rgba(155,124,255,.2)', background: 'rgba(7,5,13,.92)', color: '#706381', cursor: 'pointer', fontSize: 10 }}>{Math.round(zoom * 100)}%</button>
                <button onClick={() => adjustZoom(-0.25)} style={{ width: 35, height: 35, borderRadius: 9, border: '1px solid rgba(155,124,255,.28)', background: 'rgba(7,5,13,.92)', color: '#BDAAF8', cursor: 'pointer', fontSize: 18 }}>−</button>
              </div>

              {selPin && (
                <div style={{ position: 'absolute', left: 14, right: 62, bottom: 14, zIndex: 35, maxWidth: 570, padding: 14, borderRadius: 13, border: '1px solid rgba(155,124,255,.26)', background: 'rgba(6,4,12,.95)', boxShadow: '0 12px 32px rgba(0,0,0,.72)', backdropFilter:'none', animation: 'pageTurn .25s ease' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {selectedPinImage && <img src={selectedPinImage} alt="" style={{ width: 116, height: 84, borderRadius: 9, objectFit: 'cover', border: '1px solid rgba(255,255,255,.08)', flexShrink: 0 }} />}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {masterMode ? (
                        <>
                          <input value={selPin.titulo || ''} onChange={e => updatePin(selPin.id, { titulo: e.target.value })} style={{ width: '100%', fontFamily: 'Cinzel,serif', fontSize: 13, marginBottom: 7 }} />
                          <textarea value={selPin.descricao || ''} onChange={e => updatePin(selPin.id, { descricao: e.target.value })} placeholder="Descrição deste local..." rows={2} style={{ width: '100%', resize: 'vertical', lineHeight: 1.5, fontSize: 12 }} />
                          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 8 }}>
                            <select value={selPin.tipo || 'cidade'} onChange={e => updatePin(selPin.id, { tipo: e.target.value })} style={{ fontSize: 11, padding: '5px 8px' }}>
                              {Object.entries(TYPE_META).map(([id, m]) => <option key={id} value={id}>{m.icon} {m.label}</option>)}
                            </select>
                            <select value={selPin.estado || 'descoberto'} onChange={e => updatePin(selPin.id, { estado: e.target.value, descoberto: e.target.value === 'unknown' ? selPin.descoberto : true })} style={{ fontSize: 11, padding: '5px 8px' }}>
                              {Object.entries(STATE_META).map(([id,m]) => <option key={id} value={id}>{m.icon} {m.label}</option>)}
                            </select>
                            <button onClick={() => updatePin(selPin.id, { descoberto: selPin.descoberto === false })} style={btnStyle(selPin.descoberto === false ? '#6B6178' : '#6EE7B7')}>{selPin.descoberto === false ? '🔒 Oculto' : '👁 Revelado'}</button>
                            <button onClick={() => pinImageRef.current?.click()} style={btnStyle('#38BDF8')}>🖼 Miniatura</button>
                            <input ref={pinImageRef} type="file" accept="image/*" onChange={handlePinImageUpload} style={{ display: 'none' }} />
                            <button onClick={() => createChildMap(selPin)} style={btnStyle('#9B7CFF')}>{selPin.childMapId ? 'Abrir mapa detalhado ›' : 'Criar mapa detalhado ›'}</button>
                            <button onClick={() => deletePin(selPin.id)} style={btnStyle('#F87171')}>🗑</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 14, color: '#DCD2E9', fontWeight: 700 }}>{selPin.titulo}</div>
                          <div style={{ color: '#91849E', fontSize: 12, lineHeight: 1.65, marginTop: 6, whiteSpace: 'pre-line' }}>{selPin.descricao || 'Este local ainda guarda seus segredos.'}</div>
                          {selPin.childMapId && <button onClick={() => openChildMap(selPin)} style={{ ...btnStyle('#9B7CFF'), marginTop: 9 }}>Explorar região ›</button>}
                        </>
                      )}
                    </div>
                    <button onClick={() => setSelectedPin(null)} style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', color: '#62576F', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 3px 0', color: '#51475E', fontSize: 10, fontFamily: 'Cinzel,serif' }}>
              <span>{masterMode ? 'Clique para adicionar · arraste quando ampliar · duplo clique em um local para entrar' : 'Clique nos locais · use a roda do mouse para ampliar · duplo clique para explorar'}</span>
              <span>{currentMap.descricao}</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media(max-width:800px){
          .world-atlas-grid{grid-template-columns:1fr!important;}
          .world-atlas-grid aside{min-height:0!important;max-height:210px!important;}
        }
      `}</style>
    </div>
  );
}


export default MapaMundiSection;

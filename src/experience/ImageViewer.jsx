import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './image-viewer.css';

export default function ImageViewer({ src, title = 'Imagem ampliada', onClose, onPrevious, onNext, counter }) {
  const dialog = useRef(null);
  const close = useRef(onClose);
  const [zoom, setZoom] = useState(false);
  const [failed, setFailed] = useState(false);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const node = dialog.current;
    node.showModal();
    return () => { node.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => { setZoom(false); setFailed(false); }, [src]);
  return createPortal(<dialog ref={dialog} className="de-image-viewer" aria-label={title}
    onCancel={event => { event.preventDefault(); close.current(); }}
    onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'ArrowLeft' && onPrevious) { event.preventDefault(); onPrevious(); }
      if (event.key === 'ArrowRight' && onNext) { event.preventDefault(); onNext(); }
    }}>
    <header className="de-image-toolbar">
      <div><strong>{title}</strong>{counter && <small aria-live="polite">{counter}</small>}</div>
      <nav aria-label="Controles da imagem">
        {counter && <><button type="button" title="Imagem anterior" aria-label="Imagem anterior" disabled={!onPrevious} onClick={onPrevious}>&#8249;</button><button type="button" title="Próxima imagem" aria-label="Próxima imagem" disabled={!onNext} onClick={onNext}>&#8250;</button></>}
        <button type="button" aria-pressed={zoom} title={zoom ? 'Ajustar à tela' : 'Ampliar imagem'} aria-label={zoom ? 'Ajustar à tela' : 'Ampliar imagem'} onClick={() => setZoom(value => !value)}>{zoom ? '−' : '+'}</button>
        <button type="button" autoFocus onClick={onClose}>Fechar imagem</button>
      </nav>
    </header>
    <div className={`de-image-viewport ${zoom ? 'zoomed' : ''}`} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      {failed ? <p role="alert">Não foi possível carregar esta imagem. Feche e tente novamente.</p> : <img src={src} alt={title} onError={() => setFailed(true)} />}
    </div>
  </dialog>, document.body);
}

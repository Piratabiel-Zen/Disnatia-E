import { useEffect, useRef, useState } from 'react';
import { useExperience } from '../experience/ExperienceKit.generated';
import { focusDestination } from './sessionModel';

export default function SessionLink({ masterMode, onNavigate }) {
  const { session } = useExperience();
  const navigate = useRef(onNavigate);
  const seen = useRef('');
  const [notice, setNotice] = useState('');
  navigate.current = onNavigate;
  useEffect(() => {
    const focus = session?.partyFocus;
    if (masterMode || !focus?.id || seen.current === focus.id) return;
    seen.current = focus.id;
    const mobile = window.matchMedia('(max-width: 900px)').matches;
    const destination = focusDestination(focus, mobile);
    if (!destination) return;
    const editing = document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');
    if (editing) { setNotice(destination); return; }
    navigate.current(destination);
  }, [session?.partyFocus?.id, masterMode]);
  if (!notice) return null;
  return <div className="ad-follow-notice" role="status"><span>O mestre reuniu o grupo em outra tela.</span><button onClick={() => { onNavigate(notice); setNotice(''); }}>Acompanhar</button><button aria-label="Continuar nesta tela" onClick={() => setNotice('')}>×</button></div>;
}

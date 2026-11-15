// Senha de entrada da mesa, trocada pelo Mestre de dentro do próprio login.
// Vale para a mesa em que ele está; cada mesa tem a sua.
import { useEffect, useState } from 'react';
import { setDoc } from 'firebase/firestore';
import { globalDoc } from '../core/campaign';
import { hashPassword, normalizePassword, rememberUnlock } from '../core/campaignPassword.mjs';
import PasswordVisibilityInput from '../experience/PasswordVisibilityInput';
import { pushToast } from '../core/toast';
import './senha-da-mesa.css';

export default function CampaignPasswordButton({ campaign }) {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!campaign?.id) return null;
  const close = () => { setOpen(false); setWord(''); setAgain(''); setError(''); };

  const save = async event => {
    event.preventDefault();
    if (busy) return;
    const clean = normalizePassword(word);
    if (clean.length < 3) { setError('Use pelo menos 3 letras ou números.'); return; }
    if (clean !== normalizePassword(again)) { setError('As duas senhas não são iguais.'); return; }
    setBusy(true); setError('');
    try {
      const passwordHash = await hashPassword(clean);
      // merge: só a senha muda; nome, tema e o resto do registro da mesa ficam como estão.
      await setDoc(globalDoc('campaigns', campaign.id), { passwordHash, passwordUpdatedAt: Date.now() }, { merge: true });
      // Este aparelho já conhece a senha nova e não é mandado de volta à porta.
      rememberUnlock(campaign.id, passwordHash);
      pushToast('Senha da mesa atualizada. Quem entrar agora precisa da nova.', '🔑', '#A855F7');
      close();
    } catch (_) {
      setError('Não foi possível salvar a senha. Confira a conexão e tente de novo.');
    } finally { setBusy(false); }
  };

  return (
    <>
      <button type="button" className="mesa-senha-button" onClick={() => setOpen(true)} title="Trocar a senha de entrada desta mesa">🔑 Senha da mesa</button>
      {open && (
        <div className="mesa-senha-backdrop" onClick={close}>
          <form className="mesa-senha-dialog" role="dialog" aria-modal="true" aria-label="Senha da mesa" onClick={event => event.stopPropagation()} onSubmit={save}>
            <h3>Senha de entrada de {campaign.name || 'esta mesa'}</h3>
            <p>É a palavra que os jogadores dizem no portal para entrar. Ao trocar, quem já estava dentro precisa digitar a nova na próxima visita.</p>
            <label>Nova senha
              <PasswordVisibilityInput value={word} autoFocus onChange={event => { setWord(event.target.value); setError(''); }} placeholder="Nova palavra de passagem" />
            </label>
            <label>Repita a nova senha
              <PasswordVisibilityInput value={again} onChange={event => { setAgain(event.target.value); setError(''); }} placeholder="Para evitar erro de digitação" />
            </label>
            {error && <div className="mesa-senha-error" role="alert">{error}</div>}
            <div className="mesa-senha-actions">
              <button type="button" onClick={close}>Cancelar</button>
              <button type="submit" className="is-primary" disabled={busy || !word || !again}>{busy ? 'Salvando...' : 'Salvar senha'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

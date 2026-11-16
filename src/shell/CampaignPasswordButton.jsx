// Senha de entrada da mesa, trocada pelo Mestre de dentro do próprio login.
// Vale para a mesa em que ele está; cada mesa tem a sua.
import { useEffect, useState } from 'react';
import { setDoc } from 'firebase/firestore';
import { globalDoc } from '../core/campaign';
import { hashPassword, normalizePassword, rememberUnlock } from '../core/campaignPassword.mjs';
import PasswordVisibilityInput from '../experience/PasswordVisibilityInput';
import { pushToast } from '../core/toast';
import './senha-da-mesa.css';

/**
 * Troca uma das duas senhas da mesa.
 *
 *   • A de ENTRADA é o que os jogadores digitam no portal.
 *   • A de MESTRE é o que dá o comando da mesa.
 *
 * São coisas diferentes e por isso são dois botões, não um seletor: um Mestre
 * com pressa trocaria a errada.
 */
export default function CampaignPasswordButton({ campaign, tipo = 'entrada' }) {
  const deMestre = tipo === 'mestre';
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
      if (deMestre) {
        await setDoc(globalDoc('campaigns', campaign.id), { masterPinHash: passwordHash, masterPinUpdatedAt: Date.now() }, { merge: true });
        pushToast('Senha de Mestre atualizada para esta mesa.', '⚔', '#C9A96E');
      } else {
        // merge: só a senha muda; nome, tema e o resto do registro ficam.
        await setDoc(globalDoc('campaigns', campaign.id), { passwordHash, passwordUpdatedAt: Date.now() }, { merge: true });
        // Este aparelho já conhece a senha nova e não volta para a porta.
        rememberUnlock(campaign.id, passwordHash);
        pushToast('Senha da mesa atualizada. Quem entrar agora precisa da nova.', '🔑', '#A855F7');
      }
      close();
    } catch (erro) {
      // A recusa mais provável não é conexão: é não ser Admin desta mesa.
      setError(erro?.code === 'permission-denied'
        ? 'Só o Mestre desta mesa pode trocar a senha. Entre na conta que criou a mesa.'
        : 'Não foi possível salvar a senha. Confira a conexão e tente de novo.');
    } finally { setBusy(false); }
  };

  return (
    <>
      <button
        type="button" className="mesa-senha-button" onClick={() => setOpen(true)}
        title={deMestre ? 'Trocar a senha de Mestre desta mesa' : 'Trocar a senha de entrada desta mesa'}
      >{deMestre ? '⚔ Senha de Mestre' : '🔑 Senha da mesa'}</button>
      {open && (
        <div className="mesa-senha-backdrop" onClick={close}>
          <form className="mesa-senha-dialog" role="dialog" aria-modal="true" aria-label="Senha da mesa" onClick={event => event.stopPropagation()} onSubmit={save}>
            <h3>{deMestre ? 'Senha de Mestre' : 'Senha de entrada'} de {campaign.name || 'esta mesa'}</h3>
            <p>{deMestre
              ? 'É o que dá o comando desta mesa, e vale só aqui: quem a souber não vira Mestre de nenhuma outra campanha.'
              : 'É a palavra que os jogadores dizem no portal para entrar. Ao trocar, quem já estava dentro precisa digitar a nova na próxima visita.'}</p>
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

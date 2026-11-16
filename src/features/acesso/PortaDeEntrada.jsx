import { useEffect, useState } from 'react';
import {
  aoMudarConta, auth, criarConta, entrar, entrarComGoogle, mensagemDeErro, sair,
} from '../../core/auth';
import './porta.css';

/**
 * A PORTA DE ENTRADA
 *
 * Conta e senha da mesa são coisas diferentes, e a tela precisa deixar isso
 * óbvio, senão a pessoa digita a senha da campanha no campo da conta e conclui
 * que o site está quebrado.
 *
 *   • A CONTA é da pessoa. Dá identidade — é o que permite ao Admin liberar um
 *     documento "para a Ana" e não para o resto da mesa.
 *   • A SENHA DA MESA é da campanha, usada uma vez, na hora de entrar nela.
 *
 * A Dinastia E continua entrando sem conta nenhuma: ela é anterior a isto e
 * não vai parar no meio da campanha para alguém se cadastrar.
 */
export default function PortaDeEntrada({ aoEntrar }) {
  const [usuario, setUsuario] = useState(() => auth.currentUser);
  const [modo, setModo] = useState('entrar');
  const [form, setForm] = useState({ nome: '', email: '', senha: '' });
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => aoMudarConta(conta => {
    setUsuario(conta);
    if (conta) aoEntrar?.(conta);
  }), [aoEntrar]);

  const campo = chave => evento => setForm({ ...form, [chave]: evento.target.value });

  const enviar = async evento => {
    evento.preventDefault();
    if (ocupado) return;
    setOcupado(true); setErro('');
    try {
      if (modo === 'criar') await criarConta(form);
      else await entrar(form.email, form.senha);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally { setOcupado(false); }
  };

  const comGoogle = async () => {
    if (ocupado) return;
    setOcupado(true); setErro('');
    try { await entrarComGoogle(); }
    catch (e) { setErro(mensagemDeErro(e)); }
    finally { setOcupado(false); }
  };

  if (usuario) {
    return (
      <div className="porta porta-dentro">
        <div>
          <span className="porta-rotulo">Sua conta</span>
          <strong>{usuario.displayName || usuario.email}</strong>
        </div>
        <button type="button" className="porta-sair" onClick={() => sair()}>Sair</button>
      </div>
    );
  }

  return (
    <form className="porta" onSubmit={enviar}>
      <div className="porta-topo">
        <span className="porta-rotulo">Sua conta</span>
        <div className="porta-abas">
          <button type="button" data-ativa={modo === 'entrar'} onClick={() => { setModo('entrar'); setErro(''); }}>Entrar</button>
          <button type="button" data-ativa={modo === 'criar'} onClick={() => { setModo('criar'); setErro(''); }}>Criar conta</button>
        </div>
      </div>

      <p className="porta-explica">
        A conta é sua e vale para o site inteiro. A senha de cada mesa é outra
        coisa, e é pedida só quando você entrar nela.
      </p>

      {modo === 'criar' && (
        <label className="porta-campo">
          <span>Como a mesa te chama</span>
          <input value={form.nome} onChange={campo('nome')} autoComplete="nickname" placeholder="Seu nome na mesa" />
        </label>
      )}
      <label className="porta-campo">
        <span>E-mail</span>
        <input type="email" required value={form.email} onChange={campo('email')} autoComplete="email" />
      </label>
      <label className="porta-campo">
        <span>Senha</span>
        <input
          type="password" required minLength={6} value={form.senha} onChange={campo('senha')}
          autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
        />
      </label>

      {erro && <p className="porta-erro" role="alert">{erro}</p>}

      <button type="submit" className="porta-principal" disabled={ocupado}>
        {ocupado ? 'Um momento…' : modo === 'criar' ? 'Criar minha conta' : 'Entrar'}
      </button>

      <div className="porta-ou"><i /><span>ou</span><i /></div>

      <button type="button" className="porta-google" onClick={comGoogle} disabled={ocupado}>
        Entrar com Google
      </button>
    </form>
  );
}

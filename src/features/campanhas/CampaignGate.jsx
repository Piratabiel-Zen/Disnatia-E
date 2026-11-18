// Antes de entrar na mesa: escolher a campanha.
// A Dinastia E existe sempre, mesmo que o Firestore esteja vazio. O Mestre pode
// criar outras mesas, cada uma com seu tema e seu conjunto de dados.
import { useEffect, useMemo, useState } from 'react';
import { deleteDoc, setDoc } from 'firebase/firestore';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { globalCol, globalDoc } from '../../core/campaign';
import {
  CAMPAIGN_THEMES, PRIMARY_CAMPAIGN, PRIMARY_CAMPAIGN_ID, campaignSlug, campaignTheme,
} from '../../core/campaign';
import PasswordVisibilityInput from '../../experience/PasswordVisibilityInput';
import { isUnlocked, rememberUnlock, requiredPasswordHash, tryUnlock } from '../../core/campaignPassword.mjs';
import './campanhas.css';
import './portais.css';
import { SISTEMA_PADRAO, listaDeSistemas } from '../../core/sistemas/index.mjs';
import PortaDeEntrada from '../acesso/PortaDeEntrada';
import LegalPage from '../legal/LegalPage';
import { aoMudarConta, assumirMesa, auth, definirSegredosDaMesa, entrarNaMesa, lerMembro, mensagemDeErro } from '../../core/auth';

// Gerenciar a lista de mesas continua pedindo a senha da campanha principal:
// é a chave de quem administra o site, não a de nenhuma mesa específica.
import { PRIMARY_MASTER_PIN_HASH, hashPassword, normalizePassword } from '../../core/campaignPassword.mjs';

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value || '').trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Cada mesa é um portal: um astrolábio que gira devagar em volta do sigilo.
// Escolher a mesa abre o portal; se ela tem senha, é ali mesmo que se diz a
// palavra de passagem.
function CampaignPortal({ campaign, onEnter, onRemove, canManage, contaUid, removendo }) {
  // REMOVER SÓ APARECE NA MESA QUE ESTA CONTA CRIOU.
  //
  // Entrar no modo de gerência não é um passe para apagar a mesa dos outros.
  // Quem abriu a campanha é quem responde por ela, e é o único a ver o botão.
  //
  // A exceção são as mesas feitas antes de existir o campo de dono: ninguém
  // é dono delas, e sem isto ficariam na lista para sempre sem que nenhuma
  // conta pudesse removê-las.
  const souQuemCriou = Boolean(contaUid) && String(campaign.criadoPor || '') === String(contaUid);
  const mesaOrfa = !campaign.criadoPor;
  const podeRemover = canManage && !campaign.primary && (souQuemCriou || mesaOrfa);
  const theme = campaignTheme(campaign);
  const locked = Boolean(requiredPasswordHash(campaign)) && !isUnlocked(campaign);
  const [asking, setAsking] = useState(false);
  const [word, setWord] = useState('');
  const [wrong, setWrong] = useState(false);
  const [checking, setChecking] = useState(false);
  const [aviso, setAviso] = useState('');

  // ENTRAR É VIRAR MEMBRO. NÃO BASTA ABRIR A PORTA.
  //
  // Antes isto era `if (locked) perguntar; senão entrar` — e as duas formas de
  // não estar trancado deixavam a pessoa entrar sem registro nenhum no
  // servidor: mesa sem senha definida, e aparelho que já guardava o resumo da
  // senha de uma visita anterior. Quem entrava assim virava um fantasma: a
  // tela montava a mesa inteira e o servidor negava cada pedido, um por um.
  // O sintoma era o pior possível de diagnosticar — "Desconectado" no canto e
  // todas as abas vazias, sem nenhum erro à vista.
  //
  // Agora: já é membro, entra. Não é e a mesa tem senha, a senha é pedida,
  // mesmo que o aparelho ache que já passou por aqui. Não é e a mesa não tem
  // senha, o registro é criado na hora — é o que "mesa aberta" sempre quis
  // dizer, e agora o servidor concorda com a tela.
  const enter = async () => {
    if (locked) { setAsking(true); return; }
    if (campaign.primary) { onEnter(campaign); return; }
    if (!auth.currentUser) {
      setAviso('Entre com seu e-mail ou com o Google ali em cima antes: a mesa só carrega para quem está identificado.');
      return;
    }
    setChecking(true);
    try {
      if (await lerMembro(campaign.id, auth.currentUser.uid)) {
        setChecking(false);
        onEnter(campaign);
        return;
      }
      if (requiredPasswordHash(campaign)) {
        // O aparelho guardou a senha, o servidor não conhece a pessoa. Pedir
        // de novo é o único caminho: é a senha que prova quem pode entrar.
        setChecking(false);
        rememberUnlock(campaign.id, '');
        setAsking(true);
        return;
      }
      await entrarNaMesa({ campanhaId: campaign.id, papel: 'jogador', semSenha: true });
      setChecking(false);
      onEnter(campaign);
    } catch (erro) {
      setChecking(false);
      setAviso(erro?.message || 'Não foi possível entrar nesta mesa.');
    }
  };
  const speak = async event => {
    event?.preventDefault();
    if (!word || checking) return;
    setChecking(true);
    const ok = await tryUnlock(campaign, word);
    if (!ok) { setChecking(false); setWrong(true); setWord(''); return; }

    // Acertar a senha abre a tela. O que faz a mesa CARREGAR é virar membro
    // no servidor — as regras só entregam os dados de uma campanha para quem
    // tem registro de membro nela. Enquanto isto não era feito, quem não
    // tinha criado a mesa entrava num cômodo vazio: o navegador pedia tudo e
    // o servidor negava tudo, sem erro visível.
    //
    // A Dinastia E é a exceção: ela é anterior às regras e seus dados estão
    // nas coleções antigas, abertas. Ela não espera ninguém se cadastrar.
    if (!campaign.primary) {
      try {
        await entrarNaMesa({ campanhaId: campaign.id, senha: word, papel: 'jogador' });
      } catch (erro) {
        setChecking(false);
        setWord('');
        setAviso(!auth.currentUser
          ? 'Entre com seu e-mail ou com o Google ali em cima antes: a mesa só carrega para quem está identificado.'
          : (erro?.message || 'Não foi possível entrar nesta mesa.'));
        return;
      }
    }
    setChecking(false);
    onEnter(campaign);
  };

  return (
    <article
      className={`portal${campaign.primary ? ' is-primary' : ''}${asking ? ' is-asking' : ''}${wrong ? ' is-wrong' : ''}`}
      style={{ '--portal-accent': theme.accent, '--portal-soft': theme.accentSoft }}
    >
      <button type="button" className="portal-orbit" onClick={enter} aria-label={`Entrar na mesa ${campaign.name}`}>
        <span className="portal-ring portal-ring-a" aria-hidden="true" />
        <span className="portal-ring portal-ring-b" aria-hidden="true" />
        <span className="portal-ring portal-ring-c" aria-hidden="true" />
        <span className="portal-core" aria-hidden="true">{campaign.sigil || theme.sigil}</span>
      </button>
      <div className="portal-text">
        <h2>{campaign.name}</h2>
        <span className="portal-where">{[campaign.genre || theme.label, campaign.world].filter(Boolean).join(', em ')}</span>
        <p>{campaign.tagline || 'Uma mesa à espera da primeira cena.'}</p>
      </div>
      {asking ? (
        <form className="portal-word" onSubmit={speak}>
          <label>
            Palavra de passagem
            <PasswordVisibilityInput
              value={word}
              autoFocus
              onChange={event => { setWord(event.target.value); setWrong(false); setAviso(''); }}
              placeholder="Diga a palavra para atravessar"
            />
          </label>
          {wrong ? <span className="portal-word-error" role="alert">O portal não reconheceu essa palavra. Tente de novo.</span> : null}
          {aviso ? <span className="portal-word-error" role="alert">{aviso}</span> : null}
          <div className="portal-word-actions">
            <button type="submit" className="portal-enter" disabled={!word || checking}>{checking ? 'Abrindo...' : 'Atravessar'}</button>
            <button type="button" className="portal-back" onClick={() => { setAsking(false); setWord(''); setWrong(false); }}>Voltar</button>
          </div>
        </form>
      ) : (
        <div className="portal-actions">
          <button type="button" className="portal-enter" onClick={enter}>{locked ? 'Entrar com senha' : 'Entrar na mesa'}</button>
          {podeRemover ? (
            <button
              type="button" className="portal-back" disabled={removendo}
              onClick={() => onRemove(campaign)}
              title={mesaOrfa
                ? 'Mesa antiga, sem dono registrado: qualquer conta pode retirá-la da lista'
                : 'Remover esta mesa, que foi criada por você'}
            >{removendo ? 'Removendo...' : 'Remover'}</button>
          ) : null}
        </div>
      )}
    </article>
  );
}

export default function CampaignGate({ onChoose }) {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [manage, setManage] = useState(false);
  const [removendoId, setRemovendoId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ name: '', genre: '', world: '', tagline: '', theme: 'sombrio', sistema: SISTEMA_PADRAO, senhaMesa: '', senhaMestre: '' });
  const [conta, setConta] = useState(() => auth.currentUser);
  const [legal, setLegal] = useState(null);
  useEffect(() => aoMudarConta(setConta), []);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(globalCol('campaigns'), snap => {
      setRows(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoaded(true);
    }, () => setLoaded(true));
    return () => unsub();
  }, []);

  // A campanha principal nunca depende do banco: se não houver registro, ela existe de todo modo.
  const campaigns = useMemo(() => {
    const stored = rows.filter(row => row.active !== false && row.id !== PRIMARY_CAMPAIGN_ID);
    const primaryRow = rows.find(row => row.id === PRIMARY_CAMPAIGN_ID);
    const primary = { ...PRIMARY_CAMPAIGN, ...(primaryRow || {}), primary: true };
    return [primary, ...stored.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'))];
  }, [rows]);

  const unlockManage = async () => {
    if (await sha256(pin) !== PRIMARY_MASTER_PIN_HASH) { setError('Senha do Mestre incorreta.'); return; }
    setManage(true); setPin(''); setError('');
  };

  const createCampaign = async () => {
    const name = draft.name.trim();
    if (!name || busy) return;
    // Sem conta não dá para criar: a mesa precisa de um Admin, e Admin é uma
    // pessoa identificada. Sem isso ela nasceria sem dono e trancada.
    if (!conta) { setError('Entre na sua conta para criar uma mesa.'); return; }
    // As duas senhas são pedidas aqui porque depois não há como pedir: a mesa
    // nasceria aberta a qualquer um que tenha o link, e sem ninguém capaz de
    // virar Mestre por senha.
    const senhaMesa = normalizePassword(draft.senhaMesa);
    const senhaMestre = normalizePassword(draft.senhaMestre);
    if (senhaMesa.length < 3) { setError('A senha de entrada precisa de pelo menos 3 letras ou números.'); return; }
    if (senhaMestre.length < 3) { setError('A senha de Mestre precisa de pelo menos 3 letras ou números.'); return; }
    if (senhaMesa === senhaMestre) { setError('As duas senhas precisam ser diferentes: uma abre a mesa, a outra dá o comando dela.'); return; }
    setBusy(true); setError('');
    const id = campaignSlug(name);
    try {
      if (id === PRIMARY_CAMPAIGN_ID || campaigns.some(c => c.id === id)) {
        setError('Já existe uma mesa com esse nome.');
        return;
      }
      await setDoc(globalDoc('campaigns', id), {
        name,
        genre: draft.genre.trim() || CAMPAIGN_THEMES[draft.theme].label,
        world: draft.world.trim(),
        tagline: draft.tagline.trim(),
        theme: draft.theme,
        // O sistema decide ficha, dados, condições e vocabulário da mesa.
        sistema: draft.sistema,
        sigil: CAMPAIGN_THEMES[draft.theme].sigil,
        active: true,
        // Quem criou é o Admin. Sem este campo, as regras não teriam como
        // deixar o criador entrar na própria mesa: elas exigem ser membro, e
        // virar membro exigiria uma senha que só o Admin pode definir.
        criadoPor: conta.uid,
        // A senha de entrada e a de Mestre, cada mesa com as suas. Só os
        // resumos; o texto nunca vai para o banco.
        passwordHash: await hashPassword(senhaMesa),
        masterPinHash: await hashPassword(senhaMestre),
        createdAt: Date.now(),
      });
      // Os mesmos resumos vão para o documento privado, que é de onde as
      // regras os leem. Sem este passo a mesa nasce sem porta: só o criador
      // entra, e qualquer outra pessoa digita a senha certa e mesmo assim não
      // vira membro — foi assim que a Estrela de Absinto nasceu trancada.
      await definirSegredosDaMesa(id, {
        senhaMesaHash: await hashPassword(senhaMesa),
        senhaMestreHash: await hashPassword(senhaMestre),
      });
      // E vira Admin dela no mesmo gesto, senão a mesa nasce trancada.
      await assumirMesa(id, conta.displayName || conta.email || '');
      setDraft({ name: '', genre: '', world: '', tagline: '', theme: 'sombrio', sistema: SISTEMA_PADRAO, senhaMesa: '', senhaMestre: '' });
    } catch {
      setError('Não foi possível criar a mesa. Confira sua conexão.');
    } finally { setBusy(false); }
  };

  const removeCampaign = async campaign => {
    if (campaign.primary || removendoId) return;
    setRemovendoId(String(campaign.id));
    setError('');
    // A mesa sai da lista ANTES da resposta do servidor.
    //
    // O apagar chega até o Firestore e volta pelo onSnapshot, e essa volta
    // leva um instante — tempo suficiente para a pessoa achar que o clique
    // não pegou e clicar de novo. Tirando na hora, a tela responde ao gesto;
    // se o servidor recusar, a mesa volta para a lista com o motivo.
    setRows(atuais => atuais.filter(row => String(row.id) !== String(campaign.id)));
    try {
      // A ORDEM IMPORTA, E EU JÁ ERREI ELA AQUI.
      //
      // A primeira versão apagava o registro de MEMBRO antes do registro da
      // mesa. Só que é esse registro de membro que diz que você é Mestre — e
      // é por ele que o servidor autoriza apagar a mesa. Apagando primeiro,
      // o código tirava a própria autoridade de que precisava no passo
      // seguinte, e o Firestore recusava a remoção. Quanto mais se clicava,
      // mais garantido ficava o fracasso.
      //
      // A ordem certa é: usar a autoridade enquanto se tem, e limpar depois.
      //
      //  1. a senha, que PRECISA sair antes da mesa: a regra que a protege
      //     pergunta quem é o dono, e para responder lê o registro da mesa.
      //     Com a mesa apagada, ela ficaria trancada para sempre — e uma
      //     mesa nova com o mesmo id herdaria a senha antiga;
      //  2. a mesa, que é o que a pessoa pediu;
      //  3. o registro de membro, que é só faxina.
      //
      // Os passos 1 e 3 falham em silêncio: se já não existirem, ou se esta
      // conta não alcançar, o que importa é a mesa ter saído.
      await deleteDoc(globalDoc('campaigns', campaign.id, 'privado', 'acesso')).catch(() => {});
      // Só sai da lista: os dados da mesa continuam guardados e voltam se ela for recriada.
      await deleteDoc(globalDoc('campaigns', campaign.id));
      if (conta?.uid) {
        await deleteDoc(globalDoc('campaigns', campaign.id, 'membros', conta.uid)).catch(() => {});
      }
    } catch (erro) {
      setRows(atuais => (atuais.some(row => String(row.id) === String(campaign.id))
        ? atuais
        : [...atuais, campaign]));
      // Mensagem que diz o que fazer, e não só que deu errado. Quando a
      // recusa vem do servidor, o que decide é quem está em criadoPor — e o
      // navegador sabe disso, então dá para apontar o caminho em vez de
      // repetir "sem permissão".
      const meu = String(campaign.criadoPor || '') === String(conta?.uid || '');
      setError(erro?.code !== 'permission-denied'
        ? mensagemDeErro(erro)
        : !conta
          ? 'Entre na sua conta para remover uma mesa.'
          : meu
            ? 'O servidor recusou a remoção desta mesa, que foi criada por você. Publique a versão mais recente das regras do Firestore e tente de novo.'
            : 'Esta mesa foi criada por outra conta. Entre com a conta que a criou para removê-la.');
      console.error('Não foi possível remover a mesa:', campaign.id, erro);
    } finally {
      setRemovendoId('');
    }
  };

  return (
    <div className="campaign-gate">
      <div className="portal-sky" aria-hidden="true"><i /><i /><i /></div>
      <section className="campaign-panel">
        <header className="portal-head">
          <h1>Escolha a mesa</h1>
          <p>Cada portal leva a um mundo, com seus personagens, mapas e crônicas.</p>
        </header>

        {/* A conta fica aqui, não barrando a porta: a Dinastia E é anterior a
            isto e não vai parar no meio da campanha para alguém se cadastrar.
            Mesas novas é que precisam dela, porque sem identidade não existe
            "liberar este documento só para a Ana". */}
        <div className="campaign-conta">
          <PortaDeEntrada />
        </div>

        <div className={`portal-row${campaigns.length === 1 ? ' is-single' : ''}`}>
          {campaigns.map(campaign => (
            <CampaignPortal
              key={campaign.id + ':' + requiredPasswordHash(campaign)}
              campaign={campaign}
              onEnter={onChoose}
              onRemove={removeCampaign}
              canManage={manage}
              contaUid={conta?.uid || ''}
              removendo={removendoId === String(campaign.id)}
            />
          ))}
        </div>

        {!loaded ? <p className="campaign-loading">Consultando as mesas...</p> : null}

        {manage ? (
          <section className="campaign-new">
            <h3>Abrir uma nova mesa</h3>
            <div className="campaign-new-grid">
              <label>Nome
                <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Estrela de Absinto" />
              </label>
              <label>Tipo
                <select value={draft.theme} onChange={e => setDraft({ ...draft, theme: e.target.value })}>
                  {Object.entries(CAMPAIGN_THEMES).map(([key, theme]) => (
                    <option key={key} value={key}>{theme.sigil} {theme.label}</option>
                  ))}
                </select>
              </label>
              <label>Sistema
                <select value={draft.sistema} onChange={e => setDraft({ ...draft, sistema: e.target.value })}>
                  {listaDeSistemas().map(sistema => (
                    <option key={sistema.id} value={sistema.id}>{sistema.nome} · {sistema.dados.notacao}</option>
                  ))}
                </select>
              </label>
              <label>Mundo
                <input value={draft.world} onChange={e => setDraft({ ...draft, world: e.target.value })} placeholder="Onde se passa" />
              </label>
              <label>Senha de entrada
                <input
                  value={draft.senhaMesa} type="text" autoComplete="off"
                  onChange={e => setDraft({ ...draft, senhaMesa: e.target.value })}
                  placeholder="O que os jogadores digitam"
                />
              </label>
              <label>Senha de Mestre
                <input
                  value={draft.senhaMestre} type="text" autoComplete="off"
                  onChange={e => setDraft({ ...draft, senhaMestre: e.target.value })}
                  placeholder="Só você"
                />
              </label>
              <label className="campaign-new-wide">Chamada
                <input value={draft.tagline} onChange={e => setDraft({ ...draft, tagline: e.target.value })} placeholder="Uma linha que resume a mesa" />
              </label>
            </div>
            <button
              className="campaign-create"
              disabled={!draft.name.trim() || busy || !conta}
              title={conta ? undefined : 'Entre na sua conta primeiro'}
              onClick={createCampaign}
            >
              {busy ? 'Criando...' : 'Criar mesa'}
            </button>
          </section>
        ) : (
          <div className="campaign-manage-toggle">
            <label className="campaign-field">
              Senha do Mestre para gerenciar as mesas
              <PasswordVisibilityInput
                value={pin}
                onChange={e => { setPin(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && unlockManage()}
                placeholder="Apenas para criar ou remover mesas"
              />
            </label>
            <button disabled={!pin} onClick={unlockManage}>Gerenciar</button>
          </div>
        )}

        {error ? <div className="campaign-error" role="alert">{error}</div> : null}
        {/* Documentos legais: precisam ser alcançáveis sem login, porque quem
            ainda não criou conta é justamente quem precisa lê-los antes. */}
        <footer className="campaign-legal">
          <a href="#privacidade" onClick={e => { e.preventDefault(); setLegal('privacidade'); }}>Privacidade</a>
          <i aria-hidden="true">·</i>
          <a href="#termos" onClick={e => { e.preventDefault(); setLegal('termos'); }}>Termos de uso</a>
        </footer>
      </section>

      {legal && (
        <div className="campaign-legal-janela" role="dialog" aria-modal="true" aria-label="Documentos legais">
          <button type="button" className="campaign-legal-fechar" onClick={() => setLegal(null)}>Fechar</button>
          <LegalPage inicial={legal} />
        </div>
      )}
    </div>
  );
}

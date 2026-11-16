/* OS DOCUMENTOS LEGAIS
   Não são decoração: a LGPD lista o que precisa estar neles, e a ANPD colocou
   os direitos do titular entre os temas prioritários de fiscalização. Estes
   testes impedem que um item exigido por lei suma numa edição futura. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CONTROLADOR, DIREITOS_ART_18, POLITICA_DE_PRIVACIDADE, TERMOS_DE_USO,
} from '../src/features/legal/textos.mjs';

const texto = doc => JSON.stringify(doc).toLowerCase();

test('os nove direitos do Art. 18 estão todos lá, na ordem da lei', () => {
  assert.equal(DIREITOS_ART_18.length, 9);
  assert.deepEqual(DIREITOS_ART_18.map(d => d.inciso),
    ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']);
  for (const d of DIREITOS_ART_18) assert.ok(d.titulo && d.texto, `inciso ${d.inciso} sem explicação`);
  // E a política precisa realmente mostrá-los, não só tê-los no arquivo.
  assert.ok(POLITICA_DE_PRIVACIDADE.secoes.some(s => s.direitos === true));
});

test('a política cobre o que o Art. 9º exige', () => {
  const t = texto(POLITICA_DE_PRIVACIDADE);
  const exigido = {
    'finalidade do tratamento': 'para que servem',
    'quem é o controlador': 'quem trata os seus dados',
    'com quem se compartilha': 'com quem são compartilhados',
    'por quanto tempo': 'por quanto tempo ficam',
    'base legal': 'com que base legal',
    'direitos do titular': 'os seus direitos',
    'segurança': 'como os dados são protegidos',
  };
  for (const [nome, secao] of Object.entries(exigido)) {
    assert.ok(t.includes(secao.toLowerCase()), `falta a seção de ${nome}`);
  }
  // Transferência internacional: o Firebase e o Vercel hospedam fora do Brasil.
  assert.match(t, /transfer[eê]ncia internacional/);
  assert.match(t, /art\. 33/);
});

test('a política é honesta sobre o que o site realmente guarda', () => {
  const t = texto(POLITICA_DE_PRIVACIDADE);
  for (const dado of ['e-mail', 'fichas', 'imagens', 'mural']) {
    assert.ok(t.includes(dado), `a política não menciona que guarda ${dado}`);
  }
  // E sobre quem hospeda.
  assert.ok(t.includes('google'));
  assert.ok(t.includes('vercel'));
  // Dado sensível tem definição legal: não dá para dizer "não guardamos" e
  // ignorar que um campo de texto livre aceita qualquer coisa.
  assert.match(t, /texto livre/);
});

test('menores de idade são tratados, porque mesa de RPG tem gente de toda idade', () => {
  const t = texto(POLITICA_DE_PRIVACIDADE);
  assert.match(t, /art\. 14/);
  assert.match(t, /respons[áa]vel legal/);
});

test('os termos proíbem o que precisa ser proibido', () => {
  const t = texto(TERMOS_DE_USO);
  for (const proibicao of ['assediar', 'menores', 'burlar', 'extrair dados']) {
    assert.ok(t.includes(proibicao), `os termos não tratam de "${proibicao}"`);
  }
  assert.match(t, /marco civil/);
  assert.match(t, /154-a/);
  // Sistemas de RPG são de terceiros: o site é ferramenta, não distribuidor.
  assert.match(t, /n[ãa]o distribui o conte[úu]do desses livros/);
});

test('o campo de contato fica visivelmente pendente até ser preenchido', () => {
  // A LGPD exige que o titular saiba a quem recorrer. Enquanto estiver em
  // branco, a tela precisa dizer isso em vez de mostrar um espaço vazio.
  if (!CONTROLADOR.nome && !CONTROLADOR.contato) {
    assert.ok(CONTROLADOR.aviso.length > 40, 'o aviso de pendência precisa explicar o que falta');
  }
  const pagina = readFileSync(new URL('../src/features/legal/LegalPage.jsx', import.meta.url), 'utf8');
  assert.match(pagina, /legal-pendencia/);
});

test('os cabeçalhos de segurança do site estão no vercel.json', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const global = config.headers.find(h => h.source === '/(.*)');
  assert.ok(global, 'sumiram os cabeçalhos que valem para o site inteiro');
  const chaves = global.headers.map(h => h.key);
  for (const chave of [
    'Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options',
    'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy',
  ]) {
    assert.ok(chaves.includes(chave), `falta o cabeçalho ${chave}`);
  }
  const csp = global.headers.find(h => h.key === 'Content-Security-Policy').value;
  // Ninguém embute este site dentro de outro para colher senha.
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  // E o Firebase precisa continuar alcançável, senão o site não liga.
  assert.match(csp, /firebaseio\.com/);
  assert.match(csp, /identitytoolkit\.googleapis\.com/);
});

test('as regras limitam o tamanho do que se grava numa mesa', () => {
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  // Sem teto, uma conta aberta enche a cota diária da mesa até o banco parar
  // de responder para todo mundo.
  assert.match(regras, /function tamanhoRazoavel\(\)/);
  assert.match(regras, /request\.resource\.size\(\) < 400 \* 1024/);
  assert.match(regras, /allow write: if colecaoDeCampanha\(colecao\) && membro\(idNaColecao\(colecao\)\) && tamanhoRazoavel\(\)/);
});

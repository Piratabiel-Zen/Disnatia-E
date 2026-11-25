#!/usr/bin/env node
/**
 * HOSPEDA AS FONTES NO PRÓPRIO DOMÍNIO
 *
 * Enquanto as fontes vêm do Google, o navegador precisa de DNS + TLS para
 * fonts.googleapis.com, baixar um CSS, e só então DNS + TLS para
 * fonts.gstatic.com e baixar os arquivos. São duas conexões novas antes do
 * primeiro texto desenhado — e numa rede de celular ruim cada uma custa
 * entre 100 e 400ms. Servidas do mesmo domínio, elas entram na conexão que
 * já está aberta.
 *
 * O script baixa o CSS que o Google serve para um Chrome recente (para vir
 * woff2, que é o menor), puxa cada arquivo, grava em `public/fonts/`,
 * escreve `src/fontes.css` com os @font-face apontando para lá e troca o
 * bloco do `index.html`.
 *
 * Roda com saída para a internet:  node scripts/fontes-locais.mjs
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const PEDIDO = 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700'
  + '&family=Cinzel:wght@400;600;700'
  + '&family=Crimson+Text:ital,wght@0,400;0,600;1,400'
  + '&family=IM+Fell+English+SC&family=IM+Fell+English:ital@0;1&display=swap';

// Sem um User-Agent de navegador o Google devolve TTF, que é ~3x maior.
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const raiz = new URL('../', import.meta.url).pathname;

async function principal() {
  const css = await (await fetch(PEDIDO, { headers: { 'User-Agent': CHROME } })).text();
  if (!css.includes('@font-face')) throw new Error('o Google não devolveu @font-face');

  await mkdir(join(raiz, 'public/fonts'), { recursive: true });
  const urls = [...new Set([...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map(m => m[1]))];

  let local = css;
  let total = 0;
  for (const url of urls) {
    const nome = url.split('/').slice(-2).join('-').replace(/[^\w.-]/g, '');
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    await writeFile(join(raiz, 'public/fonts', nome), bytes);
    local = local.split(url).join(`/fonts/${nome}`);
    total += bytes.length;
    console.log(`  ${nome}  ${Math.round(bytes.length / 1024)}KB`);
  }

  await writeFile(join(raiz, 'src/fontes.css'),
    `/* Gerado por scripts/fontes-locais.mjs. Não editar à mão. */\n${local}`);

  // E o index.html deixa de falar com o Google.
  const htmlCaminho = join(raiz, 'index.html');
  let html = await readFile(htmlCaminho, 'utf8');
  html = html.replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.[^>]+>/g, '')
    .replace(/\s*<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]+>/g, '');
  await writeFile(htmlCaminho, html);

  console.log(`\n${urls.length} arquivos, ${Math.round(total / 1024)}KB em public/fonts/`);
  console.log('Agora importe "./fontes.css" no topo do src/main.jsx e remova');
  console.log('fonts.googleapis.com / fonts.gstatic.com do CSP no vercel.json.');
}

principal().catch(e => { console.error(e.message); process.exit(1); });

import fs from 'node:fs';
import path from 'node:path';

const ambientFile = path.join(process.cwd(), 'src', 'shell', 'AmbientSoundPlayer.jsx');
let ambient = fs.readFileSync(ambientFile, 'utf8');

const reactImport = 'import { useEffect,useRef,useState } from "react";';
if (!ambient.includes('createPortal')) {
  if (!ambient.includes(reactImport)) throw new Error('Player ambiente: import React esperado não encontrado.');
  ambient = ambient.replace(reactImport, `${reactImport}\nimport { createPortal } from "react-dom";`);
}

const oldOpen = `{open && masterMode && (\n        <div style={{ position: 'fixed', top: 20, bottom: 20, left: 16, width: 'min(380px, calc(100vw - 32px))', background: 'rgba(8,10,24,0.98)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 16, padding: 16, display:'flex', flexDirection:'column', boxShadow: '0 10px 40px rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 150 }}>`;
const newOpen = `{open && masterMode && createPortal(\n        <div className="ambient-playlist-overlay" style={{ position: 'fixed', top: 72, bottom: 18, left: 'calc(var(--grim-w) + 16px)', width: 'min(440px, calc(100vw - var(--grim-w) - 32px))', minHeight: 0, background: 'rgba(8,10,24,0.985)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 16, padding: 16, display:'flex', flexDirection:'column', boxShadow: '0 18px 52px rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)', zIndex: 4700 }}>`;
if (!ambient.includes(newOpen)) {
  if (!ambient.includes(oldOpen)) throw new Error('Player ambiente: painel antigo de playlist não encontrado.');
  ambient = ambient.replace(oldOpen, newOpen);
}

const oldTail = `          <div style={{ marginTop: 10, fontSize: 9, color: '#4A4050', fontFamily: 'Cinzel,serif', lineHeight: 1.6, flexShrink:0 }}>Ao tocar, todos ouvem automaticamente. Cada jogador pode silenciar só pra si no botão de volume.</div>\n        </div>\n      )}`;
const newTail = `          <div style={{ marginTop: 10, fontSize: 9, color: '#4A4050', fontFamily: 'Cinzel,serif', lineHeight: 1.6, flexShrink:0 }}>Ao tocar, todos ouvem automaticamente. Cada jogador pode silenciar só pra si no botão de volume.</div>\n        </div>,\n        document.body\n      )}`;
if (!ambient.includes(newTail)) {
  if (!ambient.includes(oldTail)) throw new Error('Player ambiente: fechamento do painel de playlist não encontrado.');
  ambient = ambient.replace(oldTail, newTail);
}

fs.writeFileSync(ambientFile, ambient);

const cssFile = path.join(process.cwd(), 'src', 'styles', 'global.css');
let css = fs.readFileSync(cssFile, 'utf8');
const marker = '/* PLAYLIST DO MESTRE EM PORTAL */';
if (!css.includes(marker)) {
  css += `\n${marker}\n.ambient-playlist-overlay{isolation:isolate;overflow:hidden}\n.ambient-playlist-overlay>div:nth-of-type(3){min-height:0;scrollbar-width:thin;scrollbar-color:rgba(74,222,128,.25) transparent}\n.ambient-playlist-overlay>div:nth-of-type(3)::-webkit-scrollbar{width:6px}.ambient-playlist-overlay>div:nth-of-type(3)::-webkit-scrollbar-track{background:transparent}.ambient-playlist-overlay>div:nth-of-type(3)::-webkit-scrollbar-thumb{background:rgba(74,222,128,.22);border-radius:999px}\n@media(max-width:700px){.ambient-playlist-overlay{left:10px!important;right:10px!important;top:66px!important;bottom:76px!important;width:auto!important}}\n`;
  fs.writeFileSync(cssFile, css);
}

if (!ambient.includes('createPortal(') || !ambient.includes('document.body')) {
  throw new Error('Player ambiente: playlist não foi desacoplada da topbar.');
}

console.log('Dinastia E: playlist do Mestre restaurada em painel grande e independente da topbar.');

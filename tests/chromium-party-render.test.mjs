import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// A faixa de personagens mudou de arquivo quando a tela inicial virou
// "onde a companhia está", mas o contrato é o mesmo: quem rola é o
// viewport, nunca a linha flex — misturar os dois já quebrou a faixa antes.
const component = fs.readFileSync('src/adventure/SessionHome.jsx', 'utf8');
// O retrato em si continua no AdventureSession, que é quem o entrega ao
// SessionHome.
const portrait = fs.readFileSync('src/adventure/AdventureSession.jsx', 'utf8');
const css = fs.readFileSync('src/adventure/adventure.css', 'utf8');

test('party strip separates the scroll viewport from the flex row', () => {
  /* O CONTRATO É O MESMO; O EIXO MUDOU.
     A faixa era uma fila de largura infinita que rolava para o lado, e com
     cinco personagens a terceira ficha já saía da tela sem ninguém
     descobrir que aquilo rolava. Agora a linha QUEBRA e o bloco cresce
     para baixo, que é a direção em que há espaço.

     O que não pode mudar é quem rola: o viewport, nunca a linha flex.
     Misturar os dois já quebrou a faixa no Chromium antes, e é por isso
     que este teste existe. */
  assert.match(component, /className="ad-party-viewport"[\s\S]*className="ad-party-row"/);
  assert.match(css, /\.ad-party-viewport\{[^}]*overflow-y:auto/);
  assert.match(css, /\.ad-party-row\{[^}]*flex-wrap:wrap/);
  // A linha nunca rola, em eixo nenhum.
  assert.doesNotMatch(css, /\.ad-party-row\{[^}]*overflow-[xy]:(auto|scroll)/);
  // E o bloco tem teto, senão vinte fichas empurram os botões da sessão
  // para fora da tela.
  assert.match(css, /\.ad-party-viewport\{[^}]*max-height:/);
});

test('party portraits paint immediately and retain a text fallback', () => {
  assert.match(portrait, /className="ad-portrait-fallback"/);
  assert.match(portrait, /loading="eager"/);
  assert.doesNotMatch(portrait, /loading="lazy"/);
  assert.match(css, /\.ad-portrait>img\{[^}]*content-visibility:visible!important/);
});

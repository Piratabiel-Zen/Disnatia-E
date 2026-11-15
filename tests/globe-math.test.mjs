import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  percentToLonLat, lonLatToPercent, lonLatToVector, vectorToLonLat, angularDistance,
} from '../src/features/mapa-mundi/globeMath.mjs';

test('os pins guardados em porcentagem viram longitude/latitude sem migração', () => {
  // Centro da imagem equiretangular: longitude 0, latitude 0.
  assert.deepEqual(percentToLonLat(50, 50), { lon: 0, lat: 0 });
  // Canto superior esquerdo: -180 de longitude, polo norte.
  assert.deepEqual(percentToLonLat(0, 0), { lon: -180, lat: 90 });
  // Canto inferior direito: +180, polo sul.
  assert.deepEqual(percentToLonLat(100, 100), { lon: 180, lat: -90 });
});

test('a ida e a volta entre porcentagem e coordenada preservam o ponto', () => {
  for (const [x, y] of [[12.5, 80], [50, 50], [73.25, 12.75], [0, 100], [99.9, 0.1]]) {
    const { lon, lat } = percentToLonLat(x, y);
    const back = lonLatToPercent(lon, lat);
    assert.ok(Math.abs(back.x - x) < 1e-9, `x ${x} -> ${back.x}`);
    assert.ok(Math.abs(back.y - y) < 1e-9, `y ${y} -> ${back.y}`);
  }
});

test('um ponto da esfera volta à mesma longitude e latitude', () => {
  for (const [lon, lat] of [[0, 0], [-180, 90], [45, -30], [120, 60], [-75.5, 15.25]]) {
    const v = lonLatToVector(lon, lat, 1);
    assert.ok(Math.abs(Math.hypot(v.x, v.y, v.z) - 1) < 1e-9, 'o ponto fica na superfície');
    const back = vectorToLonLat(v.x, v.y, v.z, 1);
    // Nos polos a longitude é indefinida; ali só a latitude importa.
    if (Math.abs(lat) < 89.9) assert.ok(Math.abs(back.lon - lon) < 1e-6, `lon ${lon} -> ${back.lon}`);
    assert.ok(Math.abs(back.lat - lat) < 1e-6, `lat ${lat} -> ${back.lat}`);
  }
});

test('a distância angular reconhece o mesmo ponto e lados opostos do planeta', () => {
  assert.equal(angularDistance({ lon: 10, lat: 20 }, { lon: 10, lat: 20 }), 0);
  assert.ok(Math.abs(angularDistance({ lon: 0, lat: 0 }, { lon: 180, lat: 0 }) - 180) < 1e-6);
  assert.ok(Math.abs(angularDistance({ lon: 0, lat: -90 }, { lon: 0, lat: 90 }) - 180) < 1e-6);
});

test('o globo carrega sob demanda e devolve os recursos ao sair', () => {
  const globe = fs.readFileSync(new URL('../src/features/mapa-mundi/GlobeView.jsx', import.meta.url), 'utf8');
  const page = fs.readFileSync(new URL('../src/features/mapa-mundi/MapaMundiPage.jsx', import.meta.url), 'utf8');
  // O three.js não pode entrar no pacote das outras telas.
  assert.match(page, /lazy\(\(\) => import\('\.\/GlobeView'\)\)/);
  // Sem vazar GPU entre visitas ao mapa.
  for (const call of ['cancelAnimationFrame', 'renderer.dispose()', 'geometry.dispose()', 'observer.disconnect()']) {
    assert.ok(globe.includes(call), `falta ${call} na limpeza`);
  }
  // Só o mapa raiz vira planeta; camadas internas seguem planas.
  assert.match(page, /isRootMap && viewMode === 'globo'/);
});

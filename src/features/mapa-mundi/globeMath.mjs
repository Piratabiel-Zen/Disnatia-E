// Conversão entre o mapa plano e a esfera.
//
// Os pins sempre foram guardados como porcentagem da imagem (x e y de 0 a 100).
// A imagem do Mapa Múndi é uma projeção equiretangular do planeta, então essa
// mesma porcentagem já é longitude e latitude: nada precisa ser migrado, e o
// mapa plano e o globo mostram exatamente os mesmos pontos.

export const percentToLonLat = (x, y) => ({
  lon: (Number(x) || 0) / 100 * 360 - 180,
  lat: 90 - (Number(y) || 0) / 100 * 180,
});

export const lonLatToPercent = (lon, lat) => ({
  x: ((Number(lon) || 0) + 180) / 360 * 100,
  y: (90 - (Number(lat) || 0)) / 180 * 100,
});

/**
 * Ponto na esfera para uma longitude/latitude, no mesmo sistema que o three.js
 * usa para enrolar uma textura equiretangular numa SphereGeometry.
 */
export function lonLatToVector(lon, lat, radius = 1) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

/** O caminho inverso: um ponto da esfera vira longitude/latitude. */
export function vectorToLonLat(x, y, z, radius = 1) {
  const clamped = Math.max(-1, Math.min(1, y / (radius || 1)));
  const lat = 90 - Math.acos(clamped) * 180 / Math.PI;
  let lon = Math.atan2(z, -x) * 180 / Math.PI - 180;
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;
  return { lon, lat };
}

/** Distância angular em graus, para saber qual pin está mais perto de um clique. */
export function angularDistance(a, b) {
  const toRad = Math.PI / 180;
  const sin = Math.sin((b.lat - a.lat) * toRad / 2) ** 2
    + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin((b.lon - a.lon) * toRad / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(sin))) * 180 / Math.PI;
}

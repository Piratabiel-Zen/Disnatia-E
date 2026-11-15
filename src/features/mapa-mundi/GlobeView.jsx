// Globo de Cosmum: o Mapa Múndi deixa de ser uma imagem parada.
//
// A textura é a mesma imagem que o atlas já guarda. Os pins continuam em x/y
// percentuais, convertidos para longitude/latitude na hora de desenhar, e são
// elementos HTML sobrepostos ao canvas: mantêm o visual, o texto nítido e o
// clique simples. O canvas cuida só do planeta.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { lonLatToVector, percentToLonLat, vectorToLonLat, lonLatToPercent } from './globeMath.mjs';
import './globo.css';
import { motionIsReduced } from '../../adventure/movimento.mjs';

const RADIUS = 1;
const MIN_DISTANCE = 1.45;
const MAX_DISTANCE = 4.2;
const DEFAULT_DISTANCE = 2.9;

// Texturas reais do planeta (NASA Blue Marble), servidas pelo próprio site.
const EARTH_TEXTURES = { day: '/media/terra/dia.jpg', night: '/media/terra/noite.jpg', water: '/media/terra/agua.png' };

// A escolha do jogador, não a do sistema operacional — ver movimento.mjs.
const prefersReducedMotion = () => motionIsReduced();

export default function GlobeView({
  image, pins = [], selectedPinId, onSelectPin, onPlacePin, placing = false,
  pinTypes = {}, canSeePin = () => true, accent = '#9B7CFF', earth = false,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const markerRefs = useRef(new Map());
  const stateRef = useRef(null);
  // Quanto o ponteiro andou no gesto atual: separa um giro de um clique no pin.
  const gestureRef = useRef({ moved: 0 });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Os callbacks mudam a cada render; guardá-los num ref evita recriar a cena.
  const handlers = useRef({ onSelectPin, onPlacePin, placing });
  handlers.current = { onSelectPin, onPlacePin, placing };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (_) {
      setFailed(true);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, DEFAULT_DISTANCE);

    const globe = new THREE.Group();
    scene.add(globe);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS, 96, 64),
      new THREE.MeshPhongMaterial({ color: 0x2a2440, shininess: 6, specular: 0x1a1830 }),
    );
    globe.add(sphere);

    // Halo: a borda acesa que dá volume ao planeta, desenhada por dentro.
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 1.035, 64, 48),
      new THREE.ShaderMaterial({
        transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color(accent) } },
        vertexShader: `
          varying vec3 vNormal;
          void main(){ vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 uColor; varying vec3 vNormal;
          void main(){ float edge = pow(0.72 - dot(vNormal, vec3(0.0,0.0,1.0)), 2.2);
            gl_FragColor = vec4(uColor, clamp(edge,0.0,1.0) * 0.55); }`,
      }),
    );
    scene.add(halo);

    // O universo ao fundo: estrelas de verdade na cena, em três tamanhos, que
    // cintilam devagar e giram uma fração do que o planeta gira — é essa
    // diferença que dá a sensação de estar olhando de fora.
    const STAR_COUNT = 2600;
    const starPositions = new Float32Array(STAR_COUNT * 3);
    const starSeeds = new Float32Array(STAR_COUNT);
    const starSizes = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      // Distribuição uniforme na esfera (sem amontoar nos polos).
      const u = Math.random() * 2 - 1;
      const theta = Math.random() * Math.PI * 2;
      const ring = Math.sqrt(1 - u * u);
      const distance = 34 + Math.random() * 10;
      starPositions[i * 3] = ring * Math.cos(theta) * distance;
      starPositions[i * 3 + 1] = u * distance;
      starPositions[i * 3 + 2] = ring * Math.sin(theta) * distance;
      starSeeds[i] = Math.random() * 6.283;
      const roll = Math.random();
      starSizes[i] = roll > 0.985 ? 4.6 : roll > 0.9 ? 2.8 : 1.6;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('aSeed', new THREE.BufferAttribute(starSeeds, 1));
    starGeometry.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
    const starMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) } },
      vertexShader: `
        attribute float aSeed; attribute float aSize;
        uniform float uTime; uniform float uPixelRatio;
        varying float vGlow; varying float vSeed;
        void main(){
          vSeed = aSeed;
          vGlow = 0.62 + 0.38 * sin(uTime * (0.35 + fract(aSeed) * 0.9) + aSeed);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          gl_PointSize = aSize * uPixelRatio * (0.8 + 0.2 * vGlow);
        }`,
      fragmentShader: `
        varying float vGlow; varying float vSeed;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float core = smoothstep(0.5, 0.0, d);
          // Um terço das estrelas puxa para o violeta, um terço para o ciano.
          float pick = fract(vSeed * 3.17);
          vec3 tint = pick < 0.33 ? vec3(0.80,0.72,1.0) : pick < 0.66 ? vec3(0.66,0.90,1.0) : vec3(1.0,0.98,0.94);
          gl_FragColor = vec4(tint, core * vGlow * 0.95);
        }`,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    scene.add(new THREE.AmbientLight(0xffffff, 0.86));
    const key = new THREE.DirectionalLight(0xffffff, 0.78);
    key.position.set(3, 2, 4);
    scene.add(key);

    const pointer = { dragging: false, moved: 0, x: 0, y: 0, inside: false };
    // -90 deixa o centro da imagem (longitude 0) de frente para a câmera, que é
    // o que se espera ao abrir um mapa-múndi.
    const spin = { lon: -90, lat: 0, vLon: 0, vLat: 0, distance: DEFAULT_DISTANCE };
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    stateRef.current = { scene, camera, globe, sphere, halo, renderer, spin, markerRefs };

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const pickLonLat = event => {
      const rect = canvas.getBoundingClientRect();
      ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObject(sphere, false)[0];
      if (!hit) return null;
      const local = sphere.worldToLocal(hit.point.clone());
      return vectorToLonLat(local.x, local.y, local.z, RADIUS);
    };

    // Marcador visível mais próximo do ponto clicado, dentro de um raio generoso.
    const nearestMarker = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      let best = null;
      let bestDistance = 26;
      for (const [id, entry] of markerRefs.current) {
        const node = entry.node;
        if (!node || node.dataset.behind === 'true') continue;
        const box = node.getBoundingClientRect();
        const distance = Math.hypot(clientX - (box.left + box.width / 2), clientY - (box.top + box.height / 2));
        if (distance < bestDistance) { bestDistance = distance; best = id; }
      }
      void rect;
      return best;
    };

    const onDown = event => {
      pointer.dragging = true; pointer.moved = 0; gestureRef.current.moved = 0;
      pointer.captured = false;
      pointer.x = event.clientX; pointer.y = event.clientY;
      spin.vLon = 0; spin.vLat = 0;
    };
    const onMove = event => {
      if (!pointer.dragging) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      pointer.x = event.clientX; pointer.y = event.clientY;
      pointer.moved += Math.abs(dx) + Math.abs(dy);
      gestureRef.current.moved = pointer.moved;
      // A captura só entra quando o gesto vira giro. Capturar desde o
      // pointerdown faria o pointerup mudar de alvo e matar o clique no pin.
      if (!pointer.captured && pointer.moved > 6) {
        pointer.captured = true;
        host.setPointerCapture?.(event.pointerId);
      }
      // Quanto mais perto, menor o passo: o arraste continua natural com zoom.
      const speed = 0.26 * (spin.distance / DEFAULT_DISTANCE);
      spin.lon -= dx * speed;
      spin.lat = Math.max(-85, Math.min(85, spin.lat + dy * speed));
      spin.vLon = -dx * speed;
      spin.vLat = dy * speed;
    };
    const onUp = event => {
      const wasDragging = pointer.dragging;
      pointer.dragging = false;
      if (pointer.captured) {
        pointer.captured = false;
        host.releasePointerCapture?.(event.pointerId);
      }
      // Um gesto curto é um clique. A escolha do local é feita por proximidade
      // na tela, e não pelo clique no elemento: o planeta pode girar um pouco
      // entre apertar e soltar, e um alvo de 26px escaparia do cursor.
      if (!wasDragging || pointer.moved > 6) return;
      const place = handlers.current;
      const nearest = nearestMarker(event.clientX, event.clientY);
      if (nearest) { place.onSelectPin?.(nearest); return; }
      if (place.placing && place.onPlacePin) {
        const found = pickLonLat(event);
        if (found) place.onPlacePin(lonLatToPercent(found.lon, found.lat));
      } else {
        place.onSelectPin?.(null);
      }
    };
    const onWheel = event => {
      event.preventDefault();
      const next = spin.distance * (1 + Math.sign(event.deltaY) * 0.12);
      spin.distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, next));
    };

    // A deriva lenta para enquanto o ponteiro está sobre o planeta: com ela
    // ligada, um pin escapa de baixo do cursor entre apertar e soltar.
    const onEnter = () => { pointer.inside = true; };
    const onLeave = () => { pointer.inside = false; };
    host.addEventListener('pointerenter', onEnter);
    host.addEventListener('pointerleave', onLeave);
    host.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    const reduce = prefersReducedMotion();
    const startedAt = performance.now();
    const projected = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3();
    let frame = 0;

    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!pointer.dragging) {
        // Inércia curta depois do arraste, e uma deriva lenta quando parado.
        spin.lon += spin.vLon;
        spin.lat = Math.max(-85, Math.min(85, spin.lat + spin.vLat));
        spin.vLon *= 0.92; spin.vLat *= 0.92;
        if (Math.abs(spin.vLon) < 0.004) spin.vLon = 0;
        if (Math.abs(spin.vLat) < 0.004) spin.vLat = 0;
        if (!reduce && !pointer.inside && !spin.vLon && !spin.vLat) spin.lon += 0.012;
      }
      globe.rotation.y = THREE.MathUtils.degToRad(spin.lon);
      globe.rotation.x = THREE.MathUtils.degToRad(spin.lat);
      // O céu acompanha só uma fração do giro: paralaxe entre planeta e fundo.
      stars.rotation.y = THREE.MathUtils.degToRad(spin.lon) * 0.16;
      stars.rotation.x = THREE.MathUtils.degToRad(spin.lat) * 0.16;
      if (!reduce) starMaterial.uniforms.uTime.value = (performance.now() - startedAt) / 1000;
      camera.position.setLength(spin.distance);
      camera.lookAt(0, 0, 0);
      camera.getWorldDirection(cameraDirection);
      renderer.render(scene, camera);

      // Os pins acompanham o planeta: posição na tela e visibilidade por frame.
      const rect = canvas.getBoundingClientRect();
      const halfW = rect.width / 2;
      const halfH = rect.height / 2;
      for (const [id, entry] of markerRefs.current) {
        const node = entry.node;
        if (!node) continue;
        projected.set(entry.position.x, entry.position.y, entry.position.z);
        globe.localToWorld(projected);
        const viewDirection = projected.clone().sub(camera.position).normalize();
        const normal = projected.clone().normalize();
        // Normal apontando contra a direção do olhar: o pin está na face visível.
        const facing = normal.dot(viewDirection) < -0.12;
        projected.project(camera);
        const left = halfW + projected.x * halfW;
        const top = halfH - projected.y * halfH;
        node.style.transform = `translate3d(${left}px, ${top}px, 0) translate(-50%, -50%)`;
        node.style.opacity = facing ? '1' : '0';
        node.style.pointerEvents = facing ? 'auto' : 'none';
        node.dataset.behind = facing ? 'false' : 'true';
        void id;
      }
    };
    tick();
    setReady(true);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener('pointerenter', onEnter);
      host.removeEventListener('pointerleave', onLeave);
      host.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('wheel', onWheel);
      sphere.geometry.dispose();
      sphere.material.map?.dispose();
      for (const uniform of Object.values(sphere.material.uniforms || {})) uniform.value?.dispose?.();
      sphere.material.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      halo.geometry.dispose();
      halo.material.dispose();
      renderer.dispose();
      stateRef.current = null;
    };
  }, [accent]);

  // A Terra de verdade: dia, luzes das cidades no lado escuro e brilho do sol
  // nos oceanos. O sol fica parado no espaço, então girar o planeta faz o
  // amanhecer passar pelos continentes.
  useEffect(() => {
    const state = stateRef.current;
    if (!state || !earth) return undefined;
    const { sphere, halo } = state;
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    const load = url => new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
    Promise.all([load(EARTH_TEXTURES.day), load(EARTH_TEXTURES.night), load(EARTH_TEXTURES.water)])
      .then(([day, night, water]) => {
        if (cancelled) { day.dispose(); night.dispose(); water.dispose(); return; }
        day.colorSpace = THREE.SRGBColorSpace; night.colorSpace = THREE.SRGBColorSpace;
        day.anisotropy = 8; night.anisotropy = 4;
        const previous = sphere.material;
        sphere.material = new THREE.ShaderMaterial({
          uniforms: {
            uDay: { value: day }, uNight: { value: night }, uWater: { value: water },
            uSun: { value: new THREE.Vector3(0.82, 0.32, 0.72).normalize() },
          },
          vertexShader: `
            varying vec2 vUv; varying vec3 vWorldNormal; varying vec3 vWorldPosition;
            void main(){
              vUv = uv;
              vWorldNormal = normalize(mat3(modelMatrix) * normal);
              vec4 world = modelMatrix * vec4(position,1.0);
              vWorldPosition = world.xyz;
              gl_Position = projectionMatrix * viewMatrix * world;
            }`,
          fragmentShader: `
            uniform sampler2D uDay; uniform sampler2D uNight; uniform sampler2D uWater;
            uniform vec3 uSun;
            varying vec2 vUv; varying vec3 vWorldNormal; varying vec3 vWorldPosition;
            void main(){
              vec3 normal = normalize(vWorldNormal);
              vec3 view = normalize(cameraPosition - vWorldPosition);
              float sun = dot(normal, uSun);
              float daylight = smoothstep(-0.16, 0.34, sun);
              vec3 day = texture2D(uDay, vUv).rgb;
              vec3 night = texture2D(uNight, vUv).rgb;
              // O lado escuro nunca fica preto: os continentes continuam
              // legíveis para os locais marcados, com as cidades acesas por cima.
              vec3 dark = day * 0.11 + night * vec3(1.5, 1.22, 0.86);
              vec3 color = mix(dark, day * (0.42 + 0.78 * max(sun, 0.0)), daylight);
              // Reflexo do sol só onde é água.
              float ocean = texture2D(uWater, vUv).r;
              vec3 halfway = normalize(uSun + view);
              color += vec3(0.9, 0.95, 1.0) * pow(max(dot(normal, halfway), 0.0), 64.0) * ocean * 0.55 * daylight;
              // Faixa quente no terminador: o amanhecer.
              float dawn = smoothstep(-0.2, 0.05, sun) * (1.0 - smoothstep(0.05, 0.4, sun));
              color += vec3(1.0, 0.45, 0.18) * dawn * 0.05;
              // Atmosfera: a borda do planeta azula contra o espaço.
              float rim = pow(1.0 - max(dot(normal, view), 0.0), 2.6);
              color += vec3(0.30, 0.58, 1.0) * rim * (0.35 + 0.65 * daylight) * 0.75;
              gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
            }`,
        });
        previous.map?.dispose();
        previous.dispose();
        halo.material.uniforms.uColor.value.set('#4DA3FF');
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [earth, ready]);

  // A textura do planeta: a mesma imagem do atlas, trocada sem recriar a cena.
  useEffect(() => {
    const state = stateRef.current;
    if (!state || earth) return undefined;
    const { sphere } = state;
    if (!image) {
      sphere.material.map?.dispose();
      sphere.material.map = null;
      sphere.material.color.set(0x2a2440);
      sphere.material.needsUpdate = true;
      return undefined;
    }
    let cancelled = false;
    new THREE.TextureLoader().load(image, texture => {
      if (cancelled) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      sphere.material.map?.dispose();
      sphere.material.map = texture;
      sphere.material.color.set(0xffffff);
      sphere.material.needsUpdate = true;
    }, undefined, () => {});
    return () => { cancelled = true; };
  }, [image, ready, earth]);

  // Posição 3D de cada pin, recalculada quando a lista muda.
  useLayoutEffect(() => {
    const next = new Map();
    for (const pin of pins) {
      const { lon, lat } = percentToLonLat(pin.x, pin.y);
      const previous = markerRefs.current.get(String(pin.id));
      next.set(String(pin.id), {
        node: previous?.node || null,
        position: lonLatToVector(lon, lat, RADIUS * 1.004),
      });
    }
    markerRefs.current = next;
  }, [pins]);

  if (failed) {
    return (
      <div className="globo-fallback" role="status">
        Seu navegador não conseguiu abrir o globo em 3D. Use a visão plana do mapa.
      </div>
    );
  }

  return (
    <div className={`globo-host${placing ? ' is-placing' : ''}${earth ? ' is-earth' : ''}`} ref={hostRef}>
      <div className="globo-universo" aria-hidden="true"><i /><i /></div>
      <canvas ref={canvasRef} className="globo-canvas" />
      <div className="globo-overlay" ref={overlayRef}>
        {pins.map(pin => {
          const type = pinTypes[pin.tipo] || {};
          const known = canSeePin(pin);
          return (
            <button
              key={pin.id}
              type="button"
              className={`globo-pin${String(selectedPinId) === String(pin.id) ? ' is-selected' : ''}${known ? '' : ' is-unknown'}`}
              style={{ '--pin-color': type.color || accent }}
              ref={node => {
                const entry = markerRefs.current.get(String(pin.id));
                if (entry) entry.node = node;
              }}
              onClick={event => {
                event.stopPropagation();
                // Se o gesto girou o planeta, não era um clique no local.
                if (gestureRef.current.moved > 6) return;
                onSelectPin?.(pin.id);
              }}
              title={known ? (pin.titulo || 'Local') : 'Local desconhecido'}
            >
              <span className="globo-pin-dot" aria-hidden="true">{known ? (type.icon || '◆') : '?'}</span>
              <span className="globo-pin-name">{known ? (pin.titulo || 'Local') : '???'}</span>
            </button>
          );
        })}
      </div>
      {placing ? <div className="globo-hint" role="status">Clique no globo para marcar o local</div> : null}
    </div>
  );
}

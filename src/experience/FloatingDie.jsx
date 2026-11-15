// O dado que flutua sobre a mesa esperando a mão do jogador.
//
// É um poliedro de verdade (o mesmo formato do dado escolhido), pairando e
// girando devagar. Quem segura sente o peso: o dado segue o cursor com
// atraso, inclina na direção do movimento e gira mais rápido quanto mais a
// mão se mexe. Ao soltar, ele sai voando na direção do gesto e a física
// assume — é ela que bate nas paredes e decide como o dado cai.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const VIEW_DISTANCE = 6;
const FOV = 35;

function d10Geometry(radius) {
  const vertices = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI * 2) / 10;
    vertices.push(Math.cos(angle), Math.sin(angle), 0.105 * (i % 2 ? 1 : -1));
  }
  vertices.push(0, 0, -1, 0, 0, 1);
  const faces = [5,7,11, 4,2,10, 1,3,11, 0,8,10, 7,9,11, 8,6,10, 9,1,11, 2,0,10, 3,5,11, 6,4,10,
    1,0,2, 1,2,3, 3,2,4, 3,4,5, 5,4,6, 5,6,7, 7,6,8, 7,8,9, 9,8,0, 9,0,1];
  return new THREE.PolyhedronGeometry(vertices, faces, radius, 0);
}

export function dieGeometry(sides, radius = 0.5) {
  switch (Number(sides)) {
    case 4: return new THREE.TetrahedronGeometry(radius * 1.15, 0);
    case 6: return new THREE.BoxGeometry(radius * 1.25, radius * 1.25, radius * 1.25);
    case 8: return new THREE.OctahedronGeometry(radius * 1.08, 0);
    case 10: return d10Geometry(radius * 1.05);
    case 12: return new THREE.DodecahedronGeometry(radius, 0);
    default: return new THREE.IcosahedronGeometry(radius, 0);
  }
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function FloatingDie({ sides = 20, count = 1, color = '#C8A8E8', away = false, controlRef }) {
  const hostRef = useRef(null);
  const live = useRef({ away, sides, count, color });
  live.current.away = away;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch (_) { return undefined; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
    camera.position.set(0, 0, VIEW_DISTANCE);

    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(-2.5, 3.5, 4);
    scene.add(key);
    const rim = new THREE.PointLight(new THREE.Color(color), 1.6, 9);
    rim.position.set(1.8, -1.6, 2.2);
    scene.add(rim);

    const safeCount = Math.max(1, Math.min(5, Number(count) || 1));
    const radius = safeCount >= 4 ? 0.3 : safeCount >= 2 ? 0.37 : 0.52;
    const group = new THREE.Group();
    scene.add(group);

    const tint = new THREE.Color(color);
    const material = new THREE.MeshStandardMaterial({
      color: tint, metalness: 0.5, roughness: 0.3, flatShading: true,
      emissive: tint, emissiveIntensity: 0.2, transparent: true, side: THREE.DoubleSide,
    });
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: tint.clone().lerp(new THREE.Color('#ffffff'), 0.62), transparent: true, opacity: 0.9,
    });
    const disposables = [material, edgeMaterial];
    const dice = [];
    for (let i = 0; i < safeCount; i++) {
      const geometry = dieGeometry(sides, radius);
      const edges = new THREE.EdgesGeometry(geometry, 1);
      disposables.push(geometry, edges);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.add(new THREE.LineSegments(edges, edgeMaterial));
      // Um dado fica no centro; vários formam uma roda apertada.
      const angle = (i / safeCount) * Math.PI * 2 + 0.6;
      const spread = safeCount === 1 ? 0 : radius * 1.75;
      mesh.position.set(Math.cos(angle) * spread, Math.sin(angle) * spread, 0);
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      mesh.userData.spin = new THREE.Vector3(0.35 + Math.random() * 0.3, 0.5 + Math.random() * 0.3, 0.2 + Math.random() * 0.2);
      group.add(mesh);
      dice.push(mesh);
    }

    // Sombra no feltro: encolhe e clareia quando o dado sobe.
    const shadowMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uStrength: { value: 0.5 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float uStrength; varying vec2 vUv; void main(){ float d = distance(vUv, vec2(0.5)); gl_FragColor = vec4(0.0,0.0,0.0, smoothstep(0.5,0.0,d) * uStrength); }',
    });
    const shadowGeometry = new THREE.PlaneGeometry(1, 1);
    disposables.push(shadowMaterial, shadowGeometry);
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.position.z = -0.6;
    scene.add(shadow);

    let visibleWidth = 1;
    let visibleHeight = 1;
    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      visibleHeight = 2 * VIEW_DISTANCE * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
      visibleWidth = visibleHeight * camera.aspect;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const still = reducedMotion();
    // Repouso: um pouco acima do centro, como quem paira sobre a mesa.
    const rest = new THREE.Vector3(0, 0.12, 0);
    const state = {
      held: false, target: rest.clone(), velocity: new THREE.Vector3(),
      spinBoost: 0, tilt: new THREE.Vector2(), fly: null, opacity: 0, scale: 0.2, lastX: 0, lastY: 0,
    };
    group.position.copy(rest).add(new THREE.Vector3(0, 0.7, 0));

    const toWorld = (clientX, clientY) => {
      const rect = host.getBoundingClientRect();
      const x = ((clientX - rect.left) / Math.max(1, rect.width) - 0.5) * visibleWidth;
      const y = -((clientY - rect.top) / Math.max(1, rect.height) - 0.5) * visibleHeight;
      const limitX = visibleWidth / 2 - radius;
      const limitY = visibleHeight / 2 - radius;
      return new THREE.Vector3(Math.max(-limitX, Math.min(limitX, x)), Math.max(-limitY, Math.min(limitY, y)), 0);
    };

    // Quem usa o componente controla o dado por aqui, sem re-render por quadro.
    if (controlRef) {
      controlRef.current = {
        grab(clientX, clientY) {
          state.held = true; state.fly = null;
          state.target.copy(toWorld(clientX, clientY));
          state.lastX = clientX; state.lastY = clientY;
        },
        drag(clientX, clientY) {
          if (!state.held) return;
          const dx = clientX - state.lastX;
          const dy = clientY - state.lastY;
          state.lastX = clientX; state.lastY = clientY;
          state.target.copy(toWorld(clientX, clientY));
          state.spinBoost = Math.min(9, state.spinBoost + Math.hypot(dx, dy) * 0.045);
          state.tilt.set(Math.max(-0.6, Math.min(0.6, dx * 0.02)), Math.max(-0.6, Math.min(0.6, dy * 0.02)));
        },
        release(gesture) {
          state.held = false;
          if (gesture && Number.isFinite(gesture.x) && Number.isFinite(gesture.y)) {
            const speed = 9 + (Number(gesture.power) || 1) * 7;
            const length = Math.hypot(gesture.x, gesture.y) || 1;
            state.fly = { vx: (gesture.x / length) * speed, vy: (gesture.y / length) * speed };
          } else {
            // Toque simples: o dado é jogado para cima e some no ar.
            state.fly = { vx: 0, vy: 11 };
          }
          state.spinBoost = 9;
        },
        cancel() { state.held = false; state.target.copy(rest); },
      };
    }

    const clock = new THREE.Clock();
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.05, clock.getDelta());
      const time = clock.elapsedTime;
      const hidden = live.current.away;

      if (state.fly) {
        group.position.x += state.fly.vx * dt;
        group.position.y += state.fly.vy * dt;
        state.opacity = Math.max(0, state.opacity - dt * 5.5);
        if (state.opacity <= 0 && !hidden) {
          // A rolagem acabou: o dado volta a se materializar acima da mesa.
          state.fly = null;
          group.position.copy(rest).add(new THREE.Vector3(0, 0.9, 0));
          state.scale = 0.2;
        }
      } else if (hidden) {
        state.opacity = Math.max(0, state.opacity - dt * 6);
      } else {
        state.opacity = Math.min(1, state.opacity + dt * 2.6);
        const goal = state.held ? state.target : rest;
        if (!state.held) state.target.copy(rest);
        // Mola amortecida: o dado chega com um leve atraso, como algo com massa.
        const stiffness = state.held ? 16 : 7;
        group.position.x += (goal.x - group.position.x) * Math.min(1, stiffness * dt);
        group.position.y += (goal.y - group.position.y) * Math.min(1, stiffness * dt);
      }

      const bob = still || state.held || state.fly ? 0 : Math.sin(time * 1.5) * 0.09;
      const targetScale = state.held ? 1.16 : 1;
      state.scale += (targetScale - state.scale) * Math.min(1, 9 * dt);
      group.scale.setScalar(state.scale);
      group.position.z = state.held ? 0.5 : 0;
      state.spinBoost = Math.max(0, state.spinBoost - dt * 6);
      state.tilt.multiplyScalar(Math.max(0, 1 - dt * 7));
      group.rotation.z = -state.tilt.x * 0.5;
      const spinSpeed = (still ? 0 : 0.55) + state.spinBoost;
      for (const mesh of dice) {
        mesh.rotation.x += mesh.userData.spin.x * spinSpeed * dt;
        mesh.rotation.y += mesh.userData.spin.y * spinSpeed * dt;
        mesh.rotation.z += mesh.userData.spin.z * spinSpeed * dt;
        mesh.position.z = bob * 0.4;
      }
      group.position.y += bob * dt * 2.2;
      material.opacity = state.opacity;
      edgeMaterial.opacity = state.opacity * 0.9;

      const lift = state.held ? 1 : 0.55 + bob * 2;
      const footprint = (safeCount === 1 ? radius * 2.6 : radius * 5.2) * (1.15 - lift * 0.25);
      shadow.scale.set(footprint, footprint * 0.42, 1);
      shadow.position.x = group.position.x + 0.12;
      shadow.position.y = group.position.y - radius * 1.9 - (state.held ? 0.22 : 0.08);
      shadowMaterial.uniforms.uStrength.value = state.opacity * (state.held ? 0.3 : 0.5);

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (controlRef) controlRef.current = null;
      disposables.forEach(item => item.dispose());
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();
    };
  }, [sides, count, color, controlRef]);

  return <div ref={hostRef} className="floating-die-canvas" aria-hidden="true" />;
}
